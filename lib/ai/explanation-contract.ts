export const EXPLANATION_VERSION = "adaptive-v2" as const;

export type ExplanationPayload = {
  questionKey?: string;
  source?: "national-exam" | "material";
  sourceLabel?: string;
  stem?: string;
  options?: string[];
  correctIndex?: number | null;
  userAnswer?: number | null;
  uncertain?: boolean;
  existingExplanation?: string | null;
};

type StudyAidFormat =
  | "none"
  | "bullets"
  | "comparison_table"
  | "steps"
  | "formula"
  | "interpretation";

type AdaptiveStudyAid = {
  format: StudyAidFormat;
  title: string;
  bullets: string[];
  tableHeaders: string[];
  tableRows: string[][];
  steps: string[];
  formulaLines: string[];
  interpretationClues: string[];
};

export type ExplanationResult = {
  version: typeof EXPLANATION_VERSION;
  whatItTests: string;
  correctAnswer: string;
  whyCorrect: string;
  optionAnalysis: Array<{ label: string; explanation: string }>;
  keyTakeaways: string[];
  memoryPoint: string;
  commonTrap: string;
  studyAid: AdaptiveStudyAid;
};

export type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
};

const stringArray = {
  type: "array",
  maxItems: 8,
  items: { type: "string" },
} as const;

export const explanationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "string", enum: [EXPLANATION_VERSION] },
    whatItTests: { type: "string" },
    correctAnswer: { type: "string" },
    whyCorrect: { type: "string" },
    optionAnalysis: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["label", "explanation"],
      },
    },
    keyTakeaways: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string" },
    },
    memoryPoint: { type: "string" },
    commonTrap: { type: "string" },
    studyAid: {
      type: "object",
      additionalProperties: false,
      properties: {
        format: {
          type: "string",
          enum: [
            "none",
            "bullets",
            "comparison_table",
            "steps",
            "formula",
            "interpretation",
          ],
        },
        title: { type: "string" },
        bullets: stringArray,
        tableHeaders: {
          type: "array",
          maxItems: 5,
          items: { type: "string" },
        },
        tableRows: {
          type: "array",
          maxItems: 7,
          items: {
            type: "array",
            maxItems: 5,
            items: { type: "string" },
          },
        },
        steps: stringArray,
        formulaLines: stringArray,
        interpretationClues: stringArray,
      },
      required: [
        "format",
        "title",
        "bullets",
        "tableHeaders",
        "tableRows",
        "steps",
        "formulaLines",
        "interpretationClues",
      ],
    },
  },
  required: [
    "version",
    "whatItTests",
    "correctAnswer",
    "whyCorrect",
    "optionAnalysis",
    "keyTakeaways",
    "memoryPoint",
    "commonTrap",
    "studyAid",
  ],
} as const;

export function getOutputText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (
        content.type === "output_text" &&
        typeof content.text === "string" &&
        content.text.trim()
      ) {
        return content.text;
      }
    }
  }
  return "";
}
