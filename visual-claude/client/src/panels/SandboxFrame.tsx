import { useRef, useState, useEffect, useCallback } from "react";
import { buildSrcdoc } from "../sandbox/buildSrcdoc";
import { listenToSandbox } from "../sandbox/bridge";

interface SandboxFrameProps {
  html: string;
  css: string;
  js: string;
}

export default function SandboxFrame({ html, css, js }: SandboxFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);
  const [error, setError] = useState<string | null>(null);

  const srcdoc = buildSrcdoc({ html, css, js });

  const handleResize = useCallback((h: number) => {
    // Clamp between 100 and 2000px
    setHeight(Math.min(Math.max(h, 100), 2000));
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    return listenToSandbox(iframe, handleResize, handleError);
  }, [handleResize, handleError]);

  return (
    <div className="relative">
      {error && (
        <div className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[11px] text-error font-mono max-w-[300px] truncate">
          {error}
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        sandbox="allow-scripts allow-same-origin"
        className="w-full border-none rounded-xl bg-transparent"
        style={{
          height: `${height}px`,
          transition: "height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        title="Visual Claude Sandbox"
      />
    </div>
  );
}
