import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { colors, space, radius } from '../constants/tokens';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface MatchModalProps {
    visible: boolean;
    onClose: () => void;
    matchName: string;
    matchPhoto: string;
    onMessagePress: () => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({
    visible,
    onClose,
    matchName,
    matchPhoto,
    onMessagePress,
}) => {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <Animated.View
                entering={ZoomIn.duration(400)}
                style={styles.container}
            >
                <Text style={styles.title}>It's a Wave!</Text>
                <Text style={styles.subtitle}>You and {matchName} have matched.</Text>

                <View style={styles.photoContainer}>
                    <Image
                        source={{ uri: matchPhoto }}
                        style={styles.photo}
                    />
                    <View style={styles.heartBadge}>
                        <Feather name="heart" size={24} color={colors.surface} />
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.messageButton}
                    onPress={onMessagePress}
                >
                    <Text style={styles.messageButtonText}>Say Hello</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                >
                    <Text style={styles.closeButtonText}>Keep Waving</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(26, 26, 46, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        zIndex: 999,
    },
    container: {
        backgroundColor: colors.surface,
        borderRadius: radius.xxl,
        width: '100%',
        padding: 32,
        alignItems: 'center',
    },
    title: {
        fontFamily: 'BricolageGrotesque_700Bold',
        fontSize: 32,
        color: colors.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 32,
        textAlign: 'center',
    },
    photoContainer: {
        position: 'relative',
        marginBottom: 40,
    },
    photo: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 4,
        borderColor: colors.primary,
    },
    heartBadge: {
        position: 'absolute',
        bottom: -10,
        right: -10,
        backgroundColor: colors.primary,
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: colors.surface,
    },
    messageButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: radius.full,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    messageButtonText: {
        fontFamily: 'BricolageGrotesque_700Bold',
        fontSize: 18,
        color: colors.surface,
    },
    closeButton: {
        paddingVertical: 8,
    },
    closeButtonText: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 16,
        color: colors.textSecondary,
    },
});

