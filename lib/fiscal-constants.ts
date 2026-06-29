/**
 * Constantes fiscales françaises (barème 2025) — source unique de vérité.
 *
 * Ces valeurs sont révisées chaque année par la loi de finances. Les centraliser
 * ici évite les oublis lors des mises à jour : elles étaient auparavant dispersées
 * en littéraux dans fiscal.ts, calculator.ts et renovation.ts.
 */

// ── Prélèvements sociaux ──────────────────────────────────────────────────────
export const PRELEVEMENTS_SOCIAUX = 0.172            // 17,2 %

// ── Impôt sur les sociétés (IS) ───────────────────────────────────────────────
export const IS_SEUIL_TAUX_REDUIT = 42500            // € de bénéfice
export const IS_TAUX_REDUIT = 0.15                   // 15 % jusqu'au seuil
export const IS_TAUX_NORMAL = 0.25                   // 25 % au-delà

// ── Régimes micro & seuils de recettes ────────────────────────────────────────
export const MICRO_FONCIER_PLAFOND = 15000           // € — au-delà : réel obligatoire
export const MICRO_FONCIER_ABATTEMENT = 0.30         // 30 %
export const MICRO_BIC_PLAFOND = 77700               // € — meublé classique
export const MICRO_BIC_SAISONNIER_PLAFOND = 188700   // € — meublé de tourisme classé
export const MICRO_BIC_ABATTEMENT = 0.50             // 50 %
export const MICRO_BIC_SAISONNIER_ABATTEMENT = 0.71  // 71 % (tourisme classé)

// ── LMNP réel ─────────────────────────────────────────────────────────────────
export const PART_AMORTISSABLE = 0.85                // 85 % (terrain ~15 % non amortissable)

// ── Déficit foncier ───────────────────────────────────────────────────────────
export const DEFICIT_FONCIER_PLAFOND = 10700         // €/an imputable sur le revenu global

// ── LMP ───────────────────────────────────────────────────────────────────────
export const LMP_SEUIL_RECETTES = 23000              // €/an (et > 50 % des revenus du foyer)

// ── Cotisations sociales TNS (approximation) ──────────────────────────────────
export const COT_TNS_TAUX = 0.35                     // ~35 % du bénéfice
export const COT_TNS_MIN_LMP = 1200                  // minimum forfaitaire annuel (ordre de grandeur)

// ── Plus-value immobilière des particuliers ───────────────────────────────────
export const PV_TAUX_IR = 0.19                       // 19 %
export const PV_TAUX_PS = PRELEVEMENTS_SOCIAUX       // 17,2 %
