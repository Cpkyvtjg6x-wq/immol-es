import { describe, it, expect } from 'vitest'
import { mensualite, capitalRestant } from '../finance'

describe('mensualite (annuité constante)', () => {
  it('200 000 € à 3 % sur 20 ans ≈ 1109,20 €', () => {
    expect(mensualite(200000, 3, 20)).toBeCloseTo(1109.2, 0)
  })
  it('taux 0 → remboursement linéaire (montant / n mois)', () => {
    expect(mensualite(120000, 0, 10)).toBeCloseTo(1000, 6) // 120000 / 120
  })
  it('montant ou durée nuls → 0 (pas de NaN/Infinity)', () => {
    expect(mensualite(0, 3, 20)).toBe(0)
    expect(mensualite(200000, 3, 0)).toBe(0)
  })
})

describe('capitalRestant', () => {
  it('année 0 → capital intégral', () => {
    expect(capitalRestant(200000, 3, 20, 0)).toBeCloseTo(200000, 0)
  })
  it('au terme du prêt → 0', () => {
    expect(capitalRestant(200000, 3, 20, 20)).toBeCloseTo(0, 0)
  })
  it('décroît avec le temps', () => {
    const a5 = capitalRestant(200000, 3, 20, 5)
    const a10 = capitalRestant(200000, 3, 20, 10)
    expect(a10).toBeLessThan(a5)
    expect(a5).toBeLessThan(200000)
  })
  it('taux 0 → amortissement linéaire (moitié à mi-parcours)', () => {
    expect(capitalRestant(200000, 0, 20, 10)).toBeCloseTo(100000, 6)
  })
})
