export interface SandboxMessage {
  type: "resize" | "error";
  height?: number;
  message?: string;
}

export function listenToSandbox(
  iframe: HTMLIFrameElement,
  onResize: (height: number) => void,
  onError?: (message: string) => void
): () => void {
  const handler = (event: MessageEvent) => {
    // Only accept messages from our iframe
    if (event.source !== iframe.contentWindow) return;

    const data = event.data as SandboxMessage;

    if (data.type === "resize" && data.height) {
      onResize(data.height);
    } else if (data.type === "error" && data.message) {
      onError?.(data.message);
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
