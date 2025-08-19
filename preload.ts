import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("opencue", {
  askRouter: (payload: { prompt: string; ocrText: string }) => ipcRenderer.invoke("ask-router", payload),
  ocrCall: (dataUrl: string) => ipcRenderer.invoke("ocr-call", dataUrl),
  onOcrImage: (cb: (dataUrl: string) => void) => ipcRenderer.on("ocr-image", (_e, d) => cb(d))
});
