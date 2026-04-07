/**
 * app/index.tsx
 * Splash screen — logo WOULÉ qui se remplit en jaune de bas en haut (effet bouteille)
 * Version robuste : pas de SVG externe, animation pure React Native
 */

import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

const { width: SW } = Dimensions.get('window')
const LOGO_W = SW * 0.72
const LOGO_H = LOGO_W * 0.38

const YELLOW = '#FFDB15'
const DARK   = '#131726'
const GRAY   = '#8892A4'
const DARK2  = '#1e2438'

// Messages selon progression
const STEPS: [number, string][] = [
  [0,   'Démarrage...'],
  [20,  'Connexion au serveur...'],
  [42,  'Chargement des données...'],
  [65,  'Vérification du compte...'],
  [85,  'Préparation de l\'interface...'],
  [98,  'Presque prêt...'],
  [100, 'C\'est parti ! 🚀'],
]

function getMsg(p: number) {
  let m = STEPS[0][1] as string
  for (const [t, s] of STEPS) { if (p >= (t as number)) m = s as string }
  return m
}

export default function SplashScreen() {
  const router        = useRouter()
  const [pct, setPct] = useState(0)
  const fillAnim      = useRef(new Animated.Value(0)).current
  const fadeAnim      = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Fade-in immédiat
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()

    // Progression de la barre
    const timers: ReturnType<typeof setTimeout>[] = []

    const steps: [number, number, number][] = [
      [20,  500,  600],
      [42,  1100, 500],
      [65,  1600, 600],
      [85,  2100, 500],
    ]

    steps.forEach(([target, delay, duration]) => {
      const t = setTimeout(() => {
        setPct(target)
        Animated.timing(fillAnim, {
          toValue: target / 100,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start()
      }, delay)
      timers.push(t)
    })

    // Auth check + navigation
    const authTimer = setTimeout(async () => {
      try {
        setPct(100)
        Animated.timing(fillAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start()

        const { data: { session } } = await supabase.auth.getSession()

        setTimeout(() => {
          if (session) {
            router.replace('/(tabs)/tracking')
          } else {
            router.replace('/(auth)/login')
          }
        }, 700)
      } catch (e) {
        // En cas d'erreur réseau, aller au login
        setTimeout(() => {
          router.replace('/(auth)/login')
        }, 700)
      }
    }, 2600)

    timers.push(authTimer)

    return () => timers.forEach(clearTimeout)
  }, [])

  // Hauteur du remplissage jaune (de bas en haut)
  const fillHeight = fillAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, LOGO_H],
  })

  // Largeur de la barre de progression
  const barWidth = fillAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

      {/* ── Logo WOULÉ avec effet remplissage ─────────────────────────── */}
      <View style={{ width: LOGO_W, height: LOGO_H, marginBottom: 48 }}>

        {/* Couche grise (base) */}
        <View style={StyleSheet.absoluteFill}>
          <WouleLogo width={LOGO_W} height={LOGO_H} color="#3A3A3A" />
        </View>

        {/* Couche jaune qui monte de bas en haut */}
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', justifyContent: 'flex-end' }]}>
          <Animated.View style={{ height: fillHeight, overflow: 'hidden', justifyContent: 'flex-end' }}>
            <View style={{ position: 'absolute', bottom: 0, left: 0, width: LOGO_W, height: LOGO_H }}>
              <WouleLogo width={LOGO_W} height={LOGO_H} color={YELLOW} />
            </View>
          </Animated.View>
        </View>
      </View>

      {/* ── Pourcentage ───────────────────────────────────────────────── */}
      <View style={styles.pctRow}>
        <Text style={styles.pctNum}>{pct}</Text>
        <Text style={styles.pctSym}>%</Text>
      </View>

      {/* ── Message ───────────────────────────────────────────────────── */}
      <Text style={styles.msg}>{getMsg(pct)}</Text>

      {/* ── Barre de progression ──────────────────────────────────────── */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: barWidth }]} />
      </View>

      <Text style={styles.version}>v1.0.0</Text>
    </Animated.View>
  )
}

// ─── Logo WOULÉ pur React Native (View imbriquées, pas de SVG) ───────────────
// Approche : texte stylisé dans un carré pour ressembler au logo

interface LogoProps { width: number; height: number; color: string }

function WouleLogo({ width, height, color }: LogoProps) {
  const boxSize  = height * 0.92
  const fontSize = height * 0.52
  const gap      = width * 0.04

  return (
    <View style={{ width, height, flexDirection: 'row', alignItems: 'center' }}>
      {/* Carré W */}
      <View style={{
        width: boxSize,
        height: boxSize,
        backgroundColor: color,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{
          fontSize: fontSize,
          fontWeight: '900',
          color: DARK,
          letterSpacing: -2,
          lineHeight: fontSize * 1.1,
        }}>W</Text>
      </View>

      {/* Texte OULÉ */}
      <Text style={{
        marginLeft: gap,
        fontSize: fontSize,
        fontWeight: '900',
        color,
        letterSpacing: 2,
        lineHeight: fontSize * 1.1,
      }}>OULÉ</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  pctNum: {
    fontSize: 64,
    fontWeight: '900',
    color: YELLOW,
    lineHeight: 68,
  },
  pctSym: {
    fontSize: 28,
    fontWeight: '700',
    color: YELLOW,
    marginBottom: 8,
    marginLeft: 3,
  },
  msg: {
    fontSize: 14,
    color: GRAY,
    marginBottom: 32,
    textAlign: 'center',
  },
  track: {
    width: '88%',
    height: 3,
    backgroundColor: DARK2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: YELLOW,
    borderRadius: 2,
  },
  version: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: '#333',
  },
})
