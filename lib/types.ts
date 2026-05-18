// ─── Investment Calculator Types ───────────────────────────────────────────

export interface InvestmentParams {
  // Bien
  prixAchat: number
  surface: number
  ville: string
  quartier?: string
  typeBien: string
  etat: 'ancien' | 'neuf'
  dpe: string

  // Financement
  apport: number
  taux: number
  duree: number
  assuranceTaux: number
  loanType: 'amortissable' | 'in-fine'
  fraisNotaire: number
  fraisNotaireAuto: boolean   // true = calculé automatiquement
  travaux: number

  // Frais bancaires
  fraisGarantiePct: number
  fraisDossier: number

  // PTZ
  ptzEnabled: boolean
  ptzMontant: number
  ptzTaux: number
  ptzDuree: number

  // Location
  locType: 'nu' | 'meuble' | 'coloc' | 'saisonnier'
  loyerNu: number
  loyerMeuble: number
  chargesRecuperables: number  // charges récupérables sur locataire (nu)
  nbChambres: number           // pour colocation
  loyerParChambre: number      // pour colocation
  vacance: number              // mois de vacance par an
  irl: number                  // revalorisation loyer annuelle (%)

  // Charges annuelles
  taxeFonciere: number
  chargesCopro: number
  assurancePno: number
  fraisGestionPct: number
  provisionPct: number
  fraisComptable: number
  gliPct: number
  cfe: number

  // Fiscalité
  tmi: number                  // Tranche marginale d'imposition (%)
  revenusProAnnuels: number    // Revenus pro du foyer (pour impact fiscal global)
  lmpEnabled: boolean          // Loueur Meublé Professionnel
  sciIS: boolean               // SCI à l'IS
  sarlFamille: boolean         // SARL de famille

  // Structure juridique (détermine les régimes affichés)
  structure: 'nom-propre' | 'sci-ir' | 'sci-is' | 'sarl-famille'
  profilFis: 'nouveau' | 'confirme'  // Mode expert pour amort. par composants

  // Amortissement LMNP par composants (mode expert)
  amortGrosOeuvrePct: number   // % gros œuvre (défaut 50%)
  amortGrosOeuvreAns: number   // durée (défaut 50 ans)
  amortFacadePct: number       // % façade (défaut 10%)
  amortFacadeAns: number       // durée (défaut 30 ans)
  amortToiturePct: number      // % toiture (défaut 10%)
  amortToitureAns: number      // durée (défaut 25 ans)
  amortInstallationsPct: number // % installations (défaut 15%)
  amortInstallationsAns: number // durée (défaut 15 ans)
  amortAgencementsPct: number  // % agencements (défaut 15%)
  amortAgencementsAns: number  // durée (défaut 10 ans)
  amortTravauxAns: number      // durée amort. travaux (défaut 10 ans)

  // Revente & projection
  horizonRevente: number       // Horizon de revente en années
  valorisationAnnuelle: number // Appréciation annuelle du bien (%)
}

export interface InvestmentResult {
  // Identité
  ville: string

  // Prix de revient
  prixRevient: number
  montantEmprunte: number

  // Mensualités
  mensualiteTotale: number
  mensualiteCredit: number
  mensualitePtz: number

  // Coûts
  coutCredit: number
  fraisBancairesTotal: number

  // Charges
  totalCharges: number
  chargesAnnuelles: number    // alias of totalCharges
  fraisGestionAnnuel: number
  provisionAnnuelle: number
  gliAnnuel: number
  cfe: number

  // Revenus
  revAnnuel: number
  loyerAnnuelBrut: number     // loyer * 12 (plein)
  loyerAnnuelNet: number      // revAnnuel (avec vacance)
  loyer: number
  moisLoues: number
  vacanceAnnuelle: number     // loyer * vacance mois

  // Rendements
  rendBrut: number
  rendNet: number
  rendementBrut: number       // alias rendBrut
  rendementNet: number        // alias rendNet

  // Cashflow
  cashflowMensuel: number
  cashflowAnnuel: number
  effortEpargne: number       // max(0, -cashflowMensuel)
  roiApport: number
  pointMort: number

  // Revente & TRI
  prixRevente: number
  plusValueBrute: number
  abattementPVIR: number       // abattement IR sur plus-value (%)
  abattementPVPS: number       // abattement PS sur plus-value (%)
  impotPlusValue: number
  patrimoineNetRevente: number
  tri: number                  // Taux de Rendement Interne (%)

  // Tableaux (optionnel — générés à la demande)
  tableauAmortissement?: AmortizationRow[]
  projection?: ProjectionRow[]
}

// ─── Fiscal Types ───────────────────────────────────────────────────────────

export interface FiscalParams {
  tmi: number
  prixAchat: number
  travaux: number
  prixRevient: number
  locType: 'nu' | 'meuble' | 'coloc' | 'saisonnier'
  lmpEnabled?: boolean
  sciIS?: boolean
  sarlFamille?: boolean
  structure?: 'nom-propre' | 'sci-ir' | 'sci-is' | 'sarl-famille'
  profilFis?: 'nouveau' | 'confirme'
  // Amort composants (mode expert)
  amortGrosOeuvrePct?: number; amortGrosOeuvreAns?: number
  amortFacadePct?: number; amortFacadeAns?: number
  amortToiturePct?: number; amortToitureAns?: number
  amortInstallationsPct?: number; amortInstallationsAns?: number
  amortAgencementsPct?: number; amortAgencementsAns?: number
  amortTravauxAns?: number
}

export interface FiscalRegime {
  id: string
  name: string
  shortName: string
  category: 'foncier' | 'bic' | 'is' | 'societe'
  revImposable: number
  impot: number
  ps: number
  totalFiscal: number
  net: number
  cfNet: number
  rendNetNet: number
  disabled: boolean
  disabledReason?: string
  tag?: string
}

export interface FiscalResult {
  regimes: FiscalRegime[]
  actifs: FiscalRegime[]
  best: FiscalRegime
  rendNetNet: number
  cfNet: number
  name: string
}

// ─── Score Types ─────────────────────────────────────────────────────────────

export interface ScoreDetail {
  label: string
  pts: number
  max: number
  good: boolean
}

export interface ScoreResult {
  global: number          // 0–100
  label: string
  color: 'emerald' | 'amber' | 'red'
  summary: string
  details: ScoreDetail[]
  subScores: {
    rentabilite: number   // 0–100
    cashflow: number      // 0–100
    fiscalite: number     // 0–100
    marche: number        // 0–100
  }
}

// ─── Market Types ─────────────────────────────────────────────────────────────

export interface MarketData {
  region: string
  prixM2: number
  loyerM2: number
  tensionLoc: number
  attractRevente: number
  dynEco: number
  score: string
  scoreClass: string
  insight: string
  conseils: string
  quartiers?: QuartierData[]
}

export interface QuartierData {
  name: string
  prixM2: number
  loyerM2: number
  dyn: string
  score: string
  insight: string
}

// ─── AI Types ─────────────────────────────────────────────────────────────────

export interface AIInsight {
  type: 'opportunity' | 'risk' | 'optimization' | 'market'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact?: string
}

// ─── Amortization / Projection ────────────────────────────────────────────────

export interface AmortizationRow {
  mois: number
  annee: number
  capitalRestant: number
  interetsPaies: number
  capitalRembourse: number
  mensualite: number
}

export interface ProjectionRow {
  annee: number
  valeurBien: number
  capitalRestant: number
  patrimoine: number
  cashflowCumule: number
}

// ─── Simulation Types ─────────────────────────────────────────────────────────

export interface SimulationRecord {
  id: string
  user_id: string
  name: string
  params: InvestmentParams
  results?: {
    investment: InvestmentResult
    fiscal?: FiscalResult
    score: ScoreResult
  }
  score?: number
  created_at: string
  updated_at: string
}

// ─── User / Auth Types ─────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'business'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: SubscriptionTier
  stripe_customer_id?: string
  created_at: string
}

export interface SubscriptionLimits {
  simulations: number
  aiInsights: boolean
  export: boolean
  comparaison: boolean
  marketData: boolean
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    // OWNER MODE — toutes les fonctionnalités déverrouillées pour les tests
    simulations: Infinity,
    aiInsights: true,
    export: true,
    comparaison: true,
    marketData: true,
  },
  pro: {
    simulations: 50,
    aiInsights: true,
    export: true,
    comparaison: true,
    marketData: true,
  },
  business: {
    simulations: Infinity,
    aiInsights: true,
    export: true,
    comparaison: true,
    marketData: true,
  },
}
