// Kysely table interface definitions
// All timestamps are Unix epoch seconds (integer)
// All money is stored as integer cents

export interface UsersTable {
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  started_at: number;
  language: string | null;
  nickname: string | null;
  mode: string | null;
  active_household_id: string | null;
  last_seen_version: string | null;
}

export interface HouseholdsTable {
  id: string;
  name: string;
  owner_telegram_id: number;
  join_code: string;
  currency_default: string;
  created_at: number;
}

export interface HouseholdMembersTable {
  household_id: string;
  telegram_id: number;
  role: 'OWNER' | 'MEMBER';
  status: 'ACTIVE' | 'KICKED';
  joined_at: number;
}

export interface JoinRequestsTable {
  id: string;
  household_id: string;
  requester_telegram_id: number;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  created_at: number;
  decided_at: number | null;
  decided_by: number | null;
}

export interface ItemsTable {
  id: string;
  household_id: string;
  name: string;
  created_by_telegram_id: number;
  created_at: number;
  is_active: number;
}

export interface ItemUsageLogTable {
  id: string;
  item_id: string;
  user_telegram_id: number;
  quantity: number;
  logged_at: number;
}

export interface TransactionsTable {
  id: string;
  household_id: string;
  actor_telegram_id: number;
  type: 'EXPENSE' | 'PAYMENT' | 'DEBT_LOG';
  description: string;
  currency: string;
  amount_cents_total: number;
  payload_json: string;
  proof_file_id: string;
  proof_file_unique_id: string;
  created_at: number;
}

export interface DebtsLedgerTable {
  household_id: string;
  debtor_telegram_id: number;
  creditor_telegram_id: number;
  amount_cents: number;
}

export interface PendingActionsTable {
  id: string;
  telegram_id: number;
  type: string;
  payload_json: string;
  token: string;
  expires_at: number;
  used_at: number | null;
  created_at: number;
}

export interface PendingNotificationsTable {
  id: string;
  target_telegram_id: number;
  message: string;
  created_at: number;
  sent_at: number | null;
}

export interface Database {
  users: UsersTable;
  households: HouseholdsTable;
  household_members: HouseholdMembersTable;
  join_requests: JoinRequestsTable;
  transactions: TransactionsTable;
  debts_ledger: DebtsLedgerTable;
  pending_actions: PendingActionsTable;
  pending_notifications: PendingNotificationsTable;
  items: ItemsTable;
  item_usage_log: ItemUsageLogTable;
}
