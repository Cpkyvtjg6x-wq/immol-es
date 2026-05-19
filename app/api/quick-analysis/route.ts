import { NextRequest, NextResponse } from 'next/server'
import { calculateInvestment, DEFAULT_PARAMS, calculerFraisNotaire } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { calculateScore } from '@/lib/score'
import type { InvestmentParams } from '@/lib/types'

// CORS headers — l'extension Chrome appelle depuis une origine différente
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      prixAchat,
      surface,
      ville,
      dpe = 'D',
      locType = 'meuble',
      tmi = 30,
      // Optionnels
      loyerEstime,
      chargesCopro,
      taxeFonciere,
    } = body

    // Validation minimale
    if (!prixAchat || prixAchat < 10000) {
      return NextResponse.json({ error: 'Prix manquant ou invalide' }, { status: 400, headers: CORS })
    }

    // ── Estimation automatique du loyer si non fourni ──────────────────────────
    // Règle simple : rendement brut cible 5% en meublé, 4% en nu
    const loyerCible = loyerEstime
      ? loyerEstime
      : Math.round((prixAchat * (locType === 'meuble' ? 0.05 : 0.04)) / 12)

    // ── Paramètres avec valeurs par défaut intelligentes ───────────────────────
    const fraisNotaire = calculerFraisNotaire(prixAchat, 'ancien')
    const apport = Math.round(prixAchat * 0.20) // 20% apport standard

    const params: InvestmentParams = {
      ...DEFAULT_PARAMS,
      prixAchat,
      surface:    surface ?? DEFAULT_PARAMS.surface,
      ville:      ville   ?? DEFAULT_PARAMS.ville,
      dpe,
      locType,
      tmi,
      fraisNotaire,
      fraisNotaireAuto: false,
      apport,
      loyerNu:     locType === 'nu'      ? loyerCible : DEFAULT_PARAMS.loyerNu,
      loyerMeuble: locType === 'meuble'  ? loyerCible : DEFAULT_PARAMS.loyerMeuble,
      chargesCopro: chargesCopro ?? estimerChargesCopro(surface ?? 50),
      taxeFonciere: taxeFonciere ?? estimerTaxeFonciere(prixAchat),
      // Estimation assurance PNO
      assurancePno: Math.round(prixAchat * 0.001),
      cfe: locType === 'meuble' ? 500 : 0,
    }

    // ── Calcul ─────────────────────────────────────────────────────────────────
    const result = calculateInvestment(params)

    const fiscalResult = calculateFiscal({
      tmi,
      prixAchat,
      travaux: 0,
      prixRevient: result.prixRevient,
      locType,
      structure: 'nom-propre',
    }, result)

    const score = calculateScore(result, fiscalResult, null)

    const enabledRegimes = fiscalResult.regimes.filter(r => !r.disabled)
    const bestRegime = enabledRegimes.length > 0
      ? enabledRegimes.reduce((b, r) => r.rendNetNet > b.rendNetNet ? r : b, enabledRegimes[0])
      : null

    // ── Prix max conseillé (offre à faire) ────────────────────────────────────
    // Valeur juste : loyer annuel / rendement cible (6% meublé, 5% nu)
    const targetGrossYield = locType === 'meuble' ? 0.06 : 0.05
    const fairValue = Math.round((loyerCible * 12) / targetGrossYield)
    // Ne jamais suggérer moins de -10% du prix demandé (réaliste sur le marché FR)
    const prixMaxBas = Math.round(prixAchat * 0.90)
    const prixMax = Math.max(prixMaxBas, Math.min(fairValue, prixAchat))
    const economie = prixAchat - prixMax
    const negoPct = parseFloat((economie / prixAchat * 100).toFixed(1))
    const prixM2 = (surface && surface > 0) ? Math.round(prixAchat / surface) : null

    // ── Réponse ────────────────────────────────────────────────────────────────
    return NextResponse.json({
      // Indicateurs principaux
      rendBrut:        parseFloat(result.rendBrut.toFixed(2)),
      rendNet:         parseFloat(result.rendNet.toFixed(2)),
      cashflowMensuel: Math.round(result.cashflowMensuel),
      roiApport:       parseFloat(result.roiApport.toFixed(2)),
      mensualite:      Math.round(result.mensualiteTotale),
      prixRevient:     Math.round(result.prixRevient),

      // Score
      score:     score.global,
      scoreLbl:  score.label,
      scoreColor: score.color,

      // Fiscal
      bestRegime: bestRegime ? {
        name:       bestRegime.name,
        rendNetNet: parseFloat(bestRegime.rendNetNet.toFixed(2)),
        cfNet:      Math.round(bestRegime.cfNet),
        impot:      Math.round(bestRegime.impot),
      } : null,

      // Offre conseillée
      prixMax,
      economie,
      negoPct,
      prixM2,
      fairValue,

      // Paramètres estimés (pour affichage dans le widget)
      loyerEstime:  loyerCible,
      apportEstime: apport,
      fraisNotaire,

      // URL vers l'app pré-remplie (tous les paramètres utiles)
      analyseUrl: buildAnalyseUrl(params, loyerCible),
    }, { status: 200, headers: CORS })

  } catch (err) {
    console.error('[quick-analysis]', err)
    return NextResponse.json({ error: 'Erreur de calcul' }, { status: 500, headers: CORS })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function estimerChargesCopro(surface: number): number {
  // ~25–35 €/m²/an pour un immeuble standard
  return Math.round(surface * 30)
}

function estimerTaxeFonciere(prixAchat: number): number {
  // ~0.5% du prix d'achat en moyenne nationale
  return Math.round(prixAchat * 0.005)
}

function buildAnalyseUrl(params: InvestmentParams, loyerEstime: number): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://immora.app'
  const loyer = params.locType === 'meuble' ? params.loyerMeuble : params.loyerNu
  const p = new URLSearchParams({
    prix:      String(params.prixAchat),
    surface:   String(params.surface),
    ville:     params.ville,
    dpe:       params.dpe,
    locType:   params.locType,
    loyer:     String(loyer || loyerEstime),
    apport:    String(params.apport),
    tmi:       String(params.tmi),
    source:    'extension',
  })
  return `${base}/analyse?${p.toString()}`
}
