import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
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

// ─── SafeArrival Geofence + Escalation ────────────────────────────────────────

export const SAFE_ARRIVAL_TASK = 'SAFE_ARRIVAL_GEOFENCE_TASK';
const GEOFENCE_RADIUS_M = 200; // metres — user is "at" the venue

/** Haversine distance in metres */
export function distanceMetres(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface SafeArrivalConfig {
    hangoutId: string;
    venueLat: number;
    venueLng: number;
    venueName: string;
    venueAddress: string;
    otherPersonFirstName: string;
    scheduledTime: string; // ISO string
}

// Stored in memory during a session (cleared on app restart)
let safeArrivalConfig: SafeArrivalConfig | null = null;
let userConfirmedSafe = false;
let escalationStage = 0;

/** Call from chat screen when a hangout becomes active */
export function setSafeArrivalConfig(config: SafeArrivalConfig | null) {
    safeArrivalConfig = config;
    userConfirmedSafe = false;
    escalationStage = 0;
    if (config) {
        startSafetySession(config); // fire-and-forget server registration
    }
}

/** Call from the "I'm Safe" button */
export function confirmUserSafe() {
    userConfirmedSafe = true;
    if (safeArrivalConfig) {
        resolveSafetySession(safeArrivalConfig.hangoutId); // fire-and-forget
    }
}

/** Schedule escalation notifications at the hangout time */
export async function scheduleSafeArrivalEscalation(config: SafeArrivalConfig) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const hangoutMs = new Date(config.scheduledTime).getTime();
    const now = Date.now();

    // Stage 1 — at hangout time
    if (hangoutMs > now) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'SafeArrival Check',
                body: `Are you at ${config.venueName} yet?`,
                data: { stage: 1, hangoutId: config.hangoutId },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(hangoutMs),
            },
        });
    }

    // Stage 2 — 10 min after
    const stage2Ms = hangoutMs + 10 * 60 * 1000;
    if (stage2Ms > now) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Are you okay?',
                body: "Just checking in — tap to confirm you're safe.",
                data: { stage: 2, hangoutId: config.hangoutId },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(stage2Ms),
            },
        });
    }

    // Stage 3 — 25 min after (10 + 15): alert emergency contact via API
    const stage3Ms = hangoutMs + 25 * 60 * 1000;
    if (stage3Ms > now) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'SafeArrival Alert',
                body: 'Alerting your emergency contacts.',
                data: { stage: 3, hangoutId: config.hangoutId },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(stage3Ms),
            },
        });
    }
}

/** Cancel all SafeArrival notifications for a hangout (call when user confirms safe) */
export async function cancelSafeArrivalNotifications(hangoutId: string) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
        if ((n.content.data as any)?.hangoutId === hangoutId) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
    }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function getAuthHeaders(): Promise<HeadersInit | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
    };
}

export async function startSafetySession(config: SafeArrivalConfig): Promise<void> {
    const headers = await getAuthHeaders();
    if (!headers) return;
    try {
        await fetch(`${API_URL}/api/safety/session/start`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                hangoutId: config.hangoutId,
                venueLat: config.venueLat,
                venueLng: config.venueLng,
                venueName: config.venueName,
                venueAddress: config.venueAddress,
                otherPersonFirstName: config.otherPersonFirstName,
                scheduledTime: config.scheduledTime,
            }),
        });
    } catch (err) {
        console.error('Failed to start safety session:', err);
    }
}

export async function resolveSafetySession(hangoutId: string): Promise<void> {
    const headers = await getAuthHeaders();
    if (!headers) return;
    try {
        await fetch(`${API_URL}/api/safety/session/resolve`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ hangoutId }),
        });
    } catch (err) {
        console.error('Failed to resolve safety session:', err);
    }
}

export async function scheduleLikelySafeReminder(hangoutId: string, intervalMin: number): Promise<void> {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    // Cancel any existing likely_safe reminders first
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
        if ((n.content.data as any)?.type === 'likely_safe_reminder' && (n.content.data as any)?.hangoutId === hangoutId) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
    }

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Looks like you made it!",
            body: "Tap to confirm you're safe and stop the alerts.",
            data: { type: 'likely_safe_reminder', hangoutId },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: intervalMin * 60,
            repeats: true,
        },
    });
}
