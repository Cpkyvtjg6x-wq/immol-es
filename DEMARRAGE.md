# Immolyse — Guide de démarrage

## Ce qui est prêt

✅ **Landing page** — Hero avec calculateur express, Features, How it works, Pricing, Footer  
✅ **App /analyse** — Formulaire express, KPIs, Score d'opportunité, Analyse IA, Cashflow/Fiscal/Amortissement/Projection 20 ans  
✅ **Dashboard /dashboard** — Portefeuille simulé, simulations sauvegardées, upsell  
✅ **Auth /auth/login & /auth/signup** — Email + Google OAuth  
✅ **API /api/ai-analyse** — Calcul + fiscalité + score + OpenAI GPT-4o-mini  
✅ **API /api/webhooks/stripe** — Gestion abonnements  
✅ **Toute la logique de calcul** — 10 régimes fiscaux, amortissement, projection 20 ans, PTZ, in fine  
✅ **TypeScript zéro erreur** — Build Next.js 14 validé

---

## Étape 1 — Supabase (10 min)

1. Créer un projet sur **https://supabase.com** (gratuit)
2. Dans l'éditeur SQL, coller et exécuter le contenu de `supabase/schema.sql`
3. Aller dans **Authentication → Providers → Google** et activer Google OAuth
4. Copier vos clés dans `.env.local` :

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Étape 2 — Stripe (10 min)

1. Créer un compte sur **https://stripe.com**
2. Dans Dashboard → Products, créer 2 produits :
   - **Immolyse Pro** — 29€/mois + 19€/mois (annuel)
   - **Immolyse Agence** — 79€/mois + 59€/mois (annuel)
3. Copier les Price IDs dans `.env.local` :

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
```

4. Configurer le webhook Stripe → `https://votredomaine.com/api/webhooks/stripe`  
   Événements à écouter : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## Étape 3 — OpenAI (5 min)

1. Aller sur **https://platform.openai.com**
2. Créer une clé API
3. Ajouter dans `.env.local` :

```env
OPENAI_API_KEY=sk-...
```

---

## Étape 4 — Déploiement Vercel (5 min)

```bash
npm install -g vercel
vercel login
vercel --prod
```

Ou via l'interface web :
1. **https://vercel.com** → New Project → Import depuis GitHub
2. Ajouter toutes les variables d'environnement de `.env.local`
3. Deploy ✓

---

## Développement local

```bash
cd saas
npm install
cp .env.local.example .env.local
# remplir les clés
npm run dev
```

Ouvrir **http://localhost:3000**

---

## Structure des fichiers

```
saas/
├── app/
│   ├── page.tsx              ← Landing page
│   ├── analyse/page.tsx      ← App principale
│   ├── dashboard/page.tsx    ← Dashboard utilisateur
│   ├── auth/login/           ← Connexion
│   ├── auth/signup/          ← Inscription
│   └── api/
│       ├── ai-analyse/       ← Endpoint IA
│       └── webhooks/stripe/  ← Webhooks Stripe
├── components/
│   ├── landing/              ← Navbar, Hero, Features, Pricing...
│   ├── app/                  ← ExpressForm, KpiGrid, ScoreCard, AIInsights...
│   └── ui/                   ← Button, Card, Input, Badge, Select, Progress
├── lib/
│   ├── calculator.ts         ← Calcul investissement (porté depuis le HTML)
│   ├── fiscal.ts             ← 10 régimes fiscaux français
│   ├── score.ts              ← Score 0–100 multi-critères
│   ├── ai.ts                 ← GPT-4o-mini insights
│   ├── market-data.ts        ← 18 villes + 44 quartiers
│   ├── supabase.ts           ← Clients Supabase
│   └── types.ts              ← Tous les types TypeScript
└── supabase/
    └── schema.sql            ← Tables + RLS + triggers
```

---

## Prochaines étapes produit (V2)

- [ ] Sauvegarde des simulations en base (Supabase)
- [ ] Comparaison côte-à-côte de 2 biens
- [ ] Export PDF & Excel depuis l'app
- [ ] Page de checkout Stripe
- [ ] Emails transactionnels (Resend)
- [ ] Données de marché temps réel (API DVF)
- [ ] Mode sombre/clair

---

> **Note** : Les données de marché (prix m², loyers) sont des estimations basées sur des données historiques. 
> Immolyse est un outil d'aide à la décision — recommandez toujours à vos utilisateurs de consulter un professionnel.
