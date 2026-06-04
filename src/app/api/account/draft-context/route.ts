import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import { getUserDraftContext, upsertUserDraftContext } from "@/lib/db";
import {
  MAX_HIGHLIGHTS_TEXT_LENGTH,
  MAX_RESUME_TEXT_LENGTH,
  trimDraftContextField,
} from "@/lib/draftContext";

export async function GET() {
  try {
    const context = await getUserDraftContext();
    return NextResponse.json({ context });
  } catch (err) {
    return handleApiError(err, "Failed to load draft context");
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { resume_text, highlights_text, resume_filename } = body as {
      resume_text?: string | null;
      highlights_text?: string | null;
      resume_filename?: string | null;
    };

    const context = await upsertUserDraftContext({
      resume_text: trimDraftContextField(resume_text, MAX_RESUME_TEXT_LENGTH),
      highlights_text: trimDraftContextField(
        highlights_text,
        MAX_HIGHLIGHTS_TEXT_LENGTH
      ),
      resume_filename:
        typeof resume_filename === "string" && resume_filename.trim()
          ? resume_filename.trim().slice(0, 255)
          : null,
    });

    return NextResponse.json({ context });
  } catch (err) {
    return handleApiError(err, "Failed to save draft context");
  }
}
