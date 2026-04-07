import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ─── Supabase config (existing project) ──────────────────────────────────────
const SUPABASE_URL = 'https://szhiigkayxedicktgvls.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aGlpZ2theXhlZGlja3RndmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDI1NTIsImV4cCI6MjA4NzcxODU1Mn0.cPi8dExG9OW9kUxH9rnUo595ZPeCT1Zlf4wyzEPrva8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ─── Types ────────────────────────────────────────────────────────────────────
export interface VehicleSession {
  id: string
  ambassador_id: string
  vehicle_id: string | null
  start_time: string
  end_time: string | null
  active: boolean
  nfc_tag_id: string | null
  total_km: number
  points_earned: number
  created_at: string
}

export interface GpsPoint {
  id: string
  session_id: string
  lat: number
  lng: number
  speed: number
  timestamp: string
}
