import OpenAI from 'openai'
import type { InvestmentParams, InvestmentResult, FiscalResult, ScoreResult, AIInsight } from './types'

// Lazy initialization to avoid build-time errors when OPENAI_API_KEY is not set
function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function generateInsights(
  params: InvestmentParams,
  result: InvestmentResult,
  fiscal: FiscalResult | null,
  score: ScoreResult
): Promise<AIInsight[]> {
  const prompt = `Tu es un expert en investissement immobilier français. Analyse ce projet et fournis 4-6 insights concis et actionnables.

DONNÉES DU PROJET:
- Ville: ${params.ville}${params.quartier ? ` (${params.quartier})` : ''}
- Prix d'achat: ${params.prixAchat.toLocaleString('fr-FR')} €
- Surface: ${params.surface} m²
- Type de location: ${params.locType}
- Loyer mensuel: ${result.loyer.toLocaleString('fr-FR')} €/mois
- Apport: ${params.apport.toLocaleString('fr-FR')} €
- Durée crédit: ${params.duree} ans à ${params.taux}%

RÉSULTATS:
- Cash-flow mensuel: ${result.cashflowMensuel.toFixed(0)} €/mois
- Rendement brut: ${result.rendBrut.toFixed(2)}%
- Rendement net: ${result.rendNet.toFixed(2)}%
${fiscal ? `- Rentabilité nette-nette: ${fiscal.rendNetNet.toFixed(2)}%
- Meilleur régime fiscal: ${fiscal.best?.name ?? 'N/A'}` : ''}
- Score global: ${score.global}/100 (${score.label})
- ROI sur apport: ${result.roiApport.toFixed(1)}%
- Coût total crédit: ${result.coutCredit.toLocaleString('fr-FR')} €

Réponds UNIQUEMENT en JSON avec ce format exact (pas de markdown, pas de texte avant/après):
{"insights": [
  {"type": "opportunity|risk|optimization|market", "priority": "high|medium|low", "title": "Titre court", "description": "Description en 1-2 phrases.", "impact": "Impact chiffré optionnel ex: +0.5% de rendement"}
]}

Types:
- "opportunity" : point positif / avantage du projet
- "risk" : risque sérieux à considérer
- "optimization" : conseil d'optimisation fiscale ou financière
- "market" : insight sur le marché local

Sois direct, professionnel et spécifique aux chiffres. Maximum 2 phrases par insight.`

  const openai = getOpenAIClient()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1000,
  })

  try {
    const content = completion.choices[0].message.content ?? '{}'
    const data = JSON.parse(content)
    const raw: { type: string; priority: string; title: string; description: string; impact?: string }[] = data.insights ?? []

    const validTypes = ['opportunity', 'risk', 'optimization', 'market'] as const
    const validPriorities = ['high', 'medium', 'low'] as const

    return raw
      .filter((i) => i && typeof i.title === 'string' && typeof i.description === 'string')
      .map((i): AIInsight => ({
        type: validTypes.includes(i.type as typeof validTypes[number])
          ? (i.type as AIInsight['type'])
          : 'optimization',
        priority: validPriorities.includes(i.priority as typeof validPriorities[number])
          ? (i.priority as AIInsight['priority'])
          : 'medium',
        title: i.title,
        description: i.description,
        impact: i.impact,
      }))
  } catch {
    return [
      {
        type: 'optimization',
        priority: 'medium',
        title: 'Analyse disponible',
        description: "Vérifiez vos paramètres et relancez l'analyse IA pour obtenir des insights personnalisés.",
      },
    ]
  }
}

// (generateSummary supprimé — code mort, jamais appelé)
