import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import API_KEYS from '../constants/apiKeys';

const TEST_LAT = 6.2442;
const TEST_LNG = -75.5812;

const TestApiScreen = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const log = (label, status, data) => {
    setResults(prev => [{
      id: Date.now(),
      label,
      status, // 'ok' | 'error' | 'warn'
      detail: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    }, ...prev]);
  };

  const runAll = async () => {
    setResults([]);
    setLoading(true);

    // 1. ¿Tiene API key?
    const key = API_KEYS.googleMaps;
    if (!key || key.length < 10) {
      log('API Key', 'error', 'No se encontró la API key en apiKeys.js');
    } else {
      log('API Key', 'ok', `Key encontrada: ${key.slice(0, 8)}...${key.slice(-4)}`);
    }

    // 2. Geocoding API
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${TEST_LAT},${TEST_LNG}&key=${key}&language=es`,
      );
      const d = await r.json();
      if (d.status === 'OK') {
        log('Geocoding API', 'ok', d.results?.[0]?.formatted_address || 'Sin dirección');
      } else {
        log('Geocoding API', 'error', `status: ${d.status} — ${d.error_message || ''}`);
      }
    } catch (e) {
      log('Geocoding API', 'error', `Red: ${e.message}`);
    }

    // 3. Places Autocomplete API
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Tecnologico&key=${key}&language=es&components=country:co`,
      );
      const d = await r.json();
      if (d.status === 'OK') {
        log('Places API', 'ok', `${d.predictions.length} sugerencias — ej: ${d.predictions[0]?.description}`);
      } else {
        log('Places API', 'error', `status: ${d.status} — ${d.error_message || ''}`);
      }
    } catch (e) {
      log('Places API', 'error', `Red: ${e.message}`);
    }

    // 4. Directions API
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${TEST_LAT},${TEST_LNG}&destination=6.2518,-75.5636&key=${key}&language=es`,
      );
      const d = await r.json();
      if (d.status === 'OK') {
        log('Directions API', 'ok', `Ruta: ${d.routes[0]?.legs[0]?.distance?.text}`);
      } else {
        log('Directions API', 'error', `status: ${d.status} — ${d.error_message || ''}`);
      }
    } catch (e) {
      log('Directions API', 'error', `Red: ${e.message}`);
    }

    // 5. Place Details API
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJed49MiSeRI8RvFCNFDNmcts&fields=geometry&key=${key}`,
      );
      const d = await r.json();
      if (d.status === 'OK') {
        log('Place Details API', 'ok', `lat: ${d.result?.geometry?.location?.lat}`);
      } else {
        log('Place Details API', 'error', `status: ${d.status} — ${d.error_message || ''}`);
      }
    } catch (e) {
      log('Place Details API', 'error', `Red: ${e.message}`);
    }

    setLoading(false);
  };

  const colorFor = (status) =>
    status === 'ok' ? '#2e7d32' : status === 'error' ? '#c62828' : '#e65100';
  const bgFor = (status) =>
    status === 'ok' ? '#e8f5e9' : status === 'error' ? '#ffebee' : '#fff3e0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>🔬 Diagnóstico APIs Google</Text>
      <Text style={styles.sub}>Key: {API_KEYS.googleMaps?.slice(0, 8)}...{API_KEYS.googleMaps?.slice(-4)}</Text>

      <TouchableOpacity style={styles.btn} onPress={runAll} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>▶ Ejecutar diagnóstico</Text>
        }
      </TouchableOpacity>

      {results.map(r => (
        <View key={r.id} style={[styles.card, { backgroundColor: bgFor(r.status) }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, { color: colorFor(r.status) }]}>
              {r.status === 'ok' ? '✓' : '✗'} {r.label}
            </Text>
          </View>
          <Text style={[styles.cardDetail, { color: colorFor(r.status) }]}>{r.detail}</Text>
        </View>
      ))}

      {results.length > 0 && (
        <View style={styles.guide}>
          <Text style={styles.guideTitle}>¿Qué significa cada error?</Text>
          <Text style={styles.guideText}>
            <Text style={{ fontWeight: '700' }}>REQUEST_DENIED</Text> → La API no está habilitada en Google Cloud Console, o la key tiene restricciones.{'\n\n'}
            <Text style={{ fontWeight: '700' }}>OVER_DAILY_LIMIT</Text> → Se agotó la cuota o falta facturación habilitada.{'\n\n'}
            <Text style={{ fontWeight: '700' }}>Red: Network request failed</Text> → Sin internet o el dispositivo bloquea las URLs de Google.{'\n\n'}
            <Text style={{ fontWeight: '700' }}>INVALID_REQUEST</Text> → La key está mal formada.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  sub:   { fontSize: 13, color: '#888', marginBottom: 20, fontFamily: 'monospace' },
  btn: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 20,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  card: {
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardLabel:  { fontSize: 15, fontWeight: '700' },
  cardDetail: { fontSize: 13, lineHeight: 18 },
  guide: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 10,
  },
  guideTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  guideText:  { fontSize: 13, color: '#444', lineHeight: 20 },
});

export default TestApiScreen;