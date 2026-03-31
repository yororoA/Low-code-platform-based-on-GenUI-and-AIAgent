export function strToHexStr(str: string): string {
  return new TextEncoder().encode(str)
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')
}