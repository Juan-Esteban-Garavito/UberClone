import React, { useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, SectionList,
} from 'react-native';
import { useSelector } from 'react-redux';
import useTranslation from '../../hooks/useTranslation';

const HistoryScreen = () => {
  const { language } = useTranslation();
  const earnings = useSelector(state => state.earnings);
  const user     = useSelector(state => state.user);
  const isDriver = user.userType === 'driver';

  // Cada usuario solo ve sus propios viajes
  const myHistory = earnings.history.filter(t => t.userType === user.userType);

  const d = ({
    es: {
      title:        'Historial de carreras',
      noTrips:      'Aún no tienes carreras registradas.\nCompleta tu primer viaje para verlo aquí.',
      earned:       'Ganaste',
      paid:         'Pagaste',
      distance:     'Distancia',
      rating:       'Calificación al pasajero',
      ratingDriver: 'Calificación al conductor',
      total:        'Total del día',
      tripsLabel:   'carreras',
      today:        'Resumen general',
      km:           'km',
      allTime:      'Total acumulado',
      allTrips:     'Todas las carreras',
      today2:       'Hoy',
      yesterday:    'Ayer',
    },
    en: {
      title:        'Trip history',
      noTrips:      'No trips yet.\nComplete your first ride to see it here.',
      earned:       'Earned',
      paid:         'Paid',
      distance:     'Distance',
      rating:       'Passenger rating',
      ratingDriver: 'Driver rating',
      total:        "Day's total",
      tripsLabel:   'trips',
      today:        'Overall summary',
      km:           'km',
      allTime:      'All-time total',
      allTrips:     'All trips',
      today2:       'Today',
      yesterday:    'Yesterday',
    },
  })[language] || {};

  // Agrupa los viajes por día y calcula totales por día
  const sections = useMemo(() => {
    if (!myHistory.length) return [];

    const groups = {};
    myHistory.forEach(item => {
      if (!item.date) return;
      const dateObj = new Date(item.date);
      // Clave: YYYY-MM-DD para ordenar correctamente
      const key = dateObj.toISOString().slice(0, 10);
      if (!groups[key]) groups[key] = { key, items: [], totalFare: 0, tripCount: 0 };
      groups[key].items.push(item);
      groups[key].totalFare += item.fare || 0;
      groups[key].tripCount += 1;
    });

    // Ordenar días de más reciente a más antiguo
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [myHistory]);

  // Etiqueta amigable para la fecha del encabezado
  const dayLabel = (key) => {
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (key === today)     return d.today2;
    if (key === yesterday) return d.yesterday;
    const [year, month, day] = key.split('-');
    return language === 'es'
      ? `${parseInt(day)} de ${new Date(key).toLocaleString('es-CO', { month: 'long' })} ${year}`
      : new Date(key + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(
        language === 'es' ? 'es-CO' : 'en-US',
        { hour: '2-digit', minute: '2-digit' },
      );
    } catch { return ''; }
  };

  const renderTripCard = (item, index, total) => (
    <View style={styles.card} key={item.id || item.date}>
      <View style={styles.cardHeader}>
        <View style={styles.tripNumBadge}>
          <Text style={styles.tripNumText}>#{total - index}</Text>
        </View>
        <Text style={styles.cardDate}>{formatTime(item.date)}</Text>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routeDots}>
          <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
          <View style={styles.routeLine} />
          <View style={[styles.dot, { backgroundColor: '#f44336' }]} />
        </View>
        <View style={styles.routeTexts}>
          <Text style={styles.routeText} numberOfLines={1}>{item.origin}</Text>
          <Text style={styles.routeText} numberOfLines={1}>{item.destination}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{item.distKm} {d.km}</Text>
          <Text style={styles.statLabel}>{d.distance}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: isDriver ? '#2e7d32' : '#1a1a1a' }]}>
            ${item.fare?.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>{isDriver ? d.earned : d.paid}</Text>
        </View>
        {item.rating && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{'⭐'.repeat(item.rating)}</Text>
              <Text style={styles.statLabel}>{isDriver ? d.rating : d.ratingDriver}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  // Encabezado de sección (un día)
  const renderDayHeader = (section) => (
    <View style={styles.dayHeader}>
      <View style={styles.dayHeaderLeft}>
        <Text style={styles.dayLabel}>{dayLabel(section.key)}</Text>
        <Text style={styles.dayTrips}>{section.tripCount} {d.tripsLabel}</Text>
      </View>
      {isDriver && (
        <View style={styles.dayTotalBox}>
          <Text style={styles.dayTotalValue}>${section.totalFare.toLocaleString()}</Text>
          <Text style={styles.dayTotalLabel}>{d.total}</Text>
        </View>
      )}
      {!isDriver && (
        <View style={[styles.dayTotalBox, { backgroundColor: '#f0f4ff' }]}>
          <Text style={[styles.dayTotalValue, { color: '#1a1a1a' }]}>${section.totalFare.toLocaleString()}</Text>
          <Text style={styles.dayTotalLabel}>{d.total}</Text>
        </View>
      )}
    </View>
  );

  // Gran total acumulado (toda la historia)
  const grandTotal = useMemo(() =>
    myHistory.reduce((sum, t) => sum + (t.fare || 0), 0),
    [myHistory]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{d.title}</Text>

      {/* Tarjeta de resumen general */}
      {myHistory.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{d.today}</Text>
          <Text style={styles.summaryEarnings}>${grandTotal.toLocaleString()} COP</Text>
          <Text style={styles.summaryTrips}>{myHistory.length} {d.allTrips}</Text>
          {isDriver && sections.length > 0 && (
            <View style={styles.summaryTodayRow}>
              <Text style={styles.summaryTodayLabel}>{d.today2}: </Text>
              <Text style={styles.summaryTodayVal}>
                {sections[0].tripCount} {d.tripsLabel} · ${sections[0].totalFare.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      )}

      {myHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🚗</Text>
          <Text style={styles.emptyText}>{d.noTrips}</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={section => section.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item: section }) => (
            <View>
              {renderDayHeader(section)}
              {section.items.map((trip, idx) =>
                renderTripCard(trip, idx, myHistory.length)
              )}
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f7f7f7', paddingHorizontal: 16, paddingTop: 16 },
  title:      { fontSize: 22, fontWeight: '800', marginBottom: 16, color: '#1a1a1a' },

  // Resumen general
  summaryCard: {
    backgroundColor: '#1a1a1a', borderRadius: 18,
    padding: 20, marginBottom: 16, alignItems: 'center',
  },
  summaryLabel:    { fontSize: 12, color: '#aaa', marginBottom: 4 },
  summaryEarnings: { fontSize: 32, fontWeight: '900', color: '#4ade80', marginBottom: 2 },
  summaryTrips:    { fontSize: 13, color: '#888' },
  summaryTodayRow: { flexDirection: 'row', marginTop: 8, backgroundColor: '#333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  summaryTodayLabel: { fontSize: 13, color: '#aaa' },
  summaryTodayVal:   { fontSize: 13, color: '#4ade80', fontWeight: '700' },

  // Encabezado de día
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, marginTop: 8, paddingHorizontal: 4,
  },
  dayHeaderLeft: { flex: 1 },
  dayLabel:      { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  dayTrips:      { fontSize: 12, color: '#888', marginTop: 1 },
  dayTotalBox:   { backgroundColor: '#e8f5e9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'flex-end' },
  dayTotalValue: { fontSize: 16, fontWeight: '800', color: '#2e7d32' },
  dayTotalLabel: { fontSize: 10, color: '#888', marginTop: 1 },

  // Tarjeta de carrera
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 12,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tripNumBadge: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tripNumText:  { fontSize: 13, fontWeight: '700', color: '#555' },
  cardDate:     { fontSize: 12, color: '#aaa' },

  routeRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  routeDots:  { alignItems: 'center', marginRight: 12, width: 12 },
  dot:        { width: 12, height: 12, borderRadius: 6 },
  routeLine:  { width: 2, height: 20, backgroundColor: '#ddd', marginVertical: 3 },
  routeTexts: { flex: 1 },
  routeText:  { fontSize: 13, color: '#444', marginVertical: 3, fontWeight: '500' },

  statsRow:    { flexDirection: 'row', backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12 },
  statItem:    { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 },
  statLabel:   { fontSize: 10, color: '#999', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 4 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyEmoji:     { fontSize: 64, marginBottom: 16 },
  emptyText:      { fontSize: 15, color: '#aaa', textAlign: 'center', lineHeight: 22 },
});

export default HistoryScreen;