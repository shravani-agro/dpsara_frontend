export interface User {
  id: number;
  username: string;
  email?: string | null;
  phone: string;
  full_name?: string | null;
  wallet_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface Market {
  id: number;
  name: string;
  open_time: string;
  close_time: string;
  status: string;
  is_active: boolean;
}

export interface WithdrawalRequest {
  id: number;
  user_id: number;
  amount: number;
  bank_details: string;
  status: string;
  requested_at: string;
  processed_at?: string | null;
}

export interface DepositRequest {
  id: number;
  user_id: number;
  txn_id: string;
  amount: number;
  method: string;
  status: string;
  upi_intent?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Bid {
  id: number;
  user_id: number;
  username?: string | null;
  phone?: string | null;
  mobile_number?: string | null;
  market_id: number;
  market_name: string;
  bet_type: string;
  selected_number: string;
  amount: number;
  potential_win: number;
  status: string;
  session?: string | null;
  bid_date?: string | null;
  placed_at?: string;
  created_at?: string;
}

export interface AdminActionLog {
  id: number;
  admin_id: number;
  action_type: string;
  endpoint?: string | null;
  request_data?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface OverviewStats {
  total_users?: number;
  active_users_24h?: number;
  total_bets_today?: number;
  total_revenue?: number;
  total_deposits?: number;
  total_withdrawals?: number;
  pending_withdrawals?: number;
  [key: string]: any;
}

export interface RevenueReport {
  period: string;
  amount: number;
  count: number;
}

export interface MarketSummary {
  market_id: number;
  market_name: string;
  total_bets: number;
  total_stakes: number;
  total_payouts: number;
  net_pl: number;
}

export interface TopBettor {
  user_id: number;
  username: string;
  total_wagered: number;
  total_won: number;
  net_pl: number;
}

export interface UserGrowth {
  date: string;
  count: number;
}

export interface UserDetailed {
  id: number;
  username: string;
  email?: string | null;
  phone: string;
  full_name?: string | null;
  wallet_balance: number;
  is_active: boolean;
  created_at: string;
  total_bets: number;
  total_deposits: number;
  total_withdrawals: number;
  total_wins: number;
}
