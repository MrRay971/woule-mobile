import { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Alert, Switch
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'

export default function ProfilScreen() {
  const { profile, ambassadeur, user, signOut, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
  })

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
    }).eq('id', user.id)
    setSaving(false)
    if (error) {
      Alert.alert('Erreur', error.message)
    } else {
      refreshProfile()
      setEditing(false)
      Alert.alert('✅ Profil mis à jour !')
    }
  }

  const initials = `${profile?.first_name?.[0] || '?'}${profile?.last_name?.[0] || ''}`.toUpperCase()
  const territory = ambassadeur?.territory
    ? ambassadeur.territory.charAt(0).toUpperCase() + ambassadeur.territory.slice(1)
    : '—'

  const menuItems = [
    { icon: '📋', label: 'Mes informations', action: () => setEditing(true) },
    { icon: '🔒', label: 'Changer de mot de passe', action: () => Alert.alert('Info', 'Rendez-vous sur woule-web.vercel.app pour changer votre mot de passe.') },
    { icon: '📱', label: 'Notifications', action: () => Alert.alert('Info', 'Les notifications sont actives.') },
    { icon: '❓', label: 'Aide & Support', action: () => Alert.alert('Support', 'Contactez-nous : support@woule.app') },
    { icon: '📄', label: 'Conditions d\'utilisation', action: () => Alert.alert('CGU', 'Disponibles sur woule-web.vercel.app/cgu') },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + infos */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.first_name} {profile?.last_name}</Text>
          <Text style={styles.email}>{profile?.email || user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: Colors.yellow + '20' }]}>
            <Text style={[styles.roleText, { color: Colors.yellow }]}>
              🚗 Ambassadeur · {territory}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{(ambassadeur?.total_km ?? 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>km total</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{ambassadeur?.total_points ?? 0}</Text>
            <Text style={styles.statLabel}>points</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statCard}>
            <View style={[styles.statusDot, {
              backgroundColor: profile?.status === 'active' ? Colors.green : Colors.orange
            }]} />
            <Text style={styles.statLabel}>
              {profile?.status === 'active' ? 'Actif' : profile?.status || '—'}
            </Text>
          </View>
        </View>

        {/* Formulaire édition */}
        {editing ? (
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Modifier mon profil</Text>

            <Text style={styles.fieldLabel}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={form.first_name}
              onChangeText={v => setForm(f => ({ ...f, first_name: v }))}
              placeholder="Prénom"
              placeholderTextColor={Colors.gray}
            />

            <Text style={styles.fieldLabel}>Nom</Text>
            <TextInput
              style={styles.input}
              value={form.last_name}
              onChangeText={v => setForm(f => ({ ...f, last_name: v }))}
              placeholder="Nom"
              placeholderTextColor={Colors.gray}
            />

            <Text style={styles.fieldLabel}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={v => setForm(f => ({ ...f, phone: v }))}
              placeholder="+596 XXX XXX"
              placeholderTextColor={Colors.gray}
              keyboardType="phone-pad"
            />

            <View style={styles.editBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Sauvegarde…' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Menu options */
          <View style={styles.menuCard}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
                onPress={item.action}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Version */}
        <Text style={styles.version}>Woulé Mobile v1.0.0</Text>

        {/* Déconnexion */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => Alert.alert(
            'Déconnexion',
            'Voulez-vous vraiment vous déconnecter ?',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Déconnexion', style: 'destructive', onPress: signOut },
            ]
          )}
        >
          <Text style={styles.logoutText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const Colors2 = { orange: '#F97316' }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  profileSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.yellow,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: Colors.dark },
  name: { fontSize: 22, fontWeight: '900', color: Colors.white, marginTop: 12 },
  email: { fontSize: 14, color: Colors.gray, marginTop: 4 },
  roleBadge: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 10,
  },
  roleText: { fontSize: 13, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    backgroundColor: Colors.darkCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.darkBorder,
    alignItems: 'center',
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.white },
  statLabel: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  divider: { width: 1, height: 40, backgroundColor: Colors.darkBorder },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  editCard: {
    marginHorizontal: 20, backgroundColor: Colors.darkCard, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: Colors.darkBorder,
  },
  editTitle: { fontSize: 18, fontWeight: '800', color: Colors.white, marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: Colors.gray, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: Colors.white, marginBottom: 14,
  },
  editBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center',
  },
  cancelText: { color: Colors.gray, fontWeight: '600' },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.yellow, alignItems: 'center',
  },
  saveText: { color: Colors.dark, fontWeight: '800' },
  menuCard: {
    marginHorizontal: 20, backgroundColor: Colors.darkCard, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.darkBorder, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.darkBorder },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.white, fontWeight: '500' },
  menuArrow: { fontSize: 20, color: Colors.gray },
  version: { textAlign: 'center', color: '#2D3748', fontSize: 12, marginTop: 20, marginBottom: 12 },
  logoutBtn: {
    marginHorizontal: 20, paddingVertical: 14, borderRadius: 16,
    backgroundColor: Colors.red + '15', borderWidth: 1, borderColor: Colors.red + '30',
    alignItems: 'center',
  },
  logoutText: { color: Colors.red, fontWeight: '700', fontSize: 15 },
})
