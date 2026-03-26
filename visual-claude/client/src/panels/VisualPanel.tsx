import type { VisualPanel as VisualPanelType } from "../store/appStore";
import SandboxFrame from "./SandboxFrame";

interface VisualPanelProps {
  panel: VisualPanelType;
}

export default function VisualPanel({ panel }: VisualPanelProps) {
  return (
    <div className="group rounded-2xl border border-border bg-surface overflow-hidden transition-all duration-300 hover:border-border-glow">
      {/* Title bar */}
      {panel.title && (
        <div className="px-5 pt-4 pb-0 flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted tracking-wide uppercase">
            {panel.title}
          </span>
          <span className="text-[10px] font-mono text-text-dim">
            {new Date(panel.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Sandbox content */}
      <div className="p-3">
        <SandboxFrame html={panel.html} css={panel.css} js={panel.js} />
      </div>
    </div>
  );
}
