import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { socket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';

export function useSafetyEvents() {
    const router = useRouter();
    const { userId } = useAuthStore();

    useEffect(() => {
        if (!userId) return;

        // Ensure socket is connected and authenticated
        if (!socket.connected) {
            socket.connect();
        }

        const handleSoftCheck = (data: { hangoutId: string }) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
                'SafeArrival Check-in 👋',
                'We noticed you haven\'t checked into your meetup yet. Is everything okay?',
                [
                    { 
                        text: 'I\'m Safe (Check-in Now)', 
                        onPress: () => router.push(`/hangouts/${data.hangoutId}` as any) 
                    },
                    { text: 'Ignore', style: 'cancel' }
                ]
            );
        };

        const handleCriticalAlert = (data: { hangoutId: string }) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            // Navigate to the escalation screen immediately
            router.push({
                pathname: '/safety/escalation',
                params: { stage: '2', hangoutId: data.hangoutId }
            } as any);
        };

        socket.on('safety_soft_check', handleSoftCheck);
        socket.on('safety_critical_alert', handleCriticalAlert);

        return () => {
            socket.off('safety_soft_check', handleSoftCheck);
            socket.off('safety_critical_alert', handleCriticalAlert);
        };
    }, [userId, router]);
}
