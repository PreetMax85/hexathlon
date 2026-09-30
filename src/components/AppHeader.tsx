"use client";

import Link from "next/link";
import { useState } from "react";
import { applyTheme, usePlayer, useTheme } from "@/game/browser";
import { THEME_LABEL, toggleTheme, type Theme } from "@/game/theme";
import { NicknameDialog } from "./NicknameDialog";
import { Logo } from "./ui";

function ThemeIcon({ theme }: { theme: Theme }) {
  // Sun for day, half-lit disc for dusk.
  return (
    <svg width={18} height={18} viewBox="-10 -10 20 20" aria-hidden>
      <circle r={6.5} fill="none" stroke="currentColor" strokeWidth={1.6} />
      {theme === "day" &&
        [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} y1={-8.2} y2={-9.6} stroke="currentColor" strokeWidth={1.4} transform={`rotate(${a})`} />
        ))}
      {theme === "dusk" && <path d="M-6.5 0a6.5 6.5 0 0 0 13 0Z" fill="currentColor" />}
    </svg>
  );
}

/** Name, palette switch and the player's nickname. */
export function AppHeader({ wide = false }: { wide?: boolean }) {
  const player = usePlayer();
  const theme = useTheme();
  const [renaming, setRenaming] = useState(false);
  const next = theme ? toggleTheme(theme) : "dusk";
  return (
    <header data-app-header className="border-b border-hair bg-paper">
      <div className={`mx-auto flex min-h-14 w-full items-center justify-between gap-2 px-4 ${wide ? "max-w-6xl" : "max-w-xl"}`}>
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2" aria-label="Hexathlon home">
          <Logo />
          <span className="text-m font-extrabold uppercase leading-none tracking-[0.12em] wide">Hexathlon</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => applyTheme(next)}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-2 text-s font-semibold"
            aria-label={`Palette: ${THEME_LABEL[theme ?? "day"]}. Switch to ${THEME_LABEL[next]}`}
          >
            <ThemeIcon theme={theme ?? "day"} />
            <span className="hidden sm:inline">{THEME_LABEL[theme ?? "day"]}</span>
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
