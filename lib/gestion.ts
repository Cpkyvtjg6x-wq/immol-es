// ─── IMMORA — Gestion locative : types + logique métier ───────────────────────
// Types alignés 1:1 sur les tables Supabase (migration 006) en snake_case pour
// éviter toute couche de mapping fragile. Toute la logique métier (révision IRL,
// génération d'échéancier, statut d'impayé, régularisation de charges, prépa
// déclaration) est ici, en fonctions pures et testables.

// ════════════════════════════════════════════════════════════════════════════
// TYPES (lignes DB)
// ════════════════════════════════════════════════════════════════════════════

export type StatutBien   = 'loue' | 'vacant' | 'travaux'
export type TypeBail     = 'nu' | 'meuble' | 'etudiant' | 'mobilite' | 'colocation' | 'commercial' | 'saisonnier'
export type StatutLoyer  = 'a_venir' | 'paye' | 'partiel' | 'retard'
export type StatutTravaux = 'a_faire' | 'devis' | 'en_cours' | 'termine'
export type Recurrence   = 'ponctuel' | 'mensuel' | 'trimestriel' | 'annuel'

export interface BienGestion {
  id: string
  user_id: string
  simulation_id: string | null
  label: string
  adresse: string | null
  ville: string | null
  code_postal: string | null
  type_bien: string
  surface: number | null
  prix_acquisition: number | null
  date_acquisition: string | null
  dpe: string | null
  statut: StatutBien
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Locataire {
  id: string
  user_id: string
  bien_id: string | null
  civilite: string | null
  nom: string
  prenom: string | null
  email: string | null
  telephone: string | null
  date_naissance: string | null
  garant_nom: string | null
  garant_type: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Bail {
  id: string
  user_id: string
  bien_id: string
  locataire_id: string | null
  type_bail: TypeBail
  date_debut: string
  duree_mois: number
  date_fin: string | null
  loyer_hc: number
  charges_provision: number
  depot_garantie: number
  jour_paiement: number
  irl_indice_base: number | null
  irl_trimestre: string | null
  date_revision: string | null
  encadrement_ref: number | null
  actif: boolean
  document_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Loyer {
  id: string
  user_id: string
  bien_id: string
  bail_id: string
  periode: string            // 'YYYY-MM-01'
  montant_loyer: number
  montant_charges: number
  montant_du: number
  montant_paye: number
  date_echeance: string | null
  date_paiement: string | null
  statut: StatutLoyer
  mode_paiement: string | null
  quittance_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Travail {
  id: string
  user_id: string
  bien_id: string
  titre: string
  categorie: string | null
  statut: StatutTravaux
  cout_estime: number
  cout_reel: number
  date_prevue: string | null
  date_realisee: string | null
  artisan: string | null
  deductible: boolean
  facture_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Charge {
  id: string
  user_id: string
  bien_id: string
  type: string
  libelle: string | null
  montant: number
  date: string
  recurrence: Recurrence
  deductible: boolean
  recuperable: boolean
  document_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DocumentGED {
  id: string
  user_id: string
  bien_id: string | null
  bail_id: string | null
  categorie: string
  nom: string
  url: string
  taille_octets: number | null
  mime: string | null
  created_at: string
}

// ════════════════════════════════════════════════════════════════════════════
// OPTIONS / LABELS (pour les <select> et les badges UI)
// ════════════════════════════════════════════════════════════════════════════

export const TYPE_BIEN_OPTIONS = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison',      label: 'Maison' },
  { value: 'studio',      label: 'Studio' },
  { value: 'immeuble',    label: 'Immeuble' },
  { value: 'local',       label: 'Local commercial' },
  { value: 'parking',     label: 'Parking / Box' },
  { value: 'terrain',     label: 'Terrain' },
] as const

export const TYPE_BAIL_OPTIONS: { value: TypeBail; label: string }[] = [
  { value: 'nu',          label: 'Location nue (3 ans)' },
  { value: 'meuble',      label: 'Meublé (1 an)' },
  { value: 'etudiant',    label: 'Étudiant meublé (9 mois)' },
  { value: 'mobilite',    label: 'Bail mobilité (1–10 mois)' },
  { value: 'colocation',  label: 'Colocation' },
  { value: 'commercial',  label: 'Commercial (3/6/9)' },
  { value: 'saisonnier',  label: 'Saisonnier' },
]

export const STATUT_BIEN_META: Record<StatutBien, { label: string; tone: 'emerald' | 'amber' | 'zinc' }> = {
  loue:    { label: 'Loué',      tone: 'emerald' },
  vacant:  { label: 'Vacant',    tone: 'amber' },
  travaux: { label: 'En travaux', tone: 'zinc' },
}

export const STATUT_LOYER_META: Record<StatutLoyer, { label: string; tone: 'emerald' | 'amber' | 'red' | 'zinc' }> = {
  paye:    { label: 'Payé',      tone: 'emerald' },
  partiel: { label: 'Partiel',   tone: 'amber' },
  retard:  { label: 'En retard', tone: 'red' },
  a_venir: { label: 'À venir',   tone: 'zinc' },
}

export const STATUT_TRAVAUX_META: Record<StatutTravaux, { label: string; tone: 'emerald' | 'amber' | 'indigo' | 'zinc' }> = {
  a_faire:  { label: 'À faire',   tone: 'zinc' },
  devis:    { label: 'Devis',     tone: 'indigo' },
  en_cours: { label: 'En cours',  tone: 'amber' },
  termine:  { label: 'Terminé',   tone: 'emerald' },
}

export const CATEGORIE_TRAVAUX_OPTIONS = [
  { value: 'cuisine',     label: 'Cuisine' },
  { value: 'sdb',         label: 'Salle de bain' },
  { value: 'peinture',    label: 'Peinture / Sols' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'plomberie',   label: 'Plomberie' },
  { value: 'menuiserie',  label: 'Menuiserie / Fenêtres' },
  { value: 'isolation',   label: 'Isolation / Énergie' },
  { value: 'toiture',     label: 'Toiture / Façade' },
  { value: 'autre',       label: 'Autre' },
] as const

export const TYPE_CHARGE_OPTIONS = [
  { value: 'taxe_fonciere',      label: 'Taxe foncière',          deductible: true,  recuperable: false },
  { value: 'copro',              label: 'Charges de copropriété', deductible: true,  recuperable: true  },
  { value: 'assurance_pno',      label: 'Assurance PNO',          deductible: true,  recuperable: false },
  { value: 'interets_emprunt',   label: "Intérêts d'emprunt",     deductible: true,  recuperable: false },
  { value: 'assurance_emprunt',  label: 'Assurance emprunteur',   deductible: true,  recuperable: false },
  { value: 'gestion',            label: 'Frais de gestion / GLI', deductible: true,  recuperable: false },
  { value: 'comptable',          label: 'Comptable',              deductible: true,  recuperable: false },
  { value: 'cfe',                label: 'CFE',                    deductible: true,  recuperable: false },
  { value: 'entretien',          label: 'Entretien / Réparation', deductible: true,  recuperable: false },
  { value: 'autre',              label: 'Autre',                  deductible: true,  recuperable: false },
] as const

export const CATEGORIE_DOC_OPTIONS = [
  { value: 'bail',        label: 'Bail' },
  { value: 'quittance',   label: 'Quittance' },
  { value: 'etat_lieux',  label: 'État des lieux' },
  { value: 'dpe',         label: 'DPE' },
  { value: 'diagnostic',  label: 'Diagnostic' },
  { value: 'assurance',   label: 'Assurance' },
  { value: 'facture',     label: 'Facture' },
  { value: 'avis_taxe',   label: 'Avis taxe foncière' },
  { value: 'autre',       label: 'Autre' },
] as const

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DATE (manipulation sûre de chaînes 'YYYY-MM-DD', sans piège de fuseau)
// ════════════════════════════════════════════════════════════════════════════

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(n: number): string { return String(n).padStart(2, '0') }

export function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m || 1, d: d || 1 }
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate()
}

/** Premier jour du mois d'une date ISO → 'YYYY-MM-01' */
export function firstOfMonth(iso: string): string {
  const { y, m } = parseISO(iso)
  return `${y}-${pad(m)}-01`
}

/** Ajoute n mois à une date ISO (jour conservé puis borné au dernier jour du mois) */
export function addMonthsISO(iso: string, n: number): string {
  const { y, m, d } = parseISO(iso)
  const total = (y * 12 + (m - 1)) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const nd = Math.min(d, daysInMonth(ny, nm))
  return `${ny}-${pad(nm)}-${pad(nd)}`
}

/** Échéance d'un mois (period 'YYYY-MM-01') au jour de paiement, borné au mois */
export function echeanceDuMois(periodeISO: string, jourPaiement: number): string {
  const { y, m } = parseISO(periodeISO)
  const jour = Math.min(Math.max(1, jourPaiement || 1), daysInMonth(y, m))
  return `${y}-${pad(m)}-${pad(jour)}`
}

/** Compare deux dates ISO. -1 si a<b, 0 si égal, 1 si a>b */
export function cmpISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function moisLabel(periodeISO: string): string {
  const { y, m } = parseISO(periodeISO)
  const mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
  return `${mois[(m - 1) % 12]} ${y}`
}

// ════════════════════════════════════════════════════════════════════════════
// FORMATAGE
// ════════════════════════════════════════════════════════════════════════════

export function formatEuro(n: number, decimals = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0)
}

export function formatDateFR(iso: string | null): string {
  if (!iso) return '—'
  const { y, m, d } = parseISO(iso)
  return `${pad(d)}/${pad(m)}/${y}`
}

// ════════════════════════════════════════════════════════════════════════════
// RÉVISION IRL — formule légale officielle
//   Nouveau loyer = Loyer en cours × (nouvel IRL ÷ IRL de référence du bail)
// ════════════════════════════════════════════════════════════════════════════

export interface RevisionIRL {
  nouveauLoyer: number
  augmentationMensuelle: number
  augmentationPct: number
  plafonnee: boolean    // info : la révision suit l'IRL, jamais au-delà
}

export function calculerRevisionIRL(loyerHC: number, irlBase: number, irlNouveau: number): RevisionIRL | null {
  if (!loyerHC || !irlBase || !irlNouveau || irlBase <= 0) return null
  const brut = (loyerHC * irlNouveau) / irlBase
  const nouveauLoyer = Math.round(brut * 100) / 100
  const augmentationMensuelle = Math.round((nouveauLoyer - loyerHC) * 100) / 100
  const augmentationPct = Math.round(((irlNouveau / irlBase - 1) * 100) * 100) / 100
  return { nouveauLoyer, augmentationMensuelle, augmentationPct, plafonnee: true }
}

// ════════════════════════════════════════════════════════════════════════════
// ÉCHÉANCIER — génère les quittances mensuelles d'un bail entre deux dates
// ════════════════════════════════════════════════════════════════════════════

export interface EcheanceDraft {
  periode: string         // 'YYYY-MM-01'
  montant_loyer: number
  montant_charges: number
  montant_du: number
  date_echeance: string
  prorata: boolean        // true = 1er mois au prorata des jours
}

/**
 * Génère les échéances mensuelles d'un bail depuis `debut` jusqu'à `fin` (inclus).
 * Le 1er mois est mis au prorata si le bail démarre après le 1er du mois.
 * `existantes` = périodes déjà en base, ignorées (anti-doublon).
 */
export function genererEcheances(
  bail: Pick<Bail, 'date_debut' | 'loyer_hc' | 'charges_provision' | 'jour_paiement'>,
  finISO: string,
  existantes: string[] = [],
  prorataPremierMois = true,
): EcheanceDraft[] {
  const out: EcheanceDraft[] = []
  const dejaLa = new Set(existantes.map(firstOfMonth))
  let cur = firstOfMonth(bail.date_debut)
  const finMois = firstOfMonth(finISO)
  let first = true
  let guard = 0

  while (cmpISO(cur, finMois) <= 0 && guard < 600) {
    guard++
    if (!dejaLa.has(cur)) {
      let loyer = round2(bail.loyer_hc)
      let charges = round2(bail.charges_provision)
      let prorata = false
      const { d: jourDebut } = parseISO(bail.date_debut)
      if (first && prorataPremierMois && jourDebut > 1) {
        const { y, m } = parseISO(cur)
        const dim = daysInMonth(y, m)
        const coef = (dim - jourDebut + 1) / dim
        loyer = round2(bail.loyer_hc * coef)
        charges = round2(bail.charges_provision * coef)
        prorata = true
      }
      out.push({
        periode: cur,
        montant_loyer: loyer,
        montant_charges: charges,
        montant_du: round2(loyer + charges),
        date_echeance: echeanceDuMois(cur, bail.jour_paiement),
        prorata,
      })
    }
    first = false
    cur = firstOfMonth(addMonthsISO(cur, 1))
  }
  return out
}

function round2(n: number): number { return Math.round((n || 0) * 100) / 100 }

// ════════════════════════════════════════════════════════════════════════════
// STATUT D'UN LOYER — calculé depuis montant payé + échéance vs aujourd'hui
// ════════════════════════════════════════════════════════════════════════════

export function statutLoyer(
  montantDu: number,
  montantPaye: number,
  dateEcheance: string | null,
  today = todayISO(),
): StatutLoyer {
  const du = round2(montantDu)
  const paye = round2(montantPaye)
  if (paye >= du - 0.01 && du > 0) return 'paye'
  const enRetard = !!dateEcheance && cmpISO(today, dateEcheance) > 0
  if (enRetard && paye < du) return 'retard'
  if (paye > 0) return 'partiel'
  return 'a_venir'
}

export function resteADu(l: Pick<Loyer, 'montant_du' | 'montant_paye'>): number {
  return Math.max(0, round2(l.montant_du - l.montant_paye))
}

// ════════════════════════════════════════════════════════════════════════════
// RÉGULARISATION DES CHARGES — provisions encaissées vs charges réelles
// ════════════════════════════════════════════════════════════════════════════

export interface Regularisation {
  provisions: number
  reelles: number
  solde: number                       // provisions - réelles
  sens: 'remboursement' | 'complement' | 'equilibre'
  message: string
}

export function regulariserCharges(provisionsEncaissees: number, chargesReellesRecuperables: number): Regularisation {
  const provisions = round2(provisionsEncaissees)
  const reelles = round2(chargesReellesRecuperables)
  const solde = round2(provisions - reelles)
  if (Math.abs(solde) < 0.5) {
    return { provisions, reelles, solde: 0, sens: 'equilibre', message: 'Provisions équilibrées, aucun ajustement.' }
  }
  if (solde > 0) {
    return { provisions, reelles, solde, sens: 'remboursement', message: `${formatEuro(solde)} à rembourser au locataire.` }
  }
  return { provisions, reelles, solde, sens: 'complement', message: `${formatEuro(-solde)} de complément à demander au locataire.` }
}

// ════════════════════════════════════════════════════════════════════════════
// PRÉPA DÉCLARATION — bilan revenus fonciers (nu) / synthèse charges
//   2044 (location nue) : recettes − charges déductibles = résultat foncier.
//   Comparaison micro-foncier (abattement 30 %, plafond 15 000 € de recettes).
// ════════════════════════════════════════════════════════════════════════════

export interface BilanFiscal {
  annee: number
  recettes: number              // loyers HC encaissés sur l'année
  chargesParType: { type: string; label: string; montant: number }[]
  totalDeductible: number
  travauxDeductibles: number
  resultatReel: number          // recettes - (charges + travaux)
  microFoncierEligible: boolean
  resultatMicro: number         // recettes × 0,70 (abattement 30 %)
  regimeConseille: 'reel' | 'micro-foncier'
}

export function bilanFoncier(
  annee: number,
  loyersAnnee: Loyer[],
  chargesAnnee: Charge[],
  travauxAnnee: Travail[],
): BilanFiscal {
  // Recettes = loyers HC réellement encaissés (montant payé, part loyer)
  const recettes = round2(
    loyersAnnee.reduce((s, l) => {
      const partLoyer = l.montant_du > 0 ? l.montant_loyer / l.montant_du : 1
      return s + l.montant_paye * partLoyer
    }, 0)
  )

  const deductibles = chargesAnnee.filter(c => c.deductible)
  const byType = new Map<string, number>()
  for (const c of deductibles) byType.set(c.type, round2((byType.get(c.type) || 0) + c.montant))
  const chargesParType: { type: string; label: string; montant: number }[] = []
  byType.forEach((montant, type) => {
    chargesParType.push({ type, label: TYPE_CHARGE_OPTIONS.find(o => o.value === type)?.label ?? type, montant })
  })
  chargesParType.sort((a, b) => b.montant - a.montant)

  const totalCharges = round2(deductibles.reduce((s, c) => s + c.montant, 0))
  const travauxDeductibles = round2(
    travauxAnnee.filter(t => t.deductible).reduce((s, t) => s + (t.cout_reel || 0), 0)
  )
  const totalDeductible = round2(totalCharges + travauxDeductibles)
  const resultatReel = round2(recettes - totalDeductible)

  const microFoncierEligible = recettes <= 15000
  const resultatMicro = round2(recettes * 0.7)
  // Au régime réel on est gagnant si le résultat imposable est plus bas
  const regimeConseille: 'reel' | 'micro-foncier' =
    microFoncierEligible && resultatMicro < resultatReel ? 'micro-foncier' : 'reel'

  return {
    annee,
    recettes,
    chargesParType,
    totalDeductible,
    travauxDeductibles,
    resultatReel,
    microFoncierEligible,
    resultatMicro,
    regimeConseille,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ALERTES & AGRÉGATS DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

export interface Alerte {
  kind: 'impaye' | 'revision_irl' | 'fin_bail' | 'regularisation'
  severity: 'high' | 'medium'
  bienId: string
  message: string
}

export function construireAlertes(
  biens: BienGestion[],
  baux: Bail[],
  loyers: Loyer[],
  today = todayISO(),
): Alerte[] {
  const out: Alerte[] = []
  const labelBien = (id: string) => biens.find(b => b.id === id)?.label ?? 'Bien'

  // Impayés (retard ou partiel échu)
  for (const l of loyers) {
    const st = statutLoyer(l.montant_du, l.montant_paye, l.date_echeance, today)
    if (st === 'retard') {
      out.push({
        kind: 'impaye', severity: 'high', bienId: l.bien_id,
        message: `Loyer ${moisLabel(l.periode)} en retard — ${formatEuro(resteADu(l))} dû sur « ${labelBien(l.bien_id)} ».`,
      })
    }
  }

  // Révision IRL due + fin de bail proche
  for (const b of baux) {
    if (!b.actif) continue
    if (b.date_revision && cmpISO(today, b.date_revision) >= 0) {
      out.push({
        kind: 'revision_irl', severity: 'medium', bienId: b.bien_id,
        message: `Révision IRL possible sur « ${labelBien(b.bien_id)} » (échéance ${formatDateFR(b.date_revision)}).`,
      })
    }
    if (b.date_fin) {
      const dansTroisMois = addMonthsISO(today, 3)
      if (cmpISO(b.date_fin, dansTroisMois) <= 0 && cmpISO(b.date_fin, today) >= 0) {
        out.push({
          kind: 'fin_bail', severity: 'medium', bienId: b.bien_id,
          message: `Fin de bail proche sur « ${labelBien(b.bien_id)} » (${formatDateFR(b.date_fin)}).`,
        })
      }
    }
  }
  return out
}

export interface SyntheseGestion {
  nbBiens: number
  nbLoues: number
  tauxOccupation: number          // %
  loyersDuMois: number            // total dû du mois courant
  encaisseDuMois: number          // total payé du mois courant
  impayesTotal: number            // reste dû sur lignes en retard/partiel
  nbImpayes: number
  revenusAnnee: number            // loyers payés sur l'année courante
}

export function synthese(biens: BienGestion[], loyers: Loyer[], today = todayISO()): SyntheseGestion {
  const nbBiens = biens.length
  const nbLoues = biens.filter(b => b.statut === 'loue').length
  const moisCourant = firstOfMonth(today)
  const anneeCourante = parseISO(today).y

  const duMois = loyers.filter(l => firstOfMonth(l.periode) === moisCourant)
  const loyersDuMois = round2(duMois.reduce((s, l) => s + l.montant_du, 0))
  const encaisseDuMois = round2(duMois.reduce((s, l) => s + l.montant_paye, 0))

  let impayesTotal = 0
  let nbImpayes = 0
  for (const l of loyers) {
    const st = statutLoyer(l.montant_du, l.montant_paye, l.date_echeance, today)
    if (st === 'retard') { impayesTotal += resteADu(l); nbImpayes++ }
  }

  const revenusAnnee = round2(
    loyers.filter(l => parseISO(l.periode).y === anneeCourante).reduce((s, l) => s + l.montant_paye, 0)
  )

  return {
    nbBiens,
    nbLoues,
    tauxOccupation: nbBiens > 0 ? Math.round((nbLoues / nbBiens) * 100) : 0,
    loyersDuMois,
    encaisseDuMois,
    impayesTotal: round2(impayesTotal),
    nbImpayes,
    revenusAnnee,
  }
}
