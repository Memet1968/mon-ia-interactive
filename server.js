import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";

const app = express();

const promptPath = path.join(process.cwd(), "clara_prompt.txt");
const claraPrompt = fs.readFileSync(promptPath, "utf8");

const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY || "";
const hfModel = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";
const HF_URL = `https://api-inference.huggingface.co/models/${hfModel}`;

app.use(cors());
app.use(express.json({ limit: "64kb" }));
app.use(express.static("public"));

function normalizeMessages(messages) {
  const valid = Array.isArray(messages) ? messages : [];
  return valid
    .map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content || "").trim()
    }))
    .filter((m) => m.content.length > 0)
    .slice(-20);
}

function buildPrompt(messages) {
  const lines = [claraPrompt.trim(), "", "Conversation:"];
  for (const m of messages) {
    lines.push(`${m.role === "assistant" ? "Clara" : "User"}: ${m.content}`);
  }
  lines.push("Clara:");
  return lines.join("\n");
}

function extractHFText(data) {
  if (Array.isArray(data) && data[0]?.generated_text) return String(data[0].generated_text);
  if (typeof data?.generated_text === "string") return data.generated_text;
  if (Array.isArray(data) && typeof data[0] === "string") return data[0];
  return "";
}

async function generateWithHF(messages) {
  if (!hfKey) {
    throw {
      status: 500,
      code: "CONFIG_ERROR",
      detail: "Missing HUGGINGFACE_API_KEY (or HF_API_KEY)."
    };
  }
  if (!messages.length) {
    throw { status: 400, code: "EMPTY_INPUT", detail: "No user text provided." };
  }

  const prompt = buildPrompt(messages);

  const response = await fetch(HF_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 220,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false
      }
    })
  });

  const raw = await response.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }

  if (!response.ok || data?.error) {
    throw {
      status: response.status || 500,
      code: "CLARA_FAILURE",
      detail: data?.error || raw || `HF HTTP ${response.status}`
    };
  }

  const text = extractHFText(data).trim();
  return text;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, provider: "huggingface", model: hfModel });
});

app.get("/api/models", (_req, res) => {
  res.json({ models: [hfModel], provider: "huggingface" });
});

app.get("/api/clara", async (req, res) => {
  const text = typeof req.query?.text === "string" ? req.query.text.trim() : "";
  if (!text) {
    res.json({ ok: true, hint: "Use POST /api/clara or GET /api/clara?text=..." });
    return;
  }

  try {
    const reply = await generateWithHF([{ role: "user", content: text }]);
    if (reply.includes("[DISCONNECT]")) {
      res.json({ text: "", disconnect: true, model: hfModel });
      return;
    }
    res.json({ text: reply, disconnect: false, model: hfModel });
  } catch (err) {
    res.status(err?.status || 500).json({
      error: err?.code || "CLARA_FAILURE",
      detail: err?.detail || err?.message || String(err)
    });
  }
});

app.post("/api/clara", async (req, res) => {
  try {
    const messages = normalizeMessages(req.body?.messages);
    const reply = await generateWithHF(messages);
    if (reply.includes("[DISCONNECT]")) {
      res.json({ text: "", disconnect: true, model: hfModel });
      return;
    }
    res.json({ text: reply, disconnect: false, model: hfModel });
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
  console.log(`Clara API (Hugging Face) listening on ${port}`);
});
