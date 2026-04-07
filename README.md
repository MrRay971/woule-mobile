# 📱 Woulé Mobile App

Application React Native (Expo) pour les ambassadeurs Woulé.  
**Flow principal** : Tap NFC tag dans la voiture → GPS tracking démarré en arrière-plan → Points envoyés à Supabase toutes les 10 secondes.

---

## 🗂️ Table des matières

1. [Architecture](#architecture)
2. [Fonctionnalités](#fonctionnalités)
3. [Installation sur iPhone (Expo Go)](#installation-sur-iphone-expo-go)
4. [Configuration Supabase – Tables SQL](#configuration-supabase--tables-sql)
5. [Structure du projet](#structure-du-projet)
6. [Variables d'environnement](#variables-denvironnement)
7. [Tester NFC et GPS](#tester-nfc-et-gps)
8. [Build production (EAS)](#build-production-eas)
9. [Repository GitHub](#repository-github)

---

## Architecture

```
iPhone (Expo Go)
     │
     ├── Supabase Auth (email/password)
     ├── NFC tag (NTAG213/215 sticker sur la voiture)
     │        └── react-native-nfc-manager
     ├── GPS tracking toutes les 10s
     │        └── expo-location (background)
     └── Supabase Realtime
              ├── vehicle_sessions (sessions de trajet)
              └── gps_points (points GPS)
```

---

## Fonctionnalités

| Écran | Description |
|-------|-------------|
| **Login** | Connexion Supabase email/password |
| **Tracking** ⭐ | NFC detection → session → GPS → Supabase |
| **Dashboard** | KPIs, campagnes actives, notifications |
| **Campagnes** | Liste et détail des campagnes assignées |
| **Gains** | Points, récompenses, historique |
| **Profil** | Informations ambassadeur, déconnexion |

### Flow Tracking (écran principal)

```
1. Ouverture app → "En attente du tag NFC"
2. Tap iPhone sur tag NFC du véhicule
   ├── Tag détecté → vibration + son
   ├── Session créée dans vehicle_sessions
   └── GPS démarré (expo-location background)
3. TRACKING ACTIF affiché
   ├── Compteur km en temps réel
   ├── Vitesse actuelle
   ├── Durée de la session
   └── Points GPS envoyés toutes les 10s
4. Bouton STOP pressé → session fermée
   └── Récapitulatif : km, points, durée
```

---

## Installation sur iPhone (Expo Go)

### Prérequis
- iPhone 7 ou plus récent (NFC disponible sur iOS 13+)
- iOS 16 ou supérieur recommandé
- Connexion Wi-Fi

### Étape 1 – Installer Expo Go

1. Ouvrir l'**App Store** sur l'iPhone
2. Rechercher **"Expo Go"** (icône blanche avec un ⚫)
3. Télécharger l'app **Expo Go** de la société Expo
4. Ouvrir l'app une fois installée

### Étape 2 – Scanner le QR code

#### Option A : Via le lien Expo (recommandé)

1. Ouvrir ce lien sur votre iPhone :
   ```
   exp://u.expo.dev/update/...
   ```
   *(lien généré après le push GitHub — voir section Repository)*

2. iOS proposera d'ouvrir dans Expo Go → **Accepter**

#### Option B : Via Metro Bundler local

> ⚠️ Cette méthode nécessite que l'iPhone soit sur le **même réseau Wi-Fi** que le serveur.

1. Ouvrir Expo Go sur l'iPhone
2. Appuyer sur **"Enter URL manually"**
3. Entrer l'URL Metro Bundler :
   ```
   exp://IP_DE_VOTRE_MACHINE:8081
   ```
4. Appuyer sur **Connect**

#### Option C : Via Expo Go QR Scanner

1. Lancer le serveur Metro sur votre machine :
   ```bash
   cd woule-mobile
   npx expo start --lan
   ```
2. Un QR code s'affiche dans le terminal
3. Ouvrir Expo Go → **Scan QR Code**
4. Scanner le QR code affiché dans le terminal

### Étape 3 – Connexion dans l'app

1. L'app se charge (écran jaune avec logo Woulé)
2. Entrer les identifiants ambassadeur :
   - **Email** : votre email Woulé
   - **Mot de passe** : votre mot de passe
3. Appuyer sur **Se connecter**
4. Vous arrivez sur l'écran **Tracking**

---

## Configuration Supabase – Tables SQL

> ⚠️ **Action requise** : Exécuter ce SQL dans le Dashboard Supabase avant de tester.

### Lien direct vers l'éditeur SQL

🔗 **https://supabase.com/dashboard/project/szhiigkayxedicktgvls/sql/new**

### Script SQL à copier-coller

```sql
-- ============================================================
-- WOULE MOBILE APP – Migration 0002
-- Tables NFC + GPS pour l'application mobile
-- ============================================================

-- 1. Table des sessions de véhicule (créées par l'app mobile)
CREATE TABLE IF NOT EXISTS public.vehicle_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ambassador_id UUID NOT NULL REFERENCES public.ambassadeurs(id) ON DELETE CASCADE,
  vehicle_id    UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  start_time    TIMESTAMPTZ DEFAULT NOW(),
  end_time      TIMESTAMPTZ,
  active        BOOLEAN DEFAULT TRUE,
  nfc_tag_id    TEXT,
  total_km      NUMERIC(10,2) DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des points GPS (envoyés toutes les 10 secondes)
CREATE TABLE IF NOT EXISTS public.gps_points (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.vehicle_sessions(id) ON DELETE CASCADE,
  lat        NUMERIC(10,7) NOT NULL,
  lng        NUMERIC(10,7) NOT NULL,
  speed      NUMERIC(6,2) DEFAULT 0,
  timestamp  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Colonne NFC sur la table vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS nfc_tag_id TEXT;

-- 4. Activer Row Level Security
ALTER TABLE public.vehicle_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_points ENABLE ROW LEVEL SECURITY;

-- 5. Policies vehicle_sessions
DROP POLICY IF EXISTS "ambassador_own_sessions" ON public.vehicle_sessions;
CREATE POLICY "ambassador_own_sessions" ON public.vehicle_sessions
  FOR ALL TO authenticated
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadeurs WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    ambassador_id IN (
      SELECT id FROM public.ambassadeurs WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role_vehicle_sessions" ON public.vehicle_sessions;
CREATE POLICY "service_role_vehicle_sessions" ON public.vehicle_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Policies gps_points
DROP POLICY IF EXISTS "ambassador_own_gps" ON public.gps_points;
CREATE POLICY "ambassador_own_gps" ON public.gps_points
  FOR ALL TO authenticated
  USING (
    session_id IN (
      SELECT vs.id FROM public.vehicle_sessions vs
      JOIN public.ambassadeurs a ON a.id = vs.ambassador_id
      WHERE a.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT vs.id FROM public.vehicle_sessions vs
      JOIN public.ambassadeurs a ON a.id = vs.ambassador_id
      WHERE a.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role_gps_points" ON public.gps_points;
CREATE POLICY "service_role_gps_points" ON public.gps_points
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Vérification après exécution :
-- ============================================================
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as nb_colonnes
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('vehicle_sessions', 'gps_points', 'vehicles')
ORDER BY table_name;
```

### Vérification après exécution

Le script de vérification doit retourner :

| table_name | nb_colonnes |
|------------|-------------|
| gps_points | 6 |
| vehicle_sessions | 10 |
| vehicles | (votre nombre + 1) |

---

## Structure du projet

```
woule-mobile/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx          # Layout auth (pas de tabs)
│   │   ├── login.tsx            # Écran connexion
│   │   └── forgot-password.tsx  # Mot de passe oublié
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Navigation par onglets
│   │   ├── tracking.tsx         # ⭐ Écran principal NFC+GPS
│   │   ├── dashboard.tsx        # Dashboard ambassadeur
│   │   ├── campagnes.tsx        # Liste des campagnes
│   │   ├── gains.tsx            # Points et récompenses
│   │   └── profil.tsx           # Profil et déconnexion
│   ├── _layout.tsx              # Layout racine
│   └── index.tsx                # Redirect auth → tabs
│
├── lib/
│   ├── supabase.ts              # Client Supabase configuré
│   ├── nfc.ts                   # Service NFC (react-native-nfc-manager)
│   └── tracking.ts              # Service GPS (expo-location + Supabase)
│
├── hooks/
│   └── useAuth.tsx              # Hook auth + profil ambassadeur
│
├── constants/
│   └── Colors.ts                # Thème couleurs (#FFDB15 jaune)
│
├── migrations/
│   └── 0002_mobile_nfc_tables.sql  # SQL à exécuter dans Supabase
│
├── app.json                     # Config Expo (NFC + background location)
├── ecosystem.config.cjs         # Config PM2 pour dev server
└── package.json
```

---

## Variables d'environnement

Les credentials Supabase sont directement dans `lib/supabase.ts` :

```typescript
const SUPABASE_URL = 'https://szhiigkayxedicktgvls.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

> Pour la production, utiliser un fichier `.env` avec `expo-constants` :
> ```
> EXPO_PUBLIC_SUPABASE_URL=https://szhiigkayxedicktgvls.supabase.co
> EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
> ```

---

## Tester NFC et GPS

### Prérequis matériel
- **iPhone 7+** avec iOS 13+ (NFC en lecture disponible)
- **Tags NFC** : NTAG213, NTAG215, ou NTAG216 (autocollants NFC ~0,50€ pièce)
  - Amazon : "autocollant NFC NTAG213"
  - Ou utiliser le **mode simulation** intégré dans l'app

### Test NFC

#### Sur iPhone physique (recommandé)
1. Ouvrir l'app → onglet 🚗 Tracking
2. Appuyer sur **"Scanner un tag NFC"**
3. Approcher l'iPhone du tag NFC (à ~3cm)
4. Le tag est détecté → vibration + badge vert "Tag détecté"
5. La session démarre automatiquement

#### Mode simulation (sans tag NFC physique)
Si l'iPhone ne supporte pas NFC ou si `react-native-nfc-manager` n'est pas disponible dans Expo Go :
1. L'app détecte automatiquement que NFC n'est pas disponible
2. L'écran affiche **"Simuler un Tag NFC"** (bouton jaune)
3. Appuyer sur ce bouton → simule un tag avec un ID généré aléatoirement
4. La session démarre avec le tag simulé

> **Note importante** : `react-native-nfc-manager` **nécessite un build natif** (EAS Build).  
> Avec **Expo Go standard**, le module NFC n'est pas inclus → mode simulation automatique.  
> Pour le vrai NFC, voir la section [Build production](#build-production-eas).

### Test GPS

1. Une fois la session démarrée (NFC ou simulation)
2. Sortir à l'extérieur (ou activer la localisation simulée dans iOS Settings > Developer)
3. L'app affiche les coordonnées GPS en temps réel
4. Vérifier dans Supabase → Table `gps_points` → nouvelles lignes toutes les 10s

### Vérification Supabase

```sql
-- Voir les sessions actives
SELECT id, ambassador_id, nfc_tag_id, start_time, active, total_km
FROM vehicle_sessions
ORDER BY created_at DESC
LIMIT 10;

-- Voir les derniers points GPS
SELECT session_id, lat, lng, speed, timestamp
FROM gps_points
ORDER BY timestamp DESC
LIMIT 20;
```

### Test en arrière-plan

1. Démarrer une session de tracking
2. Appuyer sur le bouton Home de l'iPhone (l'app passe en arrière-plan)
3. Attendre 30 secondes
4. Revenir dans l'app → le compteur a continué
5. Vérifier dans Supabase → nouveaux points GPS insérés

---

## Build production (EAS)

Pour un **vrai NFC** sur iPhone (pas seulement simulation), il faut un build natif.

### Option 1 : Build iOS Simulator (gratuit)
```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Build pour simulateur
eas build --platform ios --profile development
```

### Option 2 : Build TestFlight (nécessite compte Apple Developer 99€/an)
```bash
eas build --platform ios --profile preview
```

### Configuration EAS (eas.json)
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "buildConfiguration": "Release" }
    }
  }
}
```

---

## Repository GitHub

🔗 **https://github.com/MrRay971/woule-mobile**

### Cloner et lancer localement
```bash
# Cloner
git clone https://github.com/MrRay971/woule-mobile.git
cd woule-mobile

# Installer les dépendances
npm install --legacy-peer-deps

# Lancer Metro Bundler
npx expo start --lan

# Scanner le QR code avec Expo Go sur iPhone
```

### Branches
- `main` : code de production stable

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | React Native 0.83 + Expo SDK 55 |
| Navigation | Expo Router v4 |
| Auth | Supabase Auth (email/password) |
| Database | Supabase (PostgreSQL) |
| NFC | react-native-nfc-manager 3.17 |
| GPS | expo-location (background) |
| Style | StyleSheet (thème sombre #131726) |
| Accent | Jaune Woulé #FFDB15 |

---

## Déploiement

- **Platform** : Expo Go (développement) / EAS Build (production)
- **Backend** : Supabase (existant, projet woule-web)
- **Status** : ✅ Fonctionnel en mode simulation, NFC natif nécessite EAS Build
- **Dernière mise à jour** : Avril 2026
