import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

interface KPI {
  label: string
  value: string
  icon: string
  color: string
}

interface Campaign {
  id: string
  name: string
  status: string
  annonceurs?: { company_name?: string }
}

export default function DashboardScreen() {
  const { profile, ambassadeur, signOut, refreshProfile } = useAuth()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadData()
  }, [ambassadeur])

  const loadData = async () => {
    if (!ambassadeur?.id) return
    const [{ data: camps }, { data: notifs }] = await Promise.all([
      supabase
        .from('campaign_assignments')
        .select('campaign_id, status, campaigns(id, name, status, annonceurs(company_name))')
        .eq('ambassadeur_id', ambassadeur.id)
        .limit(3),
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])
    if (camps) setCampaigns(camps.map((c: any) => ({ ...c.campaigns, assignment_status: c.status })))
    if (notifs) {
      setNotifications(notifs)
      setUnreadCount(notifs.filter((n: any) => !n.read).length)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    refreshProfile()
    await loadData()
    setRefreshing(false)
  }

  const kpis: KPI[] = [
    {
      label: 'Km ce mois',
      value: `${ambassadeur?.total_km ?? 0}`,
      icon: '📍',
      color: '#3B82F6',
    },
    {
      label: 'Points total',
      value: `${ambassadeur?.total_points ?? 0}`,
      icon: '⭐',
      color: Colors.yellow,
    },
    {
      label: 'Campagnes',
      value: `${campaigns.length}`,
      icon: '📢',
      color: '#8B5CF6',
    },
    {
      label: 'Notifications',
      value: `${unreadCount}`,
      icon: '🔔',
      color: unreadCount > 0 ? Colors.red : Colors.gray,
    },
  ]

  const firstName = profile?.first_name || 'Ambassadeur'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.yellow} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.name}>{firstName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: profile?.status === 'active' ? Colors.green + '20' : Colors.orange + '20' }]}>
              <Text style={{ fontSize: 8, color: profile?.status === 'active' ? Colors.green : Colors.orange }}>●</Text>
              <Text style={[styles.statusText, { color: profile?.status === 'active' ? Colors.green : Colors.orange }]}>
                {profile?.status === 'active' ? 'Compte actif' : profile?.status === 'pending' ? 'En attente validation' : profile?.status || 'N/A'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Text style={{ fontSize: 20 }}>🚪</Text>
          </TouchableOpacity>
        </View>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, i) => (
            <View key={i} style={[styles.kpiCard, { borderTopColor: kpi.color }]}>
              <Text style={styles.kpiIcon}>{kpi.icon}</Text>
              <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Territoire */}
        {ambassadeur?.territory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Mon territoire</Text>
            <View style={styles.territoryCard}>
              <Text style={styles.territoryName}>
                {ambassadeur.territory.charAt(0).toUpperCase() + ambassadeur.territory.slice(1)}
              </Text>
              <Text style={styles.territoryType}>{ambassadeur.type || 'Ambassadeur'}</Text>
            </View>
          </View>
        )}

        {/* Campagnes actives */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📢 Mes campagnes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/campagnes')}>
              <Text style={styles.seeAll}>Tout voir →</Text>
            </TouchableOpacity>
          </View>

          {campaigns.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
              <Text style={styles.emptyText}>Aucune campagne active</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/campagnes')} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Voir les campagnes disponibles</Text>
              </TouchableOpacity>
            </View>
          ) : (
            campaigns.map((c) => (
              <View key={c.id} style={styles.campaignCard}>
                <View style={styles.campaignLeft}>
                  <Text style={{ fontSize: 20 }}>📢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.campaignName}>{c.name}</Text>
                  <Text style={styles.campaignCompany}>
                    {(c as any).annonceurs?.company_name || 'Annonceur'}
                  </Text>
                </View>
                <View style={[styles.campBadge, {
                  backgroundColor: (c as any).assignment_status === 'active' ? Colors.green + '20' : Colors.yellow + '20'
                }]}>
                  <Text style={{
                    fontSize: 11, fontWeight: '700',
                    color: (c as any).assignment_status === 'active' ? Colors.green : Colors.yellow
                  }}>
                    {(c as any).assignment_status === 'active' ? 'Active' :
                     (c as any).assignment_status === 'candidate' ? 'Candidat' : (c as any).assignment_status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Notifications récentes */}
        {notifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Notifications récentes</Text>
            {notifications.slice(0, 3).map((n) => (
              <View key={n.id} style={[styles.notifCard, !n.read && styles.notifUnread]}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                {n.message && <Text style={styles.notifMsg}>{n.message}</Text>}
                <Text style={styles.notifDate}>
                  {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  greeting: { fontSize: 14, color: Colors.gray },
  name: { fontSize: 26, fontWeight: '900', color: Colors.white, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 6,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  logoutBtn: {
    width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10, marginTop: 16,
  },
  kpiCard: {
    width: '46%', backgroundColor: Colors.darkCard,
    borderRadius: 16, padding: 16,
    borderTopWidth: 3, borderColor: Colors.darkBorder,
    borderWidth: 1,
  },
  kpiIcon: { fontSize: 22, marginBottom: 8 },
  kpiValue: { fontSize: 28, fontWeight: '900' },
  kpiLabel: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.white },
  seeAll: { fontSize: 13, color: Colors.yellow },
  territoryCard: {
    backgroundColor: Colors.darkCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.darkBorder,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  territoryName: { fontSize: 18, fontWeight: '800', color: Colors.yellow },
  territoryType: { fontSize: 13, color: Colors.gray },
  emptyCard: {
    backgroundColor: Colors.darkCard, borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.darkBorder,
  },
  emptyText: { color: Colors.gray, fontSize: 14, marginBottom: 16 },
  actionBtn: {
    backgroundColor: Colors.yellow, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: Colors.dark },
  campaignCard: {
    backgroundColor: Colors.darkCard, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.darkBorder,
  },
  campaignLeft: {
    width: 40, height: 40, backgroundColor: 'rgba(255,219,21,0.1)',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  campaignName: { fontSize: 14, fontWeight: '700', color: Colors.white },
  campaignCompany: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  campBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  notifCard: {
    backgroundColor: Colors.darkCard, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.darkBorder,
  },
  notifUnread: { borderColor: Colors.yellow + '40' },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.white },
  notifMsg: { fontSize: 12, color: Colors.gray, marginTop: 4 },
  notifDate: { fontSize: 11, color: '#4B5563', marginTop: 6 },
})
