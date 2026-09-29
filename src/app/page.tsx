import { AppHeader } from "@/components/AppHeader";
import { IslandPlate, ThumbAction, TodayStrip } from "@/components/TodayStrip";

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
          <p className="pb-6 text-s text-ink-2">No login. A nickname is asked only when you first put a score on a board.</p>
        </div>
      </main>
    </>
  );
}
