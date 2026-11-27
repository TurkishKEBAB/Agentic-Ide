// Deliberately incomplete implementation for a development-pilot bug-fix task.
export function sum(values: readonly number[]): number {
  return values.length === 0 ? 0 : values[0];
}
