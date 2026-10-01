import client, { getToken, setToken, clearToken } from "./api";

export interface LoginResult {
  access_token: string;
  token_type: string;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await client.post<LoginResult>("/auth/login", { username, password });
  const token = res.data.access_token;
  // Admin panel must only accept tokens that carry the admin claim. A normal
  // mobile-app user logging in here must be rejected to avoid privilege
  // escalation into the admin console.
  if (!isAdminToken(token)) {
    clearToken();
    throw new Error("NOT_ADMIN");
  }
  setToken(token);
  return res.data;
}

export function logout() {
  clearToken();
}

export function isAuthenticated(): boolean {
  const token = getToken();
  return !!token && isAdminToken(token);
}

/** Decode (not verify — verification happens server-side) the JWT payload. */
export function decodeToken(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? atob(payload) : Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** True only if the token explicitly grants admin access. */
export function isAdminToken(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeToken(token);
  return !!payload && payload.admin === true;
}

/* ---------------- Admin: Stats ---------------- */

export async function getOverviewStats(dateFrom?: string, dateTo?: string) {
  const params: any = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const res = await client.get("/admin/stats/overview", { params });
  return res.data;
}

export async function getRevenueReport(period: string, dateFrom?: string, dateTo?: string) {
  const params: any = { period };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const res = await client.get("/admin/stats/revenue", { params });
  return res.data;
}

export async function getMarketSummaries() {
  const res = await client.get("/admin/stats/markets");
  return res.data;
}

export async function getTopBettors(limit = 10) {
  const res = await client.get("/admin/stats/top-bettors", { params: { limit } });
  return res.data;
}

export async function getUserGrowth(days = 30) {
  const res = await client.get("/admin/stats/user-growth", { params: { days } });
  return res.data;
}

export async function getDepositWithdrawalReport(period = "daily", days = 30) {
  const res = await client.get("/admin/stats/deposits-withdrawals", {
    params: { period, days },
  });
  return res.data;
}

export async function getWithdrawalCounts() {
  const res = await client.get("/admin/withdrawals/counts");
  return res.data;
}

export async function getDepositCounts() {
  const res = await client.get("/admin/deposits/counts");
  return res.data;
}

/* ---------------- Admin: Users ---------------- */

export async function listUsers(params: any = {}) {
  const res = await client.get("/admin/users", { params });
  return res.data;
}

export async function getUser(userId: number) {
  const res = await client.get(`/admin/users/${userId}`);
  return res.data;
}

export async function getUserDetailed(userId: number) {
  const res = await client.get(`/admin/users/${userId}/detailed`);
  return res.data;
}

export async function updateUser(userId: number, data: any) {
  const res = await client.put(`/admin/users/${userId}`, data);
  return res.data;
}

export async function toggleUserActive(userId: number) {
  const res = await client.put(`/admin/users/${userId}/toggle-active`);
  return res.data;
}

export async function addUserBonus(userId: number, amount: number, description: string) {
  const res = await client.post(
    `/admin/users/${userId}/bonus`,
    { user_id: userId, amount, description },
    { params: {} }
  );
  return res.data;
}

export async function deductUserFunds(userId: number, amount: number, description: string) {
  const res = await client.post(
    `/admin/users/${userId}/deduct`,
    { user_id: userId, amount, description },
    { params: {} }
  );
  return res.data;
}

export async function resetUserPassword(userId: number, newPassword: string) {
  const res = await client.put(`/admin/users/${userId}/reset-password`, {
    new_password: newPassword,
  });
  return res.data;
}

export async function deleteUser(userId: number) {
  const res = await client.delete(`/admin/users/${userId}`);
  return res.data;
}

export async function getUserContacts(userId: number) {
  const res = await client.get(`/admin/users/${userId}/contacts`);
  return res.data;
}

export async function getUserLocations(userId: number) {
  const res = await client.get(`/admin/users/${userId}/locations`);
  return res.data;
}

/* ---------------- Admin: Markets ---------------- */

export async function listMarkets(params: any = {}) {
  const res = await client.get("/admin/markets", { params });
  return res.data;
}

export async function softDeleteMarket(marketId: number) {
  const res = await client.delete(`/admin/markets/${marketId}`);
  return res.data;
}

export async function createMarket(data: any) {
  const res = await client.post("/admin/markets", data);
  return res.data;
}

export async function updateMarket(marketId: number, data: any) {
  const res = await client.put(`/admin/markets/${marketId}`, data);
  return res.data;
}

export async function reorderMarkets(markets: { id: number; sequence_number: number }[]) {
  const res = await client.post("/admin/markets/reorder", { markets });
  return res.data;
}

/* ---------------- Admin: Results ---------------- */

export async function listResults(params: any = {}) {
  const res = await client.get("/admin/results", { params });
  return res.data;
}

export async function previewResult(marketId: number) {
  const res = await client.get(`/admin/results/${marketId}/preview`);
  return res.data;
}

export async function bulkDeclareResults(results: any[]) {
  const res = await client.post("/admin/results/bulk-declare", { results });
  return res.data;
}

export async function deleteResult(resultId: number) {
  const res = await client.delete(`/admin/results/${resultId}`);
  return res.data;
}

/* ---------------- Admin: Withdrawals ---------------- */

export async function listWithdrawals(params: any = {}) {
  const res = await client.get("/admin/withdrawals", { params });
  return res.data;
}

export async function processWithdrawal(requestId: number, action: string) {
  const res = await client.post(`/admin/withdrawals/${requestId}/${action}`, {});
  return res.data;
}

export async function bulkApproveWithdrawals(requestIds: number[]) {
  const res = await client.post("/admin/withdrawals/bulk-approve", {
    request_ids: requestIds,
  });
  return res.data;
}

/* ---------------- Admin: Deposits ---------------- */

export async function listDeposits(params: any = {}) {
  const res = await client.get("/admin/deposits", { params });
  return res.data;
}

/* ---------------- Admin: Bids ---------------- */

export async function listBids(params: any = {}) {
  const res = await client.get("/admin/bids", { params });
  return res.data;
}

export async function getBidsSummary(params: any = {}) {
  const res = await client.get("/admin/bids/summary", { params });
  return res.data;
}

/* ---------------- Admin: Audit Logs ---------------- */

export async function getAuditLogs(params: any = {}) {
  const res = await client.get("/admin/audit-logs", { params });
  return res.data;
}

/* ---------------- Admin: Settings ---------------- */

export async function getSettings() {
  const res = await client.get("/admin/settings");
  return res.data;
}

export async function updateSetting(key: string, value: string, description?: string) {
  const params: any = { value };
  if (description !== undefined) params.description = description;
  const res = await client.put(`/admin/settings/${key}`, null, { params });
  return res.data;
}

/* ---------------- Admin: Jackpot ---------------- */

export async function listJackpotMarkets(params: any = {}) {
  const res = await client.get("/admin/jackpot/markets", { params });
  return res.data;
}

export async function createJackpotMarket(data: any) {
  const res = await client.post("/admin/jackpot/markets", data);
  return res.data;
}

export async function updateJackpotMarket(marketId: number, data: any) {
  const res = await client.put(`/admin/jackpot/markets/${marketId}`, data);
  return res.data;
}

export async function softDeleteJackpotMarket(marketId: number) {
  const res = await client.delete(`/admin/jackpot/markets/${marketId}`);
  return res.data;
}

export async function reorderJackpotMarkets(markets: { id: number; sequence_number: number }[]) {
  const res = await client.post("/admin/jackpot/markets/reorder", { markets });
  return res.data;
}

/* ---------------- Admin: Jackpot: Results ---------------- */

export async function listJackpotResults(params: any = {}) {
  const res = await client.get("/admin/jackpot/results", { params });
  return res.data;
}

export async function previewJackpotResult(marketId: number) {
  const res = await client.get(`/admin/jackpot/results/${marketId}/preview`);
  return res.data;
}

export async function bulkDeclareJackpotResults(results: any[]) {
  const res = await client.post("/admin/jackpot/results/bulk-declare", { results });
  return res.data;
}

export async function deleteJackpotResult(resultId: number) {
  const res = await client.delete(`/admin/jackpot/results/${resultId}`);
  return res.data;
}

/* ---------------- Admin: Notifications ---------------- */

export async function broadcastNotification(title: string, message: string) {
  const res = await client.post("/admin/notifications/broadcast", null, {
    params: { title, message },
  });
  return res.data;
}

export async function sendUserNotification(userId: number, title: string, message: string) {
  const res = await client.post("/admin/notifications/send", null, {
    params: { user_id: userId, title, message },
  });
  return res.data;
}

/* ---------------- Admin: Game Rates ---------------- */
export async function getGameRates(marketId?: number) {
  const params: any = {};
  if (marketId !== undefined) params.market_id = marketId;
  const res = await client.get("/admin/game-rates", { params });
  return res.data;
}

export async function updateGameRates(payload: any) {
  const res = await client.post("/admin/game-rates", payload);
  return res.data;
}

/* ---------------- Admin: Rollback / Cancel ---------------- */
export async function cancelBet(id: number) {
  const res = await client.post(`/admin/bids/${id}/cancel`, {});
  return res.data;
}

export async function cancelStarlineBet(id: number) {
  const res = await client.post(`/admin/starline/bids/${id}/cancel`, {});
  return res.data;
}

export async function rollbackResult(id: number) {
  const res = await client.post(`/admin/results/${id}/rollback`, {});
  return res.data;
}

/* ---------------- Admin: Starline ---------------- */
export async function listStarlineMarkets(params: any = {}) {
  const res = await client.get("/admin/starline/markets", { params });
  return res.data;
}

export async function createStarlineMarket(data: any) {
  const res = await client.post("/admin/starline/markets", data);
  return res.data;
}

export async function updateStarlineMarket(marketId: number, data: any) {
  const res = await client.put(`/admin/starline/markets/${marketId}`, data);
  return res.data;
}

export async function softDeleteStarlineMarket(marketId: number) {
  const res = await client.delete(`/admin/starline/markets/${marketId}`);
  return res.data;
}

export async function reorderStarlineMarkets(markets: { id: number; sequence_number: number }[]) {
  const res = await client.post("/admin/starline/markets/reorder", { markets });
  return res.data;
}

export async function listStarlineBids(params: any = {}) {
  const res = await client.get("/admin/starline/bids", { params });
  return res.data;
}

export async function getStarlineBidsSummary(params: any = {}) {
  const res = await client.get("/admin/starline/bids/summary", { params });
  return res.data;
}

export async function listStarlineResults(params: any = {}) {
  const res = await client.get("/admin/starline/results", { params });
  return res.data;
}

export async function bulkDeclareStarlineResults(results: any[]) {
  const res = await client.post("/admin/starline/results/bulk-declare", { results });
  return res.data;
}

export async function deleteStarlineResult(resultId: number) {
  const res = await client.delete(`/admin/starline/results/${resultId}`);
  return res.data;
}

/* ---------------- Admin: Support Chat ---------------- */

export async function getSupportStats() {
  const res = await client.get("/admin/support/stats");
  return res.data;
}

export async function listSupportConversations(params: any = {}) {
  const res = await client.get("/admin/support/conversations", { params });
  return res.data;
}

export async function getSupportConversation(conversationId: number) {
  const res = await client.get(`/admin/support/conversations/${conversationId}`);
  return res.data;
}

export async function sendSupportMessage(
  conversationId: number,
  message: string,
  file?: File | null
) {
  const form = new FormData();
  if (message) form.append("message", message);
  if (file) form.append("file", file);
  const res = await client.post(
    `/admin/support/conversations/${conversationId}/messages`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data;
}

export async function setSupportStatus(conversationId: number, status: string) {
  const res = await client.put(
    `/admin/support/conversations/${conversationId}/status`,
    { status }
  );
  return res.data;
}
