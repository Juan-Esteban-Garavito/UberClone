import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';
import { formatCurrency, formatDate } from '../utils/formatters';

const TripCard = ({ trip }) => {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.icon}>📍</Text>
        <Text style={styles.location} numberOfLines={1}>{trip.origin}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.icon}>🏁</Text>
        <Text style={styles.location} numberOfLines={1}>{trip.destination}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.vehicle}>🚗 {trip.vehicle}</Text>
        <Text style={styles.fare}>{formatCurrency(trip.fare)}</Text>
      </View>
      <Text style={styles.date}>{formatDate(trip.createdAt)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: { fontSize: 16, marginRight: 8 },
  location: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  vehicle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  fare: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
});

export default TripCard;