import { NotFoundException } from '@nestjs/common';
import { CertificatesService } from './certificates.service';

function setup(opts: { existing?: any; mailFails?: boolean } = {}) {
  const saved: any[] = [];
  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'student@example.com', role: 'USER' }),
    },
    userProfile: { findUnique: jest.fn().mockResolvedValue({ rollNumber: 'LX26-0042' }) },
    certificate: {
      findUnique: jest.fn().mockResolvedValue(opts.existing ?? null),
      upsert: jest.fn(async ({ create, update }: any) => {
        const row = { ...(opts.existing ?? create), ...(opts.existing ? update : {}), issuedAt: new Date('2026-11-05') };
        saved.push({ create, update });
        return row;
      }),
    },
  };
  const ranking: any = { getLiveEntry: jest.fn().mockResolvedValue(null), getReleasedRank: jest.fn().mockResolvedValue(null) };
  const config: any = { get: () => 'https://lexassess.in,http://localhost:5173' };
  const storage: any = {
    uploadFile: jest.fn().mockResolvedValue(undefined),
    getSignedUrl: jest.fn().mockResolvedValue('https://signed/url'),
  };
  const mail: any = {
    sendCertificateIssued: opts.mailFails ? jest.fn().mockRejectedValue(new Error('smtp down')) : jest.fn().mockResolvedValue({}),
  };
  const service = new CertificatesService(prisma, ranking, config, storage, mail);
  // PDF rendering is covered by rendering checks; keep these tests fast and focused on the flow
  const buildPdf = jest.spyOn(service as any, 'buildPdf').mockResolvedValue(new Uint8Array([1, 2, 3]));
  return { service, prisma, ranking, storage, mail, buildPdf, saved };
}

const input = { userId: 'u1', fullName: ' Aarav Mehta ', practiceArea: 'Corporate Law', commonScore: null, rank: 12 };

describe('CertificatesService (superadmin issuing)', () => {
  it('issues a new certificate with no score, stores the rank and emails the PDF', async () => {
    const { service, saved, mail, storage, buildPdf } = setup();
    const res = await service.issueByAdmin('admin1', input);

    expect(buildPdf).toHaveBeenCalledWith(expect.objectContaining({ commonScore: null, fullName: 'Aarav Mehta', rollNumber: 'LX26-0042' }));
    expect(storage.uploadFile).toHaveBeenCalledWith('certificate/u1.pdf', expect.any(Buffer), 'application/pdf');
    expect(saved[0].create).toMatchObject({ userId: 'u1', commonScore: null, manualRank: 12, issuedById: 'admin1' });
    const code = saved[0].create.verificationCode;
    // First FRONTEND_ORIGIN entry is the public site
    expect(mail.sendCertificateIssued).toHaveBeenCalledWith(
      'student@example.com', 'Aarav Mehta', 'LX26-0042', 'Corporate Law', `https://lexassess.in/verify/${code}`, expect.any(Buffer),
    );
    expect(res).toMatchObject({ emailed: true, email: 'student@example.com' });
  });

  it('keeps the existing verification code so the QR and link stay valid', async () => {
    const existing = { userId: 'u1', verificationCode: 'keep-me', issuedAt: new Date('2026-01-01'), pdfObjectKey: 'certificate/u1.pdf' };
    const { service, saved, buildPdf } = setup({ existing });
    await service.issueByAdmin('admin1', { ...input, commonScore: 81.25 });
    expect(saved[0].create.verificationCode).toBe('keep-me');
    expect(buildPdf).toHaveBeenCalledWith(expect.objectContaining({ verificationCode: 'keep-me', issuedAt: existing.issuedAt, commonScore: 81.25 }));
  });

  it('keeps the certificate when the email fails and reports it', async () => {
    const { service, saved } = setup({ mailFails: true });
    const res = await service.issueByAdmin('admin1', input);
    expect(saved).toHaveLength(1);
    expect(res.emailed).toBe(false);
  });

  it('preview neither stores nor emails', async () => {
    const { service, storage, mail, prisma } = setup();
    const pdf = await service.previewForAdmin(input);
    expect(pdf).toBeInstanceOf(Buffer);
    expect(storage.uploadFile).not.toHaveBeenCalled();
    expect(prisma.certificate.upsert).not.toHaveBeenCalled();
    expect(mail.sendCertificateIssued).not.toHaveBeenCalled();
  });

  it('rejects an unknown user', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.issueByAdmin('admin1', input)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('verification shows a superadmin-assigned rank ahead of released ranks', async () => {
    const { service, prisma, ranking } = setup();
    prisma.certificate.findUnique.mockResolvedValue({
      userId: 'u1', verificationCode: 'c1', fullName: 'A', rollNumber: null, practiceArea: 'Tax', commonScore: null,
      manualRank: 3, pdfObjectKey: 'k', issuedAt: new Date(),
    });
    ranking.getReleasedRank.mockResolvedValue({ rank: 40, releaseLabel: 'Oct', releasedAt: new Date() });
    await expect(service.verifyByCode('c1')).resolves.toMatchObject({ commonScore: null, rank: { status: 'ASSIGNED', rank: 3 } });
  });

  it('verification falls back to the released rank when none was assigned', async () => {
    const { service, prisma, ranking } = setup();
    prisma.certificate.findUnique.mockResolvedValue({
      userId: 'u1', verificationCode: 'c1', fullName: 'A', rollNumber: null, practiceArea: 'Tax', commonScore: 70,
      manualRank: null, pdfObjectKey: 'k', issuedAt: new Date(),
    });
    ranking.getReleasedRank.mockResolvedValue({ rank: 40, releaseLabel: 'Oct', releasedAt: new Date() });
    await expect(service.verifyByCode('c1')).resolves.toMatchObject({ rank: { status: 'RELEASED', rank: 40 } });
  });
});
