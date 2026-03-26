import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store/appStore";

interface InputBarProps {
  onSubmit: (message: string) => void;
}

export default function InputBar({ onSubmit }: InputBarProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isLoading, isConnected, statusText } = useAppStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6">
      {/* Status text */}
      {statusText && (
        <div className="max-w-3xl mx-auto mb-2 px-4">
          <span className="text-xs text-text-dim font-mono animate-[pulse_2s_ease-in-out_infinite]">
            {statusText}
          </span>
        </div>
      )}

      {/* Input container */}
      <div
        className={`
          max-w-3xl mx-auto relative
          rounded-2xl
          transition-all duration-300 ease-out
          ${focused ? "shadow-[0_0_30px_rgba(59,130,246,0.15)]" : ""}
        `}
      >
        {/* Glass background */}
        <div
          className={`
            absolute inset-0 rounded-2xl
            bg-[rgba(255,255,255,0.03)]
            backdrop-blur-xl
            border transition-colors duration-300
            ${focused ? "border-[rgba(59,130,246,0.3)]" : "border-[rgba(255,255,255,0.08)]"}
          `}
        />

        <div className="relative flex items-end gap-3 p-3">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              isConnected
                ? "Ask Claude to show you something..."
                : "Connect to server or try demo mode..."
            }
            rows={1}
            className="
              flex-1 bg-transparent border-none outline-none resize-none
              text-text-primary placeholder:text-text-dim
              text-[15px] leading-relaxed
              font-[var(--font-sans)]
              max-h-32
            "
            style={{
              height: "auto",
              minHeight: "24px",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 128) + "px";
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            className={`
              flex-shrink-0 w-9 h-9 rounded-xl
              flex items-center justify-center
              transition-all duration-200
              ${
                value.trim() && !isLoading
                  ? "bg-primary text-white hover:bg-blue-500 cursor-pointer"
                  : "bg-[rgba(255,255,255,0.05)] text-text-dim cursor-not-allowed"
              }
            `}
          >
            {isLoading ? (
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
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 11L12 6L17 11M12 6V18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Connection indicator */}
      <div className="max-w-3xl mx-auto mt-2 flex items-center justify-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isConnected ? "bg-success" : "bg-accent"
          }`}
        />
        <span className="text-[11px] text-text-dim">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
    </div>
  );
}
