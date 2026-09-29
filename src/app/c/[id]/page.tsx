import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { ChallengeClient } from "@/components/ChallengeClient";

export const metadata: Metadata = {
  title: "Rush challenge",
  description: "A friend challenged you to the same 13 puzzles. Beat their score on Hexathlon.",
};

export default async function ChallengePage(props: PageProps<"/c/[id]">) {
  const { id } = await props.params;
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-4 pb-6">
        <ChallengeClient id={id} />
      </main>
    </>
  );
}
