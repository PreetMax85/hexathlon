const FORMATS = [
  { name: "Pip Flash", blurb: "Spot the vertex with the most pips before the clock runs out." },
  { name: "Port Math", blurb: "Reach the build in the fewest maritime trades." },
  { name: "Hand Tracker", blurb: "Follow the game log and count your rival's cards." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Hexathlon</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Short, competitive drills for hex-board trading games. Coming soon.
        </p>
      </header>
      <ul className="flex flex-col gap-3">
        {FORMATS.map((f) => (
          <li
            key={f.name}
            className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold">{f.name}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{f.blurb}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
