import { supabase } from './supabase';

// For Android emulator, use 10.0.2.2 (alias to host loopback). 
// For iOS/Web, localhost works. 
// Ideally this comes from an environment variable.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Request failed: ${response.status}`);
    }

    return response.json();
}

export const profileApi = {
    get: () => apiRequest('/api/profile'),
    getById: (id: string) => apiRequest(`/api/profile/${id}`),
    create: (data: any) => apiRequest('/api/profile', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (data: any) => apiRequest('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    uploadImage: async (userId: string, uri: string, bucket: string = 'profiles') => {
        if (!supabase) throw new Error('Supabase not initialized');

        const formData = new FormData();
        const response = await fetch(uri);
        const blob = await response.blob();
        const fileExt = uri.split('.').pop();
        const fileName = `${userId}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, blob, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return publicUrl;
    },
    uploadStylePhoto: (imageUrl: string) => apiRequest('/api/profile/style-photo', {
        method: 'POST',
        body: JSON.stringify({ imageUrl }),
    }),
};

export interface DiscoveryFilters {
    lat?: number;
    lng?: number;
    maxDistance?: number;
    filterInterests?: string;
    filterDays?: string;
}

// --- Discovery Types ---

export interface FriendshipRankBadge {
    emoji: string;
    name: string;
}

export interface SuggestedActivity {
    label: string;
    reason: string;
    venueName: string;
    venueId: string;
    venueImageUrl?: string;
    isPartner: boolean;
    distanceKm: number;
}

export interface DiscoveryRecommendation {
    id: string;
    userId: string;
    firstName: string;
    bio?: string;
    photos: string[];
    interests: string[];
    interestWeights?: Record<string, number> | null;
    friendshipStyle?: string;
    availability?: { days: string[]; times: string[] };
    score: number;
    rank: FriendshipRankBadge;
    sharedInterests: string[];
    sharedStyle: string[];
    distanceKm: number | null;
    distance: string;
    isVerified?: boolean;
    isOnline?: boolean;
    suggestedActivity: SuggestedActivity | null;
}

export interface DiscoveryResponse {
    recommendations: DiscoveryRecommendation[];
    wavesReceived: any[];
    happeningSoon: any[];
    streakCount: number;
    matchCount: number;
    upcomingHangoutCount: number;
}

export const discoveryApi = {
    get: (params?: DiscoveryFilters) => {
        const query = params
            ? '?' + new URLSearchParams(
                Object.entries(params)
                    .filter(([, v]) => v !== undefined)
                    .map(([k, v]) => [k, String(v)])
            ).toString()
            : '';
        return apiRequest(`/api/discovery${query}`);
    },
    wave: (receiverId: string, type: 'like' | 'pass' | 'maybe') =>
        apiRequest('/api/discovery/wave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiverId, type }),
        }),
    getSnoozes: () => apiRequest('/api/discovery/snoozes'),
};

export const hangoutApi = {
    create: (data: any) => apiRequest('/api/hangouts', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    getDiscovery: (params?: { lat?: number; lng?: number; category?: string; suggested?: boolean; thisWeek?: boolean }) => {
        const query = params
            ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
            : '';
        return apiRequest(`/api/hangouts/discovery${query}`);
    },
    join: (hangoutId: string) => apiRequest(`/api/hangouts/${hangoutId}/join`, {
        method: 'POST',
    }),
    requestJoin: (hangoutId: string, message?: string) => apiRequest(`/api/hangouts/${hangoutId}/request-join`, {
        method: 'POST',
        body: JSON.stringify({ message }),
    }),
    getRequests: (hangoutId: string) => apiRequest(`/api/hangouts/${hangoutId}/requests`),
    approveRequest: (hangoutId: string, requestId: string) => apiRequest(`/api/hangouts/${hangoutId}/requests/${requestId}/approve`, {
        method: 'POST',
    }),
    declineRequest: (hangoutId: string, requestId: string) => apiRequest(`/api/hangouts/${hangoutId}/requests/${requestId}/decline`, {
        method: 'POST',
    }),
    getMyRecurring: () => apiRequest('/api/hangouts/recurring/my'),
    cancelRecurringSeries: (patternId: string) => apiRequest(`/api/hangouts/recurring/${patternId}`, {
        method: 'DELETE',
    }),
    getMy: () => apiRequest('/api/hangouts/my'),
    getSuggestions: (matchId: string) => apiRequest(`/api/hangouts/suggestions?matchId=${matchId}`),
    getPendingFeedback: (matchId?: string) => apiRequest(`/api/hangouts/pending-feedback${matchId ? `?matchId=${matchId}` : ''}`),
    submitFeedback: (hangoutId: string, data: { rating: number; comment?: string }) => apiRequest(`/api/hangouts/${hangoutId}/feedback`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    skipFeedback: (hangoutId: string) => apiRequest(`/api/hangouts/${hangoutId}/skip-feedback`, {
        method: 'POST',
    }),
};

export const venueApi = {
    search: (category?: string) => {
        const query = category ? `?category=${encodeURIComponent(category)}` : '';
        return apiRequest(`/api/venues/search${query}`);
    },
    getDetails: (id: string) => apiRequest(`/api/venues/${id}`),
    getFeatured: (params?: { lat?: number; lng?: number; category?: string }) => {
        const query = params
            ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
            : '';
        return apiRequest(`/api/venues/featured${query}`);
    },
};

export const perksApi = {
    fetchPerks: () => apiRequest('/api/perks'),
    fetchMyCoupons: () => apiRequest('/api/perks/my'),
    claimPerk: (perkId: string, hangoutId?: string) => apiRequest('/api/perks/claim', {
        method: 'POST',
        body: JSON.stringify({ perkId, hangoutId }),
    }),
    redeemCoupon: (code: string) => apiRequest('/api/perks/redeem', {
        method: 'POST',
        body: JSON.stringify({ code }),
    }),
};

export const safetyApi = {
    getContacts: () => apiRequest('/api/safety/contacts'),
    addContact: (contact: { name: string, phoneNumber: string, relation: string }) => apiRequest('/api/safety/contacts', {
        method: 'POST',
        body: JSON.stringify(contact),
    }),
    deleteContact: (contactId: string) => apiRequest(`/api/safety/contacts/${contactId}`, {
        method: 'DELETE',
    }),
    completeBriefing: () => apiRequest('/api/safety/briefing-complete', {
        method: 'POST',
    }),
    triggerSOS: (location: { latitude: number, longitude: number }) => apiRequest('/api/safety/sos', {
        method: 'POST',
        body: JSON.stringify(location),
    }),
    logCheckIn: (hangoutId: string, status: 'arrived' | 'safe' | 'departed') => apiRequest('/api/safety/check-in', {
        method: 'POST',
        body: JSON.stringify({ hangoutId, status }),
    }),
};

export const messageApi = {
    getMatches: () => apiRequest('/api/messages/matches'),
    getHistory: (matchId: string) => apiRequest(`/api/messages/${matchId}`),
};

export const leadsApi = {
    submit: (data: {
        firstName: string;
        workEmail: string;
        companyName: string;
        teamSize: string;
        plan: string;
        userId?: string;
    }) => apiRequest('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
};

export const subscriptionApi = {
    get: () => apiRequest('/api/user/subscription'),
};

export const friendApi = {
    getAll: () => apiRequest('/api/friends'),
};
