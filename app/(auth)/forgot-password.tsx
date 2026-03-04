import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()

  const handleReset = async () => {
    if (!email.trim()) return
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://woule-web.vercel.app/reset-password',
    })
    setLoading(false)
    if (error) {
      Alert.alert('Erreur', error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={styles.card}>
          {sent ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>📧</Text>
              <Text style={styles.title}>Email envoyé !</Text>
              <Text style={styles.subtitle}>
                Vérifiez votre boîte mail et suivez le lien pour réinitialiser votre mot de passe.
              </Text>
              <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
                <Text style={styles.btnText}>Retour à la connexion</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Mot de passe oublié</Text>
              <Text style={styles.subtitle}>
                Entrez votre email pour recevoir un lien de réinitialisation.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor={Colors.gray}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <TouchableOpacity
                style={[styles.btn, loading && { opacity: 0.6 }]}
                onPress={handleReset}
                disabled={loading}
              >
                <Text style={styles.btnText}>
                  {loading ? 'Envoi…' : 'Envoyer le lien'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark, paddingHorizontal: 24 },
  backBtn: { marginTop: 60, marginBottom: 20 },
  backText: { color: Colors.yellow, fontSize: 15 },
  card: {
    backgroundColor: Colors.darkCard, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.gray, marginBottom: 24, lineHeight: 20 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: Colors.white, marginBottom: 16,
  },
  btn: {
    backgroundColor: Colors.yellow, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  btnText: { fontSize: 15, fontWeight: '800', color: Colors.dark },
})
