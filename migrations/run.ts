/**
 * migrations/run.ts
 * Run database migrations for Woule Mobile App
 * Usage: npx tsx migrations/run.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  'https://szhiigkayxedicktgvls.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aGlpZ2theXhlZGlja3RndmxzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE0MjU1MiwiZXhwIjoyMDg3NzE4NTUyfQ.9OktigrhI9kCS4RjsCeF3zRJsK0ywtkmEFVer78k5U4'
)

async function runMigrations() {
  console.log('\n🚀 Running Woule Mobile migrations...\n')
  
  const sql = fs.readFileSync(
    path.join(__dirname, '0002_mobile_nfc_tables.sql'),
    'utf-8'
  )

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute\n`)
  console.log('⚠️  NOTE: Supabase does not expose a direct SQL execution API from external clients.')
  console.log('   To run these migrations, use one of these methods:\n')
  console.log('   1. SUPABASE DASHBOARD (recommended):')
  console.log('      → Go to: https://supabase.com/dashboard/project/szhiigkayxedicktgvls/sql/new')
  console.log('      → Copy and paste the content of migrations/0002_mobile_nfc_tables.sql')
  console.log('      → Click "Run"\n')
  console.log('   2. SUPABASE CLI:')
  console.log('      → npx supabase db push (if using local dev)')
  console.log('      → Or connect directly with psql\n')
  
  // Check if tables already exist
  console.log('Checking table status...')
  
  const tables = ['vehicle_sessions', 'gps_points']
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(0)
    if (error && error.message.includes('not found')) {
      console.log(`  ⏳ ${table}: NEEDS CREATION`)
    } else {
      console.log(`  ✅ ${table}: EXISTS`)
    }
  }
  
  console.log('\n📋 SQL to execute:\n')
  console.log('═'.repeat(60))
  console.log(sql)
  console.log('═'.repeat(60))
  console.log('\n✅ Copy the SQL above and run it in Supabase SQL Editor')
}

runMigrations().catch(console.error)
