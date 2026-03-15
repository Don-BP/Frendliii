import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';

interface NextStepProps {
    title: string;
    description: string;
    icon: string;
    onPress?: () => void;
}

export const NextStepCard: React.FC<NextStepProps> = memo(({ title, description, icon, onPress }) => {
    return (
        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
            <TouchableOpacity 
                style={styles.container} 
                onPress={onPress}
                activeOpacity={0.9}
            >
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={icon as any} size={24} color={colors.nextStepRed} />
            </View>
            
            <View style={styles.content}>
                <Text style={styles.label}>YOUR NEXT STEP</Text>
                <Text style={styles.title}>{title}</Text>
            </View>

            <View style={styles.arrowContainer}>
                <Feather name="chevron-right" size={20} color={colors.textTertiary} />
            </View>
        </TouchableOpacity>
    </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: 20,
        ...shadow.sm,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        marginBottom: spacing.lg,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFF1F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginLeft: spacing.md,
    },
    label: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.nextStepRed,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    title: {
        ...typography.bodyBold,
        fontSize: 16,
        color: colors.textPrimary,
    },
    arrowContainer: {
        marginLeft: spacing.sm,
    },
});
