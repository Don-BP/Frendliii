import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../../constants/tokens';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { safetyApi } from '../../lib/api';

interface Contact {
    id: string;
    name: string;
    phoneNumber: string;
    relation: string;
}

export default function EmergencyContactsScreen() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newRelation, setNewRelation] = useState('');
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        try {
            const data = await safetyApi.getContacts();
            setContacts(data);
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddContact = async () => {
        if (!newName || !newPhone || !newRelation) {
            Alert.alert('Missing Fields', 'Please fill in all contact details.');
            return;
        }

        setSaving(true);
        try {
            await safetyApi.addContact({
                name: newName,
                phoneNumber: newPhone,
                relation: newRelation
            });
            setNewName('');
            setNewPhone('');
            setNewRelation('');
            setIsAdding(false);
            loadContacts();
        } catch (error) {
            console.error('Error adding contact:', error);
            Alert.alert('Error', 'Failed to add emergency contact.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteContact = (id: string) => {
        Alert.alert(
            'Remove Contact',
            'Are you sure you want to remove this emergency contact?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Remove', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await safetyApi.deleteContact(id);
                            loadContacts();
                        } catch (error) {
                            console.error('Error deleting contact:', error);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.background, colors.cream]}
                style={StyleSheet.absoluteFill}
            />
            
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="chevron-left" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Emergency Contacts</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.infoCard}>
                        <MaterialCommunityIcons name="shield-account" size={32} color={colors.primary} />
                        <Text style={styles.infoText}>
                            Your emergency contacts will be notified automatically if you don't check in during a meetup or trigger a Silent SOS.
                        </Text>
                    </View>

                    <Text style={styles.sectionHeader}>Trusted Contacts</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : (
                        <View style={styles.contactsList}>
                            {contacts.map((contact, index) => (
                                <Animated.View 
                                    key={contact.id}
                                    entering={FadeInDown.delay(index * 100)}
                                    layout={Layout.springify()}
                                    style={styles.contactCard}
                                >
                                    <View style={styles.contactIcon}>
                                        <Text style={styles.contactInitial}>{contact.name[0]}</Text>
                                    </View>
                                    <View style={styles.contactInfo}>
                                        <Text style={styles.contactName}>{contact.name}</Text>
                                        <Text style={styles.contactDetails}>{contact.relation} • {contact.phoneNumber}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => handleDeleteContact(contact.id)}
                                        style={styles.deleteBtn}
                                    >
                                        <Feather name="trash-2" size={18} color={colors.textTertiary} />
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}

                            {!isAdding ? (
                                <TouchableOpacity 
                                    style={styles.addBtn}
                                    onPress={() => setIsAdding(true)}
                                >
                                    <Feather name="plus" size={20} color={colors.primary} />
                                    <Text style={styles.addBtnText}>Add Trusted Contact</Text>
                                </TouchableOpacity>
                            ) : (
                                <Animated.View entering={FadeInDown} style={styles.formCard}>
                                    <Text style={styles.formTitle}>New Contact</Text>
                                    
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Full Name</Text>
                                        <TextInput 
                                            style={styles.input}
                                            value={newName}
                                            onChangeText={setNewName}
                                            placeholder="e.g. Jane Doe"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Phone Number</Text>
                                        <TextInput 
                                            style={styles.input}
                                            value={newPhone}
                                            onChangeText={setNewPhone}
                                            placeholder="e.g. +1 555 123 4567"
                                            keyboardType="phone-pad"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Relation</Text>
                                        <TextInput 
                                            style={styles.input}
                                            value={newRelation}
                                            onChangeText={setNewRelation}
                                            placeholder="e.g. Mother, Partner, Friend"
                                        />
                                    </View>

                                    <View style={styles.formActions}>
                                        <TouchableOpacity 
                                            style={styles.cancelBtn}
                                            onPress={() => setIsAdding(false)}
                                        >
                                            <Text style={styles.cancelBtnText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={styles.saveBtn}
                                            onPress={handleAddContact}
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={styles.saveBtnText}>Save Contact</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </Animated.View>
                            )}
                        </View>
                    )}

                    {contacts.length === 0 && !loading && !isAdding && (
                        <View style={styles.emptyState}>
                            <Feather name="users" size={48} color={colors.border} />
                            <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        ...typography.h3,
        fontSize: 20,
        color: colors.textPrimary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    infoCard: {
        backgroundColor: colors.primary + '10',
        padding: spacing.xl,
        borderRadius: radius.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: spacing.xxl,
        borderWidth: 1,
        borderColor: colors.primary + '20',
    },
    infoText: {
        flex: 1,
        ...typography.body,
        fontSize: 14,
        color: colors.primary,
        lineHeight: 20,
    },
    sectionHeader: {
        ...typography.bodyBold,
        textTransform: 'uppercase',
        color: colors.textTertiary,
        letterSpacing: 1.2,
        fontSize: 12,
        marginBottom: spacing.md,
    },
    contactsList: {
        gap: 12,
    },
    contactCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    contactIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contactInitial: {
        ...typography.bodyBold,
        color: colors.secondary,
        fontSize: 18,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        fontSize: 16,
    },
    contactDetails: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    deleteBtn: {
        padding: 8,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        marginTop: 8,
        gap: 8,
    },
    addBtnText: {
        ...typography.bodyBold,
        color: colors.primary,
        fontSize: 16,
    },
    formCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        ...shadow.md,
        marginTop: 8,
    },
    formTitle: {
        ...typography.h3,
        fontSize: 18,
        marginBottom: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.md,
        fontSize: 16,
        fontFamily: 'Lexend_400Regular',
    },
    formActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: spacing.lg,
    },
    cancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    cancelBtnText: {
        ...typography.bodyBold,
        color: colors.textSecondary,
    },
    saveBtn: {
        flex: 2,
        height: 50,
        borderRadius: radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary,
    },
    saveBtnText: {
        ...typography.bodyBold,
        color: '#fff',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        gap: 16,
    },
    emptyText: {
        ...typography.body,
        color: colors.textTertiary,
    }
});
