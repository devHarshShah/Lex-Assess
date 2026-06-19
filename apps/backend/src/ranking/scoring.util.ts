export interface SectionQuestionMark {
  questionId: string;
  sectionId: string | null;
  marks: number;
}

export interface SectionRule {
  questionsToAttempt?: number;
}

// Given all parent-level questions for a version (with their marks and section),
// the per-section rules, and a student's achieved score per parent question id,
// compute the max possible marks and the achieved marks — both correctly capped
// by each section's questionsToAttempt (defaults to "all questions" when unset).
export function computeVersionMarks(
  questions: SectionQuestionMark[],
  sectionRules: Map<string, SectionRule>,
  achievedByQuestionId?: Map<string, number>,
): { maxMarks: number; achievedMarks: number } {
  const bySection = new Map<string | null, SectionQuestionMark[]>();
  for (const q of questions) {
    const list = bySection.get(q.sectionId) ?? [];
    list.push(q);
    bySection.set(q.sectionId, list);
  }

  let maxMarks = 0;
  let achievedMarks = 0;

  for (const [sectionId, sectionQuestions] of bySection) {
    const cap = sectionId ? sectionRules.get(sectionId)?.questionsToAttempt : undefined;
    const n = cap && cap > 0 && cap < sectionQuestions.length ? cap : sectionQuestions.length;

    // Max marks: top-N questions by marks value (the N a student could best benefit from).
    const byMarksDesc = [...sectionQuestions].sort((a, b) => b.marks - a.marks);
    maxMarks += byMarksDesc.slice(0, n).reduce((sum, q) => sum + q.marks, 0);

    if (achievedByQuestionId) {
      // Achieved: top-N questions by the student's actual achieved score (their best N attempts).
      const byAchievedDesc = [...sectionQuestions].sort(
        (a, b) => (achievedByQuestionId.get(b.questionId) ?? 0) - (achievedByQuestionId.get(a.questionId) ?? 0),
      );
      achievedMarks += byAchievedDesc
        .slice(0, n)
        .reduce((sum, q) => sum + (achievedByQuestionId.get(q.questionId) ?? 0), 0);
    }
  }

  return { maxMarks, achievedMarks };
}
