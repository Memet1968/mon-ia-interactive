import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";

const app = express();

const promptPath = path.join(process.cwd(), "clara_prompt.txt");
const claraPrompt = fs.readFileSync(promptPath, "utf8");

const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY || "";
const hfModel = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";
const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";

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

async function generateWithHF(messages) {
  if (!hfKey) {
    throw {
      status: 500,
      code: "CONFIG_ERROR",
      detail: "Missing HUGGINGFACE_API_KEY (or HF_API_KEY)."
    };
  }

  if (!messages.length) {
    throw {
      status: 400,
      code: "EMPTY_INPUT",
      detail: "No user text provided."
    };
  }

  const response = await fetch(HF_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hfKey}`
    },
    body: JSON.stringify({
      model: hfModel,
      messages: [{ role: "system", content: claraPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 700
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.error) {
    throw {
      status: response.status || 500,
      code: "CLARA_FAILURE",
      detail: data?.error?.message || data?.error || `HF HTTP ${response.status}`
    };
  }

  return String(data?.choices?.[0]?.message?.content || "").trim();
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "huggingface",
    model: hfModel,
    hasHfKey: Boolean(hfKey)
  });
});

app.get("/api/models", (_req, res) => {
  res.json({
    provider: "huggingface",
    models: [hfModel]
  });
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
