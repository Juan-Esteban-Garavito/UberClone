import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  PermissionsAndroid, Platform, Alert,
  ActivityIndicator, TextInput, FlatList, Keyboard,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { useDispatch, useSelector } from 'react-redux';
import { setOrigin, setDestination } from '../../redux/slices/tripSlice';
import API_KEYS from '../../constants/apiKeys';

// Usa Places Text Search API — solo necesita Places API (ya habilitada ✓)
// Devuelve coordenadas directamente sin Place Details ni Geocoding
const AutocompleteInput = ({
  placeholder, value, onChangeText, onSelect,
  confirmed, language, inputRef,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showList,    setShowList]    = useState(false);
  const timer = useRef(null);

  const fetchSuggestions = useCallback(async (text) => {
    if (!text || text.length < 2) { setSuggestions([]); setShowList(false); return; }
    setLoading(true);
    try {
      // nearbysearch/textsearch incluye geometry (coords) directamente
      const url =
        `https://maps.googleapis.com/maps/api/place/textsearch/json` +
        `?query=${encodeURIComponent(text + ' Colombia')}` +
        `&key=${API_KEYS.googleMaps}` +
        `&language=${language}` +
        `&region=co`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length) {
        setSuggestions(data.results.slice(0, 5));
        setShowList(true);
      } else {
        setSuggestions([]);
        setShowList(false);
      }
    } catch (e) {
      console.log('TextSearch error:', e);
    } finally {
      setLoading(false);
    }
  }, [language]);

  const handleChange = (text) => {
    onChangeText(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  // Las coords vienen directamente en geometry.location — sin llamadas extra
  const handleSelect = (item) => {
    Keyboard.dismiss();
    setShowList(false);
    setSuggestions([]);
    const desc = item.name + (item.formatted_address ? ', ' + item.formatted_address : '');
    onChangeText(item.name);
    onSelect({
      text:   item.name,
      coords: {
        latitude:  item.geometry.location.lat,
        longitude: item.geometry.location.lng,
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[ac.wrap, confirmed && ac.wrapOk]}>
        <TextInput
          ref={inputRef}
          style={ac.input}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          value={value}
          onChangeText={handleChange}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading   && <ActivityIndicator size="small" color="#888" style={ac.ico} />}
        {confirmed && !loading && <Text style={ac.check}>✓</Text>}
      </View>

      {showList && suggestions.length > 0 && (
        <View style={ac.list}>
          <FlatList
            data={suggestions}
            keyExtractor={i => i.place_id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={ac.row}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={ac.main} numberOfLines={1}>{item.name}</Text>
                {!!item.formatted_address && (
                  <Text style={ac.sub} numberOfLines={1}>{item.formatted_address}</Text>
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={ac.sep} />}
          />
        </View>
      )}
    </View>
  );
};

const ac = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10, backgroundColor: '#f8f8f8', paddingHorizontal: 10, height: 46 },
  wrapOk: { borderColor: '#4CAF50' },
  input:  { flex: 1, fontSize: 14, color: '#222' },
  ico:    { marginLeft: 4 },
  check:  { color: '#4CAF50', fontWeight: '800', fontSize: 17, marginLeft: 4 },
  list:   { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, elevation: 20, zIndex: 9999, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, maxHeight: 230, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  row:    { paddingHorizontal: 14, paddingVertical: 11 },
  main:   { fontSize: 14, fontWeight: '600', color: '#111' },
  sub:    { fontSize: 12, color: '#888', marginTop: 2 },
  sep:    { height: 1, backgroundColor: '#f2f2f2' },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const language = useSelector(s => s.user.language) || 'es';
  const mapRef    = useRef(null);
  const originRef = useRef(null);

  const [currentLocation,   setCurrentLocation]   = useState(null);
  const [originCoords,      setOriginCoords]       = useState(null);
  const [destinationCoords, setDestinationCoords]  = useState(null);
  const [originText,        setOriginText]         = useState('');
  const [destinationText,   setDestinationText]    = useState('');
  const [originConfirmed,   setOriginConfirmed]    = useState(false);
  const [destConfirmed,     setDestConfirmed]      = useState(false);
  const [loadingLoc,        setLoadingLoc]         = useState(true);

  const l = ({
    es: { title: '¿A dónde vas?', originPH: 'Obteniendo ubicación...', myLoc: 'Mi ubicación actual', destPH: 'Destino', request: 'Solicitar viaje', errTitle: 'Campos incompletos', errOrigin: 'Selecciona el origen desde las sugerencias', errDest: 'Selecciona el destino desde las sugerencias', errBoth: 'Selecciona origen y destino desde las sugerencias', useCurrent: '📍 Usar mi ubicación actual' },
    en: { title: 'Where to?', originPH: 'Getting location...', myLoc: 'My current location', destPH: 'Destination', request: 'Request ride', errTitle: 'Incomplete fields', errOrigin: 'Select origin from suggestions', errDest: 'Select destination from suggestions', errBoth: 'Select origin and destination from suggestions', useCurrent: '📍 Use my current location' },
  })[language] || {};

  useEffect(() => { requestLocationPermission(); }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (granted === PermissionsAndroid.RESULTS.GRANTED) getCurrentLocation();
      else setLoadingLoc(false);
    } else { getCurrentLocation(); }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        const region = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
        setCurrentLocation(region);
        setOriginCoords({ latitude, longitude });
        setOriginConfirmed(true);
        setOriginText(l.myLoc || 'Mi ubicación actual');
        mapRef.current?.animateToRegion(region, 1000);
        setLoadingLoc(false);
      },
      err => { console.log('Geolocation:', err); setLoadingLoc(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const handleOriginSelect = ({ text, coords }) => {
    setOriginText(text); setOriginCoords(coords); setOriginConfirmed(true);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 800);
  };

  const handleDestSelect = ({ text, coords }) => {
    setDestinationText(text); setDestinationCoords(coords); setDestConfirmed(true);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 800);
  };

  const resetToCurrentLocation = () => {
    if (!currentLocation) return;
    setOriginCoords({ latitude: currentLocation.latitude, longitude: currentLocation.longitude });
    setOriginConfirmed(true);
    setOriginText(l.myLoc);
  };

  const handleRequest = () => {
    if (!originCoords && !destinationCoords) { Alert.alert(l.errTitle, l.errBoth);   return; }
    if (!originCoords)                        { Alert.alert(l.errTitle, l.errOrigin); return; }
    if (!destinationCoords)                   { Alert.alert(l.errTitle, l.errDest);   return; }
    dispatch(setOrigin({ text: originText, coords: originCoords }));
    dispatch(setDestination({ text: destinationText, coords: destinationCoords }));
    navigation.navigate('Trip');
  };

  return (
    <View style={styles.container}>
      {currentLocation ? (
        <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={styles.map} region={currentLocation} showsUserLocation showsMyLocationButton={false}>
          {originCoords    && <Marker coordinate={originCoords}      pinColor="green" />}
          {destinationCoords && <Marker coordinate={destinationCoords} pinColor="red" />}
        </MapView>
      ) : (
        <View style={styles.mapFallback}><ActivityIndicator size="large" color="#1a1a1a" /></View>
      )}

      <View style={styles.panel}>
        <Text style={styles.title}>{l.title}</Text>

        <View style={[styles.fieldRow, { zIndex: 1000 }]}>
          <View style={styles.dotsCol}>
            <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
            <View style={styles.line} />
          </View>
          <AutocompleteInput
            inputRef={originRef}
            placeholder={loadingLoc ? l.originPH : l.myLoc}
            value={originText}
            onChangeText={(t) => { setOriginText(t); setOriginConfirmed(false); setOriginCoords(null); }}
            onSelect={handleOriginSelect}
            confirmed={originConfirmed}
            language={language}
          />
        </View>

        {!originConfirmed && currentLocation && (
          <TouchableOpacity style={styles.resetBtn} onPress={resetToCurrentLocation}>
            <Text style={styles.resetText}>{l.useCurrent}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.fieldRow, { zIndex: 999 }]}>
          <View style={styles.dotsCol}>
            <View style={[styles.dot, { backgroundColor: '#f44336' }]} />
          </View>
          <AutocompleteInput
            placeholder={l.destPH}
            value={destinationText}
            onChangeText={(t) => { setDestinationText(t); setDestConfirmed(false); setDestinationCoords(null); }}
            onSelect={handleDestSelect}
            confirmed={destConfirmed}
            language={language}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, (!originCoords || !destinationCoords) && styles.btnOff]}
          onPress={handleRequest}
        >
          <Text style={styles.btnText}>{l.request}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1 },
  map:         { flex: 1 },
  mapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ddd' },
  panel:       { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#fff', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20, elevation: 10, zIndex: 100, overflow: 'visible' },
  title:       { fontSize: 20, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 16 },
  fieldRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  dotsCol:     { width: 24, alignItems: 'center', paddingTop: 16 },
  dot:         { width: 12, height: 12, borderRadius: 6 },
  line:        { width: 2, flex: 1, backgroundColor: '#ddd', marginTop: 4, minHeight: 14 },
  resetBtn:    { alignSelf: 'flex-start', backgroundColor: '#e8f4fd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 24, marginBottom: 8 },
  resetText:   { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  btn:         { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  btnOff:      { backgroundColor: '#ccc' },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default HomeScreen;