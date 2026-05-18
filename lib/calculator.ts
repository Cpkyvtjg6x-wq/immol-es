import type { InvestmentParams, InvestmentResult, AmortizationRow, ProjectionRow } from './types'

/**
 * Core investment calculator — ported from the original HTML/JS calculator.
 * All amounts in euros, percentages as plain numbers (e.g. 3.5 for 3.5%).
 */
export function calculateInvestment(params: InvestmentParams): InvestmentResult {
  // ─── Prix de revient ────────────────────────────────────────────────────────
  const prixRevient = params.prixAchat + params.fraisNotaire + params.travaux

  // ─── PTZ (Prêt à Taux Zéro) mensualité ────────────────────────────────────
  let mensualitePtz = 0
  if (params.ptzEnabled && params.ptzMontant > 0) {
    if (params.ptzTaux > 0) {
      const r = params.ptzTaux / 100 / 12
      const n = params.ptzDuree * 12
      mensualitePtz = (params.ptzMontant * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    } else {
      // Taux 0 → division simple
      mensualitePtz = params.ptzMontant / (params.ptzDuree * 12)
    }
  }

  // ─── Montant emprunté principal ─────────────────────────────────────────────
  const montantEmprunte = Math.max(
    0,
    prixRevient - params.apport - (params.ptzEnabled ? params.ptzMontant : 0)
  )

  const tauxMensuel = params.taux / 100 / 12
  const nbMensualites = params.duree * 12

  // ─── Mensualité crédit ──────────────────────────────────────────────────────
  let mensualiteCredit = 0
  if (montantEmprunte > 0 && params.taux > 0) {
    if (params.loanType === 'in-fine') {
      // In-fine : intérêts seulement
      mensualiteCredit = montantEmprunte * (params.taux / 100 / 12)
    } else {
      // Amortissable : formule standard
      mensualiteCredit =
        (montantEmprunte * tauxMensuel * Math.pow(1 + tauxMensuel, nbMensualites)) /
        (Math.pow(1 + tauxMensuel, nbMensualites) - 1)
    }
  }

  // ─── Assurance ─────────────────────────────────────────────────────────────
  const assuranceMensuelle = (montantEmprunte * params.assuranceTaux) / 100 / 12
  const mensualiteTotale = mensualiteCredit + assuranceMensuelle + mensualitePtz

  // ─── Frais bancaires ────────────────────────────────────────────────────────
  const fraisGarantieMontant = (montantEmprunte * params.fraisGarantiePct) / 100
  const fraisBancairesTotal = fraisGarantieMontant + params.fraisDossier

  // ─── Coût total du crédit ───────────────────────────────────────────────────
  const coutCredit =
    params.loanType === 'in-fine'
      ? montantEmprunte * (params.taux / 100) * params.duree +
        assuranceMensuelle * nbMensualites +
        fraisBancairesTotal
      : Math.max(0, mensualiteCredit * nbMensualites - montantEmprunte) +
        assuranceMensuelle * nbMensualites +
        fraisBancairesTotal

  // ─── Charges annuelles ──────────────────────────────────────────────────────
  const loyerRef =
    params.locType === 'meuble' || params.locType === 'saisonnier'
      ? params.loyerMeuble
      : params.loyerNu

  const fraisGestionAnnuel = (loyerRef * 12 * params.fraisGestionPct) / 100
  const provisionAnnuelle = (loyerRef * 12 * params.provisionPct) / 100
  const gliAnnuel = (loyerRef * 12 * params.gliPct) / 100

  // CFE uniquement pour meublé et coloc
  const cfe =
    params.locType === 'meuble' ||
    params.locType === 'coloc' ||
    params.locType === 'saisonnier'
      ? params.cfe
      : 0

  const totalCharges =
    params.taxeFonciere +
    params.chargesCopro +
    params.assurancePno +
    fraisGestionAnnuel +
    provisionAnnuelle +
    params.fraisComptable +
    gliAnnuel +
    cfe

  // ─── Revenus locatifs ───────────────────────────────────────────────────────
  const moisLoues = Math.max(0, 12 - params.vacance)
  const loyer = loyerRef
  const revAnnuel = loyer * moisLoues

  // ─── Rendements ─────────────────────────────────────────────────────────────
  const rendBrut = params.prixAchat > 0 ? ((loyer * 12) / params.prixAchat) * 100 : 0
  const rendNet = prixRevient > 0 ? ((revAnnuel - totalCharges) / prixRevient) * 100 : 0

  const cashflowMensuel = (revAnnuel - totalCharges) / 12 - mensualiteTotale
  const roiApport = params.apport > 0 ? ((cashflowMensuel * 12) / params.apport) * 100 : 0

  // Point mort = loyer minimum pour couvrir toutes les charges + mensualité
  const pointMort = Math.ceil(mensualiteTotale + totalCharges / 12)

  const loyerAnnuelBrut = loyer * 12
  const loyerAnnuelNet = revAnnuel
  const chargesAnnuelles = totalCharges
  const cashflowAnnuel = cashflowMensuel * 12
  const effortEpargne = Math.max(0, -cashflowMensuel)
  const vacanceAnnuelle = loyer * params.vacance

  // Generate amortization and projection
  const tableauAmortissement = generateAmortizationSchedule(montantEmprunte, params.taux, params.duree)
  const projection = generateProjection(params.prixAchat, montantEmprunte, params.taux, params.duree, cashflowMensuel)

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
    tableauAmortissement,
    projection,
  }
}

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

export function generateProjection(
  prixAchat: number,
  montantEmprunte: number,
  tauxAnnuel: number,
  dureeAns: number,
  cashflowMensuel: number,
  appreciationAnnuelle = 2.0,
  horizonAns = 20
): ProjectionRow[] {
  const rows: ProjectionRow[] = []
  const r = tauxAnnuel / 100 / 12
  const n = dureeAns * 12

  let cashflowCumule = 0

  for (let annee = 1; annee <= horizonAns; annee++) {
    const valeurBien = prixAchat * Math.pow(1 + appreciationAnnuelle / 100, annee)

    // Capital restant dû après `annee` années
    const moisEcoules = Math.min(annee * 12, n)
    const capitalRestant =
      tauxAnnuel > 0 && montantEmprunte > 0
        ? montantEmprunte *
          ((Math.pow(1 + r, n) - Math.pow(1 + r, moisEcoules)) /
            (Math.pow(1 + r, n) - 1))
        : Math.max(0, montantEmprunte - (montantEmprunte / n) * moisEcoules)

    cashflowCumule += cashflowMensuel * 12
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

/**
 * Default investment parameters for a new simulation
 */
export const DEFAULT_PARAMS: InvestmentParams = {
  prixAchat: 150000,
  surface: 40,
  ville: 'Lyon',
  quartier: '',
  apport: 30000,
  taux: 3.5,
  duree: 20,
  assuranceTaux: 0.1,
  loanType: 'amortissable',
  fraisNotaire: 10500, // 7% de 150k
  travaux: 5000,
  fraisGarantiePct: 1.5,
  fraisDossier: 500,
  ptzEnabled: false,
  ptzMontant: 0,
  ptzTaux: 0,
  ptzDuree: 15,
  locType: 'meuble',
  loyerNu: 700,
  loyerMeuble: 850,
  vacance: 0.5,
  taxeFonciere: 800,
  chargesCopro: 1200,
  assurancePno: 200,
  fraisGestionPct: 0,
  provisionPct: 5,
  fraisComptable: 0,
  gliPct: 0,
  cfe: 600,
}
