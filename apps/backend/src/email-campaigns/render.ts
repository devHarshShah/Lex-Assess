import { escapeHtml, fillVariables } from './variables';

const BRAND = '#d97706';
const FONT = "Inter, 'Segoe UI', Arial, Helvetica, sans-serif";

export interface RenderInput {
  subject: string;
  preheader: string;
  // Already sanitized (see sanitize.ts)
  bodyHtml: string;
  values: Record<string, string>;
  unsubscribeUrl: string;
  frontendOrigin: string;
}

const BLOCK_STYLES: Record<string, string> = {
  p: `margin:0 0 16px;font-size:16px;line-height:26px;color:#262626;`,
  h2: `margin:0 0 14px;font-size:24px;line-height:32px;font-weight:700;color:#171717;`,
  h3: `margin:0 0 12px;font-size:18px;line-height:26px;font-weight:700;color:#171717;`,
  ul: `margin:0 0 16px;padding-left:22px;font-size:16px;line-height:26px;color:#262626;`,
  ol: `margin:0 0 16px;padding-left:22px;font-size:16px;line-height:26px;color:#262626;`,
  li: `margin:0 0 6px;`,
  hr: `border:0;border-top:1px solid #eeeeee;margin:24px 0;`,
};

const BUTTON_STYLE = `display:inline-block;background:${BRAND};color:#ffffff;padding:13px 28px;border-radius:8px;font-size:16px;font-weight:700;text-decoration:none;`;
const LINK_STYLE = `color:${BRAND};text-decoration:underline;`;
const COUPON_STYLE = `margin:8px 0 22px;padding:18px;border:2px dashed ${BRAND};border-radius:10px;background:#fffbeb;text-align:center;font-size:28px;line-height:34px;font-weight:800;letter-spacing:4px;color:#92400e;`;
const CALLOUT_STYLE = `margin:0 0 20px;padding:16px 18px;border-radius:10px;background:#f9fafb;border:1px solid #eeeeee;font-size:15px;line-height:24px;color:#404040;`;

// Email clients ignore <style>, so the tidy class-based body is turned into inline styles here.
export function inlineStyles(html: string): string {
  return html
    .replace(/<p class="btn-row">/g, '<p style="margin:8px 0 22px;text-align:center;">')
    .replace(/<(p|h2|h3|ul|ol|li|hr)>/g, (_, tag: string) => `<${tag} style="${BLOCK_STYLES[tag]}">`)
    .replace(/<div class="coupon">/g, `<div style="${COUPON_STYLE}">`)
    .replace(/<div class="callout">/g, `<div style="${CALLOUT_STYLE}">`)
    .replace(/<a ([^>]*)>/g, (_, attrs: string) => {
      const isButton = /class="btn"/.test(attrs);
      const clean = attrs.replace(/\s*class="[^"]*"/, '').trim();
      return `<a ${clean} style="${isButton ? BUTTON_STYLE : LINK_STYLE}">`;
    })
    .replace(/<img ([^>]*)>/g, (_, attrs: string) => `<img ${attrs} style="max-width:100%;height:auto;border-radius:8px;margin:0 0 16px;">`);
}

export function htmlToText(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '$2 ($1)')
    .replace(/<\/(p|h2|h3|li|div)>/g, '\n\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Single source of truth for what a campaign email looks like: used by the send worker,
// test sends and the admin preview, so the preview always matches what is delivered.
export function renderCampaignEmail(input: RenderInput): { subject: string; html: string; text: string } {
  const values = { ...input.values, unsubscribeUrl: input.unsubscribeUrl };
  const subject = fillVariables(input.subject, values, 'text').trim();
  const preheader = fillVariables(input.preheader, values, 'text').trim();
  const body = inlineStyles(fillVariables(input.bodyHtml, values, 'html'));
  const logo = `${input.frontendOrigin}/logo.png`;
  const unsubscribe = escapeHtml(input.unsubscribeUrl);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f1;font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f1;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e8e3;">
    <tr><td style="height:5px;background:${BRAND};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:26px 36px 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:10px;"><img src="${escapeHtml(logo)}" width="36" height="36" alt="" style="display:block;border:0;border-radius:8px;"></td>
        <td style="font-family:${FONT};font-size:20px;font-weight:800;color:${BRAND};letter-spacing:-0.3px;">LexAssess</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:18px 36px 18px;font-family:${FONT};">${body}</td></tr>
    <tr><td style="padding:0 36px;"><div style="border-top:1px solid #eeeeee;"></div></td></tr>
    <tr><td style="padding:20px 36px 30px;font-family:${FONT};font-size:12px;line-height:19px;color:#8a8a8a;">
      You are receiving this because you have a LexAssess account.<br>
      <a href="${unsubscribe}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a> from these emails any time. Account and payment emails will still reach you.<br>
      <span style="color:#b0b0b0;">&copy; LexAssess</span>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = `${htmlToText(fillVariables(input.bodyHtml, values, 'html'))}\n\n--\nYou are receiving this because you have a LexAssess account.\nUnsubscribe: ${input.unsubscribeUrl}`;
  return { subject, html, text };
}
