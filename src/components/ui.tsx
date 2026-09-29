import Link from "next/link";
import type { ReactNode } from "react";
import type { Tier } from "@/engine";
import { TIER_LABEL } from "@/game/meta";

const TIER_STYLE: Record<Tier, string> = {
  easy: "bg-good-bg text-good",
  medium: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  hard: "bg-bad-bg text-bad",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${TIER_STYLE[tier]}`}>
      {TIER_LABEL[tier]}
    </span>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-1 -1 2 2" aria-hidden="true">
      <polygon
        points="0,-0.95 0.82,-0.475 0.82,0.475 0,0.95 -0.82,0.475 -0.82,-0.475"
        fill="var(--brand)"
      />
      <circle r={0.34} fill="var(--brand-ink)" />
    </svg>
  );
}

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-transform active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";

const VARIANTS = {
  primary: "bg-brand text-brand-ink",
  secondary: "border border-line bg-surface text-ink",
  ghost: "text-muted underline-offset-4 hover:underline",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return <button type="button" className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

/** Thin bar that shrinks as time runs out. `fraction` is remaining time in 0–1. */
export function TimeBar({ fraction, label }: { fraction: number; label: string }) {
  const low = fraction < 0.34;
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        aria-label="Time left"
      >
        <div
          className={`h-full rounded-full ${low ? "bg-bad" : "bg-brand"}`}
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
      </div>
      <span className={`tabular w-10 text-right text-sm font-bold ${low ? "text-bad" : "text-muted"}`}>
        {label}
      </span>
    </div>
  );
}
