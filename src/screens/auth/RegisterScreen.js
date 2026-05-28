import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../../redux/slices/userSlice';

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const language = useSelector(state => state.user.language);

  const [userType, setUserType] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');

  const labels = {
    es: {
      title: 'Crear cuenta',
      selectType: '¿Cómo quieres registrarte?',
      passenger: '🧍 Pasajero',
      driver: '🚗 Conductor',
      name: 'Nombre completo',
      email: 'Correo electrónico',
      phone: 'Número de celular',
      password: 'Contraseña',
      gender: 'Género',
      male: 'Masculino',
      female: 'Femenino',
      other: 'Otro',
      noSay: 'No decir',
      plate: 'Placa del vehículo',
      model: 'Modelo del vehículo',
      color: 'Color del vehículo',
      register: 'Registrarse',
      hasAccount: '¿Ya tienes cuenta? Inicia sesión',
      errorFields: 'Todos los campos son requeridos',
      errorName: 'Nombre máximo 50 caracteres',
      errorEmail: 'Correo inválido',
      errorPhone: 'Teléfono inválido',
    },
    en: {
      title: 'Create account',
      selectType: 'How do you want to register?',
      passenger: '🧍 Passenger',
      driver: '🚗 Driver',
      name: 'Full name',
      email: 'Email',
      phone: 'Phone number',
      password: 'Password',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      noSay: 'Not say',
      plate: 'Vehicle plate',
      model: 'Vehicle model',
      color: 'Vehicle color',
      register: 'Register',
      hasAccount: 'Already have an account? Log in',
      errorFields: 'All fields are required',
      errorName: 'Name max 50 characters',
      errorEmail: 'Invalid email',
      errorPhone: 'Invalid phone',
    },
  };
  const t = labels[language] || labels.es;

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleRegister = async () => {
    if (!name || !email || !phone || !password || !gender) {
      Alert.alert('Error', t.errorFields);
      return;
    }
    if (name.length > 50) {
      Alert.alert('Error', t.errorName);
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', t.errorEmail);
      return;
    }
    if (isNaN(phone) || phone.length < 7) {
      Alert.alert('Error', t.errorPhone);
      return;
    }
    if (userType === 'driver' && (!vehiclePlate || !vehicleModel || !vehicleColor)) {
      Alert.alert('Error', t.errorFields);
      return;
    }
    setLoading(true);
    try {
      const result = await auth().createUserWithEmailAndPassword(email, password);
      const userData = {
        name, email, phone, gender,
        language, userType,
        photo: null,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      if (userType === 'driver') {
        userData.vehicle = { plate: vehiclePlate, model: vehicleModel, color: vehicleColor };
        userData.isAvailable = false;
        userData.rating = 5.0;
      }
      await firestore().collection('users').doc(result.user.uid).set(userData);
      dispatch(setUser({ uid: result.user.uid, name, email, phone, gender, userType, language }));
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const genderOptions = [
    { value: 'male', label: t.male, emoji: '👨' },
    { value: 'female', label: t.female, emoji: '👩' },
    { value: 'other', label: t.other, emoji: '🧑' },
    { value: 'none', label: t.noSay, emoji: '🤐' },
  ];

  if (!userType) {
    return (
      <View style={styles.typeContainer}>
        <Text style={styles.typeTitle}>{t.selectType}</Text>
        <TouchableOpacity style={styles.typeButton} onPress={() => setUserType('passenger')}>
          <Text style={styles.typeButtonText}>{t.passenger}</Text>
          <Text style={styles.typeSubtext}>
            {language === 'es' ? 'Solicita viajes fácilmente' : 'Request rides easily'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.typeButton, styles.driverButton]} onPress={() => setUserType('driver')}>
          <Text style={[styles.typeButtonText, { color: '#fff' }]}>{t.driver}</Text>
          <Text style={[styles.typeSubtext, { color: '#ccc' }]}>
            {language === 'es' ? 'Genera ingresos conduciendo' : 'Earn money driving'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>{t.hasAccount}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => setUserType(null)} style={styles.backButton}>
        <Text style={styles.backText}>← {userType === 'driver' ? t.driver : t.passenger}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t.title}</Text>

      <TextInput style={styles.input} placeholder={t.name}
        value={name} onChangeText={setName}
        maxLength={50} placeholderTextColor="#999" />

      <TextInput style={styles.input} placeholder={t.email}
        value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none"
        placeholderTextColor="#999" />

      <TextInput style={styles.input} placeholder={t.phone}
        value={phone} onChangeText={setPhone}
        keyboardType="numeric" placeholderTextColor="#999" />

      <TextInput style={styles.input} placeholder={t.password}
        value={password} onChangeText={setPassword}
        secureTextEntry placeholderTextColor="#999" />

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

      {userType === 'driver' && (
        <>
          <TextInput style={styles.input} placeholder={t.plate}
            value={vehiclePlate} onChangeText={setVehiclePlate}
            autoCapitalize="characters" placeholderTextColor="#999" />
          <TextInput style={styles.input} placeholder={t.model}
            value={vehicleModel} onChangeText={setVehicleModel}
            placeholderTextColor="#999" />
          <TextInput style={styles.input} placeholder={t.color}
            value={vehicleColor} onChangeText={setVehicleColor}
            placeholderTextColor="#999" />
        </>
      )}

      {loading ? <ActivityIndicator size="large" color="#000" /> : (
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>{t.register}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>{t.hasAccount}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  typeContainer: {
    flex: 1, justifyContent: 'center',
    padding: 24, backgroundColor: '#fff',
  },
  typeTitle: {
    fontSize: 22, fontWeight: '700',
    textAlign: 'center', marginBottom: 32,
  },
  typeButton: {
    borderWidth: 1, borderColor: '#000',
    borderRadius: 16, padding: 24,
    marginBottom: 16, alignItems: 'center',
  },
  driverButton: { backgroundColor: '#000' },
  typeButtonText: { fontSize: 22, fontWeight: '700', color: '#000' },
  typeSubtext: { fontSize: 14, color: '#555', marginTop: 4 },
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff' },
  backButton: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#555' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    padding: 14, marginBottom: 16, fontSize: 16, color: '#333',
  },
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
  button: {
    backgroundColor: '#000', borderRadius: 10,
    padding: 16, alignItems: 'center', marginBottom: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#555', marginTop: 8 },
});

export default RegisterScreen;