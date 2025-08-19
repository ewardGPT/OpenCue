declare global {
  interface Window {
    opencue: {
      askRouter: (p: { prompt: string; ocrText: string }) => Promise<string>;
      ocrCall: (dataUrl: string) => Promise<string>;
      onOcrImage: (cb: (dataUrl: string) => void) => void;
    };
  }
}

const promptEl = document.getElementById("prompt") as HTMLTextAreaElement;
const ocrEl = document.getElementById("ocr") as HTMLPreElement;
const answerEl = document.getElementById("answer") as HTMLDivElement;
const askBtn = document.getElementById("btn-ask") as HTMLButtonElement;
const ocrBtn = document.getElementById("btn-ocr") as HTMLButtonElement;

async function ask() {
  const text = promptEl.value.trim();
  const ctx = ocrEl.textContent || "";
  if (!text) return;
  answerEl.textContent = "…thinking";
  const out = await window.opencue.askRouter({ prompt: text, ocrText: ctx });
  answerEl.innerHTML = out;
}

askBtn.addEventListener("click", ask);
ocrBtn.addEventListener("click", async () => {
  // Will be filled by global hotkey (Ctrl/Cmd+H); here just no-op
});

window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") ask();
});

window.opencue.onOcrImage(async (dataUrl) => {
  const text = await window.opencue.ocrCall(dataUrl);
  ocrEl.textContent = text;
});
