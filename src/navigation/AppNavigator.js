import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import TripScreen from '../screens/trip/TripScreen';
import TrackingScreen from '../screens/tracking/TrackingScreen';
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const PassengerTabs = () => {
  const language = useSelector(state => state.user.language);
  const labels = {
    es: { ride: 'Viaje', history: 'Historial', profile: 'Perfil' },
    en: { ride: 'Ride', history: 'History', profile: 'Profile' },
  };
  const t = labels[language] || labels.es;
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t.ride }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t.history }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t.profile }} />
    </Tab.Navigator>
  );
};

const DriverTabs = () => {
  const language = useSelector(state => state.user.language);
  const labels = {
    es: { home: 'Inicio', history: 'Historial', profile: 'Perfil' },
    en: { home: 'Home', history: 'History', profile: 'Profile' },
  };
  const t = labels[language] || labels.es;
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="DriverHome" component={DriverHomeScreen} options={{ tabBarLabel: t.home }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t.history }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t.profile }} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const isLoggedIn = useSelector(state => state.user.isLoggedIn);
  const userType   = useSelector(state => state.user.userType);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen
              name="Main"
              component={userType === 'driver' ? DriverTabs : PassengerTabs}
            />
            <Stack.Screen name="Trip"     component={TripScreen} />
            <Stack.Screen name="Tracking" component={TrackingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;