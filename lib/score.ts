import type {
  InvestmentResult,
  FiscalResult,
  MarketData,
  ScoreResult,
  ScoreDetail,
} from './types'

/**
 * Calcule le score global d'un projet immobilier (0–100).
 *
 * ── Philosophie de calibration ──────────────────────────────────────────────
 * Les seuils sont calés sur la réalité du marché français 2024-2026.
 * Le "100/100 théorique" correspond à un deal exceptionnel mais réellement
 * trouvable en France (Roubaix, Mulhouse, Béziers, Saint-Étienne…) :
 *   rendement brut ≥ 8 %  |  cash-flow > +200 €  |  nette-nette > 4 %
 *
 * Un excellent deal classique (Metz, Clermont, Rouen, Le Mans) vise 80–90/100.
 * Un bon deal en grande ville (Lyon, Nantes) vise 55–70/100.
 * Un investissement parisien (3 % brut, CF négatif) score 15–25/100 : c'est
 * factuel — Paris est un pari sur la valorisation, pas sur le rendement locatif.
 *
 * Composantes :
 *   Rendement brut   0–30 pts  (seuil max = 8 %, atteignable en province)
 *   Rendement net    0–20 pts  (seuil max = 5 %)
 *   Cash-flow        0–25 pts  (quasi-neutre = déjà 16/25 — normal en bonne ville)
 *   Nette-nette      0–15 pts  (seuil max = 4 %, réaliste avec LMNP/SCI)
 *   ROI apport       0–10 pts  (seuil max = 12 %)
 * ────────────────────────────────────────────────────────────────────────────
 */
export function calculateScore(
  result: InvestmentResult,
  fiscal?: FiscalResult | null,
  market?: MarketData | null
): ScoreResult {
  let total = 0
  const details: ScoreDetail[] = []

  // ── 1. Rendement brut (0–30 pts) ─────────────────────────────────────────
  // Calibré FR : 4.5 % = correct en grande ville, 6.5 % = très bon, 8 %+ = exceptionnel
  let bPts: number
  if      (result.rendBrut >= 8.0) { bPts = 30; details.push({ label: 'Rendement brut ≥ 8 %',     pts: 30, max: 30, good: true  }) }
  else if (result.rendBrut >= 6.5) { bPts = 26; details.push({ label: 'Rendement brut 6.5–8 %',   pts: 26, max: 30, good: true  }) }
  else if (result.rendBrut >= 5.5) { bPts = 21; details.push({ label: 'Rendement brut 5.5–6.5 %', pts: 21, max: 30, good: true  }) }
  else if (result.rendBrut >= 4.5) { bPts = 15; details.push({ label: 'Rendement brut 4.5–5.5 %', pts: 15, max: 30, good: false }) }
  else if (result.rendBrut >= 3.5) { bPts =  8; details.push({ label: 'Rendement brut 3.5–4.5 %', pts:  8, max: 30, good: false }) }
  else                             { bPts =  3; details.push({ label: 'Rendement brut < 3.5 %',    pts:  3, max: 30, good: false }) }
  total += bPts

  // ── 2. Rendement net (0–20 pts) ──────────────────────────────────────────
  // 5 % net = excellent (après toutes charges, avant impôt)
  let nPts: number
  if      (result.rendNet >= 5.0) { nPts = 20; details.push({ label: 'Rendement net ≥ 5 %',    pts: 20, max: 20, good: true  }) }
  else if (result.rendNet >= 4.0) { nPts = 17; details.push({ label: 'Rendement net 4–5 %',    pts: 17, max: 20, good: true  }) }
  else if (result.rendNet >= 3.5) { nPts = 13; details.push({ label: 'Rendement net 3.5–4 %',  pts: 13, max: 20, good: true  }) }
  else if (result.rendNet >= 2.5) { nPts =  8; details.push({ label: 'Rendement net 2.5–3.5 %',pts:  8, max: 20, good: false }) }
  else if (result.rendNet >= 1.5) { nPts =  4; details.push({ label: 'Rendement net 1.5–2.5 %',pts:  4, max: 20, good: false }) }
  else                            { nPts =  1; details.push({ label: 'Rendement net < 1.5 %',   pts:  1, max: 20, good: false }) }
  total += nPts

  // ── 3. Cash-flow mensuel (0–25 pts) ──────────────────────────────────────
  // Un CF quasi-neutre (-100 à 0 €) est normal et acceptable dans une bonne ville.
  // On ne pénalise pas lourdement : investir à Paris à -400 €/mois reste une décision
  // rationnelle pour certains profils (valorisation, résidence future…).
  let cPts: number
  if      (result.cashflowMensuel >= 200)  { cPts = 25; details.push({ label: 'Cash-flow ≥ +200 €/mois',      pts: 25, max: 25, good: true  }) }
  else if (result.cashflowMensuel >= 30)   { cPts = 21; details.push({ label: 'Cash-flow positif',             pts: 21, max: 25, good: true  }) }
  else if (result.cashflowMensuel >= -100) { cPts = 16; details.push({ label: 'Cash-flow quasi neutre',        pts: 16, max: 25, good: false }) }
  else if (result.cashflowMensuel >= -300) { cPts =  9; details.push({ label: 'Cash-flow légèrement négatif', pts:  9, max: 25, good: false }) }
  else if (result.cashflowMensuel >= -500) { cPts =  4; details.push({ label: 'Cash-flow négatif',            pts:  4, max: 25, good: false }) }
  else                                     { cPts =  1; details.push({ label: 'Cash-flow très négatif',        pts:  1, max: 25, good: false }) }
  total += cPts

  // ── 4. Rentabilité nette-nette (meilleur régime fiscal) (0–15 pts) ───────
  // 4 % nette-nette est excellent et atteignable avec LMNP/SCI bien optimisés
  const fiscNetNet = fiscal?.rendNetNet ?? 0
  let fPts: number
  if      (fiscNetNet >= 4.0) { fPts = 15; details.push({ label: 'Nette-nette ≥ 4 %',    pts: 15, max: 15, good: true  }) }
  else if (fiscNetNet >= 3.0) { fPts = 13; details.push({ label: 'Nette-nette 3–4 %',    pts: 13, max: 15, good: true  }) }
  else if (fiscNetNet >= 2.5) { fPts = 10; details.push({ label: 'Nette-nette 2.5–3 %',  pts: 10, max: 15, good: true  }) }
  else if (fiscNetNet >= 2.0) { fPts =  7; details.push({ label: 'Nette-nette 2–2.5 %',  pts:  7, max: 15, good: false }) }
  else if (fiscNetNet >= 1.0) { fPts =  4; details.push({ label: 'Nette-nette 1–2 %',    pts:  4, max: 15, good: false }) }
  else                        { fPts =  2; details.push({ label: 'Nette-nette < 1 %',     pts:  2, max: 15, good: false }) }
  total += fPts

  // ── 5. ROI sur apport (0–10 pts) ─────────────────────────────────────────
  // 12 % ROI sur apport = excellent levier ; 8 % = bon ; 5 % = acceptable
  let rPts: number
  if      (result.roiApport >= 12) { rPts = 10; details.push({ label: 'ROI apport ≥ 12 %',   pts: 10, max: 10, good: true  }) }
  else if (result.roiApport >=  8) { rPts =  8; details.push({ label: 'ROI apport 8–12 %',   pts:  8, max: 10, good: true  }) }
  else if (result.roiApport >=  5) { rPts =  6; details.push({ label: 'ROI apport 5–8 %',    pts:  6, max: 10, good: true  }) }
  else if (result.roiApport >=  3) { rPts =  3; details.push({ label: 'ROI apport 3–5 %',    pts:  3, max: 10, good: false }) }
  else if (result.roiApport >=  0) { rPts =  1; details.push({ label: 'ROI apport positif',  pts:  1, max: 10, good: false }) }
  else                             { rPts =  0; details.push({ label: 'ROI apport négatif',   pts:  0, max: 10, good: false }) }
  total += rPts

  // ── 6. Données de marché (info seulement, pas de pts) ───────────────────
  if (market) {
    if (market.tensionLoc >= 75) {
      details.push({ label: `Tension locative élevée (${market.tensionLoc}/100)`, pts: 0, max: 0, good: true })
    }
    if (market.dynEco >= 75) {
      details.push({ label: `Fort dynamisme économique (${market.dynEco}/100)`, pts: 0, max: 0, good: true })
    }
  }

  // ── Score global (0–100) ─────────────────────────────────────────────────
  // Max théorique = 100 pts → deal exceptionnel réel en France
  // On plafonne à 97 pour signifier qu'un "parfait" absolu n'existe pas
  const global = Math.min(97, Math.max(0, total))

  // ── Sous-scores (0–100 pour les jauges UI) ───────────────────────────────
  const subScores = {
    // Atteint 95 à 8 % brut — courbe progressive
    rentabilite: Math.min(95, Math.max(0,
      result.rendBrut < 3.5  ? Math.round(result.rendBrut / 3.5 * 18) :
      result.rendBrut < 5.5  ? Math.round(18 + (result.rendBrut - 3.5) / 2 * 34) :
      result.rendBrut < 8    ? Math.round(52 + (result.rendBrut - 5.5) / 2.5 * 43) :
      95
    )),
    // Atteint 95 à +200 €/mois
    cashflow:
      result.cashflowMensuel >= 200  ? 95 :
      result.cashflowMensuel >= 30   ? 78 :
      result.cashflowMensuel >= -100 ? 60 :
      result.cashflowMensuel >= -300 ? 38 :
      result.cashflowMensuel >= -500 ? 18 :
      8,
    // Atteint 95 à ~4.75 % nette-nette
    fiscalite: Math.min(95, Math.max(5, Math.round((fiscal?.rendNetNet ?? 0) * 20))),
    marche: market
      ? Math.min(95, Math.round((market.tensionLoc + market.dynEco + market.attractRevente) / 3))
      : 50,
  }

  // ── Label & couleur ───────────────────────────────────────────────────────
  let label: string
  let color: 'emerald' | 'amber' | 'red'
  let summary: string

  if (global >= 78) {
    label = 'Excellent projet'
    color = 'emerald'
    summary = `Avec un rendement brut de ${result.rendBrut.toFixed(1)} % et un cashflow de ${Math.round(result.cashflowMensuel)} €/mois, ce projet fait partie des meilleurs que l'on puisse trouver en France actuellement. Validez les aspects locaux et votre dossier bancaire.`
  } else if (global >= 58) {
    label = 'Bon projet'
    color = 'emerald'
    summary = `Projet solide avec un rendement brut de ${result.rendBrut.toFixed(1)} %. Quelques optimisations (fiscalité, loyer, charges) pourraient encore améliorer la performance. À creuser sérieusement.`
  } else if (global >= 40) {
    label = 'Projet correct'
    color = 'amber'
    summary = `Rendement brut de ${result.rendBrut.toFixed(1)} % avec un cashflow de ${Math.round(result.cashflowMensuel)} €/mois. Acceptable pour un marché tendu — négociez le prix ou optimisez la fiscalité pour renforcer la rentabilité.`
  } else if (global >= 22) {
    label = 'Rentabilité limitée'
    color = 'amber'
    summary = `Les performances locatives sont inférieures aux moyennes du marché. Ce bien peut se justifier par un fort potentiel de valorisation, mais l'effort d'épargne mensuel sera significatif.`
  } else {
    label = 'Pari sur la valorisation'
    color = 'red'
    summary = `Les indicateurs de rendement locatif sont très faibles. Ce projet repose essentiellement sur la plus-value future. Vérifiez que votre capacité d'épargne mensuelle permet d'absorber l'effort sur la durée.`
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

// (generateRecommendations supprimé — code mort, jamais appelé)
