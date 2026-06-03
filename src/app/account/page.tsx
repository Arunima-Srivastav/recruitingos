import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Account</h1>
      <p className="mt-2 text-sm text-slate-600">
        Manage your Recruiting OS sign-in and connected services.
      </p>

      <div className="mt-8 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Signed in as
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {user?.email ?? "Unknown"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-6">
          <Link
            href="/gmail"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Gmail connection
          </Link>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
