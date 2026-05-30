import type { InvestmentResult, FiscalParams, FiscalResult, FiscalRegime } from './types'

const PS = 0.172 // Prélèvements sociaux 17.2%

function calcIS(base: number): number {
  if (base <= 0) return 0
  if (base <= 42500) return base * 0.15
  return 42500 * 0.15 + (base - 42500) * 0.25
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

/** Calcule le total d'amortissement annuel LMNP selon les paramètres */
function calcAmortTotal(params: FiscalParams): number {
  const base = params.prixAchat * 0.85 // 85% du prix (hors terrain)
  const travaux = params.travaux ?? 0

  if (params.profilFis === 'confirme') {
    // Mode expert — amortissement par composants personnalisables
    const grosOeuvre     = (base * (params.amortGrosOeuvrePct   ?? 50) / 100) / (params.amortGrosOeuvreAns   ?? 50)
    const facade         = (base * (params.amortFacadePct        ?? 10) / 100) / (params.amortFacadeAns       ?? 30)
    const toiture        = (base * (params.amortToiturePct       ?? 10) / 100) / (params.amortToitureAns      ?? 25)
    const installations  = (base * (params.amortInstallationsPct ?? 15) / 100) / (params.amortInstallationsAns ?? 15)
    const agencements    = (base * (params.amortAgencementsPct   ?? 15) / 100) / (params.amortAgencementsAns   ?? 10)
    const travauxAmort   = travaux > 0 ? travaux / (params.amortTravauxAns ?? 10) : 0
    return grosOeuvre + facade + toiture + installations + agencements + travauxAmort
  }

  // Mode simple (par défaut — identique au HTML mode "nouveau")
  const amortStructure    = base * 0.70 / 50
  const amortInstall      = base * 0.15 / 15
  const amortTravaux      = travaux > 0 ? travaux / 10 : 0
  return amortStructure + amortInstall + amortTravaux
}

export function calculateFiscal(
  params: FiscalParams,
  result: InvestmentResult
): FiscalResult {
  const tmi = params.tmi / 100
  const structure = params.structure ?? 'nom-propre'

  const revBrut = result.revAnnuel
  const charges = result.totalCharges
  const mensualiteTotale = result.mensualiteTotale

  // Intérêts annuels exacts (année 1) : somme des 12 premières mensualités d'intérêts.
  // Le tableau d'amortissement est toujours généré par le calculateur.
  // Fallback conservateur si indisponible : 90% de la mensualité annuelle (prêt début de vie).
  const interetsAnnuels = (() => {
    if (result.montantEmprunte <= 0 || result.mensualiteCredit <= 0) return 0
    if (result.tableauAmortissement && result.tableauAmortissement.length >= 12) {
      return result.tableauAmortissement
        .slice(0, 12)
        .reduce((s, r) => s + r.interetsPaies, 0)
    }
    // Fallback : en début de prêt amortissable, ~90% de la mensualité = intérêts
    return result.mensualiteCredit * 12 * 0.9
  })()

  const amortTotal = calcAmortTotal(params)
  const prixRevient = params.prixRevient

  // Déductions selon type de location
  const isNu     = params.locType === 'nu'
  const isMeuble = !isNu

  const chargesNu      = charges + interetsAnnuels
  const chargesMeuble  = charges + interetsAnnuels + amortTotal

  // Conditions d'éligibilité
  const revMeuble       = isMeuble ? revBrut : 0
  const revNu           = isNu ? revBrut : 0
  const lmnpMicroOk     = revMeuble <= 77700
  const lmpOk           = params.lmpEnabled === true
  const microFoncierOk  = revNu <= 15000

  const regimes: FiscalRegime[] = []

  function push(r: FiscalRegime) { regimes.push(r) }

  // ═══════════════════════════════════════════════════════════
  // NOM PROPRE
  // ═══════════════════════════════════════════════════════════
  if (structure === 'nom-propre') {

    // 1. Micro-foncier
    if (isNu) {
      const base     = Math.max(0, revNu * 0.70)
      const impot    = base * tmi
      const ps       = base * PS
      const net      = revNu - charges - impot - ps
      push({
        id: 'micro-foncier', name: 'Micro-foncier', shortName: 'Micro-F', category: 'foncier',
        revImposable: base, impot, ps, totalFiscal: impot + ps, net,
        cfNet: net / 12 - mensualiteTotale,
        rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
        disabled: !microFoncierOk,
        disabledReason: !microFoncierOk ? `Revenus fonciers > 15 000€ → réel obligatoire` : undefined,
        tag: microFoncierOk ? 'Abat. 30% · Sans comptable' : undefined,
      })
    }

    // 2. Réel foncier
    if (isNu) {
      const base     = Math.max(0, revNu - chargesNu)
      const deficit  = revNu - chargesNu
      const impot    = base * tmi
      const ps       = base * PS
      const net      = revNu - charges - impot - ps
      const deficitDed = deficit < 0 ? Math.min(10700, Math.abs(deficit)) : 0
      push({
        id: 'reel-foncier', name: 'Réel foncier', shortName: 'Réel-F', category: 'foncier',
        revImposable: base, impot, ps, totalFiscal: impot + ps, net,
        cfNet: net / 12 - mensualiteTotale,
        rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
        disabled: false,
        tag: deficitDed > 0 ? `Déficit foncier ${fmt(deficitDed)} imputable` : 'Charges réelles déductibles',
      })
    }

    // 3. LMNP Micro-BIC
    if (isMeuble) {
      const isSaisonnier   = params.locType === 'saisonnier'
      const abatRate       = isSaisonnier ? 0.71 : 0.50
      const seuil          = isSaisonnier ? 188700 : 77700
      const base           = Math.max(0, revMeuble * (1 - abatRate))
      const impot          = base * tmi
      const ps             = base * PS
      const net            = revMeuble - charges - impot - ps
      push({
        id: 'lmnp-micro-bic', name: `LMNP Micro-BIC (${Math.round(abatRate * 100)}%)`, shortName: 'Micro-BIC', category: 'bic',
        revImposable: base, impot, ps, totalFiscal: impot + ps, net,
        cfNet: net / 12 - mensualiteTotale,
        rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
        disabled: !lmnpMicroOk || revMeuble > seuil,
        disabledReason: revMeuble > seuil ? `Recettes > ${seuil.toLocaleString('fr-FR')} €` : undefined,
        tag: `Abat. ${Math.round(abatRate * 100)}% · Sans comptable obligatoire`,
      })
    }

    // 4. LMNP Réel ★
    if (isMeuble) {
      const base           = Math.max(0, revMeuble - chargesMeuble)
      const impot          = base * tmi
      const ps             = base * PS
      const net            = revMeuble - charges - impot - ps
      const amortReporte   = Math.max(0, chargesMeuble - revMeuble)
      push({
        id: 'lmnp-reel', name: 'LMNP Réel (amortissement)', shortName: 'LMNP Réel', category: 'bic',
        revImposable: base, impot, ps, totalFiscal: impot + ps, net,
        cfNet: net / 12 - mensualiteTotale,
        rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
        disabled: false,
        tag: amortReporte > 0 ? `Amort. reporté ${fmt(amortReporte)}` : `Amort. ${fmt(amortTotal)}/an`,
      })
    }

    // 5. LMP
    if (isMeuble) {
      const base           = Math.max(0, revMeuble - chargesMeuble)
      const cotTNS         = revMeuble * 0.35
      const impot          = base * tmi
      const net            = revMeuble - charges - impot - cotTNS
      push({
        id: 'lmp', name: 'LMP — Loueur Meublé Professionnel', shortName: 'LMP', category: 'bic',
        revImposable: base, impot, ps: cotTNS, totalFiscal: impot + cotTNS, net,
        cfNet: net / 12 - mensualiteTotale,
        rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
        disabled: !lmpOk,
        disabledReason: !lmpOk ? 'Recettes > 23 000€ ET > 50% autres revenus requis' : undefined,
        tag: 'Cotisations TNS ~35% incluses',
      })
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SCI À L'IR
  // ═══════════════════════════════════════════════════════════
  if (structure === 'sci-ir') {
    const base     = Math.max(0, revNu - chargesNu)
    const deficit  = revNu - chargesNu
    const impot    = base * tmi
    const ps       = base * PS
    const net      = revNu - charges - impot - ps
    const deficitDed = deficit < 0 ? Math.min(10700, Math.abs(deficit)) : 0
    push({
      id: 'sci-ir', name: "SCI à l'IR — Régime réel", shortName: 'SCI IR', category: 'societe',
      revImposable: base, impot, ps, totalFiscal: impot + ps, net,
      cfNet: net / 12 - mensualiteTotale,
      rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
      disabled: isMeuble,
      disabledReason: isMeuble ? 'SCI IR : location nue uniquement (meublé → IS automatique)' : undefined,
      tag: deficitDed > 0 ? `Déficit ${fmt(deficitDed)} remonte aux associés` : 'Transmission facilitée',
    })
  }

  // ═══════════════════════════════════════════════════════════
  // SCI À L'IS
  // ═══════════════════════════════════════════════════════════
  if (structure === 'sci-is') {
    const loyer      = revBrut
    const chargDed   = charges + interetsAnnuels + amortTotal
    const resultat   = loyer - chargDed
    const is         = calcIS(Math.max(0, resultat))
    const benefApresIs = Math.max(0, resultat - is)

    // Option A — Capitalisation (pas de dividendes)
    {
      const net  = loyer - charges - is
      push({
        id: 'sci-is-capi', name: "SCI IS — Capitalisation", shortName: 'SCI IS (K)', category: 'is',
        revImposable: Math.max(0, resultat), impot: is, ps: 0, totalFiscal: is, net,
        cfNet: net / 12 - mensualiteTotale,
        rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
        disabled: false,
        tag: `Amort. inclus · IS ${is > 0 ? Math.round(is / Math.max(1, loyer) * 100) : 0}%`,
      })
    }

    // Option B — Avec dividendes (flat tax 30%)
    {
      const flatTax  = benefApresIs * 0.30
      const net      = loyer - charges - is - flatTax
      push({
        id: 'sci-is-div', name: "SCI IS — + Dividendes (flat tax 30%)", shortName: 'SCI IS (D)', category: 'is',
        revImposable: Math.max(0, resultat), impot: is, ps: flatTax, totalFiscal: is + flatTax, net,
        cfNet: net / 12 - mensualiteTotale,
        rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
        disabled: false,
        tag: 'IS + Flat tax 30% dividendes',
      })
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SARL DE FAMILLE
  // ═══════════════════════════════════════════════════════════
  if (structure === 'sarl-famille') {

    // A — IR Micro-BIC (abat. 50%)
    {
      const base  = Math.max(0, revMeuble * 0.50)
      const impot = base * tmi
      const ps    = base * PS
      const net   = revMeuble - charges - impot - ps
      push({
        id: 'sarl-ir-micro', name: 'SARL Famille — IR Micro-BIC', shortName: 'SARL Micro', category: 'societe',
        revImposable: base, impot, ps, totalFiscal: impot + ps, net,
        cfNet: net / 12 - mensualiteTotale,
        rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
        disabled: isNu,
        disabledReason: isNu ? 'SARL famille : location meublée uniquement' : undefined,
        tag: 'Option IR · Abat. 50%',
      })
    }

    // B — IR Réel + amortissement ★
    {
      const base  = Math.max(0, revMeuble - chargesMeuble)
      const impot = base * tmi
      const ps    = base * PS
      const net   = revMeuble - charges - impot - ps
      push({
        id: 'sarl-ir-reel', name: 'SARL Famille — IR Réel', shortName: 'SARL Réel', category: 'societe',
        revImposable: base, impot, ps, totalFiscal: impot + ps, net,
        cfNet: net / 12 - mensualiteTotale,
        rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
        disabled: isNu,
        disabledReason: isNu ? 'SARL famille : location meublée uniquement' : undefined,
        tag: `Amort. ${fmt(amortTotal)}/an · Option IR transmissible`,
      })
    }

    // C — IS
    {
      const resultat  = revMeuble - chargesMeuble
      const is        = calcIS(Math.max(0, resultat))
      const benefice  = Math.max(0, resultat - is)
      const remunDir  = Math.min(benefice * 0.5, 30000)
      const cotTNS    = remunDir * 0.45
      const dividende = benefice - remunDir
      const flatTax   = dividende > 0 ? dividende * 0.30 : 0
      const totalFis  = is + cotTNS + flatTax
      const net       = revMeuble - charges - totalFis
      push({
        id: 'sarl-is', name: 'SARL Famille — IS', shortName: 'SARL IS', category: 'is',
        revImposable: Math.max(0, resultat), impot: is, ps: flatTax, totalFiscal: totalFis, net,
        cfNet: net / 12 - mensualiteTotale,
        rendNetNet: prixRevient > 0 ? (net / prixRevient) * 100 : 0,
        disabled: isNu,
        disabledReason: isNu ? 'SARL famille : location meublée uniquement' : undefined,
        tag: 'IS 15% + rémunération dirigeant',
      })
    }
  }

  // ─── Meilleur régime ─────────────────────────────────────────────────────────
  const actifs = regimes.filter((r) => !r.disabled)
  const best   = actifs.length > 0
    ? actifs.reduce((b, r) => r.net > b.net ? r : b, actifs[0])
    : regimes[0]

  return {
    regimes,
    actifs,
    best,
    rendNetNet: prixRevient > 0 ? (best.net / prixRevient) * 100 : 0,
    cfNet: best.cfNet,
    name: best.name,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const TMI_TRANCHES = [
  { min: 0,      max: 11294,  taux: 0  },
  { min: 11294,  max: 28797,  taux: 11 },
  { min: 28797,  max: 82341,  taux: 30 },
  { min: 82341,  max: 177106, taux: 41 },
  { min: 177106, max: Infinity, taux: 45 },
]

// ─── Comparaison des structures d'acquisition ──────────────────────────────
// Pour un même bien, calcule le meilleur régime applicable dans CHAQUE structure
// (nom propre, SCI IR, SCI IS, SARL de famille) afin de comparer les structures
// entre elles — la vraie décision fiscale de l'investisseur.

export type AcquisitionStructure = 'nom-propre' | 'sci-ir' | 'sci-is' | 'sarl-famille'

export interface StructureCompare {
  structure: AcquisitionStructure
  label: string
  bestRegime: string        // nom du meilleur régime applicable
  impotAnnuel: number       // impôt annuel estimé du meilleur régime
  cfNetMensuel: number      // cashflow net d'impôt mensuel
  rendNetNet: number        // rendement net-net (%)
  compatible: boolean       // au moins un régime applicable avec le type de location
  note: string              // avantage / point d'attention clé
}

const STRUCTURE_META: Record<AcquisitionStructure, { label: string; note: string }> = {
  'nom-propre': {
    label: 'Nom propre',
    note: "Le plus simple, idéal pour démarrer. En meublé, le LMNP réel efface souvent l'impôt via l'amortissement.",
  },
  'sci-ir': {
    label: "SCI à l'IR",
    note: 'Location nue uniquement. Facilite la gestion à plusieurs et la transmission, mais pas d’amortissement.',
  },
  'sci-is': {
    label: "SCI à l'IS",
    note: 'Amortit le bien : idéale pour capitaliser. Revente plus lourdement taxée (réintégration des amortissements).',
  },
  'sarl-famille': {
    label: 'SARL de famille',
    note: 'Meublé uniquement, à l’IR avec amortissements. Cadre familial, gestion plus formelle.',
  },
}

export function compareStructures(base: FiscalParams, result: InvestmentResult): StructureCompare[] {
  const order: AcquisitionStructure[] = ['nom-propre', 'sci-ir', 'sci-is', 'sarl-famille']
  const list = order.map((structure) => {
    const fr = calculateFiscal({ ...base, structure }, result)
    const enabled = fr.regimes.filter((r) => !r.disabled)
    const best = enabled.length > 0
      ? enabled.reduce((b, r) => (r.rendNetNet > b.rendNetNet ? r : b), enabled[0])
      : null
    return {
      structure,
      label: STRUCTURE_META[structure].label,
      bestRegime: best?.name ?? 'Incompatible',
      impotAnnuel: best?.impot ?? 0,
      cfNetMensuel: best?.cfNet ?? 0,
      rendNetNet: best?.rendNetNet ?? 0,
      compatible: !!best,
      note: STRUCTURE_META[structure].note,
    }
  })
  // Compatibles d'abord, triés par rendement net-net décroissant
  return list.sort((a, b) => Number(b.compatible) - Number(a.compatible) || b.rendNetNet - a.rendNetNet)
}

export function getTMI(revenuImposable: number): number {
  return [...TMI_TRANCHES].reverse().find((t) => revenuImposable > t.min)?.taux ?? 0
}

export const DEFAULT_FISCAL_PARAMS: Omit<FiscalParams, 'prixAchat' | 'travaux' | 'prixRevient' | 'locType'> = {
  tmi: 30,
  lmpEnabled: false,
  sciIS: false,
  sarlFamille: false,
  structure: 'nom-propre',
  profilFis: 'nouveau',
}
