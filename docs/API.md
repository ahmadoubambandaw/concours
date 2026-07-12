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

`POST /messages` (canaux INTERNAL/EMAIL/SMS/WHATSAPP/PUSH ; audiences ALL/PARENTS/TEACHERS/STAFF/CLASS:id/USER:id) ·
`GET /messages` · `/announcements` CRUD · `GET /notifications` · `POST /notifications/read-all` · `/documents` CRUD

## Tableaux de bord — `/dashboard`

`GET /overview` (tous les indicateurs temps réel) · `GET /trends` (12 mois) · `GET /year-comparison`

## Rapports — `/reports`

`GET /students.csv` · `GET /payments.csv?from=&to=` · `GET /results.csv?termId=` — CSV UTF-8 (BOM) compatibles Excel

## Assistant IA — `/ai`

`GET /at-risk?classId=&threshold=` (score 0-100, facteurs, suggestions) ·
`GET /class-summary/:classId/term/:termId` · `POST /ask` (`{question}`)

## Plateforme (SUPER_ADMIN) — `/platform`

`GET /schools` · `PATCH /schools/:id` (statut, essai, réseau) · `GET /stats` · `GET|POST /networks`

## Audit — `/audit`

`GET /audit?userId=&resource=` — journal des écritures (utilisateur, action, IP)
