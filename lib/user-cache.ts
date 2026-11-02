import { getUser, listUsers } from "./admin";

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
let bulkPromise: Promise<void> | null = null;

/**
 * Prime user cache from already loaded arrays (e.g. from users list, bets, etc.)
 */
export function primeUserCache(users: CachedUser[] | any[]) {
  if (!Array.isArray(users)) return;
  for (const u of users) {
    if (u && (u.id || u.user_id)) {
      const id = Number(u.id || u.user_id);
      if (!isNaN(id)) {
        const existing = userCache.get(id);
        userCache.set(id, {
          id,
          username: u.username || u.user_name || existing?.username,
          full_name: u.full_name || existing?.full_name,
          phone: u.phone || u.mobile_number || existing?.phone,
          mobile_number: u.mobile_number || u.phone || existing?.mobile_number,
          wallet_balance: u.wallet_balance !== undefined ? u.wallet_balance : existing?.wallet_balance,
          is_active: u.is_active !== undefined ? u.is_active : existing?.is_active,
        });
      }
    }
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
    await bulkPromise;
    return Array.from(userCache.values());
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
  })();
  await bulkPromise;
  return Array.from(userCache.values());
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
  if (existing && (existing.full_name || existing.username)) {
    return existing;
  }

  // Deduplicate inflight requests for the same user ID
  if (inFlightRequests.has(num)) {
    return inFlightRequests.get(num)!;
  }

  const p = (async () => {
    try {
      const u = await getUser(num);
      if (u) {
        const cached: CachedUser = {
          id: num,
          username: u.username,
          full_name: u.full_name,
          phone: u.phone || u.mobile_number,
          mobile_number: u.mobile_number || u.phone,
          wallet_balance: u.wallet_balance,
          is_active: u.is_active,
        };
        userCache.set(num, cached);
        return cached;
      }
    } catch {
      // ignore
    } finally {
      inFlightRequests.delete(num);
    }
    return existing || null;
  })();

  inFlightRequests.set(num, p);
  return p;
}
