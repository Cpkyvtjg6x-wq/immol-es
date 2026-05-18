import { NextRequest, NextResponse } from 'next/server'
import { calculateInvestment } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { calculateScore } from '@/lib/score'
import { generateInsights } from '@/lib/ai'
import { getCityData } from '@/lib/market-data'
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
