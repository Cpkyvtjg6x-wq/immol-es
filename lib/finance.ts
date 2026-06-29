/**
 * Formules financières de prêt — source unique de vérité.
 *
 * Jusqu'ici la formule d'annuité et le capital restant dû étaient réécrits à la
 * main dans calculator.ts, bank-report.ts, CalculateurForm.tsx, OnboardingWizard.tsx…
 * (risque de divergence des chiffres entre écrans). Tout doit désormais passer par ici.
 *
 * Conventions : montants en euros, taux en pourcentage simple (3.5 = 3,5 %).
 */

/** Mensualité d'un prêt amortissable (annuité constante). Taux 0 → remboursement linéaire. */
export function mensualite(montant: number, tauxAnnuelPct: number, dureeAns: number): number {
  if (montant <= 0 || dureeAns <= 0) return 0
  const n = dureeAns * 12
  if (tauxAnnuelPct <= 0) return montant / n
  const r = tauxAnnuelPct / 100 / 12
  return (montant * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

/**
 * Capital restant dû après `anneesEcoulees` années sur un prêt amortissable.
 * Taux 0 → amortissement linéaire. Borné à [0, montant].
 */
export function capitalRestant(
  montant: number,
  tauxAnnuelPct: number,
  dureeAns: number,
  anneesEcoulees: number,
): number {
  if (montant <= 0 || dureeAns <= 0) return 0
  const n = dureeAns * 12
  const mois = Math.min(Math.max(0, anneesEcoulees) * 12, n)
  if (tauxAnnuelPct <= 0) return Math.max(0, montant - (montant / n) * mois)
  const r = tauxAnnuelPct / 100 / 12
  return Math.max(0, montant * ((Math.pow(1 + r, n) - Math.pow(1 + r, mois)) / (Math.pow(1 + r, n) - 1)))
}
