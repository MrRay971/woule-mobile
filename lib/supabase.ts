import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

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
