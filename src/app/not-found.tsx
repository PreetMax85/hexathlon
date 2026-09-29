import { AppHeader } from "@/components/AppHeader";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <span aria-hidden className="text-6xl">🧭</span>
        <h1 className="text-3xl font-black">Off the map</h1>
        <p className="text-muted">That page doesn&apos;t exist. Let&apos;s get you back to the board.</p>
        <ButtonLink href="/">Back home</ButtonLink>
      </main>
    </>
  );
}
