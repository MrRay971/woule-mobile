# Woulé Mobile — Application iOS

Application React Native (Expo) pour les ambassadeurs Woulé.

## Fonctionnalités

- 🔐 **Authentification** — Connexion Supabase, mot de passe oublié
- 🏠 **Dashboard** — KPIs, campagnes actives, notifications
- 🚗 **Suivi GPS** — Tracking temps réel, calcul km & points
- 📢 **Campagnes** — Voir les campagnes disponibles, postuler
- 💰 **Gains** — Points, récompenses, gamification
- 👤 **Profil** — Édition des informations personnelles

## Installation sur iPhone (sans Mac)

### Option 1 — Expo Go (TEST RAPIDE — recommandé)

1. Installer **Expo Go** depuis l'App Store iOS
2. Scanner le QR code généré par `expo start`
3. ⚠️ Expo Go ne supporte pas le GPS en arrière-plan

### Option 2 — EAS Build (FICHIER .IPA — installation directe)

Pré-requis : Compte Expo (gratuit sur expo.dev)

```bash
# 1. Installer EAS CLI
npm install -g eas-cli

# 2. Se connecter à Expo
eas login

# 3. Configurer le projet
cd woule-mobile
eas build:configure

# 4. Build iOS (simulateur — sans compte Apple Developer)
eas build --platform ios --profile development

# 5. Build iOS (device réel — nécessite Apple Developer 99$/an)
eas build --platform ios --profile preview
```

Le fichier `.ipa` sera téléchargeable depuis le dashboard Expo.

### Option 3 — TestFlight (Distribution beta)

Nécessite un compte Apple Developer (99$/an).

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

## Installation via AltStore (iPhone sans Mac, gratuit)

1. Installer **AltServer** sur un PC Windows
2. Connecter votre iPhone via USB
3. Ouvrir AltServer → "Install AltStore" sur l'iPhone
4. Dans AltStore → "+" → sélectionner le fichier `.ipa` Woulé

## Développement local

```bash
npm install
npx expo start
# Scanner avec Expo Go
```

## Variables d'environnement

Déjà configurées dans `lib/supabase.ts` :
- Supabase URL : `https://szhiigkayxedicktgvls.supabase.co`
- Supabase Anon Key : configurée

## Tech stack

- React Native + Expo SDK 55
- expo-router (navigation fichier)
- expo-location (GPS tracking)
- @supabase/supabase-js
- react-native-reanimated
