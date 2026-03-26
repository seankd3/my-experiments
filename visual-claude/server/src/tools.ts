import type { WebSocket } from "ws";
import { saveComponent, getLibraryForPrompt } from "./library.js";

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
}

let wsClients: Set<WebSocket> = new Set();

export function registerWsClient(ws: WebSocket) {
  wsClients.add(ws);
  ws.on("close", () => wsClients.delete(ws));
}

function broadcastToClients(data: unknown) {
  const msg = JSON.stringify(data);
  for (const ws of wsClients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  }
}

export const toolDefinitions = [
  {
    name: "render_visual",
    description:
      "Render a live interactive visual on the web canvas. Provide HTML, CSS, and JS that will run in a sandboxed iframe with the dark glass theme pre-loaded. Use SVG for diagrams, CSS animations for motion, Canvas API for graphics, vanilla JS for interactivity.",
    input_schema: {
      type: "object" as const,
      properties: {
        html: {
          type: "string",
          description: "HTML content to render. Can include SVG, elements, etc.",
        },
        css: {
          type: "string",
          description:
            "CSS styles for the visual. Theme custom properties are available. Optional if using only utility classes.",
        },
        js: {
          type: "string",
          description:
            "JavaScript for interactivity. Runs after DOM is ready. Optional.",
        },
        title: {
          type: "string",
          description: "Short title/label for this visual panel.",
        },
      },
      required: ["html"],
    },
  },
  {
    name: "save_component",
    description:
      "Save a reusable visual component to the library. It will be available in all future sandboxes. Save components you build that are general-purpose and could be reused.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Unique kebab-case name (e.g., 'network-diagram', 'metric-gauge').",
        },
        description: {
          type: "string",
          description: "What this component does and how to use it.",
        },
        html: { type: "string", description: "HTML template." },
        css: { type: "string", description: "CSS styles." },
        js: { type: "string", description: "JavaScript logic." },
      },
      required: ["name", "description", "html"],
    },
  },
  {
    name: "get_library",
    description:
      "Get the current component library contents. See what components you've previously saved.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
];

export function handleToolCall(tool: ToolCall): ToolResult {
  switch (tool.name) {
    case "render_visual": {
      const { html, css, js, title } = tool.input as {
        html: string;
        css?: string;
        js?: string;
        title?: string;
      };

      const panelId = `panel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      broadcastToClients({
        type: "render_visual",
        panelId,
        html,
        css: css || "",
        js: js || "",
        title: title || "",
      });

      return {
        content: `Visual rendered successfully (panel: ${panelId}). The user can now see and interact with it on the canvas.`,
      };
    }

    case "save_component": {
      const { name, description, html, css, js } = tool.input as {
        name: string;
        description: string;
        html: string;
        css?: string;
        js?: string;
      };

      const saved = saveComponent({
        name,
        description,
        html,
        css: css || "",
        js: js || "",
      });

      return {
        content: `Component "${saved.name}" saved to library. It will be available in all future sandbox renders.`,
      };
    }

    case "get_library": {
      const contents = getLibraryForPrompt();
      return {
        content: contents || "Library is empty. No components saved yet.",
      };
    }

    default:
      return { content: `Unknown tool: ${tool.name}`, isError: true };
  }
}
