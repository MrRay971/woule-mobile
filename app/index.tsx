import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'

export default function Index() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.dark, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.yellow} />
      </View>
    )
  }

  if (session) {
    return <Redirect href="/(tabs)/dashboard" />
  }

  return <Redirect href="/(auth)/login" />
}
