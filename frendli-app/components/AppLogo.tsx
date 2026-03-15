import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadow, typography } from '../constants/tokens';
import { useSilentSOS } from '../hooks/useSilentSOS';
import * as Haptics from 'expo-haptics';

export function AppLogo({ size = 40 }: { size?: number }) {
    const { handleSOS } = useSilentSOS();

    return (
        <Pressable 
            onLongPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                handleSOS();
            }}
            delayLongPress={2000}
            style={({ pressed }) => [
                styles.container,
                { width: size, height: size, borderRadius: size / 2.5 },
                pressed && { transform: [{ scale: 0.95 }] }
            ]}
        >
            <View style={[styles.inner, { borderRadius: size / 3 }]}>
                <MaterialCommunityIcons name="lightning-bolt" size={size * 0.6} color="#fff" />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.subtle,
    },
    inner: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 4,
    },
});
