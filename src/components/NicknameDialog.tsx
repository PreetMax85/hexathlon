"use client";

import { useState } from "react";
import { ensurePlayer } from "@/game/api";
import { browserKV } from "@/game/browser";
import { cleanNickname, NICKNAME_MAX, savePlayer, type Player } from "@/game/storage";
import { Button } from "./ui";

interface FormProps {
  initial?: string;
  title?: string;
  onCancel?: () => void;
  onSaved?: (player: Player) => void;
}

/** Nickname form. Asked for at the first scored submit, never before play; no login. */
export function NicknameForm({ initial = "", title, onCancel, onSaved }: FormProps) {
  const [name, setName] = useState(initial);
  const valid = cleanNickname(name).length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const player = savePlayer(browserKV, name);
    if (!player) return;
    // Fire and forget: results submission registers again if this fails.
    void ensurePlayer(player);
    onSaved?.(player);
  };

  return (
    <form onSubmit={submit} className="anim-pop flex w-full flex-col gap-4 border-y-2 border-ink bg-deep px-4 py-4">
      <div>
        <h2 id="nick-title" className="font-bold">
          {title ?? (initial ? "Change nickname" : "Pick a nickname")}
        </h2>
        <p className="text-s text-ink-2">Shown on leaderboards. No account needed.</p>
      </div>
      <label className="label flex flex-col gap-1 text-ink-2">
        Nickname
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NICKNAME_MAX}
          autoComplete="nickname"
          enterKeyHint="done"
          placeholder="e.g. LongestRoad"
          className="min-h-12 bg-paper px-3 text-m font-normal normal-case tracking-normal text-ink ring-1 ring-inset ring-ink placeholder:text-ink-2 focus-visible:outline-offset-0"
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
  );
}

/** The nickname form as a modal, for renaming from the header. */
export function NicknameDialog(props: FormProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nick-title"
    >
      <div className="w-full max-w-sm">
        <NicknameForm {...props} />
      </div>
    </div>
  );
}
