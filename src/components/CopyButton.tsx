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
  const baseBackground = copied ? "rgba(34, 197, 94, 0.16)" : "rgba(9, 20, 34, 0.88)";
  const hoverBackground = copied ? "rgba(34, 197, 94, 0.22)" : "rgba(11, 29, 48, 0.92)";
  const borderColor = copied ? "rgba(34, 197, 94, 0.32)" : "rgba(125, 211, 252, 0.18)";
  const textColor = copied ? "#bbf7d0" : "rgba(226, 236, 248, 0.92)";

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
      type="button"
      style={{
        padding: "8px 16px",
        backgroundColor: baseBackground,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: "999px",
        fontWeight: 600,
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBackground;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = baseBackground;
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
