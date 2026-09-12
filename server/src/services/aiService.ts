
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

interface GeneratedQuestion {
  questionText: string;
  keywords: string[];
}

interface AnswerEvaluation {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  feedback: string;
}

interface AnswerForSummary {
  questionText: string;
  transcript: string;
  score: number;
}

console.log("AI SERVICE KEY:", process.env.GROQ_API_KEY);

const assertApiKey = () => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  //const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not defined in environment variables");
  }
};

/**
 * Shared helper for calling Groq's OpenAI-compatible chat completions
 * endpoint. Centralizing this keeps the exported functions focused on
 * building their prompt and shaping their result, instead of repeating
 * fetch/error-handling boilerplate.
 */
const callGroq = async (
  prompt: string,
  options: { temperature: number; jsonMode?: boolean },
): Promise<string> => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: options.temperature,
      ...(options.jsonMode
        ? { response_format: { type: "json_object" } }
        : {}),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq API returned an unexpected response shape");
  }

  return content;
};

export const generateInterviewQuestion = async (
  topicLabel: string,
  difficulty: string,
  avoidQuestionTexts: string[],
): Promise<GeneratedQuestion> => {
  assertApiKey();

  const avoidBlock = avoidQuestionTexts.length
    ? `\nDo NOT repeat or closely rephrase any of these already-used questions:\n${avoidQuestionTexts
        .map((q) => `- ${q}`)
        .join("\n")}\n`
    : "";

  const prompt = `
You are a senior technical interviewer at a top tech company, building a
question bank for real ${topicLabel} interviews.

Generate ONE interview question on the topic "${topicLabel}" at "${difficulty}"
difficulty. The question must be:
- The kind of question actually asked in real software engineering interviews
  (FAANG/product-company style) — NOT a dry textbook definition question like
  "What is X?" or "Define Y".
- Specific and thought-provoking: prefer scenario-based, "why/how", compare
  trade-offs, debug-this, or design-oriented phrasing.
- Answerable out loud in 1-3 minutes.
- Calibrated to "${difficulty}": Easy = a fundamental concept every working
  developer should know, but asked in an applied way; Medium = requires
  explaining trade-offs or comparing approaches; Hard = requires reasoning
  through an edge case, failure scenario, or a small design problem.
${avoidBlock}
Respond with ONLY valid JSON in this exact shape, no extra text, no markdown
code fences:
{
  "questionText": "<the interview question>",
  "keywords": [<3-6 short strings naming the key concepts a strong answer should mention>]
}
`.trim();

  // Higher temperature than evaluateAnswer's 0.4 — we want varied, creative
  // questions here, not deterministic scoring.
  const rawText = await callGroq(prompt, { temperature: 0.9, jsonMode: true });
  const parsed = JSON.parse(rawText);

  if (!parsed.questionText || typeof parsed.questionText !== "string") {
    throw new Error("Groq API returned an invalid question shape");
  }

  return {
    questionText: parsed.questionText.trim(),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
  };
};

export const evaluateAnswer = async (
  questionText: string,
  keywords: string[],
  userAnswer: string,
): Promise<AnswerEvaluation> => {
  assertApiKey();

  const prompt = `
You are an expert technical interviewer evaluating a candidate's spoken answer.

Question: "${questionText}"
Expected key concepts: ${keywords.length ? keywords.join(", ") : "none provided"}
Candidate's answer: "${userAnswer}"

Evaluate the answer and respond with ONLY valid JSON in this exact shape,
no extra text, no markdown code fences:
{
  "score": <integer 1-10>,
  "strengths": [<0-3 short strings>],
  "weaknesses": [<0-3 short strings>],
  "suggestions": [<1-2 short, actionable strings>],
  "feedback": "<2-3 sentence direct feedback to the candidate>"
}
`.trim();

  const rawText = await callGroq(prompt, { temperature: 0.4, jsonMode: true });
  const parsed = JSON.parse(rawText);

  return {
    score: Math.min(10, Math.max(1, Math.round(parsed.score))),
    strengths: parsed.strengths ?? [],
    weaknesses: parsed.weaknesses ?? [],
    suggestions: parsed.suggestions ?? [],
    feedback: parsed.feedback ?? "",
  };
};

export const generateOverallSummary = async (
  topic: string,
  answers: AnswerForSummary[],
): Promise<string> => {
  assertApiKey();

  const transcriptBlock = answers
    .map(
      (a, i) =>
        `Q${i + 1}: ${a.questionText}\nAnswer: ${a.transcript}\nScore: ${a.score}/10`,
    )
    .join("\n\n");

  const prompt = `
You are an interview coach. Below is a full mock interview transcript on the topic "${topic}".

${transcriptBlock}

Write a short, encouraging but honest overall summary (3-4 sentences) of the
candidate's performance: what they did well, what to improve, and one
concrete tip for next time. Return ONLY the summary text, no JSON, no headers.
`.trim();

  const summary = await callGroq(prompt, { temperature: 0.6 });

  return summary?.trim() ?? "";
};