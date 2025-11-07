/**
 * CopyButton Component
 *
 * Copies JSON data to clipboard with visual feedback
 */

import React, { useState } from "react";

interface CopyButtonProps {
  data: any;
  label?: string;
}

export default function CopyButton({ data, label = "Copy JSON" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "8px 16px",
        backgroundColor: copied ? "#22c55e" : "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: "6px",
        fontWeight: 600,
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          e.currentTarget.style.backgroundColor = "#2563eb";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          e.currentTarget.style.backgroundColor = "#3b82f6";
        }
      }}
    >
      {copied ? "✓ Copied!" : label}
    </button>
  );
}
