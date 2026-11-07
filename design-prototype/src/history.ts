import { diffArrays } from 'diff';
import type { Change } from './plan.ts';
import type { Files } from './project.ts';
import type { TaskRequest } from './state.ts';

export const milestoneLabels = {
  cancelled: 'İptal edildi', request: 'İstek', plan: 'Plan', controls: 'Kontroller',
  decision: 'Karar', applied: 'Uygulandı', reverted: 'Geri alındı',
} as const;
export type Milestone = keyof typeof milestoneLabels;

export interface HistoryFrame {
  stage: Milestone;
  time: number;
  revision?: number;
  detail: string;
  files: Readonly<Files>;
}

export interface ChangeSet {
  id: string;
  request: TaskRequest;
  frames: HistoryFrame[];
  example?: boolean;
  applied?: { changes: Change[]; time: number };
  reverted?: number;
}

interface LineEdit { start: number; end: number; lines: string[]; }

export interface UndoConflict {
  path: string;
  line: number;
  expected: string[];
  current: string[];
}

export type UndoResult = { status: 'unavailable' } | { status: 'reverted' } | { status: 'conflict'; conflicts: UndoConflict[] };

function edits(base: string[], target: string[]): LineEdit[] {
  const result: LineEdit[] = [];
  let cursor = 0;
  let active: LineEdit | undefined;
  for (const part of diffArrays(base, target)) {
    if (!part.added && !part.removed) {
      cursor += part.value.length;
      active = undefined;
      continue;
    }
    if (!active) {
      active = { start: cursor, end: cursor, lines: [] };
      result.push(active);
    }
    if (part.removed) {
      cursor += part.value.length;
      active.end = cursor;
    } else {
      active.lines.push(...part.value);
    }
  }
  return result;
}

function overlaps(a: LineEdit, b: LineEdit): boolean {
  if (a.start === a.end && b.start === b.end) return a.start === b.start;
  return a.start < b.end && b.start < a.end;
}

function equal(a: LineEdit, b: LineEdit): boolean {
  return a.start === b.start && a.end === b.end && a.lines.length === b.lines.length
    && a.lines.every((line, index) => line === b.lines[index]);
}

export function reverseChange(change: Change, current: string | undefined): { text: string } | { conflict: UndoConflict } {
  if (current === undefined) return { conflict: { path: change.path, line: 1, expected: [], current: [] } };
  if (current === change.after) return { text: change.before };
  if (current === change.before) return { text: current };
  const base = change.after.split('\n');
  const inverse = edits(base, change.before.split('\n'));
  const later = edits(base, current.split('\n'));
  const merged = [...later];
  for (const edit of inverse) {
    if (later.some(local => equal(edit, local))) continue;
    const conflict = later.find(local => overlaps(edit, local));
    if (conflict) return { conflict: {
      path: change.path,
      line: Math.min(edit.start, conflict.start) + 1,
      expected: base.slice(edit.start, edit.end),
      current: conflict.lines,
    } };
    merged.push(edit);
  }
  merged.sort((a, b) => a.start - b.start || a.end - b.end);
  const result: string[] = [];
  let cursor = 0;
  for (const edit of merged) {
    result.push(...base.slice(cursor, edit.start), ...edit.lines);
    cursor = edit.end;
  }
  result.push(...base.slice(cursor));
  return { text: result.join('\n') };
}
