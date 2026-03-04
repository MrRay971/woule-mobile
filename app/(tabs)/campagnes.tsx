import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, Modal, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'

interface Campaign {
  id: string
  name: string
  status: string
  objective?: string
  description?: string
  start_date?: string
  end_date?: string
  territory?: string | string[]
  points_per_km?: number
  weekly_points?: number
  completion_bonus?: number
  budget?: number
  daily_budget?: number
  annonceurs?: { company_name?: string }
}

export default function CampagnesScreen() {
  const { ambassadeur } = useAuth()
  const [tab, setTab] = useState<'available' | 'mine'>('available')
  const [search, setSearch] = useState('')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [myCampaigns, setMyCampaigns] = useState<any[]>([])
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [applying, setApplying] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadData() }, [ambassadeur])

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0]
    const [{ data: avail }, { data: mine }] = await Promise.all([
      supabase
        .from('campaigns')
        .select('*, annonceurs(company_name)')
        .in('status', ['active', 'en_cours'])
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('created_at', { ascending: false })
        .limit(20),
      ambassadeur?.id
        ? supabase
            .from('campaign_assignments')
            .select('*, campaigns(*, annonceurs(company_name))')
            .eq('ambassadeur_id', ambassadeur.id)
        : Promise.resolve({ data: [] }),
    ])
    if (avail) setCampaigns(avail)
    if (mine) {
      setMyCampaigns(mine)
      setAppliedIds(new Set(mine.map((m: any) => m.campaign_id)))
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleApply = async (campaignId: string) => {
    if (!ambassadeur?.id) return Alert.alert('Erreur', 'Profil non chargé.')
    if (appliedIds.has(campaignId)) return
    setApplying(true)
    const { error } = await supabase.from('campaign_assignments').insert({
      campaign_id: campaignId,
      ambassadeur_id: ambassadeur.id,
      status: 'candidate',
    })
    setApplying(false)
    if (error) {
      Alert.alert('Erreur', 'Impossible de postuler.')
    } else {
      setAppliedIds(prev => new Set([...prev, campaignId]))
      setSelected(null)
      Alert.alert('✅ Candidature envoyée !', 'Votre candidature a bien été enregistrée.')
      loadData()
    }
  }

  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const territory = (c: Campaign) => Array.isArray(c.territory) ? c.territory.join(', ') : (c.territory || 'Tous territoires')
  const gains = (c: Campaign) => c.points_per_km ? `${c.points_per_km} pts/km`
    : c.weekly_points ? `${c.weekly_points} pts/sem`
    : c.completion_bonus ? `${c.completion_bonus} pts` : 'À définir'

  const filtered = (tab === 'available' ? campaigns : myCampaigns.map(m => ({ ...m.campaigns, assignment_status: m.status })))
    .filter((c: Campaign) => c?.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📢 Campagnes</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['available', 'mine'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'available' ? `Disponibles (${campaigns.length})` : `Mes campagnes (${myCampaigns.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une campagne…"
          placeholderTextColor={Colors.gray}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.yellow} />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
            <Text style={styles.emptyText}>Aucune campagne trouvée</Text>
          </View>
        ) : filtered.map((c: Campaign) => {
          const applied = appliedIds.has(c.id)
          return (
            <TouchableOpacity key={c.id} style={styles.card} onPress={() => setSelected(c)}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={styles.cardCompany}>{c.annonceurs?.company_name || '—'}</Text>
                </View>
                {tab === 'mine' && (c as any).assignment_status && (
                  <View style={[styles.badge, {
                    backgroundColor: (c as any).assignment_status === 'active' ? Colors.green + '20' : Colors.yellow + '20'
                  }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: (c as any).assignment_status === 'active' ? Colors.green : Colors.yellow }}>
                      {(c as any).assignment_status}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardMeta}>
                <Text style={styles.metaItem}>📍 {territory(c)}</Text>
                <Text style={styles.metaItem}>⭐ {gains(c)}</Text>
              </View>
              {c.start_date && (
                <Text style={styles.cardDates}>{fmt(c.start_date)} → {fmt(c.end_date)}</Text>
              )}

              {tab === 'available' && (
                <TouchableOpacity
                  style={[styles.applyBtn, applied && styles.applyBtnDisabled]}
                  onPress={(e) => { e.stopPropagation?.(); if (!applied) handleApply(c.id) }}
                >
                  <Text style={[styles.applyBtnText, applied && { color: Colors.gray }]}>
                    {applied ? '✅ Candidature envoyée' : '🚀 Postuler'}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modal détail */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selected.name}</Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Text style={{ color: Colors.gray, fontSize: 24 }}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                {selected.annonceurs?.company_name && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>🏢 Annonceur</Text>
                    <Text style={styles.modalValue}>{selected.annonceurs.company_name}</Text>
                  </View>
                )}
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>📍 Territoire</Text>
                  <Text style={styles.modalValue}>{territory(selected)}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>📅 Début</Text>
                  <Text style={styles.modalValue}>{fmt(selected.start_date)}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>📅 Fin</Text>
                  <Text style={styles.modalValue}>{fmt(selected.end_date)}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>⭐ Gains</Text>
                  <Text style={[styles.modalValue, { color: Colors.yellow }]}>{gains(selected)}</Text>
                </View>
                {selected.daily_budget && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>💰 Budget/jour</Text>
                    <Text style={styles.modalValue}>{selected.daily_budget} €</Text>
                  </View>
                )}
                {selected.objective && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>🎯 Objectif</Text>
                    <Text style={styles.modalText}>{selected.objective}</Text>
                  </View>
                )}
                {selected.description && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>📝 Description</Text>
                    <Text style={styles.modalText}>{selected.description}</Text>
                  </View>
                )}
              </View>

              <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                <TouchableOpacity
                  style={[styles.modalApplyBtn, (appliedIds.has(selected.id) || applying) && styles.applyBtnDisabled]}
                  onPress={() => handleApply(selected.id)}
                  disabled={appliedIds.has(selected.id) || applying}
                >
                  <Text style={styles.modalApplyText}>
                    {applying ? 'Envoi…' : appliedIds.has(selected.id) ? '✅ Candidature envoyée' : '🚀 Postuler à cette campagne'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.white },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.darkCard, borderRadius: 14, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.yellow },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.gray },
  tabTextActive: { color: Colors.dark },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.darkCard, borderRadius: 14, paddingHorizontal: 12,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: Colors.white, fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.gray, fontSize: 15 },
  card: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.darkCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardName: { fontSize: 15, fontWeight: '800', color: Colors.white },
  cardCompany: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  cardMeta: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  metaItem: { fontSize: 12, color: Colors.gray },
  cardDates: { fontSize: 11, color: '#4B5563', marginBottom: 10 },
  applyBtn: {
    backgroundColor: Colors.yellow, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  applyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.06)' },
  applyBtnText: { fontSize: 13, fontWeight: '700', color: Colors.dark },
  modal: { flex: 1, backgroundColor: Colors.dark, paddingTop: 12 },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.darkBorder,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: Colors.white, flex: 1, paddingRight: 16 },
  modalContent: { paddingHorizontal: 20, marginBottom: 16 },
  modalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.darkBorder,
  },
  modalSection: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.darkBorder },
  modalLabel: { fontSize: 13, color: Colors.gray },
  modalValue: { fontSize: 14, fontWeight: '700', color: Colors.white },
  modalText: { fontSize: 14, color: Colors.white, marginTop: 6, lineHeight: 22 },
  modalApplyBtn: {
    backgroundColor: Colors.yellow, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  modalApplyText: { fontSize: 16, fontWeight: '900', color: Colors.dark },
})
