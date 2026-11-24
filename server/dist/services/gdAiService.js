"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateGDPerformance = exports.generatePersonaReply = exports.cleanReply = exports.generatePersonas = exports.FALLBACK_PERSONAS = void 0;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Read lazily (same reason aiService.ts does): env must already be loaded.
// - SMART model (GROQ_MODEL): persona generation, feedback, and by default live turns.
// - FAST model (optional GROQ_GD_MODEL): override for live turns only.
const smartModel = () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
// Live replies use the same model as everything else unless you explicitly
// opt in to a different (e.g. faster) one with GROQ_GD_MODEL.
const fastModel = () => process.env.GROQ_GD_MODEL || smartModel();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isReasoningModel = (model) => /gpt-oss/i.test(model);
const callGroqChat = async (options) => {
    // Optional dedicated key for the GD feature; falls back to the shared key.
    const apiKey = process.env.GROQ_GD_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not defined in environment variables");
    }
    const attempt = async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
        try {
            return await fetch(GROQ_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: options.model,
                    messages: options.messages,
                    temperature: options.temperature,
                    // Reasoning models (gpt-oss) spend part of max_tokens on hidden
                    // thinking; with a small limit the visible reply comes back empty.
                    // Give them headroom and ask for low reasoning effort (faster).
                    max_tokens: isReasoningModel(options.model)
                        ? options.maxTokens + 700
                        : options.maxTokens,
                    ...(isReasoningModel(options.model)
                        ? { reasoning_effort: "low" }
                        : {}),
                    ...(options.jsonMode
                        ? { response_format: { type: "json_object" } }
                        : {}),
                }),
                signal: controller.signal,
            });
        }
        finally {
            clearTimeout(timer);
        }
    };
    let response = await attempt();
    // One quick retry on rate limit / transient server errors.
    if (response.status === 429 || response.status >= 500) {
        await sleep(400);
        response = await attempt();
    }
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errText}`);
    }
    const data = (await response.json());
    const choice = data?.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
        throw new Error(`Groq (${options.model}) returned no text (finish_reason: ${choice?.finish_reason ?? "unknown"})`);
    }
    return content;
};
// Used when the LLM call fails, or to top up if it returns fewer/duplicate
// personas — starting a discussion should never fail because of the AI.
exports.FALLBACK_PERSONAS = [
    { name: "Priya", personalityTrait: "assertive and data-driven", stance: "strongly supports the topic" },
    { name: "Arjun", personalityTrait: "skeptical and analytical", stance: "opposes the topic and raises practical concerns" },
    { name: "Neha", personalityTrait: "calm and balanced", stance: "neutral, weighs both sides" },
    { name: "Rohan", personalityTrait: "energetic and example-driven", stance: "supports the topic using real-world examples" },
    { name: "Sana", personalityTrait: "thoughtful and reserved", stance: "focuses on long-term social impact" },
    { name: "Kabir", personalityTrait: "blunt and practical", stance: "questions whether the topic is realistic" },
];
const trimTo = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const sanitizePersona = (raw) => {
    // Names are spoken aloud and shown on avatars, so keep just the first word.
    const name = trimTo(raw?.name, 30).split(/\s+/)[0];
    if (!name)
        return null;
    return {
        name,
        personalityTrait: trimTo(raw?.personalityTrait, 80) || "thoughtful",
        stance: trimTo(raw?.stance, 120) || "neutral",
    };
};
const generatePersonas = async (topic, count, avoidNames) => {
    const avoid = avoidNames.length
        ? ` Do not use these names: ${avoidNames.join(", ")}.`
        : "";
    const raw = await callGroqChat({
        model: smartModel(),
        temperature: 0.9,
        maxTokens: 600,
        jsonMode: true,
        timeoutMs: 10000,
        messages: [
            {
                role: "system",
                content: "You design realistic participants for a college placement group discussion. Respond with JSON only.",
            },
            {
                role: "user",
                content: `Generate ${count} distinct personas for a group discussion on the topic "${topic}".
Rules:
- Each persona has a realistic first name (mix of common Indian first names), a short personality trait (max 8 words), and a stance (max 15 words).${avoid}
- Stances must be varied: include at least one that supports the topic and one that opposes it; the rest may be neutral or focus on a specific angle.
- Personality traits must be clearly different from each other.
Return a JSON object in exactly this shape:
{"personas":[{"name":"...","personalityTrait":"...","stance":"..."}]}`,
            },
        ],
    });
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.personas)
        ? parsed.personas
        : Array.isArray(parsed)
            ? parsed
            : [];
    return list
        .map(sanitizePersona)
        .filter((p) => p !== null);
};
exports.generatePersonas = generatePersonas;
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Models sometimes prefix their name, wrap in quotes, or get cut off by
// max_tokens mid-sentence. Clean all of that so TTS reads a tidy line.
const cleanReply = (raw, name) => {
    let text = raw.replace(/\s+/g, " ").trim();
    text = text.replace(new RegExp(`^${escapeRegExp(name)}\\s*[:\\-–—]\\s*`, "i"), "");
    text = text.replace(/^["“”]+|["“”]+$/g, "").trim();
    const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);
    if (sentences && sentences.length > 3) {
        text = sentences.slice(0, 3).join("").trim();
    }
    if (!/[.!?]$/.test(text)) {
        const complete = text.match(/^.*[.!?]/);
        if (complete)
            text = complete[0].trim();
    }
    return text;
};
exports.cleanReply = cleanReply;
// Models Groq said don't exist / aren't allowed for this key (until restart).
const unavailableModels = new Set();
const generatePersonaReply = async (params) => {
    const { personaName, personalityTrait, stance, topic, userName, recent, wrapUp } = params;
    const system = [
        `You are ${personaName}, a participant in a live group discussion on "${topic}".`,
        `Personality: ${personalityTrait}. Stance: ${stance}.`,
        "Speak naturally, like real spoken conversation, in 1-3 short sentences (about 40 words at most).",
        "You may agree, disagree, or build on what was just said. Address people by first name when replying to them.",
        "Do not repeat points already made. Do not start with your own name, do not use quotes, no stage directions.",
        wrapUp
            ? "The discussion is almost over: give a brief closing remark that wraps up your position."
            : "",
    ]
        .filter(Boolean)
        .join("\n");
    let userContent;
    if (recent.length === 0) {
        userContent =
            "The discussion has just started. Open it by stating your viewpoint on the topic.";
    }
    else {
        const transcript = recent
            .map((m) => `${m.speakerName}: ${m.text}`)
            .join("\n");
        const lastIsUser = recent[recent.length - 1].speaker === "user";
        userContent = `Recent discussion:\n${transcript}\n\n${lastIsUser
            ? `${userName} just spoke - respond to their point directly. `
            : ""}It is now your turn to speak, ${personaName}.`;
    }
    const replyOptions = {
        temperature: 0.85,
        maxTokens: 100,
        timeoutMs: 8000,
        messages: [
            { role: "system", content: system },
            { role: "user", content: userContent },
        ],
    };
    // Try the fast model first. If Groq rejects it (model unavailable /
    // decommissioned for this account, rate limit, etc.), fall back to the main
    // model instead of failing the whole discussion.
    let raw;
    const preferred = fastModel();
    if (preferred === smartModel() || unavailableModels.has(preferred)) {
        raw = await callGroqChat({ ...replyOptions, model: smartModel() });
    }
    else {
        try {
            raw = await callGroqChat({ ...replyOptions, model: preferred });
        }
        catch (error) {
            if (error instanceof Error && /404|model_not_found/.test(error.message)) {
                // Don't retry a model this account can't use on every future turn.
                unavailableModels.add(preferred);
            }
            console.warn(`GD model "${preferred}" failed, retrying with "${smartModel()}":`, error instanceof Error ? error.message : error);
            raw = await callGroqChat({ ...replyOptions, model: smartModel() });
        }
    }
    const cleaned = (0, exports.cleanReply)(raw, personaName);
    if (!cleaned) {
        throw new Error("Groq API returned an empty reply");
    }
    return cleaned;
};
exports.generatePersonaReply = generatePersonaReply;
const clampScore = (value) => Math.min(10, Math.max(1, Math.round(Number(value) || 1)));
const toStringList = (value, maxItems) => Array.isArray(value)
    ? value
        .filter((v) => typeof v === "string" && v.trim() !== "")
        .map((v) => v.trim().slice(0, 200))
        .slice(0, maxItems)
    : [];
const evaluateGDPerformance = async (params) => {
    // Bound the prompt size: last 60 lines, each capped.
    const transcript = params.messages
        .slice(-60)
        .map((m) => `${m.speaker === "user" ? "CANDIDATE" : m.speakerName}: ${m.text.slice(0, 500)}`)
        .join("\n");
    const raw = await callGroqChat({
        model: smartModel(),
        temperature: 0.3,
        maxTokens: 500,
        jsonMode: true,
        timeoutMs: 15000,
        messages: [
            {
                role: "system",
                content: "You are an experienced group discussion evaluator for campus placements. Be honest and specific; do not inflate scores. Respond with JSON only.",
            },
            {
                role: "user",
                content: `Topic: "${params.topic}"
Below is the full transcript. Evaluate ONLY the lines spoken by CANDIDATE (named ${params.userName}); the other speakers are AI participants and must not be scored.

Score each from 1 to 10:
- clarity: how clearly and structurally the candidate expressed ideas
- relevance: how relevant the points were to the topic
- engagement: how well they responded to / built on others' points
- initiative: how proactively they contributed new points or led the discussion
If the candidate spoke very little, scores should reflect that.

Transcript:
${transcript}

Return a JSON object in exactly this shape:
{"clarity":<1-10>,"relevance":<1-10>,"engagement":<1-10>,"initiative":<1-10>,"summary":"<3-4 sentence honest summary addressed to the candidate>","strengths":[<up to 3 short strings>],"improvements":[<up to 3 short, actionable strings>]}`,
            },
        ],
    });
    const parsed = JSON.parse(raw);
    return {
        clarity: clampScore(parsed.clarity),
        relevance: clampScore(parsed.relevance),
        engagement: clampScore(parsed.engagement),
        initiative: clampScore(parsed.initiative),
        summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
        strengths: toStringList(parsed.strengths, 3),
        improvements: toStringList(parsed.improvements, 3),
    };
};
exports.evaluateGDPerformance = evaluateGDPerformance;
//# sourceMappingURL=gdAiService.js.map