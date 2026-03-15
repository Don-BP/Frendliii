import '../global.css';

import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotifications } from '../hooks/useNotifications';
import { useSafetyEvents } from '../hooks/useSafetyEvents';
import '../lib/safety-location';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold
} from '@expo-google-fonts/lexend';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const onboarded = useAuthStore(state => state.isOnboarded);
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Basic way to check hydration if store doesn't expose it directly in a hook
    // Or just wait one tick
    setIsHydrated(true);
  }, []);

  const inAuthGroup = segments[0] === 'auth';

  useEffect(() => {
    if (!isHydrated || !rootNavigationState?.key) return;

    if (onboarded) {
      // If onboarded, don't allow auth screens or landing page
      const isAtRoot = !segments[0];
      if (inAuthGroup || isAtRoot) {
        router.replace('/(tabs)');
      }
    } else {
      // If not onboarded, only allow auth group or landing page
      if (segments.length > 0 && !inAuthGroup) {
        router.replace('/');
      }
    }
  }, [onboarded, segments, router, rootNavigationState?.key, isHydrated]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });

  useNotifications();
  useSafetyEvents();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthGuard>
      <Stack screenOptions={{
        headerShown: false,
        animation: 'fade',
        headerTitleStyle: {
          fontFamily: 'BricolageGrotesque_700Bold',
        }
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/phone" />
        <Stack.Screen name="auth/interests" />
        <Stack.Screen name="auth/profile-basics" />
        <Stack.Screen name="auth/friendship-style" />
        <Stack.Screen name="auth/availability" />
        <Stack.Screen name="auth/photos" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="hangouts/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="hangouts/create" options={{ presentation: 'modal', headerShown: true, title: 'Host a Hangout' }} />
        <Stack.Screen name="groups/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="groups/create" options={{ presentation: 'modal', headerShown: true, title: 'Create Group' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal', headerShown: true, title: 'Edit Profile' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: true, title: 'Settings' }} />
        <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="corporate" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="plus" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </AuthGuard>
  );
}
