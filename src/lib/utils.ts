import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function strToHexStr(str: string): string {
  return new TextEncoder().encode(str)
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')
}