/**
 * Sources de données & dernière mise à jour — affichées sur /methodologie.
 * Principe : honnêteté. On distingue clairement données officielles, observatoires,
 * et estimations calibrées. La crédibilité vient de la transparence, pas de la prétention.
 */

export type SourceType = 'officielle' | 'observatoire' | 'estimation' | 'reglementaire'

export interface DataSource {
  id: string
  name: string
  type: SourceType
  description: string
  url?: string
  lastUpdate: string
}

export const DERNIERE_MAJ_DONNEES = 'Juin 2026'

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  officielle: 'Donnée officielle',
  observatoire: 'Observatoire',
  estimation: 'Estimation calibrée',
  reglementaire: 'Source réglementaire',
}

export const SOURCES: DataSource[] = [
  {
    id: 'dvf',
    name: 'DVF — Demandes de Valeurs Foncières (DGFiP)',
    type: 'officielle',
    description:
      'Transactions immobilières réelles publiées par l’administration fiscale. Base de nos prix au m² de référence. Délai de publication ~6 à 18 mois.',
    url: 'https://app.dvf.etalab.gouv.fr',
    lastUpdate: DERNIERE_MAJ_DONNEES,
  },
  {
    id: 'observatoires-loyers',
    name: 'Observatoires locaux des loyers (OLL)',
    type: 'observatoire',
    description:
      'Loyers de marché médians par zone, issus du réseau des observatoires agréés. Base de nos loyers au m² (nu et meublé).',
    url: 'https://www.observatoires-des-loyers.org',
    lastUpdate: DERNIERE_MAJ_DONNEES,
  },
  {
    id: 'calibration',
    name: 'Estimations calibrées Immora',
    type: 'estimation',
    description:
      'Lorsqu’une donnée locale précise manque, nous appliquons une estimation calibrée à partir des sources ci-dessus et de coefficients par quartier. C’est une estimation indicative, pas une donnée officielle.',
    lastUpdate: DERNIERE_MAJ_DONNEES,
  },
  {
    id: 'cgi',
    name: 'Code général des impôts & loi de finances 2025',
    type: 'reglementaire',
    description:
      'Règles fiscales appliquées : régimes locatifs (micro/réel, LMNP, LMP, SCI), abattements plus-value (CGI art. 150 VC), et réintégration des amortissements LMNP à la revente (réforme LF 2025).',
    url: 'https://www.legifrance.gouv.fr',
    lastUpdate: 'Loi de finances 2025',
  },
]
