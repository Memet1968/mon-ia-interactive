import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";

const app = express();

const promptPath = path.join(process.cwd(), "clara_prompt.txt");
const lorePath = path.join(process.cwd(), "orion_lore.txt");

const claraPrompt = fs.readFileSync(promptPath, "utf8");
const orionLore = fs.existsSync(lorePath) ? fs.readFileSync(lorePath, "utf8") : "";

const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY || "";
const hfModel = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";
const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";

app.use(cors());
app.use(express.json({ limit: "128kb" }));
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

function splitLoreSections(raw) {
  if (!raw.trim()) return [];
  const lines = raw.split("\n");
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: line.replace("## ", "").trim(), body: "" };
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  if (current) sections.push(current);

  return sections
    .map((s) => ({ ...s, body: s.body.trim() }))
    .filter((s) => s.body.length > 0);
}

function keywordsFromText(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

function selectLoreContext(messages, maxSections = 4) {
  const sections = splitLoreSections(orionLore);
  if (!sections.length) return "";

  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  const query = keywordsFromText(userText);

  if (!query.size) {
    return sections.slice(0, maxSections).map((s) => `## ${s.title}\n${s.body}`).join("\n\n");
  }

  const ranked = sections
    .map((s) => {
      const sectionWords = keywordsFromText(`${s.title} ${s.body}`);
      let score = 0;
      for (const q of query) {
        if (sectionWords.has(q)) score += 1;
      }
      return { section: s, score };
    })
    .sort((a, b) => b.score - a.score);

  const picked = ranked
    .filter((r) => r.score > 0)
    .slice(0, maxSections)
    .map((r) => r.section);

  const fallback = sections.slice(0, 2);
  const finalSections = picked.length ? picked : fallback;

  return finalSections.map((s) => `## ${s.title}\n${s.body}`).join("\n\n");
}

function buildSystemInstruction(messages) {
  const loreContext = selectLoreContext(messages);
  if (!loreContext) return claraPrompt.trim();

  return [
    claraPrompt.trim(),
    "",
    "Contexte Orion a respecter (source interne):",
    loreContext
  ].join("\n");
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

  const systemInstruction = buildSystemInstruction(messages);

  const response = await fetch(HF_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hfKey}`
    },
    body: JSON.stringify({
      model: hfModel,
      messages: [{ role: "system", content: systemInstruction }, ...messages],
      temperature: 0.45,
      max_tokens: 500
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
    hasHfKey: Boolean(hfKey),
    hasLore: Boolean(orionLore.trim())
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
  console.log(`Clara API (Hugging Face + Orion Lore) listening on ${port}`);
});
