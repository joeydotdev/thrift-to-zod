export function uniq<T extends string | number | symbol>(arr: T[]): T[] {
  return [...new Set(arr)]
}