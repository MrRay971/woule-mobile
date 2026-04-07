import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'

export default function ProfilScreen() {
  const { profile, ambassadeur, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive',
        onPress: async () => { await signOut(); router.replace('/(auth)/login') }
      }
    ])
  }

  const rows = [
    { label: 'Email', value: profile?.email || '—' },
    { label: 'Prénom', value: profile?.first_name || '—' },
    { label: 'Nom', value: profile?.last_name || '—' },
    { label: 'Rôle', value: profile?.role || '—' },
    { label: 'Statut', value: profile?.status || '—' },
    { label: 'Territoire', value: ambassadeur?.territory || '—' },
    { label: 'Total km', value: `${Number(ambassadeur?.total_km || 0).toFixed(2)} km` },
    { label: 'Total points', value: `${ambassadeur?.total_points || 0} pts` },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.first_name?.[0] || 'A').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.first_name} {profile?.last_name}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: profile?.status === 'validated' ? Colors.green + '20' : Colors.orange + '20' }
          ]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: profile?.status === 'validated' ? Colors.green : Colors.orange }}>
              {profile?.status === 'validated' ? '✓ Compte validé' : '⏳ En attente'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          {rows.map(row => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📱 À propos de l'app</Text>
          <Text style={styles.infoText}>Woule Mobile App v1.0</Text>
          <Text style={styles.infoText}>Supabase: szhiigkayxedicktgvls</Text>
          <Text style={styles.infoText}>Build: Expo SDK 55</Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: { alignItems: 'center', paddingVertical: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.yellow, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: Colors.dark },
  name: { fontSize: 22, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  email: { fontSize: 14, color: Colors.gray, marginBottom: 10 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },

  card: {
    marginHorizontal: 20, backgroundColor: Colors.darkCard, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.darkBorder, marginBottom: 16, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.darkBorder,
  },
  rowLabel: { fontSize: 14, color: Colors.gray },
  rowValue: { fontSize: 14, fontWeight: '700', color: Colors.white, maxWidth: '60%', textAlign: 'right' },

  infoCard: {
    marginHorizontal: 20, backgroundColor: Colors.darkCard, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.darkBorder, marginBottom: 16, gap: 4,
  },
  infoTitle: { fontSize: 14, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  infoText: { fontSize: 12, color: Colors.gray },

  signOutBtn: {
    marginHorizontal: 20, backgroundColor: Colors.red + '15', borderRadius: 18,
    paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.red + '30',
  },
  signOutText: { fontSize: 16, fontWeight: '700', color: Colors.red },
})
