import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

// <input type="datetime-local"> values are India wall-clock time (India-only product); anchor them to +05:30.
export const istInputToIso = (local: string) => (local ? `${local}:00+05:30` : '')
export const isoToIstInput = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 16)
export const formatIst = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    : '-'
