import { z } from 'zod';

const currency = z.string().min(2).max(4).default('AUD');

export const CreateHouseholdSchema = z.object({
  intent: z.literal('CREATE_HOUSEHOLD'),
  household_name: z.string().min(1),
  currency: currency,
});

export const JoinHouseholdSchema = z.object({
  intent: z.literal('JOIN_HOUSEHOLD'),
  join_code: z.string().min(6).max(12),
});

export const ParticipantSchema = z.object({
  /** @username or display name / first name */
  identifier: z.string().min(1),
  /** For CUSTOM split: their share in the original currency units (e.g. dollars) */
  amount: z.number().positive().optional(),
  /** For CUSTOM split by percentage */
  percentage: z.number().positive().max(100).optional(),
});

export const LogExpenseSchema = z.object({
  intent: z.literal('LOG_EXPENSE'),
  description: z.string().min(1),
  /** Total amount in currency units (e.g. dollars, NOT cents) */
  amount: z.number().positive(),
  currency: currency,
  /** Household name if the user mentioned it */
  household_hint: z.string().optional(),
  split_type: z.enum(['EVEN_INCLUDING_PAYER', 'EVEN_EXCLUDING_PAYER', 'CUSTOM']),
  /** People who will owe money to the payer. For EVEN splits, just identifiers. */
  participants: z.array(ParticipantSchema),
});

export const LogPaymentSchema = z.object({
  intent: z.literal('LOG_PAYMENT'),
  /** Total amount paid in currency units */
  amount: z.number().positive(),
  currency: currency,
  household_hint: z.string().optional(),
  /** Who received the payment (@username or name) */
  payee_identifier: z.string().min(1),
  description: z.string().optional(),
});

export const ViewBalancesSchema = z.object({
  intent: z.literal('VIEW_BALANCES'),
  household_hint: z.string().optional(),
});

export const KickMemberSchema = z.object({
  intent: z.literal('KICK_MEMBER'),
  member_identifier: z.string().min(1),
  household_hint: z.string().optional(),
});

export const CheckHouseholdSchema = z.object({
  intent: z.literal('CHECK_HOUSEHOLD'),
  household_hint: z.string().optional(),
});

export const HelpSchema = z.object({
  intent: z.literal('HELP'),
});

export const UnknownSchema = z.object({
  intent: z.literal('UNKNOWN'),
  message: z.string().optional(),
});

export const IntentSchema = z.discriminatedUnion('intent', [
  CreateHouseholdSchema,
  JoinHouseholdSchema,
  LogExpenseSchema,
  LogPaymentSchema,
  ViewBalancesSchema,
  CheckHouseholdSchema,
  KickMemberSchema,
  HelpSchema,
  UnknownSchema,
]);

export type Intent = z.infer<typeof IntentSchema>;
export type CreateHouseholdIntent = z.infer<typeof CreateHouseholdSchema>;
export type JoinHouseholdIntent = z.infer<typeof JoinHouseholdSchema>;
export type LogExpenseIntent = z.infer<typeof LogExpenseSchema>;
export type LogPaymentIntent = z.infer<typeof LogPaymentSchema>;
export type ViewBalancesIntent = z.infer<typeof ViewBalancesSchema>;
export type KickMemberIntent = z.infer<typeof KickMemberSchema>;
export type CheckHouseholdIntent = z.infer<typeof CheckHouseholdSchema>;
