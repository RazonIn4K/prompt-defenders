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
    color: "#22c55e",
    bgColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  medium: {
    label: "Medium",
    color: "#eab308",
    bgColor: "#fefce8",
    borderColor: "#fde047",
  },
  high: {
    label: "High",
    color: "#f97316",
    bgColor: "#fff7ed",
    borderColor: "#fdba74",
  },
  critical: {
    label: "Critical",
    color: "#ef4444",
    bgColor: "#fef2f2",
    borderColor: "#fca5a5",
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
        borderRadius: "6px",
        backgroundColor: config.bgColor,
        border: `2px solid ${config.borderColor}`,
        fontWeight: 600,
        fontSize: "14px",
        color: config.color,
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
