// frendli-app/components/discover/WavesSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '../../constants/tokens';
import { WaveReceivedCard } from '../WaveReceivedCard';

interface Profile {
    id: string;
    userId: string;
    firstName: string;
    photos: string[];
    score?: number;
    sharedInterests?: string[];
    dob?: string;
}

interface Wave {
    id: string;
    sender: { profile: Profile };
}

interface WavesSectionProps {
    waves: Wave[];
    onWaveBack: (profile: Profile) => void;
    onDismiss: (waveId: string) => void;
}

export const WavesSection: React.FC<WavesSectionProps> = ({ waves, onWaveBack, onDismiss }) => {
    return (
        <View style={styles.sectionContainer}>
            <View style={styles.wavesHeader}>
                <View style={styles.wavesTitleRow}>
                    <View style={styles.wavesDot} />
                    <Text style={styles.sectionTitle}>Waves Received</Text>
                    {waves.length > 0 && (
                        <View style={styles.wavesBadge}>
                            <Text style={styles.wavesBadgeText}>{waves.length}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.sectionSubtitle}>Wave back to connect and start chatting</Text>
            </View>

            <View style={styles.verticalList}>
                {waves.length > 0 ? (
                    waves.map((wave, index) => (
                        <WaveReceivedCard
                            key={wave.id || index}
                            index={index}
                            profile={wave.sender?.profile || { id: 'unknown', firstName: 'Someone', photos: [] }}
                            onWaveBack={() => wave.sender?.profile && onWaveBack(wave.sender.profile)}
                            onDismiss={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onDismiss(wave.id);
                            }}
                        />
                    ))
                ) : (
                    <View style={styles.emptyWaves}>
                        <Text style={styles.emptyWavesText}>No new waves yet</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginBottom: spacing.xl,
    },
    wavesHeader: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    wavesTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    wavesDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.badgeBlue,
        marginRight: 8,
    },
    sectionTitle: {
        ...typography.h3,
        fontSize: 20,
        color: colors.textPrimary,
    },
    wavesBadge: {
        backgroundColor: colors.badgeBlue,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    wavesBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.surface,
    },
    sectionSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 4,
    },
    verticalList: {
        paddingHorizontal: spacing.lg,
    },
    emptyWaves: {
        width: '100%',
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: colors.gray[100],
        borderRadius: 20,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyWavesText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
});
