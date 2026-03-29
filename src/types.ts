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

export interface ConfirmBroadcastPayload {
  flow: 'BROADCAST';
  actorId: number;
  householdId: string;
  householdName: string;
  message: string;
  recipientIds: number[];
  photoFileId?: string;
  photoFileUniqueId?: string;
}

export interface ConfirmIOwePayload {
  flow: 'IOWE';
  actorId: number;
  householdId: string;
  householdName: string;
  creditorId: number;
  creditorDisplayName: string;
  amountCents: number;
  currency: string;
  description: string;
}

export type ConfirmPayload =
  | ConfirmBroadcastPayload
  | ConfirmIOwePayload;

// ─── Button Mode Wizard Payloads ─────────────────────────────────────────────

export interface BmExpensePayload {
  householdId: string;
  householdName: string;
  currency: string;
  description?: string;
  totalCents?: number;
  splitType?: 'EVEN' | 'CUSTOM';
  /** Selected member telegram IDs for EVEN split */
  selectedMembers?: number[];
  /** Custom amounts per member { telegramId -> amountCents } */
  customAmounts?: Record<string, number>;
  /** For custom split — index of the member currently being asked */
  currentIndex?: number;
  /** All household member IDs (excluding payer) for custom split */
  memberIds?: number[];
}

export interface BmPaymentPayload {
  householdId: string;
  householdName: string;
  currency: string;
  creditorId?: number;
  creditorDisplayName?: string;
  amountCents?: number;
}

export interface BmIOwePayload {
  householdId: string;
  householdName: string;
  currency: string;
  creditorId?: number;
  creditorDisplayName?: string;
  description?: string;
  amountCents?: number;
}

export interface BmBroadcastPayload {
  householdId: string;
  householdName: string;
}

export interface BmItemPayload {
  householdId: string;
  itemId?: string;
  itemName?: string;
  action?: 'log' | 'add' | 'remove' | 'reset';
}

export interface BmNicknamePayload {
  // empty — just a marker
}

/**
 * Stored after button-mode expense/payment confirm, while waiting for proof.
 */
export interface BmAwaitingProofPayload {
  flow: 'EXPENSE' | 'PAYMENT';
  confirmPayload: Omit<ConfirmExpensePayload, 'proofFileId' | 'proofFileUniqueId'>
               | Omit<ConfirmPaymentPayload,  'proofFileId' | 'proofFileUniqueId'>;
}
