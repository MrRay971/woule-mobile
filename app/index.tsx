/**
 * app/index.tsx
 * Splash screen — logo WOULÉ qui se remplit en jaune de bas en haut (effet bouteille)
 */

import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

const { width: SW } = Dimensions.get('window')
const LOGO_W = SW * 0.82
const LOGO_H = LOGO_W * 0.36   // ratio du logotype WOULÉ

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
  let m = STEPS[0][1]
  for (const [t, s] of STEPS) { if (p >= t) m = s }
  return m
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function SplashScreen() {
  const router       = useRouter()
  const [pct, setPct] = useState(0)
  const fillAnim     = useRef(new Animated.Value(0)).current
  const fadeIn       = useRef(new Animated.Value(0)).current

  const goTo = (target: number, dur: number) => {
    setPct(target)
    Animated.timing(fillAnim, {
      toValue: target / 100,
      duration: dur,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }

  useEffect(() => {
    // Fade in global
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start()

    // Progression simulée
    const schedule: [number, number, number][] = [
      [20,  400,  600],
      [42,  900,  500],
      [65,  1400, 600],
      [85,  1900, 500],
    ]
    schedule.forEach(([t, delay, dur]) => setTimeout(() => goTo(t, dur), delay))

    // Auth check + fin
    setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      goTo(100, 500)
      setTimeout(() => {
        router.replace(session ? '/(tabs)/tracking' : '/(auth)/login')
      }, 700)
    }, 2400)
  }, [])

  // Hauteur du masque jaune (remonte de bas en haut)
  const maskHeight = fillAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, LOGO_H],
  })

  // Largeur de la barre
  const barWidth = fillAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>

      {/* ── Logo avec effet remplissage ─────────────────────────────────── */}
      <View style={{ width: LOGO_W, height: LOGO_H, marginBottom: 52 }}>

        {/* Couche 1 : logo en gris (version non remplie) */}
        <View style={StyleSheet.absoluteFill}>
          <WouleSvg width={LOGO_W} height={LOGO_H} color="#3A3A3A" />
        </View>

        {/* Couche 2 : logo en jaune, masqué depuis le bas */}
        <Animated.View style={[
          StyleSheet.absoluteFill,
          {
            overflow:   'hidden',
            justifyContent: 'flex-end',  // ancre en bas
          },
        ]}>
          {/* Ce View remonte progressivement depuis le bas */}
          <Animated.View style={{ height: maskHeight, overflow: 'hidden', justifyContent: 'flex-end' }}>
            {/* On affiche le logo complet mais on ne montre que la partie du bas */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, width: LOGO_W, height: LOGO_H }}>
              <WouleSvg width={LOGO_W} height={LOGO_H} color={Colors.yellow} />
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      {/* ── Pourcentage ─────────────────────────────────────────────────── */}
      <View style={styles.pctRow}>
        <Text style={styles.pctNum}>{pct}</Text>
        <Text style={styles.pctSym}>%</Text>
      </View>

      {/* ── Message ─────────────────────────────────────────────────────── */}
      <Text style={styles.msg}>{getMsg(pct)}</Text>

      {/* ── Barre fine ──────────────────────────────────────────────────── */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: barWidth }]} />
      </View>

      <Text style={styles.version}>v1.0.0</Text>
    </Animated.View>
  )
}

// ─── Logo WOULÉ en SVG ────────────────────────────────────────────────────────
// viewBox 260×94 : carré "W" à gauche + texte "OULÉ" à droite

interface SvgProps { width: number; height: number; color: string }

function WouleSvg({ width, height, color }: SvgProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 260 94">
      {/* Carré fond */}
      <Rect x="1" y="1" width="80" height="92" rx="5" fill={color} />
      {/* W blanc à l'intérieur du carré */}
      <Path
        d="M13 18 L26 76 L41 44 L56 76 L69 18"
        stroke={Colors.dark}
        strokeWidth="11"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* O */}
      <Path
        d="M96 47 C96 28 108 16 122 16 C136 16 148 28 148 47 C148 66 136 78 122 78 C108 78 96 66 96 47 Z"
        fill={color}
      />
      <Path
        d="M106 47 C106 33 113 26 122 26 C131 26 138 33 138 47 C138 61 131 68 122 68 C113 68 106 61 106 47 Z"
        fill={Colors.dark}
      />
      {/* U */}
      <Path
        d="M156 16 L156 54 C156 68 162 78 178 78 C194 78 200 68 200 54 L200 16 L190 16 L190 54 C190 62 186 68 178 68 C170 68 166 62 166 54 L166 16 Z"
        fill={color}
      />
      {/* L */}
      <Path d="M208 16 L208 78 L240 78 L240 68 L218 68 L218 16 Z" fill={color} />
      {/* É — barre verticale */}
      <Path d="M246 16 L246 78 L260 78 L260 68 L256 68 L256 48 L258 48 L258 38 L256 38 L256 26 L260 26 L260 16 Z" fill={color} />
      {/* É — barres horizontales */}
      <Rect x="246" y="16" width="14" height="10" fill={color} />
      <Rect x="246" y="38" width="12" height="10" fill={color} />
      <Rect x="246" y="68" width="14" height="10" fill={color} />
      {/* Accent aigu du É */}
      <Path d="M252 4 L258 14 L255 14 L249 4 Z" fill={color} />
    </Svg>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
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
    color: Colors.yellow,
    lineHeight: 68,
  },
  pctSym: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.yellow,
    marginBottom: 8,
    marginLeft: 3,
  },
  msg: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 36,
    textAlign: 'center',
  },
  track: {
    width: '100%',
    height: 3,
    backgroundColor: '#222',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.yellow,
    borderRadius: 2,
  },
  version: {
    position: 'absolute',
    bottom: 38,
    fontSize: 11,
    color: '#333',
  },
})
