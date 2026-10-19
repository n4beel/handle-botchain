import { HTMLAttributes } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  noPadding?: boolean;
}

/** A soft raised card: large radius, a lifted shadow, a hairline rather than a hard border. */
export default function Panel({
  elevated,
  noPadding,
  children,
  className = "",
  style,
  ...props
}: PanelProps) {
  return (
    <div
      className={[noPadding ? "" : "p-6", className].join(" ")}
      style={{
        background: elevated ? "var(--bg-elevated)" : "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "18px",
        boxShadow: "0 18px 40px -24px rgba(0,0,0,0.9)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
