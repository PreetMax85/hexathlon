import { AppHeader } from "@/components/AppHeader";
import { FormatCard } from "@/components/FormatCard";
import { IslandPlate, ThumbAction, TodayStrip } from "@/components/TodayStrip";
import { FORMATS } from "@/engine";

export default function Home() {
  return (
    <>
      <AppHeader wide />
      <main className="mx-auto grid w-full max-w-xl flex-1 gap-6 px-4 pt-4 lg:max-w-6xl lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-12 lg:pt-8 lg:pb-10">
        <div className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          <h1 className="sr-only">Hexathlon: skill drills for hex trading games</h1>
          <IslandPlate />
        </div>
        <div className="flex flex-col gap-7">
          <TodayStrip />
          <ThumbAction />
          <section aria-labelledby="directions-title" className="flex flex-col">
            <div className="border-b border-ink pb-2">
              <h2 id="directions-title" className="sea text-l">The drills</h2>
              <p className="text-s text-ink-2">Three drills, one skill each. Every puzzle comes from a seed, so everyone sees the same board.</p>
            </div>
            <ul>
              {FORMATS.map((f) => (
                <FormatCard key={f} format={f} />
              ))}
            </ul>
          </section>
          <p className="pb-6 text-s text-ink-2">No login. A nickname is asked only when you first put a score on a board.</p>
        </div>
      </main>
    </>
  );
}
