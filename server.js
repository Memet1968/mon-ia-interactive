import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(cors());
app.use(express.json({ limit: "64kb" }));
app.use(express.static("public"));

const promptPath = path.join(process.cwd(), "clara_prompt.txt");
const claraPrompt = fs.readFileSync(promptPath, "utf8");

const geminiKey = process.env.GEMINI_API_KEY;

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/models", async (_req, res) => {
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      method: "GET",
      headers: { "x-goog-api-key": geminiKey }
    });
    const data = await response.json();
    const models = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name);
    res.json({ models });
  } catch (err) {
    res.status(500).json({ error: "MODEL_LIST_FAILURE", detail: err?.message || String(err) });
  }
});

app.get("/api/clara", async (req, res) => {
  const text = typeof req.query?.text === "string" ? req.query.text : "";
  if (!text) {
    res.json({ ok: true, hint: "Use POST /api/clara or GET /api/clara?text=..." });
    return;
  }
  try {
    const payload = {
      system_instruction: { parts: [{ text: claraPrompt }] },
      contents: [{ parts: [{ text }] }]
    };
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data?.error) {
      res.status(500).json({ error: "CLARA_FAILURE", detail: data.error.message || data.error });
      return;
    }
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const shouldDisconnect = reply.includes("[DISCONNECT]");
    if (shouldDisconnect) return res.json({ text: "", disconnect: true });
    res.json({ text: reply, disconnect: false });
  } catch (err) {
    res.status(500).json({ error: "CLARA_FAILURE", detail: err?.message || String(err) });
  }
});

app.post("/api/clara", async (req, res) => {
  try {
    const userMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const contents = userMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "") }]
    }));
    const payload = {
      system_instruction: { parts: [{ text: claraPrompt }] },
      contents
    };
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data?.error) {
      res.status(500).json({ error: "CLARA_FAILURE", detail: data.error.message || data.error });
      return;
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const shouldDisconnect = text.includes("[DISCONNECT]");
    if (shouldDisconnect) return res.json({ text: "", disconnect: true });
    res.json({ text, disconnect: false });
  } catch (err) {
    res.status(500).json({ error: "CLARA_FAILURE", detail: err?.message || String(err) });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Clara API listening on ${port}`);
});
