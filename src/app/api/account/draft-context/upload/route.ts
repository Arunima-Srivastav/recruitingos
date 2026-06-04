import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import {
  MAX_RESUME_UPLOAD_BYTES,
  isAllowedResumeFilename,
  parseResumeBuffer,
} from "@/lib/resume/parseResumeFile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!isAllowedResumeFilename(file.name)) {
      return NextResponse.json(
        { error: "Upload a .pdf, .txt, or .md file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_RESUME_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is too large (max 2 MB)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parseResumeBuffer(buffer, file.name);

    return NextResponse.json({
      text,
      filename: file.name,
      character_count: text.length,
    });
  } catch (err) {
    return handleApiError(err, "Failed to parse resume file");
  }
}
