import { NextRequest, NextResponse } from 'next/server'
import { calculateInvestment, DEFAULT_PARAMS, calculerFraisNotaire } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { calculateScore } from '@/lib/score'
import {
  getMarcheRef,
  estimerLoyerMarche,
  getAmeniteAdjustment,
  getPositionnementMarche,
  type Amenities,
} from '@/lib/marche-reference'
import { authenticateExtensionRequest } from '@/lib/extension-auth'
import type { InvestmentParams } from '@/lib/types'

// CORS — l'extension Chrome appelle depuis une origine différente
// On expose `x-immora-tier` pour que le widget puisse adapter son UI.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Expose-Headers': 'x-immora-tier',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    // ── Authentification utilisateur (extension Chrome) ─────────────────────
    // Free / anonyme : reçoit un score basique sans contexte marché complet.
    // Pro / Agence : reçoit l'analyse complète + URL pré-remplie /analyse.
    const auth = await authenticateExtensionRequest(req.headers.get('authorization'))

    const body = await req.json()

    const {
      prixAchat,
      surface,
      ville        = '',
      dpe: dpeRaw,
      locType: locTypeRaw,
      tmi: tmiRaw,
      codePostal,
      // Enrichissements extraits de la description
      amenities,
      etage,
      etat,
      chauffage,
      nbPieces,
      // Optionnels explicites
      loyerEstime,
      loyerActuel,   // loyer actuel si bien déjà loué (source la plus fiable)
      chargesCopro,
      taxeFonciere,
    } = body

    // Defaults personnalisés par l'utilisateur (settings.calculatorDefaults).
    // Priorité : body > settings user > valeurs marché standard.
    const dpe     = dpeRaw     ?? 'D'
    const locType = locTypeRaw ?? auth.calcDefaults.locType ?? 'meuble'
    const tmi     = typeof tmiRaw === 'number' ? tmiRaw : (auth.calcDefaults.tmi ?? 30)
    const apportPct = auth.calcDefaults.apportPct ?? 0.20

    // ── Validation ────────────────────────────────────────────────────────────
    if (!prixAchat || prixAchat < 10000) {
      return NextResponse.json({ error: 'Prix manquant ou invalide' }, { status: 400, headers: CORS })
    }

    // ── 1. Données marché local ────────────────────────────────────────────────
    const marcheRef = getMarcheRef(ville, codePostal)

    // ── 2. Estimation du loyer marché (source par ordre de priorité) ──────────
    // Priorité 1: loyer actuel mentionné dans l'annonce (le plus fiable)
    // Priorité 2: loyer explicitement fourni (ex: utilisateur l'a saisi)
    // Priorité 3: estimation via référentiel marché local + aménités
    // Priorité 4: fallback simplifié sur rendement cible
    let loyerEstimeFinal: number
    let loyerSource: 'annonce' | 'fourni' | 'marche' | 'fallback'

    if (loyerActuel && loyerActuel > 100) {
      loyerEstimeFinal = loyerActuel
      loyerSource = 'annonce'
    } else if (loyerEstime && loyerEstime > 100) {
      loyerEstimeFinal = loyerEstime
      loyerSource = 'fourni'
    } else if (surface && surface > 5) {
      loyerEstimeFinal = estimerLoyerMarche(
        surface, locType, marcheRef, amenities, etage, etat, nbPieces
      )
      loyerSource = 'marche'
    } else {
      // Fallback sur rendement cible si pas de surface
      loyerEstimeFinal = Math.round(prixAchat * (locType === 'meuble' ? 0.05 : 0.04) / 12)
      loyerSource = 'fallback'
    }

    // ── 3. Ajustements aménités ────────────────────────────────────────────────
    const amenAdj = getAmeniteAdjustment(amenities as Amenities | undefined, surface ?? 50, etage, etat)

    // ── 4. Positionnement marché ──────────────────────────────────────────────
    const posMarche = surface && surface > 5
      ? getPositionnementMarche(prixAchat, surface, marcheRef)
      : null

    // ── 5. Paramètres de calcul ───────────────────────────────────────────────
    const fraisNotaire = calculerFraisNotaire(prixAchat, 'ancien')
    const apport = Math.round(prixAchat * apportPct)

    // Estimation charges copro depuis la description ou référentiel
    const chargesCoproFinal = chargesCopro
      ?? estimerChargesCopro(surface ?? 50, etat, chauffage)

    // Estimation taxe foncière depuis la description ou estimation
    const taxeFonciereFinal = taxeFonciere
      ?? estimerTaxeFonciere(prixAchat)

    const travauxFinal: number = typeof body.travaux === 'number' && body.travaux > 0 ? body.travaux : 0

    const params: InvestmentParams = {
      ...DEFAULT_PARAMS,
      prixAchat,
      surface:      surface  ?? DEFAULT_PARAMS.surface,
      ville:        ville    || DEFAULT_PARAMS.ville,
      dpe,
      locType,
      tmi,
      fraisNotaire,
      fraisNotaireAuto: false,
      apport,
      travaux:      travauxFinal,
      loyerNu:      locType === 'nu'     ? loyerEstimeFinal : DEFAULT_PARAMS.loyerNu,
      loyerMeuble:  locType === 'meuble' ? loyerEstimeFinal : DEFAULT_PARAMS.loyerMeuble,
      chargesCopro: chargesCoproFinal,
      taxeFonciere: taxeFonciereFinal,
      assurancePno: Math.round(prixAchat * 0.001),
      cfe:          locType === 'meuble' ? 500 : 0,
    }

    // ── 6. Calculs ────────────────────────────────────────────────────────────
    const result = calculateInvestment(params)

    const fiscalResult = calculateFiscal({
      tmi,
      prixAchat,
      travaux: travauxFinal,
      prixRevient: result.prixRevient,
      locType,
      structure: 'nom-propre',
    }, result)

    const score = calculateScore(result, fiscalResult, null)

    const enabledRegimes = fiscalResult.regimes.filter(r => !r.disabled)
    const bestRegime = enabledRegimes.length > 0
      ? enabledRegimes.reduce((b, r) => r.rendNetNet > b.rendNetNet ? r : b, enabledRegimes[0])
      : null

    // ── 7. Prix max conseillé ─────────────────────────────────────────────────
    // Principe : on négocie TOUJOURS — même sur un bien attractif.
    // La décote minimum varie selon le positionnement marché.
    const targetGrossYield = locType === 'meuble' ? 0.06 : 0.05
    const fairValue = Math.round((loyerEstimeFinal * 12) / targetGrossYield)

    // Décote minimum garantie selon positionnement (% du prix demandé)
    const minNegoByPos: Record<string, number> = {
      'opportunite':    0.02,  // Déjà très bon marché → on grappille 2%
      'attractif':      0.03,  // Bon prix → 3% toujours tentables
      'correct':        0.05,  // Prix juste → 5% est une ouverture raisonnable
      'surevalue':      0.08,  // Surévalué → 8% minimum à négocier
      'tres-surevalue': 0.12,  // Très surévalué → 12% minimum
    }
    const pos = posMarche?.positionnement ?? 'correct'
    const minNego = minNegoByPos[pos] ?? 0.05

    // L'offre = min(fairValue, prix × (1 − minNego))
    // mais jamais en dessous de −15% du prix demandé (plancher absolu)
    const prixAvecMinNego = Math.round(prixAchat * (1 - minNego))
    const prixMaxBas = Math.round(prixAchat * 0.85)              // plancher absolu −15%
    const prixMax = Math.max(prixMaxBas, Math.min(fairValue, prixAvecMinNego))
    const economie = prixAchat - prixMax
    const negoPct = parseFloat((economie / prixAchat * 100).toFixed(1))
    const prixM2 = (surface && surface > 0) ? Math.round(prixAchat / surface) : null

    // ── 8. Contexte marché local ─────────────────────────────────────────────
    // Free : version simplifiée (juste loyer ref). Pro : complet avec
    // positionnement, écart marché, prix m² réf, tension locative.
    const marcheContext = auth.canFullMarketData ? {
      ville:          marcheRef.label ?? ville,
      source:         marcheRef.source,
      prixM2Ref:      marcheRef.prixM2,
      loyerM2Ref:     locType === 'nu' ? marcheRef.loyerNu : marcheRef.loyerMeuble,
      tension:        marcheRef.tension,
      loyerSource,
      amenitesBonus:  amenAdj.details,
      ...(posMarche ? {
        positionnement: posMarche.positionnement,
        positionnementLabel: posMarche.label,
        prixM2Bien:  posMarche.prixM2Bien,
        ecartMarche: posMarche.ecartPct,
      } : {}),
    } : {
      // Version Free : seulement le loyer marché ref (motive l'upgrade)
      ville:      marcheRef.label ?? ville,
      loyerM2Ref: locType === 'nu' ? marcheRef.loyerNu : marcheRef.loyerMeuble,
      loyerSource,
      gatedPro: true,
    }

    // Header pour que le widget puisse adapter son UI
    const respHeaders = { ...CORS, 'x-immora-tier': auth.tier }

    // ── 9. Réponse ────────────────────────────────────────────────────────────
    return NextResponse.json({
      // Indicateurs principaux
      rendBrut:        parseFloat(result.rendBrut.toFixed(2)),
      rendNet:         parseFloat(result.rendNet.toFixed(2)),
      cashflowMensuel: Math.round(result.cashflowMensuel),
      roiApport:       parseFloat(result.roiApport.toFixed(2)),
      mensualite:      Math.round(result.mensualiteTotale),
      prixRevient:     Math.round(result.prixRevient),

      // Score
      score:      Math.round(score.global),
      scoreLbl:   score.label,
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

      // Données estimées
      loyerEstime:  loyerEstimeFinal,
      loyerSource,
      apportEstime: apport,
      fraisNotaire,
      prixAchat,           // utile au widget pour calculer % apport
      tmiUsed:      tmi,   // TMI effectivement utilisée (du user si Pro)
      dpeUsed:      dpe,   // DPE effectivement utilisée

      // Contexte marché local (la nouveauté !)
      marcheContext,

      // URL pré-remplie pour basculer sur le calculateur complet
      analyseUrl: buildAnalyseUrl(params, loyerEstimeFinal, {
        travaux:      body.travaux,
        chargesCopro: chargesCoproFinal,
        taxeFonciere: taxeFonciereFinal,
        nbPieces:     body.nbPieces,
        codePostal:   body.codePostal,
      }),

      // Tier de l'utilisateur pour adapter l'UI du widget
      tier:     auth.tier,
      // Capacités accessibles (utile pour afficher des CTA conditionnels)
      features: {
        ai:        auth.canUseAI,
        marketFull: auth.canFullMarketData,
        savePro:   !!auth.userId && (auth.tier === 'pro' || auth.tier === 'business'),
      },
    }, { status: 200, headers: respHeaders })

  } catch (err) {
    console.error('[quick-analysis]', err)
    return NextResponse.json({ error: 'Erreur de calcul' }, { status: 500, headers: CORS })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function estimerChargesCopro(surface: number, etat?: string | null, chauffage?: string | null): number {
  // Charges selon état et type de chauffage
  let base = surface * 28  // ~28 €/m²/an standard
  if (etat === 'neuf') base = surface * 15       // immeuble neuf = charges basses
  if (chauffage === 'collectif-gaz' || chauffage === 'collectif') base += 400  // collectif coûte plus
  return Math.round(base)
}

function estimerTaxeFonciere(prixAchat: number): number {
  // ~0.45-0.55% du prix d'achat selon les communes
  return Math.round(prixAchat * 0.005)
}

function buildAnalyseUrl(params: InvestmentParams, loyerEstime: number, extra?: {
  travaux?: number
  chargesCopro?: number
  taxeFonciere?: number
  nbPieces?: number
  codePostal?: string
}): string {
  const base  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://immora.app'
  const loyer = params.locType === 'meuble' ? params.loyerMeuble : params.loyerNu
  const p = new URLSearchParams({
    prix:    String(params.prixAchat),
    surface: String(params.surface),
    ville:   params.ville,
    dpe:     params.dpe,
    locType: params.locType,
    loyer:   String(loyer || loyerEstime),
    apport:  String(params.apport),
    tmi:     String(params.tmi),
    source:  'extension',
  })
  if (extra?.travaux)      p.set('travaux',      String(extra.travaux))
  if (extra?.chargesCopro) p.set('charges',      String(extra.chargesCopro))
  if (extra?.taxeFonciere) p.set('taxe',         String(extra.taxeFonciere))
  if (extra?.nbPieces)     p.set('pieces',       String(extra.nbPieces))
  if (extra?.codePostal)   p.set('cp',           extra.codePostal)
  return `${base}/analyse?${p.toString()}`
}
