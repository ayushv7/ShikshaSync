import { Suspense } from "react";
import { students } from "@/lib/data";
import QuizClient from "./QuizClient";

export function generateStaticParams() {
  return students.map((student) => ({ id: student.id }));
}

async function QuizLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuizClient studentId={id} />;
}

export default function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">
          Loading practice sheet...
        </div>
      }
    >
      <QuizLoader params={params} />
    </Suspense>
  );
}
