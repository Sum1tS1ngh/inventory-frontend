import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen         from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen          from './src/screens/HomeScreen';
import SellingScreen       from './src/screens/SellingScreen';
import ReportsScreen       from './src/screens/ReportsScreen';
import { COLORS } from './src/utils/theme';

const Stack = createNativeStackNavigator();

// ── Auth Stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// ── App Stack (authenticated) ─────────────────────────────────────────────────
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"     component={HomeScreen} />
      <Stack.Screen name="Selling"  component={SellingScreen} />
      <Stack.Screen name="Reports"  component={ReportsScreen} />
    </Stack.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return token ? <AppStack /> : <AuthStack />;
}

// ── App Entry ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
