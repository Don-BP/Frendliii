import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Custom storage for Expo Secure Store (Async) with web fallback
const secureStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
            return localStorage.getItem(name);
        }
        return await SecureStore.getItemAsync(name);
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
            localStorage.setItem(name, value);
            return;
        }
        await SecureStore.setItemAsync(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(name);
            return;
        }
        await SecureStore.deleteItemAsync(name);
    },
};

export interface ProfileData {
    firstName: string;
    bio: string | null;
    dob: string | null;
    interests: string[];
    interestWeights?: Record<string, number>;
    photos: string[];
    friendshipStyle: string | null;
    availability: {
        days: string[];
        times: string[];
    } | null;
    latitude: number | null;
    longitude: number | null;
    lifeStage: string | null;
    styleTags: string[];
    stylePhotos: string[];
    safetyBadges: string[];
    safetyBriefingCompleted: boolean;
    isPremium: boolean;
    subscriptionTier: string;
    activityPreferences?: {
        environment: 'indoor' | 'outdoor' | null;
        energy: 'active' | 'relaxed' | null;
        social: 'social' | 'quiet' | null;
    } | null;
    age?: number;
    location?: string;
    emergencyContacts?: Array<{ name: string; phone: string }>;
}

interface AuthState {
    userId: string | null;
    isOnboarded: boolean;
    profile: ProfileData | null;
    setAuth: (userId: string) => void;
    setProfile: (profile: Partial<ProfileData>) => void;
    setOnboarded: (status: boolean) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            userId: null,
            isOnboarded: false,
            profile: null,

            setAuth: (userId) => set({ userId }),

            setProfile: (newProfile) =>
                set((state) => ({
                    profile: state.profile
                        ? { ...state.profile, ...newProfile }
                        : {
                            firstName: '',
                            bio: null,
                            dob: null,
                            interests: [],
                            photos: [],
                            friendshipStyle: null,
                            availability: null,
                            lifeStage: null,
                            latitude: null,
                            longitude: null,
                            styleTags: [],
                            stylePhotos: [],
                            safetyBadges: [],
                            safetyBriefingCompleted: false,
                            isPremium: false,
                            subscriptionTier: 'free',
                            age: 25,
                            location: '',
                            emergencyContacts: [],
                            ...newProfile
                        } as ProfileData
                })),

            setOnboarded: (status) => set({ isOnboarded: status }),

            clearAuth: () => set({ userId: null, isOnboarded: false, profile: null }),
        }),
        {
            name: 'frendli-auth-storage',
            storage: createJSONStorage(() => secureStorage),
        }
    )
);
