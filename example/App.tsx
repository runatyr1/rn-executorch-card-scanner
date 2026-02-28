/**
 * Minimal example showing how to use rn-executorch-card-scanner.
 *
 * Prerequisites:
 *   npm install react-native-vision-camera react-native-executorch
 *   npm install rn-executorch-card-scanner
 *
 * Metro config: add .pte and .bin to assetExts
 */
import React, { useState } from 'react';
import { View, Text, Button, Modal, StyleSheet } from 'react-native';
import { CardScannerView, type ScannedCard } from 'rn-executorch-card-scanner';

export default function App() {
  const [visible, setVisible] = useState(false);
  const [card, setCard] = useState<ScannedCard | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card Scanner Demo</Text>

      <Button title="Scan Card" onPress={() => setVisible(true)} />

      {card && (
        <View style={styles.result}>
          <Text>Card: {card.cardNumber ?? 'N/A'}</Text>
          <Text>Expiry: {card.expiryMonth}/{card.expiryYear}</Text>
          <Text>Name: {card.holderName ?? 'N/A'}</Text>
          <Text style={styles.raw}>{card.raw}</Text>
        </View>
      )}

      <Modal visible={visible} animationType="slide">
        <CardScannerView
          config={{ debug: true, timeout: 60 }}
          onResult={(result) => {
            setCard(result);
            setVisible(false);
          }}
          onClose={() => setVisible(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  result: { marginTop: 20, padding: 16, backgroundColor: '#f0f0f0', borderRadius: 8, width: '100%' },
  raw: { marginTop: 8, color: '#666', fontSize: 12 },
});
