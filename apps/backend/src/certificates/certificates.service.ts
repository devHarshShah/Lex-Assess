import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import fontkit from '@pdf-lib/fontkit';
import { Client } from 'minio';
import { PDFDocument, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { RankingService } from '../ranking/ranking.service';

const ASSETS_DIR = join(__dirname, 'assets');

// Brand palette, matches apps/frontend/src/index.css
const INK = rgb(0x17 / 255, 0x17 / 255, 0x17 / 255);
const MUTED = rgb(0x52 / 255, 0x52 / 255, 0x52 / 255);
const AMBER = rgb(0xd9 / 255, 0x77 / 255, 0x06 / 255);
const PAPER = rgb(0xf9 / 255, 0xf9 / 255, 0xf6 / 255);
const BORDER = rgb(0xe5 / 255, 0xe5 / 255, 0xe5 / 255);

export interface CertificateDto {
  verificationCode: string;
  fullName: string;
  rollNumber: string | null;
  practiceArea: string;
  rank: number;
  commonScore: number;
  pdfUrl: string;
  issuedAt: Date;
}

@Injectable()
export class CertificatesService implements OnModuleInit {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET') || 'lexassess-uploads';
    this.client = new Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: Number(this.configService.get<string>('MINIO_PORT') || 9000),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  async onModuleInit(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
    }
  }

  async getMyCertificate(userId: string): Promise<CertificateDto | null> {
    const existing = await this.prisma.certificate.findUnique({ where: { userId } });
    return existing ? this.toDto(existing) : null;
  }

  async generateForUser(userId: string): Promise<CertificateDto> {
    const rankEntry = await this.rankingService.getStudentRank(userId);
    if (!rankEntry) {
      throw new BadRequestException(
        'You are not yet eligible for a certificate. A submitted, scored test attempt and a completed, marked interview are required.',
      );
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { fullName: true, rollNumber: true },
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    const fullName = profile?.fullName || user.name;

    const existing = await this.prisma.certificate.findUnique({ where: { userId } });
    const verificationCode = existing?.verificationCode ?? randomUUID();

    const frontendOrigin = this.configService.get<string>('FRONTEND_ORIGIN') || 'http://localhost:5173';
    const verifyUrl = `${frontendOrigin}/verify/${verificationCode}`;

    const pdfBytes = await this.buildPdf({
      fullName,
      rollNumber: profile?.rollNumber ?? null,
      practiceArea: rankEntry.practiceArea,
      rank: rankEntry.rank,
      commonScore: rankEntry.commonScore,
      verifyUrl,
      verificationCode,
      issuedAt: existing?.issuedAt ?? new Date(),
    });

    const objectKey = `certificate/${userId}.pdf`;
    await this.client.putObject(this.bucket, objectKey, Buffer.from(pdfBytes), pdfBytes.length, {
      'Content-Type': 'application/pdf',
    });
    const publicBaseUrl = this.configService.get<string>('MINIO_PUBLIC_BASE_URL') || 'http://localhost:9000';
    const pdfUrl = `${publicBaseUrl}/${this.bucket}/${objectKey}`;

    const saved = await this.prisma.certificate.upsert({
      where: { userId },
      create: {
        userId,
        verificationCode,
        rollNumber: profile?.rollNumber ?? null,
        fullName,
        practiceArea: rankEntry.practiceArea,
        rank: rankEntry.rank,
        commonScore: rankEntry.commonScore,
        pdfUrl,
      },
      update: {
        rollNumber: profile?.rollNumber ?? null,
        fullName,
        practiceArea: rankEntry.practiceArea,
        rank: rankEntry.rank,
        commonScore: rankEntry.commonScore,
        pdfUrl,
      },
    });

    return this.toDto(saved);
  }

  async verifyByCode(code: string): Promise<CertificateDto> {
    const certificate = await this.prisma.certificate.findUnique({ where: { verificationCode: code } });
    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }
    return this.toDto(certificate);
  }

  private toDto(certificate: {
    verificationCode: string;
    fullName: string;
    rollNumber: string | null;
    practiceArea: string;
    rank: number;
    commonScore: number;
    pdfUrl: string;
    issuedAt: Date;
  }): CertificateDto {
    return {
      verificationCode: certificate.verificationCode,
      fullName: certificate.fullName,
      rollNumber: certificate.rollNumber,
      practiceArea: certificate.practiceArea,
      rank: certificate.rank,
      commonScore: certificate.commonScore,
      pdfUrl: certificate.pdfUrl,
      issuedAt: certificate.issuedAt,
    };
  }

  private async buildPdf(input: {
    fullName: string;
    rollNumber: string | null;
    practiceArea: string;
    rank: number;
    commonScore: number;
    verifyUrl: string;
    verificationCode: string;
    issuedAt: Date;
  }): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    const inter = await doc.embedFont(readFileSync(join(ASSETS_DIR, 'Inter-Regular.ttf')), { subset: true });
    const interSemiBold = await doc.embedFont(readFileSync(join(ASSETS_DIR, 'Inter-SemiBold.ttf')), {
      subset: true,
    });
    const interBold = await doc.embedFont(readFileSync(join(ASSETS_DIR, 'Inter-Bold.ttf')), { subset: true });

    const page = doc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();
    const margin = 40;

    // Paper background + inner amber-on-ink double border
    page.drawRectangle({ x: 0, y: 0, width, height, color: PAPER });
    page.drawRectangle({
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: height - margin * 2,
      borderColor: INK,
      borderWidth: 1.5,
    });
    page.drawRectangle({
      x: margin + 10,
      y: margin + 10,
      width: width - (margin + 10) * 2,
      height: height - (margin + 10) * 2,
      borderColor: AMBER,
      borderWidth: 1,
    });

    // Logo, top-left
    try {
      const logoBytes = readFileSync(join(ASSETS_DIR, 'logo.png'));
      const logo = await doc.embedPng(logoBytes);
      const logoHeight = 34;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      page.drawImage(logo, { x: margin + 36, y: height - margin - 64, width: logoWidth, height: logoHeight });
    } catch {
      // Logo asset missing in this environment; certificate is still valid without it.
    }

    page.drawText('LexAssess', {
      x: margin + 80,
      y: height - margin - 54,
      size: 18,
      font: interBold,
      color: INK,
    });
    page.drawText('LEGAL TALENT ASSESSMENT PLATFORM', {
      x: margin + 80,
      y: height - margin - 70,
      size: 8,
      font: interSemiBold,
      color: MUTED,
    });

    // Eyebrow + title
    centerText(page, interSemiBold, 'CERTIFICATE OF ACHIEVEMENT', height - 150, 11, width, MUTED, 3);
    page.drawLine({
      start: { x: width / 2 - 28, y: height - 165 },
      end: { x: width / 2 + 28, y: height - 165 },
      thickness: 1.5,
      color: AMBER,
    });

    centerText(page, inter, 'This certifies that', height - 200, 14, width, MUTED);
    centerText(page, interBold, input.fullName, height - 240, 30, width, INK);

    if (input.rollNumber) {
      centerText(page, inter, `Roll No. ${input.rollNumber}`, height - 262, 11, width, MUTED);
    }

    centerText(
      page,
      inter,
      `has achieved Rank #${input.rank} in ${input.practiceArea} on the LexAssess common leaderboard`,
      height - 300,
      14,
      width,
      INK,
    );
    centerText(
      page,
      interSemiBold,
      `Common Score  ${input.commonScore.toFixed(2)} / 100`,
      height - 324,
      12,
      width,
      MUTED,
    );

    // Footer: issuing authority + signature line (left), QR (right)
    const footerY = margin + 40;
    page.drawLine({
      start: { x: margin + 36, y: footerY + 38 },
      end: { x: margin + 220, y: footerY + 38 },
      thickness: 1,
      color: BORDER,
    });
    page.drawText('Issuing Authority', { x: margin + 36, y: footerY + 22, size: 11, font: interSemiBold, color: INK });
    page.drawText('LexAssess Verification Board', {
      x: margin + 36,
      y: footerY + 8,
      size: 9,
      font: inter,
      color: MUTED,
    });

    page.drawText(`Certificate ID: ${input.verificationCode}`, {
      x: margin + 36,
      y: footerY - 14,
      size: 8,
      font: inter,
      color: MUTED,
    });
    page.drawText(`Issued ${input.issuedAt.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
      x: margin + 36,
      y: footerY - 26,
      size: 8,
      font: inter,
      color: MUTED,
    });

    const qrDataUrl = await QRCode.toDataURL(input.verifyUrl, {
      margin: 0,
      width: 200,
      color: { dark: '#171717', light: '#f9f9f6' },
    });
    const qrImage = await doc.embedPng(qrDataUrl);
    const qrSize = 84;
    const qrX = width - margin - 36 - qrSize;
    page.drawImage(qrImage, { x: qrX, y: footerY - 6, width: qrSize, height: qrSize });
    centerTextInBox(page, inter, 'Scan to verify', qrX, footerY - 18, qrSize, 8, MUTED);

    return doc.save();
  }
}

function centerText(
  page: import('pdf-lib').PDFPage,
  font: import('pdf-lib').PDFFont,
  text: string,
  y: number,
  size: number,
  pageWidth: number,
  color: ReturnType<typeof rgb>,
  letterSpacing = 0,
) {
  const baseWidth = font.widthOfTextAtSize(text, size);
  const totalWidth = letterSpacing ? baseWidth + letterSpacing * (text.length - 1) : baseWidth;
  let x = (pageWidth - totalWidth) / 2;

  if (!letterSpacing) {
    page.drawText(text, { x, y, size, font, color });
    return;
  }

  for (const char of text) {
    page.drawText(char, { x, y, size, font, color });
    x += font.widthOfTextAtSize(char, size) + letterSpacing;
  }
}

function centerTextInBox(
  page: import('pdf-lib').PDFPage,
  font: import('pdf-lib').PDFFont,
  text: string,
  boxX: number,
  y: number,
  boxWidth: number,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: boxX + (boxWidth - textWidth) / 2, y, size, font, color });
}
