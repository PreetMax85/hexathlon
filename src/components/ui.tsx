import Link from "next/link";
import type { ReactNode } from "react";
import type { Tier } from "@/engine";
import { TIER_LABEL } from "@/game/meta";

const TIER_DEPTH: Record<Tier, number> = { easy: 1, medium: 2, hard: 3 };

/** Tier as a depth mark: one to three soundings bars in ink, never the verdict colours. */
export function TierMark({ tier }: { tier: Tier }) {
  const n = TIER_DEPTH[tier];
  return (
    <span className="label inline-flex items-center gap-1.5 text-ink-2">
      <span aria-hidden className="inline-flex items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-[3px] ${i <= n ? "bg-ink" : "bg-hair"}`}
            style={{ height: `${4 + i * 3}px` }}
          />
        ))}
      </span>
      {TIER_LABEL[tier]}
    </span>
  );
}

/** Hexathlon's mark: a hex island with a light on its point. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
      <polygon
        points="0,-9.5 8.2,-4.75 8.2,4.75 0,9.5 -8.2,4.75 -8.2,-4.75"
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx={0} cy={0} r={3} fill="var(--magenta)" />
    </svg>
  );
}

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 px-5 text-m font-semibold tracking-[0.01em] transition-[transform,background-color,color] duration-150 active:translate-y-px disabled:cursor-not-allowed";

const VARIANTS = {
  primary: "bg-ink text-paper hover:bg-[color-mix(in_srgb,var(--ink)_88%,var(--magenta))] disabled:hatch disabled:bg-paper disabled:text-ink-2 disabled:ring-1 disabled:ring-inset disabled:ring-hair",
  secondary:
    "bg-deep text-ink ring-1 ring-inset ring-ink hover:bg-shoal-2 disabled:hatch disabled:text-ink-2 disabled:ring-hair",
  ghost: "text-magenta underline decoration-1 underline-offset-4 hover:decoration-2 disabled:text-ink-2 disabled:no-underline",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const { children, ...rest } = props;
  // The label sits on its own paper plate so disabled hatching never crosses it.
  return (
    <button type="button" className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest}>
      <span className="btn-label">{children}</span>
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

/** A chart note: italic heading over a hairline, then content. Used instead of cards. */
export function Note({
  title,
  children,
  className = "",
  as: Tag = "section",
  action,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
  action?: ReactNode;
}) {
  return (
    <Tag className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-1.5">
        <h2 className="sea text-m">{title}</h2>
        {action}
      </div>
      {children}
    </Tag>
  );
}

/**
 * A small range ring: remaining arc in magenta with a bearing tick. Used as
 * the Hand Tracker log dial; the board draws the full-size ring itself.
 */
export function RangeDial({ fraction, size = 28, label }: { fraction: number; size?: number; label: string }) {
  const f = Math.max(0, Math.min(1, fraction));
  const r = 10;
  const c = 2 * Math.PI * r;
  const a = (1 - f) * 2 * Math.PI - Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" role="img" aria-label={label}>
      <circle r={r} fill="none" stroke="var(--hair)" strokeWidth={1.4} />
      <circle
        r={r}
        fill="none"
        stroke="var(--magenta)"
        strokeWidth={2.4}
        strokeDasharray={`${f * c} ${c}`}
        transform={`rotate(${(1 - f) * 360 - 90})`}
      />
      <line x1={0} y1={0} x2={Math.cos(a) * r} y2={Math.sin(a) * r} stroke="var(--ink)" strokeWidth={1.4} strokeLinecap="round" />
      <circle r={1.6} fill="var(--ink)" />
    </svg>
  );
}
