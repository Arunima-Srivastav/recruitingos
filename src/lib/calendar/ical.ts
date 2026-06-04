import type { RecruitingCalendarEvent } from "./types";

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");
}

function formatIcsDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatEventLines(event: RecruitingCalendarEvent): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.start)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(event.end)}`);
  } else {
    lines.push(`DTSTART:${formatIcsUtc(event.start)}`);
    lines.push(`DTEND:${formatIcsUtc(event.end)}`);
  }

  lines.push("END:VEVENT");
  return lines;
}

export function generateIcs(
  events: RecruitingCalendarEvent[],
  calendarName = "Recruiting OS"
): string {
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Recruiting OS//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    ...events.flatMap(formatEventLines),
    "END:VCALENDAR",
  ];

  return `${body.join("\r\n")}\r\n`;
}
