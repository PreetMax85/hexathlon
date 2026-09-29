"use client";

import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span aria-hidden className="text-6xl">🎲</span>
      <h1 className="text-3xl font-black">Something went wrong</h1>
      <p className="text-muted">An unexpected error interrupted the game. Your saved scores are safe.</p>
      <div className="flex w-full max-w-xs gap-2">
        <Button className="flex-1" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/" variant="secondary" className="flex-1">
          Home
        </ButtonLink>
      </div>
    </main>
  );
}
