import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "node:fs";
import path from "node:path";
import { chatOllama, chatOpenAI, chatAnthropic, chatGemini } from "./provider";
import { ChatRequest, ChatMessage } from "./types";

dotenv.config();
const app = express();
app.use(express.json({ limit: "15mb" }));

const PORT = process.env.PORT || 3001;
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OCR_URL = process.env.OCR_URL || "http://localhost:8001/ocr";
const RAG_ENABLED = (process.env.RAG_ENABLED || "false") === "true";
const RAG_URL = process.env.RAG_URL || "http://localhost:8002";
const ALLOW_CLOUD = (process.env.ALLOW_CLOUD || "false") === "true";

const cfgPath = path.join(process.cwd(), "server/router/router.config.json");
const cfg = fs.existsSync(cfgPath)
  ? JSON.parse(fs.readFileSync(cfgPath, "utf-8"))
  : { defaults: { provider: "ollama", model_small: "llama3.1:8b", model_reason: "qwen2.5:14b" }, allowCloud: false };

function classifyIntent(text: string): "quick"|"reason"|"write" {
  const t = text.toLowerCase();
  if (t.length < 60) return "quick";
  if (/(prove|derive|optimi[sz]e|big\s*o|complexity|debug|stack trace|why)/.test(t)) return "reason";
  return "write";
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/ocr", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    const r = await fetch(OCR_URL, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ imageBase64 }) });
    const j: any = await r.json();
    res.json({ text: j.text || "" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const body = req.body as ChatRequest;
    const lastUser = body.messages.slice().reverse().find(m => m.role === "user")?.content || "";
    const intent = classifyIntent(lastUser);

    const useCloud = ALLOW_CLOUD && cfg.allowCloud;
    let provider = body.provider || cfg.defaults.provider;
    let model = body.model;

    if (!model) {
      if (intent === "quick") model = cfg.defaults.model_small;
      else if (intent === "reason") model = cfg.defaults.model_reason;
      else model = cfg.defaults.model_small;
    }

    let out;
    if (provider === "ollama") out = await chatOllama(OLLAMA_HOST, model!, body.messages);
    else if (provider === "openai") out = await chatOpenAI(model!, process.env.OPENAI_API_KEY || "", body.messages);
    else if (provider === "anthropic") out = await chatAnthropic(model!, process.env.ANTHROPIC_API_KEY || "", body.messages);
    else if (provider === "gemini") out = await chatGemini(model!, process.env.GEMINI_API_KEY || "", body.messages.map(m => `${m.role}: ${m.content}`).join("\n"));
    else out = await chatOllama(OLLAMA_HOST, cfg.defaults.model_small, body.messages);

    // RAG (optional)
    if (RAG_ENABLED && body.ragQuery) {
      try {
        const r = await fetch(`${RAG_URL}/search`, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ query: body.ragQuery, top_k: Number(process.env.RAG_TOPK) || 4 })
        });
        const j: any = await r.json();
        const cites = (j.hits || []).map((h: any) => `- ${h.meta?.source || "doc"}: ${h.text?.slice(0,120)}…`).join("\n");
        out.text += `\n\n---\nSources (local):\n${cites}`;
      } catch {}
    }

    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`router listening on :${PORT}`));
