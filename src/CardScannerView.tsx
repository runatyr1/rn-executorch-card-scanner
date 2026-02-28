import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useCardScanner } from './useCardScanner';
import type { ScannedCard, CardScannerConfig } from './types';

export interface CardScannerViewProps {
  onResult: (card: ScannedCard) => void;
  onClose: () => void;
  config?: CardScannerConfig;
  style?: ViewStyle;
}

/**
 * Drop-in card scanner component.
 * Renders camera preview with OCR overlay and countdown timer.
 * Calls onResult when card is parsed or timeout occurs.
 */
export function CardScannerView({ onResult, onClose, config, style }: CardScannerViewProps) {
  // Import vision camera dynamically
  let Camera: any = null;
  let useCameraDevice: any = null;
  try {
    const mod = require('react-native-vision-camera');
    Camera = mod.Camera;
    useCameraDevice = mod.useCameraDevice;
  } catch (e: any) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>react-native-vision-camera not available: {e.message}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <CardScannerInner Camera={Camera} useCameraDevice={useCameraDevice} onResult={onResult} onClose={onClose} config={config} style={style} />;
}

function CardScannerInner({
  Camera,
  useCameraDevice,
  onResult,
  onClose,
  config,
  style,
}: CardScannerViewProps & { Camera: any; useCameraDevice: any }) {
  const device = useCameraDevice('back');
  const scanner = useCardScanner(config);

  // Forward result to parent
  React.useEffect(() => {
    if (scanner.result) {
      onResult(scanner.result);
    }
  }, [scanner.result]);

  if (scanner.modelError && !scanner.isModelReady) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.overlayText, { marginTop: 100 }]}>
          {scanner.modelStatus}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.overlayText, { marginTop: 100 }]}>No camera device found</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const f = scanner.displayFields;
  const cardFormatted = f.cardNumber ? f.cardNumber.replace(/(.{4})/g, '$1 ').trim() : '...';

  return (
    <View style={[styles.container, style]}>
      <Camera
        ref={scanner.cameraRef}
        style={{ flex: 1 }}
        device={device}
        isActive={scanner.isScanning}
        photo={true}
      />
      <View style={styles.overlayInfo}>
        <Text style={[styles.overlayText, { fontSize: 14, marginBottom: 4, color: '#aaa' }]}>
          {scanner.modelStatus}
        </Text>
        {scanner.isModelReady ? (
          <>
            <Text style={[styles.overlayText, { fontSize: 22, fontWeight: '700', marginBottom: 4 }]}>
              {scanner.countdown}s
            </Text>
            <Text style={styles.overlayText} numberOfLines={6}>
              Bank: {f.bankName ?? '...'}{'\n'}
              Card: {cardFormatted}{'\n'}
              Date: {f.expiry ?? '...'}{'\n'}
              Name: {f.holderName ?? '...'}
            </Text>
          </>
        ) : (
          <Text style={[styles.overlayText, { fontSize: 16 }]}>
            Downloading & loading OCR models...
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayInfo: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    margin: 20,
    marginTop: 100,
  },
});
