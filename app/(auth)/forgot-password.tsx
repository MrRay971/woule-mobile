import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()

  const handleReset = async () => {
    if (!email.trim()) { Alert.alert('Requis', 'Saisissez votre adresse email.'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'woule://reset-password',
    })
    setLoading(false)
    if (error) { Alert.alert('Erreur', error.message) }
    else { setSent(true) }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={{ fontSize: 52, marginBottom: 20 }}>📧</Text>
        <Text style={styles.title}>Email envoyé !</Text>
        <Text style={styles.sub}>Consultez votre boîte mail et suivez le lien pour réinitialiser votre mot de passe.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Mot de passe oublié</Text>
      <Text style={styles.sub}>Saisissez votre email pour recevoir un lien de réinitialisation.</Text>
      <TextInput
        style={styles.input}
        placeholder="votre@email.com"
        placeholderTextColor={Colors.gray}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleReset} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Envoi…' : 'Envoyer le lien'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark, padding: 24, justifyContent: 'center', alignItems: 'center' },
  back: { position: 'absolute', top: 60, left: 24 },
  backText: { color: Colors.yellow, fontSize: 15, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '900', color: Colors.white, marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  input: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.white, marginBottom: 16,
  },
  btn: { backgroundColor: Colors.yellow, borderRadius: 16, paddingVertical: 16, width: '100%', alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '900', color: Colors.dark },
})
