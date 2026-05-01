import type { ConversationMessage } from "./planner";

type Session = { messages: ConversationMessage[]; lastAccess: number };

const store = new Map<string, Session>();

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [key, s] of store) {
    if (s.lastAccess < cutoff) store.delete(key);
  }
}, 10 * 60 * 1000);

export function getSession(key: string): Session {
  return store.get(key) ?? { messages: [], lastAccess: 0 };
}

export function setSession(key: string, session: Session): void {
  store.set(key, session);
}

export function deleteSession(key: string): void {
  store.delete(key);
}
