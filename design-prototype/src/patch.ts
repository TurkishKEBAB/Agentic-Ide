import { diffArrays } from 'diff';

export function textLines(text: string): string[] {
  return text === '' ? [] : text.replace(/\n$/, '').split('\n');
}

export function diffLines(before: string, after: string) {
  return diffArrays(textLines(before), textLines(after));
}

export function patchCounts(before: string, after: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const part of diffLines(before, after)) {
    if (part.added) added += part.value.length;
    if (part.removed) removed += part.value.length;
  }
  return { added, removed };
}
