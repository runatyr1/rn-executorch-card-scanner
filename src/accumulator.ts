import { DEFAULT_REQUIRED_TICKS } from './constants';
import type { ParsedCardFields, AccumulatorState } from './types';

/**
 * Accumulate expiry digits: once a digit is seen in a position, keep it.
 * Slots: [M1, M2, Y1, Y2]
 */
export function accumulateExpiry(
  current: [string | null, string | null, string | null, string | null],
  partial: string | null
): { digits: [string | null, string | null, string | null, string | null]; complete: string | null } {
  const digits: [string | null, string | null, string | null, string | null] = [...current];
  if (partial) {
    const [beforeSlash, afterSlash] = partial.split('/');
    if (beforeSlash) {
      if (beforeSlash.length >= 2) {
        digits[0] = digits[0] ?? beforeSlash[beforeSlash.length - 2];
        digits[1] = digits[1] ?? beforeSlash[beforeSlash.length - 1];
      } else if (beforeSlash.length === 1) {
        digits[1] = digits[1] ?? beforeSlash[0];
      }
    }
    if (afterSlash) {
      const yr = afterSlash.slice(0, 2);
      if (yr.length >= 1) digits[2] = digits[2] ?? yr[0];
      if (yr.length >= 2) digits[3] = digits[3] ?? yr[1];
    }
  }
  if (digits[0] && digits[1] && digits[2] && digits[3]) {
    const month = parseInt(digits[0] + digits[1], 10);
    if (month >= 1 && month <= 12) {
      return { digits, complete: `${digits[0]}${digits[1]}/${digits[2]}${digits[3]}` };
    }
  }
  return { digits, complete: null };
}

/**
 * Update the accumulator state with new parsed fields.
 * Standard fields require `requiredTicks` consecutive identical values to lock.
 * Expiry uses digit-level accumulation (one sighting = keep).
 */
export function updateAccumulator(
  acc: AccumulatorState,
  locked: ParsedCardFields,
  parsed: ParsedCardFields,
  requiredTicks: number = DEFAULT_REQUIRED_TICKS
): { acc: AccumulatorState; locked: ParsedCardFields; allLocked: boolean } {
  const newAcc = { ...acc };
  const newLocked = { ...locked };

  const stdFields: (keyof Pick<ParsedCardFields, 'bankName' | 'cardNumber' | 'holderName'>)[] = ['bankName', 'cardNumber', 'holderName'];
  for (const field of stdFields) {
    if (newLocked[field]) continue;
    const newVal = parsed[field];
    if (!newVal) continue;

    const accField = newAcc[field];
    if (accField && accField.value === newVal) {
      newAcc[field] = { value: newVal, count: accField.count + 1 };
    } else {
      newAcc[field] = { value: newVal, count: 1 };
    }
    if (newAcc[field]!.count >= requiredTicks) {
      newLocked[field] = newAcc[field]!.value;
    }
  }

  if (!newLocked.expiry) {
    const { digits, complete } = accumulateExpiry(newAcc.expiryDigits, parsed.expiry);
    newAcc.expiryDigits = digits;
    if (complete) {
      newLocked.expiry = complete;
    }
  }

  const allLocked = !!(newLocked.bankName && newLocked.cardNumber && newLocked.expiry && newLocked.holderName);
  return { acc: newAcc, locked: newLocked, allLocked };
}
