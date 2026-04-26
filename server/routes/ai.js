const express = require("express");
const Groq = require("groq-sdk");
const Board = require("../models/Board");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function getGroq(apiKey) {
  // Use user-provided key from header or fallback to environment variable
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) throw new Error("No Groq API key available. Please set GROQ_API_KEY in .env.");
  return new Groq({ apiKey: key });
}

const ACADEMIC_SYSTEM_PROMPT = `You are Brainy, an AI-powered Academic Assistant. Your goal is to provide **extremely concise**, high-value educational assistance.

GUIDELINES:
1. BREVITY: Keep responses strictly under 100 words. Get straight to the point without preamble.
2. NO HEADERS: Do NOT use Markdown headers (#, ##, ===, ---).
3. STRUCTURE: Use a single short paragraph followed by a maximum of 3 bullet points.
4. FORMATTING: Use **bold** for critical terms. Avoid complex equations unless essential.
5. ADAPTABILITY: If asked to simplify (e.g. "for a 5 year old"), do so instantly within these brevity rules.
6. STRICT SCOPE: Do reply to the normal wishes. BUT Stick ONLY to academic/educational topics (Science, Math, History, Literature, Engineering, etc.). 

STRICT REFUSAL RULE:
- If a user asks about video games, entertainment, celebrities, gossip, sports, or non-academic trivia, you MUST politely refuse.
- DO NOT provide "half-answers" (e.g., explaining a game's acronym before refusing). 
- If out of scope, simply state: "I am restricted to academic and educational inquiries only. How can I help with your studies?"`;

function describeStrokes(strokes) {
  if (!strokes || strokes.length === 0) return "The board is empty.";
  const counts = {};
  strokes.forEach((s) => {
    counts[s.tool] = (counts[s.tool] || 0) + 1;
  });
  const summary = Object.entries(counts)
    .map(([t, n]) => `${n} ${t} stroke${n > 1 ? "s" : ""}`)
    .join(", ");
  const textContent = strokes
    .filter((s) => s.tool === "text" && s.text)
    .map((s) => `"${s.text}"`)
    .join(", ");
  return `Board contains: ${summary}.${textContent ? ` Text elements: ${textContent}.` : ""}`;
}


// POST /api/v1/ai/chat — Handle conversational AI requests
router.post("/chat", requireAuth, async (req, res) => {
  try {
    const apiKey = req.headers["x-groq-key"];
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "Messages array is required." });
    }

    // Prepend system prompt
    const groqMessages = [
      { role: "system", content: ACADEMIC_SYSTEM_PROMPT },
      ...messages
    ];

    const groq = getGroq(apiKey);
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
      max_tokens: 300,
      temperature: 0.3
    });

    res.status(200).json({ response: completion.choices[0]?.message?.content || "No response generated." });
  } catch (error) {
    console.error("[ai] chat error:", error.message);
    res.status(500).json({ message: error.message || "AI request failed." });
  }
});

module.exports = router;
