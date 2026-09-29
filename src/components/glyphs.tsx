import type { Resource } from "@/engine";

/**
 * Authored 24-unit glyphs, one stroke weight. They carry resource identity
 * next to colour, so nothing on the board or in a hand is colour-only.
 */
const PATHS: Record<Resource | "desert" | "road" | "settlement" | "city" | "dev", string> = {
  wood: "M12 2.8 5.2 12.6h3.6L5.8 17.6h12.4l-3-5h3.6L12 2.8Z M12 17.6V21.2",
  brick: "M3.2 6.6h17.6v10.8H3.2Z M3.2 12h17.6 M9.2 6.6V12 M15.2 12v5.4",
  sheep:
    "M6.6 15.4a2.9 2.9 0 0 1-.4-5.7 3.3 3.3 0 0 1 5.6-2.3 3.3 3.3 0 0 1 5.8 1.6 2.9 2.9 0 0 1-.5 6.4Z M8.4 15.4v3.4 M15.4 15.4v3.4 M18.4 9.6h2.4",
  wheat:
    "M12 21.2V5.6 M12 9.2C9 8.6 7.8 6.8 7.8 4.4c2.8.2 4.2 2 4.2 4.8Z M12 9.2c3-.6 4.2-2.4 4.2-4.8-2.8.2-4.2 2-4.2 4.8Z M12 14.4c-3-.6-4.2-2.4-4.2-4.8 2.8.2 4.2 2 4.2 4.8Z M12 14.4c3-.6 4.2-2.4 4.2-4.8-2.8.2-4.2 2-4.2 4.8Z",
  ore: "M2.4 19.2 9.2 6.8l4 6.6 2.8-4.2 5.6 10Z M9.2 6.8 7.2 10.4l2 1.2 1.6-1.4",
  desert: "M2.4 16.4c3.4-3.6 6.4-3.6 9.6 0s6.2 3.6 9.6 0 M5.2 11.2c2.4-2.6 4.8-2.6 7 0",
  road: "M6.2 20.4 9.6 3.6 M17.8 20.4 14.4 3.6 M12 5.6v2 M12 10.8v2 M12 16v2.4",
  settlement: "M4.4 20V11.2L12 5.2l7.6 6V20Z M10 20v-4.8h4V20",
  city: "M2.8 20V10.4L7.8 6.4l5 4V20 M12.8 20v-8.4h8.4V20Z M2.8 20h18.4 M15.8 14.6h2.4",
  dev: "M6.8 3.2h10.4v17.6H6.8Z M9.6 9.2h4.8 M12 6.8v4.8 M9.6 16h4.8",
};

export type GlyphName = keyof typeof PATHS;

/** Raw 24-unit path, for renderers that can't use the components (share cards). */
export const glyphPath = (name: GlyphName) => PATHS[name];

export function Glyph({
  name,
  size = 20,
  className,
  title,
}: {
  name: GlyphName;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The same glyph as an SVG group, for drawing inside the board. `s` is its size in board units. */
export function BoardGlyph({ name, x, y, s, color }: { name: GlyphName; x: number; y: number; s: number; color: string }) {
  const k = s / 24;
  return (
    <path
      d={PATHS[name]}
      transform={`translate(${x - s / 2} ${y - s / 2}) scale(${k})`}
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="none"
    />
  );
}

/**
 * IALA lateral buoys as verdicts: a green cone (right) and a red can (wrong).
 * Shape carries the meaning; colour only confirms it.
 */
export function BuoyShape({ kind, x = 0, y = 0, s = 1 }: { kind: "cone" | "can"; x?: number; y?: number; s?: number }) {
  // Drawn standing on (x, y), `s` tall, in whatever units the parent uses.
  const w = s * 0.62;
  const sw = s * 0.07;
  if (kind === "cone") {
    return (
      <g>
        <path
          d={`M${x - w / 2} ${y - s * 0.22}L${x} ${y - s}L${x + w / 2} ${y - s * 0.22}Z`}
          fill="var(--buoy-green)"
          stroke="var(--deep)"
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <path d={`M${x - w * 0.62} ${y - s * 0.1}h${w * 1.24}`} stroke="var(--ink)" strokeWidth={sw * 1.2} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - s * 0.86}
        width={w}
        height={s * 0.64}
        fill="var(--red)"
        stroke="var(--deep)"
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path d={`M${x - w * 0.62} ${y - s * 0.1}h${w * 1.24}`} stroke="var(--ink)" strokeWidth={sw * 1.2} strokeLinecap="round" />
    </g>
  );
}

/** A buoy as a standalone inline icon (verdict bar, progress strip, result strip). */
export function Buoy({ kind, size = 22, label }: { kind: "cone" | "can" | "pending" | "current"; size?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {kind === "cone" || kind === "can" ? (
        <BuoyShape kind={kind} x={12} y={22} s={21} />
      ) : (
        <circle
          cx={12}
          cy={14}
          r={kind === "current" ? 5 : 3.2}
          fill={kind === "current" ? "var(--deep)" : "var(--hair)"}
          stroke={kind === "current" ? "var(--magenta)" : "none"}
          strokeWidth={2.4}
        />
      )}
    </svg>
  );
}
