/**
 * app/index.tsx
 * Splash screen avec animation de chargement + barre de progression
 */

import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

export default function Index() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('Initialisation...')
  const progressAnim = useRef(new Animated.Value(0)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current
  const dotAnim1 = useRef(new Animated.Value(0.3)).current
  const dotAnim2 = useRef(new Animated.Value(0.3)).current
  const dotAnim3 = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    // Animation d'entrée du logo
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    // Animation des points (loader)
    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dotAnim1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dotAnim2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dotAnim3, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(dotAnim1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dotAnim2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dotAnim3, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        ]),
      ]).start(() => animateDots())
    }
    animateDots()

    // Simulation de progression réaliste
    const steps = [
      { pct: 15, text: 'Connexion au serveur...', delay: 300 },
      { pct: 35, text: 'Chargement des données...', delay: 600 },
      { pct: 60, text: 'Vérification du compte...', delay: 900 },
      { pct: 80, text: 'Préparation de l\'interface...', delay: 1200 },
      { pct: 95, text: 'Presque prêt...', delay: 1500 },
    ]

    steps.forEach(({ pct, text, delay }) => {
      setTimeout(() => {
        setProgress(pct)
        setStatusText(text)
        Animated.timing(progressAnim, {
          toValue: pct / 100,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start()
      }, delay)
    })

    // Vérification auth après animation
    setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setProgress(100)
      setStatusText('Prêt !')
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start()
      setTimeout(() => {
        if (session) {
          router.replace('/(tabs)/tracking')
        } else {
          router.replace('/(auth)/login')
        }
      }, 400)
    }, 1800)
  }, [])

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <View style={styles.container}>

      {/* Logo animé */}
      <Animated.View style={[styles.logoContainer, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🚗</Text>
        </View>
        <Text style={styles.logoTitle}>Woulé</Text>
        <Text style={styles.logoSubtitle}>GPS • NFC • Récompenses</Text>
      </Animated.View>

      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: barWidth }]}>
            {/* Effet de brillance */}
            <View style={styles.progressShine} />
          </Animated.View>
        </View>
        <View style={styles.progressInfo}>
          <Text style={styles.progressPct}>{progress}%</Text>
          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, { opacity: dotAnim1 }]} />
            <Animated.View style={[styles.dot, { opacity: dotAnim2 }]} />
            <Animated.View style={[styles.dot, { opacity: dotAnim3 }]} />
          </View>
        </View>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      {/* Version */}
      <Text style={styles.version}>v1.0.0</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Colors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logoEmoji: {
    fontSize: 48,
  },
  logoTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 6,
    letterSpacing: 1,
  },

  // Barre de progression
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.darkCard,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.yellow,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.yellow,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.yellow,
  },
  statusText: {
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
  },

  // Version
  version: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: Colors.darkBorder,
  },
})
