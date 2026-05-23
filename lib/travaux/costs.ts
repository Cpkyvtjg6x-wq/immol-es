/**
 * IMMORA — Bibliothèque de coûts travaux par poste
 * Fourchettes 2024-2025 (Source : CAPEB, FFB, devis moyens observatoires locaux)
 * Coefficient géographique basé sur l'indice BTP régional
 */

export type UnitePoste = 'm2' | 'forfait' | 'unite'
export type NiveauCout = 'bas' | 'med' | 'haut'
export type ZoneGeo = 'paris' | 'grandeville' | 'province'

export interface PosteTravaux {
  id: string
  label: string
  description: string
  unite: UnitePoste
  fourchette: { bas: number; med: number; haut: number }  // par unité (m², forfait, ou unité)
  categorie: 'esthetique' | 'technique' | 'isolation'
}

// ─── Référentiel des postes ───────────────────────────────────────────────────

export const POSTES: PosteTravaux[] = [
  // ── Esthétique ──────────────────────────────────────────────────────────────
  {
    id: 'peinture',
    label: 'Peinture & décoration',
    description: 'Murs, plafonds, boiseries — fournitures + main d\'œuvre',
    unite: 'm2',
    fourchette: { bas: 18, med: 28, haut: 45 },
    categorie: 'esthetique',
  },
  {
    id: 'sol',
    label: 'Revêtement de sol',
    description: 'Parquet stratifié, carrelage ou vinyle — pose incluse',
    unite: 'm2',
    fourchette: { bas: 45, med: 70, haut: 110 },
    categorie: 'esthetique',
  },
  {
    id: 'cuisine',
    label: 'Cuisine équipée',
    description: 'Meuble, plan de travail, électroménager de base, pose',
    unite: 'forfait',
    fourchette: { bas: 5000, med: 9500, haut: 16000 },
    categorie: 'esthetique',
  },
  {
    id: 'sdb',
    label: 'Salle de bain',
    description: 'Douche ou baignoire, WC, vasque, carrelage, plomberie',
    unite: 'forfait',
    fourchette: { bas: 4500, med: 8000, haut: 14000 },
    categorie: 'esthetique',
  },
  // ── Technique ───────────────────────────────────────────────────────────────
  {
    id: 'electricite',
    label: 'Électricité',
    description: 'Mise aux normes NF C 15-100, tableau, prises, éclairage',
    unite: 'm2',
    fourchette: { bas: 45, med: 70, haut: 110 },
    categorie: 'technique',
  },
  {
    id: 'plomberie',
    label: 'Plomberie',
    description: 'Remplacement canalisations, robinetterie, chauffe-eau',
    unite: 'forfait',
    fourchette: { bas: 2500, med: 5000, haut: 9000 },
    categorie: 'technique',
  },
  {
    id: 'fenetres',
    label: 'Fenêtres double vitrage',
    description: 'PVC ou alu, pose incluse (par fenêtre)',
    unite: 'unite',
    fourchette: { bas: 650, med: 950, haut: 1500 },
    categorie: 'technique',
  },
  // ── Isolation / DPE ─────────────────────────────────────────────────────────
  {
    id: 'isolation-combles',
    label: 'Isolation combles/toiture',
    description: 'Laine de verre ou soufflée, éligible CEE',
    unite: 'm2',
    fourchette: { bas: 20, med: 35, haut: 55 },
    categorie: 'isolation',
  },
  {
    id: 'isolation-murs',
    label: 'Isolation murs (ITE/ITI)',
    description: 'Isolation thermique intérieure ou extérieure',
    unite: 'm2',
    fourchette: { bas: 60, med: 100, haut: 160 },
    categorie: 'isolation',
  },
  {
    id: 'chauffage',
    label: 'Pompe à chaleur / chaudière',
    description: 'PAC air-air ou air-eau, ou chaudière à condensation',
    unite: 'forfait',
    fourchette: { bas: 6000, med: 10000, haut: 18000 },
    categorie: 'isolation',
  },
]

// ─── Coefficient géographique ─────────────────────────────────────────────────
// Basé sur l'indice BTP régional (base 1.0 = province)

export const COEF_GEO: Record<ZoneGeo, number> = {
  paris: 1.35,       // Paris + petite couronne
  grandeville: 1.12, // Lyon, Bordeaux, Nice, Nantes…
  province: 1.0,     // Reste de la France
}

/** Détermine la zone géo depuis le prix m² du marché local */
export function getZoneGeo(prixM2Marche?: number): ZoneGeo {
  if (!prixM2Marche) return 'province'
  if (prixM2Marche >= 7500) return 'paris'
  if (prixM2Marche >= 3500) return 'grandeville'
  return 'province'
}

// ─── Calcul d'un poste ────────────────────────────────────────────────────────

export interface EstimationPoste {
  poste: PosteTravaux
  quantite: number   // surface, 1 (forfait), ou nb unités
  bas: number
  med: number
  haut: number
  coef: number
}

export function estimerPoste(
  poste: PosteTravaux,
  surface: number,
  nbFenetres: number,
  zone: ZoneGeo,
): EstimationPoste {
  const coef = COEF_GEO[zone]
  const quantite =
    poste.unite === 'm2' ? surface :
    poste.unite === 'unite' ? nbFenetres :
    1

  return {
    poste,
    quantite,
    bas:  Math.round(poste.fourchette.bas  * quantite * coef),
    med:  Math.round(poste.fourchette.med  * quantite * coef),
    haut: Math.round(poste.fourchette.haut * quantite * coef),
    coef,
  }
}

export function totalEstimation(estimations: EstimationPoste[]): { bas: number; med: number; haut: number } {
  return estimations.reduce(
    (acc, e) => ({ bas: acc.bas + e.bas, med: acc.med + e.med, haut: acc.haut + e.haut }),
    { bas: 0, med: 0, haut: 0 },
  )
}
