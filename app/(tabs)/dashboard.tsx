/**
 * app/(tabs)/dashboard.tsx
 * Ambassador home dashboard
 */

import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

export default function DashboardScreen() {
  const { profile, ambassadeur, signOut, refreshProfile } = useAuth()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [recentSessions, setRecentSessions] = useState<Record<string, unknown>[]>([])
  const [activeSessions, setActiveSessions] = useState(0)

  useEffect(() => {
    loadData()
  }, [ambassadeur]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    if (!ambassadeur?.id) return

    // Load recent vehicle sessions
    const { data: sessions } = await supabase
      .from('vehicle_sessions')
      .select('id, start_time, end_time, active, total_km, points_earned, nfc_tag_id')
      .eq('ambassador_id', ambassadeur.id)
      .order('start_time', { ascending: false })
      .limit(5)

    if (sessions) {
      setRecentSessions(sessions)
      setActiveSessions(sessions.filter((s: Record<string, unknown>) => s.active).length)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    refreshProfile()
    await loadData()
    setRefreshing(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace('/(auth)/login')
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.yellow} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour 👋</Text>
            <Text style={styles.name}>
              {profile?.first_name || 'Ambassadeur'} {profile?.last_name || ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {/* KPI cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderColor: Colors.yellow + '40' }]}>
            <Text style={styles.kpiIcon}>📍</Text>
            <Text style={[styles.kpiValue, { color: Colors.yellow }]}>
              {Number(ambassadeur?.total_km || 0).toFixed(1)}
            </Text>
            <Text style={styles.kpiLabel}>km total</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: Colors.green + '40' }]}>
            <Text style={styles.kpiIcon}>⭐</Text>
            <Text style={[styles.kpiValue, { color: Colors.green }]}>
              {ambassadeur?.total_points || 0}
            </Text>
            <Text style={styles.kpiLabel}>points</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#3B82F6' + '40' }]}>
            <Text style={styles.kpiIcon}>🚗</Text>
            <Text style={[styles.kpiValue, { color: '#3B82F6' }]}>
              {recentSessions.length}
            </Text>
            <Text style={styles.kpiLabel}>sessions</Text>
          </View>
          <View style={[styles.kpiCard, activeSessions > 0 ? { borderColor: Colors.green + '60' } : {}]}>
            <Text style={styles.kpiIcon}>🛰️</Text>
            <Text style={[styles.kpiValue, { color: activeSessions > 0 ? Colors.green : Colors.gray }]}>
              {activeSessions}
            </Text>
            <Text style={styles.kpiLabel}>actif maintenant</Text>
          </View>
        </View>

        {/* Quick action — go to tracking */}
        <TouchableOpacity
          style={styles.trackCta}
          onPress={() => router.push('/(tabs)/tracking')}
        >
          <View>
            <Text style={styles.trackCtaTitle}>🏷️ Scanner un tag NFC</Text>
            <Text style={styles.trackCtaSub}>Démarrez le suivi GPS de votre véhicule</Text>
          </View>
          <Text style={styles.trackCtaArrow}>→</Text>
        </TouchableOpacity>

        {/* Recent sessions */}
        <Text style={styles.sectionTitle}>Dernières sessions</Text>
        {recentSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Aucune session enregistrée</Text>
            <Text style={styles.emptySubText}>Scannez un tag NFC pour démarrer</Text>
          </View>
        ) : (
          recentSessions.map((session) => (
            <View key={session.id as string} style={styles.sessionCard}>
              <View style={styles.sessionLeft}>
                <View style={[
                  styles.sessionStatusDot,
                  { backgroundColor: session.active ? Colors.green : Colors.gray }
                ]} />
                <View>
                  <Text style={styles.sessionDate}>
                    {formatDate(session.start_time as string)}
                  </Text>
                  <Text style={styles.sessionTag}>
                    🏷️ {session.nfc_tag_id
                      ? (session.nfc_tag_id as string).substring(0, 16)
                      : 'Tag inconnu'}
                  </Text>
                </View>
              </View>
              <View style={styles.sessionRight}>
                <Text style={styles.sessionKm}>{`${Number(session.total_km || 0).toFixed(2)} km`}</Text>
                <Text style={[styles.sessionPts, { color: Colors.yellow }]}>
                  +{String(session.points_earned || 0)} pts
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  greeting: { fontSize: 14, color: Colors.gray },
  name: { fontSize: 22, fontWeight: '900', color: Colors.white },
  signOutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  signOutText: { fontSize: 12, color: Colors.gray },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  kpiCard: {
    flex: 1, minWidth: '44%', backgroundColor: Colors.darkCard,
    borderRadius: 18, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  kpiIcon: { fontSize: 24, marginBottom: 6 },
  kpiValue: { fontSize: 22, fontWeight: '900', color: Colors.white },
  kpiLabel: { fontSize: 11, color: Colors.gray, marginTop: 2 },

  trackCta: {
    marginHorizontal: 20, backgroundColor: Colors.yellow + '15', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.yellow + '30', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
  },
  trackCtaTitle: { fontSize: 16, fontWeight: '800', color: Colors.yellow, marginBottom: 3 },
  trackCtaSub: { fontSize: 13, color: Colors.gray },
  trackCtaArrow: { fontSize: 22, color: Colors.yellow },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.white, paddingHorizontal: 20, marginBottom: 12 },
  emptyCard: {
    marginHorizontal: 20, backgroundColor: Colors.darkCard, borderRadius: 20, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.darkBorder,
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  emptySubText: { fontSize: 13, color: Colors.gray },

  sessionCard: {
    marginHorizontal: 20, backgroundColor: Colors.darkCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.darkBorder, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  sessionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sessionStatusDot: { width: 10, height: 10, borderRadius: 5 },
  sessionDate: { fontSize: 13, fontWeight: '700', color: Colors.white },
  sessionTag: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  sessionRight: { alignItems: 'flex-end' },
  sessionKm: { fontSize: 15, fontWeight: '800', color: Colors.white },
  sessionPts: { fontSize: 12, fontWeight: '700', marginTop: 2 },
})
