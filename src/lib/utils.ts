import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AdminAgentMessage } from "@/app/api/chat/model";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function strToHexStr(str: string): string {
  return new TextEncoder().encode(str)
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')
}

export function getShowResponsePayload(message: AdminAgentMessage) {
  return message.parts
    .find((part) => part.type === "tool-showResponse")
    ?.input;
}