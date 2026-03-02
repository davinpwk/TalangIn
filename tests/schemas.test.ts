import { IntentSchema, LogExpenseSchema, LogPaymentSchema } from '../src/llm/schemas';

describe('IntentSchema', () => {
  it('parses CREATE_HOUSEHOLD', () => {
    const result = IntentSchema.safeParse({
      intent: 'CREATE_HOUSEHOLD',
      household_name: 'Smith Family',
      currency: 'AUD',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intent).toBe('CREATE_HOUSEHOLD');
    }
  });

  it('parses JOIN_HOUSEHOLD', () => {
    const result = IntentSchema.safeParse({
      intent: 'JOIN_HOUSEHOLD',
      join_code: 'ABCD1234',
    });
    expect(result.success).toBe(true);
  });

  it('parses LOG_EXPENSE with EVEN split', () => {
    const result = IntentSchema.safeParse({
      intent: 'LOG_EXPENSE',
      description: 'Dinner',
      amount: 35,
      currency: 'AUD',
      split_type: 'EVEN_INCLUDING_PAYER',
      participants: [{ identifier: 'alice' }, { identifier: 'bob' }],
    });
    expect(result.success).toBe(true);
  });

  it('parses LOG_EXPENSE with CUSTOM split (amounts)', () => {
    const result = IntentSchema.safeParse({
      intent: 'LOG_EXPENSE',
      description: 'Groceries',
      amount: 60,
      currency: 'AUD',
      split_type: 'CUSTOM',
      participants: [
        { identifier: 'alice', amount: 20 },
        { identifier: 'bob', amount: 40 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('parses LOG_PAYMENT', () => {
    const result = IntentSchema.safeParse({
      intent: 'LOG_PAYMENT',
      amount: 50,
      currency: 'AUD',
      payee_identifier: 'alice',
    });
    expect(result.success).toBe(true);
  });

  it('parses VIEW_BALANCES', () => {
    const result = IntentSchema.safeParse({ intent: 'VIEW_BALANCES' });
    expect(result.success).toBe(true);
  });

  it('parses KICK_MEMBER', () => {
    const result = IntentSchema.safeParse({
      intent: 'KICK_MEMBER',
      member_identifier: 'alice',
    });
    expect(result.success).toBe(true);
  });

  it('parses HELP', () => {
    const result = IntentSchema.safeParse({ intent: 'HELP' });
    expect(result.success).toBe(true);
  });

  it('parses UNKNOWN', () => {
    const result = IntentSchema.safeParse({ intent: 'UNKNOWN' });
    expect(result.success).toBe(true);
  });

  it('fails on missing required field', () => {
    const result = IntentSchema.safeParse({
      intent: 'CREATE_HOUSEHOLD',
      // missing household_name
    });
    expect(result.success).toBe(false);
  });

  it('fails on completely unknown intent', () => {
    const result = IntentSchema.safeParse({ intent: 'MAKE_COFFEE' });
    expect(result.success).toBe(false);
  });

  it('applies default currency AUD when omitted', () => {
    const result = LogExpenseSchema.safeParse({
      intent: 'LOG_EXPENSE',
      description: 'Test',
      amount: 10,
      split_type: 'EVEN_EXCLUDING_PAYER',
      participants: [{ identifier: 'alice' }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe('AUD');
  });

  it('rejects negative amounts', () => {
    const result = LogPaymentSchema.safeParse({
      intent: 'LOG_PAYMENT',
      amount: -10,
      payee_identifier: 'alice',
    });
    expect(result.success).toBe(false);
  });
});
