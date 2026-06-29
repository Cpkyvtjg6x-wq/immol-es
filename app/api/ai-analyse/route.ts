import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { calculateInvestment } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { calculateScore } from '@/lib/score'
import { generateInsights } from '@/lib/ai'
import { getCityData } from '@/lib/market-data'
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/lib/types'
import { checkAiQuota } from '@/lib/usage'
import type { InvestmentParams, FiscalParams } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { params, fiscalParams } = body as {
      params: InvestmentParams
      fiscalParams: Partial<FiscalParams>
    }

    if (!params || !params.prixAchat) {
      return NextResponse.json(
        { error: 'Paramètres de simulation manquants' },
        { status: 400 }
      )
    }

    // Vérification clé OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Service IA non configuré' },
        { status: 503 }
      )
    }

    // ── Gating tier (server-side, jamais faire confiance au client) ──────
    // L'IA coûte de l'argent (OpenAI) → bloquer les Free pour éviter abus.
    // @supabase/ssr 0.1.0 — API get/set/remove, pas getAll/setAll
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(_name: string, _value: string, _options: CookieOptions) {},
          remove(_name: string, _options: CookieOptions) {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentification requise', upgrade_required: 'ai_insights' },
        { status: 401 }
      )
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    const tier = (profile?.subscription_tier ?? 'free') as SubscriptionTier
    if (!SUBSCRIPTION_LIMITS[tier]?.aiInsights) {
      return NextResponse.json(
        {
          error: "L'analyse IA est réservée au plan Pro",
          upgrade_required: 'ai_insights',
        },
        { status: 402 } // 402 Payment Required — sémantique correcte
      )
    }

    // ── Quota IA mensuel (server-side) — plafonne le coût OpenAI par compte ──
    const quota = await checkAiQuota(user.id, tier)
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Quota d'analyses IA du mois atteint", upgrade_required: 'ai_quota' },
        { status: 429 }
      )
    }

    // 1. Calcul investissement
    const result = calculateInvestment(params)

    // 2. Calcul fiscal
    const fp: FiscalParams = {
      tmi: fiscalParams?.tmi ?? 30,
      prixAchat: params.prixAchat,
      travaux: params.travaux,
      prixRevient: result.prixRevient,
      locType: params.locType,
      lmpEnabled: fiscalParams?.lmpEnabled ?? false,
      sciIS: fiscalParams?.sciIS ?? false,
      sarlFamille: fiscalParams?.sarlFamille ?? false,
    }
    const fiscal = calculateFiscal(fp, result)

    // 3. Score
    const marketData = getCityData(params.ville)
    const score = calculateScore(result, fiscal, marketData)

    // 4. IA Insights
    const insights = await generateInsights(params, result, fiscal, score)

    return NextResponse.json({
      insights,
      score: score.global,
      label: score.label,
      rendNetNet: fiscal.rendNetNet,
      bestRegime: fiscal.best?.name,
      cashflow: result.cashflowMensuel,
    })
  } catch (error) {
    console.error('[AI Analyse Error]', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse IA' },
      { status: 500 }
    )
  }
}
