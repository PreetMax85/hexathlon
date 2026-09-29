import { AppHeader } from "@/components/AppHeader";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16">
        <h1 className="text-l font-extrabold uppercase wide">Off the chart</h1>
        <p>That page isn&apos;t on this chart. Today&apos;s island is a tap away.</p>
        <ButtonLink href="/" className="w-fit">Back to today&apos;s chart</ButtonLink>
      </main>
    </>
  );
}
