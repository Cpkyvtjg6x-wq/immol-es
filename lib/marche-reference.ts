// ─── IMMORA — Base de données marché immobilier FR ───────────────────────────
// Données 2024-2025 — prix m² médian, loyer moyen m²/mois (meublé & nu)
// Sources : MeilleursAgents, DVF, OLAP, ADIL, observatoires locaux

export interface MarcheData {
  prixM2:       number   // Prix m² médian (€) — transactions récentes
  loyerMeuble:  number   // Loyer moyen m²/mois en meublé (€)
  loyerNu:      number   // Loyer moyen m²/mois en nu (€)
  tension:      'forte' | 'moyenne' | 'faible'  // Tension locative
  label?:       string   // Nom affiché
}

export interface MarcheResult extends MarcheData {
  source: 'exact' | 'cp' | 'ville' | 'default'
  villeNorm: string
  cpDetecte?: string
}

// ── Paris — par arrondissement (code postal) ──────────────────────────────────
const PARIS_PAR_CP: Record<string, MarcheData> = {
  '75001': { prixM2: 13500, loyerMeuble: 42, loyerNu: 34, tension: 'forte', label: 'Paris 1er' },
  '75002': { prixM2: 12800, loyerMeuble: 40, loyerNu: 32, tension: 'forte', label: 'Paris 2ème' },
  '75003': { prixM2: 12500, loyerMeuble: 39, loyerNu: 31, tension: 'forte', label: 'Paris 3ème' },
  '75004': { prixM2: 13000, loyerMeuble: 41, loyerNu: 33, tension: 'forte', label: 'Paris 4ème' },
  '75005': { prixM2: 13200, loyerMeuble: 41, loyerNu: 33, tension: 'forte', label: 'Paris 5ème' },
  '75006': { prixM2: 14800, loyerMeuble: 44, loyerNu: 36, tension: 'forte', label: 'Paris 6ème' },
  '75007': { prixM2: 15200, loyerMeuble: 45, loyerNu: 37, tension: 'forte', label: 'Paris 7ème' },
  '75008': { prixM2: 14200, loyerMeuble: 43, loyerNu: 35, tension: 'forte', label: 'Paris 8ème' },
  '75009': { prixM2: 11800, loyerMeuble: 37, loyerNu: 30, tension: 'forte', label: 'Paris 9ème' },
  '75010': { prixM2: 10600, loyerMeuble: 35, loyerNu: 28, tension: 'forte', label: 'Paris 10ème' },
  '75011': { prixM2: 10400, loyerMeuble: 34, loyerNu: 27, tension: 'forte', label: 'Paris 11ème' },
  '75012': { prixM2: 9900,  loyerMeuble: 33, loyerNu: 26, tension: 'forte', label: 'Paris 12ème' },
  '75013': { prixM2: 9400,  loyerMeuble: 31, loyerNu: 25, tension: 'forte', label: 'Paris 13ème' },
  '75014': { prixM2: 9900,  loyerMeuble: 32, loyerNu: 26, tension: 'forte', label: 'Paris 14ème' },
  '75015': { prixM2: 9700,  loyerMeuble: 32, loyerNu: 26, tension: 'forte', label: 'Paris 15ème' },
  '75016': { prixM2: 11400, loyerMeuble: 35, loyerNu: 29, tension: 'forte', label: 'Paris 16ème' },
  '75017': { prixM2: 10700, loyerMeuble: 34, loyerNu: 28, tension: 'forte', label: 'Paris 17ème' },
  '75018': { prixM2: 9600,  loyerMeuble: 32, loyerNu: 26, tension: 'forte', label: 'Paris 18ème' },
  '75019': { prixM2: 8900,  loyerMeuble: 30, loyerNu: 24, tension: 'forte', label: 'Paris 19ème' },
  '75020': { prixM2: 8900,  loyerMeuble: 30, loyerNu: 24, tension: 'forte', label: 'Paris 20ème' },
}

// ── Villes françaises — référentiel normalisé ─────────────────────────────────
// clé = nom normalisé (minuscules, sans accents, sans tirets)
const VILLES: Record<string, MarcheData> = {
  // ── Paris & petite couronne ──────────────────────────────────────────────
  'paris':                 { prixM2: 10400, loyerMeuble: 34, loyerNu: 27, tension: 'forte' },
  'boulognebillancourt':   { prixM2: 9600,  loyerMeuble: 31, loyerNu: 25, tension: 'forte' },
  'neuillysurseine':       { prixM2: 12200, loyerMeuble: 37, loyerNu: 30, tension: 'forte' },
  'levalloisperret':       { prixM2: 9400,  loyerMeuble: 30, loyerNu: 24, tension: 'forte' },
  'courbevoie':            { prixM2: 8100,  loyerMeuble: 27, loyerNu: 22, tension: 'forte' },
  'clichy':                { prixM2: 7100,  loyerMeuble: 26, loyerNu: 21, tension: 'forte' },
  'montrouge':             { prixM2: 8600,  loyerMeuble: 28, loyerNu: 22, tension: 'forte' },
  'vincennes':             { prixM2: 8600,  loyerMeuble: 28, loyerNu: 22, tension: 'forte' },
  'saintmande':            { prixM2: 8500,  loyerMeuble: 27, loyerNu: 22, tension: 'forte' },
  'montreuil':             { prixM2: 5600,  loyerMeuble: 22, loyerNu: 18, tension: 'forte' },
  'nanterre':              { prixM2: 5300,  loyerMeuble: 21, loyerNu: 17, tension: 'forte' },
  'suresnes':              { prixM2: 7000,  loyerMeuble: 24, loyerNu: 20, tension: 'forte' },
  'rueilmalmaison':        { prixM2: 6500,  loyerMeuble: 23, loyerNu: 18, tension: 'forte' },
  'saintgermainenlaye':    { prixM2: 7200,  loyerMeuble: 23, loyerNu: 19, tension: 'forte' },
  'versailles':            { prixM2: 7600,  loyerMeuble: 24, loyerNu: 19, tension: 'forte' },
  'saintdenis':            { prixM2: 3600,  loyerMeuble: 19, loyerNu: 15, tension: 'forte' },
  'ivrysurlaseine':        { prixM2: 5200,  loyerMeuble: 21, loyerNu: 17, tension: 'forte' },
  'vitrysurlaseine':       { prixM2: 4500,  loyerMeuble: 20, loyerNu: 16, tension: 'forte' },
  'creteil':               { prixM2: 4500,  loyerMeuble: 19, loyerNu: 15, tension: 'forte' },
  'saintmaurdesdosses':    { prixM2: 7200,  loyerMeuble: 24, loyerNu: 19, tension: 'forte' },
  'nogentsurmarne':        { prixM2: 7000,  loyerMeuble: 23, loyerNu: 19, tension: 'forte' },
  // ── Grandes métropoles ───────────────────────────────────────────────────
  'lyon':                  { prixM2: 4700,  loyerMeuble: 17, loyerNu: 14, tension: 'forte' },
  'marseille':             { prixM2: 3100,  loyerMeuble: 13, loyerNu: 10, tension: 'moyenne' },
  'bordeaux':              { prixM2: 4400,  loyerMeuble: 16, loyerNu: 13, tension: 'forte' },
  'toulouse':              { prixM2: 3700,  loyerMeuble: 15, loyerNu: 12, tension: 'forte' },
  'nice':                  { prixM2: 5100,  loyerMeuble: 18, loyerNu: 15, tension: 'forte' },
  'nantes':                { prixM2: 4000,  loyerMeuble: 15, loyerNu: 12, tension: 'forte' },
  'strasbourg':            { prixM2: 3400,  loyerMeuble: 14, loyerNu: 11, tension: 'forte' },
  'montpellier':           { prixM2: 3500,  loyerMeuble: 15, loyerNu: 12, tension: 'forte' },
  'rennes':                { prixM2: 3900,  loyerMeuble: 15, loyerNu: 12, tension: 'forte' },
  'lille':                 { prixM2: 3100,  loyerMeuble: 14, loyerNu: 11, tension: 'forte' },
  // ── Villes moyennes ──────────────────────────────────────────────────────
  'grenoble':              { prixM2: 2700,  loyerMeuble: 14, loyerNu: 11, tension: 'forte' },
  'aix-en-provence':       { prixM2: 4900,  loyerMeuble: 17, loyerNu: 14, tension: 'forte' },
  'aixenprovence':         { prixM2: 4900,  loyerMeuble: 17, loyerNu: 14, tension: 'forte' },
  'toulon':                { prixM2: 2900,  loyerMeuble: 13, loyerNu: 10, tension: 'moyenne' },
  'rouen':                 { prixM2: 2700,  loyerMeuble: 12, loyerNu: 10, tension: 'moyenne' },
  'dijon':                 { prixM2: 2500,  loyerMeuble: 12, loyerNu: 9,  tension: 'moyenne' },
  'angers':                { prixM2: 3100,  loyerMeuble: 13, loyerNu: 10, tension: 'forte' },
  'reims':                 { prixM2: 2400,  loyerMeuble: 12, loyerNu: 9,  tension: 'moyenne' },
  'tours':                 { prixM2: 2700,  loyerMeuble: 12, loyerNu: 10, tension: 'moyenne' },
  'nimes':                 { prixM2: 2100,  loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' },
  'metz':                  { prixM2: 2200,  loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' },
  'caen':                  { prixM2: 2500,  loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' },
  'amiens':                { prixM2: 1800,  loyerMeuble: 10, loyerNu: 8,  tension: 'faible' },
  'perpignan':             { prixM2: 1700,  loyerMeuble: 10, loyerNu: 8,  tension: 'faible' },
  'besancon':              { prixM2: 2100,  loyerMeuble: 11, loyerNu: 8,  tension: 'faible' },
  'orleans':               { prixM2: 2400,  loyerMeuble: 12, loyerNu: 9,  tension: 'moyenne' },
  'mulhouse':              { prixM2: 1400,  loyerMeuble: 10, loyerNu: 7,  tension: 'faible' },
  'stetienne':             { prixM2: 1100,  loyerMeuble: 10, loyerNu: 7,  tension: 'faible' },
  'saintetienne':          { prixM2: 1100,  loyerMeuble: 10, loyerNu: 7,  tension: 'faible' },
  'pau':                   { prixM2: 2100,  loyerMeuble: 12, loyerNu: 9,  tension: 'moyenne' },
  'limoges':               { prixM2: 1500,  loyerMeuble: 10, loyerNu: 7,  tension: 'faible' },
  'clermont-ferrand':      { prixM2: 2100,  loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' },
  'clermontferrand':       { prixM2: 2100,  loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' },
  'poitiers':              { prixM2: 2200,  loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' },
  'lemans':                { prixM2: 1900,  loyerMeuble: 11, loyerNu: 8,  tension: 'faible' },
  'avignon':               { prixM2: 2400,  loyerMeuble: 12, loyerNu: 9,  tension: 'moyenne' },
  // ── Côte d'Azur & PACA ───────────────────────────────────────────────────
  'cannes':                { prixM2: 6800,  loyerMeuble: 24, loyerNu: 19, tension: 'forte' },
  'antibes':               { prixM2: 5400,  loyerMeuble: 19, loyerNu: 15, tension: 'forte' },
  'menton':                { prixM2: 4800,  loyerMeuble: 18, loyerNu: 14, tension: 'forte' },
  'monaco':                { prixM2: 48000, loyerMeuble: 90, loyerNu: 75, tension: 'forte' },
  'juan-les-pins':         { prixM2: 5200,  loyerMeuble: 19, loyerNu: 15, tension: 'forte' },
  'villeneuvesurmer':      { prixM2: 7500,  loyerMeuble: 26, loyerNu: 21, tension: 'forte' },
  // ── Pays Basque & Landes ─────────────────────────────────────────────────
  'biarritz':              { prixM2: 7200,  loyerMeuble: 24, loyerNu: 19, tension: 'forte' },
  'bayonne':               { prixM2: 4400,  loyerMeuble: 16, loyerNu: 13, tension: 'forte' },
  'anglet':                { prixM2: 5000,  loyerMeuble: 18, loyerNu: 14, tension: 'forte' },
  // ── Atlantique ───────────────────────────────────────────────────────────
  'larochelle':            { prixM2: 4400,  loyerMeuble: 16, loyerNu: 13, tension: 'forte' },
  'la rochelle':           { prixM2: 4400,  loyerMeuble: 16, loyerNu: 13, tension: 'forte' },
  'rochefort':             { prixM2: 1800,  loyerMeuble: 10, loyerNu: 8,  tension: 'faible' },
  // ── Alpes & Savoie ───────────────────────────────────────────────────────
  'annecy':                { prixM2: 6400,  loyerMeuble: 20, loyerNu: 16, tension: 'forte' },
  'chambery':              { prixM2: 3400,  loyerMeuble: 14, loyerNu: 11, tension: 'forte' },
  'albertville':           { prixM2: 2800,  loyerMeuble: 13, loyerNu: 10, tension: 'moyenne' },
  // ── Bretagne ─────────────────────────────────────────────────────────────
  'brest':                 { prixM2: 2400,  loyerMeuble: 12, loyerNu: 9,  tension: 'moyenne' },
  'quimper':               { prixM2: 2200,  loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' },
  'lorient':               { prixM2: 2300,  loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' },
  'vannes':                { prixM2: 3500,  loyerMeuble: 14, loyerNu: 11, tension: 'forte' },
  'saint-malo':            { prixM2: 4000,  loyerMeuble: 15, loyerNu: 12, tension: 'forte' },
  'saintmalo':             { prixM2: 4000,  loyerMeuble: 15, loyerNu: 12, tension: 'forte' },
  // ── Normandie ────────────────────────────────────────────────────────────
  'deauville':             { prixM2: 5500,  loyerMeuble: 20, loyerNu: 16, tension: 'forte' },
  'lehavre':               { prixM2: 2100,  loyerMeuble: 11, loyerNu: 9,  tension: 'faible' },
  'le havre':              { prixM2: 2100,  loyerMeuble: 11, loyerNu: 9,  tension: 'faible' },
  // ── Alsace ───────────────────────────────────────────────────────────────
  'colmar':                { prixM2: 2600,  loyerMeuble: 12, loyerNu: 9,  tension: 'moyenne' },
}

// ── Normalisation du nom de ville ─────────────────────────────────────────────
export function normaliserVille(ville: string): string {
  return ville
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les accents
    .replace(/[-\s']/g, '')          // supprime tirets, espaces, apostrophes
    .replace(/saint/g, 'st')         // Saint → St (pour la normalisation)
    .trim()
}

// ── Lookup principal ──────────────────────────────────────────────────────────
/**
 * Récupère la référence marché pour une localisation.
 *
 * `quartierTexte` permet d'appliquer un ajustement intra-ville (Mosson −30%,
 * Centre Antigone +20%, etc.). Ce texte peut être un nom de quartier extrait
 * de l'annonce, l'adresse, ou même la description complète : on cherche les
 * alias dedans (cf. lib/quartiers.ts).
 */
export function getMarcheRef(
  ville: string,
  codePostal?: string | null,
  quartierTexte?: string | null,
): MarcheResult {
  const DEFAULT: MarcheData = { prixM2: 3000, loyerMeuble: 12, loyerNu: 10, tension: 'moyenne' }
  let baseResult: MarcheResult

  // 1. Code postal Paris exact
  if (codePostal && /^75\d{3}$/.test(codePostal) && PARIS_PAR_CP[codePostal]) {
    baseResult = { ...PARIS_PAR_CP[codePostal], source: 'cp', villeNorm: 'paris', cpDetecte: codePostal }
    return applyQuartierAdjustment(baseResult, ville, quartierTexte)
  }

  // 2. CP Île-de-France hors Paris → mapping partiel
  if (codePostal) {
    const dept = codePostal.slice(0, 2)
    const idfRef = IDF_PAR_DEPT[dept]
    if (idfRef) {
      baseResult = { ...idfRef, source: 'cp', villeNorm: normaliserVille(ville), cpDetecte: codePostal }
      return applyQuartierAdjustment(baseResult, ville, quartierTexte)
    }
  }

  // 3. Ville exacte
  if (ville) {
    const norm = normaliserVille(ville)
    if (VILLES[norm]) {
      baseResult = { ...VILLES[norm], source: 'exact', villeNorm: norm }
      return applyQuartierAdjustment(baseResult, ville, quartierTexte)
    }

    // Recherche partielle (Paris 11ème → paris)
    for (const [key, data] of Object.entries(VILLES)) {
      if (norm.startsWith(key) || key.startsWith(norm)) {
        baseResult = { ...data, source: 'ville', villeNorm: key }
        return applyQuartierAdjustment(baseResult, ville, quartierTexte)
      }
    }

    // Paris détecté dans le nom
    if (norm.includes('paris')) {
      const arrMatch = ville.match(/(\d{1,2})(?:er|ème|e|eme)/i)
      if (arrMatch) {
        const n = parseInt(arrMatch[1])
        const cp = `750${String(n).padStart(2, '0')}`
        if (PARIS_PAR_CP[cp]) {
          baseResult = { ...PARIS_PAR_CP[cp], source: 'cp', villeNorm: 'paris', cpDetecte: cp }
          return applyQuartierAdjustment(baseResult, ville, quartierTexte)
        }
      }
      baseResult = { ...VILLES['paris']!, source: 'ville', villeNorm: 'paris' }
      return applyQuartierAdjustment(baseResult, ville, quartierTexte)
    }
  }

  // 4. Fallback par département via code postal
  if (codePostal && codePostal.length >= 2) {
    const dept = codePostal.slice(0, 2)
    const deptRef = DEPT_FALLBACK[dept]
    if (deptRef) {
      baseResult = { ...deptRef, source: 'cp', villeNorm: normaliserVille(ville || ''), cpDetecte: codePostal }
      return applyQuartierAdjustment(baseResult, ville, quartierTexte)
    }
  }

  return { ...DEFAULT, source: 'default', villeNorm: normaliserVille(ville || 'inconnue') }
}

// Helper : applique le coefficient quartier sur une ref marché de base.
// Import dynamique pour éviter le cycle de dépendance avec lib/quartiers.
function applyQuartierAdjustment(
  base: MarcheResult,
  ville: string,
  quartierTexte: string | null | undefined,
): MarcheResult {
  if (!quartierTexte) return base
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getQuartierAdjustment } = require('./quartiers') as typeof import('./quartiers')
  const adj = getQuartierAdjustment(ville, quartierTexte)
  if (!adj) return base
  return {
    ...base,
    prixM2:      Math.round(base.prixM2 * adj.coefPrix),
    loyerMeuble: Math.round(base.loyerMeuble * adj.coefLoyer * 10) / 10,
    loyerNu:     Math.round(base.loyerNu    * adj.coefLoyer * 10) / 10,
    tension:     adj.tension ?? base.tension,
    label:       (base.label ? base.label + ' — ' : '') + adj.label,
  }
}

// ── Île-de-France par département ────────────────────────────────────────────
const IDF_PAR_DEPT: Record<string, MarcheData> = {
  '77': { prixM2: 3200, loyerMeuble: 14, loyerNu: 11, tension: 'faible', label: 'Seine-et-Marne' },
  '78': { prixM2: 4500, loyerMeuble: 17, loyerNu: 14, tension: 'moyenne', label: 'Yvelines' },
  '91': { prixM2: 3500, loyerMeuble: 15, loyerNu: 12, tension: 'moyenne', label: 'Essonne' },
  '92': { prixM2: 7500, loyerMeuble: 25, loyerNu: 20, tension: 'forte', label: 'Hauts-de-Seine' },
  '93': { prixM2: 3700, loyerMeuble: 18, loyerNu: 14, tension: 'forte', label: 'Seine-Saint-Denis' },
  '94': { prixM2: 5800, loyerMeuble: 22, loyerNu: 18, tension: 'forte', label: 'Val-de-Marne' },
  '95': { prixM2: 3400, loyerMeuble: 14, loyerNu: 11, tension: 'moyenne', label: "Val-d'Oise" },
}

// ── Fallback par département (toute la France) ────────────────────────────────
const DEPT_FALLBACK: Record<string, MarcheData> = {
  '01': { prixM2: 2800, loyerMeuble: 12, loyerNu: 10, tension: 'moyenne' }, // Ain
  '02': { prixM2: 1600, loyerMeuble: 9,  loyerNu: 7,  tension: 'faible'  }, // Aisne
  '03': { prixM2: 1200, loyerMeuble: 8,  loyerNu: 6,  tension: 'faible'  }, // Allier
  '06': { prixM2: 5000, loyerMeuble: 18, loyerNu: 14, tension: 'forte'   }, // Alpes-Maritimes
  '09': { prixM2: 1100, loyerMeuble: 8,  loyerNu: 6,  tension: 'faible'  }, // Ariège
  '13': { prixM2: 3500, loyerMeuble: 14, loyerNu: 11, tension: 'moyenne' }, // Bouches-du-Rhône
  '14': { prixM2: 2500, loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' }, // Calvados
  '17': { prixM2: 3200, loyerMeuble: 13, loyerNu: 10, tension: 'moyenne' }, // Charente-Maritime
  '21': { prixM2: 2400, loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' }, // Côte-d'Or
  '22': { prixM2: 2000, loyerMeuble: 10, loyerNu: 8,  tension: 'faible'  }, // Côtes-d'Armor
  '25': { prixM2: 2200, loyerMeuble: 11, loyerNu: 8,  tension: 'moyenne' }, // Doubs
  '26': { prixM2: 2300, loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' }, // Drôme
  '29': { prixM2: 2200, loyerMeuble: 11, loyerNu: 8,  tension: 'moyenne' }, // Finistère
  '30': { prixM2: 2100, loyerMeuble: 11, loyerNu: 8,  tension: 'moyenne' }, // Gard
  '31': { prixM2: 3600, loyerMeuble: 14, loyerNu: 11, tension: 'forte'   }, // Haute-Garonne
  '33': { prixM2: 4200, loyerMeuble: 15, loyerNu: 12, tension: 'forte'   }, // Gironde
  '34': { prixM2: 3400, loyerMeuble: 14, loyerNu: 11, tension: 'forte'   }, // Hérault
  '35': { prixM2: 3700, loyerMeuble: 14, loyerNu: 11, tension: 'forte'   }, // Ille-et-Vilaine
  '38': { prixM2: 2800, loyerMeuble: 13, loyerNu: 10, tension: 'forte'   }, // Isère
  '40': { prixM2: 3500, loyerMeuble: 14, loyerNu: 11, tension: 'forte'   }, // Landes
  '42': { prixM2: 1200, loyerMeuble: 10, loyerNu: 7,  tension: 'faible'  }, // Loire
  '44': { prixM2: 3800, loyerMeuble: 14, loyerNu: 11, tension: 'forte'   }, // Loire-Atlantique
  '45': { prixM2: 2400, loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' }, // Loiret
  '49': { prixM2: 3000, loyerMeuble: 12, loyerNu: 10, tension: 'moyenne' }, // Maine-et-Loire
  '51': { prixM2: 2300, loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' }, // Marne
  '54': { prixM2: 1800, loyerMeuble: 10, loyerNu: 8,  tension: 'faible'  }, // Meurthe-et-Moselle
  '56': { prixM2: 2800, loyerMeuble: 13, loyerNu: 10, tension: 'moyenne' }, // Morbihan
  '57': { prixM2: 2100, loyerMeuble: 11, loyerNu: 8,  tension: 'faible'  }, // Moselle
  '59': { prixM2: 3000, loyerMeuble: 13, loyerNu: 10, tension: 'forte'   }, // Nord
  '60': { prixM2: 2200, loyerMeuble: 10, loyerNu: 8,  tension: 'faible'  }, // Oise
  '62': { prixM2: 1700, loyerMeuble: 9,  loyerNu: 7,  tension: 'faible'  }, // Pas-de-Calais
  '63': { prixM2: 2000, loyerMeuble: 10, loyerNu: 8,  tension: 'faible'  }, // Puy-de-Dôme
  '64': { prixM2: 3800, loyerMeuble: 14, loyerNu: 11, tension: 'forte'   }, // Pyrénées-Atlantiques
  '67': { prixM2: 3300, loyerMeuble: 14, loyerNu: 11, tension: 'forte'   }, // Bas-Rhin
  '68': { prixM2: 2500, loyerMeuble: 12, loyerNu: 9,  tension: 'moyenne' }, // Haut-Rhin
  '69': { prixM2: 4500, loyerMeuble: 16, loyerNu: 13, tension: 'forte'   }, // Rhône
  '74': { prixM2: 5500, loyerMeuble: 18, loyerNu: 15, tension: 'forte'   }, // Haute-Savoie
  '75': { prixM2: 10400, loyerMeuble: 34, loyerNu: 27, tension: 'forte'  }, // Paris
  '76': { prixM2: 2600, loyerMeuble: 11, loyerNu: 9,  tension: 'moyenne' }, // Seine-Maritime
  '80': { prixM2: 1700, loyerMeuble: 9,  loyerNu: 7,  tension: 'faible'  }, // Somme
  '83': { prixM2: 3800, loyerMeuble: 15, loyerNu: 12, tension: 'forte'   }, // Var
  '84': { prixM2: 2800, loyerMeuble: 12, loyerNu: 10, tension: 'moyenne' }, // Vaucluse
  '85': { prixM2: 2800, loyerMeuble: 12, loyerNu: 10, tension: 'moyenne' }, // Vendée
  '86': { prixM2: 1900, loyerMeuble: 10, loyerNu: 8,  tension: 'faible'  }, // Vienne
  '87': { prixM2: 1600, loyerMeuble: 9,  loyerNu: 7,  tension: 'faible'  }, // Haute-Vienne
  '971': { prixM2: 2200, loyerMeuble: 12, loyerNu: 9, tension: 'faible'  }, // Guadeloupe
  '972': { prixM2: 2000, loyerMeuble: 11, loyerNu: 9, tension: 'faible'  }, // Martinique
  '973': { prixM2: 1500, loyerMeuble: 9,  loyerNu: 7, tension: 'faible'  }, // Guyane
  '974': { prixM2: 2500, loyerMeuble: 12, loyerNu: 10, tension: 'moyenne' }, // La Réunion
}

// ── Calcul des ajustements liés aux aménités ──────────────────────────────────
export interface Amenities {
  parking?:   boolean
  cave?:      boolean
  balcon?:    boolean
  terrasse?:  boolean
  jardin?:    boolean
  ascenseur?: boolean
  piscine?:   boolean
  gardien?:   boolean
  calme?:     boolean
  lumineux?:  boolean
}

export function getAmeniteAdjustment(
  amenities: Amenities | undefined,
  surface: number,
  etage: number | null | undefined,
  etat: string | null | undefined
): { loyerBonus: number; prixBonus: number; details: string[] } {
  if (!amenities) return { loyerBonus: 0, prixBonus: 0, details: [] }

  let loyerBonus = 0 // en €/mois
  let prixBonus  = 0 // en % du prix
  const details: string[] = []

  if (amenities.parking) {
    loyerBonus += surface <= 30 ? 30 : surface <= 60 ? 50 : 80
    prixBonus  += 2.5
    details.push('Parking (+2.5% prix)')
  }
  if (amenities.terrasse) {
    loyerBonus += 40
    prixBonus  += 3
    details.push('Terrasse (+3% prix)')
  }
  if (amenities.jardin) {
    loyerBonus += 60
    prixBonus  += 4
    details.push('Jardin (+4% prix)')
  }
  if (amenities.balcon) {
    loyerBonus += 20
    prixBonus  += 1.5
    details.push('Balcon (+1.5% prix)')
  }
  if (amenities.piscine) {
    loyerBonus += 80
    prixBonus  += 5
    details.push('Piscine (+5% prix)')
  }
  if (amenities.cave) {
    loyerBonus += 10
    prixBonus  += 0.5
  }
  if (amenities.gardien) {
    loyerBonus += 15
    prixBonus  += 1
  }
  if (amenities.calme) {
    loyerBonus += 20
    prixBonus  += 1.5
    details.push('Environnement calme (+1.5%)')
  }
  if (amenities.lumineux) {
    loyerBonus += 15
    prixBonus  += 1
  }

  // Étage : RDC et dernier étage sans ascenseur impactent négativement
  if (etage === 0) {
    loyerBonus -= 20
    prixBonus  -= 1.5
    details.push('RDC (−1.5% prix)')
  } else if (etage !== null && etage !== undefined && etage >= 4 && !amenities.ascenseur) {
    loyerBonus -= 25
    prixBonus  -= 2
    details.push('Étage élevé sans ascenseur (−2%)')
  }

  // État du bien
  if (etat === 'neuf') {
    loyerBonus += surface * 0.3  // ~30 centimes/m²/mois en plus
    prixBonus  += 10
    details.push('Neuf/VEFA (+10% prix)')
  } else if (etat === 'refait') {
    loyerBonus += surface * 0.1
    prixBonus  += 3
    details.push('Rénové (+3% prix)')
  } else if (etat === 'travaux') {
    loyerBonus -= surface * 0.1
    prixBonus  -= 5
    details.push('Travaux à prévoir (−5% prix)')
  }

  return {
    loyerBonus: Math.round(loyerBonus),
    prixBonus:  Math.round(prixBonus * 10) / 10,
    details,
  }
}

// ── Calcul du loyer marché estimé ─────────────────────────────────────────────
export function estimerLoyerMarche(
  surface: number,
  locType: 'meuble' | 'nu' | 'coloc' | 'saisonnier',
  marcheRef: MarcheData,
  amenities?: Amenities,
  etage?: number | null,
  etat?: string | null,
  nbPieces?: number | null
): number {
  const loyerM2 = locType === 'nu' ? marcheRef.loyerNu : marcheRef.loyerMeuble

  // Ajustement surface : grand logement = loyer/m² plus bas, petit = plus haut
  let coefSurface = 1
  if (surface <= 20) coefSurface = 1.25       // studios très chers au m²
  else if (surface <= 35) coefSurface = 1.12
  else if (surface <= 50) coefSurface = 1.05
  else if (surface >= 80) coefSurface = 0.92
  else if (surface >= 120) coefSurface = 0.85

  const loyerBase = surface * loyerM2 * coefSurface
  const adj = getAmeniteAdjustment(amenities, surface, etage, etat)

  let loyer = loyerBase + adj.loyerBonus

  // Colocation : loyer total estimé (par chambre × nb chambres)
  if (locType === 'coloc' && nbPieces && nbPieces > 1) {
    const loyerParChambre = Math.round(loyer / (nbPieces - 1)) // -1 pour le salon
    loyer = loyerParChambre * (nbPieces - 1)
  }

  return Math.max(Math.round(loyer), 1)
}

// ── Positionnement marché ─────────────────────────────────────────────────────
export type PositionnementMarche = 'opportunite' | 'attractif' | 'correct' | 'surevalue' | 'tres-surevalue'

export function getPositionnementMarche(
  prixAchat: number,
  surface: number,
  marcheRef: MarcheData
): { positionnement: PositionnementMarche; prixM2Bien: number; prixM2Ref: number; ecartPct: number; label: string } {
  const prixM2Bien = Math.round(prixAchat / surface)
  const prixM2Ref  = marcheRef.prixM2
  const ecartPct   = Math.round(((prixM2Bien - prixM2Ref) / prixM2Ref) * 100)

  let positionnement: PositionnementMarche
  let label: string

  if (ecartPct <= -15) {
    positionnement = 'opportunite'
    label = `Opportunité — ${Math.abs(ecartPct)}% sous le marché`
  } else if (ecartPct <= -5) {
    positionnement = 'attractif'
    label = `Attractif — ${Math.abs(ecartPct)}% sous le marché`
  } else if (ecartPct <= 10) {
    positionnement = 'correct'
    label = ecartPct <= 0 ? 'Dans la moyenne du marché' : `${ecartPct}% au-dessus du marché`
  } else if (ecartPct <= 25) {
    positionnement = 'surevalue'
    label = `Surévalué de ${ecartPct}% vs le marché`
  } else {
    positionnement = 'tres-surevalue'
    label = `Très surévalué (+${ecartPct}% vs le marché)`
  }

  return { positionnement, prixM2Bien, prixM2Ref, ecartPct, label }
}
