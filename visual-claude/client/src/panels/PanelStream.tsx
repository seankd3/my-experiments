import { useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";
import VisualPanel from "./VisualPanel";

export default function PanelStream() {
  const { panels, isLoading } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new panels appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [panels.length]);

  return (
    <div className="h-full overflow-y-auto pb-44 pt-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Empty state */}
        {panels.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-[fadeIn_0.8s_ease-out]">
            {/* Logo mark */}
            <div className="w-16 h-16 mb-6 relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-violet opacity-20 blur-xl" />
              <div className="relative w-full h-full rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-sm border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    opacity="0.5"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    opacity="0.75"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-xl font-medium text-text-primary mb-2 tracking-tight">
              Visual Claude
            </h1>
            <p className="text-sm text-text-dim max-w-xs text-center leading-relaxed">
              Ask a question and Claude will show you the answer as an interactive visual
            </p>
          </div>
        )}

        {/* Panels */}
        {panels.map((panel, i) => (
          <div
            key={panel.id}
            className="animate-[slideUp_0.5s_ease-out_both]"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <VisualPanel panel={panel} />
          </div>
        ))}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="animate-[slideUp_0.4s_ease-out]">
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="p-6">
                <div className="h-4 w-32 rounded bg-[rgba(255,255,255,0.05)] animate-[shimmer_2s_linear_infinite] bg-[length:200%_100%] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.05)] to-transparent mb-4" />
                <div className="h-48 rounded-xl bg-[rgba(255,255,255,0.02)] animate-pulse flex items-center justify-center">
                  <div className="flex items-center gap-2 text-text-dim">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="31.4"
                        strokeDashoffset="10"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-xs font-mono">Claude is creating a visual...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
