/**
 * ─── Moteur de calcul DPE / Rénovation ────────────────────────────────────────
 *
 * Logique complète pour simuler :
 *  • Le coût estimatif des travaux selon la transition DPE (€/m²)
 *  • Les aides de l'État éligibles (MaPrimeRénov', Eco-PTZ, CEE, TVA réduite)
 *  • L'impact sur la rentabilité avant/après rénovation
 *  • L'amortissement LMNP des travaux (réduction fiscale annuelle)
 *  • L'impact sur le dossier bancaire
 *
 * Sources : ANAH, Ministère Logement, DPE-Expert, données marché 2025-2026
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type DpeClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type ProfileRevenu = 'tres-modeste' | 'modeste' | 'intermediaire' | 'superieur'
export type FinancementTravaux = 'credit-principal' | 'eco-ptz' | 'fonds-propres'

export interface RenovationParams {
  dpeActuel: DpeClass
  dpeCible: DpeClass
  surface: number               // m²
  prixAchat: number             // Prix affiché avant décote
  loyerActuel: number           // Loyer mensuel actuel (avant rénov.)
  mensualiteCredit: number      // Pour calcul dossier bancaire
  montantEmprunte: number       // Capital emprunté initial
  profileRevenu: ProfileRevenu
  financementTravaux: FinancementTravaux
  budgetCustom?: number         // Override manuel du budget travaux
  apportDisponible: number      // Pour vérifier si rénov. finançable
  tmi: number                   // Pour calcul économie fiscale LMNP
  locType: 'nu' | 'meuble' | 'coloc' | 'saisonnier'
}

export interface TravauxPoste {
  label: string
  description: string
  applicable: boolean
  coutEstime: [number, number, number]  // [bas, moyen, haut] en €
}

export interface AidesDetail {
  maprimerenovMontant: number
  maprimerenovEligible: boolean
  maprimerenovNote: string
  ecoPtzMontant: number
  ecoPtzEligible: boolean
  ecoPtzNote: string
  ceeMontant: number
  tvaReduiteMontant: number     // économie sur TVA 5,5% vs 20%
  anah: number                  // aide Anah si profil très modeste/modeste bailleur
  totalAides: number
  netACharge: number
}

export interface ImpactBancaire {
  valeurPostRenovation: number
  plusValueEstimee: number
  ltvAvant: number              // %
  ltvApres: number              // %
  risqueLocatifElimine: boolean
  ecoPtzFinancement: boolean
  ecoPtzNote: string
  tauxCouvertureApres: number   // loyer rénov / mensualité
  recommandationBanquier: string
  pointsForts: string[]
}

export interface RenovationResult {
  // Travaux
  postes: TravauxPoste[]
  budgetLow: number
  budgetMid: number
  budgetHigh: number
  budgetRetenu: number          // custom ou mid

  // Aides
  aides: AidesDetail

  // Décote achat
  decotePct: number             // % de décote sur le prix affiché
  decoteMontant: number         // Économie à l'achat
  prixAchatAvecDecote: number

  // Rentabilité avant / après
  rendBrutAvant: number
  rendBrutApres: number
  rendNetApres: number
  loyerApresRenovation: number
  cashflowDeltaMensuel: number  // gain de CF mensuel post-rénov

  // Fiscal LMNP
  amortissementTravauxAnnuel: number   // si LMNP réel
  economieImpotAnnuelle: number        // tmi * amort annuel
  dureeAmortissement: number           // ans
  recoupementFiscal: number            // années pour récupérer net à charge via économie impôt

  // Dossier bancaire
  bancaire: ImpactBancaire

  // Timeline
  dateInterdictionLocation?: string
  urgence: 'critique' | 'attention' | 'neutre'

  // Recommandation globale
  recommandation: 'excellent' | 'rentable' | 'attention' | 'deconseille'
  recommandationTexte: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Ordre du pire au meilleur */
export const DPE_ORDER: DpeClass[] = ['G', 'F', 'E', 'D', 'C', 'B', 'A']

/** Coût total en €/m² [bas, moyen, haut] selon la transition DPE */
const COUT_M2: Record<string, [number, number, number]> = {
  'G-F': [55,  90,  150],
  'G-E': [130, 200, 310],
  'G-D': [220, 340, 500],
  'G-C': [370, 530, 780],
  'G-B': [530, 760, 1100],
  'G-A': [700, 980, 1400],
  'F-E': [65,  110, 175],
  'F-D': [155, 255, 390],
  'F-C': [275, 420, 630],
  'F-B': [440, 660, 960],
  'F-A': [620, 880, 1280],
  'E-D': [45,  80,  135],
  'E-C': [140, 230, 360],
  'E-B': [300, 480, 730],
  'E-A': [480, 700, 1050],
  'D-C': [65,  120, 210],
  'D-B': [190, 330, 520],
  'D-A': [380, 580, 880],
  'C-B': [90,  185, 320],
  'C-A': [280, 460, 720],
  'B-A': [150, 280, 460],
}

/** Décote typique du prix de marché selon le DPE (vs bien équivalent C) */
const DECOTE_DPE: Record<DpeClass, number> = {
  G: 0.24,
  F: 0.15,
  E: 0.07,
  D: 0.02,
  C: 0,
  B: 0,
  A: 0,
}

/** Augmentation du loyer possible après amélioration DPE */
const LOYER_BONUS_DPE: Record<DpeClass, number> = {
  A: 0.08,   // +8% vs C
  B: 0.04,   // +4%
  C: 0,
  D: -0.03,  // -3%
  E: -0.06,
  F: -0.10,
  G: -0.14,
}

/** Valorisation du bien post-rénovation (% du coût travaux récupéré) */
const VALORISATION_TRAVAUX = 0.75  // 75% des travaux se retrouvent dans la valeur du bien

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function dpeIndex(dpe: DpeClass): number {
  return DPE_ORDER.indexOf(dpe)
}

export function dpeDelta(from: DpeClass, to: DpeClass): number {
  return dpeIndex(to) - dpeIndex(from) // positif = amélioration
}

export function getCoutM2(from: DpeClass, to: DpeClass): [number, number, number] {
  const key = `${from}-${to}`
  return COUT_M2[key] ?? [100, 180, 280]
}

/** Aides MaPrimeRénov' bailleur 2025-2026 */
function calcMaprimerenovBailleur(
  budgetNet: number,
  profileRevenu: ProfileRevenu,
  dpeActuel: DpeClass,
  dpeCible: DpeClass
): { montant: number; note: string } {
  const delta = dpeDelta(dpeActuel, dpeCible)

  // Rénovation d'ampleur (saut ≥ 2 classes) → MPR "Réno globale"
  if (delta >= 2) {
    const taux: Record<ProfileRevenu, number> = {
      'tres-modeste':   0.30,
      'modeste':        0.25,
      'intermediaire':  0.20,
      'superieur':      0.15,
    }
    const plafond = 70000
    const base = Math.min(budgetNet, plafond)
    const montant = Math.round(base * taux[profileRevenu])
    return {
      montant,
      note: `MPR Rénovation d'ampleur (saut ${delta} classes) — taux bailleur ${Math.round(taux[profileRevenu]*100)}%`,
    }
  }

  // Saut 1 classe → MPR forfaits travaux
  if (delta === 1) {
    const taux: Record<ProfileRevenu, number> = {
      'tres-modeste':   0.25,
      'modeste':        0.20,
      'intermediaire':  0.15,
      'superieur':      0.10,
    }
    const plafond = 40000
    const base = Math.min(budgetNet, plafond)
    const montant = Math.round(base * taux[profileRevenu])
    return {
      montant,
      note: `MPR forfaits travaux (saut 1 classe) — taux bailleur ${Math.round(taux[profileRevenu]*100)}%`,
    }
  }

  return { montant: 0, note: 'Saut DPE insuffisant pour MaPrimeRénov\'' }
}

/** Eco-PTZ : prêt à 0% jusqu'à 50 000€, saut ≥ 2 classes ou travaux combinés */
function calcEcoPtz(
  budgetNet: number,
  dpeActuel: DpeClass,
  dpeCible: DpeClass
): { montant: number; eligible: boolean; note: string } {
  const delta = dpeDelta(dpeActuel, dpeCible)

  if (delta >= 2) {
    const montant = Math.min(budgetNet, 50000)
    return {
      montant,
      eligible: true,
      note: `Eco-PTZ jusqu'à 50 000 € à 0 % — saut ${delta} classes DPE qualifiant`,
    }
  }
  if (delta === 1) {
    const montant = Math.min(budgetNet, 30000)
    return {
      montant,
      eligible: true,
      note: 'Eco-PTZ jusqu\'à 30 000 € à 0 % — 1 classe améliorée (travaux combinés requis)',
    }
  }
  return { montant: 0, eligible: false, note: 'Eco-PTZ non éligible (saut DPE insuffisant)' }
}

/** Certificats d'Économies d'Énergie (estimation forfaitaire) */
function calcCEE(budgetBrut: number, delta: number): number {
  if (delta <= 0) return 0
  // Entre 2 000 € et 10 000 € selon l'amplitude des travaux
  return Math.min(10000, Math.max(1500, delta * budgetBrut * 0.05))
}

/** Économie TVA réduite 5,5 % vs 20 % sur main-d'œuvre + matériaux */
function calcTvaReduite(budgetBrut: number): number {
  // La TVA passe de 20% à 5,5% sur les travaux de rénovation énergétique
  // Économie = budgetHT * (20% - 5,5%) = budgetHT * 14,5%
  // budgetBrut inclut TVA 20%, donc budgetHT = budgetBrut / 1.20
  const budgetHT = budgetBrut / 1.20
  return Math.round(budgetHT * 0.145)
}

/** Estimation du loyer après rénovation */
function loyerApresRenovation(loyerActuel: number, dpeActuel: DpeClass, dpeCible: DpeClass): number {
  const bonusAvant  = LOYER_BONUS_DPE[dpeActuel]
  const bonusApres  = LOYER_BONUS_DPE[dpeCible]
  const delta       = bonusApres - bonusAvant
  return Math.round(loyerActuel * (1 + delta))
}

/** Postes de travaux typiques par transition DPE */
function getPostes(from: DpeClass, to: DpeClass, surface: number): TravauxPoste[] {
  const delta = dpeDelta(from, to)
  const s     = surface

  const postes: TravauxPoste[] = []

  // Isolation combles (quasi systématique dès 1 classe)
  if (delta >= 1) {
    postes.push({
      label:       'Isolation des combles / toiture',
      description: 'Laine minérale ou soufflage — 25 à 45 cm d\'épaisseur',
      applicable:  true,
      coutEstime:  [Math.round(s * 20), Math.round(s * 38), Math.round(s * 60)],
    })
  }

  // Isolation murs (pertinent dès 2 classes)
  if (delta >= 2) {
    postes.push({
      label:       'Isolation des murs (ITE ou ITI)',
      description: 'Isolation thermique par l\'extérieur ou par l\'intérieur',
      applicable:  true,
      coutEstime:  [Math.round(s * 80), Math.round(s * 130), Math.round(s * 200)],
    })
  }

  // Remplacement menuiseries (pertinent dès 1 classe)
  if (delta >= 1) {
    const nbFenetres = Math.max(2, Math.round(s / 12))
    postes.push({
      label:       `Menuiseries double/triple vitrage (~${nbFenetres} ouvertures)`,
      description: 'Remplacement fenêtres et portes-fenêtres',
      applicable:  true,
      coutEstime:  [nbFenetres * 600, nbFenetres * 950, nbFenetres * 1400],
    })
  }

  // Système de chauffage (pertinent dès 2 classes depuis G/F)
  if (delta >= 2 || ['G', 'F'].includes(from)) {
    postes.push({
      label:       'Pompe à chaleur air/eau ou chaudière à condensation',
      description: 'Remplacement du système de chauffage principal',
      applicable:  true,
      coutEstime:  [8000, 13000, 20000],
    })
  }

  // VMC double flux (pertinent dès 3 classes)
  if (delta >= 3) {
    postes.push({
      label:       'VMC double flux',
      description: 'Ventilation mécanique contrôlée avec récupération de chaleur',
      applicable:  true,
      coutEstime:  [3500, 5500, 8500],
    })
  }

  // Isolation plancher bas (pertinent dès 2 classes)
  if (delta >= 2) {
    postes.push({
      label:       'Isolation du plancher bas',
      description: 'Sous-face de dalle ou plancher sur terre-plein',
      applicable:  delta >= 3,
      coutEstime:  [Math.round(s * 15), Math.round(s * 28), Math.round(s * 45)],
    })
  }

  return postes
}

// ─── Calcul principal ─────────────────────────────────────────────────────────

export function calculateRenovation(p: RenovationParams): RenovationResult {
  const delta     = dpeDelta(p.dpeActuel, p.dpeCible)
  const [low, mid, high] = getCoutM2(p.dpeActuel, p.dpeCible)

  const budgetLow  = Math.round(low  * p.surface)
  const budgetMid  = Math.round(mid  * p.surface)
  const budgetHigh = Math.round(high * p.surface)
  const budgetRetenu = p.budgetCustom ?? budgetMid

  // ── Aides ────────────────────────────────────────────────────────────────
  const tvaEco    = calcTvaReduite(budgetRetenu)
  const budgetAvecTva = budgetRetenu - tvaEco   // budget réel après TVA réduite
  const mpr       = calcMaprimerenovBailleur(budgetAvecTva, p.profileRevenu, p.dpeActuel, p.dpeCible)
  const ecoPtz    = calcEcoPtz(budgetAvecTva, p.dpeActuel, p.dpeCible)
  const cee       = Math.round(calcCEE(budgetRetenu, delta))

  // Aide ANAH supplémentaire pour profils très modestes/modestes (bailleurs conventionnés)
  const anahMontant = (p.profileRevenu === 'tres-modeste' && delta >= 2)
    ? Math.min(15000, Math.round(budgetRetenu * 0.12))
    : 0

  const totalAides = mpr.montant + cee + tvaEco + anahMontant
  // L'Eco-PTZ ne réduit pas le coût, c'est un financement — on l'affiche séparément
  const netACharge = Math.max(0, budgetRetenu - totalAides)

  const aides: AidesDetail = {
    maprimerenovMontant:  mpr.montant,
    maprimerenovEligible: mpr.montant > 0,
    maprimerenovNote:     mpr.note,
    ecoPtzMontant:        ecoPtz.montant,
    ecoPtzEligible:       ecoPtz.eligible,
    ecoPtzNote:           ecoPtz.note,
    ceeMontant:           cee,
    tvaReduiteMontant:    tvaEco,
    anah:                 anahMontant,
    totalAides,
    netACharge,
  }

  // ── Décote achat ─────────────────────────────────────────────────────────
  const decotePct     = DECOTE_DPE[p.dpeActuel]
  const decoteMontant = Math.round(p.prixAchat * decotePct)
  const prixAchatAvecDecote = p.prixAchat - decoteMontant

  // ── Rentabilité avant / après ─────────────────────────────────────────────
  const loyerAnnuelAvant = p.loyerActuel * 12
  const rendBrutAvant    = loyerAnnuelAvant / p.prixAchat * 100

  // Après : prix d'achat réduit + travaux nets d'aides = nouvelle base de calcul
  const prixRevientApres = prixAchatAvecDecote + netACharge
  const loyerApres       = loyerApresRenovation(p.loyerActuel, p.dpeActuel, p.dpeCible)
  const loyerAnnuelApres = loyerApres * 12
  const rendBrutApres    = loyerAnnuelApres / prixRevientApres * 100

  // Rendement net après (estimation : charges ≈ 25% du loyer brut)
  const rendNetApres = rendBrutApres * 0.75

  const cashflowDeltaMensuel = Math.round((loyerApres - p.loyerActuel))

  // ── Amortissement LMNP ────────────────────────────────────────────────────
  const dureeAmortissement = p.locType === 'meuble' || p.locType === 'coloc' ? 10 : 0
  const amortissementTravauxAnnuel = dureeAmortissement > 0
    ? Math.round(netACharge / dureeAmortissement)
    : 0
  const economieImpotAnnuelle = Math.round(amortissementTravauxAnnuel * (p.tmi / 100) * 1.172) // tmi + PS 17.2%
  const recoupementFiscal = economieImpotAnnuelle > 0
    ? Math.round(netACharge / economieImpotAnnuelle)
    : 99

  // ── Impact bancaire ───────────────────────────────────────────────────────
  const plusValueEstimee    = Math.round(netACharge * VALORISATION_TRAVAUX)
  const valeurPostRenovation = prixAchatAvecDecote + plusValueEstimee
  const ltvAvant  = p.montantEmprunte > 0 ? Math.round(p.montantEmprunte / p.prixAchat * 100) : 0
  const ltvApres  = p.montantEmprunte > 0 ? Math.round(p.montantEmprunte / valeurPostRenovation * 100) : 0
  const tauxCouvertureApres = p.mensualiteCredit > 0
    ? Math.round((loyerApres * 0.70) / p.mensualiteCredit * 100)
    : 0

  const risqueLocatifElimine = ['F', 'G'].includes(p.dpeActuel) && !['F', 'G'].includes(p.dpeCible)

  const pointsForts: string[] = []
  if (risqueLocatifElimine) pointsForts.push('Risque d\'interdiction de location éliminé')
  if (ltvApres < ltvAvant && ltvApres < 80) pointsForts.push(`LTV améliorée : ${ltvAvant}% → ${ltvApres}%`)
  if (ecoPtz.eligible) pointsForts.push(`Eco-PTZ 0% jusqu'à ${ecoPtz.montant.toLocaleString('fr-FR')} € finançable séparément`)
  if (rendBrutApres > rendBrutAvant + 0.5) pointsForts.push(`Rendement brut : +${(rendBrutApres - rendBrutAvant).toFixed(1)} point après travaux`)
  if (tauxCouvertureApres >= 100) pointsForts.push(`Taux de couverture locatif : ${tauxCouvertureApres}% (banquier rassuré)`)

  let recommandationBanquier = ''
  if (risqueLocatifElimine && rendBrutApres > 5.5) {
    recommandationBanquier = 'Dossier renforcé : la rénovation élimine le risque locatif et améliore la valeur de garantie. Argumentaire bancaire solide.'
  } else if (ltvApres < 80) {
    recommandationBanquier = 'La valorisation post-rénovation améliore le ratio LTV, ce qui peut faciliter la négociation du taux.'
  } else {
    recommandationBanquier = 'L\'Eco-PTZ (prêt séparé à 0%) peut financer les travaux sans dégrader le taux d\'endettement principal.'
  }

  const bancaire: ImpactBancaire = {
    valeurPostRenovation,
    plusValueEstimee,
    ltvAvant,
    ltvApres,
    risqueLocatifElimine,
    ecoPtzFinancement:     ecoPtz.eligible,
    ecoPtzNote:            ecoPtz.note,
    tauxCouvertureApres,
    recommandationBanquier,
    pointsForts,
  }

  // ── Timeline & urgence ───────────────────────────────────────────────────
  let dateInterdictionLocation: string | undefined
  let urgence: RenovationResult['urgence'] = 'neutre'

  if (p.dpeActuel === 'G') {
    dateInterdictionLocation = 'janvier 2025 (déjà interdit)'
    urgence = 'critique'
  } else if (p.dpeActuel === 'F') {
    dateInterdictionLocation = 'janvier 2028'
    urgence = 'attention'
  } else if (p.dpeActuel === 'E') {
    dateInterdictionLocation = 'janvier 2034'
    urgence = 'attention'
  }

  // ── Recommandation globale ───────────────────────────────────────────────
  let recommandation: RenovationResult['recommandation']
  let recommandationTexte: string

  const gainRendement = rendBrutApres - rendBrutAvant

  if (p.dpeActuel === 'G') {
    recommandation = 'excellent'
    recommandationTexte = `Ce bien est interdit à la location depuis janvier 2025, ce qui explique la forte décote (-${Math.round(decotePct*100)}%). En intégrant ${netACharge.toLocaleString('fr-FR')} € nets de travaux, vous obtenez un rendement de ${rendBrutApres.toFixed(1)} % — supérieur à un bien équivalent en bon état. C'est la définition d'une opération à valeur ajoutée.`
  } else if (p.dpeActuel === 'F' && gainRendement > 0.8) {
    recommandation = 'excellent'
    recommandationTexte = `La décote DPE F (-${Math.round(decotePct*100)}%) combinée aux aides de l'État rend l'opération très intéressante. Votre rendement passe de ${rendBrutAvant.toFixed(1)} % à ${rendBrutApres.toFixed(1)} %, avec une interdiction de location à anticiper avant 2028.`
  } else if (gainRendement > 0.3 && netACharge < p.prixAchat * 0.30) {
    recommandation = 'rentable'
    recommandationTexte = `La rénovation est rentable : le gain de rendement (+${gainRendement.toFixed(1)} pt) et les économies fiscales LMNP permettent de récupérer l'investissement net en ${recoupementFiscal < 20 ? recoupementFiscal + ' ans' : 'long terme'}.`
  } else if (gainRendement > 0 && netACharge < p.prixAchat * 0.50) {
    recommandation = 'attention'
    recommandationTexte = `La rénovation améliore la situation mais le budget net est significatif par rapport au gain de rendement. Négociez la décote à l'achat pour équilibrer l'opération.`
  } else {
    recommandation = 'deconseille'
    recommandationTexte = `Le coût net des travaux est disproportionné par rapport au gain de rendement. Envisagez un DPE cible moins ambitieux ou renégociez fortement le prix d'achat.`
  }

  // ── Postes de travaux ────────────────────────────────────────────────────
  const postes = getPostes(p.dpeActuel, p.dpeCible, p.surface)

  return {
    postes,
    budgetLow,
    budgetMid,
    budgetHigh,
    budgetRetenu,
    aides,
    decotePct,
    decoteMontant,
    prixAchatAvecDecote,
    rendBrutAvant,
    rendBrutApres,
    rendNetApres,
    loyerApresRenovation: loyerApres,
    cashflowDeltaMensuel,
    amortissementTravauxAnnuel,
    economieImpotAnnuelle,
    dureeAmortissement,
    recoupementFiscal,
    bancaire,
    dateInterdictionLocation,
    urgence,
    recommandation,
    recommandationTexte,
  }
}
