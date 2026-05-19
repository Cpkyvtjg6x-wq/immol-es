import type {
  InvestmentParams,
  InvestmentResult,
  FiscalResult,
  ScoreResult,
  BankReportProfile,
  BankRatios,
} from './types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcMensualite(montant: number, tauxAnnuel: number, dureeAns: number): number {
  if (montant <= 0 || tauxAnnuel <= 0) return montant / (dureeAns * 12)
  const r = tauxAnnuel / 100 / 12
  const n = dureeAns * 12
  return (montant * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

/**
 * Calcule tous les ratios bancaires attendus par un analyste crédit.
 *
 * Méthode bancaire standard France 2026 :
 *  - Intégration des loyers à 70 % dans les revenus (HCSF)
 *  - Taux d'endettement plafonné à 35 % assurance incluse
 *  - Reste à vivre = revenus nets – toutes charges mensuelles
 */
export function calculateBankRatios(
  params: InvestmentParams,
  result: InvestmentResult,
  profile: BankReportProfile,
  fiscal: FiscalResult | null,
  _score: ScoreResult | null,
): BankRatios {

  const mensualite = result.mensualiteTotale
  const loyer = result.loyer

  // ── Revenus de référence bancaire ──────────────────────────────────────────
  // La banque intègre les loyers futurs à 70 % (méthode prudentielle HCSF)
  const loyerIntegreBanque = loyer * 0.70
  const autresLoyersIntegres = (profile.autresRevenusLocatifs ?? 0) * 0.70
  const revenusReferenceBancaire =
    profile.revenusNetsProFoyer + autresLoyersIntegres

  // ── Taux d'endettement AVANT projet ────────────────────────────────────────
  const chargesAvantProjet = profile.loyerActuel + profile.autresCreditsMensualites
  const tauxEndettementAvant =
    revenusReferenceBancaire > 0
      ? Math.round((chargesAvantProjet / revenusReferenceBancaire) * 1000) / 10
      : 0

  // ── Taux d'endettement APRÈS projet ────────────────────────────────────────
  // La banque ajoute la mensualité du nouveau crédit et intègre les futurs loyers
  const revenusAvecNouveauxLoyers =
    profile.revenusNetsProFoyer + autresLoyersIntegres + loyerIntegreBanque
  // Déduit l'ancien loyer si l'investisseur était locataire (sinon il double-compte)
  // Convention : si le saut de charges est positif, l'ancien loyer disparaît
  const chargesApresProjet =
    profile.autresCreditsMensualites + mensualite
    // Note : on retire le loyer actuel car il est remplacé par la mensualité
    // sauf si l'investisseur conserve sa RP (propriétaire) — dans ce cas on garde les deux
  const tauxEndettementApres =
    revenusAvecNouveauxLoyers > 0
      ? Math.round((chargesApresProjet / revenusAvecNouveauxLoyers) * 1000) / 10
      : 0

  // ── Taux de couverture loyer / mensualité ───────────────────────────────────
  const tauxCouverture =
    mensualite > 0 ? Math.round((loyer / mensualite) * 1000) / 10 : 0

  // ── Reste à vivre ──────────────────────────────────────────────────────────
  // Revenus nets – toutes charges mensuelles (logement + crédits + effort épargne projet)
  const effortEpargne = Math.max(0, -result.cashflowMensuel) // si CF négatif → effort mensuel
  const resteAVivre =
    profile.revenusNetsProFoyer
    + (profile.autresRevenusLocatifs ?? 0)
    - profile.autresCreditsMensualites
    - mensualite
    - effortEpargne
    + loyer // les loyers encaissés compensent l'effort

  // Cible empirique : 800 € personne seule, +400 € par part fiscale supplémentaire
  const resteAVivreCible = 800 + Math.max(0, profile.nbParts - 1) * 400

  // ── Saut de charges mensuel ────────────────────────────────────────────────
  // Delta entre la situation mensuelle actuelle et après projet
  // Positif = coût supplémentaire net pour l'emprunteur
  const sautCharges = Math.round(mensualite - loyer - profile.loyerActuel)

  // ══════════════════════════════════════════════════════════════════════════
  // STRESS TESTS
  // ══════════════════════════════════════════════════════════════════════════

  // Stress +1 % sur le taux de crédit
  const tauxStress = (params.taux ?? 0) + 1
  const mensualiteStress = calcMensualite(
    result.montantEmprunte,
    tauxStress,
    params.duree ?? 20,
  )
  const assurStress = (result.montantEmprunte * (params.assuranceTaux ?? 0)) / 100 / 12
  const mensualiteTotaleStress = mensualiteStress + assurStress
  const deltaStress = mensualiteTotaleStress - mensualite
  const cashflowStress = result.cashflowMensuel - deltaStress
  const tauxEndettementStress =
    revenusAvecNouveauxLoyers > 0
      ? Math.round(((profile.autresCreditsMensualites + mensualiteTotaleStress) / revenusAvecNouveauxLoyers) * 1000) / 10
      : 0

  // Stress -10 % sur le loyer
  const loyerStress = loyer * 0.90
  const loyerIntegreBanqueStress = loyerStress * 0.70
  const tauxCouvertureStress = mensualite > 0
    ? Math.round((loyerStress / mensualite) * 1000) / 10
    : 0
  const cashflowLoyerStress = result.cashflowMensuel - (loyer - loyerStress)

  // Stress +2 mois de vacance
  const perteLoyersAnnuelle = loyer * 2
  const cashflowMoyenVacance = result.cashflowMensuel - (perteLoyersAnnuelle / 12)

  // ══════════════════════════════════════════════════════════════════════════
  // POINTS FORTS & VIGILANCE (textuels — en langage banquier)
  // ══════════════════════════════════════════════════════════════════════════
  const pointsForts: string[] = []
  const pointsVigilance: string[] = []

  // Taux d'endettement
  if (tauxEndettementApres <= 30) {
    pointsForts.push(`Taux d'endettement après projet à ${tauxEndettementApres} % — bien en dessous du plafond HCSF de 35 %.`)
  } else if (tauxEndettementApres <= 35) {
    pointsForts.push(`Taux d'endettement après projet à ${tauxEndettementApres} % — dans la limite réglementaire HCSF.`)
  } else {
    pointsVigilance.push(`Taux d'endettement après projet à ${tauxEndettementApres} % — dépasse le plafond HCSF de 35 %. Envisager un apport plus élevé ou une durée plus longue.`)
  }

  // Taux de couverture
  if (tauxCouverture >= 110) {
    pointsForts.push(`Taux de couverture loyer/mensualité à ${tauxCouverture} % — le projet est autofinancé, les loyers dépassent la mensualité.`)
  } else if (tauxCouverture >= 85) {
    pointsForts.push(`Taux de couverture à ${tauxCouverture} % — les loyers couvrent la quasi-totalité de la mensualité.`)
  } else {
    pointsVigilance.push(`Taux de couverture à ${tauxCouverture} % — les loyers ne couvrent pas intégralement la mensualité. L'emprunteur compense sur ses revenus.`)
  }

  // Reste à vivre
  if (resteAVivre >= resteAVivreCible * 1.3) {
    pointsForts.push(`Reste à vivre confortable à ${Math.round(resteAVivre).toLocaleString('fr-FR')} €/mois — largement au-dessus des critères habituels.`)
  } else if (resteAVivre >= resteAVivreCible) {
    pointsForts.push(`Reste à vivre suffisant à ${Math.round(resteAVivre).toLocaleString('fr-FR')} €/mois.`)
  } else {
    pointsVigilance.push(`Reste à vivre estimé à ${Math.round(resteAVivre).toLocaleString('fr-FR')} €/mois — en dessous du seuil recommandé de ${resteAVivreCible.toLocaleString('fr-FR')} €.`)
  }

  // Contrat de travail
  if (profile.typeContrat === 'cdi' || profile.typeContrat === 'fonctionnaire') {
    pointsForts.push(`Situation professionnelle stable (${profile.typeContrat === 'cdi' ? 'CDI' : 'Fonctionnaire'}) avec ${profile.anciennetePoste} an${profile.anciennetePoste > 1 ? 's' : ''} d'ancienneté.`)
  } else if (profile.typeContrat === 'independant') {
    pointsVigilance.push(`Statut indépendant : la banque demandera 3 ans de bilans. Préparer les liasses fiscales N, N-1, N-2.`)
  }

  // Rendement
  if (result.rendBrut >= 6) {
    pointsForts.push(`Rendement brut de ${result.rendBrut.toFixed(1)} % — projet solide pour le marché français.`)
  } else if (result.rendBrut < 4) {
    pointsVigilance.push(`Rendement brut de ${result.rendBrut.toFixed(1)} % — faible. Prévoir une argumentation sur le potentiel de valorisation.`)
  }

  // DPE
  const dpe = params.dpe ?? 'D'
  if (dpe === 'F' || dpe === 'G') {
    pointsVigilance.push(`DPE ${dpe} — passoire thermique. Les banques sont plus prudentes depuis 2024. Joindre un devis de rénovation énergétique.`)
  } else if (dpe === 'A' || dpe === 'B') {
    pointsForts.push(`DPE ${dpe} — excellent niveau énergétique, critère de plus en plus valorisé par les banques.`)
  }

  // Stress test taux
  if (tauxEndettementStress > 35) {
    pointsVigilance.push(`En cas de hausse de +1 % du taux, l'endettement passerait à ${tauxEndettementStress} % — surveiller l'évolution des taux.`)
  } else {
    pointsForts.push(`Le projet résiste à une hausse de +1 % des taux (endettement à ${tauxEndettementStress} %).`)
  }

  // Recommandation finale
  let recommandationBanquier: string
  const nbVigilance = pointsVigilance.length
  if (nbVigilance === 0) {
    recommandationBanquier = `Dossier solide présentant tous les indicateurs en zone favorable. Taux d'endettement maîtrisé, projet autofinancé et profil emprunteur stable. Recommandé pour instruction.`
  } else if (nbVigilance <= 2) {
    recommandationBanquier = `Dossier équilibré avec ${nbVigilance} point${nbVigilance > 1 ? 's' : ''} de vigilance identifié${nbVigilance > 1 ? 's' : ''}. Le projet reste viable avec un cashflow ${result.cashflowMensuel >= 0 ? 'positif' : 'maîtrisé'}. Les points signalés méritent discussion en instruction.`
  } else {
    recommandationBanquier = `Dossier nécessitant une analyse approfondie. Plusieurs points de vigilance identifiés. L'emprunteur dispose d'une épargne résiduelle de ${profile.epargneTotale.toLocaleString('fr-FR')} € pour couvrir les aléas.`
  }

  return {
    tauxEndettementAvant,
    tauxEndettementApres,
    limiteHCSF: 35,
    tauxCouverture,
    loyerIntegreBanque: Math.round(loyerIntegreBanque),
    resteAVivre: Math.round(resteAVivre),
    resteAVivreCible,
    sautCharges,
    stressTaux1Pct: {
      nouvelleMensualite: Math.round(mensualiteTotaleStress),
      deltaVsMensualiteBase: Math.round(deltaStress),
      nouveauCashflow: Math.round(cashflowStress),
      tauxEndettement: tauxEndettementStress,
    },
    stressLoyer10Pct: {
      nouveauLoyer: Math.round(loyerStress),
      nouveauCashflow: Math.round(cashflowLoyerStress),
      tauxCouverture: tauxCouvertureStress,
    },
    stressVacance2Mois: {
      perteLoyersAnnuelle: Math.round(perteLoyersAnnuelle),
      nouveauCashflowMensuelMoyen: Math.round(cashflowMoyenVacance),
    },
    pointsForts,
    pointsVigilance,
    recommandationBanquier,
  }
}

// ─── Label helpers ────────────────────────────────────────────────────────────

export function structureLabel(mode: BankReportProfile['modeAcquisition']): string {
  const map: Record<string, string> = {
    'nom-propre':    'Acquisition en nom propre',
    'sci-ir':        'SCI à l\'impôt sur le revenu (IR)',
    'sci-is':        'SCI à l\'impôt sur les sociétés (IS)',
    'sarl-famille':  'SARL de famille (LMNP/LMP)',
    'holding-sci':   'Montage Holding + SCI',
  }
  return map[mode] ?? mode
}

export function typeContratLabel(t: BankReportProfile['typeContrat']): string {
  const map: Record<string, string> = {
    cdi:          'CDI',
    cdd:          'CDD',
    independant:  'Indépendant / Profession libérale',
    fonctionnaire:'Fonctionnaire',
    retraite:     'Retraité(e)',
    autre:        'Autre',
  }
  return map[t] ?? t
}

export function situationFamLabel(s: BankReportProfile['situationFamiliale']): string {
  const map: Record<string, string> = {
    celibataire: 'Célibataire',
    marie:       'Marié(e)',
    pacse:       'Pacsé(e)',
    divorce:     'Divorcé(e)',
    veuf:        'Veuf/Veuve',
  }
  return map[s] ?? s
}

/** Documents requis selon la structure juridique */
export function documentsRequis(mode: BankReportProfile['modeAcquisition']): string[] {
  const base = [
    "Pièce d'identité en cours de validité",
    "Justificatif de domicile (- 3 mois)",
    "3 derniers bulletins de salaire",
    "2 derniers avis d'imposition",
    "3 derniers relevés bancaires",
    "Justificatif de l'apport personnel",
    "Compromis de vente ou promesse de vente",
    "Estimation locative professionnelle",
    "Devis travaux le cas échéant",
  ]
  const societe: Record<string, string[]> = {
    'sci-ir': [
      "Statuts de la SCI signés",
      "Extrait Kbis ou récépissé de dépôt",
      "Répartition des parts entre associés",
      "Pièce d'identité de chaque associé garant",
      "Justificatifs de revenus des associés garants",
      "Engagement de caution personnelle (modèle bancaire)",
    ],
    'sci-is': [
      "Statuts de la SCI IS",
      "Extrait Kbis",
      "2 derniers bilans comptables (si société existante)",
      "Liasse fiscale 2065 (si société existante)",
      "Business plan prévisionnel 3 ans",
      "Engagement de caution personnelle du gérant",
      "Proposition de nantissement des parts sociales",
    ],
    'sarl-famille': [
      "Statuts de la SARL de famille",
      "Extrait Kbis",
      "Justificatif du lien familial entre associés",
      "2 derniers bilans + comptes de résultat",
      "Liasse fiscale",
      "Engagement de caution des cogérants",
    ],
    'holding-sci': [
      "Organigramme juridique du groupe (Holding → SCI → Bien)",
      "Statuts + Kbis de la Holding",
      "Statuts + Kbis de la SCI",
      "Bilans consolidés ou séparés N, N-1, N-2",
      "Convention de compte courant d'associé",
      "Caution de la Holding ou nantissement des parts SCI",
      "Résolution d'assemblée autorisant l'emprunt",
    ],
  }
  if (mode === 'nom-propre') return base
  return [...base, ...(societe[mode] ?? [])]
}
