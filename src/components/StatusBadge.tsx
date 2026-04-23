/**
 * StatusBadge Component
 *
 * Visual severity indicator with color coding
 * - Low: Green
 * - Medium: Yellow
 * - High: Orange
 * - Critical: Red
 */

import React from "react";

interface StatusBadgeProps {
  severity: "low" | "medium" | "high" | "critical";
  score?: number;
}

const severityConfig = {
  low: {
    label: "Low",
    color: "#86efac",
    bgColor: "rgba(34, 197, 94, 0.14)",
    borderColor: "rgba(34, 197, 94, 0.32)",
  },
  medium: {
    label: "Medium",
    color: "#fde047",
    bgColor: "rgba(234, 179, 8, 0.14)",
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  high: {
    label: "High",
    color: "#fdba74",
    bgColor: "rgba(249, 115, 22, 0.14)",
    borderColor: "rgba(249, 115, 22, 0.3)",
  },
  critical: {
    label: "Critical",
    color: "#fca5a5",
    bgColor: "rgba(239, 68, 68, 0.14)",
    borderColor: "rgba(239, 68, 68, 0.34)",
  },
};

export default function StatusBadge({ severity, score }: StatusBadgeProps) {
  const config = severityConfig[severity];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        borderRadius: "999px",
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        fontWeight: 600,
        fontSize: "14px",
        color: config.color,
        backdropFilter: "blur(10px)",
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: config.color,
        }}
      />
      {config.label}
      {score !== undefined && ` (${score})`}
    </div>
  );
}
