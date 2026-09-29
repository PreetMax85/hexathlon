"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlayer } from "@/game/browser";
import { NicknameDialog } from "./NicknameDialog";
import { Logo } from "./ui";

/** Top bar: brand link and the player's nickname chip (tap to rename). */
export function AppHeader({ wide = false }: { wide?: boolean }) {
  const player = usePlayer();
  const [renaming, setRenaming] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className={`mx-auto flex h-14 w-full items-center justify-between px-4 ${wide ? "max-w-xl lg:max-w-6xl" : "max-w-xl"}`}>
        <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-extrabold tracking-tight">
          <Logo />
          Hexathlon
        </Link>
        {player ? (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="flex min-h-11 max-w-[10rem] items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-semibold"
            aria-label={`Playing as ${player.nickname}. Change nickname`}
          >
            <span aria-hidden className="grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-brand-ink">
              {player.nickname.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate">{player.nickname}</span>
          </button>
        ) : null}
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
