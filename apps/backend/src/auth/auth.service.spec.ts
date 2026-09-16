import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

// users.service.ts transitively imports uploads.service.ts, which imports the ESM-only
// `file-type` package; ts-jest doesn't transform node_modules by default, so stub it out -
// this test never exercises real file-type detection.
jest.mock('file-type', () => ({ fileTypeFromBuffer: jest.fn() }));

describe('AuthService.requestPasswordReset', () => {
  let usersService: { findByEmail: jest.Mock; createPasswordSetupToken: jest.Mock };
  let mailService: { sendForgotPassword: jest.Mock };
  let authService: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      createPasswordSetupToken: jest.fn(),
    };
    mailService = {
      sendForgotPassword: jest.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(
      usersService as unknown as UsersService,
      {} as JwtService,
      { get: jest.fn() } as unknown as ConfigService,
      mailService as unknown as MailService,
    );
  });

  it('does nothing and does not throw when no user exists for the email', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(authService.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();

    expect(mailService.sendForgotPassword).not.toHaveBeenCalled();
  });

  it('creates a token and sends the reset email when the user exists', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'user-1', name: 'Jane', email: 'jane@example.com' });
    usersService.createPasswordSetupToken.mockResolvedValue(undefined);

    await authService.requestPasswordReset('jane@example.com');

    expect(mailService.sendForgotPassword).toHaveBeenCalledWith('jane@example.com', 'Jane', expect.any(String));
  });

  it('swallows a mail-sending failure instead of throwing', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'user-1', name: 'Jane', email: 'jane@example.com' });
    usersService.createPasswordSetupToken.mockResolvedValue(undefined);
    mailService.sendForgotPassword.mockRejectedValue(new Error('SMTP down'));

    await expect(authService.requestPasswordReset('jane@example.com')).resolves.toBeUndefined();
  });
});
