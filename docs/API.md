# API Scolaris — Documentation REST

Base : `http://localhost:4000/api/v1`

- **Authentification** : header `Authorization: Bearer <accessToken>` sur toutes les routes sauf `/auth/*` et `/public/*`.
- **Multi-tenant** : le tenant (établissement) est déduit du token. Un `SUPER_ADMIN` cible une école via l'en-tête `X-School-Id`.
- **Pagination** : `?page=1&pageSize=20` → `{ items, total, page, pageSize, totalPages }`.
- **Recherche** : `?search=` sur les listes ; filtres par égalité selon le module (ex. `?status=ACTIVE`).
- **Erreurs** : `{ error: string, details?: [...] }` avec les codes HTTP usuels (400 validation, 401, 403 RBAC, 404, 409 conflit).
- **Permissions** : chaque route exige `ressource:action` selon le rôle (voir `backend/src/auth/permissions.ts`).

## Authentification — `/auth`

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/register-school` | Crée l'établissement + admin + année scolaire (essai 30 j) |
| POST | `/auth/login` | Connexion (`email`, `password`, `schoolCode?`, `totpCode?`) — renvoie `{requiresTwoFactor:true}` si 2FA |
| POST | `/auth/refresh` | Rotation du refresh token |
| POST | `/auth/logout` | Révoque le refresh token |
| GET/PATCH | `/auth/me` | Profil courant |
| POST | `/auth/change-password` | Change le mot de passe (révoque les autres sessions) |
| GET | `/auth/sessions` · DELETE `/auth/sessions/:id` | Appareils connectés |
| POST | `/auth/2fa/setup` → `/auth/2fa/enable` → `/auth/2fa/disable` | Cycle 2FA TOTP (QR code fourni) |

## Public (sans compte)

| POST | `/public/:schoolCode/preregistrations` | Formulaire de pré-inscription en ligne |
| GET | `/public/:schoolCode` | Infos publiques de l'établissement |

## Établissement & utilisateurs — `/schools`

`GET/PATCH /schools/current` · `GET/POST /schools/users` · `PATCH /schools/users/:id`

## Structure académique — `/academics`

CRUD : `/academic-years` (+ `POST :id/close|archive|reopen`), `/terms`, `/levels`,
`/classrooms`, `/classes` (+ `GET :id/students`), `/subjects`
(+ `PUT :id/teachers` pour affecter les enseignants).

## Personnes

- `/teachers` CRUD + `POST :id/account` (compte de connexion) + `GET :id/timetable`
- `/students` CRUD (matricule + QR auto) + `GET :id/full` (dossier complet) + `POST :id/guardians` + `POST :id/account`
- `/guardians` CRUD + `POST :id/account`

## Inscriptions — `/enrollment`

- `/preregistrations` CRUD + `POST :id/convert` (crée élève + parent + inscription)
- `/enrollments` GET/POST (contrôle de capacité, `generateInvoice:true` facture les frais applicables + options) / PATCH

## Finances — `/finance`

- `/fees` CRUD (grille des frais par catégorie/niveau/fréquence)
- `/invoices` GET/POST + `POST :id/cancel` + `GET /invoices/overdue/list` (relances)
- `/payments` GET/POST (méthodes : CASH, ORANGE_MONEY, WAVE, FREE_MONEY, CARD, BANK_TRANSFER, STRIPE, CHEQUE) + `GET :id/receipt` (**PDF**)

### Paiements en ligne — PayDunya (`/finance/online`)

Agrégateur ouest-africain : Orange Money, Wave, Free Money, carte bancaire.

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/finance/online/checkout` | oui | Crée un paiement PayDunya pour une facture (`{invoiceId}`) et renvoie `{checkoutUrl, token, amount}`. Un parent/élève ne peut régler que ses propres factures. |
| POST | `/finance/online/webhook` | **public** | Callback IPN PayDunya : confirme le statut réel puis enregistre le paiement (idempotent via le token) et met la facture à jour. |
| GET | `/finance/online/status/:token` | oui | Statut d'un paiement (utilisé par la page de retour `/paiement/retour`). |

Configuration via variables d'environnement : `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_TOKEN`, `PAYDUNYA_MODE` (`test`/`live`), `PUBLIC_WEB_URL`, `PUBLIC_API_URL`. Sans clés, `/checkout` renvoie 400 (fonctionnalité désactivée proprement).
- `/expenses`, `/incomes` CRUD · `GET /cashbook` (journal de caisse)

## Présences — `/attendance`

`POST /bulk` (appel de classe) · `POST /scan` (QR matricule) · `POST /teacher` ·
`GET /class/:classId?date=` (feuille d'appel) · `GET /stats`

## Notes & bulletins — `/grades`

- `/assessments` CRUD + `GET :id/grades` (saisie) · `POST /grades/bulk`
- `GET /results/class/:classId/term/:termId` — moyennes pondérées + rangs + mentions calculés
- `POST /report-cards/generate` · `GET /report-cards` · `POST /report-cards/publish` (signature électronique) · `GET /report-cards/:id/pdf` (**PDF**)
- `POST /deliberations` (seuils configurables + décisions manuelles) · `GET /deliberations`

## Emploi du temps — `/timetable`

GET (par classe/enseignant) · POST/PATCH (**409 + détail des conflits** enseignant/salle/classe ; `?force=true` pour outrepasser) · DELETE · `POST /check` (pré-validation)

## Planning — `/planning`

`/exams`, `/homework` (cahier de texte), `/events` (calendrier scolaire) — CRUD

## Vie scolaire — `/services`

- `/library/books` CRUD · `POST /library/loans` · `POST /library/loans/:id/return` (amende auto) · `GET /library/loans`
- `/canteen/menus` CRUD · `POST|GET /canteen/meals` (pointage)
- `/transport/buses`, `/transport/routes` CRUD · `POST /transport/assignments`

## Discipline & santé — `/welfare`

`/discipline` CRUD · `/infirmary/visits` CRUD

## RH — `/hr`

`/staff` CRUD · `/leaves` CRUD + `POST :id/approve|reject` ·
`POST /payroll/generate` (`{period:"2026-01"}`) · `GET /payroll` · `PATCH /payroll/:id`

## Communication — `/comms`

`POST /messages` (canaux INTERNAL/EMAIL/SMS/WHATSAPP/PUSH ; audiences ALL/PARENTS/TEACHERS/STAFF/CLASS:id/USER:id) — renvoie `{recipients, sent, simulated}` ; `simulated>0` = canal non configuré (envoi journalisé) ·
`GET /messages` · `GET /channels` (état de configuration des canaux) · `/announcements` CRUD · `GET /notifications` · `POST /notifications/read-all` · `/documents` CRUD

**Envois réels** : Email via SMTP (`SMTP_HOST/USER/PASS/FROM`), SMS via Twilio (`TWILIO_ACCOUNT_SID/AUTH_TOKEN/SMS_FROM`), WhatsApp via Meta Cloud API (`WHATSAPP_TOKEN/PHONE_ID`) ou Twilio (`TWILIO_WHATSAPP_FROM`). Sans clés, les envois sont simulés — l'app reste fonctionnelle.

## Tableaux de bord — `/dashboard`

`GET /overview` (tous les indicateurs temps réel) · `GET /trends` (12 mois) · `GET /year-comparison`

## Rapports — `/reports`

`GET /students.csv` · `GET /payments.csv?from=&to=` · `GET /results.csv?termId=` — CSV UTF-8 (BOM) compatibles Excel

## Assistant IA — `/ai`

`GET /at-risk?classId=&threshold=` (score 0-100, facteurs, suggestions) ·
`GET /class-summary/:classId/term/:termId` · `POST /ask` (`{question}`)

## Plateforme (SUPER_ADMIN) — `/platform`

`GET /schools` · `PATCH /schools/:id` (statut, essai, réseau) · `GET /stats` · `GET|POST /networks`

## Abonnements — `/subscription`

Formules par fonctionnalités : **Découverte** (gratuit, 60 élèves), **Standard** (15 000/mois · 150 000/an, 400 élèves, + finances/communication/EDT/services/RH), **Premium** (35 000/mois · 350 000/an, illimité, + paiements en ligne, SMS/WhatsApp, IA, multi-établissements). Annuel = 2 mois offerts.

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/subscription/plans` | **public** | Grille tarifaire |
| POST | `/subscription/webhook` | **public** | IPN PayDunya → activation de la formule |
| GET | `/subscription/current` | oui | Formule effective + usage (élèves/limite) + historique |
| POST | `/subscription/checkout` | oui (settings:update) | Souscrit un plan (`{plan, cycle}`) via PayDunya |
| GET | `/subscription/status/:token` | oui | Statut d'activation (page de retour) |

**Application des limites** : la limite d'élèves et l'accès aux modules sont appliqués selon la formule effective. Une formule payante expirée retombe sur Découverte. Les endpoints hors formule renvoient **402** avec `{upgrade:true, currentPlan}`. Modules soumis : finance, timetable, services, hr (Standard+) ; paiements en ligne, SMS/WhatsApp/Email réels, IA, multi-établissements (Premium).

## Audit — `/audit`

`GET /audit?userId=&resource=` — journal des écritures (utilisateur, action, IP)
