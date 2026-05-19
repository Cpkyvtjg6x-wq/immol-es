import type {
  InvestmentResult,
  FiscalResult,
  MarketData,
  ScoreResult,
  ScoreDetail,
} from './types'

/**
 * Calcule le score global d'un projet immobilier (0–95).
 *
 * Système additif (100 pts théoriques, capé à 95) — calibré sur le marché FR :
 *   Rendement brut  0–30 pts  (5 % = bon, 7 %+ = très bon, 9 %+ = exceptionnel)
 *   Rendement net   0–20 pts
 *   Cash-flow       0–25 pts  (négatif ne détruit plus le score, juste peu de pts)
 *   Nette-nette     0–15 pts
 *   ROI apport      0–10 pts
 *
 * 100/100 est structurellement impossible sur un bien réel.
 * FiscalResult et MarketData sont optionnels (pas de pénalité si absents).
 */
export function calculateScore(
  result: InvestmentResult,
  fiscal?: FiscalResult | null,
  market?: MarketData | null
): ScoreResult {
  let total = 0
  const details: ScoreDetail[] = []

  // ── 1. Rendement brut (0–30 pts) ────────────────────────────────────────────
  // Seuils calés sur la réalité FR : 4 % = marché tendu acceptable, 7 %+ = chercheur de renta
  let bPts: number
  if      (result.rendBrut >= 9)  { bPts = 30; details.push({ label: 'Rendement brut ≥ 9 %',   pts: 30, max: 30, good: true  }) }
  else if (result.rendBrut >= 7)  { bPts = 26; details.push({ label: 'Rendement brut 7–9 %',   pts: 26, max: 30, good: true  }) }
  else if (result.rendBrut >= 6)  { bPts = 22; details.push({ label: 'Rendement brut 6–7 %',   pts: 22, max: 30, good: true  }) }
  else if (result.rendBrut >= 5)  { bPts = 18; details.push({ label: 'Rendement brut 5–6 %',   pts: 18, max: 30, good: true  }) }
  else if (result.rendBrut >= 4)  { bPts = 12; details.push({ label: 'Rendement brut 4–5 %',   pts: 12, max: 30, good: false }) }
  else if (result.rendBrut >= 3)  { bPts =  6; details.push({ label: 'Rendement brut 3–4 %',   pts:  6, max: 30, good: false }) }
  else                            { bPts =  2; details.push({ label: 'Rendement brut < 3 %',    pts:  2, max: 30, good: false }) }
  total += bPts

  // ── 2. Rendement net (0–20 pts) ─────────────────────────────────────────────
  let nPts: number
  if      (result.rendNet >= 6)  { nPts = 20; details.push({ label: 'Rendement net ≥ 6 %',  pts: 20, max: 20, good: true  }) }
  else if (result.rendNet >= 5)  { nPts = 17; details.push({ label: 'Rendement net 5–6 %',  pts: 17, max: 20, good: true  }) }
  else if (result.rendNet >= 4)  { nPts = 13; details.push({ label: 'Rendement net 4–5 %',  pts: 13, max: 20, good: true  }) }
  else if (result.rendNet >= 3)  { nPts =  9; details.push({ label: 'Rendement net 3–4 %',  pts:  9, max: 20, good: false }) }
  else if (result.rendNet >= 2)  { nPts =  5; details.push({ label: 'Rendement net 2–3 %',  pts:  5, max: 20, good: false }) }
  else                           { nPts =  1; details.push({ label: 'Rendement net < 2 %',  pts:  1, max: 20, good: false }) }
  total += nPts

  // ── 3. Cash-flow mensuel (0–25 pts) ─────────────────────────────────────────
  // Plus de malus soustrait : un CF négatif donne juste peu de pts, pas un score négatif.
  // Un CF légèrement négatif est normal dans les villes chères — on ne pénalise pas trop.
  let cPts: number
  if      (result.cashflowMensuel >= 400)  { cPts = 25; details.push({ label: 'Cash-flow ≥ +400 €/mois',       pts: 25, max: 25, good: true  }) }
  else if (result.cashflowMensuel >= 200)  { cPts = 21; details.push({ label: 'Cash-flow +200–400 €/mois',     pts: 21, max: 25, good: true  }) }
  else if (result.cashflowMensuel >= 50)   { cPts = 17; details.push({ label: 'Cash-flow positif',             pts: 17, max: 25, good: true  }) }
  else if (result.cashflowMensuel >= -100) { cPts = 12; details.push({ label: 'Cash-flow quasi neutre',        pts: 12, max: 25, good: false }) }
  else if (result.cashflowMensuel >= -300) { cPts =  7; details.push({ label: 'Cash-flow légèrement négatif', pts:  7, max: 25, good: false }) }
  else if (result.cashflowMensuel >= -500) { cPts =  3; details.push({ label: 'Cash-flow négatif',            pts:  3, max: 25, good: false }) }
  else                                     { cPts =  1; details.push({ label: 'Cash-flow très négatif',        pts:  1, max: 25, good: false }) }
  total += cPts

  // ── 4. Rentabilité nette-nette (meilleur régime fiscal) (0–15 pts) ───────────
  const fiscNetNet = fiscal?.rendNetNet ?? 0
  let fPts: number
  if      (fiscNetNet >= 5)  { fPts = 15; details.push({ label: 'Nette-nette ≥ 5 %',   pts: 15, max: 15, good: true  }) }
  else if (fiscNetNet >= 4)  { fPts = 13; details.push({ label: 'Nette-nette 4–5 %',   pts: 13, max: 15, good: true  }) }
  else if (fiscNetNet >= 3)  { fPts = 10; details.push({ label: 'Nette-nette 3–4 %',   pts: 10, max: 15, good: true  }) }
  else if (fiscNetNet >= 2)  { fPts =  7; details.push({ label: 'Nette-nette 2–3 %',   pts:  7, max: 15, good: false }) }
  else if (fiscNetNet >= 1)  { fPts =  4; details.push({ label: 'Nette-nette 1–2 %',   pts:  4, max: 15, good: false }) }
  else                       { fPts =  2; details.push({ label: 'Nette-nette < 1 %',    pts:  2, max: 15, good: false }) }
  total += fPts

  // ── 5. ROI sur apport (0–10 pts) ────────────────────────────────────────────
  let rPts: number
  if      (result.roiApport >= 15) { rPts = 10; details.push({ label: 'ROI apport ≥ 15 %',   pts: 10, max: 10, good: true  }) }
  else if (result.roiApport >= 10) { rPts =  8; details.push({ label: 'ROI apport 10–15 %',  pts:  8, max: 10, good: true  }) }
  else if (result.roiApport >= 7)  { rPts =  6; details.push({ label: 'ROI apport 7–10 %',   pts:  6, max: 10, good: true  }) }
  else if (result.roiApport >= 4)  { rPts =  3; details.push({ label: 'ROI apport 4–7 %',    pts:  3, max: 10, good: false }) }
  else if (result.roiApport >= 0)  { rPts =  1; details.push({ label: 'ROI apport positif',  pts:  1, max: 10, good: false }) }
  else                             { rPts =  0; details.push({ label: 'ROI apport négatif',   pts:  0, max: 10, good: false }) }
  total += rPts

  // ── 6. Données de marché (info seulement, pas de pts) ───────────────────────
  if (market) {
    if (market.tensionLoc >= 75) {
      details.push({ label: `Tension locative élevée (${market.tensionLoc}/100)`, pts: 0, max: 0, good: true })
    }
    if (market.dynEco >= 75) {
      details.push({ label: `Fort dynamisme économique (${market.dynEco}/100)`, pts: 0, max: 0, good: true })
    }
  }

  // ── Score global : cap à 95 — 100/100 n'existe pas ──────────────────────────
  const global = Math.min(95, Math.max(0, total))

  // ── Sous-scores (chacun 0–100 pour les jauges UI) ───────────────────────────
  const subScores = {
    rentabilite: Math.min(100, Math.max(0,
      result.rendBrut < 3 ? Math.round(result.rendBrut * 8) :
      result.rendBrut < 5 ? Math.round(20 + (result.rendBrut - 3) * 22) :
      result.rendBrut < 8 ? Math.round(64 + (result.rendBrut - 5) * 10) :
      95
    )),
    cashflow:
      result.cashflowMensuel >= 400 ? 95 :
      result.cashflowMensuel >= 200 ? 80 :
      result.cashflowMensuel >= 0   ? 62 :
      result.cashflowMensuel >= -200 ? 44 :
      result.cashflowMensuel >= -400 ? 25 :
      10,
    fiscalite: Math.min(95, Math.max(5, Math.round((fiscal?.rendNetNet ?? 0) * 16))),
    marche: market
      ? Math.min(95, Math.round((market.tensionLoc + market.dynEco + market.attractRevente) / 3))
      : 50,
  }

  // ── Label & couleur ──────────────────────────────────────────────────────────
  let label: string
  let color: 'emerald' | 'amber' | 'red'
  let summary: string

  if (global >= 75) {
    label = 'Excellent projet'
    color = 'emerald'
    summary = `Avec un rendement brut de ${result.rendBrut.toFixed(1)} % et un cashflow de ${Math.round(result.cashflowMensuel)} €/mois, ce projet présente d'excellentes performances. Validez les aspects locaux et le dossier bancaire.`
  } else if (global >= 57) {
    label = 'Bon projet'
    color = 'emerald'
    summary = `Projet solide avec un rendement brut de ${result.rendBrut.toFixed(1)} %. Quelques optimisations (fiscalité, loyer, charges) pourraient encore améliorer la performance.`
  } else if (global >= 40) {
    label = 'Projet correct'
    color = 'amber'
    summary = `Rendement brut de ${result.rendBrut.toFixed(1)} % avec un cashflow de ${Math.round(result.cashflowMensuel)} €/mois. Acceptable — négociez le prix ou optimisez la fiscalité pour renforcer la rentabilité.`
  } else if (global >= 25) {
    label = 'À renégocier'
    color = 'amber'
    summary = `Les performances restent en dessous du potentiel. Négociez le prix d'achat ou ajustez la structure de financement pour améliorer la rentabilité.`
  } else {
    label = 'Projet risqué'
    color = 'red'
    summary = `Les indicateurs sont insuffisants pour un investissement rentable. Envisagez de renégocier fortement le prix ou d'explorer d'autres marchés.`
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

  if (result.cashflowMensuel < -300) {
    recs.push(
      `Votre cash-flow est de ${Math.round(result.cashflowMensuel)} €/mois. Envisagez d'augmenter l'apport, la durée du prêt ou de renégocier le prix.`
    )
  }

  if (result.roiApport < 5 && result.montantEmprunte > 0) {
    recs.push("Le ROI sur votre apport est faible. Envisagez un apport moindre pour optimiser l'effet de levier.")
  }

  if (score.global >= 75) {
    recs.push("Excellent projet ! Assurez-vous de l'état du bien et de la solidité de votre dossier bancaire.")
  }

  return recs
}
