export function isPublicEmailProvider(email: string): boolean {
  const publicDomains = [
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'hotmail.com',
    'hotmail.co.uk',
    'hotmail.fr',
    'outlook.com',
    'live.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'aol.com',
    'mail.com',
    'protonmail.com',
    'zoho.com',
    'yandex.com',
    'gmx.com',
    'gmx.net',
    'ymail.com',
    'rocketmail.com',
    'fastmail.com',
    'hushmail.com',
  ];

  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return false;
  return publicDomains.includes(domain);
}
