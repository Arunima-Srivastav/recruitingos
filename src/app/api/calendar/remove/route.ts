import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import { removeEventFromCalendar } from "@/lib/calendar/sync";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source, id, kind } = body as {
      source?: "custom" | "recruiting";
      id?: string;
      kind?: "deadline" | "action";
    };

    if (!source || !id) {
      return NextResponse.json(
        { error: "source and id are required" },
        { status: 400 }
      );
    }

    if (source === "recruiting" && !kind) {
      return NextResponse.json(
        { error: "kind is required for pipeline events" },
        { status: 400 }
      );
    }

    await removeEventFromCalendar({
      source,
      id,
      kind,
    });

    return NextResponse.json({ removed: true });
  } catch (err) {
    return handleApiError(err, "Failed to remove from calendar");
  }
}
