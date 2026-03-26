import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { registerWsClient } from "./tools.js";
import { handlePrompt } from "./claude.js";
import { setWsClients } from "./claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Serve static client build
const clientDist = join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// WebSocket server
const wss = new WebSocketServer({ server, path: "/ws" });
const clients = new Set<WebSocket>();
setWsClients(clients);

wss.on("connection", (ws) => {
  console.log("[ws] Client connected");
  clients.add(ws);
  registerWsClient(ws);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connected",
      message: "Visual Claude server connected",
    })
  );

  ws.on("message", async (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === "prompt") {
        await handlePrompt(data.message);
      }
    } catch (err) {
      console.error("[ws] Message error:", err);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to process message",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("[ws] Client disconnected");
    clients.delete(ws);
  });
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(join(clientDist, "index.html"));
});

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║        Visual Claude Server          ║
  ║                                      ║
  ║   http://localhost:${PORT}              ║
  ║   WebSocket: ws://localhost:${PORT}/ws  ║
  ╚══════════════════════════════════════╝
  `);
});
