import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

function configServiceStub(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('MailService', () => {
  const createTransportMock = nodemailer.createTransport as jest.Mock;

  beforeEach(() => {
    createTransportMock.mockReset();
  });

  it('falls back to a stream transport when SMTP env vars are unset', () => {
    createTransportMock.mockReturnValue({ sendMail: jest.fn() });

    new MailService(configServiceStub({}));

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ streamTransport: true }),
    );
  });

  it('creates a real SMTP transport when fully configured', () => {
    createTransportMock.mockReturnValue({ sendMail: jest.fn() });

    new MailService(
      configServiceStub({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 587,
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
        SMTP_SECURE: false,
      }),
    );

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        auth: { user: 'user', pass: 'pass' },
      }),
    );
  });

  it('retries on failure and succeeds on a later attempt', async () => {
    jest.useFakeTimers();
    const sendMail = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ messageId: 'abc123' });
    createTransportMock.mockReturnValue({ sendMail });

    const service = new MailService(
      configServiceStub({ SMTP_HOST: 'smtp.example.com', SMTP_USER: 'user', SMTP_PASS: 'pass' }),
    );

    const resultPromise = service.sendMail('to@example.com', 'Subject', '<p>hi</p>');
    await jest.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ messageId: 'abc123' });

    jest.useRealTimers();
  });

  it('throws after exhausting all retry attempts', async () => {
    jest.useFakeTimers();
    const sendMail = jest.fn().mockRejectedValue(new Error('permanent failure'));
    createTransportMock.mockReturnValue({ sendMail });

    const service = new MailService(
      configServiceStub({ SMTP_HOST: 'smtp.example.com', SMTP_USER: 'user', SMTP_PASS: 'pass' }),
    );

    const resultPromise = service.sendMail('to@example.com', 'Subject', '<p>hi</p>');
    // Swallow the eventual rejection so it doesn't surface as an unhandled rejection
    // while fake timers are advanced below.
    resultPromise.catch(() => undefined);

    await jest.advanceTimersByTimeAsync(1000 + 3000 + 9000);
    await expect(resultPromise).rejects.toThrow('permanent failure');
    expect(sendMail).toHaveBeenCalledTimes(4);

    jest.useRealTimers();
  });
});
