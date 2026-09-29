import { AppHeader } from "@/components/AppHeader";
import { FormatCard } from "@/components/FormatCard";
import { HomeNickname } from "@/components/HomeNickname";
import { FORMATS } from "@/engine";

export default function Home() {
  return (
    <>
      <AppHeader wide />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pt-6 pb-10 lg:max-w-6xl lg:gap-8 lg:pt-12">
        <section className="lg:max-w-2xl">
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Sharpen your board&nbsp;sense.
          </h1>
          <p className="mt-2 text-base text-muted">
            Short puzzle drills for hex-board trading games. A Daily puzzle for everyone, and Rush runs you can send to friends.
          </p>
        </section>
        <ul className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
          {FORMATS.map((f) => (
            <FormatCard key={f} format={f} />
          ))}
        </ul>
        <p className="text-center text-xs text-muted">
          No login. Every puzzle is generated from a seed, so everyone sees the same board.
        </p>
      </main>
      <HomeNickname />
    </>
  );
}
