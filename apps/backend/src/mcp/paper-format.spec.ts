import {
  convertPaper,
  paperContentSchema,
  type PaperContent,
} from './paper-format';

function paper(overrides: Partial<PaperContent> = {}): PaperContent {
  return {
    title: 'Legal Tech Law Assessment Examination',
    timeLimitMinutes: 180,
    instructions: '# Instructions',
    sections: [
      {
        title: 'SECTION A',
        rules: { allowTabSwitching: false, timeLimitSeconds: 120 },
        questions: [
          {
            type: 'MCQ',
            text: 'Pick one',
            marks: 2,
            options: ['Alpha', ' Beta ', 'Gamma'],
            answer: 'Beta',
          },
          { type: 'MCQ', text: 'No key', marks: 2, options: ['Yes', 'No'] },
        ],
      },
      {
        title: 'SECTION B',
        rules: { questionsToAttempt: 1 },
        questions: [
          {
            type: 'SUBJECTIVE',
            text: 'Facts',
            marks: 20,
            subQuestions: [
              { text: '### (a)\nOne', marks: 12 },
              { text: '### (b)\nTwo', marks: 8 },
            ],
          },
          { type: 'SUBJECTIVE', text: 'Other', marks: 15 },
        ],
      },
    ],
    ...overrides,
  };
}

describe('convertPaper', () => {
  it('maps option text answers to letters and orders everything by position', () => {
    const { sections } = convertPaper(paper());
    const mcq = sections[0]!.questions![0]!;
    expect(mcq.options).toEqual([
      { id: 'A', text: 'Alpha' },
      { id: 'B', text: 'Beta' },
      { id: 'C', text: 'Gamma' },
    ]);
    expect(mcq.answer).toBe('B');
    expect(sections.map((s) => s.order)).toEqual([1, 2]);
    expect(
      sections[1]!.questions![0]!.subQuestions!.map((q) => q.order),
    ).toEqual([1, 2]);
  });

  it('flags MCQs without an answer instead of rejecting the paper', () => {
    const { summary, sections } = convertPaper(paper());
    expect(sections[0]!.questions![1]!.answer).toBeUndefined();
    expect(summary.mcqsWithoutAnswer).toEqual(['Section 1 ("SECTION A") Q2']);
  });

  it('counts only the best N questions towards total marks for "attempt any N"', () => {
    const { summary } = convertPaper(paper());
    expect(summary.questionCount).toBe(4);
    expect(summary.totalMarks).toBe(4 + 20);
  });

  it('reports every problem at once', () => {
    const bad = paper();
    bad.sections[0]!.questions[0] = {
      type: 'MCQ',
      text: 'x',
      marks: 2,
      options: ['A1', 'B1'],
      answer: 'C1',
    };
    bad.sections[1]!.rules = { questionsToAttempt: 5 };
    bad.sections[1]!.questions[0] = {
      type: 'SUBJECTIVE',
      text: 'x',
      marks: 20,
      subQuestions: [{ text: 'a', marks: 5 }],
    };
    expect(() => convertPaper(bad)).toThrow(
      /3 problem\(s\)[\s\S]*does not exactly match[\s\S]*questionsToAttempt is 5[\s\S]*add up to 5/,
    );
  });

  it('rejects unknown question types at the schema', () => {
    const raw = {
      ...paper(),
      sections: [
        { title: 'S', questions: [{ type: 'ESSAY', text: 'x', marks: 1 }] },
      ],
    };
    expect(paperContentSchema.safeParse(raw).success).toBe(false);
  });
});
