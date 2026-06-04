import { NextResponse } from "next/server";
import { listDiscoverSources } from "@/lib/discover/sources";

export async function GET() {
  return NextResponse.json({ sources: listDiscoverSources() });
}
