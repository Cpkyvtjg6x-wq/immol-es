# ImmoAnalyse — SaaS d'analyse d'investissement immobilier

Stack : Next.js 14 App Router · TypeScript · TailwindCSS · Supabase · Stripe · OpenAI

## Prérequis

- Node.js 18+
- Compte Supabase (gratuit)
- Compte Stripe (mode test disponible)
- Clé API OpenAI (GPT-4o-mini)

## Installation

### 1. Cloner le projet

```bash
git clone <repo-url>
cd immo-saas
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplir `.env.local` avec vos clés :

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Settings > API (service_role) |
| `STRIPE_SECRET_KEY` | Stripe > Developers > API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe > Developers > Webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe > Developers > API keys |
| `OPENAI_API_KEY` | platform.openai.com > API keys |
| `STRIPE_PRICE_ID_PRO` | Stripe > Products (créer les produits d'abord) |
| `STRIPE_PRICE_ID_BUSINESS` | Stripe > Products |

### 4. Configurer Supabase

1. Créer un nouveau projet sur [supabase.com](https://supabase.com)
2. Aller dans l'éditeur SQL (SQL Editor)
3. Copier et exécuter le contenu de `supabase/schema.sql`
4. Vérifier que les tables `profiles`, `simulations` et `ai_analyses` sont créées

### 5. Configurer Stripe

1. Créer deux produits dans le dashboard Stripe :
   - **ImmoAnalyse Pro** : 29 €/mois
   - **ImmoAnalyse Business** : 79 €/mois
2. Copier les `price_id` de chaque produit dans `.env.local`
3. Configurer le webhook Stripe :
   - URL : `https://votre-domaine.com/api/webhooks/stripe`
   - Événements : `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
4. Copier le `STRIPE_WEBHOOK_SECRET`

Pour tester en local, utiliser Stripe CLI :
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 6. Lancer en développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Structure du projet

```
saas/
├── app/
│   ├── api/
│   │   ├── ai-analyse/route.ts      # Endpoint analyse IA
│   │   └── webhooks/stripe/route.ts # Webhook Stripe
│   ├── globals.css                  # Styles globaux + design system
│   └── layout.tsx                   # Root layout
├── lib/
│   ├── types.ts                     # Types TypeScript complets
│   ├── utils.ts                     # Utilitaires (format, cn, etc.)
│   ├── calculator.ts                # Logique calcul investissement
│   ├── fiscal.ts                    # Calcul fiscalité (10 régimes)
│   ├── score.ts                     # Score projet sur 10
│   ├── market-data.ts               # Données marché 18+ villes
│   ├── ai.ts                        # Intégration OpenAI
│   └── supabase.ts                  # Clients Supabase
├── supabase/
│   └── schema.sql                   # DDL base de données
├── .env.local.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Fonctionnalités

### Calculateur (lib/calculator.ts)
- Calcul mensualité (amortissable / in-fine)
- PTZ (Prêt à Taux Zéro)
- Charges annuelles complètes
- Rendement brut, net, cash-flow, ROI apport
- Tableau d'amortissement
- Projection patrimoniale 20 ans

### Fiscalité (lib/fiscal.ts)
10 régimes fiscaux implémentés :
- Micro-foncier (abattement 30%)
- Réel foncier (déficit foncier -10 700 €)
- LMNP Micro-BIC (50% ou 71% meublé classé)
- LMNP Réel (amortissement par composants)
- LMP (Loueur en Meublé Professionnel)
- SCI à l'IR
- SCI à l'IS (capitalisation + dividendes)
- SARL de famille IR Micro / Réel / IS

### Données de marché (lib/market-data.ts)
18 villes françaises avec :
- Prix m², loyer m², tension locative
- Attractivité revente, dynamisme économique
- Score et insights par ville
- Données par quartier pour les principales villes

### Score IA (lib/score.ts)
Notation sur 10 basée sur :
- Rendement brut et net (3 pts)
- Cash-flow mensuel (3 pts)
- Rentabilité nette-nette (2 pts)
- Données de marché (2 pts)
- ROI sur apport (1 pt)

### Analyse IA (lib/ai.ts + app/api/ai-analyse/route.ts)
- GPT-4o-mini pour insights personnalisés
- 4-6 insights actionnables par analyse
- Types : success / warning / danger / tip

## Déploiement

### Vercel (recommandé)

```bash
npm install -g vercel
vercel
```

Configurer les variables d'environnement dans le dashboard Vercel.

### Build de production

```bash
npm run build
npm start
```

## Plans tarifaires suggérés

| Plan | Prix | Simulations | IA | Export |
|---|---|---|---|---|
| Free | 0 €/mois | 3 | Non | Non |
| Pro | 29 €/mois | 50 | Oui | Oui |
| Business | 79 €/mois | Illimité | Oui | Oui |
