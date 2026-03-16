// frendli-app/components/discover/CardStack.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AccessibilityInfo } from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming,
    withSequence, Easing, runOnJS
} from 'react-native-reanimated';
import { colors, spacing, radius } from '../../constants/tokens';
import { DiscoveryRecommendation } from '../../lib/api';
import { DiscoverHeroCard } from './DiscoverHeroCard';

interface Props {
    cards: DiscoveryRecommendation[];
    onWave: (receiverId: string) => void;
    onMaybe: (receiverId: string) => void;
    onEmpty: () => void;
}

const ANIMATION_DURATION = 350;
const REDUCED_DURATION = 150;

export function CardStack({ cards, onWave, onMaybe, onEmpty }: Props) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [reduceMotion, setReduceMotion] = useState(false);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    }, []);

    const advance = () => {
        const next = activeIndex + 1;
        if (next >= cards.length) {
            onEmpty();
        } else {
            setActiveIndex(next);
            translateY.value = 0;
            scale.value = 1;
            opacity.value = 1;
        }
    };

    const handleWave = (receiverId: string) => {
        onWave(receiverId);
        const duration = reduceMotion ? REDUCED_DURATION : ANIMATION_DURATION;
        if (reduceMotion) {
            opacity.value = withTiming(0, { duration }, () => runOnJS(advance)());
        } else {
            translateY.value = withTiming(-600, { duration, easing: Easing.out(Easing.cubic) }, () =>
                runOnJS(advance)()
            );
        }
    };

    const handleMaybe = (receiverId: string) => {
        onMaybe(receiverId);
        const duration = reduceMotion ? REDUCED_DURATION : ANIMATION_DURATION;
        if (reduceMotion) {
            opacity.value = withTiming(0, { duration }, () => runOnJS(advance)());
        } else {
            scale.value = withSequence(
                withTiming(0.88, { duration: duration * 0.6 }),
                withTiming(0.0, { duration: duration * 0.4 }, () => runOnJS(advance)())
            );
        }
    };

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }, { scale: scale.value }],
        opacity: opacity.value,
    }));

    if (activeIndex >= cards.length) {
        return <FeedEmptyState />;
    }

    const active = cards[activeIndex];
    const next = cards[activeIndex + 1];

    return (
        <View style={styles.container}>
            {/* Next card — behind, slightly scaled down */}
            {next && (
                <View style={styles.nextCardContainer} pointerEvents="none">
                    <View style={styles.nextCardWrapper}>
                        <DiscoverHeroCard
                            profile={next}
                            onWave={() => {}}
                            onMaybe={() => {}}
                        />
                    </View>
                </View>
            )}

            {/* Active card */}
            <Animated.View style={[styles.activeCardContainer, animStyle]}>
                <DiscoverHeroCard
                    profile={active}
                    onWave={handleWave}
                    onMaybe={handleMaybe}
                />
            </Animated.View>
        </View>
    );
}

function FeedEmptyState() {
    return (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>You've seen everyone nearby today</Text>
            <Text style={styles.emptyBody}>
                New people join every day — check back tomorrow.{'\n'}
                In the meantime, join a group hangout.
            </Text>
            <TouchableOpacity style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Browse Group Hangouts</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignItems: 'center',
    },
    nextCardContainer: {
        position: 'absolute',
        top: 8,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    nextCardWrapper: {
        transform: [{ scale: 0.9 }],
        opacity: 0.6,
    },
    activeCardContainer: {
        zIndex: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl * 2,
        gap: spacing.md,
    },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    emptyBody: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyButton: {
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: radius.md,
    },
    emptyButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});
