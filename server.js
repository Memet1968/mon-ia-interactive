import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, "public");
const INDEX_FILE = path.join(PUBLIC_DIR, "index.html");

const DEFAULT_API_URL = Buffer.from(
  "aHR0cHM6Ly9hcGkuZGVlcHNlZWsuY29tL3YxL2NoYXQvY29tcGxldGlvbnM=",
  "base64"
).toString("utf8");
const DEFAULT_MODEL = Buffer.from("ZGVlcHNlZWstY2hhdA==", "base64").toString("utf8");

const MODEL_NAME = process.env.LLM_MODEL || DEFAULT_MODEL;
const PROVIDER_API_URL = process.env.LLM_API_URL || DEFAULT_API_URL;
const REQUEST_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 60_000);
const FREQUENCY_PENALTY_RAW = process.env.LLM_FREQUENCY_PENALTY;
const providerApiKey = process.env.LLM_API_KEY || "";
const isGeminiEndpoint = /generativelanguage\.googleapis\.com/i.test(PROVIDER_API_URL);

const frequencyPenalty = Number(FREQUENCY_PENALTY_RAW);
const hasFrequencyPenalty =
  FREQUENCY_PENALTY_RAW !== undefined && Number.isFinite(frequencyPenalty);

function readFirstExistingFile(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8");
    }
  }
  return "";
}

const claraPrompt = readFirstExistingFile([
  path.join(__dirname, "clara_prompt_v3.txt"),
  path.join(__dirname, "clara_prompt.txt")
]);
const orionLore = readFirstExistingFile([
  path.join(__dirname, "orion_lore_v3.txt"),
  path.join(__dirname, "orion_lore.txt")
]);
const fullSystemPrompt = [claraPrompt, "# CONTEXTE UNIVERS ORION", orionLore]
  .filter(Boolean)
  .join("\n\n");

app.use(cors());
app.use(express.json({ limit: "128kb" }));
app.use(express.static(PUBLIC_DIR));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

function normalizeMessages(messages) {
  const valid = Array.isArray(messages) ? messages : [];
  return valid
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: String(message?.content || "").trim()
    }))
    .filter((message) => message.content.length > 0)
    .slice(-20);
}

function parseJsonSafe(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function compactText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateWithProvider(userMessages) {
  if (!providerApiKey) {
    throw {
      status: 500,
      code: "CONFIG_ERROR",
      detail: "Missing LLM_API_KEY environment variable."
    };
  }
  if (!fullSystemPrompt) {
    throw {
      status: 500,
      code: "CONFIG_ERROR",
      detail: "Missing prompt files (clara_prompt_v3.txt and/or orion_lore_v3.txt)."
    };
  }
  if (!userMessages.length) {
    throw {
      status: 400,
      code: "EMPTY_INPUT",
      detail: "No user messages provided."
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const payload = {
      model: MODEL_NAME,
      messages: [{ role: "system", content: fullSystemPrompt }, ...userMessages],
      temperature: 0.85,
      top_p: 0.95,
      max_tokens: 2000
    };
    if (hasFrequencyPenalty && !isGeminiEndpoint) {
      payload.frequency_penalty = frequencyPenalty;
    }

    const response = await fetch(PROVIDER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const rawText = await response.text();
    const data = parseJsonSafe(rawText);
    if (!response.ok) {
      const detail =
        data?.error?.message ||
        compactText(rawText).slice(0, 260) ||
        `Provider HTTP ${response.status}`;
      throw {
        status: response.status || 500,
        code: "PROVIDER_ERROR",
        detail
      };
    }

    const reply = String(data?.choices?.[0]?.message?.content || "").trim();
    if (!reply) {
      throw {
        status: 500,
        code: "EMPTY_RESPONSE",
        detail: "Provider returned an empty response."
      };
    }

    return { text: reply, model: MODEL_NAME };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.status) {
      throw error;
    }
    const isTimeout = error?.name === "AbortError";
    throw {
      status: 500,
      code: isTimeout ? "TIMEOUT_ERROR" : "NETWORK_ERROR",
      detail: isTimeout
        ? `Provider request timed out after ${REQUEST_TIMEOUT_MS}ms.`
        : error?.message || String(error)
    };
  }
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    model: process.env.LLM_MODEL ? "custom" : "default",
    hasApiKey: Boolean(providerApiKey),
    hasPrompt: Boolean(fullSystemPrompt)
  });
});

app.post("/api/clara", async (req, res) => {
  try {
    const messages = normalizeMessages(req.body?.messages);
    if (!messages.length) {
      res.status(400).json({
        error: "EMPTY_INPUT",
        detail: "No messages provided."
      });
      return;
    }

    const { text } = await generateWithProvider(messages);
    const disconnect = text.includes("[DISCONNECT]");
    res.json({
      text: disconnect ? "" : text,
      disconnect,
      model: "configured"
    });
  } catch (error) {
    res.status(error?.status || 500).json({
      error: error?.code || "CLARA_FAILURE",
      detail: error?.detail || error?.message || String(error)
    });
  }
});

app.get("/api/clara", async (req, res) => {
  const text = typeof req.query?.text === "string" ? req.query.text.trim() : "";
  if (!text) {
    res.json({ ok: true, hint: "Use POST /api/clara with a messages array." });
    return;
  }

  try {
    const { text: reply } = await generateWithProvider([{ role: "user", content: text }]);
    const disconnect = reply.includes("[DISCONNECT]");
    res.json({
      text: disconnect ? "" : reply,
      disconnect,
      model: "configured"
    });
  } catch (error) {
    res.status(error?.status || 500).json({
      error: error?.code || "CLARA_FAILURE",
      detail: error?.detail || error?.message || String(error)
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(INDEX_FILE);
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log("SECURE CHANNEL // MATRIX-2XTH-687");
  console.log(`Clara API listening on port ${port}`);
  console.log(`Model configured: ${Boolean(MODEL_NAME)}`);
  console.log(`API key: ${providerApiKey ? "CONFIGURED" : "MISSING"}`);
});
