import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeBody } from './sanitize';
import { checkVariables } from './variables';

export interface TemplateInput {
  name?: string;
  subject?: string;
  preheader?: string;
  bodyHtml?: string;
}

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private clean(input: TemplateInput) {
    const name = (input.name ?? '').trim();
    const subject = (input.subject ?? '').trim();
    const preheader = (input.preheader ?? '').trim();
    const raw = (input.bodyHtml ?? '').trim();
    if (!name) throw new BadRequestException('Template name is required');
    if (name.length > 80) throw new BadRequestException('Template name is too long');
    if (!subject) throw new BadRequestException('Subject is required');
    if (subject.length > 200 || preheader.length > 200) throw new BadRequestException('Subject or preview text is too long');
    if (!raw) throw new BadRequestException('Email body is required');
    if (raw.length > 100_000) throw new BadRequestException('Email body is too long');
    const bodyHtml = sanitizeBody(raw);
    // Coupon variables are fine here: the coupon is chosen when a campaign is created
    const problems = checkVariables([subject, preheader, bodyHtml], true);
    if (problems.length) throw new BadRequestException(problems.join('. '));
    return { name, subject, preheader, bodyHtml };
  }

  list() {
    return this.prisma.emailTemplate.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } });
  }

  create(input: TemplateInput, adminId: string) {
    return this.prisma.emailTemplate.create({ data: { ...this.clean(input), createdById: adminId } });
  }

  async update(id: string, input: TemplateInput) {
    const existing = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Template not found');
    return this.prisma.emailTemplate.update({ where: { id }, data: this.clean(input) });
  }

  // Soft delete, so nothing that referenced the template loses its link
  async remove(id: string) {
    const existing = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Template not found');
    await this.prisma.emailTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
