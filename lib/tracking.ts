/**
 * lib/tracking.ts
 * GPS tracking service for Woulé Mobile App
 * Handles background location, Supabase sync, and session management
 */

import * as Location from 'expo-location'
import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackingSession {
  id: string
  ambassadorId: string
  vehicleId: string | null
  nfcTagId: string | null
  startTime: Date
  pointCount: number
  totalKm: number
  currentSpeed: number
  isActive: boolean
}

export interface LocationPoint {
  lat: number
  lng: number
  speed: number
  timestamp: Date
}

type LocationCallback = (point: LocationPoint) => void
type ErrorCallback = (error: string) => void

// ─── Internal state ───────────────────────────────────────────────────────────

let locationSubscription: Location.LocationSubscription | null = null
let gpsIntervalId: ReturnType<typeof setInterval> | null = null
let lastLocation: Location.LocationObject | null = null

// ─── GPS Permissions ──────────────────────────────────────────────────────────

export async function requestLocationPermissions(): Promise<boolean> {
  // Foreground permission
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync()
  if (fgStatus !== 'granted') return false

  // Background permission (for continuous tracking)
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync()
  if (bgStatus !== 'granted') {
    console.warn('[GPS] Background permission not granted — tracking may stop when app is backgrounded')
  }

  return true
}

export async function checkLocationPermissions(): Promise<{
  foreground: boolean
  background: boolean
}> {
  const { status: fgStatus } = await Location.getForegroundPermissionsAsync()
  const { status: bgStatus } = await Location.getBackgroundPermissionsAsync()
  return {
    foreground: fgStatus === 'granted',
    background: bgStatus === 'granted',
  }
}

// ─── Session Management ───────────────────────────────────────────────────────

/**
 * Create a new vehicle session in Supabase (vehicle_sessions table)
 */
export async function createVehicleSession(
  ambassadorId: string,
  vehicleId: string | null,
  nfcTagId: string | null
): Promise<string | null> {
  const { data, error } = await supabase
    .from('vehicle_sessions')
    .insert({
      ambassador_id: ambassadorId,
      vehicle_id: vehicleId,
      nfc_tag_id: nfcTagId,
      start_time: new Date().toISOString(),
      active: true,
      total_km: 0,
      points_earned: 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Tracking] Failed to create session:', error.message)
    // Fallback to tracking_sessions table (existing schema)
    const { data: fallback, error: fallbackErr } = await supabase
      .from('tracking_sessions')
      .insert({
        ambassadeur_id: ambassadorId,
        campaign_id: null,
        started_at: new Date().toISOString(),
        status: 'active',
        points_earned: 0,
      })
      .select('id')
      .single()

    if (fallbackErr) {
      console.error('[Tracking] Fallback session also failed:', fallbackErr.message)
      return null
    }
    return fallback?.id || null
  }

  return data?.id || null
}

/**
 * End an active session in Supabase
 */
export async function endVehicleSession(
  sessionId: string,
  totalKm: number,
  pointsEarned: number,
  useVehicleSessions: boolean = true
): Promise<void> {
  const table = useVehicleSessions ? 'vehicle_sessions' : 'tracking_sessions'

  const updateData = useVehicleSessions
    ? {
        end_time: new Date().toISOString(),
        active: false,
        total_km: parseFloat(totalKm.toFixed(3)),
        points_earned: pointsEarned,
      }
    : {
        status: 'completed',
        points_earned: pointsEarned,
      }

  const { error } = await supabase
    .from(table)
    .update(updateData)
    .eq('id', sessionId)

  if (error) {
    console.error('[Tracking] Failed to end session:', error.message)
  }
}

// ─── GPS Point Insertion ──────────────────────────────────────────────────────

/**
 * Insert a GPS point into Supabase (gps_points table)
 */
export async function insertGpsPoint(
  sessionId: string,
  lat: number,
  lng: number,
  speed: number,
  useGpsPoints: boolean = true
): Promise<void> {
  const table = useGpsPoints ? 'gps_points' : 'tracking_points'

  const pointData = useGpsPoints
    ? {
        session_id: sessionId,
        lat: parseFloat(lat.toFixed(7)),
        lng: parseFloat(lng.toFixed(7)),
        speed: parseFloat((speed * 3.6).toFixed(1)), // m/s → km/h
        timestamp: new Date().toISOString(),
      }
    : {
        session_id: sessionId,
        lat: parseFloat(lat.toFixed(7)),
        lng: parseFloat(lng.toFixed(7)),
        speed: parseFloat((speed * 3.6).toFixed(1)),
        recorded_at: new Date().toISOString(),
      }

  const { error } = await supabase.from(table).insert(pointData)
  if (error) {
    // Silent fail to not interrupt tracking
    console.warn('[GPS] Point insert failed:', error.message)
  }
}

// ─── Background Tracking ──────────────────────────────────────────────────────

/**
 * Start GPS tracking — calls onLocation every ~10 seconds
 */
export async function startBackgroundTracking(
  onLocation: LocationCallback,
  onError: ErrorCallback
): Promise<boolean> {
  try {
    // Stop existing subscription if any
    await stopBackgroundTracking()

    // Watch position
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 10000,  // Every 10 seconds
        distanceInterval: 20,  // Or every 20 meters
      },
      (location) => {
        lastLocation = location
        onLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          speed: location.coords.speed ?? 0,
          timestamp: new Date(location.timestamp),
        })
      }
    )

    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GPS tracking failed'
    onError(msg)
    return false
  }
}

/**
 * Stop GPS tracking
 */
export async function stopBackgroundTracking(): Promise<void> {
  if (locationSubscription) {
    locationSubscription.remove()
    locationSubscription = null
  }
  if (gpsIntervalId) {
    clearInterval(gpsIntervalId)
    gpsIntervalId = null
  }
}

/**
 * Get current position once
 */
export async function getCurrentPosition(): Promise<LocationPoint | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      speed: location.coords.speed ?? 0,
      timestamp: new Date(location.timestamp),
    }
  } catch {
    return null
  }
}

// ─── Distance calculation ─────────────────────────────────────────────────────

/**
 * Haversine formula — distance in km between two GPS points
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Calculate points from distance (10 pts/km)
 */
export function calculatePoints(km: number): number {
  return Math.floor(km * 10)
}

/**
 * Format duration from seconds
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
