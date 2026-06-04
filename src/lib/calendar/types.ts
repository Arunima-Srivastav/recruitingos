export type CalendarEventKind = "deadline" | "action";

export type CalendarEventSource = "recruiting" | "google" | "custom";

export interface RecruitingCalendarEvent {
  uid: string;
  kind: CalendarEventKind;
  title: string;
  description: string;
  start: Date;
  end: Date;
  allDay: boolean;
  opportunityId: string | null;
  sourceId: string;
}

export interface DisplayCalendarEvent {
  id: string;
  source: CalendarEventSource;
  kind?: CalendarEventKind;
  sourceId?: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  opportunityId?: string | null;
  googleEventId?: string;
  googleHtmlLink?: string;
  syncedToGoogle?: boolean;
  canDelete?: boolean;
  canRemoveFromCalendar?: boolean;
  canImportToPipeline?: boolean;
  importedToPipeline?: boolean;
}

export interface CalendarEventLink {
  id: string;
  user_id: string;
  source_kind: CalendarEventKind;
  source_id: string;
  google_event_id: string;
  google_calendar_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserCalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  opportunity_id: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  created_at: string;
  updated_at: string;
}
