import fetch from "node-fetch";

const toText = async (r: Response) => {
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
};

export async function chatOllama(host: string, model: string, messages: any[]) {
  const r = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false })
  });
  const j: any = await toText(r);
  const text = j?.message?.content ?? j?.response ?? "";
  return { text, provider: "ollama", model };
}

export async function chatOpenAI(model: string, apiKey: string, messages: any[]) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.3 })
  });
  const j: any = await r.json();
  const text = j?.choices?.[0]?.message?.content ?? "";
  return { text, provider: "openai", model };
}

export async function chatAnthropic(model: string, apiKey: string, messages: any[]) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, max_tokens: 1024, messages })
  });
  const j: any = await r.json();
  const text = j?.content?.map((p: any) => p.text).join("") ?? "";
  return { text, provider: "anthropic", model };
}

export async function chatGemini(model: string, apiKey: string, text: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text }] }] })
  });
  const j: any = await r.json();
  const out = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  return { text: out, provider: "gemini", model };
}
