// ─── Paramètres utilisateur ────────────────────────────────────────────────
//
// Deux namespaces stockés dans profiles.settings (jsonb) :
//   • preferences        — réglages applicatifs (mode d'analyse par défaut…)
//   • calculatorDefaults — valeurs par défaut perso qui pré-remplissent une
//                          nouvelle analyse à la place des DEFAULT_PARAMS.
//
// Source de vérité : Supabase (synchro multi-appareils).
// Miroir localStorage : permet une lecture SYNCHRONE au démarrage de /analyse
// (le formulaire s'initialise sans attendre un round-trip réseau).

import type { InvestmentParams } from './types'

// ─── Champs du calculateur exposés comme défauts personnels ──────────────────
// On ne retient que les hypothèses « transversales » (financement, fiscalité,
// charges) — pas les champs propres à un bien (prix, surface, ville…).
export const CALC_DEFAULT_KEYS = [
  'taux',
  'duree',
  'assuranceTaux',
  'loanType',
  'fraisGarantiePct',
  'fraisDossier',
  'fraisNotaireAuto',
  'locType',
  'tmi',
  'structure',
  'fraisGestionPct',
  'provisionPct',
  'gliPct',
  'vacance',
  'irl',
  'valorisationAnnuelle',
  'horizonRevente',
] as const

export type CalculatorDefaults = Partial<
  Pick<InvestmentParams, (typeof CALC_DEFAULT_KEYS)[number]>
>

export type DefaultAnalysisMode = 'express' | 'expert'

export interface UserPreferences {
  /** Mode d'analyse ouvert par défaut sur /analyse */
  defaultAnalysisMode?: DefaultAnalysisMode
  /** Demander confirmation avant de quitter une analyse non sauvegardée */
  confirmBeforeLeave?: boolean
}

export interface UserSettings {
  preferences: UserPreferences
  calculatorDefaults: CalculatorDefaults
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  preferences: {
    defaultAnalysisMode: 'express',
    confirmBeforeLeave: true,
  },
  calculatorDefaults: {},
}

const LS_KEY = 'immora_settings'

// ─── Normalisation ───────────────────────────────────────────────────────────
// Garantit une forme complète quel que soit le contenu brut (DB ou localStorage).
export function normalizeSettings(raw: unknown): UserSettings {
  const obj = (raw ?? {}) as Partial<UserSettings>
  const prefs = (obj.preferences ?? {}) as UserPreferences
  const calc = (obj.calculatorDefaults ?? {}) as CalculatorDefaults

  // On ne garde que les clés autorisées pour calculatorDefaults
  const cleanedCalc: CalculatorDefaults = {}
  for (const k of CALC_DEFAULT_KEYS) {
    const v = (calc as Record<string, unknown>)[k]
    if (v !== undefined && v !== null) {
      ;(cleanedCalc as Record<string, unknown>)[k] = v
    }
  }

  return {
    preferences: {
      defaultAnalysisMode:
        prefs.defaultAnalysisMode ?? DEFAULT_USER_SETTINGS.preferences.defaultAnalysisMode,
      confirmBeforeLeave:
        prefs.confirmBeforeLeave ?? DEFAULT_USER_SETTINGS.preferences.confirmBeforeLeave,
    },
    calculatorDefaults: cleanedCalc,
  }
}

// ─── Miroir localStorage (lecture synchrone) ─────────────────────────────────
export function readLocalSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_USER_SETTINGS
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_USER_SETTINGS
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_USER_SETTINGS
  }
}

export function writeLocalSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings))
  } catch {
    /* quota / privacy mode — ignore */
  }
}

// ─── Helpers calculateur ─────────────────────────────────────────────────────
/** Applique les défauts perso de l'utilisateur par-dessus une base de params. */
export function applyCalculatorDefaults(
  base: InvestmentParams,
  defaults: CalculatorDefaults | undefined,
): InvestmentParams {
  if (!defaults) return base
  return { ...base, ...defaults }
}
