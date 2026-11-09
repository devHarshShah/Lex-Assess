import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { PaperStatus } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionPapersService } from '../question-papers/question-papers.service';
import type { ApiTokenPrincipal } from '../api-tokens/api-tokens.service';
import {
  convertPaper,
  PAPER_FORMAT_GUIDE,
  paperContentSchema,
  paperContentShape,
} from './paper-format';

const SERVER_INSTRUCTIONS =
  'LexAssess is a legal assessment platform. Use these tools to turn a question paper (usually a PDF the user attaches) into a DRAFT paper. ' +
  'Always call get_paper_format first, then list_categories to find the category. Check list_papers for an existing paper with the same title before creating one. ' +
  'Drafts are never visible to students: an admin must review the answer key and publish in the LexAssess panel. You cannot publish or delete.';

function text(value: unknown): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text:
          typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function toolError(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly papers: QuestionPapersService,
    private readonly config: ConfigService,
  ) {}

  private builderUrl(versionId: string): string {
    const origin = (
      this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173'
    )
      .split(',')[0]!
      .trim();
    return `${origin}/dashboard/papers/${versionId}/builder`;
  }

  private audit(
    principal: ApiTokenPrincipal,
    tool: string,
    detail: Record<string, unknown> = {},
  ) {
    this.logger.log(
      JSON.stringify({
        event: 'mcp_tool_call',
        tool,
        token: principal.tokenPrefix,
        userId: principal.id,
        ...detail,
      }),
    );
  }

  /** A fresh server per request (stateless transport), with every tool bound to the caller. */
  createServer(principal: ApiTokenPrincipal): McpServer {
    const server = new McpServer(
      { name: 'lexassess', version: '1.0.0' },
      { instructions: SERVER_INSTRUCTIONS },
    );

    server.registerTool(
      'get_paper_format',
      {
        title: 'Get paper format',
        description:
          'Returns the paper JSON format, LexAssess house conventions and the standard instructions template. Call this before create_paper_draft.',
        annotations: { readOnlyHint: true },
      },
      () => {
        this.audit(principal, 'get_paper_format');
        return text(PAPER_FORMAT_GUIDE);
      },
    );

    server.registerTool(
      'list_categories',
      {
        title: 'List categories',
        description:
          'Lists the practice-area categories a paper can belong to, with their ids.',
        annotations: { readOnlyHint: true },
      },
      async () => {
        this.audit(principal, 'list_categories');
        const categories = await this.prisma.specialization.findMany({
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: { select: { questionPapers: true } },
          },
        });
        return text(
          categories.map((c) => ({
            id: c.id,
            name: c.name,
            visibleToStudents: c.isActive,
            papers: c._count.questionPapers,
          })),
        );
      },
    );

    server.registerTool(
      'list_papers',
      {
        title: 'List papers in a category',
        description:
          'Lists the papers in a category, with each version and its status (DRAFT, PUBLISHED, ARCHIVED).',
        inputSchema: { categoryId: z.string().min(1) },
        annotations: { readOnlyHint: true },
      },
      async ({ categoryId }) => {
        this.audit(principal, 'list_papers', { categoryId });
        const papers = await this.papers.getPapersBySpecialization(categoryId);
        return text(
          papers.map((p) => ({
            paperId: p.id,
            title: p.title,
            description: p.description,
            versions: p.versions.map((v) => ({
              versionId: v.id,
              name: v.versionName,
              status: v.status,
            })),
          })),
        );
      },
    );

    server.registerTool(
      'get_paper',
      {
        title: 'Get a paper version',
        description:
          'Returns the full content of a paper version (sections, questions, options and answer key).',
        inputSchema: { versionId: z.string().min(1) },
        annotations: { readOnlyHint: true },
      },
      async ({ versionId }) => {
        this.audit(principal, 'get_paper', { versionId });
        try {
          return text(await this.papers.getVersionDetails(versionId));
        } catch {
          return toolError(`No paper version with id ${versionId}`);
        }
      },
    );

    server.registerTool(
      'create_paper_draft',
      {
        title: 'Create a draft paper',
        description:
          'Creates a new paper with a V1 DRAFT version in the given category. Call get_paper_format first for the format. ' +
          'Returns the panel link where an admin reviews and publishes it, and a summary to show the user.',
        inputSchema: { categoryId: z.string().min(1), ...paperContentShape },
      },
      async ({ categoryId, ...content }) => {
        const category = await this.prisma.specialization.findUnique({
          where: { id: categoryId },
        });
        if (!category)
          return toolError(
            `No category with id ${categoryId}. Call list_categories for valid ids.`,
          );

        let converted: ReturnType<typeof convertPaper>;
        try {
          converted = convertPaper(paperContentSchema.parse(content));
        } catch (e) {
          return toolError((e as Error).message);
        }

        const paper = await this.papers.createPaper(
          categoryId,
          { title: content.title, description: content.description },
          principal.id,
        );
        try {
          const version = await this.papers.createVersion(paper.id, {
            versionName: 'V1',
          });
          await this.papers.updateVersion(version.id, {
            timeLimitMinutes: content.timeLimitMinutes,
            instructions: content.instructions,
            sections: converted.sections,
          });
          this.audit(principal, 'create_paper_draft', {
            paperId: paper.id,
            versionId: version.id,
            categoryId,
          });
          return text({
            status: 'DRAFT',
            category: category.name,
            paperId: paper.id,
            versionId: version.id,
            reviewAndPublishAt: this.builderUrl(version.id),
            ...converted.summary,
            note: 'Not visible to students until an admin reviews it and publishes it in the panel.',
          });
        } catch (e) {
          // Don't leave a half-built paper behind.
          await this.papers.deletePaper(paper.id).catch(() => undefined);
          this.logger.error(
            `create_paper_draft failed: ${(e as Error).message}`,
          );
          return toolError(
            'Could not save the paper. Nothing was created. Check the content and try again.',
          );
        }
      },
    );

    server.registerTool(
      'update_paper_draft',
      {
        title: 'Replace a draft paper',
        description:
          'Replaces the whole content (title, description, instructions, time limit, sections) of a DRAFT version. ' +
          'Refused for published or archived versions, or ones students have already attempted.',
        inputSchema: { versionId: z.string().min(1), ...paperContentShape },
      },
      async ({ versionId, ...content }) => {
        const version = await this.prisma.questionPaperVersion.findUnique({
          where: { id: versionId },
          include: { _count: { select: { testAttempts: true } } },
        });
        if (!version) return toolError(`No paper version with id ${versionId}`);
        if (version.status !== PaperStatus.DRAFT) {
          return toolError(
            `Version ${versionId} is ${version.status}; only DRAFT versions can be changed here. Edit it in the panel.`,
          );
        }
        if (version._count.testAttempts > 0) {
          return toolError(
            'Students have already attempted this version; edit it in the panel instead.',
          );
        }

        let converted: ReturnType<typeof convertPaper>;
        try {
          converted = convertPaper(paperContentSchema.parse(content));
        } catch (e) {
          return toolError((e as Error).message);
        }

        // Title and description belong to the paper, not the version, so renaming
        // here would also rename a live published version students can see.
        const liveVersions = await this.prisma.questionPaperVersion.count({
          where: { paperId: version.paperId, status: PaperStatus.PUBLISHED },
        });
        const titleUpdated = liveVersions === 0;
        if (titleUpdated) {
          await this.papers.updatePaper(version.paperId, {
            title: content.title,
            description: content.description,
          });
        }
        await this.papers.updateVersion(versionId, {
          timeLimitMinutes: content.timeLimitMinutes,
          instructions: content.instructions,
          sections: converted.sections,
        });
        this.audit(principal, 'update_paper_draft', {
          paperId: version.paperId,
          versionId,
        });
        return text({
          status: 'DRAFT',
          paperId: version.paperId,
          versionId,
          reviewAndPublishAt: this.builderUrl(versionId),
          ...converted.summary,
          ...(titleUpdated
            ? {}
            : {
                note: 'Title and description were NOT changed because another version of this paper is published. Change them in the panel if needed.',
              }),
        });
      },
    );

    return server;
  }
}
