// localStorage persistence so a reload never kicks anyone out of a live game.
//
// Key stability contract: the "buzzer:" prefix predates the LockIn rebrand and
// is kept on purpose. Changing these key formats invalidates every stored host
// token and player identity, which ends all in-progress games. Do not rename.

export type PlayerIdentity = { playerId: string; teamId: string; name: string };

// localStorage throws in some private-browsing modes; degrade to "not stored".
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
  return safe.get(`buzzer:host:${code.toUpperCase()}`);
}

export function setHostToken(code: string, token: string) {
  safe.set(`buzzer:host:${code.toUpperCase()}`, token);
}

export function getPlayerIdentity(code: string): PlayerIdentity | null {
  const raw = safe.get(`buzzer:player:${code.toUpperCase()}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerIdentity;
  } catch {
    return null;
  }
}

export function setPlayerIdentity(code: string, identity: PlayerIdentity) {
  safe.set(`buzzer:player:${code.toUpperCase()}`, JSON.stringify(identity));
}
