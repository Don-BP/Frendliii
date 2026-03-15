import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';
import { supabase } from '../lib/supabase';

const REPORT_REASONS = [
    'Harassment or bullying',
    'Inappropriate content',
    'Spam or fake profile',
    'Threatening behaviour',
    'Other',
];

interface ReportUserModalProps {
    visible: boolean;
    reportedUserId: string;
    reportedUserName?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
    visible,
    reportedUserId,
    reportedUserName,
    onClose,
    onSuccess,
}) => {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const handleClose = () => {
        setSelectedReason(null);
        setDetails('');
        onClose();
    };

    const handleSubmit = async () => {
        if (!selectedReason) return;
        setLoading(true);
        try {
            if (!supabase) throw new Error('Supabase not initialized');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/safety/report`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reportedId: reportedUserId,
                    reason: selectedReason,
                    ...(selectedReason === 'Other' && details.trim()
                        ? { details: details.trim() }
                        : {}),
                }),
            });

            if (!response.ok) throw new Error('Report failed');

            onSuccess();
            handleClose();
            Alert.alert('Reported', 'Thank you for keeping the community safe.');
        } catch (error) {
            Alert.alert('Error', 'Failed to report user. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            Report {reportedUserName ?? 'User'}
                        </Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Feather name="x" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionLabel}>
                        Why are you reporting this person?
                    </Text>

                    {REPORT_REASONS.map((reason) => (
                        <TouchableOpacity
                            key={reason}
                            style={[
                                styles.reasonRow,
                                selectedReason === reason && styles.reasonRowSelected,
                            ]}
                            onPress={() => setSelectedReason(reason)}
                        >
                            <View style={[
                                styles.radio,
                                selectedReason === reason && styles.radioSelected,
                            ]}>
                                {selectedReason === reason && (
                                    <View style={styles.radioDot} />
                                )}
                            </View>
                            <Text style={[
                                styles.reasonText,
                                selectedReason === reason && styles.reasonTextSelected,
                            ]}>
                                {reason}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {selectedReason === 'Other' && (
                        <TextInput
                            style={styles.detailsInput}
                            placeholder="Tell us more (optional)"
                            placeholderTextColor={colors.textTertiary}
                            value={details}
                            onChangeText={setDetails}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    )}

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (!selectedReason || loading) && styles.buttonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={!selectedReason || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.surface} />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Report</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
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
    sectionLabel: {
        ...typography.small,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.md,
    },
    reasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    reasonRowSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        marginRight: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: colors.primary,
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    reasonText: {
        ...typography.body,
        color: colors.textPrimary,
    },
    reasonTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    detailsInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        height: 90,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    submitButton: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.lg,
        ...shadow.md,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    submitButtonText: {
        ...typography.bodyBold,
        color: colors.surface,
        fontSize: 18,
    },
});
