"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AuthNavProps = {
  initialEmail: string | null;
};

export default function AuthNav({ initialEmail }: AuthNavProps) {
  const [email, setEmail] = useState<string | null>(initialEmail);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Sign in
      </Link>
    );
  }

  const initial = email.charAt(0).toUpperCase();

  return (
    <Link
      href="/account"
      className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      title={email}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
        {initial}
      </span>
      <span className="hidden max-w-[120px] truncate sm:inline">Account</span>
    </Link>
  );
}
