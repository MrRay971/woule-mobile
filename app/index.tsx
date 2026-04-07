/**
 * app/index.tsx
 * Root redirect — check auth and redirect to correct screen
 */

import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      router.replace('/(tabs)/tracking')
    } else {
      router.replace('/(auth)/login')
    }
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.yellow} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
