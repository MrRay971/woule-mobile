/**
 * lib/nfc.ts
 * NFC tag detection service for Woulé Mobile App
 * Uses react-native-nfc-manager
 * 
 * IMPORTANT: NFC works only on real devices (not simulators)
 * iOS requires a physical iPhone 7+ (iOS 11+)
 * The tag must be an NFC Type 2 (NTAG213/215/216) or NFC Type 4 tag
 */

import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager'
import { Platform } from 'react-native'

// ─── NFC Service ──────────────────────────────────────────────────────────────

export interface NFCTagResult {
  id: string          // Tag UID (hex string)
  payload: string     // NDEF text content (if any)
  techTypes: string[] // Supported tech types
}

let isNfcStarted = false

/**
 * Initialize NFC Manager — call once at app startup
 */
export async function initNfc(): Promise<boolean> {
  try {
    const supported = await NfcManager.isSupported()
    if (!supported) {
      console.log('[NFC] Not supported on this device')
      return false
    }
    if (!isNfcStarted) {
      await NfcManager.start()
      isNfcStarted = true
    }
    const enabled = await NfcManager.isEnabled()
    console.log('[NFC] Initialized, enabled:', enabled)
    return enabled
  } catch (err) {
    console.warn('[NFC] Init failed:', err)
    return false
  }
}

/**
 * Check if NFC is available and enabled
 */
export async function isNfcAvailable(): Promise<boolean> {
  try {
    const supported = await NfcManager.isSupported()
    if (!supported) return false
    const enabled = await NfcManager.isEnabled()
    return enabled
  } catch {
    return false
  }
}

/**
 * Wait for a single NFC tag scan
 * Returns the tag UID or null on cancel/error
 */
export async function scanNfcTag(): Promise<NFCTagResult | null> {
  try {
    // Request NFC tech
    await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NfcA, NfcTech.NfcB, NfcTech.NfcF], {
      alertMessage: 'Approchez le tag NFC de votre véhicule',
    })

    const tag = await NfcManager.getTag()
    if (!tag) return null

    // Extract UID
    const tagId = tag.id ? 
      (Array.isArray(tag.id) ? tag.id.map((b: number) => b.toString(16).padStart(2, '0')).join(':') : tag.id)
      : `tag-${Date.now()}`

    // Try to read NDEF message
    let payload = ''
    if (tag.ndefMessage && tag.ndefMessage.length > 0) {
      const record = tag.ndefMessage[0]
      if (record.payload) {
        try {
          payload = Ndef.text.decodePayload(new Uint8Array(record.payload as number[]))
        } catch {
          payload = String.fromCharCode(...(record.payload as number[]))
        }
      }
    }

    return {
      id: String(tagId),
      payload,
      techTypes: tag.techTypes || [],
    }
  } catch (err: unknown) {
    // User cancelled or error
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes('cancelled') && !message.includes('User cancelled')) {
      console.warn('[NFC] Scan error:', err)
    }
    return null
  } finally {
    // Always cancel tech request to release NFC
    try {
      await NfcManager.cancelTechnologyRequest()
    } catch {
      // ignore
    }
  }
}

/**
 * Clean up NFC — call on component unmount
 */
export async function cleanupNfc(): Promise<void> {
  try {
    await NfcManager.cancelTechnologyRequest()
  } catch {
    // ignore
  }
}

/**
 * Format a tag UID for display
 */
export function formatTagId(tagId: string): string {
  return tagId.toUpperCase()
}

/**
 * Generate a simulated tag ID for testing without hardware
 * Format: SIM-XXXXXX (only used in development/Expo Go)
 */
export function generateSimulatedTagId(vehicleId?: string): string {
  if (vehicleId) return `SIM-${vehicleId.substring(0, 8).toUpperCase()}`
  return `SIM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

/**
 * Check if NFC tag matches a known vehicle
 * Returns vehicleId if found, null otherwise
 */
export async function findVehicleByTag(
  nfcTagId: string,
  ambassadeurId: string,
): Promise<string | null> {
  // This would query vehicles table by nfc_tag_id
  // For now, return null (vehicle selection is manual)
  return null
}
