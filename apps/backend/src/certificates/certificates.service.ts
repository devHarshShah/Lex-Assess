import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { READ_URL_EXPIRY_SECONDS, StorageService } from '../common/storage.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { hasAccess } from '../payments/access';
import { RankingService } from '../ranking/ranking.service';

const ASSETS_DIR = join(__dirname, 'assets');

// Palette sampled from the certificate design (see certificate-template/).
const INK = rgb(0x19 / 255, 0x14 / 255, 0x0e / 255);
const MUTED = rgb(0x59 / 255, 0x53 / 255, 0x45 / 255);
const SLASH = rgb(0x7a / 255, 0x70 / 255, 0x68 / 255);
const GOLD_STOPS: Array<[number, [number, number, number]]> = [
  [0, [0x6d, 0x47, 0x0f]],
  [0.45, [0xb5, 0x8c, 0x3c]],
  [1, [0x69, 0x44, 0x0e]],
];

// The static artwork is authored on a 1400 x 990 canvas (A4 landscape); every coordinate
// below is in those "design px" and is scaled to PDF points by S.
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const S = PAGE_W / 1400;
const px = (v: number) => v * S;
const py = (v: number) => PAGE_H - v * S;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface CertificateDto {
  verificationCode: string;
  fullName: string;
  rollNumber: string | null;
  practiceArea: string;
  commonScore: number;
  pdfUrl: string | null;
  issuedAt: Date;
}

export interface CertificateVerifyDto extends CertificateDto {
  // Rank as of the latest admin release; PENDING until the candidate is included in one.
  rank:
    | { status: 'RELEASED'; rank: number; releaseLabel: string; releasedAt: Date }
    | { status: 'PENDING' };
}

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly mailService: MailService,
  ) {}

  async getMyCertificate(userId: string): Promise<CertificateDto | null> {
    const existing = await this.prisma.certificate.findUnique({ where: { userId } });
    return existing ? this.toDto(existing) : null;
  }

  async generateForUser(userId: string): Promise<CertificateDto> {
    const rankEntry = await this.rankingService.getLiveEntry(userId);
    if (!rankEntry) {
      // Students whose access ended drop out of the ranking: they keep their old
      // certificate but can't generate a new one until they resubscribe.
      const account = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { hasActiveSubscription: true, accessEndsAt: true },
      });
      if (account && !hasAccess(account)) {
        throw new BadRequestException(
          'Your access has ended, so a new certificate cannot be generated. You can still download your existing certificate. Resubscribe to generate a new one.',
        );
      }
      throw new BadRequestException(
        'You are not yet eligible for a certificate. A submitted, scored test attempt and a completed, marked interview are required.',
      );
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { fullName: true, rollNumber: true },
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } });
    const fullName = profile?.fullName || user.name;

    const existing = await this.prisma.certificate.findUnique({ where: { userId } });
    const verificationCode = existing?.verificationCode ?? randomUUID();

    const frontendOrigin = this.configService.get<string>('FRONTEND_ORIGIN') || 'http://localhost:5173';
    const verifyUrl = `${frontendOrigin}/verify/${verificationCode}`;

    const pdfBytes = await this.buildPdf({
      fullName,
      rollNumber: profile?.rollNumber ?? null,
      practiceArea: rankEntry.practiceArea,
      commonScore: rankEntry.commonScore,
      verifyUrl,
      verificationCode,
      issuedAt: existing?.issuedAt ?? new Date(),
    });

    const pdfObjectKey = `certificate/${userId}.pdf`;
    await this.storageService.uploadFile(pdfObjectKey, Buffer.from(pdfBytes), 'application/pdf');

    const saved = await this.prisma.certificate.upsert({
      where: { userId },
      create: {
        userId,
        verificationCode,
        rollNumber: profile?.rollNumber ?? null,
        fullName,
        practiceArea: rankEntry.practiceArea,
        commonScore: rankEntry.commonScore,
        pdfObjectKey,
      },
      update: {
        rollNumber: profile?.rollNumber ?? null,
        fullName,
        practiceArea: rankEntry.practiceArea,
        commonScore: rankEntry.commonScore,
        pdfObjectKey,
      },
    });

    if (!existing) {
      try {
        await this.mailService.sendCertificateReady(user.email, fullName, profile?.rollNumber ?? '-', rankEntry.practiceArea);
      } catch (error) {
        // A mail failure should never break certificate generation itself.
        this.logger.error('Failed to send certificate ready email', error as Error);
      }
    }

    return this.toDto(saved);
  }

  async verifyByCode(code: string): Promise<CertificateVerifyDto> {
    const certificate = await this.prisma.certificate.findUnique({ where: { verificationCode: code } });
    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }
    return this.toVerifyDto(certificate);
  }

  private async toDto(certificate: {
    verificationCode: string;
    fullName: string;
    rollNumber: string | null;
    practiceArea: string;
    commonScore: number;
    pdfObjectKey: string;
    issuedAt: Date;
  }): Promise<CertificateDto> {
    return {
      verificationCode: certificate.verificationCode,
      fullName: certificate.fullName,
      rollNumber: certificate.rollNumber,
      practiceArea: certificate.practiceArea,
      commonScore: certificate.commonScore,
      pdfUrl: await this.storageService.getSignedUrl(certificate.pdfObjectKey, READ_URL_EXPIRY_SECONDS),
      issuedAt: certificate.issuedAt,
    };
  }

  private async toVerifyDto(certificate: {
    userId: string;
    verificationCode: string;
    fullName: string;
    rollNumber: string | null;
    practiceArea: string;
    commonScore: number;
    pdfObjectKey: string;
    issuedAt: Date;
  }): Promise<CertificateVerifyDto> {
    const base = await this.toDto(certificate);

    let rank: CertificateVerifyDto['rank'] = { status: 'PENDING' };
    try {
      const released = await this.rankingService.getReleasedRank(certificate.userId);
      if (released) {
        rank = { status: 'RELEASED', rank: released.rank, releaseLabel: released.releaseLabel, releasedAt: released.releasedAt };
      }
    } catch (error) {
      this.logger.error('Failed to load released rank for certificate verification', error as Error);
    }

    return { ...base, rank };
  }

  private async buildPdf(input: {
    fullName: string;
    rollNumber: string | null;
    practiceArea: string;
    commonScore: number;
    verifyUrl: string;
    verificationCode: string;
    issuedAt: Date;
  }): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    const loadFont = (file: string, features?: Record<string, boolean>) =>
      doc.embedFont(readFileSync(join(ASSETS_DIR, file)), { subset: true, features });
    const [nameFont, areaFont, scoreFont, slashFont, rollFont, metaFont] = await Promise.all([
      loadFont('cormorant-garamond-latin-700-italic.woff'),
      loadFont('cormorant-garamond-latin-700-normal.woff'),
      loadFont('cormorant-garamond-latin-700-normal.woff', { lnum: true }),
      loadFont('cormorant-garamond-latin-400-normal.woff', { lnum: true }),
      loadFont('jost-latin-500-normal.woff'),
      loadFont('jost-latin-400-normal.woff'),
    ]);

    const page = doc.addPage([PAGE_W, PAGE_H]);

    // Static artwork: frame, watermark, seal and fixed copy.
    const background = await doc.embedJpg(readFileSync(join(ASSETS_DIR, 'certificate-bg.jpg')));
    page.drawImage(background, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });

    // Recipient name, shrunk to fit if it is long.
    const fullName = printable(nameFont, input.fullName);
    const nameSize = fitSize(nameFont, fullName, 88, 800, 38);
    drawCentered(page, nameFont, fullName, 700, 451, nameSize, INK);

    // Roll number: "ROLL NO.   LX26-0002", letter-spaced.
    if (input.rollNumber) {
      const rollSize = 14.5;
      const tracking = rollSize * 0.27 * S;
      const label = 'ROLL NO.';
      const value = printable(rollFont, input.rollNumber);
      const labelW = spacedWidth(rollFont, label, px(rollSize), tracking);
      const valueW = spacedWidth(rollFont, value, px(rollSize), tracking);
      const gap = px(18);
      let x = px(700) - (labelW + gap + valueW) / 2;
      x = drawSpaced(page, rollFont, label, x, py(523.5), px(rollSize), tracking, MUTED);
      drawSpaced(page, rollFont, value, x + gap, py(523.5), px(rollSize), tracking, MUTED);
    }

    // Practice area: gold gradient headline flanked by laurel branches.
    const area = printable(areaFont, input.practiceArea);
    const areaSize = fitSize(areaFont, area, 68.5, 640, 30);
    const areaWidth = px(areaFont.widthOfTextAtSize(area, areaSize));
    const areaX = px(700) - areaWidth / 2;
    drawGradientText(page, areaFont, area, areaX, py(620), px(areaSize), GOLD_STOPS);

    const laurelW = px(160);
    const laurelH = px(72);
    const laurelY = py(632);
    const [laurelLeft, laurelRight] = await Promise.all([
      doc.embedPng(readFileSync(join(ASSETS_DIR, 'laurel-left.png'))),
      doc.embedPng(readFileSync(join(ASSETS_DIR, 'laurel-right.png'))),
    ]);
    page.drawImage(laurelLeft, { x: areaX - px(21) - laurelW, y: laurelY, width: laurelW, height: laurelH });
    page.drawImage(laurelRight, { x: areaX + areaWidth + px(21), y: laurelY, width: laurelW, height: laurelH });

    // Common score, inside the pill.
    const score = input.commonScore.toFixed(2);
    const scoreSize = px(40);
    const slashSize = px(24);
    const scoreW = scoreFont.widthOfTextAtSize(score, scoreSize);
    const slashText = '/ 100';
    const slashW = slashFont.widthOfTextAtSize(slashText, slashSize);
    const scoreGap = px(7);
    const scoreX = px(802) - (scoreW + scoreGap + slashW) / 2;
    page.drawText(score, { x: scoreX, y: py(735.6), size: scoreSize, font: scoreFont, color: INK });
    page.drawText(slashText, { x: scoreX + scoreW + scoreGap, y: py(735.6), size: slashSize, font: slashFont, color: SLASH });

    // Footer: certificate ID and issue date.
    page.drawText(input.verificationCode, { x: px(218), y: py(904.8), size: px(12.6), font: metaFont, color: MUTED });
    page.drawText(formatIssueDate(input.issuedAt), { x: px(161.5), y: py(922.4), size: px(12.6), font: metaFont, color: MUTED });

    // Verification QR, inside its frame.
    const qrDataUrl = await QRCode.toDataURL(input.verifyUrl, {
      margin: 0,
      width: 480,
      errorCorrectionLevel: 'M',
      color: { dark: '#19140e', light: '#fdfcf9' },
    });
    const qrImage = await doc.embedPng(qrDataUrl);
    page.drawImage(qrImage, { x: px(1161.5), y: py(767 + 118), width: px(118), height: px(118) });

    return doc.save();
  }
}

type PdfFont = import('pdf-lib').PDFFont;
type PdfPage = import('pdf-lib').PDFPage;
type PdfColor = ReturnType<typeof rgb>;

/** Drops characters the embedded (Latin subset) font cannot encode, so odd input never breaks PDF generation. */
function printable(font: PdfFont, text: string): string {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text.normalize('NFC'))
    .filter((ch) => supported.has(ch.codePointAt(0) as number))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Largest font size (design px, capped at `max`) at which `text` fits `maxWidth` design px. */
function fitSize(font: PdfFont, text: string, max: number, maxWidth: number, min: number): number {
  const width = font.widthOfTextAtSize(text, max);
  if (width <= maxWidth) return max;
  return Math.max(min, (max * maxWidth) / width);
}

function drawCentered(page: PdfPage, font: PdfFont, text: string, cx: number, baseline: number, size: number, color: PdfColor) {
  const width = px(font.widthOfTextAtSize(text, size));
  page.drawText(text, { x: px(cx) - width / 2, y: py(baseline), size: px(size), font, color });
}

function spacedWidth(font: PdfFont, text: string, size: number, tracking: number): number {
  return font.widthOfTextAtSize(text, size) + tracking * Math.max(0, text.length - 1);
}

/** Draws letter-spaced text starting at x; returns the x where it ended. */
function drawSpaced(page: PdfPage, font: PdfFont, text: string, x: number, y: number, size: number, tracking: number, color: PdfColor) {
  let cursor = x;
  for (const ch of text) {
    page.drawText(ch, { x: cursor, y, size, font, color });
    cursor += font.widthOfTextAtSize(ch, size) + tracking;
  }
  return cursor;
}

/** pdf-lib has no text gradients, so colour each glyph from a horizontal gradient. Positions come from prefix widths to keep kerning. */
function drawGradientText(
  page: PdfPage,
  font: PdfFont,
  text: string,
  x: number,
  y: number,
  size: number,
  stops: Array<[number, [number, number, number]]>,
) {
  const glyphs = Array.from(text);
  const total = font.widthOfTextAtSize(text, size / S);
  let prefix = '';
  for (const ch of glyphs) {
    const startW = font.widthOfTextAtSize(prefix, size / S);
    const endW = font.widthOfTextAtSize(prefix + ch, size / S);
    const t = total ? (startW + endW) / 2 / total : 0;
    if (ch.trim()) {
      page.drawText(ch, { x: x + startW * S, y, size, font, color: gradientColor(stops, t) });
    }
    prefix += ch;
  }
}

function gradientColor(stops: Array<[number, [number, number, number]]>, t: number): PdfColor {
  let [, [r, g, b]] = stops[0]!;
  for (let i = 1; i < stops.length; i++) {
    const [t0, c0] = stops[i - 1]!;
    const [t1, c1] = stops[i]!;
    const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    [r, g, b] = [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    if (t <= t1) break;
  }
  return rgb(r / 255, g / 255, b / 255);
}

/** "20 September 2026", in IST regardless of the server timezone or ICU build. */
function formatIssueDate(date: Date): string {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}
