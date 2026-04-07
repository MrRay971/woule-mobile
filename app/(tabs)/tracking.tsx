/**
 * app/(tabs)/tracking.tsx
 * 
 * MAIN TRACKING SCREEN — Woule Mobile App
 * 
 * Flow:
 * 1. Screen opens → "Waiting for NFC" state
 * 2. Ambassador taps NFC tag → tag detected → session starts
 * 3. GPS tracking runs in background, points sent to Supabase every 10s
 * 4. "TRACKING ACTIVE" indicator shown with live stats
 * 5. Ambassador taps "Stop" → session ends, summary shown
 * 
 * Tables used:
 *   - vehicle_sessions (primary — created by this app)
 *   - gps_points (GPS data)
 *   - tracking_sessions (fallback if vehicle_sessions doesn't exist yet)
 *   - tracking_points (fallback GPS)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Platform, Animated, Vibration,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '@/constants/Colors'
import { useAuth } from '@/hooks/useAuth'
import {
  initNfc, isNfcAvailable, scanNfcTag, cleanupNfc,
  formatTagId, generateSimulatedTagId,
  type NFCTagResult,
} from '@/lib/nfc'
import {
  requestLocationPermissions, checkLocationPermissions,
  createVehicleSession, endVehicleSession, insertGpsPoint,
  startBackgroundTracking, stopBackgroundTracking, getCurrentPosition,
  haversineDistance, calculatePoints, formatDuration,
  type LocationPoint,
} from '@/lib/tracking'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppState =
  | 'loading'           // Initial load
  | 'no_permission'     // Location permission denied
  | 'waiting_nfc'       // Waiting for NFC tap
  | 'nfc_scanning'      // NFC is actively scanning
  | 'nfc_detected'      // Tag just detected
  | 'starting_session'  // Creating session in Supabase
  | 'tracking'          // GPS tracking active
  | 'stopping'          // Stopping session
  | 'session_ended'     // Session just ended
  | 'nfc_unavailable'   // NFC not available (Expo Go)

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrackingScreen() {
  const { ambassadeur, profile } = useAuth()

  // ── App state
  const [appState, setAppState] = useState<AppState>('loading')
  const [nfcAvailable, setNfcAvailable] = useState(false)
  const [nfcTag, setNfcTag] = useState<NFCTagResult | null>(null)

  // ── Session data
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [usingVehicleSessions, setUsingVehicleSessions] = useState(true)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // ── Live tracking stats
  const [currentLat, setCurrentLat] = useState<number | null>(null)
  const [currentLng, setCurrentLng] = useState<number | null>(null)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [totalKm, setTotalKm] = useState(0)
  const [duration, setDuration] = useState(0)
  const [pointCount, setPointCount] = useState(0)

  // ── Session summary (after stop)
  const [lastSessionKm, setLastSessionKm] = useState(0)
  const [lastSessionDuration, setLastSessionDuration] = useState(0)
  const [lastSessionPoints, setLastSessionPoints] = useState(0)

  // ── Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const prevLocationRef = useRef<LocationPoint | null>(null)
  const totalKmRef = useRef(0)
  const sessionIdRef = useRef<string | null>(null)
  const usingVehicleSessionsRef = useRef(true)

  // ── Animation
  const pulseAnim = useRef(new Animated.Value(1)).current
  const nfcRingAnim = useRef(new Animated.Value(0)).current

  // ─── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    initApp()
    return () => {
      void cleanupNfc()
      void stopBackgroundTracking()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initApp = async () => {
    // 1. Check location permissions
    const { foreground } = await checkLocationPermissions()
    if (!foreground) {
      const granted = await requestLocationPermissions()
      if (!granted) {
        setAppState('no_permission')
        return
      }
    }

    // 2. Get initial location
    const pos = await getCurrentPosition()
    if (pos) {
      setCurrentLat(pos.lat)
      setCurrentLng(pos.lng)
    }

    // 3. Init NFC
    await initNfc()
    const nfcEnabled = await isNfcAvailable()
    setNfcAvailable(nfcEnabled)

    setAppState(nfcEnabled ? 'waiting_nfc' : 'nfc_unavailable')
  }

  // ─── Animations ───────────────────────────────────────────────────────────

  // Pulse animation for tracking indicator
  useEffect(() => {
    if (appState === 'tracking') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    }
  }, [appState, pulseAnim])

  // NFC ring animation
  useEffect(() => {
    if (appState === 'waiting_nfc' || appState === 'nfc_scanning') {
      const ring = Animated.loop(
        Animated.sequence([
          Animated.timing(nfcRingAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(nfcRingAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      )
      ring.start()
      return () => ring.stop()
    }
  }, [appState, nfcRingAnim])

  // ─── NFC Scanning ─────────────────────────────────────────────────────────

  const startNfcScan = useCallback(async () => {
    setAppState('nfc_scanning')

    const tag = await scanNfcTag()

    if (tag) {
      // Tag detected!
      Vibration.vibrate(200)
      setNfcTag(tag)
      setAppState('nfc_detected')
      // Auto-start session after brief display
      setTimeout(() => startTrackingSession(tag), 1000)
    } else {
      // Cancelled or error
      setAppState('waiting_nfc')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Simulated NFC (for Expo Go testing) ──────────────────────────────────

  const simulateNfcTap = useCallback(async () => {
    const simulatedTag: NFCTagResult = {
      id: generateSimulatedTagId(),
      payload: 'woule-vehicle-test',
      techTypes: ['android.nfc.tech.NfcA'],
    }
    Vibration.vibrate(200)
    setNfcTag(simulatedTag)
    setAppState('nfc_detected')
    setTimeout(() => startTrackingSession(simulatedTag), 800)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Start Tracking Session ────────────────────────────────────────────────

  const startTrackingSession = useCallback(async (tag: NFCTagResult) => {
    if (!ambassadeur?.id) {
      Alert.alert('Erreur', 'Profil ambassadeur non chargé. Reconnectez-vous.')
      setAppState('waiting_nfc')
      return
    }

    setAppState('starting_session')

    // Create session in Supabase
    let newSessionId: string | null = null
    let useVS = true // vehicle_sessions

    // Try vehicle_sessions first, fallback to tracking_sessions
    const { data: vsData, error: vsError } = await (await import('@/lib/supabase')).supabase
      .from('vehicle_sessions')
      .insert({
        ambassador_id: ambassadeur.id,
        vehicle_id: null,
        nfc_tag_id: tag.id,
        start_time: new Date().toISOString(),
        active: true,
        total_km: 0,
        points_earned: 0,
      })
      .select('id')
      .single()

    if (vsError) {
      console.warn('[Session] vehicle_sessions failed, trying tracking_sessions:', vsError.message)
      useVS = false
      const { data: tsData, error: tsError } = await (await import('@/lib/supabase')).supabase
        .from('tracking_sessions')
        .insert({
          ambassadeur_id: ambassadeur.id,
          started_at: new Date().toISOString(),
          status: 'active',
          points_earned: 0,
        })
        .select('id')
        .single()

      if (tsError) {
        Alert.alert('Erreur Supabase', `Impossible de créer la session:\n${tsError.message}`)
        setAppState('waiting_nfc')
        return
      }
      newSessionId = tsData?.id || null
    } else {
      newSessionId = vsData?.id || null
    }

    if (!newSessionId) {
      Alert.alert('Erreur', 'Session ID null — réessayez.')
      setAppState('waiting_nfc')
      return
    }

    // Store refs for background access
    sessionIdRef.current = newSessionId
    usingVehicleSessionsRef.current = useVS
    setSessionId(newSessionId)
    setUsingVehicleSessions(useVS)

    // Reset stats
    totalKmRef.current = 0
    setTotalKm(0)
    setDuration(0)
    setPointCount(0)
    prevLocationRef.current = null
    startTimeRef.current = new Date()

    // Start duration timer
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setDuration(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000))
      }
    }, 1000)

    // Start GPS tracking
    const started = await startBackgroundTracking(
      async (point: LocationPoint) => {
        // Update live display
        setCurrentLat(point.lat)
        setCurrentLng(point.lng)
        setCurrentSpeed(Math.round(point.speed * 3.6)) // m/s → km/h

        // Calculate distance
        if (prevLocationRef.current) {
          const dist = haversineDistance(
            prevLocationRef.current.lat, prevLocationRef.current.lng,
            point.lat, point.lng
          )
          // Only add if reasonable (< 1km per 10s = < 360 km/h — filter GPS jumps)
          if (dist < 1) {
            totalKmRef.current += dist
            setTotalKm(parseFloat(totalKmRef.current.toFixed(3)))
          }
        }
        prevLocationRef.current = point

        // Insert GPS point to Supabase
        const currentSid = sessionIdRef.current
        if (currentSid) {
          const table = usingVehicleSessionsRef.current ? 'gps_points' : 'tracking_points'
          const pointData = usingVehicleSessionsRef.current
            ? { session_id: currentSid, lat: point.lat, lng: point.lng, speed: Math.round(point.speed * 3.6), timestamp: point.timestamp.toISOString() }
            : { session_id: currentSid, lat: point.lat, lng: point.lng, speed: Math.round(point.speed * 3.6), recorded_at: point.timestamp.toISOString() }

          const { supabase: sb } = await import('@/lib/supabase')
          await sb.from(table).insert(pointData)
          setPointCount(p => p + 1)
        }
      },
      (error: string) => {
        console.error('[GPS] Error:', error)
        Alert.alert('Erreur GPS', error)
      }
    )

    if (!started) {
      setAppState('waiting_nfc')
      return
    }

    setAppState('tracking')
  }, [ambassadeur])

  // ─── Stop Session ──────────────────────────────────────────────────────────

  const confirmStopTracking = () => {
    Alert.alert(
      '🛑 Arrêter le suivi ?',
      `Session en cours :\n📍 ${totalKmRef.current.toFixed(2)} km\n⭐ ${calculatePoints(totalKmRef.current)} points`,
      [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Arrêter', style: 'destructive', onPress: doStopTracking },
      ]
    )
  }

  const doStopTracking = useCallback(async () => {
    setIsSaving(true)
    setAppState('stopping')

    // Stop GPS
    await stopBackgroundTracking()
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const finalKm = totalKmRef.current
    const finalDuration = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)
      : 0
    const finalPoints = calculatePoints(finalKm)

    // Save session end to Supabase
    const sid = sessionIdRef.current
    if (sid) {
      const { supabase: sb } = await import('@/lib/supabase')
      const table = usingVehicleSessionsRef.current ? 'vehicle_sessions' : 'tracking_sessions'
      const updateData = usingVehicleSessionsRef.current
        ? { end_time: new Date().toISOString(), active: false, total_km: parseFloat(finalKm.toFixed(3)), points_earned: finalPoints }
        : { status: 'completed', points_earned: finalPoints }

      await sb.from(table).update(updateData).eq('id', sid)

      // Update ambassador total_km and total_points
      if (ambassadeur?.id) {
        await sb.from('ambassadeurs').update({
          total_km: (ambassadeur.total_km || 0) + finalKm,
          total_points: (ambassadeur.total_points || 0) + finalPoints,
        }).eq('id', ambassadeur.id)
      }
    }

    // Save summary for display
    setLastSessionKm(finalKm)
    setLastSessionDuration(finalDuration)
    setLastSessionPoints(finalPoints)

    // Reset state
    setSessionId(null)
    sessionIdRef.current = null
    setNfcTag(null)
    setTotalKm(0)
    setDuration(0)
    setPointCount(0)
    prevLocationRef.current = null

    setIsSaving(false)
    setAppState('session_ended')
  }, [ambassadeur])

  // ─── Render helpers ────────────────────────────────────────────────────────

  const ringScale = nfcRingAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] })
  const ringOpacity = nfcRingAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] })

  // ─── SCREENS ───────────────────────────────────────────────────────────────

  // Loading
  if (appState === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingEmoji}>🚗</Text>
          <Text style={styles.loadingText}>Initialisation…</Text>
        </View>
      </SafeAreaView>
    )
  }

  // No permission
  if (appState === 'no_permission') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={{ fontSize: 48, marginBottom: 20 }}>📍</Text>
          <Text style={styles.errorTitle}>Permission GPS requise</Text>
          <Text style={styles.errorText}>
            Woulé a besoin d'accéder à votre localisation pour enregistrer vos trajets.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={initApp}>
            <Text style={styles.primaryBtnText}>Autoriser l'accès GPS</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Session ended summary
  if (appState === 'session_ended') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Success header */}
          <View style={styles.successHeader}>
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successTitle}>Session terminée !</Text>
            <Text style={styles.successSub}>Vos données ont été enregistrées dans Supabase</Text>
          </View>

          {/* Stats summary */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>📍</Text>
              <Text style={styles.summaryValue}>{lastSessionKm.toFixed(2)}</Text>
              <Text style={styles.summaryUnit}>km parcourus</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>⏱️</Text>
              <Text style={styles.summaryValue}>{formatDuration(lastSessionDuration)}</Text>
              <Text style={styles.summaryUnit}>durée</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: Colors.yellow + '60' }]}>
              <Text style={styles.summaryIcon}>⭐</Text>
              <Text style={[styles.summaryValue, { color: Colors.yellow }]}>{lastSessionPoints}</Text>
              <Text style={styles.summaryUnit}>points gagnés</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>📡</Text>
              <Text style={styles.summaryValue}>{pointCount}</Text>
              <Text style={styles.summaryUnit}>points GPS</Text>
            </View>
          </View>

          {/* Start new session */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setAppState(nfcAvailable ? 'waiting_nfc' : 'nfc_unavailable')}
          >
            <Text style={styles.primaryBtnText}>Nouvelle session</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── TRACKING ACTIVE SCREEN ─────────────────────────────────────────────────
  if (appState === 'tracking') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Tracking indicator */}
          <View style={styles.trackingHeader}>
            <Animated.View style={[styles.trackingBadge, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.trackingDot} />
              <Text style={styles.trackingLabel}>TRACKING ACTIF</Text>
            </Animated.View>
            <Text style={styles.trackingTagId}>
              🏷️ Tag: {nfcTag ? formatTagId(nfcTag.id).substring(0, 20) : '—'}
            </Text>
          </View>

          {/* GPS position */}
          <View style={styles.gpsCard}>
            <Text style={styles.gpsTitle}>📡 Position GPS en direct</Text>
            {currentLat !== null ? (
              <>
                <Text style={styles.gpsCoords}>
                  {currentLat.toFixed(6)}, {currentLng?.toFixed(6)}
                </Text>
                <Text style={styles.gpsPing}>Signal actif · mise à jour toutes les 10s</Text>
              </>
            ) : (
              <Text style={styles.gpsWaiting}>Acquisition du signal…</Text>
            )}
          </View>

          {/* Live metrics grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricIcon}>📏</Text>
              <Text style={styles.metricValue}>{totalKm.toFixed(2)}</Text>
              <Text style={styles.metricUnit}>km</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricIcon}>⏱️</Text>
              <Text style={styles.metricValue}>{formatDuration(duration)}</Text>
              <Text style={styles.metricUnit}>durée</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricIcon}>💨</Text>
              <Text style={styles.metricValue}>{currentSpeed}</Text>
              <Text style={styles.metricUnit}>km/h</Text>
            </View>
            <View style={[styles.metricCard, { borderColor: Colors.yellow + '50' }]}>
              <Text style={styles.metricIcon}>⭐</Text>
              <Text style={[styles.metricValue, { color: Colors.yellow }]}>
                {calculatePoints(totalKm)}
              </Text>
              <Text style={styles.metricUnit}>pts</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricIcon}>📡</Text>
              <Text style={styles.metricValue}>{pointCount}</Text>
              <Text style={styles.metricUnit}>GPS envoyés</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricIcon}>☁️</Text>
              <Text style={[styles.metricValue, { fontSize: 13, color: Colors.green }]}>Live</Text>
              <Text style={styles.metricUnit}>Supabase</Text>
            </View>
          </View>

          {/* Stop button */}
          <TouchableOpacity
            style={[styles.stopBtn, isSaving && styles.btnDisabled]}
            onPress={confirmStopTracking}
            disabled={isSaving}
          >
            <Text style={styles.stopBtnIcon}>⏹</Text>
            <Text style={styles.stopBtnText}>
              {isSaving ? 'Sauvegarde…' : 'Arrêter le suivi'}
            </Text>
          </TouchableOpacity>

          {/* Session info */}
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionInfoText}>
              Session ID: {sessionId?.substring(0, 12) || '—'}…
            </Text>
            <Text style={[styles.sessionInfoText, { color: Colors.green }]}>
              ✓ Données envoyées en temps réel vers Supabase
            </Text>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── NFC UNAVAILABLE (Expo Go mode) ────────────────────────────────────────
  if (appState === 'nfc_unavailable') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.nfcUnavailableContainer}>
            {/* Header */}
            <Text style={{ fontSize: 52, marginBottom: 12 }}>📱</Text>
            <Text style={styles.nfcUnavailableTitle}>Mode Expo Go</Text>
            <Text style={styles.nfcUnavailableText}>
              Le NFC n'est pas disponible dans Expo Go.{'\n'}
              Vous pouvez tester le tracking GPS via le bouton ci-dessous.
            </Text>

            {/* Warning box */}
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ NFC requis en production</Text>
              <Text style={styles.warningText}>
                Pour utiliser le NFC avec un vrai tag, cette app doit être compilée en version native (EAS Build).
              </Text>
            </View>

            {/* Simulated NFC button */}
            <TouchableOpacity style={styles.simulateBtn} onPress={simulateNfcTap}>
              <Text style={styles.simulateBtnIcon}>🏷️</Text>
              <Text style={styles.simulateBtnText}>Simuler un scan NFC</Text>
              <Text style={styles.simulateBtnSub}>Démarre le tracking GPS réel</Text>
            </TouchableOpacity>

            {/* Current GPS position */}
            {currentLat !== null && (
              <View style={styles.gpsPreview}>
                <Text style={styles.gpsPreviewTitle}>📍 Position actuelle</Text>
                <Text style={styles.gpsPreviewCoords}>
                  {currentLat.toFixed(5)}, {currentLng?.toFixed(5)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── WAITING FOR NFC / SCANNING ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Suivi GPS</Text>
          <View style={[
            styles.nfcStatusBadge,
            { backgroundColor: nfcAvailable ? Colors.green + '20' : Colors.orange + '20' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: nfcAvailable ? Colors.green : Colors.orange }
            ]} />
            <Text style={[
              styles.nfcStatusText,
              { color: nfcAvailable ? Colors.green : Colors.orange }
            ]}>
              {nfcAvailable ? 'NFC activé' : 'NFC inactif'}
            </Text>
          </View>
        </View>

        {/* Main NFC widget */}
        <View style={styles.nfcWidget}>
          {/* Animated rings */}
          <View style={styles.nfcRingsContainer}>
            <Animated.View style={[
              styles.nfcRing,
              { transform: [{ scale: ringScale }], opacity: ringOpacity }
            ]} />
            <View style={styles.nfcOuter}>
              <View style={styles.nfcInner}>
                <Text style={styles.nfcIcon}>
                  {appState === 'nfc_scanning' ? '⟳' : '📡'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.nfcMainText}>
            {appState === 'nfc_scanning'
              ? 'Approchez votre téléphone\ndu tag NFC'
              : appState === 'nfc_detected'
              ? '✅ Tag détecté !'
              : appState === 'starting_session'
              ? '⏳ Démarrage de la session…'
              : 'En attente du tag NFC'}
          </Text>

          {appState === 'nfc_detected' && nfcTag && (
            <View style={styles.tagDetectedBadge}>
              <Text style={styles.tagDetectedText}>
                🏷️ {formatTagId(nfcTag.id).substring(0, 24)}
              </Text>
            </View>
          )}

          <Text style={styles.nfcSubText}>
            {appState === 'waiting_nfc'
              ? 'Appuyez sur le bouton puis posez votre téléphone\ncontre le tag NFC dans votre véhicule'
              : appState === 'nfc_scanning'
              ? 'Restez proche du tag…'
              : ''}
          </Text>
        </View>

        {/* Scan button */}
        {(appState === 'waiting_nfc' || appState === 'nfc_scanning') && (
          <TouchableOpacity
            style={[styles.scanBtn, appState === 'nfc_scanning' && styles.btnScanning]}
            onPress={appState === 'nfc_scanning' ? undefined : startNfcScan}
            disabled={appState === 'nfc_scanning'}
          >
            <Text style={styles.scanBtnText}>
              {appState === 'nfc_scanning' ? '📡 Scan en cours…' : '🏷️ Scanner le tag NFC'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Or: GPS position preview */}
        {currentLat !== null && appState === 'waiting_nfc' && (
          <View style={styles.gpsPreview}>
            <Text style={styles.gpsPreviewTitle}>📍 Position actuelle (GPS prêt)</Text>
            <Text style={styles.gpsPreviewCoords}>
              {currentLat.toFixed(5)}, {currentLng?.toFixed(5)}
            </Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Comment ça marche</Text>
          {[
            { icon: '1️⃣', text: 'Scannez le tag NFC dans votre véhicule' },
            { icon: '2️⃣', text: 'Le tracking GPS démarre automatiquement' },
            { icon: '3️⃣', text: 'Conduisez normalement — les points s\'accumulent' },
            { icon: '4️⃣', text: 'Appuyez sur "Arrêter" à la fin de votre trajet' },
          ].map(step => (
            <View key={step.icon} style={styles.instructionRow}>
              <Text style={styles.instructionIcon}>{step.icon}</Text>
              <Text style={styles.instructionText}>{step.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Loading
  loadingEmoji: { fontSize: 52, marginBottom: 16 },
  loadingText: { fontSize: 16, color: Colors.gray },

  // Error
  errorTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, marginBottom: 12, textAlign: 'center' },
  errorText: { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  // Page header
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 16, paddingBottom: 20,
  },
  pageTitle: { fontSize: 26, fontWeight: '900', color: Colors.white },
  nfcStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  nfcStatusText: { fontSize: 12, fontWeight: '700' },

  // NFC widget
  nfcWidget: {
    alignItems: 'center', paddingVertical: 32,
    backgroundColor: Colors.darkCard, borderRadius: 28,
    borderWidth: 1, borderColor: Colors.darkBorder,
    marginBottom: 20,
  },
  nfcRingsContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 24, height: 120 },
  nfcRing: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: Colors.yellow,
  },
  nfcOuter: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.yellow + '15',
    borderWidth: 2, borderColor: Colors.yellow + '40',
    justifyContent: 'center', alignItems: 'center',
  },
  nfcInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.yellow + '25',
    justifyContent: 'center', alignItems: 'center',
  },
  nfcIcon: { fontSize: 32 },
  nfcMainText: {
    fontSize: 18, fontWeight: '800', color: Colors.white,
    textAlign: 'center', lineHeight: 26, paddingHorizontal: 24,
  },
  nfcSubText: {
    fontSize: 13, color: Colors.gray, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 24, marginTop: 10,
  },
  tagDetectedBadge: {
    marginTop: 12, backgroundColor: Colors.green + '20',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.green + '40',
  },
  tagDetectedText: { fontSize: 13, color: Colors.green, fontWeight: '700' },

  // Scan button
  scanBtn: {
    backgroundColor: Colors.yellow, borderRadius: 20,
    paddingVertical: 18, alignItems: 'center', marginBottom: 20,
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  btnScanning: { backgroundColor: Colors.yellow + '60' },
  scanBtnText: { fontSize: 17, fontWeight: '900', color: Colors.dark },

  // GPS preview
  gpsPreview: {
    backgroundColor: Colors.darkCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.darkBorder, marginBottom: 20,
  },
  gpsPreviewTitle: { fontSize: 12, color: Colors.gray, marginBottom: 4, fontWeight: '600' },
  gpsPreviewCoords: {
    fontSize: 14, fontWeight: '700', color: Colors.white,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Instructions
  instructionsCard: {
    backgroundColor: Colors.darkCard, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  instructionsTitle: { fontSize: 15, fontWeight: '800', color: Colors.white, marginBottom: 14 },
  instructionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12 },
  instructionIcon: { fontSize: 18, width: 28 },
  instructionText: { flex: 1, fontSize: 14, color: Colors.gray, lineHeight: 20 },

  // Tracking screen
  trackingHeader: { paddingTop: 16, paddingBottom: 20, alignItems: 'center' },
  trackingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.green + '20', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 30, borderWidth: 1, borderColor: Colors.green + '40',
    marginBottom: 8,
  },
  trackingDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.green,
  },
  trackingLabel: { fontSize: 14, fontWeight: '900', color: Colors.green, letterSpacing: 1.5 },
  trackingTagId: { fontSize: 12, color: Colors.gray },

  // GPS card
  gpsCard: {
    backgroundColor: Colors.darkCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.darkBorder, marginBottom: 16,
  },
  gpsTitle: { fontSize: 13, color: Colors.gray, fontWeight: '700', marginBottom: 6 },
  gpsCoords: {
    fontSize: 15, fontWeight: '700', color: Colors.white,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  gpsPing: { fontSize: 12, color: Colors.green },
  gpsWaiting: { fontSize: 14, color: Colors.gray },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  metricCard: {
    width: '30%', flex: 1, backgroundColor: Colors.darkCard,
    borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  metricIcon: { fontSize: 20, marginBottom: 4 },
  metricValue: { fontSize: 20, fontWeight: '900', color: Colors.white },
  metricUnit: { fontSize: 10, color: Colors.gray, marginTop: 2, textAlign: 'center' },

  // Stop button
  stopBtn: {
    backgroundColor: Colors.red, borderRadius: 20,
    paddingVertical: 18, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 10, marginBottom: 16,
    shadowColor: Colors.red, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  stopBtnIcon: { fontSize: 22, color: Colors.white },
  stopBtnText: { fontSize: 18, fontWeight: '900', color: Colors.white },

  // Session info
  sessionInfo: {
    backgroundColor: Colors.darkCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.darkBorder, gap: 6,
  },
  sessionInfoText: { fontSize: 12, color: Colors.gray },

  // Session ended summary
  successHeader: { alignItems: 'center', paddingVertical: 32 },
  successEmoji: { fontSize: 64, marginBottom: 12 },
  successTitle: { fontSize: 26, fontWeight: '900', color: Colors.white, marginBottom: 6 },
  successSub: { fontSize: 14, color: Colors.gray, textAlign: 'center' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  summaryCard: {
    flex: 1, minWidth: '44%', backgroundColor: Colors.darkCard, borderRadius: 20,
    padding: 18, alignItems: 'center', borderWidth: 1, borderColor: Colors.darkBorder,
  },
  summaryIcon: { fontSize: 28, marginBottom: 8 },
  summaryValue: { fontSize: 24, fontWeight: '900', color: Colors.white },
  summaryUnit: { fontSize: 12, color: Colors.gray, marginTop: 4, textAlign: 'center' },

  // NFC unavailable (Expo Go)
  nfcUnavailableContainer: { alignItems: 'center', paddingVertical: 20 },
  nfcUnavailableTitle: { fontSize: 24, fontWeight: '900', color: Colors.white, marginBottom: 10 },
  nfcUnavailableText: {
    fontSize: 14, color: Colors.gray, textAlign: 'center',
    lineHeight: 22, marginBottom: 20, paddingHorizontal: 16,
  },
  warningBox: {
    backgroundColor: Colors.orange + '15', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.orange + '30', width: '100%', marginBottom: 24,
  },
  warningTitle: { fontSize: 14, fontWeight: '800', color: Colors.orange, marginBottom: 6 },
  warningText: { fontSize: 13, color: Colors.gray, lineHeight: 20 },
  simulateBtn: {
    backgroundColor: Colors.yellow, borderRadius: 20, paddingVertical: 20,
    paddingHorizontal: 32, alignItems: 'center', width: '100%', marginBottom: 20,
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  simulateBtnIcon: { fontSize: 30, marginBottom: 6 },
  simulateBtnText: { fontSize: 18, fontWeight: '900', color: Colors.dark },
  simulateBtnSub: { fontSize: 12, color: Colors.dark + 'aa', marginTop: 4 },

  // Buttons
  primaryBtn: {
    backgroundColor: Colors.yellow, borderRadius: 18,
    paddingVertical: 16, alignItems: 'center', width: '100%',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '900', color: Colors.dark },
  btnDisabled: { opacity: 0.5 },
})
