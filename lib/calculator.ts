import type { InvestmentParams, InvestmentResult, AmortizationRow, ProjectionRow } from './types'

/**
 * Core investment calculator — ported + extended from the original HTML/JS calculator.
 * All amounts in euros, percentages as plain numbers (e.g. 3.5 for 3.5%).
 */
export function calculateInvestment(params: InvestmentParams): InvestmentResult {

  // ─── Prix de revient ────────────────────────────────────────────────────────
  const prixRevient = params.prixAchat + params.fraisNotaire + params.travaux

  // ─── Pré-calcul venteProduits (immeuble) — doit précéder montantEmprunte ───
  // On calcule ici pour pouvoir appliquer la réinjection sur le crédit
  let venteProduitsPreCalc = 0
  if (params.locType === 'immeuble') {
    const vGroups = (params.lotGroups ?? []).filter(g => g.nb > 0 && g.regime === 'vendre')
    venteProduitsPreCalc = vGroups.reduce((s, g) => s + g.prixVente * g.nb, 0)
  }

  // Montant réinjecté dans le crédit selon la stratégie choisie
  const reinjectAmount = (() => {
    if (params.locType !== 'immeuble' || venteProduitsPreCalc <= 0) return 0
    const strat = params.venteStrategy ?? 'garder'
    if (strat === 'reinject') return venteProduitsPreCalc
    if (strat === 'partiel') return venteProduitsPreCalc * (params.venteReinjectPct ?? 50) / 100
    return 0
  })()

  // ─── PTZ mensualité ─────────────────────────────────────────────────────────
  let mensualitePtz = 0
  if (params.ptzEnabled && params.ptzMontant > 0) {
    if (params.ptzTaux > 0) {
      const r = params.ptzTaux / 100 / 12
      const n = params.ptzDuree * 12
      mensualitePtz = (params.ptzMontant * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    } else {
      mensualitePtz = params.ptzMontant / (params.ptzDuree * 12)
    }
  }

  // ─── Montant emprunté (avec réinjection éventuelle) ─────────────────────────
  const montantEmprunted = Math.max(
    0,
    prixRevient - params.apport - (params.ptzEnabled ? params.ptzMontant : 0)
  )
  const montantEmprunte = Math.max(0, montantEmprunted - reinjectAmount)

  const tauxMensuel = params.taux / 100 / 12
  const nbMensualites = params.duree * 12

  // ─── Mensualité crédit ──────────────────────────────────────────────────────
  let mensualiteCredit = 0
  if (montantEmprunte > 0 && params.taux > 0) {
    if (params.loanType === 'in-fine') {
      mensualiteCredit = montantEmprunte * (params.taux / 100 / 12)
    } else {
      mensualiteCredit =
        (montantEmprunte * tauxMensuel * Math.pow(1 + tauxMensuel, nbMensualites)) /
        (Math.pow(1 + tauxMensuel, nbMensualites) - 1)
    }
  }

  // ─── Assurance & frais ──────────────────────────────────────────────────────
  const assuranceMensuelle = (montantEmprunte * params.assuranceTaux) / 100 / 12
  const mensualiteTotale = mensualiteCredit + assuranceMensuelle + mensualitePtz
  const fraisGarantieMontant = (montantEmprunte * params.fraisGarantiePct) / 100
  const fraisBancairesTotal = fraisGarantieMontant + params.fraisDossier

  // ─── Coût total crédit ──────────────────────────────────────────────────────
  const coutCredit =
    params.loanType === 'in-fine'
      ? montantEmprunte * (params.taux / 100) * params.duree +
        assuranceMensuelle * nbMensualites +
        fraisBancairesTotal
      : Math.max(0, mensualiteCredit * nbMensualites - montantEmprunte) +
        assuranceMensuelle * nbMensualites +
        fraisBancairesTotal

  // ─── Loyer de référence ─────────────────────────────────────────────────────
  let loyerRef: number
  let moisLoues: number
  let revAnnuel: number
  let loyerAnnuelBrut: number
  let chargesSaisonnierAnnuel = 0 // charges spécifiques saisonnier
  let venteProduits = 0            // produit cession lots immeuble
  let nbLotsLoues = 0
  let nbLotsVendre = 0

  if (params.locType === 'saisonnier') {
    // Modèle prix/nuit × taux occupation × 365
    const tauxOcc = (params.tauxOccupation ?? 65) / 100
    const prixNuit = params.prixNuit ?? 0
    const nuitesLouees = Math.round(365 * tauxOcc)
    const revenuBrut = prixNuit * nuitesLouees
    const commission = (params.commissionPlateforme ?? 15) / 100
    const revenuApresCommission = revenuBrut * (1 - commission)

    // Calcul rotations = nuits louées / durée moyenne séjour
    const dureeSejourMoyen = Math.max(1, params.dureeSejourMoyen ?? 3)
    const nbRotations = nuitesLouees / dureeSejourMoyen

    // Charges spécifiques saisonnier (annualisées)
    const menageAnnuel = (params.fraisMenageParRotation ?? 0) * nbRotations
    const conciergerieAnnuel = (params.fraisConciergerie ?? 0) * 12
    const fournituresAnnuel = (params.fournituresConsommables ?? 0) * 12
    const electriciteAnnuel = (params.electriciteEau ?? 0) * 12
    const taxeSejourAnnuel = (params.taxeSejour ?? 0) * (params.nbPersonnesMax ?? 2) * nuitesLouees
    chargesSaisonnierAnnuel = menageAnnuel + conciergerieAnnuel + fournituresAnnuel + electriciteAnnuel + taxeSejourAnnuel

    loyerRef = revenuApresCommission / 12 // équivalent loyer mensuel net plateforme
    loyerAnnuelBrut = revenuBrut
    revAnnuel = revenuApresCommission
    moisLoues = Math.round(tauxOcc * 12 * 10) / 10

  } else if (params.locType === 'immeuble') {
    const groups = (params.lotGroups ?? []).filter(g => g.nb > 0)

    if (groups.length > 0) {
      // Mode configurateur par groupes de lots
      const rentedGroups = groups.filter(g => g.regime !== 'vendre')
      const vendreGroups = groups.filter(g => g.regime === 'vendre')

      nbLotsLoues = rentedGroups.reduce((s, g) => s + g.nb, 0)
      nbLotsVendre = vendreGroups.reduce((s, g) => s + g.nb, 0)
      venteProduits = vendreGroups.reduce((s, g) => s + g.prixVente * g.nb, 0)

      // Revenu locatif mensuel total (plein, sans vacance)
      loyerRef = rentedGroups.reduce((s, g) => s + g.loyer * g.nb, 0)
      loyerAnnuelBrut = loyerRef * 12

      // Revenu annuel réel (avec vacances par groupe)
      revAnnuel = rentedGroups.reduce((s, g) => s + g.loyer * g.nb * Math.max(0, 12 - g.vacance), 0)

      // Mois loués moyen pour affichage
      const totalLots = nbLotsLoues
      const vacanceMoyenne = totalLots > 0
        ? rentedGroups.reduce((s, g) => s + g.vacance * g.nb, 0) / totalLots
        : 1
      moisLoues = Math.max(0, 12 - vacanceMoyenne)

    } else {
      // Fallback legacy : nbLots + loyerParLot
      const nbLots = Math.max(1, params.nbLots ?? 4)
      const loyerLot = params.loyerParLot ?? 0
      const vacLot = params.vacanceParLot ?? 1
      loyerRef = loyerLot * nbLots
      moisLoues = Math.max(0, 12 - vacLot)
      loyerAnnuelBrut = loyerRef * 12
      revAnnuel = loyerRef * moisLoues
    }

  } else if (params.locType === 'coloc') {
    loyerRef = (params.loyerParChambre || 0) * (params.nbChambres || 1)
    moisLoues = Math.max(0, 12 - (params.vacance || 0))
    loyerAnnuelBrut = loyerRef * 12
    revAnnuel = loyerRef * moisLoues

  } else if (params.locType === 'meuble') {
    loyerRef = params.loyerMeuble
    moisLoues = Math.max(0, 12 - (params.vacance || 0))
    loyerAnnuelBrut = loyerRef * 12
    revAnnuel = loyerRef * moisLoues

  } else {
    // Nu : loyer hors charges + charges récupérables
    loyerRef = params.loyerNu + (params.chargesRecuperables || 0)
    moisLoues = Math.max(0, 12 - (params.vacance || 0))
    loyerAnnuelBrut = loyerRef * 12
    revAnnuel = loyerRef * moisLoues
  }

  // ─── Charges annuelles ──────────────────────────────────────────────────────
  const loyerBase = params.locType === 'nu'
    ? params.loyerNu
    : loyerRef

  const fraisGestionAnnuel = (loyerBase * 12 * params.fraisGestionPct) / 100
  const provisionAnnuelle = (loyerBase * 12 * params.provisionPct) / 100
  const gliAnnuel = params.locType !== 'saisonnier' && params.locType !== 'immeuble'
    ? (loyerBase * 12 * params.gliPct) / 100
    : 0

  // CFE : meublé, coloc, saisonnier, et immeuble si au moins un lot meublé
  const hasMenubeLots = params.locType === 'immeuble'
    ? (params.lotGroups ?? []).some(g => g.regime === 'meuble')
    : false
  const cfe = ['meuble', 'coloc', 'saisonnier'].includes(params.locType) || hasMenubeLots
    ? params.cfe : 0

  // Charges spécifiques immeuble (entretien + assurance bâtiment)
  const chargesImmeuble = params.locType === 'immeuble'
    ? (params.entretienPartiesCommunes ?? 0) + (params.assuranceImmeuble ?? 0)
    : 0

  // Copro : immeuble = syndicat = soi-même → 0 (remplacé par chargesImmeuble)
  const chargesCopro = params.locType === 'immeuble' ? 0 : params.chargesCopro

  // PNO : pour immeuble, l'assurance bâtiment est dans chargesImmeuble → on n'ajoute pas assurancePno
  const assurancePnoEffective = params.locType === 'immeuble' ? 0 : params.assurancePno

  const totalCharges =
    params.taxeFonciere +
    chargesCopro +
    assurancePnoEffective +
    fraisGestionAnnuel +
    provisionAnnuelle +
    params.fraisComptable +
    gliAnnuel +
    cfe +
    chargesSaisonnierAnnuel +
    chargesImmeuble

  // ─── Rendements ─────────────────────────────────────────────────────────────
  const loyer = loyerRef
  const rendBrut = params.prixAchat > 0 ? (loyerAnnuelBrut / params.prixAchat) * 100 : 0
  const rendNet = prixRevient > 0 ? ((revAnnuel - totalCharges) / prixRevient) * 100 : 0

  const cashflowMensuel = (revAnnuel - totalCharges) / 12 - mensualiteTotale
  const roiApport = params.apport > 0 ? ((cashflowMensuel * 12) / params.apport) * 100 : 0
  const pointMort = Math.ceil(mensualiteTotale + totalCharges / 12)

  const loyerAnnuelNet = revAnnuel
  const chargesAnnuelles = totalCharges
  const cashflowAnnuel = cashflowMensuel * 12
  const effortEpargne = Math.max(0, -cashflowMensuel)
  // vacanceAnnuelle : pour immeuble, calculée lot par lot ; sinon formule standard
  const vacanceAnnuelle = params.locType === 'immeuble'
    ? (params.lotGroups ?? []).filter(g => g.regime !== 'vendre').reduce((s, g) => s + g.loyer * g.nb * g.vacance, 0)
    : loyer * (params.vacance || 0)

  // ─── Revente & TRI ──────────────────────────────────────────────────────────
  const horizon = params.horizonRevente || 10
  const appreciation = params.valorisationAnnuelle ?? 2.0
  const prixRevente = params.prixAchat * Math.pow(1 + appreciation / 100, horizon)

  // Plus-value brute
  const baseAcquisition = prixRevient // prix achat + frais notaire + travaux
  const plusValueBrute = Math.max(0, prixRevente - baseAcquisition)

  // Abattements plus-value immobilière (règles françaises)
  const { abattIR, abattPS } = calculerAbattementPlusValue(horizon)
  const pvImposableIR = plusValueBrute * (1 - abattIR / 100)
  const pvImposablePS = plusValueBrute * (1 - abattPS / 100)
  const impotPlusValue = Math.max(0, pvImposableIR * 0.19 + pvImposablePS * 0.172)

  // Capital restant dû à l'horizon
  const capitalRestantHorizon = calculerCapitalRestant(montantEmprunte, params.taux, params.duree, horizon)

  // Frais d'agence vente (3%)
  const fraisAgenceRevente = prixRevente * 0.03

  const patrimoineNetRevente = prixRevente - capitalRestantHorizon - impotPlusValue - fraisAgenceRevente

  // TRI (Taux de Rendement Interne)
  // Si des fonds sont gardés (non réinjectés), ils réduisent le capital effectivement immobilisé
  const venteGardes = venteProduitsPreCalc - reinjectAmount  // fonds conservés en trésorerie
  const investissementInitial = Math.max(0, params.apport + fraisBancairesTotal - venteGardes)
  const tri = calculerTRI(investissementInitial, cashflowAnnuel, horizon, patrimoineNetRevente)

  // ─── Tableaux ────────────────────────────────────────────────────────────────
  const tableauAmortissement = generateAmortizationSchedule(montantEmprunte, params.taux, params.duree)
  const projection = generateProjection(
    params.prixAchat,
    montantEmprunte,
    params.taux,
    params.duree,
    cashflowMensuel,
    appreciation,
    20,
    params.irl ?? 1.5
  )

  return {
    ville: params.ville,
    prixRevient,
    montantEmprunte,
    mensualiteTotale,
    mensualiteCredit,
    mensualitePtz,
    coutCredit,
    fraisBancairesTotal,
    totalCharges,
    chargesAnnuelles,
    fraisGestionAnnuel,
    provisionAnnuelle,
    gliAnnuel,
    cfe,
    revAnnuel,
    loyerAnnuelBrut,
    loyerAnnuelNet,
    loyer,
    moisLoues,
    vacanceAnnuelle,
    rendBrut,
    rendNet,
    rendementBrut: rendBrut,
    rendementNet: rendNet,
    cashflowMensuel,
    cashflowAnnuel,
    effortEpargne,
    roiApport,
    pointMort,
    // Revente
    prixRevente: Math.round(prixRevente),
    plusValueBrute: Math.round(plusValueBrute),
    abattementPVIR: Math.round(abattIR),
    abattementPVPS: Math.round(abattPS),
    impotPlusValue: Math.round(impotPlusValue),
    patrimoineNetRevente: Math.round(patrimoineNetRevente),
    tri: Math.round(tri * 10) / 10,
    // Tableaux
    tableauAmortissement,
    projection,
    // Immeuble
    ...(params.locType === 'immeuble' ? { venteProduits, nbLotsLoues, nbLotsVendre, reinjectAmount, montantEmprunted } : {}),
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calcule les abattements sur plus-value immobilière (règles françaises)
 * - Exonération IR totale après 22 ans
 * - Exonération PS totale après 30 ans
 */
function calculerAbattementPlusValue(dureeDetention: number): { abattIR: number; abattPS: number } {
  let abattIR = 0
  let abattPS = 0

  if (dureeDetention <= 5) {
    abattIR = 0
    abattPS = 0
  } else if (dureeDetention <= 21) {
    abattIR = (dureeDetention - 5) * 6
    abattPS = (dureeDetention - 5) * 1.65
  } else if (dureeDetention === 22) {
    abattIR = 100
    abattPS = 22 * 1.65 - 5 * 1.65 + 1.60
  } else if (dureeDetention <= 30) {
    abattIR = 100
    abattPS = Math.min(100, (dureeDetention - 5) * 1.65 + (dureeDetention - 22) * 9)
  } else {
    abattIR = 100
    abattPS = 100
  }

  return {
    abattIR: Math.min(100, abattIR),
    abattPS: Math.min(100, abattPS),
  }
}

/**
 * Calcule le capital restant dû après N années
 */
function calculerCapitalRestant(montant: number, tauxAnnuel: number, dureeAns: number, annees: number): number {
  if (montant <= 0 || tauxAnnuel <= 0) return Math.max(0, montant - (montant / dureeAns) * annees)
  const r = tauxAnnuel / 100 / 12
  const n = dureeAns * 12
  const mois = Math.min(annees * 12, n)
  return Math.max(0, montant * ((Math.pow(1 + r, n) - Math.pow(1 + r, mois)) / (Math.pow(1 + r, n) - 1)))
}

/**
 * Calcule le TRI (Taux de Rendement Interne) par recherche dichotomique
 * NPV = -invest + Σ(CF/(1+r)^t) + VT/(1+r)^horizon = 0
 */
function calculerTRI(
  investissementInitial: number,
  cashflowAnnuel: number,
  horizonAns: number,
  valeurTerminale: number
): number {
  if (investissementInitial <= 0) return 0

  const npv = (r: number) => {
    let val = -investissementInitial
    for (let t = 1; t <= horizonAns; t++) {
      val += cashflowAnnuel / Math.pow(1 + r, t)
    }
    val += valeurTerminale / Math.pow(1 + r, horizonAns)
    return val
  }

  let lo = -0.5
  let hi = 5.0

  // Vérification que la solution existe
  if (npv(lo) < 0 && npv(hi) < 0) return -50
  if (npv(lo) > 0 && npv(hi) > 0) return 500

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (npv(mid) > 0) lo = mid
    else hi = mid
  }

  return ((lo + hi) / 2) * 100
}

// ─── Amortissement ─────────────────────────────────────────────────────────────

export function generateAmortizationSchedule(
  montant: number,
  tauxAnnuel: number,
  dureeAns: number
): AmortizationRow[] {
  if (montant <= 0 || tauxAnnuel <= 0 || dureeAns <= 0) return []

  const r = tauxAnnuel / 100 / 12
  const n = dureeAns * 12
  const mensualite = (montant * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)

  const rows: AmortizationRow[] = []
  let capitalRestant = montant

  for (let mois = 1; mois <= n; mois++) {
    const interetsPaies = capitalRestant * r
    const capitalRembourse = mensualite - interetsPaies
    capitalRestant = Math.max(0, capitalRestant - capitalRembourse)

    rows.push({
      mois,
      annee: Math.ceil(mois / 12),
      capitalRestant: Math.round(capitalRestant),
      interetsPaies: Math.round(interetsPaies),
      capitalRembourse: Math.round(capitalRembourse),
      mensualite: Math.round(mensualite),
    })
  }

  return rows
}

// ─── Projection 20 ans ─────────────────────────────────────────────────────────

export function generateProjection(
  prixAchat: number,
  montantEmprunte: number,
  tauxAnnuel: number,
  dureeAns: number,
  cashflowMensuelInitial: number,
  appreciationAnnuelle = 2.0,
  horizonAns = 20,
  irl = 1.5    // revalorisation loyer annuelle (%)
): ProjectionRow[] {
  const rows: ProjectionRow[] = []
  const r = tauxAnnuel / 100 / 12
  const n = dureeAns * 12
  let cashflowCumule = 0
  let cashflowCourant = cashflowMensuelInitial

  for (let annee = 1; annee <= horizonAns; annee++) {
    const valeurBien = prixAchat * Math.pow(1 + appreciationAnnuelle / 100, annee)

    const moisEcoules = Math.min(annee * 12, n)
    const capitalRestant =
      tauxAnnuel > 0 && montantEmprunte > 0
        ? montantEmprunte * ((Math.pow(1 + r, n) - Math.pow(1 + r, moisEcoules)) / (Math.pow(1 + r, n) - 1))
        : Math.max(0, montantEmprunte - (montantEmprunte / n) * moisEcoules)

    // Revalorisation du cashflow avec l'IRL
    if (annee > 1) {
      cashflowCourant = cashflowCourant * (1 + irl / 100)
    }

    cashflowCumule += cashflowCourant * 12
    const patrimoine = valeurBien - Math.max(0, capitalRestant)

    rows.push({
      annee,
      valeurBien: Math.round(valeurBien),
      capitalRestant: Math.round(Math.max(0, capitalRestant)),
      patrimoine: Math.round(patrimoine),
      cashflowCumule: Math.round(cashflowCumule),
    })
  }

  return rows
}

// ─── Calcul automatique frais de notaire ────────────────────────────────────────

export function calculerFraisNotaire(prixAchat: number, etat: 'ancien' | 'neuf'): number {
  if (prixAchat <= 0) return 0
  // Ancien : ~8% (droits mutation 5.8% + émoluments + débours)
  // Neuf : ~3% (TVA incluse dans le prix, droits réduits)
  const taux = etat === 'neuf' ? 0.03 : 0.08
  return Math.round(prixAchat * taux)
}

// ─── Paramètres par défaut ─────────────────────────────────────────────────────

export const DEFAULT_PARAMS: InvestmentParams = {
  // Bien
  prixAchat: 150000,
  surface: 40,
  ville: 'Lyon',
  quartier: '',
  typeBien: 'Appartement',
  etat: 'ancien',
  dpe: 'D',

  // Financement
  apport: 30000,
  taux: 3.5,
  duree: 20,
  assuranceTaux: 0.1,
  loanType: 'amortissable',
  fraisNotaire: 12000,    // 8% de 150k
  fraisNotaireAuto: true,
  travaux: 5000,
  fraisGarantiePct: 1.5,
  fraisDossier: 500,

  // PTZ
  ptzEnabled: false,
  ptzMontant: 0,
  ptzTaux: 0,
  ptzDuree: 15,

  // Location
  locType: 'meuble',
  loyerNu: 700,
  loyerMeuble: 850,
  chargesRecuperables: 0,
  nbChambres: 3,
  loyerParChambre: 350,
  vacance: 0.5,
  irl: 1.5,

  // Saisonnier
  prixNuit: 80,
  tauxOccupation: 65,
  dureeSejourMoyen: 3,
  commissionPlateforme: 15,
  fraisMenageParRotation: 50,
  fraisConciergerie: 0,
  fournituresConsommables: 0,
  electriciteEau: 0,
  taxeSejour: 0,
  nbPersonnesMax: 2,

  // Immeuble
  nbLots: 4,
  loyerParLot: 600,
  vacanceParLot: 1,
  entretienPartiesCommunes: 2000,
  assuranceImmeuble: 800,
  lotGroups: [],
  venteStrategy: 'garder',
  venteReinjectPct: 100,

  // Charges
  taxeFonciere: 800,
  chargesCopro: 1200,
  assurancePno: 200,
  fraisGestionPct: 0,
  provisionPct: 5,
  fraisComptable: 0,
  gliPct: 0,
  cfe: 600,

  // Fiscalité
  tmi: 30,
  revenusProAnnuels: 45000,
  lmpEnabled: false,
  sciIS: false,
  sarlFamille: false,
  structure: 'nom-propre',
  profilFis: 'nouveau',

  // Amortissement par composants (mode expert)
  amortGrosOeuvrePct: 50, amortGrosOeuvreAns: 50,
  amortFacadePct: 10, amortFacadeAns: 30,
  amortToiturePct: 10, amortToitureAns: 25,
  amortInstallationsPct: 15, amortInstallationsAns: 15,
  amortAgencementsPct: 15, amortAgencementsAns: 10,
  amortTravauxAns: 10,

  // Revente
  horizonRevente: 10,
  valorisationAnnuelle: 2.0,
}
