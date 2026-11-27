import { ROOMS } from "./rooms";
import { matchesAll } from "./search";

type QuickNote = { id: string; title: string; space: string };
type HomeNote = { id: string; title: string; body: string };

/** Resolve old note spaces to their current rooms, including rooms hidden on this device. */
export function findQuickNotes(notes: QuickNote[], query: string) {
  if (!query.trim()) return [];
  return notes.flatMap((note) => {
    const room = ROOMS.find((r) => r.notes === note.space);
    return room && matchesAll(note.title, query) ? [{ note, room }] : [];
  });
}

export function findHomeNotes<T extends HomeNote>(notes: T[], query: string): T[] {
  return query.trim() ? notes.filter((note) => matchesAll(`${note.title} ${note.body}`, query)) : [];
}