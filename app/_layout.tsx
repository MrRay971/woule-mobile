/**
 * app/_layout.tsx
 * Root layout — wraps entire app with GestureHandler and auth guard
 */

import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'

export default function RootLayout() {
  const router = useRouter()

  useEffect(() => {
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login')
      } else if (event === 'SIGNED_IN' && session) {
        router.replace('/(tabs)/tracking')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />
      </Stack>
    </GestureHandlerRootView>
  )
}
