const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY || "";
const hfModel = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";
const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";

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
    throw { status: 500, code: "CONFIG_ERROR", detail: "Missing HUGGINGFACE_API_KEY (or HF_API_KEY)." };
  }
  if (!messages.length) {
    throw { status: 400, code: "EMPTY_INPUT", detail: "No user text provided." };
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
      max_tokens: 220
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
