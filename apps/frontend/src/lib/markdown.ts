// Minimal markdown renderer (no extra deps) for admin-authored paper text.
export function renderMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-heading font-bold mb-4 mt-8 text-foreground">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-heading font-bold mb-3 mt-6 text-foreground">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-heading font-bold mb-2 mt-4 text-foreground">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/^---$/gm, '<hr class="border-t border-border/60 my-8"/>')
    .replace(/^- (.+)$/gm, '<li class="ml-6 mb-2 list-disc text-muted-foreground">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-6 mb-2 list-decimal text-muted-foreground">$1</li>')
    .replace(/^(?!<[hlid])(.+)$/gm, '<p class="mb-4 text-muted-foreground leading-relaxed">$1</p>')
    .replace(/\n/g, '')
}
