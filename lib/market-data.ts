export interface QuartierData {
  name: string
  prixM2: number
  loyerM2: number
  dyn: string
  score: string
  insight: string
}

export interface CityData {
  region: string
  prixM2: number
  loyerM2: number
  tensionLoc: number
  attractRevente: number
  dynEco: number
  score: string
  scoreClass: string
  insight: string
  conseils: string
  quartiers?: QuartierData[]
}

export const VILLES: Record<string, CityData> = {
  'Paris 1-4': {
    region: 'Île-de-France',
    prixM2: 12800,
    loyerM2: 31.5,
    tensionLoc: 95,
    attractRevente: 70,
    dynEco: 90,
    score: 'Faible rendement',
    scoreClass: 'pill-faible',
    insight:
      "Marché le plus cher de France avec un rendement brut souvent inférieur à 3%. La plus-value est l'horizon principal sur cette zone.",
    conseils:
      "Viser une stratégie patrimoniale long terme. Meublé ou Airbnb pour optimiser le loyer. SCI à l'IS pour capitalisation.",
    quartiers: [
      { name: 'Marais (3e)', prixM2: 14200, loyerM2: 33, dyn: 'stable', score: 'Faible', insight: 'Hyper-central, forte demande touristique' },
      { name: 'Île de la Cité (1er)', prixM2: 13500, loyerM2: 31, dyn: 'stable', score: 'Faible', insight: 'Prestige maximum, liquidité élevée' },
    ],
  },
  'Paris 11-12': {
    region: 'Île-de-France',
    prixM2: 10200,
    loyerM2: 28.5,
    tensionLoc: 92,
    attractRevente: 75,
    dynEco: 88,
    score: 'Faible rendement',
    scoreClass: 'pill-faible',
    insight:
      "Quartiers vivants avec une forte demande locative. Rendement autour de 3-3.5%. Idéal pour la diversification patrimoniale.",
    conseils:
      "Privilégier les petites surfaces (studio, T2) à fort loyer au m². Meublé LMNP pour optimisation fiscale.",
    quartiers: [
      { name: 'Bastille', prixM2: 10800, loyerM2: 29.5, dyn: 'haussier', score: 'Faible', insight: 'Quartier dynamique, bonne liquidité' },
      { name: "Nation", prixM2: 9800, loyerM2: 27.5, dyn: 'stable', score: 'Faible', insight: 'Bien desservi, demande soutenue' },
    ],
  },
  Lyon: {
    region: 'Auvergne-Rhône-Alpes',
    prixM2: 4800,
    loyerM2: 14.5,
    tensionLoc: 85,
    attractRevente: 82,
    dynEco: 88,
    score: 'Bon',
    scoreClass: 'pill-bon',
    insight:
      "2e métropole française avec un marché immobilier solide. Rendements corrects autour de 4-5%. Forte dynamique économique.",
    conseils:
      "Cibler les 3e, 7e et 8e arrondissements. LMNP réel très intéressant vu les prix. Bon potentiel de plus-value.",
    quartiers: [
      { name: 'Presqu\'île (2e)', prixM2: 6200, loyerM2: 17, dyn: 'stable', score: 'Moyen', insight: 'Centre premium, forte demande' },
      { name: 'Part-Dieu (3e)', prixM2: 5100, loyerM2: 15.5, dyn: 'haussier', score: 'Bon', insight: 'Quartier d\'affaires en plein essor' },
      { name: 'Confluence (2e)', prixM2: 5400, loyerM2: 15, dyn: 'haussier', score: 'Bon', insight: 'Nouveau quartier en développement' },
      { name: 'Gerland (7e)', prixM2: 4200, loyerM2: 13.5, dyn: 'très haussier', score: 'Excellent', insight: 'Fort potentiel, prix encore accessibles' },
    ],
  },
  Bordeaux: {
    region: 'Nouvelle-Aquitaine',
    prixM2: 4600,
    loyerM2: 13.5,
    tensionLoc: 80,
    attractRevente: 78,
    dynEco: 82,
    score: 'Bon',
    scoreClass: 'pill-bon',
    insight:
      "Ville en forte attractivité depuis 2015. Marché un peu refroidi mais reste dynamique. Rendements 3.5-4.5%.",
    conseils:
      "Les prix ont fortement monté, viser les quartiers périphériques (Bègles, Mérignac). Colocation étudiante rentable.",
    quartiers: [
      { name: 'Chartrons', prixM2: 5800, loyerM2: 15, dyn: 'stable', score: 'Moyen', insight: 'Quartier bobo très prisé' },
      { name: 'Saint-Michel', prixM2: 4200, loyerM2: 13, dyn: 'haussier', score: 'Bon', insight: 'En gentrification, bon potentiel' },
      { name: 'Caudéran', prixM2: 3900, loyerM2: 12.5, dyn: 'stable', score: 'Bon', insight: 'Résidentiel calme, bonne demande' },
    ],
  },
  Marseille: {
    region: "Provence-Alpes-Côte d'Azur",
    prixM2: 2900,
    loyerM2: 11.5,
    tensionLoc: 70,
    attractRevente: 60,
    dynEco: 65,
    score: 'Excellent rendement',
    scoreClass: 'pill-excellent',
    insight:
      "La ville aux meilleurs rendements bruts de France (5-8%). Marché hétérogène selon les arrondissements. Risque locatif plus élevé.",
    conseils:
      "Cibler les 6e, 8e, 13e arrondissements. Éviter les zones à forte vacance. Bien analyser les charges de copropriété.",
    quartiers: [
      { name: '6e (Castellane)', prixM2: 4200, loyerM2: 14, dyn: 'stable', score: 'Bon', insight: 'Centre commercial, forte demande' },
      { name: '8e (Périer)', prixM2: 4800, loyerM2: 15, dyn: 'stable', score: 'Bon', insight: 'Quartier huppé, locataires qualitatifs' },
      { name: '13e (Château-Gombert)', prixM2: 2600, loyerM2: 11, dyn: 'haussier', score: 'Excellent', insight: 'Proche pôle technologique' },
      { name: '1er-3e Centre', prixM2: 1800, loyerM2: 9.5, dyn: 'risqué', score: 'Risqué', insight: 'Rendements élevés mais risque fort' },
    ],
  },
  Toulouse: {
    region: 'Occitanie',
    prixM2: 3600,
    loyerM2: 12.5,
    tensionLoc: 83,
    attractRevente: 76,
    dynEco: 85,
    score: 'Très bon',
    scoreClass: 'pill-tres-bon',
    insight:
      "Ville rose avec la plus forte croissance démographique de France. Marché dynamique, rendements 4-5.5%. Forte présence étudiante.",
    conseils:
      "Idéal pour la colocation étudiante près du campus. LMNP réel très efficace. Miser sur les quartiers en développement.",
    quartiers: [
      { name: 'Capitole', prixM2: 4800, loyerM2: 15, dyn: 'stable', score: 'Moyen', insight: 'Centre historique, prix élevés' },
      { name: 'Rangueil', prixM2: 3200, loyerM2: 13, dyn: 'haussier', score: 'Excellent', insight: 'Campus universitaire, forte demande' },
      { name: 'Minimes', prixM2: 3100, loyerM2: 12.5, dyn: 'haussier', score: 'Très bon', insight: 'En mutation, bon potentiel' },
    ],
  },
  Nantes: {
    region: 'Pays de la Loire',
    prixM2: 3800,
    loyerM2: 12.5,
    tensionLoc: 82,
    attractRevente: 80,
    dynEco: 84,
    score: 'Bon',
    scoreClass: 'pill-bon',
    insight:
      "Régulièrement classée meilleure ville française où vivre. Marché solide avec bonne tension locative. Rendements 3.5-5%.",
    conseils:
      "Cibler les quartiers périphériques en développement. Forte demande en colocation. Métropolisation favorable.",
    quartiers: [
      { name: 'Centre-ville', prixM2: 4800, loyerM2: 14.5, dyn: 'stable', score: 'Moyen', insight: 'Centre premium' },
      { name: 'Île de Nantes', prixM2: 4200, loyerM2: 13.5, dyn: 'haussier', score: 'Bon', insight: 'Quartier en transformation' },
      { name: 'Rezé / Pont-Rousseau', prixM2: 3200, loyerM2: 11.5, dyn: 'haussier', score: 'Très bon', insight: 'Prix accessibles, bonne rentabilité' },
    ],
  },
  Montpellier: {
    region: 'Occitanie',
    prixM2: 3500,
    loyerM2: 13.0,
    tensionLoc: 85,
    attractRevente: 72,
    dynEco: 80,
    score: 'Très bon',
    scoreClass: 'pill-tres-bon',
    insight:
      "Ville étudiante avec une demande locative très forte. Croissance démographique soutenue. Bon rendement 4-5.5%.",
    conseils:
      "Studio et T2 meublés très recherchés. Quartiers proches des universités prioritaires. Micro-BIC ou LMNP réel.",
    quartiers: [
      { name: 'Antigone', prixM2: 4000, loyerM2: 14, dyn: 'stable', score: 'Bon', insight: 'Quartier moderne, bien desservi' },
      { name: 'Port Marianne', prixM2: 4200, loyerM2: 14.5, dyn: 'haussier', score: 'Bon', insight: 'Nouveau quartier dynamique' },
      { name: 'Figuerolles', prixM2: 2800, loyerM2: 12.5, dyn: 'haussier', score: 'Excellent', insight: 'Prix bas, forte rentabilité' },
    ],
  },
  Strasbourg: {
    region: 'Grand Est',
    prixM2: 3400,
    loyerM2: 12.5,
    tensionLoc: 78,
    attractRevente: 70,
    dynEco: 75,
    score: 'Bon',
    scoreClass: 'pill-bon',
    insight:
      "Capitale européenne avec une économie diversifiée. Forte population étudiante et fonctionnaires. Rendements 4-5%.",
    conseils:
      "Zones proches de l'université et du Conseil de l'Europe. Meublé très demandé par les fonctionnaires européens.",
    quartiers: [
      { name: 'Neustadt', prixM2: 4200, loyerM2: 14, dyn: 'stable', score: 'Bon', insight: 'Patrimoine UNESCO, valeur refuge' },
      { name: 'Cronenbourg', prixM2: 2600, loyerM2: 11, dyn: 'haussier', score: 'Excellent', insight: 'Prix bas, forte demande ouvrière' },
    ],
  },
  Lille: {
    region: 'Hauts-de-France',
    prixM2: 3200,
    loyerM2: 13.0,
    tensionLoc: 82,
    attractRevente: 72,
    dynEco: 78,
    score: 'Très bon',
    scoreClass: 'pill-tres-bon',
    insight:
      "Métropole du Nord très dynamique avec une forte population étudiante. Excellents rendements 4.5-6%. Colocation très rentable.",
    conseils:
      "La colocation est le modèle roi à Lille. Vieux-Lille premium, Wazemmes/Moulins pour la rentabilité. LMNP idéal.",
    quartiers: [
      { name: 'Vieux-Lille', prixM2: 4800, loyerM2: 16.5, dyn: 'stable', score: 'Bon', insight: 'Prestige, forte demande cadres' },
      { name: 'Wazemmes', prixM2: 2800, loyerM2: 12.5, dyn: 'haussier', score: 'Excellent', insight: 'Gentrification en cours' },
      { name: 'Fives', prixM2: 2400, loyerM2: 11.5, dyn: 'très haussier', score: 'Excellent', insight: 'Prix bas, fort potentiel' },
    ],
  },
  Nice: {
    region: "Provence-Alpes-Côte d'Azur",
    prixM2: 4900,
    loyerM2: 15.5,
    tensionLoc: 78,
    attractRevente: 80,
    dynEco: 72,
    score: 'Bon',
    scoreClass: 'pill-bon',
    insight:
      "Marché très touristique avec forte saisonnalité. Location saisonnière très rentable. Marché résidentiel plus tendu.",
    conseils:
      "Location saisonnière estivale pour maximiser les revenus. Proche bord de mer = premium. Attention aux charges élevées.",
    quartiers: [
      { name: 'Promenade / Vieux-Nice', prixM2: 7500, loyerM2: 20, dyn: 'stable', score: 'Touristique', insight: 'Airbnb ultra-rentable en saison' },
      { name: 'Libération', prixM2: 4200, loyerM2: 14, dyn: 'haussier', score: 'Bon', insight: 'Quartier résidentiel dynamique' },
    ],
  },
  Rennes: {
    region: 'Bretagne',
    prixM2: 3800,
    loyerM2: 13.0,
    tensionLoc: 84,
    attractRevente: 78,
    dynEco: 83,
    score: 'Bon',
    scoreClass: 'pill-bon',
    insight:
      "Forte croissance économique et démographique. Ville très attractive pour les entreprises tech. Rendements 3.5-4.5%.",
    conseils:
      "Quartiers étudiants très recherchés. Le marché se tend rapidement. Anticiper les hausses de prix.",
    quartiers: [
      { name: 'Thabor', prixM2: 5200, loyerM2: 15, dyn: 'stable', score: 'Moyen', insight: 'Quartier huppé, demande forte' },
      { name: 'Villejean', prixM2: 2900, loyerM2: 11.5, dyn: 'haussier', score: 'Excellent', insight: 'Campus, forte demande étudiante' },
    ],
  },
  Grenoble: {
    region: 'Auvergne-Rhône-Alpes',
    prixM2: 2700,
    loyerM2: 11.5,
    tensionLoc: 78,
    attractRevente: 65,
    dynEco: 76,
    score: 'Très bon',
    scoreClass: 'pill-tres-bon',
    insight:
      "Cité technologique avec un marché accessible. Forte population étudiante et ingénieurs. Rendements 5-6.5%.",
    conseils:
      "Prix très accessibles pour un marché de 160 000 hab. LMNP réel extrêmement rentable ici. Colocation ingénieurs.",
    quartiers: [
      { name: 'Presqu\'île', prixM2: 3800, loyerM2: 13.5, dyn: 'très haussier', score: 'Bon', insight: 'Nouveau quartier innovant' },
      { name: 'Championnet', prixM2: 2400, loyerM2: 11, dyn: 'stable', score: 'Excellent', insight: 'Prix bas, forte rentabilité' },
    ],
  },
  Dijon: {
    region: 'Bourgogne-Franche-Comté',
    prixM2: 2400,
    loyerM2: 10.5,
    tensionLoc: 72,
    attractRevente: 62,
    dynEco: 68,
    score: 'Bon',
    scoreClass: 'pill-bon',
    insight:
      "Ville universitaire accessible avec des rendements attractifs 5-6%. Marché stable et peu spéculatif.",
    conseils:
      "Idéal pour un premier investissement. Prix d'entrée bas, cash-flow possible dès le départ. Colocation étudiante.",
    quartiers: [
      { name: 'Centre historique', prixM2: 3200, loyerM2: 13, dyn: 'stable', score: 'Bon', insight: 'Patrimoine, forte demande' },
      { name: 'Montchapet', prixM2: 2200, loyerM2: 10, dyn: 'stable', score: 'Très bon', insight: 'Résidentiel calme, rentabilité' },
    ],
  },
  Clermont: {
    region: 'Auvergne-Rhône-Alpes',
    prixM2: 2000,
    loyerM2: 9.5,
    tensionLoc: 68,
    attractRevente: 55,
    dynEco: 62,
    score: 'Très bon rendement',
    scoreClass: 'pill-tres-bon',
    insight:
      "Marché très accessible avec des rendements parmi les meilleurs de France (6-8%). Cash-flow positif quasi certain.",
    conseils:
      "Cash-flow positif facilement atteignable. Risque de vacance un peu plus élevé. Privilégier le centre-ville.",
    quartiers: [
      { name: 'Centre / Jaude', prixM2: 2400, loyerM2: 11, dyn: 'stable', score: 'Très bon', insight: 'Centre commercial, bonne demande' },
      { name: 'Montferrand', prixM2: 1600, loyerM2: 8.5, dyn: 'haussier', score: 'Excellent', insight: 'Prix très bas, rentabilité max' },
    ],
  },
  Metz: {
    region: 'Grand Est',
    prixM2: 2200,
    loyerM2: 10.0,
    tensionLoc: 70,
    attractRevente: 60,
    dynEco: 65,
    score: 'Bon',
    scoreClass: 'pill-bon',
    insight:
      "Ville frontalière avec une économie stable. Marché accessible et rendements corrects. Demande locative soutenue.",
    conseils: "Bien adapté pour un premier investissement avec budget limité. Meublé tourisme possible vu la frontière.",
    quartiers: [
      { name: 'Centre Metz', prixM2: 2800, loyerM2: 12, dyn: 'stable', score: 'Bon', insight: 'Centre animé, bonne demande' },
    ],
  },
  Angers: {
    region: 'Pays de la Loire',
    prixM2: 2900,
    loyerM2: 11.0,
    tensionLoc: 78,
    attractRevente: 70,
    dynEco: 75,
    score: 'Bon',
    scoreClass: 'pill-bon',
    insight:
      "Ville universitaire en pleine croissance. Marché équilibré avec des rendements de 4.5-5.5%. Forte demande étudiante.",
    conseils:
      "Studio et T2 meublés très demandés. Quartiers campus prioritaires. Belle perspective de plus-value à 10 ans.",
    quartiers: [
      { name: 'Belle-Beille', prixM2: 2400, loyerM2: 10.5, dyn: 'haussier', score: 'Excellent', insight: 'Campus, demande étudiante forte' },
      { name: 'Centre', prixM2: 3400, loyerM2: 12.5, dyn: 'stable', score: 'Bon', insight: 'Centre historique, bonne liquidité' },
    ],
  },
  Tours: {
    region: 'Centre-Val de Loire',
    prixM2: 2700,
    loyerM2: 10.5,
    tensionLoc: 76,
    attractRevente: 68,
    dynEco: 72,
    score: 'Bon',
    scoreClass: 'pill-bon',
    insight:
      "Belle ville universitaire avec un marché équilibré. Rendements 4.5-5.5%. Forte demande étudiante et jeunes actifs.",
    conseils: "Cibler les quartiers proches de l'université (Sanitas, Prébendes). Meublé LMNP très adapté.",
    quartiers: [
      { name: 'Prébendes', prixM2: 3200, loyerM2: 12, dyn: 'stable', score: 'Bon', insight: 'Quartier huppé, forte demande' },
      { name: 'Sanitas', prixM2: 2200, loyerM2: 10, dyn: 'haussier', score: 'Très bon', insight: 'En gentrification, bon potentiel' },
    ],
  },
}

/**
 * Get city data by name
 */
export function getCityData(ville: string): CityData | null {
  return VILLES[ville] ?? null
}

// (getCityNames / getCitiesByRegion / getQuartiers supprimés — code mort, jamais appelés)
