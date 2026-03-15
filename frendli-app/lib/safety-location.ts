import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useAuthStore } from '../store/authStore';
import { supabase } from './supabase';


const LOCATION_TRACKING_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

// Define the background task
TaskManager.defineTask(LOCATION_TRACKING_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background location task error:', error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const location = locations[0];

        if (location) {
            try {
                // Get the current session for auth
                if (!supabase) return;
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                // Send location check-in to backend
                await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/safety/check-in`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        location: {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            accuracy: location.coords.accuracy,
                        }
                    })
                });

                console.log('Background location check-in sent successfully', location.coords.latitude, location.coords.longitude);
            } catch (err) {
                console.error('Failed to send background location check-in:', err);
            }
        }
    }
});


export const startLocationTracking = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
        console.log('Background location permission denied');
        return false;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK_NAME);
    
    if (!isRegistered) {
        await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15 * 60 * 1000, // Update every 15 minutes
            distanceInterval: 100, // Or every 100 meters
            deferredUpdatesInterval: 5 * 60 * 1000,
            showsBackgroundLocationIndicator: true, // Required for iOS
            foregroundService: {
                notificationTitle: "RealConnect SafeArrival",
                notificationBody: "Sharing your location for your safety during the hangout.",
                notificationColor: "#FF5C39",
            }
        });
        console.log('Started background location tracking');
    }
    
    return true;
};

export const stopLocationTracking = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK_NAME);
    if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK_NAME);
        console.log('Stopped background location tracking');
    }
};

// Check if currently tracking
export const isTrackingLocation = async () => {
    return await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK_NAME);
};
