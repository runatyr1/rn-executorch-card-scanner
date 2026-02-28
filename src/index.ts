// Components
export { CardScannerView } from './CardScannerView';
export type { CardScannerViewProps } from './CardScannerView';

// Hooks
export { useCardScanner } from './useCardScanner';
export type { UseCardScannerResult } from './useCardScanner';

// Pure functions (for custom implementations)
export { parseCardFromDetections, fixDigits } from './parser';
export { updateAccumulator, accumulateExpiry } from './accumulator';

// Types
export type {
  ScannedCard,
  ParsedCardFields,
  FieldAccumulator,
  AccumulatorState,
  OCRDetection,
  CardScannerConfig,
} from './types';

// Constants
export { CHAR_TO_DIGIT, BANNED_WORDS, DEFAULT_TIMEOUT, DEFAULT_SCAN_INTERVAL, DEFAULT_REQUIRED_TICKS } from './constants';
