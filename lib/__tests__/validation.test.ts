import { describe, it, expect } from 'vitest'
import {
  validate, jsonByteSize,
  quickAnalysisSchema, photoAnalysisSchema, aiAnalyseSchema, simulationSaveSchema,
} from '../validation'

describe('jsonByteSize', () => {
  it('mesure la taille sérialisée', () => {
    expect(jsonByteSize({ a: 1 })).toBeGreaterThan(0)
    expect(jsonByteSize(null)).toBeGreaterThan(0)
  })
})

describe('quickAnalysisSchema', () => {
  it('rejette un prixAchat manquant ou <= 0', () => {
    expect(validate(quickAnalysisSchema, {}).ok).toBe(false)
    expect(validate(quickAnalysisSchema, { prixAchat: 0 }).ok).toBe(false)
    expect(validate(quickAnalysisSchema, { prixAchat: -5 }).ok).toBe(false)
  })
  it('rejette une description abusive (> 5000 car.)', () => {
    expect(validate(quickAnalysisSchema, { prixAchat: 200000, description: 'x'.repeat(5001) }).ok).toBe(false)
  })
  it('accepte un payload valide et laisse passer les champs additionnels', () => {
    const r = validate(quickAnalysisSchema, { prixAchat: 200000, ville: 'Lyon', amenities: { balcon: true } })
    expect(r.ok).toBe(true)
    if (r.ok) expect((r.data as Record<string, unknown>).amenities).toBeTruthy()
  })
})

describe('photoAnalysisSchema', () => {
  it('rejette imageUrls vide, > 5, ou non-URL', () => {
    expect(validate(photoAnalysisSchema, { imageUrls: [] }).ok).toBe(false)
    expect(validate(photoAnalysisSchema, { imageUrls: Array(6).fill('https://x.com/a.jpg') }).ok).toBe(false)
    expect(validate(photoAnalysisSchema, { imageUrls: ['pas-une-url'] }).ok).toBe(false)
  })
  it('accepte 1 à 5 URLs valides', () => {
    expect(validate(photoAnalysisSchema, { imageUrls: ['https://cdn.seloger.com/a.jpg'] }).ok).toBe(true)
  })
})

describe('aiAnalyseSchema', () => {
  it('exige params.prixAchat positif', () => {
    expect(validate(aiAnalyseSchema, { params: {} }).ok).toBe(false)
    expect(validate(aiAnalyseSchema, { params: { prixAchat: 250000 } }).ok).toBe(true)
  })
})

describe('simulationSaveSchema', () => {
  it('exige name (1-200) et params objet', () => {
    expect(validate(simulationSaveSchema, { params: {} }).ok).toBe(false)
    expect(validate(simulationSaveSchema, { name: '', params: {} }).ok).toBe(false)
    expect(validate(simulationSaveSchema, { name: 'Bien Lyon', params: { prixAchat: 200000 } }).ok).toBe(true)
  })
})
