import { CHAR_TO_DIGIT, BANNED_WORDS } from './constants';
import type { ParsedCardFields, OCRDetection } from './types';

const BANNED_ARR = Array.from(BANNED_WORDS);

export function fixDigits(str: string): string {
  return str.split('').map(c => CHAR_TO_DIGIT[c] ?? c).join('');
}

/**
 * Parse card fields from EasyOCR detections (OCRDetection[]).
 * Uses bbox-based spatial reasoning to reconstruct card numbers
 * split across multiple detections.
 */
export function parseCardFromDetections(detections: OCRDetection[]): ParsedCardFields {
  const result: ParsedCardFields = { bankName: null, cardNumber: null, expiry: null, holderName: null };
  const texts = detections.map(d => d.text.trim()).filter(Boolean);

  // Card number: first try single detection with 13-19 digits
  let cardLineIdx = -1;
  for (let i = 0; i < texts.length; i++) {
    const digitsOnly = texts[i].replace(/[\s\-]/g, '').replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      result.cardNumber = digitsOnly;
      cardLineIdx = i;
      break;
    }
  }

  // If not found in single detection, collect digit-heavy detections on the same Y line, sorted by X
  if (!result.cardNumber) {
    const digitDetections: { idx: number; digits: string; x: number; y: number }[] = [];
    for (let i = 0; i < detections.length; i++) {
      const t = detections[i].text.trim();
      const digits = t.replace(/[\s\-\/]/g, '').replace(/[^0-9]/g, '');
      if (digits.length >= 3) {
        const x = detections[i].bbox?.[0]?.x ?? i * 1000;
        const y = detections[i].bbox?.[0]?.y ?? 0;
        digitDetections.push({ idx: i, digits, x, y });
      }
    }
    if (digitDetections.length >= 2) {
      let bestCard: string | null = null;
      let bestIdx = -1;
      for (const anchor of digitDetections) {
        const sameLine = digitDetections
          .filter(d => Math.abs(d.y - anchor.y) < 30)
          .sort((a, b) => a.x - b.x);
        const combined = sameLine.map(d => d.digits).join('');
        if (combined.length >= 13 && combined.length <= 19) {
          if (!bestCard || combined.length > bestCard.length) {
            bestCard = combined;
            bestIdx = sameLine[0].idx;
          }
        }
      }
      if (bestCard) {
        result.cardNumber = bestCard;
        cardLineIdx = bestIdx;
      }
    }
  }

  // Bank name: text before card number
  if (cardLineIdx > 0) {
    const bankTexts = texts.slice(0, cardLineIdx).filter(t => {
      const alpha = t.replace(/[^a-zA-Z]/g, '');
      return alpha.length >= 2;
    });
    if (bankTexts.length > 0) result.bankName = bankTexts.join(' ');
  }

  // Expiry and holder name from detections after card number
  const candidates: { before: string; after: string; yearVal: number }[] = [];

  for (let i = cardLineIdx + 1; i < texts.length && cardLineIdx >= 0; i++) {
    const t = texts[i];

    // Expiry: look for '/' in text
    const slashPos = t.indexOf('/');
    if (slashPos >= 0) {
      const beforeSlash = fixDigits(t.slice(Math.max(0, slashPos - 4), slashPos)).replace(/[^0-9]/g, '');
      const afterSlash = fixDigits(t.slice(slashPos + 1, slashPos + 5)).replace(/[^0-9]/g, '');
      if (beforeSlash.length > 0 || afterSlash.length > 0) {
        const yearVal = parseInt(afterSlash.slice(0, 2), 10) || 0;
        candidates.push({ before: beforeSlash, after: afterSlash, yearVal });
        continue;
      }
    }
    // Also try standard regex
    const expiryMatch = t.match(/(\d{1,2})\s?[\/\-]\s?(\d{2,4})/);
    if (expiryMatch) {
      const month = expiryMatch[1].padStart(2, '0');
      const year = expiryMatch[2].slice(-2);
      const yearVal = parseInt(year, 10) || 0;
      candidates.push({ before: month, after: year, yearVal });
      continue;
    }

    // Holder name: 2-3 alpha words, no banned words
    if (!result.holderName) {
      const alpha = t.replace(/[^a-zA-Z\s]/g, '').trim();
      if (alpha.length < 3) continue;
      const words = alpha.split(/\s+/).filter(w => w.length >= 2);
      const nameWords = words.filter(w => {
        const lw = w.toLowerCase();
        return !BANNED_ARR.some(b => lw.includes(b));
      });
      if (nameWords.length >= 2 && nameWords.length <= 3) {
        result.holderName = nameWords.join(' ');
      }
    }
  }

  // Pick latest expiry date
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.yearVal - a.yearVal);
    result.expiry = `${candidates[0].before}/${candidates[0].after}`;
  }

  return result;
}
