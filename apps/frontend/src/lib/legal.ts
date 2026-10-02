// Bump TERMS_VERSION whenever the disclaimer or Terms of Use change materially: it re-prompts
// every visitor and is the version recorded against a payment.
export const TERMS_VERSION = '2026-10-01'

const DISCLAIMER_KEY = 'lexassess_disclaimer_accepted'

export const DISCLAIMER_PARAGRAPHS: string[] = [
  'LexAssess is an assessment and career-information platform. Scores, ranks and certificates reflect performance in a particular paper on a particular date; they are not a guarantee, endorsement or certification of professional competence.',
  'Internship and placement opportunities are facilitated in good faith through third-party organisations. LexAssess does not guarantee selection, placement, stipend or any outcome, and is not the employer or principal of any intern, nor the agent of any recruiter.',
  'Question papers, answer keys and other content are for assessment purposes only, do not constitute legal advice, and create no advocate–client relationship.',
  'All content is protected by copyright and may not be copied, shared or reproduced without written permission.',
  'To the extent permitted by law, LexAssess and its founders are not liable for indirect or consequential loss arising from use of the site.',
]

// localStorage can throw (private mode, blocked site data), so every access is guarded. When
// storage is unavailable the notice simply shows again next visit.
export function hasAcceptedDisclaimer(): boolean {
  try {
    const raw = localStorage.getItem(DISCLAIMER_KEY)
    if (!raw) return false
    return (JSON.parse(raw) as { version?: string }).version === TERMS_VERSION
  } catch {
    return false
  }
}

export function acceptDisclaimer(): void {
  try {
    localStorage.setItem(DISCLAIMER_KEY, JSON.stringify({ version: TERMS_VERSION, acceptedAt: new Date().toISOString() }))
  } catch {
    // Ignore: the visitor is let through for this session either way.
  }
}
