import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';
import { hangoutApi } from '../lib/api';

interface HangoutFeedbackProps {
    hangout: any;
    onClose: () => void;
    onFeedbackSubmitted: () => void;
    onReschedule: () => void;
    onSkip?: () => void;
}

export const HangoutFeedback: React.FC<HangoutFeedbackProps> = ({
    hangout,
    onClose,
    onFeedbackSubmitted,
    onReschedule,
    onSkip
}) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const closeButtonRef = useRef<any>(null);

    useEffect(() => {
        // When modal opens, focus the close button to trap focus and resolve aria-hidden warning
        if (Platform.OS === 'web') {
            setTimeout(() => {
                // @ts-ignore - focus exists on web
                closeButtonRef.current?.focus?.();
            }, 100);
        }
    }, []);

    const handleSubmit = async () => {
        if (rating === 0) return;

        setLoading(true);
        try {
            await hangoutApi.submitFeedback(hangout.id, {
                rating,
                comment
            });
            setSubmitted(true);
            setTimeout(() => {
                onFeedbackSubmitted();
            }, 2000);
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <Modal transparent visible animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.successContent}>
                        <View style={styles.successIcon}>
                            <Feather name="check" size={40} color={colors.surface} />
                        </View>
                        <Text style={styles.successTitle}>Thanks for sharing!</Text>
                        <Text style={styles.successSubtitle}>Your feedback helps us make better matches.</Text>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal transparent visible animationType="slide">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View
                    style={styles.modalContent}
                    accessibilityRole="none"
                    accessibilityViewIsModal={true}
                    accessibilityLabel="Feedback modal"
                    accessible={true}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>How was the hangout?</Text>
                        <TouchableOpacity
                            ref={closeButtonRef}
                            onPress={() => {
                            if (onSkip) {
                                onSkip();
                            } else {
                                onClose();
                            }
                        }}
                            style={styles.closeButton}
                            accessibilityLabel="Close feedback modal"
                            accessibilityRole="button"
                        >
                            <Feather name="x" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.hangoutInfo}>
                        <Text style={styles.hangoutTitle}>{hangout.title}</Text>
                        <Text style={styles.hangoutVenue}>at {hangout.venue?.name || 'Unknown Venue'}</Text>
                    </View>

                    <Text style={styles.label}>Rate your experience</Text>
                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                onPress={() => setRating(star)}
                                style={styles.starButton}
                            >
                                <Feather
                                    name="star"
                                    size={40}
                                    color={star <= rating ? colors.primary : colors.border}
                                    fill={star <= rating ? colors.primary : 'transparent'}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Any comments? (Optional)</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="What did you enjoy? Anything we can improve?"
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        numberOfLines={4}
                        value={comment}
                        onChangeText={setComment}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitButton, rating === 0 && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={rating === 0 || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.surface} />
                            ) : (
                                <Text style={styles.submitButtonText}>Submit Feedback</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.rescheduleButton}
                            onPress={() => {
                                onReschedule();
                                onClose();
                            }}
                        >
                            <Feather name="calendar" size={18} color={colors.primary} />
                            <Text style={styles.rescheduleButtonText}>Plan another hangout</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: radius.xxl,
        borderTopRightRadius: radius.xxl,
        padding: spacing.xl,
        paddingBottom: spacing.xxl + 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    closeButton: {
        padding: spacing.xs,
    },
    hangoutInfo: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    hangoutTitle: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
    hangoutVenue: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    label: {
        ...typography.small,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    starButton: {
        padding: spacing.xs,
    },
    textArea: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: spacing.xl,
    },
    footer: {
        gap: spacing.md,
    },
    submitButton: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.md,
    },
    submitButtonText: {
        ...typography.bodyBold,
        color: colors.surface,
        fontSize: 18,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    rescheduleButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    rescheduleButtonText: {
        ...typography.bodyBold,
        color: colors.primary,
        marginLeft: spacing.sm,
    },
    successContent: {
        backgroundColor: colors.background,
        margin: spacing.xl,
        padding: spacing.xxl,
        borderRadius: radius.xxl,
        alignItems: 'center',
        ...shadow.lg,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    successTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    successSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
