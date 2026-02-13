javascriptimport dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";

const app = express();

// Charger les prompts
const promptPath = path.join(process.cwd(), "clara_prompt_v3.txt");
const lorePath = path.join(process.cwd(), "orion_lore_v3.txt");

const claraPrompt = fs.readFileSync(promptPath, "utf8");
const orionLore = fs.readFileSync(lorePath, "utf8");

// Combiner persona + univers
const fullSystemPrompt = claraPrompt + "\n\n# CONTEXTE UNIVERS ORION\n\n" + orionLore;

// Clé API LLM
const llmKey = process.env.LLM_API_KEY || "";

app.use(cors());
app.use(express.json({ limit: "128kb" }));
app.use(express.static("public"));

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

function normalizeMessages(messages) {
  const valid = Array.isArray(messages) ? messages : [];
  return valid
    .map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content || "").trim()
    }))
    .filter((m) => m.content.length > 0)
    .slice(-20); // Garder les 20 derniers messages
}

async function generateWithLLM(userMessages) {
  if (!llmKey) {
    throw {
      status: 500,
      code: "CONFIG_ERROR",
      detail: "Missing LLM_API_KEY environment variable"
    };
  }

  if (!userMessages.length) {
    throw {
      status: 400,
      code: "EMPTY_INPUT",
      detail: "No user messages provided"
    };
  }

  // Construire le tableau de messages pour LLM
  const messages = [
    { role: "system", content: fullSystemPrompt },
    ...userMessages
  ];

  try {
    const response = await fetch("https://api.llm.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${llmKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llm-chat",
        messages: messages,
        temperature: 0.85, // Pour un roleplay naturel et varié
        max_tokens: 2000,
        top_p: 0.95,
        frequency_penalty: 0.3 // Éviter les répétitions
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = `LLM HTTP ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorDetail = errorData?.error?.message || errorText.slice(0, 200);
      } catch {
        errorDetail = errorText.slice(0, 200);
      }

      throw {
        status: response.status,
        code: "LLM_ERROR",
        detail: errorDetail
      };
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "";

    if (!reply) {
      throw {
        status: 500,
        code: "EMPTY_RESPONSE",
        detail: "LLM returned empty response"
      };
    }

    return { text: reply, model: "llm-chat" };
  } catch (err) {
    if (err.status) {
      throw err;
    }
    throw {
      status: 500,
      code: "NETWORK_ERROR",
      detail: err?.message || String(err)
    };
  }
}

// ============================================================================
// ROUTES
// ============================================================================

app.get("/health", (_req, res) => {
  res.json({ 
    ok: true, 
    model: "llm-chat",
    hasApiKey: !!llmKey 
  });
});

app.post("/api/clara", async (req, res) => {
  try {
    const messages = normalizeMessages(req.body?.messages);
    
    if (!messages.length) {
      res.status(400).json({
        error: "EMPTY_INPUT",
        detail: "No messages provided"
      });
      return;
    }

    const { text, model } = await generateWithLLM(messages);
    
    // Vérifier si Clara veut déconnecter (rare, mais possible)
    const disconnect = text.includes("[DISCONNECT]");
    
    res.json({ 
      text: disconnect ? "" : text, 
      disconnect,
      model 
    });
  } catch (err) {
    res.status(err?.status || 500).json({
      error: err?.code || "CLARA_FAILURE",
      detail: err?.detail || err?.message || String(err)
    });
  }
});

// Route GET pour tester rapidement (optionnel)
app.get("/api/clara", async (req, res) => {
  const text = typeof req.query?.text === "string" ? req.query.text.trim() : "";
  if (!text) {
    res.json({ 
      ok: true, 
      hint: "Use POST /api/clara with messages array" 
    });
    return;
  }

  try {
    const { text: reply, model } = await generateWithLLM([
      { role: "user", content: text }
    ]);
    res.json({ text: reply, model });
  } catch (err) {
    res.status(err?.status || 500).json({
      error: err?.code || "CLARA_FAILURE",
      detail: err?.detail || err?.message || String(err)
    });
  }
});

// Servir le frontend
app.get("*", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// ============================================================================
// DÉMARRAGE
// ============================================================================

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🔒 SECURE CHANNEL // MATRIX-2XTH-687`);
  console.log(`⚡ Clara API listening on port ${port}`);
  console.log(`🤖 Model: llm-chat`);
  console.log(`🔑 API Key: ${llmKey ? "CONFIGURED" : "MISSING"}`);
});
