// constants/tokens.ts
// Frendli Design System Tokens - Frendli 2.0 (High Precision/Warm Organic)

import { Platform } from 'react-native';

export const colors = {
    // Primary & Accent
    primary: '#FF7F61', // Coral/Salmon
    primaryLight: '#FFE5DE',
    primaryDark: '#E6684B',

    secondary: '#2D1E4B', // Deep Violet
    secondaryLight: '#46326E',

    accent: '#00E5D4', // Keeping the Mint as a subtle accent
    teal: '#00E5D4', // Alias for accent/verified badge

    // Core Palette (Warmer)
    cream: '#FFFBF7',
    vanilla: '#FFFAF0',
    sand: '#F5EEE6',

    // UI Colors
    success: '#10B981',
    warning: '#FBBF24',
    error: '#EF4444',
    info: '#3B82F6',

    // Sample-Derived Accents
    waveBlue: '#6B90F1', // The "Wave Back" button blue
    badgeBlue: '#5D8DFF', // Notification badge blue
    nextStepRed: '#E85C5C', // "Your Next Step" text red
    warmFlame: '#FFF1EE', // Background for the flame icon status card

    // Grays (Warm Grays/Taupes)
    gray: {
        50: '#FDFCFB',
        100: '#F7F5F2',
        200: '#EEEAE3',
        300: '#E0D8CE',
        400: '#BCB1A1',
        500: '#8E8271',
        600: '#6C6255',
        700: '#524A40',
        800: '#3D3730',
        900: '#2A2621',
    },

    // Semantic
    textPrimary: '#2D1E4B', // Using Deep Violet for text instead of pure black
    textSecondary: '#8E8271',
    textTertiary: '#BCB1A1',

    surface: '#FFFFFF',
    background: '#FFFBF7',
    border: '#EEEAE3',

    // Overlay
    overlay: 'rgba(45, 30, 75, 0.4)',
};

export const space = {
    none: 0,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
};

export const spacing = space;

export const radius = {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 20,
    xl: 32,
    '2xl': 40,
    xxl: 40,
    inner: 24,
    full: 9999,
};


// Platform-aware shadow factory:
//  - web: only 'boxShadow' (avoids "shadow* props are deprecated" console warnings)
//  - iOS: native shadowColor/Offset/Opacity/Radius
//  - Android: elevation
const makeShadow = (
    nativeColor: string,
    offsetY: number,
    nativeRadius: number,
    elevation: number,
    boxShadowValue: string
): Record<string, any> => {
    if (Platform.OS === 'web') {
        return { boxShadow: boxShadowValue };
    }
    return {
        shadowColor: nativeColor,
        shadowOffset: { width: 0, height: offsetY },
        shadowOpacity: 1,
        shadowRadius: nativeRadius,
        elevation,
    };
};

export const shadow = {
    none:    makeShadow('transparent',            0,  0,  0,  'none'),
    sm:      makeShadow('rgba(45,30,75,0.04)',    2,  4,  2,  '0 2px 4px rgba(45,30,75,0.04)'),
    md:      makeShadow('rgba(45,30,75,0.08)',    8,  12, 4,  '0 8px 12px rgba(45,30,75,0.08)'),
    lg:      makeShadow('rgba(45,30,75,0.12)',    16, 24, 8,  '0 16px 24px rgba(45,30,75,0.12)'),
    card:    makeShadow('rgba(45,30,75,0.05)',    4,  20, 3,  '0 4px 20px rgba(45,30,75,0.05)'),
    subtle:  makeShadow('rgba(45,30,75,0.03)',    2,  8,  1,  '0 2px 8px rgba(45,30,75,0.03)'),
    premium: makeShadow('rgba(255,127,97,0.15)',  10, 30, 10, '0 10px 30px rgba(255,127,97,0.15)'),
};


export const typography = {
    h1: { fontSize: 32, fontFamily: 'BricolageGrotesque_800ExtraBold', lineHeight: 40 },
    h2: { fontSize: 24, fontFamily: 'BricolageGrotesque_700Bold', lineHeight: 32 },
    h3: { fontSize: 20, fontFamily: 'BricolageGrotesque_600SemiBold', lineHeight: 28 },
    headingBold: { fontSize: 20, fontFamily: 'BricolageGrotesque_700Bold', lineHeight: 28 },
    body: { fontSize: 16, fontFamily: 'Lexend_400Regular', lineHeight: 24 },
    bodyRegular: { fontSize: 16, fontFamily: 'Lexend_400Regular', lineHeight: 24 },
    bodyMedium: { fontSize: 16, fontFamily: 'Lexend_500Medium', lineHeight: 24 },
    bodyBold: { fontSize: 16, fontFamily: 'Lexend_600SemiBold', lineHeight: 24 },
    caption: { fontSize: 14, fontFamily: 'Lexend_400Regular', lineHeight: 20 },
    small: { fontSize: 12, fontFamily: 'Lexend_500Medium', lineHeight: 16 },
};
