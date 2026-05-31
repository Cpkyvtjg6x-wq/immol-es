// ─── IMMORA — Ajustement par quartier ────────────────────────────────────────
// Le loyer et le prix m² varient ÉNORMÉMENT à l'intérieur d'une même ville :
// Mosson à Montpellier = -30% prix, -30% loyer vs centre. Sans ce coefficient,
// l'extension scorait à 95/100 des biens dans des quartiers où le loyer réel
// est en fait 30% plus bas et le bien quasi-invendable en location.
//
// Sources : MeilleursAgents, DVF (Demandes de Valeur Foncière), observatoires
// locaux, OLAP. Mise à jour 2024-2025.

import { normaliserVille } from './marche-reference'

export interface QuartierInfo {
  alias: string[]      // termes qui matchent (matching case-insensitive sur tout texte)
  coefLoyer: number    // 1.0 = moyenne ville
  coefPrix: number     // 1.0 = moyenne ville
  tension?: 'forte' | 'moyenne' | 'faible'
  label: string
  category?: 'premium' | 'standard' | 'populaire' | 'qpv'
}

// ─── Base de données ─────────────────────────────────────────────────────────
// Format : clé = ville normalisée (cf. normaliserVille — sans accents, sans tirets,
// minuscules). Tableau ordonné par ordre de matching prioritaire (premium d'abord).
export const QUARTIERS_FR: Record<string, QuartierInfo[]> = {
  // ── Paris : pas besoin ici, gere par PARIS_PAR_CP (CP par arrondissement) ──

  // ── Lyon ──────────────────────────────────────────────────────────────────
  'lyon': [
    { alias: ['presquile', "presqu'ile", 'bellecour', 'cordeliers', '2eme', '2ème'], coefLoyer: 1.25, coefPrix: 1.35, category: 'premium', tension: 'forte', label: 'Presqu\'île (2e)' },
    { alias: ['croix rousse', 'croix-rousse', '4eme', '4ème'], coefLoyer: 1.15, coefPrix: 1.20, category: 'premium', tension: 'forte', label: 'Croix-Rousse (4e)' },
    { alias: ['confluence', 'sainte blandine'], coefLoyer: 1.15, coefPrix: 1.25, category: 'premium', label: 'Confluence' },
    { alias: ['vieux lyon', '5eme', '5ème'], coefLoyer: 1.10, coefPrix: 1.20, category: 'premium', label: 'Vieux Lyon (5e)' },
    { alias: ['brotteaux', 'masséna', 'massena', 'foch', '6eme', '6ème'], coefLoyer: 1.20, coefPrix: 1.25, category: 'premium', label: 'Brotteaux (6e)' },
    { alias: ['part-dieu', 'part dieu', 'partdieu', '3eme', '3ème'], coefLoyer: 1.05, coefPrix: 1.10, category: 'standard', label: 'Part-Dieu (3e)' },
    { alias: ['guillotière', 'guillotiere', 'jean macé', 'jean mace', '7eme', '7ème'], coefLoyer: 1.00, coefPrix: 1.00, category: 'standard', label: 'Guillotière (7e)' },
    { alias: ['monplaisir', 'montchat', '8eme', '8ème'], coefLoyer: 0.95, coefPrix: 0.95, category: 'standard', label: 'Monplaisir (8e)' },
    { alias: ['vaise', '9eme', '9ème'], coefLoyer: 0.90, coefPrix: 0.85, category: 'standard', label: 'Vaise (9e)' },
    { alias: ['duchère', 'duchere', 'mermoz', 'états-unis', 'etats-unis'], coefLoyer: 0.75, coefPrix: 0.70, category: 'qpv', tension: 'faible', label: 'Duchère / Mermoz (QPV)' },
  ],

  // ── Marseille ─────────────────────────────────────────────────────────────
  'marseille': [
    { alias: ['vieux port', 'panier', '1er', '2eme', '7eme'], coefLoyer: 1.20, coefPrix: 1.25, category: 'premium', label: 'Vieux Port / Panier' },
    { alias: ['endoume', 'pharo', 'corniche', '8eme'], coefLoyer: 1.25, coefPrix: 1.40, category: 'premium', label: 'Endoume / Pharo' },
    { alias: ['castellane', 'prado', '6eme'], coefLoyer: 1.20, coefPrix: 1.25, category: 'premium', label: 'Castellane / Prado' },
    { alias: ['joliette', 'arenc', '3eme'], coefLoyer: 0.85, coefPrix: 0.90, category: 'standard', label: 'Joliette' },
    { alias: ['saint-charles', 'belsunce', '1er nord'], coefLoyer: 0.80, coefPrix: 0.75, category: 'standard', label: 'Belsunce' },
    { alias: ['frais vallon', 'frais-vallon', 'busserine', 'castellas', '13eme', '14eme', '15eme', 'noailles'], coefLoyer: 0.65, coefPrix: 0.60, category: 'qpv', tension: 'faible', label: 'Quartiers Nord (QPV)' },
  ],

  // ── Montpellier ───────────────────────────────────────────────────────────
  'montpellier': [
    { alias: ['ecusson', 'écusson', 'comedie', 'comédie', 'antigone', 'centre historique', 'centre ville'], coefLoyer: 1.20, coefPrix: 1.30, category: 'premium', tension: 'forte', label: 'Centre / Antigone' },
    { alias: ['boutonnet', 'aiguelongue', 'beaux arts', 'beaux-arts'], coefLoyer: 1.15, coefPrix: 1.20, category: 'premium', label: 'Boutonnet / Beaux-Arts' },
    { alias: ['port marianne', 'odysseum', 'consuls de mer'], coefLoyer: 1.15, coefPrix: 1.25, category: 'premium', label: 'Port Marianne' },
    { alias: ['hopitaux facultes', 'hôpitaux facultés', 'cnrs'], coefLoyer: 1.10, coefPrix: 1.10, category: 'standard', label: 'Hôpitaux-Facultés' },
    { alias: ['celleneuve', 'figuerolles', 'cevennes', 'cévennes', 'aiguerelles'], coefLoyer: 0.85, coefPrix: 0.85, category: 'standard', label: 'Cévennes / Figuerolles' },
    { alias: ['mosson', 'la mosson', 'paillade', 'la paillade', 'hauts de massane', 'hauts-de-massane', 'haut massane', 'petit bard', 'pas du loup'], coefLoyer: 0.70, coefPrix: 0.65, category: 'qpv', tension: 'faible', label: 'Mosson / Hauts de Massane (QPV)' },
  ],

  // ── Toulouse ──────────────────────────────────────────────────────────────
  'toulouse': [
    { alias: ['capitole', 'carmes', 'saint-étienne', 'st etienne', 'hyper centre'], coefLoyer: 1.25, coefPrix: 1.35, category: 'premium', label: 'Centre / Capitole' },
    { alias: ['saint-cyprien', 'st cyprien', 'jardin japonais'], coefLoyer: 1.10, coefPrix: 1.15, category: 'premium', label: 'Saint-Cyprien' },
    { alias: ['rangueil', 'jolimont', 'compans'], coefLoyer: 1.00, coefPrix: 1.05, category: 'standard', label: 'Rangueil' },
    { alias: ['mirail', 'reynerie', 'bellefontaine', 'bagatelle', 'empalot'], coefLoyer: 0.65, coefPrix: 0.65, category: 'qpv', tension: 'faible', label: 'Mirail / Reynerie (QPV)' },
  ],

  // ── Bordeaux ──────────────────────────────────────────────────────────────
  'bordeaux': [
    { alias: ['chartrons', 'grand theatre', 'triangle', 'hyper centre'], coefLoyer: 1.25, coefPrix: 1.30, category: 'premium', label: 'Chartrons / Triangle' },
    { alias: ['saint-pierre', 'st pierre', 'saint-michel', 'st michel', 'sainte-croix'], coefLoyer: 1.15, coefPrix: 1.20, category: 'premium', label: 'Saint-Pierre / Saint-Michel' },
    { alias: ['caudéran', 'cauderan'], coefLoyer: 1.20, coefPrix: 1.25, category: 'premium', label: 'Caudéran' },
    { alias: ['bacalan', 'queyries'], coefLoyer: 1.00, coefPrix: 1.05, category: 'standard', label: 'Bacalan' },
    { alias: ['benauge', 'aubiers', 'lormont'], coefLoyer: 0.75, coefPrix: 0.70, category: 'qpv', label: 'Bénauge / Aubiers' },
  ],

  // ── Nice ──────────────────────────────────────────────────────────────────
  'nice': [
    { alias: ['vieux nice', 'cours saleya', 'castel'], coefLoyer: 1.25, coefPrix: 1.30, category: 'premium', label: 'Vieux Nice' },
    { alias: ['carré d\'or', 'carre dor', 'masséna', 'massena', 'promenade'], coefLoyer: 1.30, coefPrix: 1.40, category: 'premium', label: 'Carré d\'Or' },
    { alias: ['cimiez', 'mont boron', 'parc impérial'], coefLoyer: 1.20, coefPrix: 1.30, category: 'premium', label: 'Cimiez / Mont Boron' },
    { alias: ['libération', 'liberation', 'gare'], coefLoyer: 1.00, coefPrix: 1.00, category: 'standard', label: 'Libération' },
    { alias: ['ariane', 'pasteur', 'les moulins', 'nord'], coefLoyer: 0.75, coefPrix: 0.70, category: 'qpv', label: 'Ariane / Moulins (QPV)' },
  ],

  // ── Nantes ────────────────────────────────────────────────────────────────
  'nantes': [
    { alias: ['centre ville', 'graslin', 'feydeau', 'royale'], coefLoyer: 1.20, coefPrix: 1.30, category: 'premium', label: 'Centre / Graslin' },
    { alias: ['ile de nantes', 'beaulieu'], coefLoyer: 1.15, coefPrix: 1.25, category: 'premium', label: 'Île de Nantes' },
    { alias: ['talensac', 'hauts pavés', 'hauts-paves', 'erdre'], coefLoyer: 1.10, coefPrix: 1.15, category: 'standard', label: 'Hauts-Pavés / Talensac' },
    { alias: ['malakoff', 'dervallières', 'bottiere', 'bellevue'], coefLoyer: 0.75, coefPrix: 0.70, category: 'qpv', label: 'Malakoff / Bellevue (QPV)' },
  ],

  // ── Strasbourg ────────────────────────────────────────────────────────────
  'strasbourg': [
    { alias: ['grand ile', 'petite france', 'orangerie', 'krutenau'], coefLoyer: 1.25, coefPrix: 1.30, category: 'premium', label: 'Grande Île / Petite France' },
    { alias: ['neudorf', 'esplanade'], coefLoyer: 1.05, coefPrix: 1.10, category: 'standard', label: 'Neudorf / Esplanade' },
    { alias: ['neuhof', 'meinau', 'hautepierre', 'cronenbourg cite nucléaire'], coefLoyer: 0.75, coefPrix: 0.70, category: 'qpv', label: 'Neuhof / Hautepierre (QPV)' },
  ],

  // ── Lille ─────────────────────────────────────────────────────────────────
  'lille': [
    { alias: ['vieux lille', 'place du theatre', 'rihour'], coefLoyer: 1.30, coefPrix: 1.40, category: 'premium', label: 'Vieux Lille' },
    { alias: ['centre', 'gare lille flandres', 'place de la république'], coefLoyer: 1.15, coefPrix: 1.20, category: 'premium', label: 'Centre' },
    { alias: ['wazemmes', 'moulins'], coefLoyer: 1.00, coefPrix: 0.95, category: 'standard', label: 'Wazemmes' },
    { alias: ['fives', 'bois blancs', 'lille sud'], coefLoyer: 0.85, coefPrix: 0.80, category: 'standard', label: 'Fives' },
    { alias: ['lille sud', 'lille-sud'], coefLoyer: 0.70, coefPrix: 0.65, category: 'qpv', label: 'Lille-Sud (QPV)' },
  ],

  // ── Rennes ────────────────────────────────────────────────────────────────
  'rennes': [
    { alias: ['centre historique', 'sainte-anne', 'parlement de bretagne'], coefLoyer: 1.20, coefPrix: 1.25, category: 'premium', label: 'Centre historique' },
    { alias: ['cleunay', 'maurepas', 'le blosne'], coefLoyer: 0.80, coefPrix: 0.75, category: 'qpv', label: 'Maurepas / Le Blosne (QPV)' },
  ],

  // ── Grenoble ──────────────────────────────────────────────────────────────
  'grenoble': [
    { alias: ['centre ville', 'hyper centre', 'notre-dame', 'jardin de ville'], coefLoyer: 1.15, coefPrix: 1.20, category: 'premium', label: 'Centre' },
    { alias: ['ile verte', 'eaux-claires'], coefLoyer: 1.05, coefPrix: 1.05, category: 'standard', label: 'Île Verte' },
    { alias: ['villeneuve', 'mistral', 'teisseire'], coefLoyer: 0.70, coefPrix: 0.65, category: 'qpv', label: 'Villeneuve / Mistral (QPV)' },
  ],

  // ── Nimes ─────────────────────────────────────────────────────────────────
  'nimes': [
    { alias: ['carré dart', 'maison carrée', 'jardin de la fontaine'], coefLoyer: 1.20, coefPrix: 1.25, category: 'premium', label: 'Centre' },
    { alias: ['pissevin', 'valdegour', 'chemin bas davignon'], coefLoyer: 0.70, coefPrix: 0.65, category: 'qpv', label: 'Pissevin (QPV)' },
  ],
}

/**
 * Cherche un ajustement quartier pour une ville + un texte d'annonce.
 * Le texte peut être un nom de quartier extrait, l'adresse, ou un bloc
 * de description complète (on cherche les alias dedans).
 */
export function getQuartierAdjustment(
  ville: string | null | undefined,
  searchText: string | null | undefined,
): QuartierInfo | null {
  if (!ville || !searchText) return null
  const villeNorm = normaliserVille(ville)
  const quartiers = QUARTIERS_FR[villeNorm]
  if (!quartiers) return null

  const txt = searchText.toLowerCase()
  for (const q of quartiers) {
    if (q.alias.some((a) => txt.includes(a.toLowerCase()))) {
      return q
    }
  }
  return null
}
