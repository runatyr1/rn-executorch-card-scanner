# React Native ExecuTorch — Reference Guide

> **Package**: `react-native-executorch` v0.7.2
> **GitHub**: https://github.com/software-mansion/react-native-executorch
> **Docs**: https://docs.swmansion.com/react-native-executorch
> **HuggingFace models**: https://huggingface.co/softwaremansionio
> **By**: Software Mansion (React Native core contributors)

## Requirements
- React Native >= 0.81 (New Architecture only)
- iOS >= 17.0, Android >= 13
- Expo: needs custom dev build (no Expo Go), requires `@react-native-executorch/expo-adapter`, `expo-file-system`, `expo-asset`
- Metro config: add `.pte` and `.bin` to `assetExts`

## Installation
```bash
npm install react-native-executorch
npm install @react-native-executorch/expo-adapter expo-file-system expo-asset
```

## How It Works
TypeScript → C++ via JSI → ExecuTorch runtime (Meta's on-device ML framework). Uses XNNPACK (optimized CPU) or Core ML backends.

## Model Loading
Three methods:
```typescript
// 1. Bundled asset (< 512MB)
useExecutorchModule({ modelSource: require('../assets/model.pte') });

// 2. Remote URL (auto-cached in app documents dir)
useExecutorchModule({ modelSource: 'https://huggingface.co/.../model.pte' });

// 3. Local file
useExecutorchModule({ modelSource: 'file:///path/to/model.pte' });
```

All hooks support `preventLoad: true` to defer loading until needed.

---

## OCR (useOCR) — EasyOCR via CRAFT + CRNN

**Docs**: https://docs.swmansion.com/react-native-executorch/docs/hooks/computer-vision/useOCR
**Blog**: https://blog.swmansion.com/bringing-easyocr-to-react-native-executorch-2401c09c2d0c

### Pipeline
1. **CRAFT detector** — finds text regions (outputs heatmaps → bounding boxes)
2. **Custom grouping** — merges/splits boxes (handles rotation, max 678px width)
3. **CRNN recognizer** — reads text from cropped regions (3 models: 128/256/512px width)

### API
```typescript
import { useOCR, OCR_ENGLISH } from 'react-native-executorch';

const model = useOCR({ model: OCR_ENGLISH, preventLoad: true });

// forward() accepts: remote URL, local file URI, or base64 image
const results: OCRDetection[] = await model.forward(imageUri);
```

### Result Structure
```typescript
interface OCRDetection {
  bbox: Point[];   // 4 corner points of text region
  text: string;    // recognized text
  score: number;   // confidence 0-1
}
interface Point { x: number; y: number; }
```

### Available Models
- `OCR_ENGLISH` — default English
- `RECOGNIZER_LATIN_CRNN` — Latin-based languages (Polish, German, etc.)
- `RECOGNIZER_CYRILLIC_CRNN` — Cyrillic languages

### Benchmarks

**Model Size**:
| Component | Size |
|-----------|------|
| CRAFT detector (quantized) | 20.9 MB |
| CRNN recognizer | 18.5 - 25.2 MB |
| **Total** | **~45 MB** |

**Inference Time** (total OCR pipeline):
| Device | Time |
|--------|------|
| iPhone 17 Pro | 652ms |
| iPhone 16 Pro | 600ms |
| iPhone SE 3 | 2,855ms |
| Samsung Galaxy S24 | 1,092ms |
| OnePlus 12 | 1,034ms |

Component breakdown (iPhone 17 Pro): CRAFT 220ms, CRNN-512 45ms, CRNN-256 21ms, CRNN-128 11ms.
Recognizer runs 3-7 times per image. First run ~2x slower (model loading).

**Memory (RAM)**:
| Platform | RAM |
|----------|-----|
| Android (XNNPACK) | 1,400 MB |
| iOS (XNNPACK) | 1,320 MB |

### RAM Management
- Mount `useOCR` only inside scanner component → loads on open, unloads on close
- Use `preventLoad: true` if you need the hook at top level but want to defer loading

---

## Other Available Hooks (for future reference)

### LLMs (useLLM)
- Llama 3.2 1B: 2.47GB model, 11-19 tok/s, 3.1-3.3GB RAM
- Llama 3.2 3B: 6.43GB model, ~7 tok/s, 7.1-7.3GB RAM
- SpinQuant variants available (smaller)

### Speech-to-Text (useSTT) — Whisper
- Whisper Tiny: 151MB, 375-410MB RAM
- Whisper Small: 968MB

### Text-to-Speech (useTTS) — Kokoro
- ~330MB model, 820-1140MB RAM

### Computer Vision
- Classification (EfficientNet): 85.6MB, 87-230MB RAM
- Object Detection (SSDLite): 13.9MB, 132-164MB RAM
- Style Transfer: 6.78MB, 380-1200MB RAM
- Image Segmentation (DeepLabV3): 168MB, 660-930MB RAM

### Text Embeddings
- CLIP models: 254-438MB

---

## Notes
- Initial inference ~2x slower due to model loading warmup
- Models auto-cached in app documents directory when loaded from URL
- GPU acceleration limited; XNNPACK (optimized CPU) is primary backend
- GGUF models NOT supported (ExecuTorch uses .pte format)
- Export custom models via Python API or optimum-executorch
