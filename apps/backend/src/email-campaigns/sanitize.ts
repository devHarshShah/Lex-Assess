import sanitizeHtml from 'sanitize-html';
import { escapeHtml } from './variables';

// Only real markup counts: a pasted "<name>" placeholder in plain text must stay text
const LOOKS_LIKE_HTML = /<\/?(p|h[1-6]|div|a|br|ul|ol|li|strong|b|em|i|u|img|hr|table|tr|td|span|body|html)[\s>/]/i;
const BUTTON = /\[([^\]\n]{1,80})\]\(([^)\s]+)\)/g;

// Plain text in -> simple HTML: blank line = paragraph, newline = <br>, [Text](url) = button.
export function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const escaped = escapeHtml(p).replace(/\n/g, '<br>');
      const withButtons = escaped.replace(BUTTON, (_, label: string, url: string) => `<a class="btn" href="${url}">${label}</a>`);
      return withButtons.startsWith('<a class="btn"') && withButtons.endsWith('</a>') && !withButtons.includes('<br>')
        ? `<p class="btn-row">${withButtons}</p>`
        : `<p>${withButtons}</p>`;
    })
    .join('\n');
}

// Keeps only formatting tags and safe links. Run once on save; output is safe to store and to render.
export function sanitizeBody(raw: string): string {
  const html = LOOKS_LIKE_HTML.test(raw) ? raw : plainTextToHtml(raw);
  return sanitizeHtml(html, {
    allowedTags: ['p', 'h2', 'h3', 'a', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'br', 'hr', 'img', 'div'],
    allowedAttributes: {
      a: ['href', 'class'],
      img: ['src', 'alt', 'width', 'height'],
      div: ['class'],
      p: ['class'],
    },
    allowedClasses: { a: ['btn'], div: ['coupon', 'callout'], p: ['btn-row'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    // {{variable}} placeholders in links have no scheme and must survive
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    disallowedTagsMode: 'discard',
  }).trim();
}
