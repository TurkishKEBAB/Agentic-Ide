export function isEven(value: number): boolean {
  return Number.isInteger(value) && value % 2 === 0;
}
