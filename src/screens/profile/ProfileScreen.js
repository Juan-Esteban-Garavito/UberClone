import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, clearUser } from '../../redux/slices/userSlice';
import useTranslation from '../../hooks/useTranslation';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user);
  const { t, language } = useTranslation();

  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [gender, setGender] = useState(user.gender || '');
  const [selectedLanguage, setSelectedLanguage] = useState(user.language || 'es');

  const genderOptions = [
    { value: 'male', label: t.male, emoji: '👨' },
    { value: 'female', label: t.female, emoji: '👩' },
    { value: 'other', label: t.other, emoji: '🧑' },
    { value: 'none', label: t.noSay, emoji: '🤐' },
  ];

  const handleSave = async () => {
    if (!name || !phone) {
      Alert.alert('Error', t.errorFields);
      return;
    }
    if (name.length > 50) {
      Alert.alert('Error', t.errorName);
      return;
    }
    if (isNaN(phone)) {
      Alert.alert('Error', t.errorPhone);
      return;
    }
    try {
      await firestore().collection('users').doc(user.uid).update({
        name, phone, gender, language: selectedLanguage,
      });
      dispatch(updateProfile({ name, phone, gender, language: selectedLanguage }));
      Alert.alert('✅', t.profileUpdated);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleLogout = () => {
    dispatch(clearUser());
  };

  const changeLanguage = (lang) => {
    setSelectedLanguage(lang);
    dispatch(updateProfile({ language: lang }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t.profile}</Text>

      <TouchableOpacity style={styles.photoContainer}>
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoText}>📷</Text>
        </View>
        <Text style={styles.photoLabel}>{t.tapToChangePhoto}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{t.name}</Text>
      <TextInput style={styles.input} value={name}
        onChangeText={setName} maxLength={50}
        placeholderTextColor="#999" />

      <Text style={styles.label}>{t.phone}</Text>
      <TextInput style={styles.input} value={phone}
        onChangeText={setPhone} keyboardType="numeric"
        placeholderTextColor="#999" />

      <Text style={styles.label}>{t.email}</Text>
      <TextInput style={[styles.input, styles.disabled]}
        value={user.email} editable={false} />

      <Text style={styles.label}>{t.gender}</Text>
      <View style={styles.genderContainer}>
        {genderOptions.map(item => (
          <TouchableOpacity
            key={item.value}
            style={[styles.genderButton, gender === item.value && styles.genderSelected]}
            onPress={() => setGender(item.value)}
          >
            <Text style={styles.genderEmoji}>{item.emoji}</Text>
            <Text style={[styles.genderText, gender === item.value && styles.genderTextSelected]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t.language}</Text>
      <View style={styles.langContainer}>
        <TouchableOpacity
          style={[styles.langOption, selectedLanguage === 'es' && styles.langActive]}
          onPress={() => changeLanguage('es')}
        >
          <Text style={[styles.langText, selectedLanguage === 'es' && styles.langTextActive]}>
            🇨🇴 Español
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.langOption, selectedLanguage === 'en' && styles.langActive]}
          onPress={() => changeLanguage('en')}
        >
          <Text style={[styles.langText, selectedLanguage === 'en' && styles.langTextActive]}>
            🇺🇸 English
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>{t.saveChanges}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{ backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 }} 
        onPress={() => navigation.navigate('Test')}
      >
        <Text style={{ color: '#4ade80', fontSize: 14, fontWeight: '700' }}>🔬 Test API</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t.logout}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  photoContainer: { alignItems: 'center', marginBottom: 24 },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center',
  },
  photoText: { fontSize: 32 },
  photoLabel: { marginTop: 8, color: '#555' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    padding: 12, marginBottom: 16, fontSize: 16, color: '#333',
  },
  disabled: { backgroundColor: '#f9f9f9', color: '#999' },
  genderContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 16,
  },
  genderButton: {
    borderWidth: 1, borderColor: '#ccc',
    borderRadius: 10, padding: 10,
    alignItems: 'center', width: '47%',
  },
  genderSelected: {
    borderColor: '#000', backgroundColor: '#f0f0f0',
  },
  genderEmoji: { fontSize: 24, marginBottom: 4 },
  genderText: { fontSize: 13, color: '#555', textAlign: 'center' },
  genderTextSelected: { color: '#000', fontWeight: '600' },
  langContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  langOption: {
    flex: 1, borderWidth: 1, borderColor: '#ccc',
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  langActive: { backgroundColor: '#000', borderColor: '#000' },
  langText: { fontSize: 14, fontWeight: '600', color: '#333' },
  langTextActive: { color: '#fff' },
  button: {
    backgroundColor: '#000', borderRadius: 10,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logoutButton: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  logoutText: { fontSize: 16, color: '#555' },
  testBtn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  testBtnText: { color: '#4ade80', fontSize: 14, fontWeight: '700' },
});

export default ProfileScreen;