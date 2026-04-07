import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Switch, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Tab = 'settings' | 'history';

type SafetySettings = {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_email: string;
  stage2_delay_min: number;
  contact_delay_min: number;
  reminder_interval_min: number;
  stage4_enabled: boolean;
};

type Incident = {
  id: string;
  status: 'active' | 'likely_safe' | 'resolved';
  created_at: string;
  safety_sessions: {
    venue_name: string;
    venue_address: string;
    other_person_first_name: string;
    scheduled_time: string;
  };
};

const STAGE2_OPTIONS = [5, 10, 15, 20];
const CONTACT_DELAY_OPTIONS = [15, 30, 60, 120];
const REMINDER_OPTIONS = [15, 30, 60];

export default function SafetySettingsScreen() {
  const [tab, setTab] = useState<Tab>('settings');
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SafetySettings>({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_email: '',
    stage2_delay_min: 10,
    contact_delay_min: 30,
    reminder_interval_min: 30,
    stage4_enabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  async function loadSettings() {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return;
    const { data } = await supabase!
      .from('user_safety_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (data) setSettings(data);
  }

  async function saveSettings() {
    setSaving(true);
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return;
    const { error } = await supabase!
      .from('user_safety_settings')
      .upsert({ ...settings, user_id: user.id, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) Alert.alert('Error', 'Failed to save settings');
    else Alert.alert('Saved', 'Safety settings updated');
  }

  async function loadHistory() {
    setLoadingHistory(true);
    const { data: { session } } = await supabase!.auth.getSession();
    if (!session) return;
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/safety/incidents`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    const data = await res.json();
    setIncidents(Array.isArray(data) ? data : []);
    setLoadingHistory(false);
  }

  const statusColor = (s: string) =>
    s === 'resolved' ? '#22c55e' : s === 'likely_safe' ? '#f59e0b' : '#ef4444';
  const statusLabel = (s: string) =>
    s === 'resolved' ? 'Resolved' : s === 'likely_safe' ? 'Likely Safe' : 'Active';

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['settings', 'history'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'settings' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.section}>Emergency Contact</Text>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#666"
            value={settings.emergency_contact_name}
            onChangeText={v => setSettings(s => ({ ...s, emergency_contact_name: v }))} />
          <TextInput style={styles.input} placeholder="Phone number" placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={settings.emergency_contact_phone}
            onChangeText={v => setSettings(s => ({ ...s, emergency_contact_phone: v }))} />
          <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="#666"
            keyboardType="email-address" autoCapitalize="none"
            value={settings.emergency_contact_email}
            onChangeText={v => setSettings(s => ({ ...s, emergency_contact_email: v }))} />

          <Text style={styles.section}>Escalation Timing</Text>

          <Text style={styles.label}>Follow-up delay (after missed Stage 1)</Text>
          <View style={styles.optionRow}>
            {STAGE2_OPTIONS.map(n => (
              <TouchableOpacity key={n} style={[styles.option, settings.stage2_delay_min === n && styles.optionActive]}
                onPress={() => setSettings(s => ({ ...s, stage2_delay_min: n }))}>
                <Text style={[styles.optionText, settings.stage2_delay_min === n && styles.optionTextActive]}>{n}m</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Emergency contact delay (after missed follow-up, phone not at venue)</Text>
          <View style={styles.optionRow}>
            {CONTACT_DELAY_OPTIONS.map(n => (
              <TouchableOpacity key={n} style={[styles.option, settings.contact_delay_min === n && styles.optionActive]}
                onPress={() => setSettings(s => ({ ...s, contact_delay_min: n }))}>
                <Text style={[styles.optionText, settings.contact_delay_min === n && styles.optionTextActive]}>
                  {n >= 60 ? `${n / 60}h` : `${n}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Safe-but-forgot reminder interval</Text>
          <View style={styles.optionRow}>
            {REMINDER_OPTIONS.map(n => (
              <TouchableOpacity key={n} style={[styles.option, settings.reminder_interval_min === n && styles.optionActive]}
                onPress={() => setSettings(s => ({ ...s, reminder_interval_min: n }))}>
                <Text style={[styles.optionText, settings.reminder_interval_min === n && styles.optionTextActive]}>{n}m</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.section}>Advanced</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Include police-share link</Text>
              <Text style={styles.toggleSub}>Adds a one-tap link in the emergency contact alert to share incident details with local police. Optional.</Text>
            </View>
            <Switch
              value={settings.stage4_enabled}
              onValueChange={v => setSettings(s => ({ ...s, stage4_enabled: v }))}
              trackColor={{ true: '#FF5C39' }}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveSettings} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Settings</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {loadingHistory ? (
            <ActivityIndicator color="#FF5C39" style={{ marginTop: 40 }} />
          ) : incidents.length === 0 ? (
            <Text style={styles.empty}>No incidents on record.</Text>
          ) : (
            incidents.map(inc => (
              <TouchableOpacity key={inc.id} style={styles.incidentCard}
                onPress={() => setExpandedId(expandedId === inc.id ? null : inc.id)}>
                <View style={styles.incidentHeader}>
                  <Text style={styles.incidentVenue}>{inc.safety_sessions?.venue_name ?? '—'}</Text>
                  <View style={[styles.badge, { backgroundColor: statusColor(inc.status) + '22', borderColor: statusColor(inc.status) }]}>
                    <Text style={[styles.badgeText, { color: statusColor(inc.status) }]}>{statusLabel(inc.status)}</Text>
                  </View>
                </View>
                <Text style={styles.incidentDate}>{new Date(inc.created_at).toLocaleDateString()}</Text>
                {expandedId === inc.id && inc.safety_sessions && (
                  <View style={styles.incidentDetail}>
                    <Text style={styles.detailText}>Address: {inc.safety_sessions.venue_address}</Text>
                    <Text style={styles.detailText}>Meetup time: {new Date(inc.safety_sessions.scheduled_time).toLocaleString()}</Text>
                    <Text style={styles.detailText}>Met with: {inc.safety_sessions.other_person_first_name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#222' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#FF5C39' },
  tabText: { color: '#666', fontSize: 15, fontWeight: '500' },
  tabTextActive: { color: '#FF5C39' },
  content: { padding: 20, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginTop: 24, marginBottom: 12 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, color: '#f1f1f1', fontSize: 16, marginBottom: 10 },
  label: { fontSize: 13, color: '#aaa', marginBottom: 8, marginTop: 12 },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  option: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  optionActive: { borderColor: '#FF5C39', backgroundColor: '#FF5C3922' },
  optionText: { color: '#888', fontSize: 14, fontWeight: '500' },
  optionTextActive: { color: '#FF5C39' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginTop: 8 },
  toggleText: { flex: 1, marginRight: 12 },
  toggleLabel: { color: '#f1f1f1', fontSize: 15, fontWeight: '500' },
  toggleSub: { color: '#666', fontSize: 12, marginTop: 4 },
  saveBtn: { backgroundColor: '#FF5C39', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 15 },
  incidentCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 10 },
  incidentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  incidentVenue: { color: '#f1f1f1', fontSize: 16, fontWeight: '600', flex: 1 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  incidentDate: { color: '#666', fontSize: 13, marginTop: 4 },
  incidentDetail: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#2a2a2a', paddingTop: 10, gap: 4 },
  detailText: { color: '#aaa', fontSize: 13 },
});
