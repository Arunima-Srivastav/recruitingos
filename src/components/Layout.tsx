import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { getCurrentUser } from "@/lib/auth/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar userEmail={user?.email ?? null} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
