import {
  splitEvenly,
  splitByAmounts,
  splitByPercentages,
  validateSplitSum,
} from '../src/domain/splits';

const makeP = (id: number, username?: string) => ({
  telegramId: id,
  username: username ?? null,
  firstName: `User${id}`,
});

describe('splitEvenly', () => {
  it('splits 3500 cents evenly among 3 people', () => {
    const result = splitEvenly(3500, [makeP(1), makeP(2), makeP(3)]);
    expect(result.map((r) => r.amountCents)).toEqual([1167, 1167, 1166]);
    expect(result.reduce((a, b) => a + b.amountCents, 0)).toBe(3500);
  });

  it('splits evenly with no remainder', () => {
    const result = splitEvenly(6000, [makeP(1), makeP(2)]);
    expect(result.map((r) => r.amountCents)).toEqual([3000, 3000]);
  });

  it('distributes remainder to first participants', () => {
    // 100 / 3 = 33 rem 1 → first participant gets 34
    const result = splitEvenly(100, [makeP(1), makeP(2), makeP(3)]);
    expect(result[0].amountCents).toBe(34);
    expect(result[1].amountCents).toBe(33);
    expect(result[2].amountCents).toBe(33);
    expect(validateSplitSum(result, 100)).toBe(true);
  });

  it('handles single participant', () => {
    const result = splitEvenly(999, [makeP(1)]);
    expect(result[0].amountCents).toBe(999);
  });

  it('throws for empty participants', () => {
    expect(() => splitEvenly(1000, [])).toThrow();
  });
});

describe('splitByAmounts', () => {
  it('returns splits when amounts fit within total', () => {
    const participants = [
      { ...makeP(1), amount: 20 },
      { ...makeP(2), amount: 15 },
    ];
    const result = splitByAmounts(3500, participants);
    expect(result).not.toBeNull();
    expect(result![0].amountCents).toBe(2000);
    expect(result![1].amountCents).toBe(1500);
  });

  it('returns null when amounts exceed total', () => {
    const participants = [
      { ...makeP(1), amount: 20 },
      { ...makeP(2), amount: 20 },
    ];
    const result = splitByAmounts(3500, participants); // 4000 > 3500
    expect(result).toBeNull();
  });

  it('allows amounts that sum to exactly the total', () => {
    const participants = [
      { ...makeP(1), amount: 17.5 },
      { ...makeP(2), amount: 17.5 },
    ];
    const result = splitByAmounts(3500, participants);
    expect(result).not.toBeNull();
    expect(validateSplitSum(result!, 3500)).toBe(true);
  });
});

describe('splitByPercentages', () => {
  it('splits 60/40', () => {
    const participants = [
      { ...makeP(1), percentage: 60 },
      { ...makeP(2), percentage: 40 },
    ];
    const result = splitByPercentages(10000, participants);
    expect(result).not.toBeNull();
    expect(result![0].amountCents).toBe(6000);
    expect(result![1].amountCents).toBe(4000);
  });

  it('handles rounding — remainder goes to first participant', () => {
    // 1000 / 3 = 333.33 each; 100% split among 3 = 33.3% each
    // floor(1000 * 0.333) = 333 each, total = 999, leftover = 1 → first gets 334
    const participants = [
      { ...makeP(1), percentage: 33.34 },
      { ...makeP(2), percentage: 33.33 },
      { ...makeP(3), percentage: 33.33 },
    ];
    const result = splitByPercentages(1000, participants);
    expect(result).not.toBeNull();
    expect(validateSplitSum(result!, 1000)).toBe(true);
  });

  it('returns null when percentages do not sum to 100', () => {
    const participants = [
      { ...makeP(1), percentage: 60 },
      { ...makeP(2), percentage: 30 }, // 90 total
    ];
    const result = splitByPercentages(10000, participants);
    expect(result).toBeNull();
  });
});

describe('validateSplitSum', () => {
  it('returns true when sum matches', () => {
    const splits = [
      { ...makeP(1), amountCents: 1750 },
      { ...makeP(2), amountCents: 1750 },
    ];
    expect(validateSplitSum(splits, 3500)).toBe(true);
  });

  it('returns false when sum does not match', () => {
    const splits = [{ ...makeP(1), amountCents: 1000 }];
    expect(validateSplitSum(splits, 2000)).toBe(false);
  });
});
