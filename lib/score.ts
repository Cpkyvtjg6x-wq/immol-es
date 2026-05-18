import type {
  InvestmentResult,
  FiscalResult,
  MarketData,
  ScoreResult,
  ScoreDetail,
} from './types'

/**
 * Calcule le score global d'un projet immobilier (0–100).
 * FiscalResult et MarketData sont optionnels.
 */
export function calculateScore(
  result: InvestmentResult,
  fiscal?: FiscalResult | null,
  market?: MarketData | null
): ScoreResult {
  let rawScore = 0
  const details: ScoreDetail[] = []

  // ─── 1. Rendement brut (0–2 pts) ───────────────────────────────────────────
  if (result.rendBrut >= 8) {
    rawScore += 2
    details.push({ label: 'Rendement brut ≥ 8%', pts: 2, max: 2, good: true })
  } else if (result.rendBrut >= 6) {
    rawScore += 1.5
    details.push({ label: 'Rendement brut 6–8%', pts: 1.5, max: 2, good: true })
  } else if (result.rendBrut >= 4) {
    rawScore += 1
    details.push({ label: 'Rendement brut 4–6%', pts: 1, max: 2, good: false })
  } else {
    details.push({ label: 'Rendement brut < 4%', pts: 0, max: 2, good: false })
  }

  // ─── 2. Rendement net (0–1 pt) ─────────────────────────────────────────────
  if (result.rendNet >= 5) {
    rawScore += 1
    details.push({ label: 'Rendement net ≥ 5%', pts: 1, max: 1, good: true })
  } else if (result.rendNet >= 3) {
    rawScore += 0.5
    details.push({ label: 'Rendement net 3–5%', pts: 0.5, max: 1, good: false })
  } else {
    details.push({ label: 'Rendement net < 3%', pts: 0, max: 1, good: false })
  }

  // ─── 3. Cash-flow mensuel (0–3 pts) ────────────────────────────────────────
  if (result.cashflowMensuel >= 300) {
    rawScore += 3
    details.push({ label: 'Cash-flow ≥ +300€/mois', pts: 3, max: 3, good: true })
  } else if (result.cashflowMensuel >= 100) {
    rawScore += 2
    details.push({ label: 'Cash-flow positif', pts: 2, max: 3, good: true })
  } else if (result.cashflowMensuel >= 0) {
    rawScore += 1
    details.push({ label: 'Cash-flow neutre', pts: 1, max: 3, good: false })
  } else if (result.cashflowMensuel >= -150) {
    details.push({ label: 'Cash-flow légèrement négatif', pts: 0, max: 3, good: false })
  } else {
    rawScore -= 1
    details.push({ label: 'Cash-flow très négatif', pts: -1, max: 3, good: false })
  }

  // ─── 4. Rentabilité nette-nette (0–2 pts) ───────────────────────────────────
  if (fiscal) {
    if (fiscal.rendNetNet >= 4) {
      rawScore += 2
      details.push({ label: 'Renta nette-nette ≥ 4%', pts: 2, max: 2, good: true })
    } else if (fiscal.rendNetNet >= 2) {
      rawScore += 1
      details.push({ label: 'Renta nette-nette 2–4%', pts: 1, max: 2, good: false })
    } else {
      details.push({ label: 'Renta nette-nette < 2%', pts: 0, max: 2, good: false })
    }
  }

  // ─── 5. ROI sur apport (0–1 pt) ────────────────────────────────────────────
  if (result.roiApport >= 10) {
    rawScore += 1
    details.push({ label: 'ROI apport ≥ 10%', pts: 1, max: 1, good: true })
  } else if (result.roiApport >= 5) {
    rawScore += 0.5
    details.push({ label: 'ROI apport 5–10%', pts: 0.5, max: 1, good: false })
  } else {
    details.push({ label: 'ROI apport < 5%', pts: 0, max: 1, good: false })
  }

  // ─── 6. Données de marché (0–2 pts) ────────────────────────────────────────
  if (market) {
    if (market.tensionLoc >= 80) {
      rawScore += 1
      details.push({ label: `Tension locative élevée (${market.tensionLoc}/100)`, pts: 1, max: 1, good: true })
    } else {
      details.push({ label: `Tension locative ${market.tensionLoc}/100`, pts: 0, max: 1, good: false })
    }
    if (market.dynEco >= 80) {
      rawScore += 1
      details.push({ label: `Dynamisme économique élevé (${market.dynEco}/100)`, pts: 1, max: 1, good: true })
    } else {
      details.push({ label: `Dynamisme éco ${market.dynEco}/100`, pts: 0, max: 1, good: false })
    }
  }

  // ─── Normalisation sur 100 ──────────────────────────────────────────────────
  const scoreMax = fiscal ? (market ? 11 : 9) : (market ? 9 : 7)
  const global = Math.min(100, Math.max(0, Math.round((rawScore / scoreMax) * 100)))

  // ─── Sous-scores (chacun sur 100) ─────────────────────────────────────────
  const subScores = {
    rentabilite: Math.min(100, Math.max(0, Math.round(result.rendNet * 20))),
    cashflow: result.cashflowMensuel >= 400 ? 100
      : result.cashflowMensuel >= 200 ? 85
      : result.cashflowMensuel >= 100 ? 70
      : result.cashflowMensuel >= 0 ? 50
      : result.cashflowMensuel >= -100 ? 30
      : 10,
    fiscalite: fiscal ? Math.min(100, Math.max(0, Math.round(fiscal.rendNetNet * 25))) : 50,
    marche: market
      ? Math.min(100, Math.round((market.tensionLoc + market.dynEco + market.attractRevente) / 3))
      : 50,
  }

  // ─── Label & couleur ────────────────────────────────────────────────────────
  let label: string
  let color: 'emerald' | 'amber' | 'red'
  let summary: string

  if (global >= 75) {
    label = 'Excellent projet'
    color = 'emerald'
    summary = `Avec un rendement brut de ${result.rendBrut.toFixed(1)}% et un cashflow de ${Math.round(result.cashflowMensuel)} €/mois, ce projet présente d'excellentes performances. Validez les aspects locaux et le dossier bancaire.`
  } else if (global >= 55) {
    label = 'Bon projet'
    color = 'emerald'
    summary = `Projet solide avec un rendement brut de ${result.rendBrut.toFixed(1)}%. Quelques optimisations (fiscalité, loyer, charges) pourraient améliorer encore la performance.`
  } else if (global >= 40) {
    label = 'Projet correct'
    color = 'amber'
    summary = `Rendement brut de ${result.rendBrut.toFixed(1)}% avec un cashflow de ${Math.round(result.cashflowMensuel)} €/mois. La rentabilité reste acceptable mais négociez le prix ou optimisez la fiscalité.`
  } else if (global >= 25) {
    label = 'À renégocier'
    color = 'amber'
    summary = `Ce projet présente des points d'amélioration significatifs. Le cashflow négatif (${Math.round(result.cashflowMensuel)} €/mois) nécessite un effort d'épargne mensuel important.`
  } else {
    label = 'Projet risqué'
    color = 'red'
    summary = `Les indicateurs sont insuffisants pour un investissement rentable. Envisagez de renégocier le prix d'achat ou d'augmenter le loyer pour améliorer la rentabilité.`
  }

  return {
    global,
    label,
    color,
    summary,
    details,
    subScores,
  }
}

/**
 * Génère des recommandations textuelles basées sur le score
 */
export function generateRecommendations(
  result: InvestmentResult,
  score: ScoreResult
): string[] {
  const recs: string[] = []

  if (result.rendBrut < 4) {
    recs.push("Négociez le prix d'achat à la baisse ou augmentez le loyer pour améliorer la rentabilité brute.")
  }

  if (result.cashflowMensuel < 0) {
    recs.push(
      `Votre cash-flow est de ${Math.round(result.cashflowMensuel)} €/mois. Envisagez d'augmenter l'apport ou la durée du prêt.`
    )
  }

  if (result.roiApport < 5 && result.montantEmprunte > 0) {
    recs.push("Le ROI sur votre apport est faible. L'effet de levier du crédit est peu optimisé.")
  }

  if (score.global >= 75) {
    recs.push("Excellent projet ! Assurez-vous de l'état du bien et de la solidité de votre dossier bancaire.")
  }

  return recs
}
