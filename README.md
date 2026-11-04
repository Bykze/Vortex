# Vortex School Management

Système multi-tenant de gestion scolaire. Auto-hébergeable sur Termux/Linux, sans Docker.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + React Router
- **Backend:** Node.js + Fastify (TypeScript), REST API, JWT (access + refresh), bcryptjs
- **DB:** PostgreSQL avec RLS (Row Level Security) sur toutes les tables tenant
- **Monorepo:** `/web` (frontend), `/api` (backend), `/db` (migrations + seed)

## Modules

1. **Gouvernance** — Écoles, années académiques, classes, matières avec coefficients, règles de progression configurables
2. **Enseignement** — Carnet de notes pondéré avec moyennes en temps réel, feuilles de présence, verrouillage de période (seul `direction` peut rouvrir)
3. **Registre** — Cycle de vie des élèves (machine à états: pre_admission → orientation → active → special_status → graduated/transferred/expelled), historique des statuts, import CSV avec prévisualisation
4. **Suivi** — Système d'alerte précoce (EWS) avec score de risque pondéré, interventions, tableau de bord direction
5. **SaaS** — Onboarding de tenants, paramètres par tenant, enregistrement manuel des paiements, mode lecture seule si expiré

## Sécurité

- Chaque table a `tenant_id` + RLS PostgreSQL
- L'app se connecte avec un rôle non-superutilisateur (`vortex_app`)
- Chaque requête s'exécute dans une transaction avec `SET LOCAL app.tenant_id` et `app.role`
- `tenant_id`, `matricule`, `class_id` sont immuables (triggers)
- `audit_log` est en insertion seule (trigger bloque UPDATE/DELETE)
- Transitions de statut étudiant validées en DB
- Tests d'isolation: `npm run db:test:isolation`

## Rôles

`super_admin`, `direction`, `staff`, `teacher`, `student`, `guardian` — une connexion, redirection par rôle.

## Installation sur Termux

```bash
# 1. Installer Node.js et PostgreSQL
pkg install nodejs postgresql

# 2. Initialiser PostgreSQL
initdb $PREFIX/var/lib/postgresql
pg_ctl -D $PREFIX/var/lib/postgresql start

# 3. Créer la base et l'utilisateur
psql -U $(whoami) -d postgres
```

```sql
CREATE DATABASE vortex;
CREATE USER vortex_app WITH PASSWORD 'change_me';
ALTER DATABASE vortex OWNER TO vortex_app;
\q
```

```bash
# 4. Cloner et installer
cd vortex-school-management
cp .env.example .env
# Éditer .env avec vos valeurs

# Installer les dépendances
npm install
npm --prefix api install
npm --prefix web install
npm --prefix db/seed install

# 5. Lancer les migrations
npm run db:migrate

# 6. Seed (données de démo: 2 écoles, utilisateurs pour chaque rôle)
npm run db:seed

# 7. Tests d'isolation
npm run db:test:isolation

# 8. Démarrer (API + Web en parallèle)
npm run dev
```

- API: `http://localhost:4000`
- Web: `http://localhost:5173`

## Comptes de démo

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Super Admin | admin@vortex.app | admin123 |
| Direction (A) | direction@victor-hugo.fr | password123 |
| Enseignant (A) | prof@victor-hugo.fr | password123 |
| Élève (A) | eleve@victor-hugo.fr | password123 |
| Direction (B) | direction@les-lilas.fr | password123 |
| Enseignant (B) | prof@les-lilas.fr | password123 |
| Élève (B) | eleve@les-lilas.fr | password123 |

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | API + Web en parallèle |
| `npm run build` | Build API + Web |
| `npm start` | Démarrer l'API en production |
| `npm run db:migrate` | Exécuter les migrations SQL |
| `npm run db:seed` | Insérer les données de démo |
| `npm run db:test:isolation` | Tester l'isolation des tenants |

## Limitations connues

1. **PDF report cards** — La génération PDF est un placeholder (retourne JSON). Une librairie comme `puppeteer` ou `pdfkit` serait nécessaire.
2. **Offline attendance** — L'UI de la feuille de présence est en ligne uniquement. La queue IndexedDB et la synchronisation offline ne sont pas encore implémentées.
3. **Page de vérification publique** — Le code de vérification du bulletin est généré mais la page publique de vérification n'existe pas encore.
4. **Guardian portal** — Le rôle `guardian` est défini dans le schéma mais l'interface dédiée n'est pas encore construite.
5. **Notifications** — Les alertes EWS suggèrent un statut spécial et notifient la direction via l'interface, mais aucun email/SMS n'est envoyé automatiquement.
6. **AI** — Désactivé par défaut (`ai_enabled = false`). Le flag existe mais aucune fonctionnalité IA n'est implémentée, conformément aux spécifications.
7. **File uploads** — Aucun upload de fichier (photos, documents) n'est implémenté.
8. **Internationalisation** — L'interface est en français uniquement. Le champ `locale` existe dans les paramètres mais n'est pas utilisé.
9. **Refresh token rotation** — Les refresh tokens sont stockés mais ne sont pas rotatés à chaque utilisation.
10. **Subscriptions automatiques** — Les paiements sont enregistrés manuellement par le super_admin. Aucune passerelle de paiement (Stripe, etc.) n'est intégrée.
