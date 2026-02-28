import { useState, useRef, useEffect } from 'react';
import { parseCardFromDetections } from './parser';
import { updateAccumulator } from './accumulator';
import { DEFAULT_TIMEOUT, DEFAULT_SCAN_INTERVAL, DEFAULT_REQUIRED_TICKS } from './constants';
import type { ParsedCardFields, AccumulatorState, ScannedCard, CardScannerConfig } from './types';

function log(debug: boolean | undefined, tag: string, ...args: any[]) {
  if (debug) console.log(tag, ...args);
}

export interface UseCardScannerResult {
  cameraRef: React.RefObject<any>;
  isModelReady: boolean;
  isScanning: boolean;
  countdown: number;
  displayFields: ParsedCardFields;
  result: ScannedCard | null;
  modelStatus: string;
  modelError: string | null;
}

/**
 * Core hook that orchestrates OCR model + camera capture + accumulator logic.
 *
 * Requires react-native-executorch and react-native-vision-camera as peer deps.
 * The consumer must render a <Camera> component using the returned cameraRef.
 */
export function useCardScanner(config?: CardScannerConfig): UseCardScannerResult {
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const scanInterval = config?.scanInterval ?? DEFAULT_SCAN_INTERVAL;
  const requiredTicks = config?.requiredTicks ?? DEFAULT_REQUIRED_TICKS;
  const debug = config?.debug ?? false;

  const cameraRef = useRef<any>(null);
  const [displayFields, setDisplayFields] = useState<ParsedCardFields>({
    bankName: null, cardNumber: null, expiry: null, holderName: null,
  });
  const [countdown, setCountdown] = useState(timeout);
  const [modelStatus, setModelStatus] = useState('Loading OCR model...');
  const [modelError, setModelError] = useState<string | null>(null);
  const [result, setResult] = useState<ScannedCard | null>(null);

  const foundRef = useRef(false);
  const scanningRef = useRef(false);
  const mountedRef = useRef(true);
  const accRef = useRef<AccumulatorState>({
    bankName: null, cardNumber: null, holderName: null,
    expiryDigits: [null, null, null, null],
  });
  const lockedRef = useRef<ParsedCardFields>({
    bankName: null, cardNumber: null, expiry: null, holderName: null,
  });

  // Load OCR model
  let useOCR: any = null;
  let OCR_ENGLISH: any = null;
  try {
    const mod = require('react-native-executorch');
    useOCR = mod.useOCR;
    OCR_ENGLISH = mod.OCR_ENGLISH;
  } catch (e: any) {
    // Will be caught via modelError
  }

  const ocrModelConfig = config?.ocrModel ?? OCR_ENGLISH;
  const ocrModel = useOCR ? useOCR({ model: ocrModelConfig }) : { isReady: false, error: 'react-native-executorch not available', forward: async () => [] };

  // Mount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Model status tracking
  useEffect(() => {
    log(debug, '[EOCR-MODEL]', 'Loading OCR models (CRAFT+CRNN)...');
    return () => {
      log(debug, '[EOCR-MODEL]', 'Component unmounting — OCR models will be released');
    };
  }, []);

  useEffect(() => {
    if (ocrModel.isReady) {
      log(debug, '[EOCR-MODEL]', 'OCR model ready');
      setModelStatus('OCR model ready');
    } else if (ocrModel.error) {
      log(debug, '[EOCR-MODEL-ERROR]', String(ocrModel.error));
      setModelStatus(`Model error: ${ocrModel.error}`);
      setModelError(String(ocrModel.error));
    }
  }, [ocrModel.isReady, ocrModel.error]);

  // Build result helper
  const buildResult = (locked: ParsedCardFields, timedOut: boolean): ScannedCard => {
    if (!locked.cardNumber) {
      return { raw: 'Could not parse Card Data. Please fill manually.' };
    }
    const missing: string[] = [];
    if (!locked.expiry) missing.push('Expiry Date');
    if (!locked.holderName) missing.push('Cardholder Name');
    const missingMsg = missing.length > 0 && timedOut
      ? `\nCould not parse: ${missing.join(', ')}. Please fill manually.`
      : '';
    return {
      cardNumber: locked.cardNumber,
      expiryMonth: locked.expiry?.split('/')[0],
      expiryYear: locked.expiry?.split('/')[1],
      holderName: locked.holderName ?? undefined,
      raw: `Bank: ${locked.bankName ?? 'N/A'}${missingMsg}`,
    };
  };

  // Auto-capture and scan loop
  useEffect(() => {
    if (!ocrModel.isReady) return;

    const captureAndScan = async () => {
      if (foundRef.current || scanningRef.current || !cameraRef.current || !mountedRef.current) return;
      scanningRef.current = true;

      try {
        const photo = await cameraRef.current.takePhoto({ quality: 80 });
        if (!photo?.path) { scanningRef.current = false; return; }

        const imageUri = `file://${photo.path}`;
        log(debug, '[EOCR-CAPTURE]', imageUri);

        let detections: any;
        try {
          detections = await ocrModel.forward(imageUri);
        } catch (fwdErr: any) {
          log(debug, '[EOCR-FORWARD-ERROR]', fwdErr?.message ?? String(fwdErr));
          scanningRef.current = false;
          return;
        }
        if (!mountedRef.current || foundRef.current) {
          log(debug, '[EOCR-SKIPPED]', 'Result arrived after timeout/unmount');
          scanningRef.current = false;
          return;
        }

        log(debug, '[EOCR-DETECTIONS]', JSON.stringify(detections?.map((d: any) => ({ text: d.text, score: d.score, bbox: d.bbox }))));

        if (!detections || detections.length === 0) {
          log(debug, '[EOCR-TICK]', 'No text detected');
          scanningRef.current = false;
          return;
        }

        const parsed = parseCardFromDetections(detections);
        log(debug, '[EOCR-PARSED]', JSON.stringify(parsed));

        const { acc, locked } = updateAccumulator(
          accRef.current, lockedRef.current, parsed, requiredTicks
        );
        accRef.current = acc;
        lockedRef.current = locked;

        const ed = acc.expiryDigits;
        const expiryProgress = locked.expiry ?? `${ed[0] ?? '_'}${ed[1] ?? '_'}/${ed[2] ?? '_'}${ed[3] ?? '_'}`;
        const display: ParsedCardFields = {
          bankName: locked.bankName ?? parsed.bankName,
          cardNumber: locked.cardNumber ?? parsed.cardNumber,
          expiry: expiryProgress === '__/__' ? null : expiryProgress,
          holderName: locked.holderName ?? parsed.holderName,
        };
        setDisplayFields(display);

        if (config?.onOCRText) {
          const summary = `Bank: ${display.bankName ?? '...'}\nCard: ${display.cardNumber ? display.cardNumber.replace(/(.{4})/g, '$1 ').trim() : '...'}\nDate: ${display.expiry ?? '...'}\nName: ${display.holderName ?? '...'}`;
          config.onOCRText(summary);
        }

        const essentialsLocked = !!(locked.cardNumber && locked.expiry && locked.holderName);
        if (essentialsLocked) {
          foundRef.current = true;
          log(debug, '[EOCR-LOCKED]', JSON.stringify(locked));
          setResult(buildResult(locked, false));
        }
      } catch (e: any) {
        log(debug, '[EOCR-ERROR]', e?.message ?? String(e));
      }
      scanningRef.current = false;
    };

    let cancelled = false;
    const loop = async () => {
      while (!cancelled && !foundRef.current && mountedRef.current) {
        await captureAndScan();
        await new Promise(r => setTimeout(r, scanInterval));
      }
    };
    loop();
    return () => { cancelled = true; };
  }, [ocrModel.isReady]);

  // Countdown timer
  useEffect(() => {
    if (!ocrModel.isReady) return;
    log(debug, '[EOCR-TIMER]', `Starting ${timeout}s countdown`);
    setCountdown(timeout);
    const interval = setInterval(() => {
      if (foundRef.current) { clearInterval(interval); return; }
      setCountdown(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          if (!foundRef.current) {
            foundRef.current = true;
            const locked = lockedRef.current;
            log(debug, '[EOCR-TIMEOUT]', JSON.stringify(locked));
            setResult(buildResult(locked, true));
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [ocrModel.isReady]);

  return {
    cameraRef,
    isModelReady: ocrModel.isReady,
    isScanning: !foundRef.current && ocrModel.isReady,
    countdown,
    displayFields,
    result,
    modelStatus,
    modelError,
  };
}
