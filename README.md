# 📱 Woule Mobile App

**Application mobile pour les ambassadeurs Woulé** — Détection NFC + Tracking GPS + Supabase Realtime

---

## 🎯 Fonctionnalités

| Feature | Description |
|---------|-------------|
| 🔐 **Authentification** | Login Supabase (email/password) |
| 🏷️ **Détection NFC** | Scan du tag NFC dans le véhicule |
| 🚗 **Création de session** | `vehicle_sessions` créée automatiquement |
| 📡 **Tracking GPS** | Points GPS toutes les 10 secondes |
| ☁️ **Supabase Realtime** | `gps_points` insérés en temps réel |
| ⏹️ **Arrêt manuel** | Bouton stop → session terminée |
| ⭐ **Points** | 10 pts/km calculés automatiquement |

---

## 🚀 Installation sur iPhone (GRATUIT — Expo Go)

### Étape 1 — Installer Expo Go sur votre iPhone

1. Ouvrez l'**App Store** sur votre iPhone
2. Recherchez **"Expo Go"**
3. Installez l'app (gratuite, développée par Expo)
4. Ouvrez Expo Go et créez un compte (gratuit)

> **Expo Go** est une app sandbox qui permet de faire tourner n'importe quelle app React Native sans passer par l'App Store.

---

### Étape 2 — Lancer le serveur de développement

Sur votre ordinateur :

```bash
# Cloner le repo
git clone https://github.com/MrRay971/woule-mobile.git
cd woule-mobile

# Installer les dépendances
npm install

# Lancer le serveur Expo
npx expo start

# Si iPhone et ordinateur ne sont pas sur le même réseau :
npx expo start --tunnel
```

---

### Étape 3 — Scanner le QR code

1. Sur votre iPhone, **ouvrez l'app Appareil photo**
2. Pointez vers le QR code affiché dans le terminal
3. Une notification apparaît → appuyez dessus
4. **Expo Go s'ouvre** et charge l'app Woulé

> **Alternative** : Dans Expo Go, appuyez sur "Scan QR code"

---

### Étape 4 — Se connecter

Utilisez vos identifiants ambassadeur Woulé (même email/password que sur woule-web.vercel.app).

---

## 🏷️ Comment tester le NFC

### Sur un iPhone réel (iOS 11+, iPhone 7 ou plus récent)

> ⚠️ **Le NFC ne fonctionne PAS dans Expo Go** — Expo Go ne permet pas d'accéder aux APIs natives personnalisées (NFC). Pour utiliser le NFC, il faut compiler un `.ipa` avec EAS Build.

#### Option A : Tester avec la simulation NFC (dans Expo Go)

L'app détecte automatiquement que le NFC n'est pas disponible et affiche un bouton **"Simuler un scan NFC"** :

1. Ouvrez l'onglet **🏷️ NFC/Tracking**
2. Appuyez sur **"Simuler un scan NFC"**
3. Un tag fictif est généré (`SIM-XXXXXX`)
4. Le tracking GPS réel démarre immédiatement
5. Les points GPS sont envoyés vers Supabase

#### Option B : Vrai NFC (EAS Build — app compilée)

```bash
# Créer un compte EAS (gratuit)
npx eas login

# Configurer le projet
npx eas build:configure

# Build iOS pour TestFlight / installation directe
npx eas build --platform ios --profile preview

# → Reçois un lien de téléchargement .ipa
# → Installe via Apple Configurator 2 ou TestFlight
```

#### Tags NFC compatibles

L'app fonctionne avec n'importe quel tag NFC standard :
- **NTAG213 / NTAG215 / NTAG216** (les plus courants, ~0,50€/pièce)
- **Mifare Ultralight**
- **Type 4 NFC**

Les tags peuvent être programmés avec :
- L'app **NFC Tools** (iOS/Android, gratuite)
- Inscrivez un texte simple type `woule-vehicule-plaque` sur le tag

---

## 📡 Comment tester le tracking GPS

### Test en Expo Go

1. Scanner le QR code → ouvrir l'app
2. Se connecter avec un compte ambassadeur
3. Aller sur l'onglet **🏷️**
4. Appuyer sur **"Simuler un scan NFC"**
5. L'écran passe en mode **"TRACKING ACTIF"**
6. Vous voyez les coordonnées GPS en temps réel
7. **Vérifier dans Supabase** :
   - Table `vehicle_sessions` → 1 nouvelle ligne (`active = true`)
   - Table `gps_points` → points ajoutés toutes les ~10 secondes
8. Appuyer sur **"Arrêter le suivi"**
9. La session est mise à jour (`active = false`, `end_time` renseigné)

### Vérification Supabase en temps réel

Ouvrez [Supabase Dashboard](https://supabase.com/dashboard/project/szhiigkayxedicktgvls) :

```sql
-- Voir les sessions actives
SELECT * FROM vehicle_sessions WHERE active = true ORDER BY start_time DESC;

-- Voir les derniers points GPS
SELECT * FROM gps_points ORDER BY timestamp DESC LIMIT 20;

-- Stats par session
SELECT vs.id, vs.total_km, vs.points_earned, COUNT(gp.id) as nb_points
FROM vehicle_sessions vs
LEFT JOIN gps_points gp ON gp.session_id = vs.id
GROUP BY vs.id ORDER BY vs.start_time DESC;
```

---

## 🗄️ Architecture Supabase

### Tables utilisées

```sql
-- Sessions de véhicule (créées par l'app mobile)
vehicle_sessions:
  id            UUID PK
  ambassador_id UUID → ambassadeurs.id
  vehicle_id    UUID → vehicles.id (nullable)
  start_time    TIMESTAMPTZ
  end_time      TIMESTAMPTZ (nullable)
  active        BOOLEAN
  nfc_tag_id    TEXT (UID du tag NFC scanné)
  total_km      NUMERIC
  points_earned INTEGER

-- Points GPS (envoyés toutes les 10s)
gps_points:
  id         UUID PK
  session_id UUID → vehicle_sessions.id
  lat        NUMERIC(10,7)
  lng        NUMERIC(10,7)
  speed      NUMERIC(6,2)  -- km/h
  timestamp  TIMESTAMPTZ
```

### Fallback automatique

Si `vehicle_sessions` n'existe pas encore, l'app utilise `tracking_sessions` (table existante).
Si `gps_points` n'existe pas, l'app utilise `tracking_points`.

---

## 🔧 Configuration

### Variables d'environnement

Aucune variable d'environnement à configurer — les clés Supabase sont déjà intégrées dans `lib/supabase.ts`.

Pour un déploiement production, créez un fichier `.env` :

```env
EXPO_PUBLIC_SUPABASE_URL=https://szhiigkayxedicktgvls.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn...
```

---

## 📦 Structure du projet

```
woule-mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx          # Écran de connexion
│   │   └── forgot-password.tsx
│   ├── (tabs)/
│   │   ├── tracking.tsx       # ⭐ ÉCRAN PRINCIPAL — NFC + GPS
│   │   ├── dashboard.tsx      # Tableau de bord
│   │   └── profil.tsx         # Profil ambassadeur
│   ├── _layout.tsx            # Root layout
│   └── index.tsx              # Redirect auth
├── lib/
│   ├── supabase.ts            # Client Supabase
│   ├── nfc.ts                 # Service NFC (react-native-nfc-manager)
│   └── tracking.ts            # Service GPS (expo-location)
├── hooks/
│   └── useAuth.ts             # Hook auth Supabase
├── migrations/
│   └── 0002_mobile_nfc_tables.sql  # SQL pour créer les tables
└── constants/
    └── Colors.ts              # Palette de couleurs
```

---

## 🧪 Scénarios de test

| Scénario | Comment tester |
|----------|---------------|
| Login | Email/password ambassadeur Woulé |
| NFC simulé | Bouton "Simuler un scan NFC" dans Expo Go |
| GPS tracking | Tracker démarre, coords s'affichent |
| Envoi Supabase | Table `gps_points` se remplit en temps réel |
| Arrêt session | Bouton "Arrêter" → `active = false` en DB |
| Points calculés | 10 pts/km dans `vehicle_sessions.points_earned` |
| Fallback tables | Si `vehicle_sessions` absent → `tracking_sessions` |

---

## 📲 QR Code pour Expo Go

Après avoir lancé `npx expo start`, un QR code s'affiche dans le terminal.

**Pour le scanner :**
1. iPhone → Appareil photo → pointer vers le QR code
2. Appuyer sur la notification → Expo Go s'ouvre
3. L'app se charge (environ 10-30 secondes la première fois)

Si le QR code ne fonctionne pas, essayez :
```bash
npx expo start --tunnel
```
Cela crée un tunnel public accessible depuis n'importe quel réseau.

---

## 🔴 Limitations connues avec Expo Go

| Feature | Expo Go | EAS Build (compilé) |
|---------|---------|---------------------|
| GPS Tracking | ✅ | ✅ |
| Supabase Auth | ✅ | ✅ |
| NFC réel | ❌ (simulation uniquement) | ✅ |
| Background GPS | ⚠️ (limité) | ✅ |
| Notifications push | ❌ | ✅ |

---

## 📞 Support

- **Web app** : https://woule-web.vercel.app
- **Supabase** : https://supabase.com/dashboard/project/szhiigkayxedicktgvls
- **GitHub** : https://github.com/MrRay971/woule-mobile
