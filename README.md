# 🎓 Scolaris — SaaS ERP de Gestion Scolaire

Plateforme cloud **multi-tenant** de gestion scolaire pour les établissements
africains et francophones : maternelle, primaire, collège, lycée, complexes
scolaires et réseaux d'établissements — publics comme privés. Chaque
établissement dispose de son espace sécurisé avec **isolation totale des
données**.

## ✨ Fonctionnalités

### Pilotage
- **Tableau de bord temps réel** : effectifs (élèves, enseignants, classes, parents), présences du jour, encaissements, dépenses, impayés, solde de caisse, cours du jour, calendrier, annonces
- **Analytique** : tendances sur 12 mois (finances, présence, inscriptions), comparaison entre années scolaires, taux de réussite
- **Assistant IA** : détection des élèves en difficulté (score de risque combinant notes, assiduité et discipline), prédiction des risques d'échec, résumés automatiques de classe, recommandations pédagogiques, questions en langage naturel

### Scolarité
- **Élèves** : dossier complet, matricule automatique, **QR code**, dossier médical, documents, historique
- **Parents** : père/mère/tuteur, plusieurs enfants sur un même compte, portail dédié
- **Pré-inscriptions** : formulaire public en ligne (`/preinscription/<CODE>`), validation, conversion en un clic (élève + parent + inscription + facture)
- **Inscriptions** : options (cantine, transport, uniforme, assurance, bibliothèque), contrôle de capacité, **facturation automatique**
- **Notes** : contrôles, devoirs, examens, TP, oraux ; coefficients par évaluation et par matière ; **moyennes pondérées automatiques**
- **Bulletins PDF** : classement (ex-aequo gérés), mentions, appréciations, **signature électronique**, publication aux parents
- **Délibérations** : admission / félicitations / redoublement selon des seuils configurables, décisions manuelles prioritaires
- **Emplois du temps** : détection automatique des **conflits** (enseignant, salle, classe)
- **Présences** : appel par classe en un geste, **pointage par scan QR**, suivi enseignants, statistiques
- **Examens, cahier de texte, calendrier scolaire**

### Finances
- Grilles de frais par niveau et catégorie (inscription, scolarité, uniforme, assurance, cantine, transport, bibliothèque)
- Factures, échéanciers, **reçus PDF**, liste de relance des impayés
- Paiements : espèces, **Orange Money, Wave, Free Money**, carte bancaire, virement, Stripe, chèque
- Comptabilité : dépenses, recettes, **journal de caisse**
- RH : personnel, contrats, congés (workflow d'approbation), **génération de paie mensuelle**

### Vie scolaire
- **Bibliothèque** : catalogue, emprunts, retours, amendes automatiques
- **Cantine** : menus, pointage des repas
- **Transport** : bus, chauffeurs, itinéraires et arrêts, affectation des élèves
- **Discipline** : sanctions, convocations, historique
- **Infirmerie** : consultations, vaccinations, allergies, traitements

### Communication
- Messages multi-canal : **interne, email, SMS, WhatsApp, push** (adaptateurs extensibles)
- Annonces épinglées, notifications in-app
- Gestion documentaire (bulletins, certificats, contrats, factures)

### Sécurité
- JWT access + refresh tokens avec **rotation** (hash en base)
- **Double authentification (2FA)** TOTP compatible Google Authenticator
- **RBAC — 13 rôles** (Super Admin, Admin établissement, Directeur, Proviseur, Comptable, Secrétaire, Enseignant, Parent, Élève, Bibliothécaire, Surveillant, Infirmier, Chauffeur) avec **permissions fines** (`ressource:action`) et ajustements par utilisateur
- Verrouillage après 10 échecs, sessions révocables, **journal d'audit**
- Helmet, CORS, rate-limiting, validation Zod, mots de passe bcrypt — protection XSS/CSRF/injections

## 🛠 Stack

| Couche | Technologie |
|---|---|
| Frontend | **Next.js 14** (App Router) + React 18 + TypeScript + Tailwind CSS + Recharts |
| Backend | **Node.js 20 + Express + TypeScript** |
| Base de données | **PostgreSQL 16** via **Prisma** |
| Auth | JWT + refresh rotation + TOTP (otplib) |
| PDF | PDFKit (bulletins, reçus) |
| QR codes | qrcode |
| Tests | Vitest (21 tests unitaires sur la logique métier) |
| Déploiement | Docker + docker-compose + GitHub Actions |

## 🚀 Démarrage rapide

### Avec Docker

```bash
docker compose up -d
docker compose exec api npm run seed   # école de démonstration
# Web : http://localhost:3000 — API : http://localhost:4000
```

### En développement

```bash
# 1. Base de données (PostgreSQL 16 requis)
createdb scolaris

# 2. API
cd backend
cp .env.example .env         # adapter DATABASE_URL
npm install
npx prisma migrate dev
npm run seed
npm run dev                  # http://localhost:4000

# 3. Web
cd ../frontend
npm install
npm run dev                  # http://localhost:3000
```

### Comptes de démonstration (mot de passe : `Passer123!`)

| Email | Rôle |
|---|---|
| `superadmin@scolaris.app` | Super Administrateur (plateforme) |
| `admin@baobabs.sn` | Administrateur d'établissement |
| `directeur@baobabs.sn` | Directeur |
| `comptable@baobabs.sn` | Comptable |
| `prof.diop@baobabs.sn` | Enseignant |
| `parent.ndiaye@gmail.com` | Parent |

## 📁 Structure

```
backend/
  prisma/schema.prisma   # ~50 modèles multi-tenant (schoolId partout)
  prisma/seed.ts         # école démo complète
  src/
    auth/permissions.ts  # matrice RBAC 13 rôles
    middleware/          # auth, tenant, audit, erreurs
    modules/             # 21 modules métier (routes REST)
    services/notify.ts   # adaptateurs email/SMS/WhatsApp/push
    utils/               # moyennes, conflits EDT, PDF, numérotation…
frontend/
  src/app/               # App Router : landing, auth, 20+ pages métier
  src/components/        # UI kit + graphiques (palette accessible validée)
  src/lib/               # client API (refresh auto), formats
docs/API.md              # documentation de l'API REST
```

## 📖 Documentation

- [Documentation API](docs/API.md) — tous les endpoints REST
- Tests : `cd backend && npm test`
- Migration de production : `npx prisma migrate deploy`

## 🔌 Intégrations production (points d'extension)

Les adaptateurs sont prêts à recevoir les clés API réelles via variables
d'environnement : SMTP/SendGrid (email), Twilio/Orange (SMS), WhatsApp
Business Cloud API, Firebase Cloud Messaging (push), Stripe / Orange Money /
Wave (paiements en ligne), S3 (stockage documents), LLM (assistant IA).

## Licence

Projet privé — © Ndaw Tech.
