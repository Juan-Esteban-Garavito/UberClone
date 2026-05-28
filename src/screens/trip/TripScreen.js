import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import { setVehicle, setFare, setStatus } from '../../redux/slices/tripSlice';
import API_KEYS from '../../constants/apiKeys';

// Tarifas reales por tipo — se calculan sobre la distancia real de la API
const VEHICLE_TYPES = [
  { id: '1', type: 'Económico', typeEn: 'Economy', basePrice: 3500, pricePerKm: 1500, time: '3 min', emoji: '🚗', desc: 'Estándar', descEn: 'Standard' },
  { id: '2', type: 'XL',        typeEn: 'XL',      basePrice: 5000, pricePerKm: 2000, time: '5 min', emoji: '🚙', desc: 'Más espacio', descEn: 'More space' },
  { id: '3', type: 'Premium',   typeEn: 'Premium',  basePrice: 8000, pricePerKm: 3000, time: '7 min', emoji: '🚘', desc: 'Lujo', descEn: 'Luxury' },
];

const calcPrice = (basePrice, pricePerKm, distKm) =>
  Math.round((basePrice + pricePerKm * distKm) / 100) * 100;

const decodePoly = (encoded) => {
  const poly = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1; lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1; lng += dlng;
    poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return poly;
};

const TripScreen = ({ navigation }) => {
  const dispatch   = useDispatch();
  const trip       = useSelector(state => state.trip);
  const language   = useSelector(state => state.user.language);
  const mapRef     = useRef(null);

  const [selected,    setSelected]    = useState(null);
  const [vehicles,    setVehicles]    = useState(VEHICLE_TYPES.map(v => ({ ...v, price: null }))); // precios calculados
  const [routeCoords, setRouteCoords] = useState([]);
  const [distanceText, setDistanceText] = useState('');
  const [durationText, setDurationText] = useState('');
  const [distKm,      setDistKm]      = useState(0);
  const [loading,     setLoading]     = useState(true);

  const l = ({
    es: { title: 'Selecciona un vehículo', confirm: 'Confirmar viaje', distance: 'Distancia', duration: 'Tiempo estimado', calculating: 'Calculando precios...' },
    en: { title: 'Select a vehicle',       confirm: 'Confirm ride',   distance: 'Distance',   duration: 'Estimated time',  calculating: 'Calculating prices...' },
  })[language] || {};

  useEffect(() => {
    if (trip.origin?.coords && trip.destination?.coords) getRouteAndDistance();
  }, []);

  const getRouteAndDistance = async () => {
    try {
      const origin = `${trip.origin.coords.latitude},${trip.origin.coords.longitude}`;
      const dest   = `${trip.destination.coords.latitude},${trip.destination.coords.longitude}`;

      const [dirRes, matRes] = await Promise.all([
        fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${API_KEYS.googleMaps}&language=${language}`),
        fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&key=${API_KEYS.googleMaps}&language=${language}`),
      ]);
      const [dirData, matData] = await Promise.all([dirRes.json(), matRes.json()]);

      if (dirData.routes?.length) {
        const points = decodePoly(dirData.routes[0].overview_polyline.points);
        setRouteCoords(points);
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 50, right: 50, bottom: 320, left: 50 }, animated: true,
        });
      }

      if (matData.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const el = matData.rows[0].elements[0];
        setDistanceText(el.distance.text);
        setDurationText(el.duration.text);

        // Distancia real en km para calcular precios
        const realKm = el.distance.value / 1000;
        setDistKm(realKm);

        // Calcular precios reales para cada tipo de vehículo
        setVehicles(VEHICLE_TYPES.map(v => ({
          ...v,
          price: calcPrice(v.basePrice, v.pricePerKm, realKm),
        })));
      }
    } catch (e) {
      console.log('Route error:', e);
      // Fallback: precios base sin distancia
      setVehicles(VEHICLE_TYPES.map(v => ({ ...v, price: v.basePrice })));
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (vehicle) => {
    setSelected(vehicle.id);
    dispatch(setVehicle(language === 'es' ? vehicle.type : vehicle.typeEn));
    dispatch(setFare(vehicle.price));
  };

  const handleConfirm = () => {
    if (!selected) return;
    dispatch(setStatus('searching'));
    navigation.navigate('Tracking');
  };

  const renderVehicle = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, selected === item.id && styles.cardSelected]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.8}
    >
      <Text style={styles.vehicleEmoji}>{item.emoji}</Text>
      <Text style={styles.vehicleType}>{language === 'es' ? item.type : item.typeEn}</Text>
      <Text style={styles.vehicleDesc}>{language === 'es' ? item.desc : item.descEn}</Text>
      <Text style={styles.vehicleTime}>{item.time}</Text>
      {item.price !== null ? (
        <Text style={styles.vehiclePrice}>${item.price.toLocaleString()}</Text>
      ) : (
        <ActivityIndicator size="small" color="#888" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={styles.map}>
        {trip.origin?.coords && (
          <Marker coordinate={trip.origin.coords} pinColor="green"
            title={language === 'es' ? 'Origen' : 'Origin'} />
        )}
        {trip.destination?.coords && (
          <Marker coordinate={trip.destination.coords} pinColor="red"
            title={language === 'es' ? 'Destino' : 'Destination'} />
        )}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#1a1a1a" />
        )}
      </MapView>

      <View style={styles.sheet}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1a1a1a" />
            <Text style={styles.loadingText}>{l.calculating}</Text>
          </View>
        ) : (
          <>
            <View style={styles.routeInfo}>
              <Text style={styles.routeText} numberOfLines={1}>📍 {trip.origin?.text}</Text>
              <Text style={styles.routeText} numberOfLines={1}>🏁 {trip.destination?.text}</Text>
              {distanceText ? (
                <Text style={styles.routeDetail}>📏 {distanceText} · ⏱ {durationText}</Text>
              ) : null}
            </View>

            <Text style={styles.title}>{l.title}</Text>

            <FlatList
              data={vehicles}
              keyExtractor={item => item.id}
              renderItem={renderVehicle}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.list}
            />

            <TouchableOpacity
              style={[styles.btn, !selected && styles.btnOff]}
              onPress={handleConfirm}
              disabled={!selected}
            >
              <Text style={styles.btnText}>{l.confirm}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 16, paddingBottom: 32, elevation: 10, maxHeight: '52%',
  },
  loadingBox:  { alignItems: 'center', paddingVertical: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#888' },
  routeInfo:   { marginBottom: 12 },
  routeText:   { fontSize: 13, color: '#333', marginBottom: 3 },
  routeDetail: { fontSize: 13, color: '#555', marginTop: 4, fontWeight: '600' },
  title:       { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  list:        { marginBottom: 12 },
  card: {
    alignItems: 'center', borderWidth: 1.5, borderColor: '#eee',
    borderRadius: 14, padding: 12, marginRight: 10,
    backgroundColor: '#fff', minWidth: 105,
  },
  cardSelected:  { borderColor: '#1a1a1a', backgroundColor: '#f5f5f5' },
  vehicleEmoji:  { fontSize: 30, marginBottom: 4 },
  vehicleType:   { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  vehicleDesc:   { fontSize: 11, color: '#888', marginTop: 1 },
  vehicleTime:   { fontSize: 12, color: '#555', marginTop: 2 },
  vehiclePrice:  { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginTop: 4 },
  btn:    { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 15, alignItems: 'center' },
  btnOff: { backgroundColor: '#ccc' },
  btnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default TripScreen;