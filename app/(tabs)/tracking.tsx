import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'

interface TrackPoint {
  lat: number
  lng: number
  timestamp: number
  speed?: number
}

export default function TrackingScreen() {
  const { user, ambassadeur } = useAuth()
  const [isTracking, setIsTracking] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceKm, setDistanceKm] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [points, setPoints] = useState<TrackPoint[]>([])
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [status, setStatus] = useState<'idle' | 'tracking' | 'paused' | 'saving'>('idle')

  const locationSub = useRef<Location.LocationSubscription | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    requestPermissions()
    return () => {
      void stopTracking()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status === 'granted') {
      setPermissionGranted(true)
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      setCurrentLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
    } else {
      Alert.alert(
        'Permission requise',
        'L\'accès à la localisation est nécessaire pour le suivi GPS.',
        [{ text: 'OK' }]
      )
    }
  }

  const startTracking = async () => {
    if (!permissionGranted) {
      await requestPermissions()
      return
    }
    if (!ambassadeur?.id) {
      Alert.alert('Erreur', 'Profil ambassadeur non chargé.')
      return
    }

    // Créer une session en base
    const { data: session, error } = await supabase
      .from('tracking_sessions')
      .insert({
        ambassadeur_id: ambassadeur.id,
        start_time: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      Alert.alert('Erreur', 'Impossible de démarrer la session.')
      return
    }

    setSessionId(session.id)
    setIsTracking(true)
    setStatus('tracking')
    setDistanceKm(0)
    setDuration(0)
    setPoints([])
    startTimeRef.current = Date.now()

    // Timer durée
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    // Suivi GPS
    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      async (location) => {
        const { latitude, longitude, speed: spd } = location.coords
        setCurrentLocation({ lat: latitude, lng: longitude })
        setSpeed(Math.round((spd ?? 0) * 3.6)) // m/s → km/h

        const newPoint: TrackPoint = {
          lat: latitude,
          lng: longitude,
          timestamp: location.timestamp,
          speed: spd ?? 0,
        }

        setPoints(prev => {
          const updated = [...prev, newPoint]
          if (updated.length > 1) {
            const last = updated[updated.length - 2]
            const dist = haversine(last.lat, last.lng, latitude, longitude)
            setDistanceKm(d => parseFloat((d + dist).toFixed(2)))
          }
          return updated
        })

        // Sauvegarder en base
        if (session?.id) {
          await supabase.from('tracking_points').insert({
            session_id: session.id,
            latitude,
            longitude,
            speed: spd ?? 0,
            recorded_at: new Date(location.timestamp).toISOString(),
          })
        }
      }
    )
  }

  const stopTracking = async () => {
    if (locationSub.current) {
      locationSub.current.remove()
      locationSub.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (sessionId && isTracking) {
      setStatus('saving')
      const pointsEarned = Math.floor(distanceKm * 10)

      await supabase.from('tracking_sessions').update({
        end_time: new Date().toISOString(),
        distance_km: distanceKm,
        duration_seconds: duration,
        points_earned: pointsEarned,
        status: 'completed',
      }).eq('id', sessionId)

      // Mettre à jour le total km de l'ambassadeur
      if (ambassadeur?.id) {
        await supabase.from('ambassadeurs').update({
          total_km: (ambassadeur.total_km || 0) + distanceKm,
          total_points: (ambassadeur.total_points || 0) + pointsEarned,
        }).eq('id', ambassadeur.id)
      }

      Alert.alert(
        '✅ Session terminée',
        `Distance : ${distanceKm} km\nDurée : ${formatDuration(duration)}\nPoints gagnés : ${pointsEarned} pts`,
        [{ text: 'Super !' }]
      )
    }

    setIsTracking(false)
    setSessionId(null)
    setStatus('idle')
    setDistanceKm(0)
    setDuration(0)
    setSpeed(0)
  }

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🚗 Suivi GPS</Text>
          <View style={[styles.statusDot, { backgroundColor: isTracking ? Colors.green : Colors.gray }]} />
        </View>

        {/* Indicateur GPS */}
        <View style={styles.gpsCard}>
          {currentLocation ? (
            <>
              <Text style={styles.gpsLabel}>Position actuelle</Text>
              <Text style={styles.gpsCoords}>
                {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
              </Text>
              <Text style={styles.gpsStatus}>📡 GPS actif</Text>
            </>
          ) : (
            <Text style={styles.gpsStatus}>⏳ Acquisition du signal GPS…</Text>
          )}
        </View>

        {/* Métriques live */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>📍</Text>
            <Text style={styles.metricValue}>{distanceKm.toFixed(2)}</Text>
            <Text style={styles.metricUnit}>km</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>⏱️</Text>
            <Text style={styles.metricValue}>{formatDuration(duration)}</Text>
            <Text style={styles.metricUnit}>durée</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>💨</Text>
            <Text style={styles.metricValue}>{speed}</Text>
            <Text style={styles.metricUnit}>km/h</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: Colors.yellow + '40' }]}>
            <Text style={styles.metricIcon}>⭐</Text>
            <Text style={[styles.metricValue, { color: Colors.yellow }]}>{Math.floor(distanceKm * 10)}</Text>
            <Text style={styles.metricUnit}>pts estimés</Text>
          </View>
        </View>

        {/* Bouton principal */}
        <View style={styles.ctaContainer}>
          {!isTracking ? (
            <TouchableOpacity
              style={[styles.trackBtn, styles.startBtn]}
              onPress={startTracking}
              disabled={status === 'saving'}
            >
              <Text style={styles.trackBtnIcon}>▶</Text>
              <Text style={styles.trackBtnText}>Démarrer le suivi</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.trackBtn, styles.stopBtn]}
              onPress={() => Alert.alert(
                'Arrêter le suivi ?',
                'La session sera sauvegardée et les points calculés.',
                [
                  { text: 'Continuer', style: 'cancel' },
                  { text: 'Arrêter', style: 'destructive', onPress: stopTracking },
                ]
              )}
            >
              <Text style={styles.trackBtnIcon}>■</Text>
              <Text style={styles.trackBtnText}>Arrêter la session</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info points */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Comment ça marche</Text>
          <Text style={styles.infoText}>• Démarrez le suivi avant de conduire</Text>
          <Text style={styles.infoText}>• Vos déplacements sont enregistrés automatiquement</Text>
          <Text style={styles.infoText}>• Gagnez 10 pts par km parcouru</Text>
          <Text style={styles.infoText}>• Arrêtez la session à la fin de votre trajet</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '900', color: Colors.white },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  gpsCard: {
    margin: 20, backgroundColor: Colors.darkCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  gpsLabel: { fontSize: 12, color: Colors.gray, marginBottom: 4 },
  gpsCoords: { fontSize: 15, fontWeight: '700', color: Colors.white, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  gpsStatus: { fontSize: 12, color: Colors.green, marginTop: 6 },
  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10,
  },
  metricCard: {
    width: '46%', backgroundColor: Colors.darkCard, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.darkBorder,
  },
  metricIcon: { fontSize: 22, marginBottom: 6 },
  metricValue: { fontSize: 26, fontWeight: '900', color: Colors.white },
  metricUnit: { fontSize: 11, color: Colors.gray, marginTop: 2 },
  ctaContainer: { paddingHorizontal: 20, marginTop: 24 },
  trackBtn: {
    borderRadius: 20, paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtn: {
    backgroundColor: Colors.yellow,
    shadowColor: Colors.yellow,
  },
  stopBtn: {
    backgroundColor: Colors.red,
    shadowColor: Colors.red,
  },
  trackBtnIcon: { fontSize: 20, color: Colors.dark },
  trackBtnText: { fontSize: 18, fontWeight: '900', color: Colors.dark },
  infoCard: {
    margin: 20, backgroundColor: Colors.darkCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: Colors.white, marginBottom: 10 },
  infoText: { fontSize: 13, color: Colors.gray, marginBottom: 6, lineHeight: 20 },
})
