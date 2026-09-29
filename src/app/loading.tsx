export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pt-16" aria-busy="true" aria-label="Loading">
      <p className="sea text-ink-2">Loading the chart…</p>
      <div className="hatch aspect-square w-full border border-hair" />
      <div className="hatch h-24 border-y border-hair" />
    </main>
  );
}
