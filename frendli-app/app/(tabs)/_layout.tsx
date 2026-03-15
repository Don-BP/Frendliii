import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, shadow } from '../../constants/tokens';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    height: 88,
                    paddingBottom: spacing.lg,
                    paddingTop: spacing.sm,
                    ...shadow.md,
                },
                tabBarLabelStyle: {
                    fontFamily: 'Lexend_600SemiBold',
                    fontSize: 11,
                    marginTop: 2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Discover',
                    tabBarIcon: ({ color }) => <Feather name="compass" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="hangouts"
                options={{
                    title: 'Hangouts',
                    tabBarIcon: ({ color }) => <Feather name="globe" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="perks"
                options={{
                    title: 'Perks',
                    tabBarIcon: ({ color }) => <Feather name="tag" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="friends"
                options={{
                    title: 'Friends',
                    tabBarIcon: ({ color }) => <Feather name="users" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Messages',
                    tabBarIcon: ({ color }) => <Feather name="message-square" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
