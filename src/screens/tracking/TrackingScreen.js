import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import { setStatus, clearTrip } from '../../redux/slices/tripSlice';
import { addTrip } from '../../redux/slices/earningsSlice';
import useTranslation from '../../hooks/useTranslation';
import API_KEYS from '../../constants/apiKeys';

const TARIFA_BASE = 4000;
const TARIFA_KM   = 1800;
const calcularTarifa = (distKm) =>
  Math.round((TARIFA_BASE + distKm * TARIFA_KM) / 100) * 100;

const haversine = (a, b) => {
  const R    = 6371;
  const dLat = ((b.latitude  - a.latitude)  * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude  * Math.PI) / 180) *
    Math.cos((b.latitude  * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

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

const FAKE_DRIVERS = [
  { name: 'Carlos M.',  plate: 'ABC-123', model: 'Chevrolet Spark', rating: 4.8, emoji: '👨' },
  { name: 'Andrés R.',  plate: 'XYZ-456', model: 'Renault Logan',   rating: 4.9, emoji: '👨‍🦱' },
  { name: 'Laura P.',   plate: 'DEF-789', model: 'Toyota Prius',    rating: 5.0, emoji: '👩' },
  { name: 'Miguel S.',  plate: 'GHI-012', model: 'Kia Picanto',     rating: 4.7, emoji: '👨‍🦳' },
];

const TrackingScreen = ({ navigation }) => {
  const dispatch     = useDispatch();
  const trip         = useSelector(state => state.trip);
  const { language } = useTranslation();
  const mapRef       = useRef(null);
  const intervalRef  = useRef(null);

  const [phase,           setPhase]           = useState('searching');
  const [driverPos,       setDriverPos]       = useState(null);
  const [routeToOrigin,   setRouteToOrigin]   = useState([]);
  const [routeToDestination, setRouteToDestination] = useState([]);
  const [countdown,       setCountdown]       = useState(5);
  const [driver]                              = useState(FAKE_DRIVERS[Math.floor(Math.random() * FAKE_DRIVERS.length)]);
  const [showRating,      setShowRating]      = useState(false);
  const [selectedRating,  setSelectedRating]  = useState(0);
  const [fareTotal,       setFareTotal]       = useState(0);
  const [distanciaViaje,  setDistanciaViaje]  = useState(0);
  const [distanciaText,   setDistanciaText]   = useState('');
  const [duracionText,    setDuracionText]    = useState('');

  const d = ({
    es: {
      searching:   '🔍 Buscando conductor...',
      assigned:    '✅ ¡Conductor asignado!',
      arriving:    '🚗 Conductor en camino',
      arrived:     '📍 ¡Tu conductor llegó!',
      onboard:     '🛣️ Viaje en curso',
      completed:   '🏁 ¡Llegaste a tu destino!',
      fare:        'Total del viaje',
      rateDriver:  'Califica a tu conductor',
      submit:      'Enviar calificación',
      finish:      'Finalizar',
      eta:         'Llega en',
      boardBtn:    '🚀 ¡Subirse al vehículo!',
      breakdown:   'Base',
      perKm:       'por km',
      realDist:    'Distancia real',
    },
    en: {
      searching:   '🔍 Searching for driver...',
      assigned:    '✅ Driver assigned!',
      arriving:    '🚗 Driver on the way',
      arrived:     '📍 Your driver arrived!',
      onboard:     '🛣️ Trip in progress',
      completed:   '🏁 You arrived at your destination!',
      fare:        'Trip total',
      rateDriver:  'Rate your driver',
      submit:      'Submit rating',
      finish:      'Finish',
      eta:         'Arrives in',
      boardBtn:    '🚀 Board the vehicle!',
      breakdown:   'Base',
      perKm:       'per km',
      realDist:    'Real distance',
    },
  })[language] || {};

  useEffect(() => {
    const searchTimer = setTimeout(() => {
      setPhase('driver_assigned');
      let count = 5;
      setCountdown(count);
      const countInterval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(countInterval);
          setPhase('driver_arriving');
          loadRoutesAndStart();
        }
      }, 1000);
      return () => clearInterval(countInterval);
    }, 3000);
    return () => {
      clearTimeout(searchTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Carga ambas rutas en paralelo: conductor→origen y origen→destino
  const loadRoutesAndStart = async () => {
    if (!trip.origin?.coords || !trip.destination?.coords) return;

    const { latitude: oLat, longitude: oLng } = trip.origin.coords;
    const { latitude: dLat, longitude: dLng } = trip.destination.coords;
    const driverStart = { latitude: oLat + 0.008, longitude: oLng + 0.008 };
    setDriverPos(driverStart);

    try {
      // Ruta 1: conductor simulado → origen pasajero
      const url1 =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${driverStart.latitude},${driverStart.longitude}` +
        `&destination=${oLat},${oLng}` +
        `&key=${API_KEYS.googleMaps}&language=${language}`;

      // Ruta 2: origen → destino (ruta real del viaje)
      const url2 =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${oLat},${oLng}` +
        `&destination=${dLat},${dLng}` +
        `&key=${API_KEYS.googleMaps}&language=${language}`;

      const [res1, res2] = await Promise.all([fetch(url1), fetch(url2)]);
      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

      // Ruta de llegada
      const arrivalPoints = data1.routes?.length
        ? decodePoly(data1.routes[0].overview_polyline.points)
        : [driverStart, trip.origin.coords];
      setRouteToOrigin(arrivalPoints);

      // Ruta del viaje con distancia REAL de la API
      if (data2.routes?.length) {
        const tripPoints = decodePoly(data2.routes[0].overview_polyline.points);
        setRouteToDestination(tripPoints);

        const leg = data2.routes[0].legs[0];
        const realDistKm = leg.distance.value / 1000;
        const realFare = calcularTarifa(realDistKm);
        setDistanciaViaje(parseFloat(realDistKm.toFixed(1)));
        setFareTotal(realFare);
        setDistanciaText(leg.distance.text);
        setDuracionText(leg.duration.text);
      } else {
        // Fallback a haversine si la API falla
        const estimatedKm = haversine(trip.origin.coords, trip.destination.coords);
        setDistanciaViaje(parseFloat(estimatedKm.toFixed(1)));
        setFareTotal(calcularTarifa(estimatedKm));
      }

      // Ajustar cámara para mostrar la llegada del conductor
      mapRef.current?.fitToCoordinates(
        [driverStart, trip.origin.coords],
        { edgePadding: { top: 100, right: 60, bottom: 360, left: 60 }, animated: true },
      );

      // Animar conductor hacia el origen del pasajero
      animateAlongRoute(arrivalPoints, () => {
        setDriverPos(trip.origin.coords);
        setPhase('driver_arrived');
      });

    } catch (e) {
      console.log('Route error:', e);
      // Fallback sin API
      const estimatedKm = haversine(trip.origin.coords, trip.destination.coords);
      setDistanciaViaje(parseFloat(estimatedKm.toFixed(1)));
      setFareTotal(calcularTarifa(estimatedKm));
      setPhase('driver_arrived');
    }
  };

  const animateAlongRoute = (points, onComplete) => {
    let step = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (step >= points.length - 1) {
        clearInterval(intervalRef.current);
        setDriverPos(points[points.length - 1]);
        onComplete();
        return;
      }
      step += 2;
      const pos = points[Math.min(step, points.length - 1)];
      setDriverPos(pos);
      mapRef.current?.animateCamera({ center: pos, zoom: 16 }, { duration: 650 });
    }, 700);
  };

  const startTrip = () => {
    setPhase('trip_active');
    setRouteToOrigin([]); // limpiar traza de llegada

    const tripPoints = routeToDestination.length > 0
      ? routeToDestination
      : [trip.origin.coords, trip.destination.coords];

    // Ajustar cámara para mostrar el recorrido completo
    if (tripPoints.length > 1) {
      mapRef.current?.fitToCoordinates(tripPoints, {
        edgePadding: { top: 100, right: 60, bottom: 360, left: 60 }, animated: true,
      });
    }

    animateAlongRoute(tripPoints, () => {
      setPhase('completed');
      dispatch(setStatus('completed'));
    });
  };

  const submitRating = () => {
    if (selectedRating === 0) {
      Alert.alert('', language === 'es' ? 'Selecciona una calificación' : 'Select a rating');
      return;
    }
    dispatch(addTrip({
      id:          Date.now().toString(),
      passenger:   language === 'es' ? 'Tú' : 'You',
      origin:      trip.origin?.text || `${trip.origin?.coords?.latitude?.toFixed(4)}, ${trip.origin?.coords?.longitude?.toFixed(4)}` || '',
      destination: trip.destination?.text || `${trip.destination?.coords?.latitude?.toFixed(4)}, ${trip.destination?.coords?.longitude?.toFixed(4)}` || '',
      fare:        fareTotal,
      distKm:      distanciaViaje,
      rating:      selectedRating,
      date:        new Date().toISOString(),
      userType:    'passenger',
      driverName:  driver.name,
    }));
    setShowRating(false);
    dispatch(clearTrip());
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const statusText = {
    searching:       d.searching,
    driver_assigned: d.assigned,
    driver_arriving: d.arriving,
    driver_arrived:  d.arrived,
    trip_active:     d.onboard,
    completed:       d.completed,
  }[phase] || '';

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude:       trip.origin?.coords?.latitude  || 6.2442,
          longitude:      trip.origin?.coords?.longitude || -75.5812,
          latitudeDelta:  0.05,
          longitudeDelta: 0.05,
        }}
      >
        {trip.origin?.coords && (
          <Marker coordinate={trip.origin.coords} pinColor="green"
            title={language === 'es' ? 'Tu ubicación' : 'Your location'} />
        )}
        {trip.destination?.coords && (
          <Marker coordinate={trip.destination.coords} pinColor="red"
            title={language === 'es' ? 'Destino' : 'Destination'} />
        )}
        {driverPos && (
          <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.carMarker}><Text style={styles.carEmoji}>🚗</Text></View>
          </Marker>
        )}

        {/* Ruta de llegada del conductor (azul) */}
        {routeToOrigin.length > 0 && (
          <Polyline coordinates={routeToOrigin} strokeWidth={4} strokeColor="#1565C0" />
        )}

        {/* Ruta del viaje (negro) — se muestra desde driver_arrived */}
        {routeToDestination.length > 0 &&
          ['driver_arrived', 'trip_active', 'completed'].includes(phase) && (
          <Polyline coordinates={routeToDestination} strokeWidth={4} strokeColor="#1a1a1a" />
        )}
      </MapView>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.statusText}>{statusText}</Text>

        {phase === 'searching' && (
          <ActivityIndicator size="large" color="#1a1a1a" style={{ marginVertical: 16 }} />
        )}

        {['driver_assigned', 'driver_arriving', 'driver_arrived', 'trip_active'].includes(phase) && (
          <View style={styles.driverCard}>
            <Text style={styles.driverAvatar}>{driver.emoji}</Text>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <Text style={styles.driverDetail}>⭐ {driver.rating} · {driver.model}</Text>
              <Text style={styles.driverDetail}>🚘 {driver.plate}</Text>
            </View>
            <View style={styles.fareBox}>
              <Text style={styles.fareBoxLabel}>{language === 'es' ? 'Tarifa' : 'Fare'}</Text>
              <Text style={styles.fareBoxValue}>${fareTotal.toLocaleString()}</Text>
              {distanciaText ? (
                <Text style={styles.fareBoxDist}>{distanciaText}</Text>
              ) : null}
            </View>
          </View>
        )}

        {phase === 'driver_assigned' && (
          <Text style={styles.countdown}>
            {d.eta} {countdown} {language === 'es' ? 'seg' : 's'}
          </Text>
        )}

        {phase === 'driver_arrived' && (
          <TouchableOpacity style={[styles.btn, styles.btnBlack]} onPress={startTrip}>
            <Text style={styles.btnText}>{d.boardBtn}</Text>
          </TouchableOpacity>
        )}

        {phase === 'completed' && (
          <>
            <View style={styles.fareTotal}>
              <Text style={styles.fareTotalLabel}>{d.fare}</Text>
              <Text style={styles.fareTotalValue}>${fareTotal.toLocaleString()} COP</Text>
              <Text style={styles.fareTotalSub}>
                {d.breakdown} ${TARIFA_BASE.toLocaleString()} + {distanciaViaje} km × ${TARIFA_KM.toLocaleString()} {d.perKm}
              </Text>
              {distanciaText && duracionText ? (
                <Text style={styles.fareTotalRoute}>
                  📏 {distanciaText} · ⏱ {duracionText} ({d.realDist})
                </Text>
              ) : null}
            </View>
            <TouchableOpacity style={[styles.btn, styles.btnBlack]} onPress={() => setShowRating(true)}>
              <Text style={styles.btnText}>{d.finish} & {language === 'es' ? 'Calificar' : 'Rate'} ⭐</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal visible={showRating} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{d.rateDriver}</Text>
            <Text style={styles.modalDriverName}>{driver.name}</Text>
            <Text style={styles.modalDriverSub}>{driver.model} · {driver.plate}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                  <Text style={styles.star}>{star <= selectedRating ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.btn, styles.btnBlack, { alignSelf: 'stretch' }]} onPress={submitRating}>
              <Text style={styles.btnText}>{d.submit}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 22,
    borderTopRightRadius: 22, padding: 20, paddingBottom: 32, elevation: 12,
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  statusText: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 14, padding: 14, marginBottom: 12 },
  driverAvatar: { fontSize: 42, marginRight: 12 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  driverDetail: { fontSize: 13, color: '#555', marginBottom: 2 },
  fareBox: { alignItems: 'flex-end' },
  fareBoxLabel: { fontSize: 11, color: '#999' },
  fareBoxValue: { fontSize: 18, fontWeight: '800' },
  fareBoxDist:  { fontSize: 10, color: '#888', marginTop: 2 },
  countdown: { textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 8 },
  fareTotal: { backgroundColor: '#f0fff4', borderRadius: 14, padding: 18, marginBottom: 12, alignItems: 'center' },
  fareTotalLabel: { fontSize: 13, color: '#555', marginBottom: 4 },
  fareTotalValue: { fontSize: 30, fontWeight: '800', color: '#2e7d32' },
  fareTotalSub:   { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  fareTotalRoute: { fontSize: 12, color: '#555', marginTop: 6, textAlign: 'center' },
  btn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 6 },
  btnBlack: { backgroundColor: '#1a1a1a' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  carMarker: { backgroundColor: '#fff', borderRadius: 20, padding: 4, elevation: 6 },
  carEmoji: { fontSize: 26 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 30, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalDriverName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  modalDriverSub: { fontSize: 13, color: '#888', marginBottom: 18 },
  starsRow: { flexDirection: 'row', marginBottom: 24 },
  star: { fontSize: 42, marginHorizontal: 5 },
});

export default TrackingScreen;