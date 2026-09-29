"use client";

import { usePlayer } from "@/game/browser";
import { NicknameDialog } from "./NicknameDialog";

/** Asks for a nickname on the first visit. */
export function HomeNickname() {
  const player = usePlayer();
  return player === null ? <NicknameDialog /> : null;
}
