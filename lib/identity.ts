// localStorage persistence so a reload never kicks anyone out of the game.

export type PlayerIdentity = { playerId: string; teamId: string; name: string };

const safe = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  },
};

export function getHostToken(code: string): string | null {
  return safe.get(`jeopardy:host:${code.toUpperCase()}`);
}

export function setHostToken(code: string, token: string) {
  safe.set(`jeopardy:host:${code.toUpperCase()}`, token);
}

export function getPlayerIdentity(code: string): PlayerIdentity | null {
  const raw = safe.get(`jeopardy:player:${code.toUpperCase()}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerIdentity;
  } catch {
    return null;
  }
}

export function setPlayerIdentity(code: string, identity: PlayerIdentity) {
  safe.set(`jeopardy:player:${code.toUpperCase()}`, JSON.stringify(identity));
}
