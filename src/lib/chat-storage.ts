
import type { Conversation } from "@/types/chat";

const STORAGE_KEY = "ai-chat-conversations";

export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return stored
      ? (JSON.parse(stored) as Conversation[])
      : [];
  } catch {
    return [];
  }
}

export function saveConversations(
  conversations: Conversation[]
): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(conversations)
  );
}

export function generateTitle(message: string): string {
  const cleaned = message.trim().replace(/\s+/g, " ");

  if (cleaned.length <= 35) return cleaned;

  return `${cleaned.slice(0, 35)}...`;
}
