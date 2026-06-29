/**
 * Module DPE / Rénovation — calculs simplifiés et robustes
 * Aides 2025-2026 : MaPrimeRénov', Eco-PTZ, CEE, TVA réduite
 */

import { PRELEVEMENTS_SOCIAUX } from './fiscal-constants'

export type DpeClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type ProfileRevenu = 'tres-modeste' | 'modeste' | 'intermediaire' | 'superieur'

export const DPE_LABELS: Record<DpeClass, string> = {
  A: 'Très performant',
  B: 'Performant',
  C: 'Assez performant',
  D: 'Peu performant',
  E: 'Énergivore',
  F: 'Très énergivore',
  G: 'Passoire thermique',
}

export const DPE_COLORS: Record<DpeClass, { bg: string; text: string }> = {
  A: { bg: '#00a550', text: '#fff' },
  B: { bg: '#57b947', text: '#fff' },
  C: { bg: '#c8d400', text: '#222' },
  D: { bg: '#ffd400', text: '#222' },
  E: { bg: '#f7a600', text: '#222' },
  F: { bg: '#e3630a', text: '#fff' },
  G: { bg: '#cc0000', text: '#fff' },
}

// Interdictions de location
export const DPE_INTERDICTION: Partial<Record<DpeClass, string>> = {
  G: 'Interdit à la location depuis jan. 2025',
  F: 'Interdit à la location en 2028',
  E: 'Interdit à la location en 2034',
}

// Décote sur le prix d'achat selon le DPE
export const DPE_DECOTE: Record<DpeClass, number> = {
  G: 0.24,
  F: 0.15,
  E: 0.07,
  D: 0.02,
  C: 0,
  B: 0,
  A: 0,
}

// Coût moyen travaux €/m² selon la transition DPE [bas, moyen, haut]
const COUT_M2: Record<string, [number, number, number]> = {
  'G-A': [500, 750, 1100],
  'G-B': [430, 640, 950],
  'G-C': [370, 530, 780],
  'G-D': [240, 360, 530],
  'F-A': [410, 610, 900],
  'F-B': [340, 510, 760],
  'F-C': [275, 420, 630],
  'F-D': [160, 260, 400],
  'E-A': [290, 440, 660],
  'E-B': [220, 340, 510],
  'E-C': [140, 230, 360],
  'E-D': [80, 130, 210],
  'D-A': [200, 300, 450],
  'D-B': [130, 200, 310],
  'D-C': [60, 100, 160],
  'C-A': [100, 160, 240],
  'C-B': [50, 80, 130],
}

function getCoutM2(from: DpeClass, to: DpeClass): [number, number, number] {
  const key = `${from}-${to}`
  return COUT_M2[key] ?? [100, 200, 350]
}

// Taux MaPrimeRénov' bailleur selon profil (pour 2+ classes de saut)
const MPR_TAUX: Record<ProfileRevenu, number> = {
  'tres-modeste': 0.30,
  'modeste': 0.25,
  'intermediaire': 0.20,
  'superieur': 0.15,
}

// Plafond MPR bailleur (travaux éligibles)
const MPR_PLAFOND = 50000

export interface RenovationCalc {
  // Budget travaux
  coutBas: number
  coutMoyen: number
  coutHaut: number
  // Aides
  maprimerenovMontant: number
  maprimerenovEligible: boolean
  ecoPtzMontant: number
  ecoPtzEligible: boolean
  ceeMontant: number
  tvaMontant: number  // économie TVA 5.5% vs 20%
  totalAides: number
  coutNet: number     // coût moyen - aides (hors eco-ptz)
  // Décote achat
  decotePct: number
  decoteMontant: number
  prixAvecDecote: number
  // Rentabilité avant/après
  loyerApresRenovation: number   // +5% à +15% selon saut DPE
  rendBrutAvant: number
  rendBrutApres: number
  // LMNP amortissement
  amortissementAnnuel: number
  economieImpotAnnuelle: number
  recoupementAns: number
  // Dossier bancaire
  ltvAvant: number
  ltvApres: number
  // Saut en classes
  sautClasses: number
  // Recommandation globale
  recommandation: string
  urgence: 'critique' | 'elevee' | 'moderee' | 'faible'
}

export function calculateRenovation(
  dpeActuel: DpeClass,
  dpeCible: DpeClass,
  surface: number,
  prixAchat: number,
  loyerMensuel: number,
  montantEmprunte: number,
  tmi: number,
  profileRevenu: ProfileRevenu,
  locType: 'nu' | 'meuble' | 'coloc' | 'saisonnier' | 'immeuble',
  budgetCustom?: number,
): RenovationCalc {
  const ordre: DpeClass[] = ['G', 'F', 'E', 'D', 'C', 'B', 'A']
  const idxActuel = ordre.indexOf(dpeActuel)
  const idxCible = ordre.indexOf(dpeCible)
  const sautClasses = Math.max(0, idxCible - idxActuel)

  // Budget travaux
  const [bas, moy, haut] = getCoutM2(dpeActuel, dpeCible)
  const coutBas = budgetCustom ? budgetCustom * 0.8 : bas * surface
  const coutMoyen = budgetCustom ?? moy * surface
  const coutHaut = budgetCustom ? budgetCustom * 1.3 : haut * surface

  // TVA réduite 5.5% au lieu de 20% — économie sur la main d'œuvre (~60% du coût)
  const tvaMontant = Math.round(coutMoyen * 0.6 * (0.20 - 0.055))

  // CEE (Certificats d'Économies d'Énergie) — estimation forfaitaire
  const ceeMontant = sautClasses >= 2
    ? Math.round(Math.min(coutMoyen * 0.08, 4000))
    : 0

  // MaPrimeRénov' bailleur — saut de 2+ classes requis
  const maprimerenovEligible = sautClasses >= 2
  const mprBase = maprimerenovEligible
    ? Math.min(coutMoyen, MPR_PLAFOND) * MPR_TAUX[profileRevenu]
    : 0
  const maprimerenovMontant = Math.round(mprBase)

  // Eco-PTZ — prêt à 0% pour 2+ classes, jusqu'à 50 000€
  const ecoPtzEligible = sautClasses >= 2
  const ecoPtzMontant = ecoPtzEligible
    ? Math.min(coutMoyen - maprimerenovMontant - ceeMontant, 50000)
    : 0

  // Total aides (hors Eco-PTZ qui est un prêt, pas une subvention)
  const totalAides = maprimerenovMontant + ceeMontant + tvaMontant
  const coutNet = Math.max(0, coutMoyen - totalAides)

  // Décote à l'achat
  const decotePct = DPE_DECOTE[dpeActuel] ?? 0
  const decoteMontant = Math.round(prixAchat * decotePct)
  const prixAvecDecote = prixAchat - decoteMontant

  // Loyer après rénovation (gain estimé selon saut)
  const gainLoyer = sautClasses >= 3 ? 0.12 : sautClasses >= 2 ? 0.08 : sautClasses >= 1 ? 0.04 : 0
  const loyerApresRenovation = Math.round(loyerMensuel * (1 + gainLoyer))

  // Rendement brut avant / après
  const prixRevientTotal = prixAchat + coutMoyen
  const rendBrutAvant = prixAchat > 0 ? (loyerMensuel * 12) / prixAchat * 100 : 0
  const rendBrutApres = prixRevientTotal > 0
    ? (loyerApresRenovation * 12) / prixRevientTotal * 100
    : 0

  // LMNP amortissement travaux (meublé/coloc)
  const isLmnp = locType === 'meuble' || locType === 'coloc' || locType === 'saisonnier'
  const amortissementAnnuel = isLmnp ? Math.round(coutNet / 10) : 0
  const economieImpotAnnuelle = isLmnp ? Math.round(amortissementAnnuel * (tmi / 100 + PRELEVEMENTS_SOCIAUX)) : 0
  const recoupementAns = economieImpotAnnuelle > 0
    ? Math.round(coutNet / economieImpotAnnuelle)
    : 0

  // LTV (Loan-to-Value)
  const ltvAvant = montantEmprunte > 0 && prixAchat > 0
    ? Math.round((montantEmprunte / prixAchat) * 100)
    : 0
  const valeurApres = prixAvecDecote + coutMoyen * 1.1  // 10% de plus-value travaux
  const ltvApres = montantEmprunte > 0 && valeurApres > 0
    ? Math.round((montantEmprunte / valeurApres) * 100)
    : 0

  // Urgence & recommandation
  const urgence: RenovationCalc['urgence'] =
    dpeActuel === 'G' ? 'critique' :
    dpeActuel === 'F' ? 'elevee' :
    dpeActuel === 'E' ? 'moderee' : 'faible'

  let recommandation = ''
  if (dpeActuel === 'G') {
    recommandation = `Ce bien est déjà interdit à la location. Une rénovation vers ${dpeCible} coûte ~${Math.round(coutMoyen / 1000)}k€ (net aides : ~${Math.round(coutNet / 1000)}k€) mais est indispensable pour le mettre en location.`
  } else if (dpeActuel === 'F') {
    recommandation = `Interdiction en 2028. Avec la décote d'achat (${Math.round(decotePct * 100)}%) et ~${Math.round(totalAides / 1000)}k€ d'aides, la rénovation peut être très rentable si anticipée maintenant.`
  } else if (dpeActuel === 'E') {
    recommandation = `Interdiction en 2034. Anticiper dès maintenant permet de bénéficier des aides MaPrimeRénov' et d'optimiser le rendement locatif.`
  } else {
    recommandation = `DPE ${dpeActuel} — pas d'urgence réglementaire. La rénovation peut améliorer le rendement et la valeur du bien.`
  }

  return {
    coutBas: Math.round(coutBas),
    coutMoyen: Math.round(coutMoyen),
    coutHaut: Math.round(coutHaut),
    maprimerenovMontant,
    maprimerenovEligible,
    ecoPtzMontant: Math.round(Math.max(0, ecoPtzMontant)),
    ecoPtzEligible,
    ceeMontant,
    tvaMontant,
    totalAides,
    coutNet: Math.round(coutNet),
    decotePct,
    decoteMontant,
    prixAvecDecote,
    loyerApresRenovation,
    rendBrutAvant: Math.round(rendBrutAvant * 10) / 10,
    rendBrutApres: Math.round(rendBrutApres * 10) / 10,
    amortissementAnnuel,
    economieImpotAnnuelle,
    recoupementAns,
    ltvAvant,
    ltvApres,
    sautClasses,
    recommandation,
    urgence,
  }
}
