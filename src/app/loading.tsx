export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pt-20" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-40 animate-pulse rounded-3xl bg-surface-2" />
      <div className="h-40 animate-pulse rounded-3xl bg-surface-2" />
    </main>
  );
}
