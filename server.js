import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "64kb" }));

const promptPath = path.join(process.cwd(), "clara_prompt.txt");
const claraPrompt = fs.readFileSync(promptPath, "utf8");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/clara", async (req, res) => {
  try {
    const userMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    const messages = [
      { role: "system", content: claraPrompt },
      ...userMessages
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 250,
      temperature: 0.6
    });

    let text = completion.choices?.[0]?.message?.content ?? "";
    const shouldDisconnect = text.includes("[DISCONNECT]");
    if (shouldDisconnect) {
      res.json({ text: "", disconnect: true });
      return;
    }
    res.json({ text, disconnect: false });
  } catch (err) {
    res.status(500).json({ error: "CLARA_FAILURE" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Clara API listening on ${port}`);
});
