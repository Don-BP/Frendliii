// frendli-app/components/discover/NextStepsSection.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../constants/tokens';
import { NextStepCard } from '../NextStepCard';

export type StepKey = 'safety' | 'first-wave' | 'plan-hangout' | 'rate-hangout' | 'add-photo';

export interface UserState {
    safetyBriefingCompleted: boolean;
    hasConnections: boolean;
    hasPlannedHangout: boolean;
    hasPendingFeedback: boolean;
    hasProfilePhoto: boolean;
}

interface StepConfig {
    key: StepKey;
    title: string;
    description: string;
    icon: string;
}

const ALL_STEPS: StepConfig[] = [
    {
        key: 'safety',
        title: 'Complete Safety Briefing',
        description: 'Learn how RealConnect keeps you safe during meetups.',
        icon: 'shield-check',
    },
    {
        key: 'first-wave',
        title: 'Send your first Wave',
        description: 'Start connecting with people near you.',
        icon: 'hand-wave',
    },
    {
        key: 'plan-hangout',
        title: 'Plan your first hangout',
        description: "You've made connections! Take it to real life.",
        icon: 'coffee',
    },
    {
        key: 'rate-hangout',
        title: 'Rate your last hangout',
        description: 'How did it go? Your feedback helps us improve.',
        icon: 'star',
    },
    {
        key: 'add-photo',
        title: 'Add a profile photo',
        description: 'Profiles with photos get 3x more waves.',
        icon: 'camera',
    },
];

function computeSteps(userState: UserState): StepConfig[] {
    const active: StepConfig[] = [];
    if (!userState.safetyBriefingCompleted) active.push(ALL_STEPS[0]);
    if (!userState.hasConnections) active.push(ALL_STEPS[1]);
    if (userState.hasConnections && !userState.hasPlannedHangout) active.push(ALL_STEPS[2]);
    if (userState.hasPendingFeedback) active.push(ALL_STEPS[3]);
    if (!userState.hasProfilePhoto) active.push(ALL_STEPS[4]);
    return active.slice(0, 2);
}

interface NextStepsSectionProps {
    userState: UserState;
    onStepPress: (step: StepKey) => void;
}

export const NextStepsSection: React.FC<NextStepsSectionProps> = ({ userState, onStepPress }) => {
    const steps = computeSteps(userState);
    if (steps.length === 0) return null;

    return (
        <View style={styles.container}>
            {steps.map((step) => (
                <NextStepCard
                    key={step.key}
                    title={step.title}
                    description={step.description}
                    icon={step.icon}
                    onPress={() => onStepPress(step.key)}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },
});
