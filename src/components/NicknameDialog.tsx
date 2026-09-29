"use client";

import { useState } from "react";
import { ensurePlayer } from "@/game/api";
import { browserKV } from "@/game/browser";
import { cleanNickname, NICKNAME_MAX, savePlayer } from "@/game/storage";
import { Button, Logo } from "./ui";

interface Props {
  initial?: string;
  /** Present when the dialog can be dismissed (renaming, not first visit). */
  onCancel?: () => void;
  onSaved?: () => void;
}

/** Nickname prompt. The first visit asks for one; no login. */
export function NicknameDialog({ initial = "", onCancel, onSaved }: Props) {
  const [name, setName] = useState(initial);
  const valid = cleanNickname(name).length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const player = savePlayer(browserKV, name);
    // Fire and forget: results submission registers again if this fails.
    if (player) void ensurePlayer(player);
    onSaved?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nick-title"
    >
      <form
        onSubmit={submit}
        className="anim-pop flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-5 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <h2 id="nick-title" className="text-xl font-extrabold leading-tight">
              {initial ? "Change nickname" : "Pick a nickname"}
            </h2>
            <p className="text-sm text-muted">Shown on leaderboards. No account needed.</p>
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Nickname
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NICKNAME_MAX}
            autoComplete="nickname"
            enterKeyHint="done"
            placeholder="e.g. LongestRoad"
            className="min-h-12 rounded-xl border border-line bg-bg px-4 text-base font-normal"
          />
        </label>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="secondary" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={!valid}>
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}
