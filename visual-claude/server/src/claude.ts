import type { WebSocket } from "ws";
import { toolDefinitions, handleToolCall, registerWsClient } from "./tools.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import { getLibraryForPrompt } from "./library.js";

// Track active WebSocket clients for broadcasting
let wsClientsRef: Set<WebSocket> = new Set();

export function setWsClients(clients: Set<WebSocket>) {
  wsClientsRef = clients;
}

function broadcastStatus(data: unknown) {
  const msg = JSON.stringify(data);
  for (const ws of wsClientsRef) {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  }
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

// Maintain conversation history per session (simple in-memory for now)
const conversationHistory: ConversationMessage[] = [];

export async function handlePrompt(userMessage: string): Promise<void> {
  broadcastStatus({ type: "status", status: "thinking" });

  conversationHistory.push({ role: "user", content: userMessage });

  try {
    // Dynamic import to handle cases where SDK isn't available
    const sdk = await import("@anthropic-ai/claude-agent-sdk");
    const { query } = sdk;

    const systemPrompt = buildSystemPrompt(getLibraryForPrompt());

    // Use Claude Agent SDK with inline tools
    const stream = query({
      prompt: userMessage,
      options: {
        systemPrompt,
        allowedTools: [],
        customTools: toolDefinitions.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.input_schema,
        })),
      },
    });

    for await (const message of stream) {
      if (message.type === "tool_use") {
        const result = handleToolCall({
          name: message.name,
          input: message.input as Record<string, unknown>,
        });

        // The SDK handles tool results automatically
        if (result.isError) {
          broadcastStatus({
            type: "error",
            message: result.content,
          });
        }
      } else if (message.type === "text") {
        // Claude sent some text (might be minimal given our system prompt)
        broadcastStatus({
          type: "text",
          content: message.text,
        });
      }
    }

    broadcastStatus({ type: "status", status: "done" });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Claude query error:", errMsg);

    // Fallback: if SDK isn't available, send a helpful message
    broadcastStatus({
      type: "error",
      message: `Claude Agent SDK unavailable: ${errMsg}. Install @anthropic-ai/claude-agent-sdk or use demo mode.`,
    });
    broadcastStatus({ type: "status", status: "done" });
  }
}
