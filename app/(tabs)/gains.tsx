import { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'

const TIERS = [
  { min: 0, max: 499, label: '🥉 Débutant', color: '#CD7F32' },
  { min: 500, max: 999, label: '🥈 Confirmé', color: '#C0C0C0' },
  { min: 1000, max: 1999, label: '🥇 Expert', color: Colors.yellow },
  { min: 2000, max: Infinity, label: '💎 Élite', color: '#00D4FF' },
]

export default function GainsScreen() {
  const { ambassadeur } = useAuth()
  const [rewards, setRewards] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadData() }, [ambassadeur])

  const loadData = async () => {
    if (!ambassadeur?.id) return
    const [{ data: rew }, { data: sess }] = await Promise.all([
      supabase.from('rewards').select('*').eq('ambassadeur_id', ambassadeur.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('tracking_sessions').select('*').eq('ambassadeur_id', ambassadeur.id).eq('status', 'completed').order('start_time', { ascending: false }).limit(10),
    ])
    if (rew) setRewards(rew)
    if (sess) setSessions(sess)
  }

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false) }

  const totalPoints = ambassadeur?.total_points ?? 0
  const currentTier = TIERS.find(t => totalPoints >= t.min && totalPoints <= t.max) || TIERS[0]
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1]
  const progress = nextTier ? Math.min(((totalPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100) : 100

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.yellow} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>💰 Mes Gains</Text>
        </View>

        {/* Carte points total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Points totaux</Text>
          <Text style={styles.totalValue}>{totalPoints.toLocaleString('fr-FR')}</Text>
          <Text style={styles.tierLabel}>{currentTier.label}</Text>

          {/* Barre progression */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {
              width: `${progress}%` as any,
              backgroundColor: currentTier.color,
            }]} />
          </View>
          {nextTier && (
            <Text style={styles.progressText}>
              {nextTier.min - totalPoints} pts pour atteindre {nextTier.label}
            </Text>
          )}
        </View>

        {/* Stats km */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📍</Text>
            <Text style={styles.statValue}>{(ambassadeur?.total_km ?? 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>km total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏁</Text>
            <Text style={styles.statValue}>{sessions.length}</Text>
            <Text style={styles.statLabel}>sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎁</Text>
            <Text style={styles.statValue}>{rewards.length}</Text>
            <Text style={styles.statLabel}>récompenses</Text>
          </View>
        </View>

        {/* Sessions récentes */}
        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚗 Sessions récentes</Text>
            {sessions.map(s => (
              <View key={s.id} style={styles.sessionCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionDate}>{fmt(s.start_time)}</Text>
                  <Text style={styles.sessionKm}>{(s.distance_km || 0).toFixed(2)} km</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.sessionPts}>+{s.points_earned || 0} pts</Text>
                  <Text style={styles.sessionDuration}>
                    {Math.floor((s.duration_seconds || 0) / 60)} min
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Récompenses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎁 Récompenses</Text>
          {rewards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>💰</Text>
              <Text style={styles.emptyText}>Pas encore de récompenses</Text>
              <Text style={styles.emptySubtext}>Continuez à conduire pour accumuler des points !</Text>
            </View>
          ) : rewards.map(r => (
            <View key={r.id} style={styles.rewardCard}>
              <Text style={{ fontSize: 28 }}>
                {r.type === 'fuel_voucher' ? '⛽' : r.type === 'goodie' ? '🎁' : '⭐'}
              </Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rewardType}>{r.type || 'Récompense'}</Text>
                <Text style={styles.rewardAmount}>{r.amount} pts</Text>
              </View>
              <View style={[styles.rewardBadge, {
                backgroundColor: r.status === 'paid' ? Colors.green + '20' : Colors.yellow + '20'
              }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: r.status === 'paid' ? Colors.green : Colors.yellow }}>
                  {r.status === 'paid' ? 'Versé' : 'En attente'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.white },
  totalCard: {
    margin: 20, backgroundColor: Colors.darkCard, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.darkBorder,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: Colors.gray, marginBottom: 4 },
  totalValue: { fontSize: 52, fontWeight: '900', color: Colors.yellow },
  tierLabel: { fontSize: 16, fontWeight: '700', color: Colors.white, marginTop: 4, marginBottom: 16 },
  progressBar: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 12, color: Colors.gray, marginTop: 8 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: Colors.darkCard, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.darkBorder,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.white },
  statLabel: { fontSize: 11, color: Colors.gray, marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.white, marginBottom: 12 },
  sessionCard: {
    backgroundColor: Colors.darkCard, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, borderWidth: 1, borderColor: Colors.darkBorder,
  },
  sessionDate: { fontSize: 12, color: Colors.gray },
  sessionKm: { fontSize: 18, fontWeight: '800', color: Colors.white, marginTop: 2 },
  sessionPts: { fontSize: 16, fontWeight: '800', color: Colors.yellow },
  sessionDuration: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  emptyCard: {
    backgroundColor: Colors.darkCard, borderRadius: 14, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.darkBorder,
  },
  emptyText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  emptySubtext: { color: Colors.gray, fontSize: 13, marginTop: 4, textAlign: 'center' },
  rewardCard: {
    backgroundColor: Colors.darkCard, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, borderWidth: 1, borderColor: Colors.darkBorder,
  },
  rewardType: { fontSize: 14, fontWeight: '700', color: Colors.white },
  rewardAmount: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  rewardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
})
