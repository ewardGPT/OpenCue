import { app, BrowserWindow, globalShortcut, desktopCapturer, ipcMain, nativeImage } from "electron";
import path from "node:path";
import fetch from "node-fetch";

let win: BrowserWindow | null = null;

async function createWindow() {
  win = new BrowserWindow({
    width: 520,
    height: 420,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });
  await win.loadFile(path.join(__dirname, "renderer/index.html"));
  win.setAlwaysOnTop(true, "screen-saver");
  win.hide();

  globalShortcut.register(process.platform === "darwin" ? "CommandOrControl+B" : "CommandOrControl+B", () => {
    if (!win) return;
    if (win.isVisible()) win.hide(); else win.show();
  });

  globalShortcut.register("CommandOrControl+H", async () => {
    if (!win) return;
    const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 1920, height: 1080 } });
    const primary = sources[0];
    const dataUrl = primary.thumbnail.toDataURL();
    win.webContents.send("ocr-image", dataUrl);
  });
}

ipcMain.handle("ask-router", async (_e, payload: { prompt: string; ocrText: string }) => {
  const messages = [
    { role: "system", content: "Follow the OpenCue default prompt style. Be concise and actionable." },
    { role: "user", content: `${payload.prompt}\n\nContext from the screen:\n${payload.ocrText || "(none)"}` }
  ];
  const r = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ messages, ragQuery: payload.ocrText?.slice(0,500) || null })
  });
  const j: any = await r.json();
  return j.text || "(no response)";
});

ipcMain.handle("ocr-call", async (_e, dataUrl: string) => {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const r = await fetch("http://localhost:3001/api/ocr", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ imageBase64: base64 })
  });
  const j: any = await r.json();
  return j.text || "";
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
