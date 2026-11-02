import { getUser, getUserDetailed, listUsers } from "./admin";

export interface CachedUser {
  id: number;
  username?: string;
  full_name?: string;
  phone?: string | number;
  mobile_number?: string | number;
  wallet_balance?: number;
  is_active?: boolean;
}

const userCache = new Map<number, CachedUser>();
const inFlightRequests = new Map<number, Promise<CachedUser | null>>();
let bulkLoaded = false;
let bulkPromise: Promise<CachedUser[]> | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeUserCache(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notifyListeners() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // ignore listener errors
    }
  }
}

/**
 * Check if a candidate name is a raw ID (e.g. "12", 12, "User #12", null, undefined)
 */
export function isRawId(val: any): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim();
  if (s === "") return true;
  if (/^user\s*#?\s*\d*$/i.test(s)) return true;
  if (/^\d+$/.test(s)) return true; // pure digits like "12" or "45"
  return false;
}

/**
 * Prime user cache from already loaded arrays (e.g. from users list, bets, etc.)
 */
export function primeUserCache(users: CachedUser[] | any[]) {
  if (!Array.isArray(users)) return;
  let changed = false;
  for (const u of users) {
    if (u && (u.id || u.user_id)) {
      const id = Number(u.id || u.user_id);
      if (!isNaN(id)) {
        const existing = userCache.get(id);
        const username = !isRawId(u.username || u.user_name) ? (u.username || u.user_name) : existing?.username;
        const full_name = !isRawId(u.full_name) ? u.full_name : existing?.full_name;
        const phone = u.phone || u.mobile_number || existing?.phone;

        userCache.set(id, {
          id,
          username,
          full_name,
          phone,
          mobile_number: phone,
          wallet_balance: u.wallet_balance !== undefined ? u.wallet_balance : existing?.wallet_balance,
          is_active: u.is_active !== undefined ? u.is_active : existing?.is_active,
        });
        changed = true;
      }
    }
  }
  if (changed) {
    notifyListeners();
  }
}

/**
 * Prefetch all users into memory cache (background, non-blocking)
 */
export async function prefetchAllUsers(): Promise<CachedUser[]> {
  if (bulkLoaded && userCache.size > 0) {
    return Array.from(userCache.values());
  }
  if (bulkPromise) {
    return bulkPromise;
  }
  bulkPromise = (async () => {
    try {
      const data = await listUsers({ limit: 1000 });
      if (Array.isArray(data)) {
        primeUserCache(data);
        bulkLoaded = true;
      }
    } catch {
      // ignore silently
    } finally {
      bulkPromise = null;
    }
    return Array.from(userCache.values());
  })();
  return bulkPromise;
}

/**
 * Get user synchronously from memory cache if available
 */
export function getCachedUser(id: number | string | null | undefined): CachedUser | null {
  if (!id) return null;
  const num = Number(id);
  if (isNaN(num)) return null;
  return userCache.get(num) || null;
}

/**
 * Resolve user details asynchronously (with request deduplication)
 */
export async function resolveUser(id: number | string | null | undefined): Promise<CachedUser | null> {
  if (!id) return null;
  const num = Number(id);
  if (isNaN(num)) return null;

  const existing = userCache.get(num);
  if (existing && !isRawId(existing.full_name || existing.username)) {
    return existing;
  }

  // If bulk load hasn't finished, wait for it first
  if (!bulkLoaded) {
    await prefetchAllUsers();
    const loaded = userCache.get(num);
    if (loaded && !isRawId(loaded.full_name || loaded.username)) {
      return loaded;
    }
  }

  // Deduplicate inflight requests for the same user ID
  if (inFlightRequests.has(num)) {
    return inFlightRequests.get(num)!;
  }

  const p = (async () => {
    try {
      // Try detailed first, then fallback to standard getUser
      let u: any = null;
      try {
        u = await getUserDetailed(num);
      } catch {
        u = await getUser(num).catch(() => null);
      }

      if (u) {
        const username = !isRawId(u.username) ? u.username : undefined;
        const full_name = !isRawId(u.full_name) ? u.full_name : undefined;
        const phone = u.phone || u.mobile_number;

        const cached: CachedUser = {
          id: num,
          username,
          full_name,
          phone,
          mobile_number: phone,
          wallet_balance: u.wallet_balance,
          is_active: u.is_active,
        };
        userCache.set(num, cached);
        notifyListeners();
        return cached;
      }
    } catch {
      // ignore
    } finally {
      inFlightRequests.delete(num);
    }
    return userCache.get(num) || null;
  })();

  inFlightRequests.set(num, p);
  return p;
}
