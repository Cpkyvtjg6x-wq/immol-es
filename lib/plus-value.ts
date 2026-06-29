import { PV_TAUX_IR, PV_TAUX_PS } from './fiscal-constants'

/**
 * Plus-value immobilière des particuliers — source unique de vérité.
 *
 * Avant : la logique d'abattement + impôt était dupliquée entre lib/calculator.ts
 * (sans la surtaxe) et app/revente/page.tsx (avec surtaxe). Tout passe désormais ici.
 */

/**
 * Abattements pour durée de détention (CGI art. 150 VC).
 * - IR : 6 %/an de la 6e à la 21e année → exonération à 22 ans.
 * - PS : 1,65 %/an de la 6e à la 21e, 1,60 % la 22e (→ 28 %), 9 %/an de la 23e à la 30e
 *        → exonération à 30 ans.
 */
export function abattementPlusValue(dureeDetention: number): { abattIR: number; abattPS: number } {
  let abattIR = 0
  let abattPS = 0

  if (dureeDetention <= 5) {
    abattIR = 0
  } else if (dureeDetention <= 21) {
    abattIR = (dureeDetention - 5) * 6
  } else {
    abattIR = 100
  }

  if (dureeDetention <= 5) {
    abattPS = 0
  } else if (dureeDetention <= 21) {
    abattPS = (dureeDetention - 5) * 1.65
  } else if (dureeDetention === 22) {
    abattPS = 28
  } else if (dureeDetention <= 30) {
    abattPS = 28 + (dureeDetention - 22) * 9
  } else {
    abattPS = 100
  }

  return { abattIR: Math.min(100, abattIR), abattPS: Math.min(100, abattPS) }
}

export interface PlusValueTax {
  abattIR: number              // abattement IR appliqué (%)
  abattPS: number              // abattement PS appliqué (%)
  baseIR: number               // base imposable après abattement IR
  basePS: number               // base imposable après abattement PS
  impotIR: number              // IR (19 %) + surtaxe
  prelevementsSociaux: number  // PS (17,2 %)
  surtaxe: number              // surtaxe plus-value élevée
  impotTotal: number           // total arrondi
  exonereIR: boolean
  exonerePS: boolean
}

/** Surtaxe sur les plus-values immobilières élevées (CGI art. 1609 nonies G), barème simplifié. */
function surtaxe(plusValueImposable: number, baseIR: number): number {
  if (plusValueImposable > 260000) return baseIR * 0.06
  if (plusValueImposable > 210000) return baseIR * 0.05
  if (plusValueImposable > 160000) return baseIR * 0.04
  if (plusValueImposable > 110000) return baseIR * 0.03
  if (plusValueImposable > 60000)  return baseIR * 0.02
  if (plusValueImposable > 50000)  return baseIR * 0.01
  return 0
}

/**
 * Impôt total sur une plus-value imposable, pour une durée de détention donnée.
 * `plusValueImposable` = plus-value brute (+ amortissements réintégrés en LMNP réel, cf. réforme 2025).
 */
export function computePlusValueTax(plusValueImposable: number, dureeDetention: number): PlusValueTax {
  const { abattIR, abattPS } = abattementPlusValue(dureeDetention)

  if (plusValueImposable <= 0) {
    return {
      abattIR, abattPS, baseIR: 0, basePS: 0,
      impotIR: 0, prelevementsSociaux: 0, surtaxe: 0, impotTotal: 0,
      exonereIR: abattIR >= 100, exonerePS: abattPS >= 100,
    }
  }

  const baseIR = plusValueImposable * (1 - abattIR / 100)
  const basePS = plusValueImposable * (1 - abattPS / 100)
  const impotIRbrut = baseIR > 0 ? baseIR * PV_TAUX_IR : 0
  const ps = basePS > 0 ? basePS * PV_TAUX_PS : 0
  const st = surtaxe(plusValueImposable, baseIR)

  return {
    abattIR, abattPS,
    baseIR: Math.round(baseIR),
    basePS: Math.round(basePS),
    impotIR: Math.round(impotIRbrut + st),
    prelevementsSociaux: Math.round(ps),
    surtaxe: Math.round(st),
    impotTotal: Math.round(impotIRbrut + ps + st),
    exonereIR: abattIR >= 100,
    exonerePS: abattPS >= 100,
  }
}
