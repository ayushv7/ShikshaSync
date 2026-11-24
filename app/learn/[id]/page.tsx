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
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading quiz...
        </div>
      }
    >
      <QuizLoader params={params} />
    </Suspense>
  );
}
