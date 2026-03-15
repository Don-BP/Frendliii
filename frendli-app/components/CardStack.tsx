import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { DiscoveryCard } from './DiscoveryCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Profile {
    id: string;
    userId: string;
    firstName: string;
    age?: number;
    bio?: string;
    photos: string[];
    interests: string[];
    distance?: string;
    score?: number;
    sharedInterests?: string[];
    isVerified?: boolean;
    isOnline?: boolean;
}

interface CardStackProps {
    profiles: Profile[];
    onSwipeLeft: (profile: Profile) => void;
    onSwipeRight: (profile: Profile) => void;
}

export const CardStack: React.FC<CardStackProps> = ({
    profiles,
    onSwipeLeft,
    onSwipeRight
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const nextProfile = () => {
        translateX.value = 0;
        translateY.value = 0;
        setCurrentIndex((prev) => prev + 1);
    };

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY;
        })
        .onEnd((event) => {
            if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
                const profile = profiles[currentIndex];
                if (event.translationX > 0) {
                    runOnJS(onSwipeRight)(profile);
                    translateX.value = withSpring(SCREEN_WIDTH * 1.5, {}, () => {
                        runOnJS(nextProfile)();
                    });
                } else {
                    runOnJS(onSwipeLeft)(profile);
                    translateX.value = withSpring(-SCREEN_WIDTH * 1.5, {}, () => {
                        runOnJS(nextProfile)();
                    });
                }
            } else {
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            }
        });

    const topCardStyle = useAnimatedStyle(() => {
        const rotate = interpolate(
            translateX.value,
            [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
            [-10, 0, 10],
            Extrapolation.CLAMP
        );

        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotate}deg` },
            ],
        };
    });

    const nextCardStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            translateX.value,
            [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
            [1, 0.9, 1],
            Extrapolation.CLAMP
        );

        const opacity = interpolate(
            translateX.value,
            [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
            [1, 0.5, 1],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ scale }],
            opacity,
        };
    });

    if (currentIndex >= profiles.length) {
        return null; // Handle empty state in parent
    }

    const currentProfile = profiles[currentIndex];
    const nextProfileData = profiles[currentIndex + 1];

    return (
        <View style={styles.container}>
            {nextProfileData && (
                <Animated.View style={[styles.cardWrapper, nextCardStyle]}>
                    <DiscoveryCard profile={nextProfileData} />
                </Animated.View>
            )}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.cardWrapper, topCardStyle]}>
                    <DiscoveryCard profile={currentProfile} />
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardWrapper: {
        position: 'absolute',
    },
});
