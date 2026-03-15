import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/authStore';
import { safetyApi, apiRequest } from '../lib/api';

export function useSilentSOS() {
    const { userId } = useAuthStore();

    const handleSOS = useCallback(async () => {
        try {
            // First haptic sequence to acknowledge trigger
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            
            // In a real app we'd fetch actual location here
            const latitude = 37.7749;
            const longitude = -122.4194;
            
            // Trigger SOS api endpoint
            const data = await safetyApi.triggerSOS({ latitude, longitude });

            if (data) {
                // Second haptic sequence to confirm sent
                setTimeout(async () => {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }, 500);
                console.log('Silent SOS activated successfully.');

                // Added escalation logic
                Alert.alert(
                    'SOS Activated',
                    'Your emergency contacts have been notified.',
                    [
                        { 
                            text: 'I\'m Safe (Cancel)', 
                            style: 'cancel',
                            onPress: async () => {
                                try {
                                    await apiRequest('/api/safety/sos/cancel', { method: 'POST' });
                                    Alert.alert('Cancelled', 'Your SOS has been cancelled.');
                                } catch (e) {
                                    console.error('Failed to cancel SOS:', e);
                                }
                            }
                        },
                        { 
                            text: 'Escalate to Authorities', 
                            style: 'destructive',
                            onPress: async () => {
                                try {
                                    await safetyApi.triggerSOS({ latitude, longitude, level: 2 } as any);
                                    Alert.alert('Escalated', 'Authorities have been notified.');
                                } catch (e) {
                                    console.error('Failed to escalate SOS:', e);
                                }
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Error triggering Silent SOS:', error);
            setTimeout(async () => {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }, 500);
        }
    }, [userId]);

    return { handleSOS };
}
