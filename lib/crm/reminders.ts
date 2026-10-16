/**
 * When a planned activity's reminders are due.
 *
 * Pure date arithmetic, kept out of the cron route so it can be tested. Every
 * bug this code can have is a bug nobody notices: a reminder that fires twice
 * is annoying, one that never fires is invisible, and one that fires three
 * hours late for a "15 minutes before" is worse than silence because the
 * recipient now distrusts all of them.
 */

/** Lead times offered in the UI, in minutes before the start. */
export const REMINDER_PRESETS: Array<{ minutes: number; label: string; timedOnly?: boolean }> = [
  { minutes: 10080, label: '1 week before' },
  { minutes: 2880, label: '2 days before' },
  { minutes: 1440, label: '1 day before' },
  { minutes: 240, label: '4 hours before', timedOnly: true },
  { minutes: 60, label: '1 hour before', timedOnly: true },
  { minutes: 30, label: '30 minutes before', timedOnly: true },
  { minutes: 15, label: '15 minutes before', timedOnly: true },
  { minutes: 0, label: 'At the start time', timedOnly: true },
];

export const MAX_REMINDERS_PER_EVENT = 5;
/** Minutes in a day, named because it appears in every conversion below. */
export const DAY_MINUTES = 1440;

/**
 * An all-day activity is reminded against this hour, not midnight.
 *
 * "1 day before" on an all-day event otherwise means 00:00 the previous day —
 * a notification that lands in the middle of the night before the night
 * before. 9am local is when somebody would actually read it.
 */
export const ALL_DAY_ANCHOR_HOUR = 9;

/**
 * How late a reminder may still be delivered.
 *
 * The cron runs on an interval, so a reminder is always a little late; that is
 * fine. What is not fine is a "15 minutes before" arriving after the event has
 * started because the job was down for an hour — by then it is misinformation.
 * Past this window the offset is marked delivered without being sent.
 */
export const LATE_GRACE_MINUTES = 120;

export interface ReminderEvent {
  date: Date;
  allDay: boolean;
  remindOffsets: number[];
  remindersSent: number[];
}

export interface DueReminder {
  offset: number;
  /** When this reminder was supposed to go out. */
  dueAt: Date;
  /** True when it is past the grace window — record it, do not send it. */
  stale: boolean;
}

/** The moment an activity actually starts, for reminder purposes. */
export function anchorFor(event: { date: Date; allDay: boolean }): Date {
  if (!event.allDay) return event.date;
  const d = new Date(event.date);
  d.setHours(ALL_DAY_ANCHOR_HOUR, 0, 0, 0);
  return d;
}

/**
 * Which of an event's reminders should go out now.
 *
 * Returns them oldest-first, so a backlog is delivered in the order the
 * recipient would have received it.
 */
export function dueReminders(event: ReminderEvent, now: Date = new Date()): DueReminder[] {
  const anchor = anchorFor(event);
  const sent = new Set(event.remindersSent);

  return event.remindOffsets
    .filter((offset) => !sent.has(offset))
    .map((offset) => {
      const dueAt = new Date(anchor.getTime() - offset * 60_000);
      return {
        offset,
        dueAt,
        stale: now.getTime() - dueAt.getTime() > LATE_GRACE_MINUTES * 60_000,
      };
    })
    .filter((r) => r.dueAt.getTime() <= now.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

/**
 * Clean a client-supplied list of lead times.
 *
 * Duplicates would deliver the same reminder twice; a negative offset would
 * schedule one *after* the event; an unbounded list is a way to send somebody
 * fifty notifications. Sorted furthest-out first, which is the order they fire.
 */
export function normaliseOffsets(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const clean = raw
    .map((v) => (typeof v === 'number' ? Math.floor(v) : NaN))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 365 * DAY_MINUTES);
  return [...new Set(clean)].sort((a, b) => b - a).slice(0, MAX_REMINDERS_PER_EVENT);
}

/** "2 days before", "1 hour before", "At the start" — for the notification body. */
export function describeOffset(minutes: number): string {
  if (minutes === 0) return 'starting now';
  if (minutes % DAY_MINUTES === 0) {
    const days = minutes / DAY_MINUTES;
    if (days === 7) return 'in a week';
    return days === 1 ? 'tomorrow' : `in ${days} days`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? 'in an hour' : `in ${hours} hours`;
  }
  return `in ${minutes} minutes`;
}
