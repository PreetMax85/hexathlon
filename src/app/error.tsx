"use client";

import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-l font-extrabold uppercase wide">Something went wrong</h1>
      <p>An unexpected error interrupted the game. Scores on this device are safe; try again or head back.</p>
      <div className="flex w-full max-w-sm gap-2">
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
