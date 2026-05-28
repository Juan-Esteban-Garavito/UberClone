import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import colors from '../constants/colors';
import { formatCurrency } from '../utils/formatters';

const VehicleCard = ({ vehicle, selected, onSelect }) => {
  const typeColors = {
    'Económico': colors.economico,
    'XL': colors.xl,
    'Premium': colors.premium,
  };

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={() => onSelect(vehicle)}
    >
      <View style={[styles.badge, { backgroundColor: typeColors[vehicle.type] || colors.primary }]}>
        <Text style={styles.badgeText}>{vehicle.type}</Text>
      </View>
      <Text style={styles.time}>{vehicle.time}</Text>
      <Text style={styles.price}>{formatCurrency(vehicle.price)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});

export default VehicleCard;