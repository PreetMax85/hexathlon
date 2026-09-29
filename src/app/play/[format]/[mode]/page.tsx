import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FORMATS, isFormat, isMode, MODES } from "@/engine";
import { AppHeader } from "@/components/AppHeader";
import { GameRun } from "@/components/GameRun";
import { FORMAT_META } from "@/game/meta";

export function generateStaticParams() {
  return FORMATS.flatMap((format) => MODES.map((mode) => ({ format, mode })));
}

export async function generateMetadata(props: PageProps<"/play/[format]/[mode]">): Promise<Metadata> {
  const { format, mode } = await props.params;
  if (!isFormat(format) || !isMode(mode)) return {};
  const title = `${FORMAT_META[format].name} ${mode === "rush" ? "Rush" : "Daily"}`;
  return { title, description: FORMAT_META[format].tagline };
}

export default async function PlayPage(props: PageProps<"/play/[format]/[mode]">) {
  const { format, mode } = await props.params;
  if (!isFormat(format) || !isMode(mode)) notFound();
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-4 pb-6">
        <GameRun format={format} mode={mode} />
      </main>
    </>
  );
}
