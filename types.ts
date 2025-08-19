export type ChatMessage = { role: "system"|"user"|"assistant"; content: string };

export type ChatRequest = {
  messages: ChatMessage[];
  provider?: "ollama"|"openai"|"anthropic"|"gemini";
  model?: string;
  ragQuery?: string | null;
};

export type ChatResponse = { text: string; provider: string; model: string };
