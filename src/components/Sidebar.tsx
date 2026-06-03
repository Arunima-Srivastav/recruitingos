"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: "⌂" },
  { href: "/intake", label: "Add Message", icon: "✉" },
  { href: "/gmail", label: "Gmail", icon: "📥" },
  { href: "/pipeline", label: "Pipeline", icon: "▦" },
  { href: "/today", label: "Today", icon: "◎" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white lg:block">
      <nav className="flex flex-col gap-1 p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === link.href
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
