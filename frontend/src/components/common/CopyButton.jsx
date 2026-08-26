import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard API may be unavailable (insecure context, permissions) — fail silently.
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-white/30 hover:text-cyan-300 transition-colors focus-ring shrink-0"
      aria-label={`${label}: ${value}`}
      title={copied ? "Copied!" : label}
      type="button"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}
