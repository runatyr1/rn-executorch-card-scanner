# rn-executorch-card-scanner

On-device credit/debit card scanner for React Native using [ExecuTorch](https://github.com/software-mansion/react-native-executorch) EasyOCR (CRAFT text detector + CRNN recognizer) and [Vision Camera](https://github.com/mrousavy/react-native-vision-camera).

Runs entirely on-device — no server, no API keys, no data leaves the phone.

## How it works

1. Vision Camera captures photos at a configurable interval
2. ExecuTorch OCR (EasyOCR) detects and recognizes text regions
3. Smart parser extracts card number, expiry, holder name, and bank name
4. Accumulator requires multiple consistent readings before locking a field (reduces noise)
5. Returns result when essential fields are locked, or on timeout with partial data

Based on the [react-native-executorch](https://docs.swmansion.com/react-native-executorch) library by Software Mansion, with card-specific parsing and accumulation logic built on top. See `docs/react-native-executorch.md` for the full reference.

## OCR Models

| Model | Type | Description |
|-------|------|-------------|
| [CRAFT](https://github.com/clovaai/CRAFT-pytorch) | Detector | Finds text regions in the image (heatmap-based) |
| [CRNN](https://github.com/JaidedAI/EasyOCR) | Recognizer | Reads text from detected regions |

Both models are from the [EasyOCR](https://github.com/JaidedAI/EasyOCR) project. Browse available models and language packs at the [EasyOCR Model Hub](https://www.jaided.ai/easyocr/modelhub/).

## Known limitations

- **Low-contrast cards**: Cards without raised/embossed numbers or with low contrast between text and background may not parse reliably
- **Memory**: ~1.4GB RAM while scanner is active (OCR models are large)
- **APK size**: Adds ~180MB to your APK (OCR model weights)
- **First run**: Models (~45MB) are downloaded from HuggingFace and cached locally
- **Performance**: ~1s on Galaxy S24, ~2.8s on iPhone SE 3 per inference cycle

Contributions to improve accuracy are welcome — the modular architecture makes it easy to swap in better models.

## Requirements

- React Native >= 0.81 (New Architecture)
- iOS >= 17.0, Android >= 13
- Expo: custom dev build required (no Expo Go)
- Metro config: add `.pte` and `.bin` to `assetExts`

## Installation

```bash
# Peer dependencies (install these in your app)
npm install react-native-vision-camera react-native-executorch

# If using Expo:
npm install @react-native-executorch/expo-adapter expo-file-system expo-asset

# This package
npm install rn-executorch-card-scanner
```

### Metro config

Add `.pte` and `.bin` to your `metro.config.js` asset extensions:

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('pte', 'bin');
module.exports = config;
```

## Quick start — drop-in component

```tsx
import { useState } from 'react';
import { Modal, Button } from 'react-native';
import { CardScannerView, type ScannedCard } from 'rn-executorch-card-scanner';

function MyScreen() {
  const [visible, setVisible] = useState(false);
  const [card, setCard] = useState<ScannedCard | null>(null);

  return (
    <>
      <Button title="Scan Card" onPress={() => setVisible(true)} />
      <Modal visible={visible} animationType="slide">
        <CardScannerView
          config={{ debug: true, timeout: 60 }}
          onResult={(result) => { setCard(result); setVisible(false); }}
          onClose={() => setVisible(false)}
        />
      </Modal>
    </>
  );
}
```

## Advanced — custom UI with hook

```tsx
import { useCardScanner } from 'rn-executorch-card-scanner';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

function MyCustomScanner() {
  const device = useCameraDevice('back');
  const scanner = useCardScanner({
    timeout: 90,
    scanInterval: 1500,
    requiredTicks: 3,
    debug: true,
    onOCRText: (text) => console.log('Live OCR:', text),
  });

  // Render your own UI using scanner.displayFields, scanner.countdown, etc.
  // Pass scanner.cameraRef to your Camera component:
  return (
    <Camera ref={scanner.cameraRef} device={device} isActive={scanner.isScanning} photo />
  );
}
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `120` | Seconds before giving up and returning partial results |
| `scanInterval` | `number` | `1000` | Milliseconds between capture attempts |
| `requiredTicks` | `number` | `2` | Consecutive identical values needed to lock a field |
| `debug` | `boolean` | `false` | Enable `[EOCR-*]` console logs |
| `ocrModel` | `any` | `OCR_ENGLISH` | OCR model config — swap for other ExecuTorch OCR models |
| `onOCRText` | `(text: string) => void` | — | Callback with live formatted OCR text |

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `CardScannerView` | Component | Drop-in scanner with camera + overlay |
| `useCardScanner` | Hook | Core logic for custom UI |
| `parseCardFromDetections` | Function | Pure parser — pass OCR detections, get card fields |
| `updateAccumulator` | Function | Pure accumulator state machine |
| `fixDigits` | Function | OCR character-to-digit correction |
| `CHAR_TO_DIGIT` | Constant | Character mapping table (customizable) |
| `BANNED_WORDS` | Constant | Words filtered from holder name detection |

## Swapping OCR models

The `ocrModel` config accepts any model config compatible with `react-native-executorch`'s `useOCR` hook:

```tsx
import { OCR_ENGLISH } from 'react-native-executorch';

// Default English
<CardScannerView config={{ ocrModel: OCR_ENGLISH }} ... />

// Or use RECOGNIZER_LATIN_CRNN for broader Latin support
import { RECOGNIZER_LATIN_CRNN } from 'react-native-executorch';
<CardScannerView config={{ ocrModel: RECOGNIZER_LATIN_CRNN }} ... />
```

If a better model becomes available, just pass it — the parsing logic is model-agnostic.

## Publishing to npm

```bash
# 1. Create account at https://www.npmjs.com/signup
# 2. Login
npm login

# 3. Publish (first time)
npm publish --access public

# 4. Update: bump version in package.json, then
npm publish
```

## License

MIT
