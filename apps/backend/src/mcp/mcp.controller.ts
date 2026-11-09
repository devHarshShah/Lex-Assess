import {
  All,
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ApiTokensService } from '../api-tokens/api-tokens.service';
import { McpService } from './mcp.service';

function jsonRpcError(res: Response, status: number, message: string) {
  res
    .status(status)
    .json({ jsonrpc: '2.0', error: { code: -32000, message }, id: null });
}

/**
 * Remote MCP endpoint (Streamable HTTP, stateless) for the LexAssess connector.
 *
 * Auth is a superadmin-issued API token, sent either as `Authorization: Bearer lxa_...`
 * (Claude Desktop / Claude Code / any client that can set headers) or in the path as
 * `/mcp/t/lxa_...` for Claude.ai custom connectors, which can't send custom headers.
 */
@Controller('mcp')
export class McpController {
  constructor(
    private readonly apiTokens: ApiTokensService,
    private readonly mcp: McpService,
  ) {}

  @Post()
  @HttpCode(200)
  handleWithHeader(@Req() req: Request, @Res() res: Response) {
    const header = req.headers.authorization ?? '';
    const token = header.toLowerCase().startsWith('bearer ')
      ? header.slice(7).trim()
      : undefined;
    return this.handle(token, req, res);
  }

  @Post('t/:token')
  @HttpCode(200)
  handleWithPathToken(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handle(token, req, res);
  }

  // Stateless server: no SSE stream to resume (GET) and no session to end (DELETE).
  @All(['', 't/:token'])
  methodNotAllowed(@Res() res: Response) {
    res.setHeader('Allow', 'POST');
    jsonRpcError(res, 405, 'Method not allowed');
  }

  private async handle(token: string | undefined, req: Request, res: Response) {
    const principal = await this.apiTokens.authenticate(token);
    if (!principal) {
      jsonRpcError(res, 401, 'Invalid, expired or revoked LexAssess API token');
      return;
    }

    const server = this.mcp.createServer(principal);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
}
