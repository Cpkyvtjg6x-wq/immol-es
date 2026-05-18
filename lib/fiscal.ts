import type { InvestmentResult, FiscalParams, FiscalResult, FiscalRegime } from './types'

/**
 * Calcule la fiscalité pour tous les régimes immobiliers français.
 * Porte la logique de calcFis() du calculateur HTML original.
 */
export function calculateFiscal(
  params: FiscalParams,
  result: InvestmentResult
): FiscalResult {
  const PS = 0.172 // Prélèvements sociaux 17.2%
  const tmi = params.tmi / 100 // TMI en décimal

  const revBrut = result.revAnnuel
  const charges = result.totalCharges
  const mensualiteTotale = result.mensualiteTotale
  const interetsAnnuels = result.mensualiteCredit > 0
    ? result.mensualiteCredit * 12 - (result.montantEmprunte > 0 ? estimerCapitalRembourse(result) : 0)
    : 0

  // Amortissement LMNP (par composants)
  const amortBase = params.prixAchat * 0.85 // 85% du prix (hors terrain)
  const amortStructure = amortBase * 0.70 / 50 // 70% structure sur 50 ans
  const amortInstallations = amortBase * 0.15 / 15 // 15% installations sur 15 ans
  const amortMobilier = (params.travaux ?? 0) * 0.80 / 7 // meubles sur 7 ans
  const amortTravaux = (params.travaux ?? 0) * 0.20 / 10 // travaux sur 10 ans
  const amortTotal = amortStructure + amortInstallations + amortMobilier + amortTravaux

  const prixRevient = params.prixRevient
  const regimes: FiscalRegime[] = []

  // ─── 1. MICRO-FONCIER ────────────────────────────────────────────────────────
  // Abattement 30%, revenus < 15 000€/an, location nue uniquement
  {
    const disabled = params.locType !== 'nu' || revBrut > 15000
    const disabledReason = params.locType !== 'nu'
      ? 'Réservé à la location nue'
      : revBrut > 15000
      ? 'Revenus > 15 000€/an (seuil dépassé)'
      : undefined

    const abattement = revBrut * 0.30
    const revImposable = Math.max(0, revBrut - abattement)
    const impot = revImposable * tmi
    const ps = revImposable * PS
    const totalFiscal = impot + ps
    const net = revBrut - charges - totalFiscal
    const cfNet = net / 12 - mensualiteTotale

    regimes.push({
      id: 'micro-foncier',
      name: 'Micro-foncier',
      shortName: 'Micro-F',
      category: 'foncier',
      revImposable,
      impot,
      ps,
      totalFiscal,
      net,
      cfNet,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled,
      disabledReason,
    })
  }

  // ─── 2. RÉEL FONCIER ─────────────────────────────────────────────────────────
  // Déductibilité des charges réelles, location nue
  {
    const disabled = params.locType !== 'nu'
    const chargesDeductibles = charges + interetsAnnuels
    const revImposable = Math.max(0, revBrut - chargesDeductibles)
    const deficitFoncier = Math.min(10700, Math.max(0, chargesDeductibles - revBrut))
    const impot = revImposable > 0 ? revImposable * tmi : -(deficitFoncier * tmi)
    const ps = revImposable * PS
    const totalFiscal = impot + ps
    const net = revBrut - charges - totalFiscal
    const cfNet = net / 12 - mensualiteTotale

    regimes.push({
      id: 'reel-foncier',
      name: 'Réel foncier',
      shortName: 'Réel-F',
      category: 'foncier',
      revImposable,
      impot,
      ps,
      totalFiscal,
      net,
      cfNet,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled,
      disabledReason: disabled ? 'Réservé à la location nue' : undefined,
      tag: deficitFoncier > 0 ? `Déficit ${Math.round(deficitFoncier)} €` : undefined,
    })
  }

  // ─── 3. LMNP MICRO-BIC ──────────────────────────────────────────────────────
  // Abattement 50% (meublé classique) ou 71% (meublé classé tourisme)
  // Revenus < 77 700€/an
  {
    const disabled = params.locType === 'nu'
    const isTourisme = params.locType === 'saisonnier'
    const abattementRate = isTourisme ? 0.71 : 0.50
    const seuil = isTourisme ? 188700 : 77700

    const disabledReason = disabled ? 'Réservé à la location meublée' : undefined
    const plafondOk = revBrut <= seuil
    const abattement = revBrut * abattementRate
    const revImposable = Math.max(0, revBrut - abattement)
    const impot = revImposable * tmi
    const ps = revImposable * PS
    const totalFiscal = impot + ps
    const net = revBrut - charges - totalFiscal
    const cfNet = net / 12 - mensualiteTotale

    regimes.push({
      id: 'lmnp-micro-bic',
      name: `LMNP Micro-BIC (${Math.round(abattementRate * 100)}%)`,
      shortName: 'Micro-BIC',
      category: 'bic',
      revImposable,
      impot,
      ps,
      totalFiscal,
      net,
      cfNet,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled: disabled || !plafondOk,
      disabledReason: !plafondOk ? `Revenus > ${seuil.toLocaleString('fr-FR')} €` : disabledReason,
    })
  }

  // ─── 4. LMNP RÉEL ────────────────────────────────────────────────────────────
  // Amortissement par composants + déduction charges réelles
  {
    const disabled = params.locType === 'nu'
    const chargesDeductibles = charges + interetsAnnuels + amortTotal
    const revImposable = Math.max(0, revBrut - chargesDeductibles)
    // L'amortissement excédentaire est reportable mais pas de déficit sur revenu global
    const impot = revImposable * tmi
    const ps = revImposable * PS
    const totalFiscal = impot + ps
    const net = revBrut - charges - totalFiscal
    const cfNet = net / 12 - mensualiteTotale
    const amortReporte = Math.max(0, chargesDeductibles - revBrut)

    regimes.push({
      id: 'lmnp-reel',
      name: 'LMNP Réel (amortissement)',
      shortName: 'LMNP Réel',
      category: 'bic',
      revImposable,
      impot,
      ps,
      totalFiscal,
      net,
      cfNet,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled,
      disabledReason: disabled ? 'Réservé à la location meublée' : undefined,
      tag: amortReporte > 0 ? `Amort. reporté ${Math.round(amortReporte)} €` : undefined,
    })
  }

  // ─── 5. LMP (Loueur en Meublé Professionnel) ─────────────────────────────────
  // Revenus BIC > 23 000€ ET représentent > 50% revenus du foyer
  {
    const disabled = params.locType === 'nu' || !params.lmpEnabled
    const disabledReason = params.locType === 'nu'
      ? 'Réservé à la location meublée'
      : !params.lmpEnabled
      ? 'LMP : revenus > 23k€ et > 50% revenus foyer requis'
      : undefined

    const chargesDeductibles = charges + interetsAnnuels + amortTotal
    const revImposable = Math.max(0, revBrut - chargesDeductibles)
    const deficitLMP = Math.max(0, chargesDeductibles - revBrut)
    // LMP : déficit imputable sur revenu global (économie d'impôt)
    const economieDeficit = deficitLMP * tmi
    const impot = Math.max(0, revImposable * tmi - economieDeficit)
    const ps = 0 // LMP = TNS, cotisations sociales à la place
    const cotisationsTNS = revBrut * 0.35 // ~35% pour TNS
    const totalFiscal = impot + cotisationsTNS
    const net = revBrut - charges - totalFiscal
    const cfNet = net / 12 - mensualiteTotale

    regimes.push({
      id: 'lmp',
      name: 'LMP (Loueur Meublé Professionnel)',
      shortName: 'LMP',
      category: 'bic',
      revImposable,
      impot,
      ps,
      totalFiscal,
      net,
      cfNet,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled,
      disabledReason,
      tag: deficitLMP > 0 ? `Déficit global ${Math.round(deficitLMP)} €` : undefined,
    })
  }

  // ─── 6. SCI À L'IR ──────────────────────────────────────────────────────────
  // Transparence fiscale, même traitement que réel foncier
  {
    const chargesDeductibles = charges + interetsAnnuels
    const revImposable = Math.max(0, revBrut - chargesDeductibles)
    const deficitFoncier = Math.min(10700, Math.max(0, chargesDeductibles - revBrut))
    const impot = revImposable > 0 ? revImposable * tmi : -(deficitFoncier * tmi)
    const ps = revImposable * PS
    const totalFiscal = impot + ps
    const net = revBrut - charges - totalFiscal
    const cfNet = net / 12 - mensualiteTotale

    regimes.push({
      id: 'sci-ir',
      name: 'SCI à l\'IR',
      shortName: 'SCI IR',
      category: 'societe',
      revImposable,
      impot,
      ps,
      totalFiscal,
      net,
      cfNet,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled: false,
      tag: 'Transmission facilitée',
    })
  }

  // ─── 7. SCI À L'IS ──────────────────────────────────────────────────────────
  // IS 15% jusqu'à 42 500€, puis 25% + PS sur dividendes
  {
    const chargesDeductibles = charges + interetsAnnuels + amortTotal
    const resultatSociete = revBrut - chargesDeductibles
    const isRate = resultatSociete <= 42500 ? 0.15 : 0.25
    const is = resultatSociete > 0 ? resultatSociete * isRate : 0
    const beneficeApreIs = Math.max(0, resultatSociete - is)

    let impotDividendes = 0
    let psDividendes = 0
    if (params.sciIS && beneficeApreIs > 0) {
      // Flat tax 30% sur dividendes (12.8% IR + 17.2% PS)
      impotDividendes = beneficeApreIs * 0.128
      psDividendes = beneficeApreIs * 0.172
    }

    const totalFiscal = is + impotDividendes + psDividendes
    const net = revBrut - charges - totalFiscal
    const cfNet = net / 12 - mensualiteTotale

    regimes.push({
      id: 'sci-is',
      name: params.sciIS ? 'SCI à l\'IS (avec dividendes)' : 'SCI à l\'IS (capitalisation)',
      shortName: 'SCI IS',
      category: 'is',
      revImposable: Math.max(0, resultatSociete),
      impot: is,
      ps: psDividendes,
      totalFiscal,
      net,
      cfNet,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled: false,
      tag: params.sciIS ? 'Flat tax dividendes' : 'Capitalisation IS',
    })
  }

  // ─── 8. SARL DE FAMILLE — IR MICRO ──────────────────────────────────────────
  {
    const disabled = params.locType === 'nu'
    const abattement = revBrut * 0.50
    const revImposable = Math.max(0, revBrut - abattement)
    const impot = revImposable * tmi
    const ps = revImposable * PS
    const totalFiscal = impot + ps
    const net = revBrut - charges - totalFiscal
    const cfNet = net / 12 - mensualiteTotale

    regimes.push({
      id: 'sarl-ir-micro',
      name: 'SARL Famille — IR Micro-BIC',
      shortName: 'SARL Micro',
      category: 'societe',
      revImposable,
      impot,
      ps,
      totalFiscal,
      net,
      cfNet,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled,
      disabledReason: disabled ? 'Réservé à la location meublée' : undefined,
    })
  }

  // ─── 9. SARL DE FAMILLE — IR RÉEL ───────────────────────────────────────────
  {
    const disabled = params.locType === 'nu'
    const chargesDeductibles = charges + interetsAnnuels + amortTotal
    const revImposable = Math.max(0, revBrut - chargesDeductibles)
    const impot = revImposable * tmi
    const ps = revImposable * PS
    const totalFiscal = impot + ps
    const net = revBrut - charges - totalFiscal
    const cfNet = net / 12 - mensualiteTotale

    regimes.push({
      id: 'sarl-ir-reel',
      name: 'SARL Famille — IR Réel',
      shortName: 'SARL Réel',
      category: 'societe',
      revImposable,
      impot,
      ps,
      totalFiscal,
      net,
      cfNet,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled,
      disabledReason: disabled ? 'Réservé à la location meublée' : undefined,
      tag: 'Amortissement LMNP',
    })
  }

  // ─── 10. SARL DE FAMILLE — IS ────────────────────────────────────────────────
  {
    const disabled = params.locType === 'nu' || !params.sarlFamille
    const chargesDeductibles = charges + interetsAnnuels + amortTotal
    const resultat = revBrut - chargesDeductibles
    const isRate = resultat <= 42500 ? 0.15 : 0.25
    const is = resultat > 0 ? resultat * isRate : 0
    const benefice = Math.max(0, resultat - is)
    // Dirigeant peut se verser une rémunération (cotisations TNS)
    const remunDir = Math.min(benefice * 0.5, 30000)
    const cotTNS = remunDir * 0.45
    const dividende = benefice - remunDir
    const flatTax = dividende > 0 ? dividende * 0.30 : 0
    const totalFiscal = is + cotTNS + flatTax
    const net = revBrut - charges - totalFiscal
    const cfNet = net / 12 - mensualiteTotale

    regimes.push({
      id: 'sarl-is',
      name: 'SARL Famille — IS',
      shortName: 'SARL IS',
      category: 'is',
      revImposable: Math.max(0, resultat),
      impot: is,
      ps: flatTax,
      totalFiscal,
      net,
      cfNet,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled,
      disabledReason: !params.sarlFamille
        ? 'Activez l\'option SARL de famille dans les paramètres'
        : disabled ? 'Réservé à la location meublée' : undefined,
      tag: 'Rémunération dirigeant',
    })
  }

  // ─── Sélection du meilleur régime ────────────────────────────────────────────
  const actifs = regimes.filter((r) => !r.disabled)

  const bestIdx = actifs.reduce(
    (bestI, r, i) => (r.net > actifs[bestI].net ? i : bestI),
    0
  )
  const best = actifs[bestIdx] ?? regimes[0]

  const rendNetNet =
    prixRevient > 0 ? (best.net / prixRevient) * 100 : 0

  const cfNet = best.cfNet

  return { regimes, actifs, best, rendNetNet, cfNet, name: best.name }
}

/**
 * Estime le capital remboursé la première année pour le calcul des intérêts
 * (approximation : on utilise les intérêts de la 1ère mensualité)
 */
function estimerCapitalRembourse(result: InvestmentResult): number {
  // Capital remboursé ≈ mensualité crédit * 12 - intérêts approximatifs
  // Approximation conservative : 30% de la mensualité = capital en début de prêt
  return result.mensualiteCredit * 12 * 0.3
}

/**
 * TMI tranches 2024 (pour calcul automatique si non fourni)
 */
export const TMI_TRANCHES = [
  { min: 0, max: 11294, taux: 0 },
  { min: 11294, max: 28797, taux: 11 },
  { min: 28797, max: 82341, taux: 30 },
  { min: 82341, max: 177106, taux: 41 },
  { min: 177106, max: Infinity, taux: 45 },
]

export function getTMI(revenuImposable: number): number {
  const tranche = TMI_TRANCHES.slice()
    .reverse()
    .find((t) => revenuImposable > t.min)
  return tranche?.taux ?? 0
}

/**
 * Default fiscal params
 */
export const DEFAULT_FISCAL_PARAMS: Omit<FiscalParams, 'prixAchat' | 'travaux' | 'prixRevient' | 'locType'> = {
  tmi: 30,
  lmpEnabled: false,
  sciIS: false,
  sarlFamille: false,
}
