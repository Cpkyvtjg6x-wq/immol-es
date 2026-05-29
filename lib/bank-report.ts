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

/** Capital empruntable pour une mensualité donnée (inverse de calcMensualite). */
function capitalFromMensualite(mensualite: number, tauxAnnuel: number, dureeAns: number): number {
  if (mensualite <= 0) return 0
  const n = dureeAns * 12
  if (tauxAnnuel <= 0) return mensualite * n
  const r = tauxAnnuel / 100 / 12
  return (mensualite * (1 - Math.pow(1 + r, -n))) / r
}

// Taux d'usure de référence (indicatif) — prêts ≥ 20 ans. À recouper avec la
// publication trimestrielle de la Banque de France.
const TAUX_USURE_REF = 6.5

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

  // ── Revenus combinés (emprunteur + co-emprunteur éventuel) ────────────────
  const revenusCoEmprunteur = (profile.hasCoEmprunteur && profile.coemprunteurRevenus)
    ? profile.coemprunteurRevenus
    : 0
  const revenusFoyer = profile.revenusNetsProFoyer + revenusCoEmprunteur

  // ── Revenus de référence bancaire ──────────────────────────────────────────
  // La banque intègre les loyers futurs à 70 % (méthode prudentielle HCSF)
  const loyerIntegreBanque = loyer * 0.70
  const autresLoyersIntegres = (profile.autresRevenusLocatifs ?? 0) * 0.70
  const revenusReferenceBancaire = revenusFoyer + autresLoyersIntegres

  // ── Taux d'endettement AVANT projet ────────────────────────────────────────
  const chargesAvantProjet = profile.loyerActuel + profile.autresCreditsMensualites
  const tauxEndettementAvant =
    revenusReferenceBancaire > 0
      ? Math.round((chargesAvantProjet / revenusReferenceBancaire) * 1000) / 10
      : 0

  // ── Taux d'endettement APRÈS projet ────────────────────────────────────────
  // Revenus HCSF : salaires + 70 % autres loyers existants + 70 % nouveau loyer
  const revenusAvecNouveauxLoyers = revenusFoyer + autresLoyersIntegres + loyerIntegreBanque
  // Charges HCSF : loyer actuel de la RP (locataire) OU mensualité RP (propriétaire)
  // + autres crédits en cours + nouvelle mensualité d'investissement
  // Le loyer actuel est TOUJOURS compté car la banque ne suppose pas que l'investisseur
  // quitte sa résidence principale pour se logement dans le bien locatif.
  const chargesApresProjet =
    profile.loyerActuel + profile.autresCreditsMensualites + mensualite
  const tauxEndettementApres =
    revenusAvecNouveauxLoyers > 0
      ? Math.round((chargesApresProjet / revenusAvecNouveauxLoyers) * 1000) / 10
      : 0

  // ── Taux de couverture loyer / mensualité ───────────────────────────────────
  const tauxCouverture =
    mensualite > 0 ? Math.round((loyer / mensualite) * 1000) / 10 : 0

  // ── Reste à vivre ──────────────────────────────────────────────────────────
  // Revenus nets du foyer – logement actuel – autres crédits + cashflow net du projet
  // cashflowMensuel = loyer - mensualite - charges/12 (peut être positif ou négatif)
  // Si CF négatif, le projet coûte de l'argent chaque mois → réduit le reste à vivre
  // Si CF positif, le projet génère un revenu net → augmente le reste à vivre
  const resteAVivre =
    revenusFoyer
    + (profile.autresRevenusLocatifs ?? 0)
    - profile.loyerActuel
    - profile.autresCreditsMensualites
    + result.cashflowMensuel

  // Cible empirique : 800 € personne seule, +400 € par part fiscale supplémentaire
  const resteAVivreCible = 800 + Math.max(0, profile.nbParts - 1) * 400

  // ── Saut de charges mensuel ────────────────────────────────────────────────
  // Effort financier NET du projet pour l'emprunteur (définition bancaire standard) :
  // mensualité du nouveau crédit – loyer futur intégré à 70 % (méthode HCSF)
  // Si positif : le projet coûte plus qu'il ne rapporte (effort de l'emprunteur)
  // Si négatif : le projet s'autofinance et dégage un surplus
  const sautCharges = Math.round(mensualite - loyerIntegreBanque)

  // ══════════════════════════════════════════════════════════════════════════
  // CAPACITÉ D'EMPRUNT, APPORT, COÛT DU CRÉDIT, ÂGE & SÉCURITÉ
  // ══════════════════════════════════════════════════════════════════════════
  const taux  = params.taux ?? 0
  const duree = params.duree ?? 20

  // Capacité d'emprunt à 35 % (loyers du projet intégrés à 70 %)
  const mensualiteMax = Math.max(
    0,
    0.35 * revenusAvecNouveauxLoyers - profile.loyerActuel - profile.autresCreditsMensualites,
  )
  const margeMensuelle = Math.round(mensualiteMax - mensualite)
  // Capital indicatif : on intègre l'assurance dans le taux pour rester prudent
  const capitalMax = Math.round(
    capitalFromMensualite(mensualiteMax, taux + (params.assuranceTaux ?? 0), duree),
  )

  // Apport & frais d'acquisition
  const fraisNotaireCalc = Math.max(
    0,
    result.prixRevient - params.prixAchat - (params.travaux ?? 0) - result.fraisBancairesTotal,
  )
  const fraisAcquisition = Math.round(fraisNotaireCalc + result.fraisBancairesTotal)
  const apportPct = result.prixRevient > 0
    ? Math.round((params.apport / result.prixRevient) * 1000) / 10
    : 0
  const apportCouvreFrais = params.apport >= fraisAcquisition

  // TAEG indicatif (taux nominal + assurance + étalement des frais bancaires)
  const fraisSpread = (result.montantEmprunte > 0 && duree > 0)
    ? (result.fraisBancairesTotal / result.montantEmprunte / duree) * 100
    : 0
  const taeg = Math.round((taux + (params.assuranceTaux ?? 0) + fraisSpread) * 100) / 100
  const usureOk = taeg <= TAUX_USURE_REF

  // Âge en fin de prêt (si date de naissance fournie)
  let ageFinPret: number | null = null
  let ageAssuranceOk: boolean | null = null
  if (profile.dateNaissance) {
    const naiss = new Date(profile.dateNaissance)
    if (!isNaN(naiss.getTime())) {
      const ageNow = (Date.now() - naiss.getTime()) / (365.25 * 864e5)
      ageFinPret = Math.round(ageNow + duree)
      ageAssuranceOk = ageFinPret <= 80
    }
  }

  // Durée vs plafond HCSF (25 ans, 27 si travaux ≥ 10 % du coût total)
  const travauxPct = result.prixRevient > 0 ? ((params.travaux ?? 0) / result.prixRevient) * 100 : 0
  const dureeMax = travauxPct >= 10 ? 27 : 25
  const dureeHcsfOk = duree <= dureeMax

  // Épargne de précaution post-acquisition (en mois de mensualité couverts)
  const epargneResiduelle = Math.max(0, profile.epargneTotale - params.apport)
  const epargnePrecautionMois = mensualite > 0 ? Math.round(epargneResiduelle / mensualite) : 0

  // Garantie
  const garantieLabels: Record<string, string> = {
    caution: 'Caution (Crédit Logement)',
    hypotheque: 'Hypothèque',
    ppd: 'Privilège de prêteur de deniers',
  }
  const typeGarantieLabel = garantieLabels[profile.typeGarantie ?? 'caution']
  const coutGarantie = Math.round(result.montantEmprunte * ((params.fraisGarantiePct ?? 0) / 100))

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
      ? Math.round(((profile.loyerActuel + profile.autresCreditsMensualites + mensualiteTotaleStress) / revenusAvecNouveauxLoyers) * 1000) / 10
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

  // Co-emprunteur
  if (profile.hasCoEmprunteur && profile.coemprunteurRevenus && profile.coemprunteurRevenus > 0) {
    pointsForts.push(`Dossier en co-emprunt — revenus combinés de ${revenusFoyer.toLocaleString('fr-FR')} €/mois, ce qui renforce significativement la capacité de remboursement.`)
  }

  // Contrat de travail
  if (profile.typeContrat === 'cdi' || profile.typeContrat === 'fonctionnaire') {
    const coStr = (profile.hasCoEmprunteur && profile.coemprunteurTypeContrat && (profile.coemprunteurTypeContrat === 'cdi' || profile.coemprunteurTypeContrat === 'fonctionnaire'))
      ? ` + co-emprunteur ${profile.coemprunteurTypeContrat === 'cdi' ? 'CDI' : 'Fonctionnaire'}` : ''
    pointsForts.push(`Situation professionnelle stable (${profile.typeContrat === 'cdi' ? 'CDI' : 'Fonctionnaire'}) avec ${profile.anciennetePoste} an${profile.anciennetePoste > 1 ? 's' : ''} d'ancienneté${coStr}.`)
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

  // Apport / frais d'acquisition
  if (!apportCouvreFrais) {
    pointsVigilance.push(`Apport de ${Math.round(params.apport).toLocaleString('fr-FR')} € inférieur aux frais d'acquisition (${fraisAcquisition.toLocaleString('fr-FR')} €) — la banque finance alors plus que le bien, ce qui réduit ses garanties.`)
  } else if (apportPct >= 10) {
    pointsForts.push(`Apport de ${apportPct} % du coût total — couvre les frais d'acquisition, gage de sérieux apprécié des banques.`)
  }

  // Durée HCSF
  if (!dureeHcsfOk) {
    pointsVigilance.push(`Durée de ${duree} ans supérieure au plafond HCSF de ${dureeMax} ans — à ramener dans la limite réglementaire.`)
  }

  // Âge en fin de prêt
  if (ageAssuranceOk === false && ageFinPret !== null) {
    pointsVigilance.push(`Âge en fin de prêt de ${ageFinPret} ans — au-delà de la limite d'assurance emprunteur usuelle (75–80 ans). Prévoir une délégation d'assurance adaptée.`)
  }

  // TAEG / usure
  if (!usureOk) {
    pointsVigilance.push(`TAEG indicatif de ${taeg.toFixed(2)} % proche ou au-dessus du taux d'usure de référence (${TAUX_USURE_REF} %) — vérifier le taux d'usure du trimestre en cours.`)
  }

  // Capacité résiduelle & épargne de précaution
  if (margeMensuelle > 150) {
    pointsForts.push(`Capacité d'endettement résiduelle de ${margeMensuelle.toLocaleString('fr-FR')} €/mois à 35 % — marge confortable pour un futur projet.`)
  }
  if (epargnePrecautionMois >= 6) {
    pointsForts.push(`Épargne de précaution couvrant ${epargnePrecautionMois} mois de mensualités après acquisition — matelas de sécurité solide.`)
  } else if (epargnePrecautionMois < 3) {
    pointsVigilance.push(`Épargne de précaution faible (${epargnePrecautionMois} mois de mensualités) après acquisition — constituer un matelas de sécurité.`)
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
    capaciteEmprunt: {
      mensualiteMax: Math.round(mensualiteMax),
      margeMensuelle,
      capitalMax,
    },
    apportPct,
    fraisAcquisition,
    apportCouvreFrais,
    taeg,
    tauxUsureRef: TAUX_USURE_REF,
    usureOk,
    ageFinPret,
    ageAssuranceOk,
    dureeMax,
    dureeHcsfOk,
    epargnePrecautionMois,
    typeGarantieLabel,
    coutGarantie,
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
