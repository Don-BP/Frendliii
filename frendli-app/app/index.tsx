import { View, Text, StyleSheet, Pressable, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius, shadow } from '../constants/tokens';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.heroContainer}>
                {/* Decorative Elements */}
                <View style={styles.blob1} />
                <View style={styles.blob2} />

                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        <View style={styles.iconCircle}>
                            <Feather name="smile" size={40} color="#fff" />
                        </View>
                        <Text style={styles.title}>Frendli</Text>
                    </View>

                    <Text style={styles.tagline}>Social life,{"\n"}reimagined.</Text>
                    <Text style={styles.description}>
                        Find your people through shared interests and real-world hangouts.
                    </Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={() => router.push('/auth/phone')}
                >
                    <Text style={styles.buttonText}>Get Started</Text>
                    <Feather name="arrow-right" size={20} color="#fff" />
                </Pressable>

                <TouchableOpacity onPress={() => router.push('/auth/phone')}>
                    <Text style={styles.loginText}>
                        Already have an account? <Text style={styles.loginLink}>Sign in</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    heroContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: space.xl,
        overflow: 'hidden',
    } as ViewStyle,
    blob1: {
        position: 'absolute',
        top: -100,
        right: -50,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.primaryLight,
        opacity: 0.4,
    } as ViewStyle,
    blob2: {
        position: 'absolute',
        bottom: 100,
        left: -80,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: '#FFE8E0',
        opacity: 0.3,
    } as ViewStyle,
    content: {
        alignItems: 'center',
        zIndex: 1,
    } as ViewStyle,
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: space.xl,
        gap: space.sm,
    } as ViewStyle,
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: radius.lg,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.md,
    } as ViewStyle,
    title: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 40,
        color: colors.primary,
        letterSpacing: -1,
    } as TextStyle,
    tagline: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 52,
        color: colors.secondary,
        textAlign: 'center',
        lineHeight: 56,
        letterSpacing: -1.5,
    } as TextStyle,
    description: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 18,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: space.lg,
        lineHeight: 26,
        paddingHorizontal: space.sm,
    } as TextStyle,
    footer: {
        paddingHorizontal: space.xl,
        paddingBottom: space.xxxl,
        width: '100%',
    } as ViewStyle,
    button: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        width: '100%',
        height: 64,
        borderRadius: radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: space.xl,
        ...shadow.premium,
    } as ViewStyle,
    buttonText: {
        fontFamily: 'BricolageGrotesque_700Bold',
        fontSize: 20,
        color: '#fff',
        marginRight: space.sm,
    } as TextStyle,
    buttonIcon: {
        marginTop: 2,
    } as ViewStyle,
    loginText: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    } as TextStyle,
    loginLink: {
        fontFamily: 'Lexend_600SemiBold',
        color: colors.primary,
    } as TextStyle,
});
