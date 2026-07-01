import Anthropic from '@anthropic-ai/sdk'
import type { InvestmentParams, InvestmentResult, FiscalResult, ScoreResult, AIInsight, AIVerdict, AIAnalysis } from './types'

// Modèle Claude (même famille que l'analyse photo, clé ANTHROPIC_API_KEY déjà en prod).
const MODEL = 'claude-haiku-4-5-20251001'

const FALLBACK: AIAnalysis = {
  verdict: {
    recommendation: 'prudence',
    titre: 'Analyse indisponible',
    synthese: "Impossible de générer l'analyse pour le moment. Vérifiez vos paramètres et relancez.",
    prixCible: null,
  },
  insights: [],
}

/**
 * Analyse IA COMPLÈTE d'un bien : verdict global (acheter / négocier / prudence /
 * éviter, prix cible, synthèse) + 4-6 insights détaillés. Sur Claude.
 */
export async function generateAnalysis(
  params: InvestmentParams,
  result: InvestmentResult,
  fiscal: FiscalResult | null,
  score: ScoreResult,
): Promise<AIAnalysis> {
  const prompt = `Tu es un expert en investissement immobilier locatif français. Analyse ce bien et rends un VERDICT clair et actionnable, puis 4 à 6 insights.

DONNÉES DU PROJET
- Ville : ${params.ville}${params.quartier ? ` (${params.quartier})` : ''}
- Prix d'achat : ${params.prixAchat.toLocaleString('fr-FR')} €
- Surface : ${params.surface} m² (${Math.round(params.prixAchat / Math.max(1, params.surface)).toLocaleString('fr-FR')} €/m²)
- Type de location : ${params.locType}
- Loyer estimé : ${result.loyer.toLocaleString('fr-FR')} €/mois
- Apport : ${params.apport.toLocaleString('fr-FR')} € · Crédit : ${params.duree} ans à ${params.taux}%
${params.travaux > 0 ? `- Travaux estimés : ${params.travaux.toLocaleString('fr-FR')} € (déjà intégrés au calcul)` : '- Travaux : aucun renseigné'}

RÉSULTATS
- Cash-flow mensuel : ${result.cashflowMensuel.toFixed(0)} €/mois
- Rendement brut : ${result.rendBrut.toFixed(2)} % · net : ${result.rendNet.toFixed(2)} %
${fiscal ? `- Rentabilité nette-nette : ${fiscal.rendNetNet.toFixed(2)} % · meilleur régime : ${fiscal.best?.name ?? 'N/A'}` : ''}
- Score global : ${score.global}/100 (${score.label}) · ROI sur apport : ${result.roiApport.toFixed(1)} %

Réponds UNIQUEMENT avec ce JSON (aucun texte avant/après, pas de markdown) :
{
  "verdict": {
    "recommendation": "favorable | a_negocier | prudence | defavorable",
    "titre": "titre court, max 6 mots",
    "synthese": "2-3 phrases : faut-il acheter, à quel prix, pourquoi (intègre les travaux si présents)",
    "prixCible": "prix de négociation conseillé, ex '≈ 195 000 € (-5 %)', ou null si le prix est déjà correct"
  },
  "insights": [
    {"type": "opportunity|risk|optimization|market", "priority": "high|medium|low", "title": "Titre court", "description": "1-2 phrases.", "impact": "Impact chiffré optionnel, ex '+0,5 % de rendement'"}
  ]
}

recommendation :
- "favorable" : bon deal, acheter en l'état
- "a_negocier" : intéressant SI on obtient une baisse de prix
- "prudence" : cash-flow/risques à surveiller de près
- "defavorable" : à éviter tel quel

Types d'insight : "opportunity" (atout), "risk" (risque sérieux), "optimization" (levier fiscal/financier), "market" (marché local).
Sois direct, chiffré et spécifique. Français impeccable, aucun emoji.`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return FALLBACK
    const data = JSON.parse(jsonMatch[0])

    // ── Validation verdict ──
    const validReco = ['favorable', 'a_negocier', 'prudence', 'defavorable'] as const
    const v = data.verdict ?? {}
    const verdict: AIVerdict = {
      recommendation: validReco.includes(v.recommendation) ? v.recommendation : 'prudence',
      titre: typeof v.titre === 'string' && v.titre.trim() ? v.titre.trim() : 'Analyse du bien',
      synthese: typeof v.synthese === 'string' ? v.synthese.trim() : '',
      prixCible: typeof v.prixCible === 'string' && v.prixCible.trim() ? v.prixCible.trim() : null,
    }

    // ── Validation insights ──
    const validTypes = ['opportunity', 'risk', 'optimization', 'market'] as const
    const validPriorities = ['high', 'medium', 'low'] as const
    const rawInsights: Array<{ type?: string; priority?: string; title?: string; description?: string; impact?: string }> =
      Array.isArray(data.insights) ? data.insights : []
    const insights: AIInsight[] = rawInsights
      .filter((i) => i && typeof i.title === 'string' && typeof i.description === 'string')
      .slice(0, 6)
      .map((i): AIInsight => ({
        type: validTypes.includes(i.type as typeof validTypes[number]) ? (i.type as AIInsight['type']) : 'optimization',
        priority: validPriorities.includes(i.priority as typeof validPriorities[number]) ? (i.priority as AIInsight['priority']) : 'medium',
        title: i.title as string,
        description: i.description as string,
        impact: typeof i.impact === 'string' ? i.impact : undefined,
      }))

    return { verdict, insights }
  } catch (err) {
    console.error('[ai] generateAnalysis error:', err)
    return FALLBACK
  }
}
