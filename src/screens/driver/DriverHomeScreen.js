import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, PermissionsAndroid, Platform, Modal,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { useSelector, useDispatch } from 'react-redux';
import useTranslation from '../../hooks/useTranslation';
import API_KEYS from '../../constants/apiKeys';
import { addTrip } from '../../redux/slices/earningsSlice';

const TARIFA_BASE = 4000;
const TARIFA_KM   = 1800;
const calcularTarifa = (distanciaKm) =>
  Math.round((TARIFA_BASE + distanciaKm * TARIFA_KM) / 100) * 100;

const puntoCercano = (lat, lng, minKm, maxKm) => {
  const r      = (minKm + Math.random() * (maxKm - minKm)) / 111;
  const angulo = Math.random() * 2 * Math.PI;
  return { latitude: lat + r * Math.cos(angulo), longitude: lng + r * Math.sin(angulo) };
};

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

const fetchRoute = async (from, to, language) => {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${from.latitude},${from.longitude}` +
      `&destination=${to.latitude},${to.longitude}` +
      `&key=${API_KEYS.googleMaps}&language=${language}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.routes?.length) return null;
    const points = decodePoly(data.routes[0].overview_polyline.points);
    const distKm = (data.routes[0].legs[0].distance.value / 1000);
    return { points, distKm };
  } catch (e) {
    console.log('fetchRoute error', e);
    return null;
  }
};

const reverseGeocode = async (lat, lng, language) => {
  try {
    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEYS.googleMaps}&language=${language}`
    );
    const data = await res.json();
    if (data.results?.[0]) {
      // Usar solo los primeros componentes para nombre corto
      const comps = data.results[0].address_components;
      const route  = comps.find(c => c.types.includes('route'))?.short_name || '';
      const barrio = comps.find(c => c.types.includes('neighborhood') || c.types.includes('sublocality'))?.short_name || '';
      return route && barrio ? `${route}, ${barrio}` : data.results[0].formatted_address.split(',').slice(0,2).join(',');
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
};

const NOMBRES = ['María G.', 'Juan P.', 'Ana R.', 'Luis C.', 'Sara V.', 'Carlos M.', 'Diana T.', 'Pedro H.'];

const DriverHomeScreen = () => {
  const dispatch = useDispatch();
  const user     = useSelector(state => state.user);
  const earnings = useSelector(state => state.earnings);
  const { language } = useTranslation();
  const mapRef      = useRef(null);
  const intervalRef = useRef(null);

  const [isOnline,        setIsOnline]        = useState(false);
  const [phase,           setPhase]           = useState('idle');
  const [currentRequest,  setCurrentRequest]  = useState(null);
  const [driverPos,       setDriverPos]       = useState(null);
  // routeToPassenger = ruta conductor→origen, routeToDestination = ruta origen→destino
  const [routeToPassenger,    setRouteToPassenger]    = useState([]);
  const [routeToDestination,  setRouteToDestination]  = useState([]);
  const [showRating,      setShowRating]      = useState(false);
  const [passengerRating, setPassengerRating] = useState(0);
  const [fareTotal,       setFareTotal]       = useState(0);
  const [originName,      setOriginName]      = useState('');
  const [destName,        setDestName]        = useState('');
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 6.2442, longitude: -75.5812,
    latitudeDelta: 0.05, longitudeDelta: 0.05,
  });

  const d = ({
    es: {
      online: '🟢 Conectado', offline: '🔴 Desconectado',
      connect: 'Conectarse para recibir viajes',
      disconnect: 'Desconectarse',
      newRequest: '🔔 Nueva solicitud',
      accept: 'Aceptar', reject: 'Rechazar',
      goingTo: '🚗 En camino al pasajero',
      arrived: '📍 Llegaste al pasajero',
      startTrip: '🚀 Iniciar viaje',
      tripActive: '🛣️ Viaje en curso',
      endTrip: 'Finalizar viaje',
      completed: '✅ Viaje completado',
      earned: 'Ganaste en este viaje',
      totalSession: 'Ganancias de hoy',
      trips: 'carreras',
      ratePassenger: 'Califica al pasajero',
      submitRating: 'Enviar calificación',
      waiting: '⏳ Esperando solicitudes...',
      distance: 'Recorrido real',
      distToPass: 'Distancia a pasajero',
    },
    en: {
      online: '🟢 Online', offline: '🔴 Offline',
      connect: 'Go online to receive rides',
      disconnect: 'Go offline',
      newRequest: '🔔 New ride request',
      accept: 'Accept', reject: 'Reject',
      goingTo: '🚗 On the way to passenger',
      arrived: '📍 Arrived at passenger',
      startTrip: '🚀 Start trip',
      tripActive: '🛣️ Trip in progress',
      endTrip: 'End trip',
      completed: '✅ Trip completed',
      earned: 'You earned this trip',
      totalSession: "Today's earnings",
      trips: 'trips',
      ratePassenger: 'Rate the passenger',
      submitRating: 'Submit rating',
      waiting: '⏳ Waiting for requests...',
      distance: 'Actual trip distance',
      distToPass: 'Distance to passenger',
    },
  })[language] || {};

  useEffect(() => {
    requestLocationPermission();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (!isOnline || phase !== 'idle') return;
    const delay = 5000 + Math.random() * 5000;
    const timer = setTimeout(async () => {
      const pos          = driverPos || currentLocation;
      const originCoords = puntoCercano(pos.latitude, pos.longitude, 0.5, 2);
      const destCoords   = puntoCercano(originCoords.latitude, originCoords.longitude, 3, 5);
      const dist         = haversine(originCoords, destCoords);
      const distToPass   = haversine(pos, originCoords);
      const fare         = calcularTarifa(dist);
      setCurrentRequest({
        id:           Date.now().toString(),
        passenger:    NOMBRES[Math.floor(Math.random() * NOMBRES.length)],
        originCoords,
        destCoords,
        distKm:       parseFloat(dist.toFixed(1)),
        distToPassKm: parseFloat(distToPass.toFixed(1)),
        fare,
        date:         new Date().toISOString(),
      });
      // Geocodificación inversa para mostrar nombres en historial
      const [oName, dName] = await Promise.all([
        reverseGeocode(originCoords.latitude, originCoords.longitude, language),
        reverseGeocode(destCoords.latitude, destCoords.longitude, language),
      ]);
      setOriginName(oName);
      setDestName(dName);
      setPhase('request_incoming');
    }, delay);
    return () => clearTimeout(timer);
  }, [isOnline, phase]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) getCurrentLocation();
    } else { getCurrentLocation(); }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        const loc = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
        setCurrentLocation(loc);
        setDriverPos({ latitude, longitude });
        mapRef.current?.animateToRegion(loc, 1000);
      },
      err => console.log(err),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // Anima el carro a lo largo de un array de puntos y llama onComplete al terminar
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

  const acceptRequest = async () => {
    setPhase('going_to_passenger');
    setRouteToPassenger([]);
    setRouteToDestination([]);

    const from = driverPos || currentLocation;

    // FASE 1: obtener ruta conductor → pasajero y buscar ruta destino en paralelo
    const [leg1, leg2] = await Promise.all([
      fetchRoute(from, currentRequest.originCoords, language),
      fetchRoute(currentRequest.originCoords, currentRequest.destCoords, language),
    ]);

    const points1 = leg1?.points || [from, currentRequest.originCoords];
    const points2 = leg2?.points || [currentRequest.originCoords, currentRequest.destCoords];

    // Actualizar distancia real del viaje si la API respondió
    if (leg2?.distKm) {
      const realFare = calcularTarifa(leg2.distKm);
      setCurrentRequest(prev => ({
        ...prev,
        distKm: parseFloat(leg2.distKm.toFixed(1)),
        fare:   realFare,
      }));
    }

    setRouteToPassenger(points1);
    setRouteToDestination(points2);

    // Ajustar cámara para ver la ruta al pasajero
    mapRef.current?.fitToCoordinates(points1, {
      edgePadding: { top: 120, right: 60, bottom: 380, left: 60 }, animated: true,
    });

    // FASE 1: conductor → pasajero
    animateAlongRoute(points1, () => {
      setPhase('arrived_at_passenger');
    });
  };

  const rejectRequest = () => { setCurrentRequest(null); setPhase('idle'); };

  const startTrip = () => {
    setPhase('trip_active');
    setRouteToPassenger([]);  // limpiar traza de llegada

    // Ajustar cámara para ver la ruta al destino
    if (routeToDestination.length > 0) {
      mapRef.current?.fitToCoordinates(routeToDestination, {
        edgePadding: { top: 120, right: 60, bottom: 380, left: 60 }, animated: true,
      });
    }

    // FASE 2: pasajero → destino
    animateAlongRoute(routeToDestination, () => {
      setFareTotal(currentRequest.fare);
      setPhase('completed');
    });
  };

  const endTrip = () => setShowRating(true);

  const submitRating = () => {
    if (passengerRating === 0) {
      Alert.alert('', language === 'es' ? 'Selecciona una calificación' : 'Select a rating');
      return;
    }
    dispatch(addTrip({
      passenger:   currentRequest.passenger,
      origin:      originName || `${currentRequest.originCoords.latitude.toFixed(4)}, ${currentRequest.originCoords.longitude.toFixed(4)}`,
      destination: destName   || `${currentRequest.destCoords.latitude.toFixed(4)}, ${currentRequest.destCoords.longitude.toFixed(4)}`,
      fare:        currentRequest.fare,
      distKm:      currentRequest.distKm,
      rating:      passengerRating,
      date:        new Date().toISOString(),
      userType:    'driver',
    }));
    setShowRating(false);
    setCurrentRequest(null);
    setRouteToPassenger([]);
    setRouteToDestination([]);
    setPassengerRating(0);
    setOriginName('');
    setDestName('');
    setFareTotal(0);
    setPhase('idle');
  };

  const handleToggle = () => {
    if (isOnline) {
      Alert.alert(d.disconnect, language === 'es' ? '¿Deseas desconectarte?' : 'Go offline?', [
        { text: 'No', style: 'cancel' },
        { text: language === 'es' ? 'Sí' : 'Yes', onPress: () => { setIsOnline(false); setPhase('idle'); } },
      ]);
    } else { setIsOnline(true); }
  };

  const statusText = {
    idle:                 isOnline ? d.waiting : d.offline,
    going_to_passenger:   d.goingTo,
    arrived_at_passenger: d.arrived,
    trip_active:          d.tripActive,
    completed:            d.completed,
  }[phase] || '';

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={styles.map} region={currentLocation} showsUserLocation={false}>
        {driverPos && (
          <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.carMarker}><Text style={styles.carEmoji}>🚗</Text></View>
          </Marker>
        )}

        {/* Marcador del pasajero / punto de recogida */}
        {currentRequest && phase !== 'idle' && phase !== 'request_incoming' && (
          <Marker coordinate={currentRequest.originCoords} pinColor="green" title={currentRequest.passenger} />
        )}

        {/* Marcador del destino (visible desde que se inicia el viaje) */}
        {currentRequest && (phase === 'trip_active' || phase === 'completed' || phase === 'arrived_at_passenger') && (
          <Marker coordinate={currentRequest.destCoords} pinColor="red" />
        )}

        {/* Ruta hacia el pasajero (azul) */}
        {routeToPassenger.length > 0 && (
          <Polyline coordinates={routeToPassenger} strokeWidth={4} strokeColor="#1565C0" />
        )}

        {/* Ruta del viaje (negro) — visible desde arrived_at_passenger */}
        {routeToDestination.length > 0 && (phase === 'arrived_at_passenger' || phase === 'trip_active' || phase === 'completed') && (
          <Polyline coordinates={routeToDestination} strokeWidth={4} strokeColor="#1a1a1a" />
        )}
      </MapView>

      <View style={styles.topBar}>
        <View style={[styles.badge, isOnline ? styles.badgeOn : styles.badgeOff]}>
          <Text style={styles.badgeText}>{isOnline ? d.online : d.offline}</Text>
        </View>
      </View>

      {isOnline && (
        <View style={styles.earningsBar}>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsValue}>${earnings.totalEarnings.toLocaleString()}</Text>
            <Text style={styles.earningsLabel}>{d.totalSession}</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsItem}>
            <Text style={styles.earningsValue}>{earnings.tripsCompleted}</Text>
            <Text style={styles.earningsLabel}>{d.trips}</Text>
          </View>
        </View>
      )}

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.statusText}>{statusText}</Text>

        {phase === 'idle' && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>👤</Text>
              <Text style={styles.infoLabel}>{user.name}</Text>
            </View>
            {user.vehicle && (
              <View style={styles.infoRow}>
                <Text style={styles.infoEmoji}>🚘</Text>
                <Text style={styles.infoLabel}>{user.vehicle.model} · {user.vehicle.plate}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>⭐</Text>
              <Text style={styles.infoLabel}>{user.rating || '5.0'}</Text>
            </View>
            <TouchableOpacity style={[styles.btn, isOnline ? styles.btnRed : styles.btnBlack]} onPress={handleToggle}>
              <Text style={styles.btnText}>{isOnline ? d.disconnect : d.connect}</Text>
            </TouchableOpacity>
          </>
        )}

        {currentRequest && phase !== 'idle' && phase !== 'request_incoming' && (
          <View style={styles.tripCard}>
            <Text style={styles.tripPassenger}>👤 {currentRequest.passenger}</Text>
            <Text style={styles.tripDetail}>📏 {d.distance}: {currentRequest.distKm} km</Text>
            <Text style={styles.tripFare}>💰 ${currentRequest.fare?.toLocaleString()} COP</Text>
            {phase === 'going_to_passenger' && (
              <View style={styles.phaseIndicator}>
                <Text style={styles.phaseStep}>● Yendo al pasajero</Text>
                <Text style={styles.phaseStepGray}>○ Viaje al destino</Text>
              </View>
            )}
            {phase === 'arrived_at_passenger' && (
              <View style={styles.phaseIndicator}>
                <Text style={styles.phaseStepDone}>✓ Llegaste al pasajero</Text>
                <Text style={styles.phaseStepGray}>○ Viaje al destino</Text>
              </View>
            )}
            {phase === 'trip_active' && (
              <View style={styles.phaseIndicator}>
                <Text style={styles.phaseStepDone}>✓ Pasajero recogido</Text>
                <Text style={styles.phaseStep}>● Viaje en curso</Text>
              </View>
            )}
          </View>
        )}

        {phase === 'arrived_at_passenger' && (
          <TouchableOpacity style={[styles.btn, styles.btnBlack]} onPress={startTrip}>
            <Text style={styles.btnText}>{d.startTrip}</Text>
          </TouchableOpacity>
        )}

        {phase === 'completed' && (
          <>
            <View style={styles.earnedBox}>
              <Text style={styles.earnedLabel}>{d.earned}</Text>
              <Text style={styles.earnedValue}>${fareTotal.toLocaleString()} COP</Text>
              <Text style={styles.earnedSub}>
                Base ${TARIFA_BASE.toLocaleString()} + {currentRequest?.distKm} km × ${TARIFA_KM.toLocaleString()}
              </Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>{d.totalSession}</Text>
              <Text style={styles.totalValue}>${(earnings.totalEarnings + fareTotal).toLocaleString()} COP</Text>
            </View>
            <TouchableOpacity style={[styles.btn, styles.btnBlack]} onPress={endTrip}>
              <Text style={styles.btnText}>{d.endTrip} & {language === 'es' ? 'Calificar' : 'Rate'} ⭐</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal visible={phase === 'request_incoming'} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{d.newRequest}</Text>
            {currentRequest && (
              <>
                <Text style={styles.modalPassenger}>👤 {currentRequest.passenger}</Text>
                <View style={styles.modalRow}>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatVal}>{currentRequest.distToPassKm} km</Text>
                    <Text style={styles.modalStatLabel}>{d.distToPass}</Text>
                  </View>
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatVal}>{currentRequest.distKm} km</Text>
                    <Text style={styles.modalStatLabel}>{d.distance}</Text>
                  </View>
                </View>
                <View style={styles.fareChip}>
                  <Text style={styles.fareChipText}>💰 ${currentRequest.fare?.toLocaleString()} COP</Text>
                </View>
              </>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.rejectBtn]} onPress={rejectRequest}>
                <Text style={[styles.modalBtnText, { color: '#333' }]}>{d.reject}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.acceptBtn]} onPress={acceptRequest}>
                <Text style={styles.modalBtnText}>{d.accept}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showRating} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{d.ratePassenger}</Text>
            <Text style={styles.modalPassenger}>{currentRequest?.passenger}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setPassengerRating(star)}>
                  <Text style={styles.star}>{star <= passengerRating ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.btn, styles.btnBlack, { alignSelf: 'stretch' }]} onPress={submitRating}>
              <Text style={styles.btnText}>{d.submitRating}</Text>
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
  topBar: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' },
  badge: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 25, elevation: 6 },
  badgeOn: { backgroundColor: '#e8f5e9' },
  badgeOff: { backgroundColor: '#ffebee' },
  badgeText: { fontSize: 15, fontWeight: '700' },
  earningsBar: {
    position: 'absolute', bottom: 210, left: 16, right: 16,
    backgroundColor: '#1a1a1a', borderRadius: 16,
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 20,
    elevation: 8, alignItems: 'center', justifyContent: 'center',
  },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsValue: { fontSize: 22, fontWeight: '800', color: '#4ade80' },
  earningsLabel: { fontSize: 11, color: '#aaa', marginTop: 2 },
  earningsDivider: { width: 1, height: 36, backgroundColor: '#333' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 22,
    borderTopRightRadius: 22, padding: 20, paddingBottom: 32, elevation: 12,
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  statusText: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoEmoji: { fontSize: 20, marginRight: 10 },
  infoLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
  btn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 6 },
  btnBlack: { backgroundColor: '#1a1a1a' },
  btnRed: { backgroundColor: '#e53935' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tripCard: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, marginBottom: 10 },
  tripPassenger: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  tripDetail: { fontSize: 13, color: '#555', marginBottom: 4 },
  tripFare: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  phaseIndicator: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 8 },
  phaseStep: { fontSize: 12, color: '#1a1a1a', fontWeight: '700', marginBottom: 3 },
  phaseStepDone: { fontSize: 12, color: '#2e7d32', fontWeight: '600', marginBottom: 3 },
  phaseStepGray: { fontSize: 12, color: '#bbb', marginBottom: 3 },
  earnedBox: { backgroundColor: '#e8f5e9', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 8 },
  earnedLabel: { fontSize: 12, color: '#555', marginBottom: 2 },
  earnedValue: { fontSize: 28, fontWeight: '800', color: '#2e7d32' },
  earnedSub: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f0f4ff', borderRadius: 12, padding: 12, marginBottom: 8 },
  totalLabel: { fontSize: 13, color: '#555', alignSelf: 'center' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  carMarker: { backgroundColor: '#fff', borderRadius: 20, padding: 4, elevation: 6 },
  carEmoji: { fontSize: 26 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalPassenger: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  modalRow: { flexDirection: 'row', width: '100%', backgroundColor: '#f5f5f5', borderRadius: 14, padding: 14, marginBottom: 12 },
  modalStat: { flex: 1, alignItems: 'center' },
  modalStatVal: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  modalStatLabel: { fontSize: 11, color: '#888', textAlign: 'center' },
  modalStatDivider: { width: 1, backgroundColor: '#ddd', marginHorizontal: 8 },
  fareChip: { backgroundColor: '#f0fff4', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginBottom: 16 },
  fareChipText: { fontSize: 22, fontWeight: '800', color: '#2e7d32' },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  rejectBtn: { backgroundColor: '#f0f0f0' },
  acceptBtn: { backgroundColor: '#1a1a1a' },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  starsRow: { flexDirection: 'row', marginVertical: 18 },
  star: { fontSize: 42, marginHorizontal: 5 },
});

export default DriverHomeScreen;