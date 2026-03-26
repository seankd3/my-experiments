import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "./store/appStore";
import InputBar from "./input/InputBar";
import PanelStream from "./panels/PanelStream";
import { getDemos } from "./panels/demos";

function App() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const { setConnected, setLoading, setStatusText, addPanel } = useAppStore();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[ws] Connected");
      setConnected(true);
      setStatusText("");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "render_visual":
          addPanel({
            id: data.panelId,
            html: data.html,
            css: data.css,
            js: data.js,
            title: data.title || "",
            timestamp: Date.now(),
          });
          setLoading(false);
          setStatusText("");
          break;

        case "status":
          if (data.status === "thinking") {
            setLoading(true);
            setStatusText("Claude is thinking...");
          } else if (data.status === "done") {
            setLoading(false);
            setStatusText("");
          }
          break;

        case "text":
          setStatusText(data.content?.slice(0, 100) || "");
          break;

        case "error":
          setLoading(false);
          setStatusText(`Error: ${data.message}`);
          // Show error as a visual panel
          addPanel({
            id: `error-${Date.now()}`,
            html: `<div class="glass-card glow-error fade-in" style="text-align:center;padding:32px;">
              <div style="font-size:24px;margin-bottom:12px;">⚠</div>
              <div style="color:var(--color-error);font-size:13px;font-family:var(--font-mono);">${data.message}</div>
            </div>`,
            css: "",
            js: "",
            title: "Error",
            timestamp: Date.now(),
          });
          break;

        case "connected":
          console.log("[ws] Server:", data.message);
          break;
      }
    };

    ws.onclose = () => {
      console.log("[ws] Disconnected");
      setConnected(false);
      setStatusText("Disconnected — reconnecting...");
      // Auto-reconnect after 2s
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, [setConnected, setLoading, setStatusText, addPanel]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const handleSubmit = (message: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "prompt", message }));
      setLoading(true);
      setStatusText("Sending to Claude...");
    } else {
      setStatusText("Not connected to server");
    }
  };

  const loadDemos = () => {
    const demos = getDemos();
    demos.forEach((demo, i) => {
      setTimeout(() => {
        addPanel({
          ...demo,
          id: `demo-${Date.now()}-${i}`,
          timestamp: Date.now(),
        });
      }, i * 300);
    });
  };

  const { panels, isConnected } = useAppStore();

  return (
    <div className="h-screen flex flex-col relative">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-text-muted">Visual Claude</span>
        </div>

        <div className="flex items-center gap-2">
          {panels.length === 0 && (
            <button
              onClick={loadDemos}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted bg-surface border border-border hover:border-border-glow hover:text-text-primary transition-all cursor-pointer"
            >
              Load Demos
            </button>
          )}
          {!isConnected && (
            <span className="px-3 py-1.5 rounded-lg text-[11px] font-mono text-accent bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)]">
              Demo Mode
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <PanelStream />

      {/* Input */}
      <InputBar onSubmit={handleSubmit} />
    </div>
  );
}

export default App;
