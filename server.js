import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";

const app = express();
const promptPath = path.join(process.cwd(), "clara_prompt.txt");
const claraPrompt = fs.readFileSync(promptPath, "utf8");
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

const preferredModels = [
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest"
].filter(Boolean);

app.use(cors());
app.use(express.json({ limit: "64kb" }));
app.use(express.static("public"));

function normalizeMessages(messages) {
  const valid = Array.isArray(messages) ? messages : [];
  return valid
    .map((m) => ({
      role: m?.role === "assistant" ? "model" : "user",
      text: String(m?.content || "").trim()
    }))
    .filter((m) => m.text.length > 0)
    .slice(-24)
    .map((m) => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
}

function parseGeminiBody(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function extractGeminiError(data, rawText, status) {
  if (data?.error?.message) {
    return data.error.message;
  }
  const compact = String(rawText || "").replace(/\s+/g, " ").trim();
  if (compact) {
    return `Gemini HTTP ${status}: ${compact.slice(0, 260)}`;
  }
  return `Gemini HTTP ${status}`;
}

function extractReply(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => String(part?.text || ""))
    .join("\n")
    .trim();
}

async function generateWithGemini(contents) {
  if (!geminiKey) {
    throw {
      status: 500,
      code: "CONFIG_ERROR",
      detail: "Missing GEMINI_API_KEY (or GOOGLE_API_KEY) on server."
    };
  }
  if (!contents.length) {
    throw {
      status: 400,
      code: "EMPTY_INPUT",
      detail: "No user text provided."
    };
  }

  const payload = {
    system_instruction: { parts: [{ text: claraPrompt }] },
    contents
  };

  let lastError = null;
  for (const model of preferredModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey
      },
      body: JSON.stringify(payload)
    });

    const rawText = await response.text();
    const data = parseGeminiBody(rawText);

    if (response.ok && !data?.error) {
      return { data, model };
    }

    const detail = extractGeminiError(data, rawText, response.status);
    lastError = {
      status: response.status || 500,
      code: "CLARA_FAILURE",
      detail: `Model ${model}: ${detail}`
    };

    const shouldTryNextModel = response.status === 404 || /not found/i.test(detail);
    if (!shouldTryNextModel) {
      break;
    }
  }

  throw lastError || {
    status: 500,
    code: "CLARA_FAILURE",
    detail: "Unknown Gemini error."
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, modelCandidates: preferredModels });
});

app.get("/api/models", async (_req, res) => {
  if (!geminiKey) {
    res.status(500).json({
      error: "CONFIG_ERROR",
      detail: "Missing GEMINI_API_KEY (or GOOGLE_API_KEY) on server."
    });
    return;
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      method: "GET",
      headers: { "x-goog-api-key": geminiKey }
    });
    const rawText = await response.text();
    const data = parseGeminiBody(rawText);
    if (!response.ok) {
      res.status(response.status).json({
        error: "MODEL_LIST_FAILURE",
        detail: extractGeminiError(data, rawText, response.status)
      });
      return;
    }
    const models = (data?.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name);
    res.json({ models });
  } catch (err) {
    res.status(500).json({
      error: "MODEL_LIST_FAILURE",
      detail: err?.message || String(err)
    });
  }
});

app.get("/api/clara", async (req, res) => {
  const text = typeof req.query?.text === "string" ? req.query.text.trim() : "";
  if (!text) {
    res.json({ ok: true, hint: "Use POST /api/clara or GET /api/clara?text=..." });
    return;
  }

  try {
    const { data, model } = await generateWithGemini([{ role: "user", parts: [{ text }] }]);
    const reply = extractReply(data);
    if (reply.includes("[DISCONNECT]")) {
      res.json({ text: "", disconnect: true, model });
      return;
    }
    res.json({ text: reply, disconnect: false, model });
  } catch (err) {
    res.status(err?.status || 500).json({
      error: err?.code || "CLARA_FAILURE",
      detail: err?.detail || err?.message || String(err)
    });
  }
});

app.post("/api/clara", async (req, res) => {
  try {
    const contents = normalizeMessages(req.body?.messages);
    const { data, model } = await generateWithGemini(contents);
    const reply = extractReply(data);
    if (reply.includes("[DISCONNECT]")) {
      res.json({ text: "", disconnect: true, model });
      return;
    }
    res.json({ text: reply, disconnect: false, model });
  } catch (err) {
    res.status(err?.status || 500).json({
      error: err?.code || "CLARA_FAILURE",
      detail: err?.detail || err?.message || String(err)
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Clara API listening on ${port}`);
});
