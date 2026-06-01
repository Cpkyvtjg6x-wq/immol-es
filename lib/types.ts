// ─── Investment Calculator Types ───────────────────────────────────────────

/** Un groupe de lots homogènes dans un immeuble de rapport */
export interface LotGroup {
  id: string
  label: string            // ex: "T2 meublé", "Studio", "T3 nu"
  nb: number               // nombre de lots dans ce groupe
  regime: 'nu' | 'meuble' | 'vendre'
  loyer: number            // €/mois par lot (si loué)
  vacance: number          // mois de vacance par lot / an (si loué)
  prixVente: number        // €/lot (si à vendre)
}

export interface InvestmentParams {
  // Bien
  prixAchat: number
  surface: number
  ville: string
  adresse?: string       // adresse complète saisie (ex: "12 rue de la Paix, Paris")
  quartier?: string      // quartier ou zone (ex: "Batignolles", "Part-Dieu")
  lat?: number           // latitude GPS (BAN)
  lng?: number           // longitude GPS (BAN)
  codeInsee?: string     // code INSEE commune (BAN)
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
  locType: 'nu' | 'meuble' | 'coloc' | 'saisonnier' | 'immeuble'
  loyerNu: number
  loyerMeuble: number
  chargesRecuperables: number  // charges récupérables sur locataire (nu)
  nbChambres: number           // pour colocation
  loyerParChambre: number      // pour colocation
  vacance: number              // mois de vacance par an
  irl: number                  // revalorisation loyer annuelle (%)

  // Location saisonnière (Airbnb / Booking)
  prixNuit: number             // prix moyen par nuit (€)
  tauxOccupation: number       // taux d'occupation annuel (0–100 %)
  dureeSejourMoyen: number     // durée moyenne d'un séjour (nuits) — pour calcul rotations
  commissionPlateforme: number // % commission plateforme (Airbnb 3%, Booking 15%)
  fraisMenageParRotation: number // €/rotation (entrée-sortie)
  fraisConciergerie: number    // €/mois (gestion clés, check-in, urgences)
  fournituresConsommables: number // €/mois (linge, produits, accueil)
  electriciteEau: number       // €/mois (charges énergie à la charge du propriétaire)
  taxeSejour: number           // €/nuit/personne (collectée pour la mairie)
  nbPersonnesMax: number       // capacité du logement (pour taxe de séjour)

  // Immeuble de rapport
  nbLots: number               // nombre de logements (legacy — utilisé si lotGroups vide)
  loyerParLot: number          // loyer mensuel moyen par lot (legacy)
  vacanceParLot: number        // mois de vacance par lot par an (legacy)
  entretienPartiesCommunes: number // €/an (hall, cage escalier, toiture, façade)
  assuranceImmeuble: number    // €/an (multirisque immeuble)
  lotGroups: LotGroup[]        // configuration détaillée par groupe de lots

  // Stratégie d'utilisation des produits de cession (lots "à vendre")
  venteStrategy: 'reinject' | 'garder' | 'partiel'
  venteReinjectPct: number     // % réinjecté dans le crédit (si strategy = 'partiel')

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

  // Immeuble — synthèse lots
  venteProduits?: number        // produit total des lots "à vendre" (€)
  reinjectAmount?: number       // montant effectivement réinjecté dans le crédit
  montantEmprunted?: number     // montant emprunté avant réinjection (pour affichage delta)
  nbLotsLoues?: number          // nombre de lots loués
  nbLotsVendre?: number         // nombre de lots à vendre

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
  locType: 'nu' | 'meuble' | 'coloc' | 'saisonnier' | 'immeuble'
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

// ─── Local Market Analysis (DVF + BAN) ────────────────────────────────────────

export interface LocalMarketData {
  // Source & périmètre
  source: 'dvf' | 'reference' | 'mixed'
  adresse?: string
  quartier?: string
  ville: string
  lat?: number
  lng?: number
  radiusM: number          // rayon utilisé pour DVF (m)
  nbTransactions: number   // nb de mutations dans le rayon

  // Prix d'achat (transactions réelles DVF)
  prixM2Median: number     // €/m² médian — périmètre proche
  prixM2Min: number
  prixM2Max: number
  prixM2Ville: number      // €/m² médian — ville entière (comparatif)
  evolution12m?: number    // % d'évolution sur 12 mois (si données suffisantes)
  evolution24m?: number

  // Loyer estimé (basé sur le rendement brut typique de la zone)
  loyerEstimeM2: number    // €/m²/mois
  loyerEstimeTotal: number // €/mois pour la surface du bien
  loyerFourchetteBas: number
  loyerFourchettHaut: number

  // Positionnement du bien
  positionPrix: 'sous-marche' | 'dans-marche' | 'sur-marche' | 'inconnu'
  ecartPrixMarche: number  // % d'écart vs médian local (+ = trop cher, - = bonne affaire)

  // Tension locative & liquidité
  tensionLocative: 'faible' | 'normale' | 'forte' | 'tres-forte'
  tensionScore: number     // 0-100
  liquidite: 'faible' | 'normale' | 'forte'  // basé sur nb transactions

  // Rendement brut moyen du marché
  rendBrutMarche: number   // % rendement brut médian local (loyer/prix)

  // Prix max recommandé pour atteindre un rendement cible (5% net)
  prixMaxRecommande: number
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

// ─── Bank Report Types ────────────────────────────────────────────────────────

/** Données profil emprunteur à saisir (non disponibles dans le calculateur) */
export interface BankReportProfile {
  // Identité
  nomPrenom: string
  dateNaissance?: string           // "AAAA-MM-JJ" — pour l'âge en fin de prêt
  situationFamiliale: 'celibataire' | 'marie' | 'pacse' | 'divorce' | 'veuf'
  nbParts: number                  // parts fiscales du foyer
  nbEnfants: number

  // Garantie du prêt
  typeGarantie?: 'caution' | 'hypotheque' | 'ppd'

  // Situation professionnelle
  profession: string
  typeContrat: 'cdi' | 'cdd' | 'independant' | 'fonctionnaire' | 'retraite' | 'autre'
  anciennetePoste: number          // années

  // Co-emprunteur (optionnel)
  hasCoEmprunteur?: boolean
  coemprunteurNom?: string
  coemprunteurProfession?: string
  coemprunteurTypeContrat?: 'cdi' | 'cdd' | 'independant' | 'fonctionnaire' | 'retraite' | 'autre'
  coemprunteurAnciennete?: number
  coemprunteurRevenus?: number     // revenus nets mensuels du co-emprunteur

  // Revenus mensuels nets du foyer
  revenusNetsProFoyer: number      // salaires + indemnités emprunteur principal
  autresRevenusLocatifs: number    // loyers perçus sur d'autres biens (optionnel)

  // Charges mensuelles actuelles
  loyerActuel: number              // loyer ou mensualité RP actuelle
  autresCreditsMensualites: number // autres crédits en cours (auto, conso…)

  // Patrimoine
  epargneTotale: number            // épargne totale disponible (pas juste l'apport)

  // Structure juridique (reprend/affine params.structure)
  modeAcquisition: 'nom-propre' | 'sci-ir' | 'sci-is' | 'sarl-famille' | 'holding-sci'

  // Société (si applicable)
  nomSociete?: string
  siren?: string
  dateCreationSociete?: string     // "MM/AAAA"
  associes?: { nom: string; partsPct: number }[]
  capitalSocial?: number

  // Bien immobilier — informations qualitatives
  adresseBien?: string
  descriptionQuartier?: string
  sourceEstimationLoyer?: string   // "Agent immobilier", "Leboncoin", "PAP"…
}

/** Ratios bancaires calculés automatiquement */
export interface BankRatios {
  // Méthode de calcul retenue pour le taux d'endettement
  methode: 'globale' | 'differentielle'

  // Taux d'endettement
  tauxEndettementAvant: number     // % avant le projet
  tauxEndettementApres: number     // % après le projet
  limiteHCSF: number               // 35% règle HCSF

  // Couverture
  tauxCouverture: number           // loyer / mensualité × 100
  loyerIntegreBanque: number       // loyer × 70% (méthode bancaire standard)

  // Reste à vivre
  resteAVivre: number              // €/mois après toutes charges
  resteAVivreCible: number         // objectif cible (800–1200€ selon profil)

  // Effort d'épargne mensuel (ex « saut de charges »)
  sautCharges: number              // mensualité − loyer pondéré 70 %

  // Capacité d'emprunt (règle des 35 %)
  capaciteEmprunt: {
    mensualiteMax: number          // mensualité max pour ce prêt à 35 %
    margeMensuelle: number         // marge restante vs mensualité réelle
    capitalMax: number             // capital empruntable max (indicatif)
  }

  // Apport & frais
  apportPct: number                // apport / coût total ×100
  fraisAcquisition: number         // notaire + garantie + dossier
  apportCouvreFrais: boolean

  // Coût du crédit (TAEG indicatif & usure)
  taeg: number                     // TAEG indicatif (taux + assurance + frais)
  tauxUsureRef: number             // taux d'usure de référence (indicatif)
  usureOk: boolean

  // Âge & durée
  ageFinPret: number | null        // âge de l'emprunteur en fin de prêt
  ageAssuranceOk: boolean | null   // ≤ 80 ans en fin de prêt
  dureeMax: number                 // plafond HCSF (25 ou 27 ans)
  dureeHcsfOk: boolean

  // Sécurité financière
  epargnePrecautionMois: number    // épargne résiduelle / mensualité

  // Garantie
  typeGarantieLabel: string
  coutGarantie: number

  // Stress tests
  stressTaux1Pct: {
    nouvelleMensualite: number
    deltaVsMensualiteBase: number
    nouveauCashflow: number
    tauxEndettement: number
  }
  stressLoyer10Pct: {
    nouveauLoyer: number
    nouveauCashflow: number
    tauxCouverture: number
  }
  stressVacance2Mois: {
    perteLoyersAnnuelle: number
    nouveauCashflowMensuelMoyen: number
  }

  // Synthèse
  pointsForts: string[]
  pointsVigilance: string[]
  recommandationBanquier: string
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
  exportPdf: boolean
  exportExcel: boolean
  bankReport: boolean
  comparaison: boolean
  patrimoine: boolean
  marketDataFull: boolean
  whiteLabel: boolean
  comparaisonMax: number
  gestionLocative: boolean
}

/**
 * Source de verite unique pour le gating Free / Pro / Agence.
 * Consommee par `useEntitlements()` cote client et par les routes API serveur.
 */
export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    simulations: 3,
    aiInsights: false,
    exportPdf: false,
    exportExcel: false,
    bankReport: false,
    comparaison: false,
    patrimoine: false,
    marketDataFull: false,
    whiteLabel: false,
    comparaisonMax: 0,
    gestionLocative: false,
  },
  pro: {
    simulations: Infinity,
    aiInsights: true,
    exportPdf: true,
    exportExcel: true,
    bankReport: true,
    comparaison: true,
    patrimoine: true,
    marketDataFull: true,
    whiteLabel: false,
    comparaisonMax: 5,
    gestionLocative: true,
  },
  business: {
    simulations: Infinity,
    aiInsights: true,
    exportPdf: true,
    exportExcel: true,
    bankReport: true,
    comparaison: true,
    patrimoine: true,
    marketDataFull: true,
    whiteLabel: true,
    comparaisonMax: Infinity,
    gestionLocative: true,
  },
}

/**
 * Bypass dev (jamais active en prod) — permet de tester en Free
 * sans bloquer le developpement local. Mettre NEXT_PUBLIC_BYPASS_LIMITS=true.
 */
export const ENTITLEMENT_BYPASS =
  process.env.NEXT_PUBLIC_BYPASS_LIMITS === 'true'
