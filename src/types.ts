export interface ProofInfo {
  fileId: string;
  fileUniqueId: string;
}

export interface SplitEntry {
  telegramId: number;
  username: string | null;
  firstName: string;
  amountCents: number;
}

// Payloads stored in pending_actions.payload_json
export interface AwaitingProofPayload {
  intent: 'LOG_EXPENSE' | 'LOG_PAYMENT';
  // The raw classified intent from LLM
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export interface AwaitingHouseholdPayload {
  intent: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  proof: ProofInfo | null;
}

export interface ConfirmExpensePayload {
  flow: 'EXPENSE';
  actorId: number;
  householdId: string;
  householdName: string;
  description: string;
  currency: string;
  amountCentsTotal: number;
  splits: SplitEntry[];
  proofFileId: string;
  proofFileUniqueId: string;
}

export interface ConfirmPaymentPayload {
  flow: 'PAYMENT';
  actorId: number;
  householdId: string;
  householdName: string;
  creditorId: number;
  creditorUsername: string | null;
  creditorFirstName: string;
  amountCents: number;
  currency: string;
  description: string;
  proofFileId: string;
  proofFileUniqueId: string;
}

export interface ConfirmKickPayload {
  flow: 'KICK';
  actorId: number;
  householdId: string;
  householdName: string;
  memberId: number;
  memberUsername: string | null;
  memberFirstName: string;
}

export interface ConfirmBroadcastPayload {
  flow: 'BROADCAST';
  actorId: number;
  householdId: string;
  householdName: string;
  message: string;
  recipientIds: number[];
}

export type ConfirmPayload =
  | ConfirmExpensePayload
  | ConfirmPaymentPayload
  | ConfirmKickPayload
  | ConfirmBroadcastPayload;
