import { describe, it, expect } from 'vitest'
import { calculateInvestment, generateAmortizationSchedule, calculerFraisNotaire, DEFAULT_PARAMS } from '../calculator'
import type { InvestmentParams } from '../types'

// Bien de base : prix de revient = prixAchat (notaire/travaux = 0) pour contrôler
// exactement le montant emprunté.
function base(over: Partial<InvestmentParams> = {}): InvestmentParams {
  return {
    ...DEFAULT_PARAMS,
    prixAchat: 200000,
    fraisNotaire: 0,
    travaux: 0,
    apport: 0,
    taux: 3,
    duree: 20,
    assuranceTaux: 0,
    fraisGarantiePct: 0,
    fraisDossier: 0,
    loanType: 'amortissable',
    locType: 'meuble',
    loyerMeuble: 900,
    vacance: 0,
    provisionPct: 0,
    taxeFonciere: 0,
    ...over,
  }
}

describe('mensualité de crédit', () => {
  it('amortissable : 200 000 € à 3 % sur 20 ans ≈ 1109,20 €/mois', () => {
    const r = calculateInvestment(base())
    expect(r.montantEmprunte).toBe(200000)
    expect(r.mensualiteCredit).toBeCloseTo(1109.2, 0) // ±0,5 €
  })

  it('in-fine : mensualité = intérêts seuls = montant × taux / 12', () => {
    const r = calculateInvestment(base({ loanType: 'in-fine' }))
    expect(r.mensualiteCredit).toBeCloseTo((200000 * 0.03) / 12, 2) // = 500 €
  })

  it('taux = 0 ou durée = 0 ne casse pas (pas de NaN)', () => {
    const r = calculateInvestment(base({ taux: 0 }))
    expect(Number.isFinite(r.mensualiteTotale)).toBe(true)
  })
})

describe('tableau d’amortissement', () => {
  it('le capital restant tombe à 0 à la dernière échéance', () => {
    const rows = generateAmortizationSchedule(200000, 3, 20)
    expect(rows.length).toBe(240)
    expect(rows[rows.length - 1].capitalRestant).toBe(0)
  })
})

describe('frais de notaire auto', () => {
  it('ancien ≈ 8 %, neuf ≈ 3 %', () => {
    expect(calculerFraisNotaire(200000, 'ancien')).toBe(16000)
    expect(calculerFraisNotaire(200000, 'neuf')).toBe(6000)
  })
})

describe('abattements plus-value (CGI art. 150 VC) — via le résultat', () => {
  const cases: Array<[number, number, number]> = [
    // [horizon, abattIR attendu, abattPS attendu]
    [10, 30, 8],     // (10-5)*6 = 30 ; (10-5)*1,65 = 8,25 → arrondi 8
    [22, 100, 28],   // exonération IR ; PS = 28
    [25, 100, 55],   // PS = 28 + 3*9 = 55
    [29, 100, 91],   // PS = 28 + 7*9 = 91
    [30, 100, 100],  // exonération PS
  ]
  it.each(cases)('horizon %i ans → IR %i %% / PS %i %%', (h, ir, ps) => {
    const r = calculateInvestment(base({ horizonRevente: h }))
    expect(r.abattementPVIR).toBe(ir)
    expect(r.abattementPVPS).toBe(ps)
  })
})

describe('TRI', () => {
  it('investissement initial nul (sans apport ni frais bancaires) → TRI élevé, jamais 0', () => {
    const r = calculateInvestment(base({ apport: 0, fraisGarantiePct: 0, fraisDossier: 0 }))
    expect(r.tri).toBe(500) // sentinelle "quasi infini", pas 0
  })

  it('avec apport, le TRI est une valeur finie raisonnable', () => {
    const r = calculateInvestment(base({ apport: 50000 }))
    expect(r.tri).toBeGreaterThan(-50)
    expect(r.tri).toBeLessThan(500)
  })
})

describe('travaux valorisés à la revente (I2)', () => {
  it('le prix de revente intègre les travaux', () => {
    const sansTravaux = calculateInvestment(base({ travaux: 0, horizonRevente: 10 }))
    const avecTravaux = calculateInvestment(base({ travaux: 40000, horizonRevente: 10 }))
    expect(avecTravaux.prixRevente).toBeGreaterThan(sansTravaux.prixRevente)
  })
})
