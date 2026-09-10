const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

const assertApiKey = () => {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }
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

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("Gemini API returned an unexpected response shape");
  }

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

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  return summary?.trim() ?? "";
};
