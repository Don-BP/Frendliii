import React, { useState, useEffect } from 'react';
import {
  View, Text, Switch, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../constants/tokens';

const HOUR_OPTIONS = [
  { label: '24 hours before', value: 24 },
  { label: '48 hours before', value: 48 },
  { label: '1 week before', value: 168 },
];

const SCOPE_OPTIONS = [
  { label: 'All nearby venues', value: 'all_nearby' },
  { label: "Only venues I've visited", value: 'interacted_only' },
];

type NotifPrefs = {
  notify_expiring_perks: boolean;
  notify_expiring_perks_hours: number;
  notify_expiring_perks_scope: 'all_nearby' | 'interacted_only';
};

const DEFAULTS: NotifPrefs = {
  notify_expiring_perks: true,
  notify_expiring_perks_hours: 48,
  notify_expiring_perks_scope: 'all_nearby',
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS);

  useEffect(() => { loadPrefs(); }, []);

  async function loadPrefs() {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase!
      .from('user_notification_preferences')
      .select('notify_expiring_perks, notify_expiring_perks_hours, notify_expiring_perks_scope')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setPrefs(data as NotifPrefs);
    setLoading(false);
  }

  async function save(updates: Partial<NotifPrefs>) {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    setSaving(true);
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase!
      .from('user_notification_preferences')
      .upsert({ user_id: user.id, ...next }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) Alert.alert('Error', 'Failed to save. Please try again.');
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <View style={{ width: 24 }} />}
      </View>

      {/* Expiring Perks section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Expiring Perks</Text>
        <Text style={styles.sectionDesc}>
          Get notified before a venue perk near you expires.
        </Text>

        {/* Main toggle */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Enable notifications</Text>
          <Switch
            value={prefs.notify_expiring_perks}
            onValueChange={(v) => save({ notify_expiring_perks: v })}
            trackColor={{ true: colors.primary }}
          />
        </View>

        {prefs.notify_expiring_perks && (
          <>
            {/* Timing */}
            <Text style={styles.subLabel}>How far in advance?</Text>
            {HOUR_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.optionRow}
                onPress={() => save({ notify_expiring_perks_hours: opt.value })}
              >
                <Text style={styles.optionLabel}>{opt.label}</Text>
                {prefs.notify_expiring_perks_hours === opt.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            {/* Scope */}
            <Text style={[styles.subLabel, { marginTop: spacing.md }]}>For which venues?</Text>
            {SCOPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.optionRow}
                onPress={() => save({ notify_expiring_perks_scope: opt.value as NotifPrefs['notify_expiring_perks_scope'] })}
              >
                <Text style={styles.optionLabel}>{opt.label}</Text>
                {prefs.notify_expiring_perks_scope === opt.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: colors.textPrimary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: 16, fontFamily: typography.h3.fontFamily, color: colors.textPrimary, marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 15, color: colors.textPrimary },
  subLabel: { fontSize: 13, color: colors.textTertiary, marginTop: spacing.sm, marginBottom: 4 },
  optionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  optionLabel: { fontSize: 14, color: colors.textPrimary },
});
