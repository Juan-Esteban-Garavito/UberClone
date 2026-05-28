import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, updateProfile } from '../../redux/slices/userSlice';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const language = useSelector(state => state.user.language);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState(language);

  const t = {
    es: {
      email: 'Correo electrónico', password: 'Contraseña',
      login: 'Iniciar sesión', noAccount: '¿No tienes cuenta? Regístrate',
      errorFields: 'Todos los campos son requeridos', errorEmail: 'Correo inválido',
    },
    en: {
      email: 'Email', password: 'Password',
      login: 'Log In', noAccount: "Don't have an account? Register",
      errorFields: 'All fields are required', errorEmail: 'Invalid email',
    },
  }[selectedLang] || {};

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const changeLanguage = (lang) => {
    setSelectedLang(lang);
    dispatch(updateProfile({ language: lang }));
  };

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', t.errorFields); return; }
    if (!validateEmail(email)) { Alert.alert('Error', t.errorEmail); return; }
    setLoading(true);
    try {
      const result = await auth().signInWithEmailAndPassword(email, password);
      const userDoc = await firestore()
        .collection('users')
        .doc(result.user.uid)
        .get();
      const ud = userDoc.data() || {};
      dispatch(setUser({
        uid: result.user.uid,
        email: result.user.email,
        name: ud.name || '',
        phone: ud.phone || '',
        gender: ud.gender || '',
        language: ud.language || selectedLang,
        userType: ud.userType || 'passenger',
        vehicle: ud.vehicle || null,
        rating: ud.rating || null,
      }));
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.langContainer}>
        <TouchableOpacity
          style={[styles.langOption, selectedLang === 'es' && styles.langActive]}
          onPress={() => changeLanguage('es')}>
          <Text style={[styles.langText, selectedLang === 'es' && styles.langTextActive]}>🇨🇴 ES</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.langOption, selectedLang === 'en' && styles.langActive]}
          onPress={() => changeLanguage('en')}>
          <Text style={[styles.langText, selectedLang === 'en' && styles.langTextActive]}>🇺🇸 EN</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>UberClone</Text>

      <TextInput style={styles.input} placeholder={t.email}
        value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none"
        placeholderTextColor="#999" />
      <TextInput style={styles.input} placeholder={t.password}
        value={password} onChangeText={setPassword}
        secureTextEntry placeholderTextColor="#999" />

      {loading ? <ActivityIndicator size="large" color="#000" /> : (
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>{t.login}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>{t.noAccount}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  langContainer: { position: 'absolute', top: 50, right: 24, flexDirection: 'row', gap: 8 },
  langOption: { backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#ddd' },
  langActive: { backgroundColor: '#000', borderColor: '#000' },
  langText: { fontSize: 13, fontWeight: '600', color: '#333' },
  langTextActive: { color: '#fff' },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16, color: '#333' },
  button: { backgroundColor: '#000', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#555', marginTop: 8 },
});

export default LoginScreen;