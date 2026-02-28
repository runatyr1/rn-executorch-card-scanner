export interface ScannedCard {
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  holderName?: string;
  raw?: string;
}

export interface ParsedCardFields {
  bankName: string | null;
  cardNumber: string | null;
  expiry: string | null; // MM/YY
  holderName: string | null;
}

export interface FieldAccumulator {
  value: string;
  count: number;
}

export interface AccumulatorState {
  bankName: FieldAccumulator | null;
  cardNumber: FieldAccumulator | null;
  holderName: FieldAccumulator | null;
  expiryDigits: [string | null, string | null, string | null, string | null]; // M1 M2 Y1 Y2
}

export interface OCRDetection {
  text: string;
  score: number;
  bbox?: Array<{ x: number; y: number }>;
}

export interface CardScannerConfig {
  /** Timeout in seconds before giving up. Default: 120 */
  timeout?: number;
  /** Milliseconds between scan attempts. Default: 1000 */
  scanInterval?: number;
  /** Consecutive identical values needed to lock a field. Default: 2 */
  requiredTicks?: number;
  /** Enable debug console logs. Default: false */
  debug?: boolean;
  /** OCR model config passed to useOCR. Default: OCR_ENGLISH */
  ocrModel?: any;
  /** Callback for live OCR text (for debug UI). */
  onOCRText?: (text: string) => void;
}
