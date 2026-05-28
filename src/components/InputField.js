import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import colors from '../constants/colors';

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  editable = true,
  maxLength,
  error,
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          !editable && styles.disabled,
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        editable={editable}
        maxLength={maxLength}
        placeholderTextColor={colors.textMuted}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  disabled: {
    backgroundColor: colors.surface,
    color: colors.textMuted,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
});

export default InputField;