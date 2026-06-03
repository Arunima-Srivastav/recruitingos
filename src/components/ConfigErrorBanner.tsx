import Link from "next/link";

export default function ConfigErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">Setup required</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2 text-amber-800">
        See{" "}
        <Link href="/" className="font-medium underline hover:text-amber-950">
          README setup steps
        </Link>{" "}
        in the repo for Supabase configuration and schema setup.
      </p>
    </div>
  );
}
