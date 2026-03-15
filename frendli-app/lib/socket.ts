import { io } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const socket = io(API_URL, {
    autoConnect: false,
});
