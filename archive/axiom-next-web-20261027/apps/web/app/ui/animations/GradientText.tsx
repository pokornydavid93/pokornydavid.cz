// GradientText.tsx
import React, { ReactNode, CSSProperties } from "react";
import "./GradientText.css";

type GradientTextProps = {
  children: ReactNode;
  className?: string;
  colors?: string[];
  gradientVar?: string;
  animationSpeed?: number;
  showBorder?: boolean;
};

export default function GradientText({
  children,
  className = "",
  colors = [
    "var(--text-emphasis)",
  ],
  gradientVar,
  animationSpeed = 8,
  showBorder = false,
}: GradientTextProps) {
  const solidStyle: CSSProperties = {
    color: gradientVar ? `var(${gradientVar})` : (colors[0] ?? "var(--text-emphasis)"),
    animationDuration: `${animationSpeed}s`,
  };

  return (
    <div className={`animated-gradient-text ${className}`}>
      {showBorder && (
        <div className="gradient-overlay" style={solidStyle}></div>
      )}
      <div className="text-content" style={solidStyle}>
        {children}
      </div>
    </div>
  );
}
