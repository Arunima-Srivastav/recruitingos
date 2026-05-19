import Link from "next/link";
import StatCard from "@/components/StatCard";
import LoadDemoButton from "@/components/LoadDemoButton";
import {
  countOpportunities,
  countPendingActions,
  getOpportunities,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let opportunityCount = 0;
  let pendingActionCount = 0;
  let needsReplyCount = 0;
  let dbError: string | null = null;

  try {
    opportunityCount = await countOpportunities();
    pendingActionCount = await countPendingActions();
    const opps = await getOpportunities();
    needsReplyCount = opps.filter((o) => o.stage === "Needs Reply").length;
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "Could not connect to Supabase. Check your environment variables.";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Recruiting OS
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Turn scattered recruiting messages into a structured opportunity
          pipeline.
        </p>
        <p className="mt-4 max-w-2xl text-slate-600">
          Recruiting OS ingests recruiter emails, LinkedIn messages, job posts,
          and scheduling notes, then extracts structured opportunities, classifies
          your pipeline stage, and tells you what to do today.
        </p>
      </div>

      {dbError && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dbError}
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Opportunities" value={opportunityCount} />
        <StatCard label="Pending actions" value={pendingActionCount} />
        <StatCard label="Needs reply" value={needsReplyCount} />
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/intake"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add Message
        </Link>
        <Link
          href="/pipeline"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View Pipeline
        </Link>
        <Link
          href="/today"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Today
        </Link>
        <LoadDemoButton />
      </div>

      <h2 className="mb-4 text-lg font-semibold text-slate-900">How it works</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            title: "Manual intake",
            desc: "Paste recruiter emails, LinkedIn DMs, or job posts in one place.",
          },
          {
            title: "Structured extraction",
            desc: "Extract company, role, stage, deadlines, and next actions automatically.",
          },
          {
            title: "Pipeline tracking",
            desc: "See every opportunity on a recruiting board from New to Offer.",
          },
          {
            title: "Today prioritization",
            desc: "Get a ranked list of what matters most right now.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
