import { describe, it, expect } from 'vitest'
import { abattementPlusValue, computePlusValueTax } from '../plus-value'

describe('abattementPlusValue (CGI 150 VC)', () => {
  const cases: Array<[number, number, number]> = [
    [5, 0, 0],
    [10, 30, 8.25],
    [21, 96, 26.4],
    [22, 100, 28],
    [25, 100, 55],
    [29, 100, 91],
    [30, 100, 100],
  ]
  it.each(cases)('%i ans → IR %f %% / PS %f %%', (ans, ir, ps) => {
    const a = abattementPlusValue(ans)
    expect(a.abattIR).toBeCloseTo(ir, 2)
    expect(a.abattPS).toBeCloseTo(ps, 2)
  })
})

describe('computePlusValueTax', () => {
  it('plus-value nulle/négative → aucun impôt', () => {
    const t = computePlusValueTax(0, 10)
    expect(t.impotTotal).toBe(0)
    expect(t.surtaxe).toBe(0)
  })

  it('exonération totale à 30 ans (abattements 100 %)', () => {
    const t = computePlusValueTax(150000, 30)
    expect(t.impotTotal).toBe(0)
    expect(t.exonereIR).toBe(true)
    expect(t.exonerePS).toBe(true)
  })

  it('petite plus-value (< 50 000 €) → pas de surtaxe', () => {
    const t = computePlusValueTax(30000, 6)
    expect(t.surtaxe).toBe(0)
    expect(t.impotTotal).toBeGreaterThan(0)
  })

  it('grosse plus-value → surtaxe appliquée (que calculator omettait)', () => {
    const t = computePlusValueTax(200000, 6)
    expect(t.surtaxe).toBeGreaterThan(0)
    // base IR après abattement 6% = 188 000 ; tranche >160k → 4%
    expect(t.surtaxe).toBeCloseTo(188000 * 0.04, 0)
  })
})
