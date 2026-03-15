import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { safetyApi } from '../../lib/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface EmergencyContact {
    id: string;
    name: string;
    phoneNumber: string;
    relation: string;
}

export default function SafetySettingsScreen() {
    const router = useRouter();
    const userId = useAuthStore((state) => state.userId);
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [relation, setRelation] = useState('');

    useEffect(() => {
        fetchContacts();
    }, []);
    
    const fetchContacts = async () => {
        try {
            const data = await safetyApi.getContacts();
            setContacts(data);
        } catch (error) {
            console.error('Failed to fetch emergency contacts:', error);
            Alert.alert('Error', 'Could not load contacts. Please log in again.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleAddContact = async () => {
        if (!name.trim() || !phone.trim() || !relation.trim()) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }
        
        try {
            const newContact = await safetyApi.addContact({ name, phoneNumber: phone, relation });
            setContacts([...contacts, newContact]);
            setAdding(false);
            setName('');
            setPhone('');
            setRelation('');
            Alert.alert('Success', 'Emergency contact added.');
        } catch (error) {
            console.error('Failed to add contact:', error);
            Alert.alert('Error', 'Failed to add contact. Please check your connection.');
        }
    };
    
    const handleRemoveContact = async (id: string) => {
        Alert.alert('Remove Contact', 'Are you sure you want to remove this emergency contact?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Remove', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await safetyApi.deleteContact(id);
                        setContacts(contacts.filter(c => c.id !== id));
                    } catch (error) {
                        console.error('Failed to delete contact:', error);
                        Alert.alert('Error', 'Failed to remove contact.');
                    }
                }
            }
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Safety & Emergency</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.infoBox}>
                        <Feather name="shield" size={24} color={colors.primary} style={{ marginBottom: spacing.sm }} />
                        <Text style={styles.infoTitle}>Your Safety is our Priority</Text>
                        <Text style={styles.infoText}>
                            Add trusted friends or family here. If you trigger a Silent SOS during a hangout, we will instantly notify these contacts with your exact location.
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>Emergency Contacts</Text>
                    
                    {loading ? (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
                    ) : contacts.length === 0 && !adding ? (
                        <View style={styles.emptyState}>
                            <Feather name="users" size={48} color={colors.border} />
                            <Text style={styles.emptyStateText}>No emergency contacts added yet.</Text>
                        </View>
                    ) : (
                        contacts.map(contact => (
                            <View key={contact.id} style={styles.contactCard}>
                                <View style={styles.contactInfo}>
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    <View style={styles.contactDetailsRow}>
                                        <Text style={styles.contactRelation}>{contact.relation.toUpperCase()}</Text>
                                        <Text style={styles.contactPhone}>• {contact.phoneNumber}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveContact(contact.id)} style={styles.removeButton}>
                                    <Feather name="trash-2" size={20} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    {!adding ? (
                        <TouchableOpacity style={styles.addButton} onPress={() => setAdding(true)}>
                            <Feather name="plus" size={20} color="#fff" style={{ marginRight: spacing.sm }} />
                            <Text style={styles.addButtonText}>Add Contact</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.addForm}>
                            <Text style={styles.formTitle}>New Contact</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Full Name" 
                                value={name} 
                                onChangeText={setName} 
                                autoCapitalize="words"
                            />
                            <TextInput 
                                style={styles.input} 
                                placeholder="Phone Number (e.g. +1...)" 
                                value={phone} 
                                onChangeText={setPhone} 
                                keyboardType="phone-pad"
                            />
                            <TextInput 
                                style={styles.input} 
                                placeholder="Relation (e.g. Sister, Friend)" 
                                value={relation} 
                                onChangeText={setRelation} 
                            />
                            <View style={styles.formActions}>
                                <TouchableOpacity style={[styles.formBtn, styles.cancelBtn]} onPress={() => setAdding(false)}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.formBtn, styles.saveBtn]} onPress={handleAddContact}>
                                    <Text style={styles.saveBtnText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        ...typography.h3,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    infoBox: {
        backgroundColor: '#F0E7FF',
        padding: spacing.lg,
        borderRadius: radius.xl,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: '#E0CFFE',
    },
    infoTitle: {
        ...typography.bodyBold,
        color: '#4F46E5',
        marginBottom: spacing.xs,
    },
    infoText: {
        ...typography.caption,
        color: '#4338CA',
        lineHeight: 20,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyStateText: {
        ...typography.body,
        color: colors.textTertiary,
        marginTop: spacing.md,
    },
    contactCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.subtle,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        ...typography.bodyBold,
        marginBottom: spacing.xs,
    },
    contactDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contactRelation: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
    },
    contactPhone: {
        ...typography.caption,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    removeButton: {
        padding: spacing.sm,
        backgroundColor: '#FEE2E2',
        borderRadius: radius.full,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: radius.full,
        marginTop: spacing.lg,
        ...shadow.md,
    },
    addButtonText: {
        ...typography.bodyBold,
        color: '#fff',
    },
    addForm: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.subtle,
    },
    formTitle: {
        ...typography.bodyBold,
        marginBottom: spacing.md,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...typography.body,
    },
    formActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.sm,
    },
    formBtn: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.full,
        marginLeft: spacing.sm,
    },
    cancelBtn: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cancelBtnText: {
        ...typography.bodyBold,
        color: colors.textSecondary,
    },
    saveBtn: {
        backgroundColor: colors.primary,
    },
    saveBtnText: {
        ...typography.bodyBold,
        color: '#fff',
    },
});
