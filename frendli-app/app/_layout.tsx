import '../global.css';

import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { useNotifications } from '../hooks/useNotifications';
import { useSafetyEvents } from '../hooks/useSafetyEvents';
import '../lib/safety-location';
import * as Notifications from 'expo-notifications';
import { cancelSafeArrivalNotifications, confirmUserSafe } from '../lib/safety-location';
import 'react-native-reanimated';
import { StripeProvider } from '@stripe/stripe-react-native';
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
  const userId = useAuthStore(state => state.userId);
  const profile = useAuthStore(state => state.profile);
  const isHydrated = useAuthStore(state => state._hasHydrated);
  const setAuth = useAuthStore(state => state.setAuth);
  const setProfile = useAuthStore(state => state.setProfile);
  const setOnboarded = useAuthStore(state => state.setOnboarded);
  const clearAuth = useAuthStore(state => state.clearAuth);
  
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  // 1. Sync Supabase Auth to Zustand
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuth(session.user.id);
      } else {
        clearAuth();
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
          setAuth(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          clearAuth();
        }
      }
    );
    return () => authListener.subscription.unsubscribe();
  }, []);

  // 2. Fetch profile if logged in but data is missing (e.g. fresh install/cache clear)
  useEffect(() => {
    if (isHydrated && userId && !profile) {
      import('../lib/api').then(({ profileApi }) => {
        profileApi.get()
          .then(data => {
            if (data) {
              setProfile(data);
              // If they have a first name and photos, they are probably onboarded
              if (data.firstName && data.photos?.length > 0) {
                setOnboarded(true);
              }
            }
          })
          .catch(err => console.log('AuthGuard: Profile fetch failed', err));
      });
    }
  }, [isHydrated, userId, profile]);

  const inAuthGroup = segments[0] === 'auth';

  // 3. Navigation Guard
  useEffect(() => {
    // CRITICAL: Wait for BOTH hydration AND navigation state
    if (!isHydrated || !rootNavigationState?.key) return;

    if (onboarded) {
      // If onboarded, don't allow auth screens or landing page
      const isAtRoot = !segments[0];
      if (inAuthGroup || isAtRoot) {
        router.replace('/(tabs)');
      }
    } else {
      // If they are logged in (have a userId) but NOT onboarded,
      // force them into correctly starting/finishing onboarding
      if (userId) {
        if (!inAuthGroup) {
          // Send to the start of onboarding so all steps are completed
          // (profile-basics → friendship-style → interests → availability → photos)
          router.replace('/auth/profile-basics');
        }
      } else {
        // GUEST MODE: Allow Discover, Hangouts, Perks. Block others.
        const PROTECTED_TABS = ['messages', 'profile', 'friends'];
        const isProtected =
          segments[0] === 'edit-profile' ||
          segments[0] === 'settings' ||
          segments[0] === 'chat' ||
          // Native: segments = ['(tabs)', 'friends']
          (segments[0] === '(tabs)' && typeof segments[1] === 'string' && PROTECTED_TABS.includes(segments[1])) ||
          // Web: segments = ['friends'] (transparent group, no '(tabs)' prefix)
          PROTECTED_TABS.includes(segments[0] as string);

        if (isProtected) {
          // Use '/auth/phone' instead of '/' — on web, '/' is ambiguous with the
          // (tabs) group index (Discover), so guests would land on Discover instead
          // of the Welcome/login screen.
          router.replace('/auth/phone');
        }
      }
    }
  }, [onboarded, userId, segments, isHydrated, rootNavigationState?.key]);

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
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.hangoutId && (data?.stage === 1 || data?.stage === 2)) {
        confirmUserSafe();
        cancelSafeArrivalNotifications(data.hangoutId);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
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
          <Stack.Screen name="safety/id-verification" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthGuard>
    </StripeProvider>
  );
}
