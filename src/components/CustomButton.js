import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import colors from '../constants/colors';

const CustomButton = ({ title, onPress, disabled, loading, variant = 'primary' }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'secondary' && styles.secondary,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#000'} />
      ) : (
        <Text style={[
          styles.text,
          variant === 'secondary' && styles.textSecondary,
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  secondary: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  disabled: {
    backgroundColor: colors.border,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textSecondary: {
    color: colors.primary,
  },
});

export default CustomButton;