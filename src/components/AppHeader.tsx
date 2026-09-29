"use client";

import Link from "next/link";
import { useState } from "react";
import { applyTheme, usePlayer, useTheme, useTodayKey } from "@/game/browser";
import { chartDate } from "@/game/chart";
import { cycleTheme, THEME_LABEL, type Theme } from "@/game/theme";
import { NicknameDialog } from "./NicknameDialog";
import { Logo } from "./ui";

function ThemeIcon({ theme }: { theme: Theme }) {
  // Sun for day, half-lit for dusk, crescent for night, split disc for auto.
  return (
    <svg width={18} height={18} viewBox="-10 -10 20 20" aria-hidden>
      <circle r={6.5} fill="none" stroke="currentColor" strokeWidth={1.6} />
      {theme === "day" &&
        [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} y1={-8.2} y2={-9.6} stroke="currentColor" strokeWidth={1.4} transform={`rotate(${a})`} />
        ))}
      {theme === "dusk" && <path d="M-6.5 0a6.5 6.5 0 0 0 13 0Z" fill="currentColor" />}
      {theme === "night" && <path d="M1.5-6.3a6.5 6.5 0 1 0 4.8 8.7A5 5 0 0 1 1.5-6.3Z" fill="currentColor" />}
      {theme === "auto" && <path d="M0-6.5a6.5 6.5 0 0 1 0 13Z" fill="currentColor" />}
    </svg>
  );
}

/** The chart's cartouche: name and edition date, palette switch and the player's nickname. */
export function AppHeader({ wide = false }: { wide?: boolean }) {
  const player = usePlayer();
  const theme = useTheme();
  const today = useTodayKey();
  const [renaming, setRenaming] = useState(false);
  const next = theme ? cycleTheme(theme) : "day";
  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className={`mx-auto flex min-h-14 w-full items-center justify-between gap-2 px-4 ${wide ? "max-w-6xl" : "max-w-xl"}`}>
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2" aria-label="Hexathlon home">
          <Logo />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-m font-extrabold uppercase tracking-[0.12em] wide">Hexathlon</span>
            <span className="label mt-1 truncate text-ink-2">{today ? chartDate(today) : " "}</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => applyTheme(next)}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-2 text-s font-semibold"
            aria-label={`Chart palette: ${THEME_LABEL[theme ?? "auto"]}. Switch to ${THEME_LABEL[next]}`}
          >
            <ThemeIcon theme={theme ?? "auto"} />
            <span className="hidden sm:inline">{THEME_LABEL[theme ?? "auto"]}</span>
          </button>
          {player && (
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="sea flex min-h-11 max-w-[9rem] items-center px-2 text-s font-semibold underline decoration-hair underline-offset-4"
              aria-label={`Playing as ${player.nickname}. Change nickname`}
            >
              <span className="truncate">{player.nickname}</span>
            </button>
          )}
        </div>
      </div>
      {renaming && player && (
        <NicknameDialog
          initial={player.nickname}
          onCancel={() => setRenaming(false)}
          onSaved={() => setRenaming(false)}
        />
      )}
    </header>
  );
}
