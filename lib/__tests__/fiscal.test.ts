import { describe, it, expect } from 'vitest'
import { calculateInvestment, DEFAULT_PARAMS } from '../calculator'
import { calculateFiscal, getTMI, TMI_TRANCHES } from '../fiscal'
import type { InvestmentParams, FiscalParams } from '../types'

function invest(over: Partial<InvestmentParams> = {}): InvestmentParams {
  return {
    ...DEFAULT_PARAMS,
    prixAchat: 200000,
    fraisNotaire: 16000,
    travaux: 0,
    apport: 40000,
    taux: 3,
    duree: 20,
    assuranceTaux: 0.1,
    locType: 'meuble',
    loyerMeuble: 1000,
    vacance: 0,
    taxeFonciere: 1200,
    provisionPct: 0,
    tmi: 30,
    ...over,
  }
}

function fiscalParams(p: InvestmentParams, prixRevient: number, over: Partial<FiscalParams> = {}): FiscalParams {
  return {
    tmi: p.tmi,
    prixAchat: p.prixAchat,
    travaux: p.travaux,
    prixRevient,
    locType: p.locType,
    lmpEnabled: false,
    sciIS: false,
    sarlFamille: false,
    structure: 'nom-propre',
    profilFis: 'nouveau',
    ...over,
  }
}

describe('barème TMI', () => {
  it('getTMI place le revenu dans la bonne tranche', () => {
    expect(getTMI(10000)).toBe(0)
    expect(getTMI(20000)).toBe(11)
    expect(getTMI(50000)).toBe(30)
    expect(getTMI(100000)).toBe(41)
    expect(getTMI(200000)).toBe(45)
  })
  it('les tranches 2025 sont présentes', () => {
    expect(TMI_TRANCHES.map((t) => t.taux)).toEqual([0, 11, 30, 41, 45])
  })
})

describe('régimes nom propre meublé', () => {
  const p = invest()
  const r = calculateInvestment(p)
  const f = calculateFiscal(fiscalParams(p, r.prixRevient), r)

  it('expose les régimes meublés (micro-BIC, LMNP réel, LMP)', () => {
    const ids = f.regimes.map((x) => x.id)
    expect(ids).toContain('lmnp-micro-bic')
    expect(ids).toContain('lmnp-reel')
    expect(ids).toContain('lmp')
  })

  it('micro-BIC : abattement 50 % → base imposable = 50 % des recettes', () => {
    const micro = f.regimes.find((x) => x.id === 'lmnp-micro-bic')!
    expect(micro.revImposable).toBeCloseTo(r.revAnnuel * 0.5, 0)
  })

  it('un meilleur régime non désactivé est sélectionné', () => {
    expect(f.best).toBeTruthy()
    expect(f.best.disabled).toBeFalsy()
  })
})

describe('LMP — cotisations TNS sur le bénéfice, pas sur le brut (A4)', () => {
  // Scénario où l'amortissement efface le bénéfice → cotisations au minimum
  // forfaitaire (~1 200 €), et surtout PAS 35 % des recettes brutes (~4 200 €).
  const p = invest({ loyerMeuble: 1000, travaux: 20000 })
  const r = calculateInvestment(p)
  const f = calculateFiscal(fiscalParams(p, r.prixRevient), r)
  const lmp = f.regimes.find((x) => x.id === 'lmp')!

  it('les cotisations TNS ne sont pas 35 % des recettes brutes', () => {
    const brut = r.revAnnuel
    expect(lmp.ps).toBeLessThan(brut * 0.35 - 100) // strictement sous l’ancienne formule
  })

  it('les cotisations TNS respectent le minimum forfaitaire (~1 200 €)', () => {
    expect(lmp.ps).toBeGreaterThanOrEqual(1200)
    expect(lmp.ps).toBeLessThan(3000) // bénéfice ~0 → proche du minimum
  })
})

describe('cohérence générale', () => {
  it('aucun champ fiscal n’est NaN', () => {
    const p = invest()
    const r = calculateInvestment(p)
    const f = calculateFiscal(fiscalParams(p, r.prixRevient), r)
    for (const reg of f.regimes) {
      expect(Number.isFinite(reg.net)).toBe(true)
      expect(Number.isFinite(reg.impot)).toBe(true)
      expect(Number.isFinite(reg.cfNet)).toBe(true)
    }
  })
})
