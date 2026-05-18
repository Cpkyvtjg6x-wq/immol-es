// ─── Investment Calculator Types ───────────────────────────────────────────

export interface InvestmentParams {
  // Bien
  prixAchat: number
  surface: number
  ville: string
  quartier?: string
  typeBien?: string

  // Financement
  apport: number
  taux: number
  duree: number
  assuranceTaux: number
  loanType: 'amortissable' | 'in-fine'
  fraisNotaire: number
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
  vacance: number

  // Charges annuelles
  taxeFonciere: number
  chargesCopro: number
  assurancePno: number
  fraisGestionPct: number
  provisionPct: number
  fraisComptable: number
  gliPct: number
  cfe: number
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
    simulations: 3,
    aiInsights: false,
    export: false,
    comparaison: false,
    marketData: false,
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
