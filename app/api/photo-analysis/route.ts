// ─── IMMORA — Analyse photos par IA (GPT-4o-mini vision) ─────────────────────
// Reçoit des URLs de photos d'annonce, les analyse pour estimer les travaux
// par poste avec des coûts basés sur le marché français 2025.

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const runtime  = 'nodejs'
export const maxDuration = 45

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface PhotoAnalysisResult {
  etatGeneral: 'neuf' | 'tres-bon' | 'bon' | 'rafraichissement' | 'renovation-legere' | 'renovation-lourde'
  resume: string
  postes: {
    poste: string
    etat: string
    cout: number
    urgence: 'immediate' | 'court-terme' | 'optionnel'
  }[]
  travauxTotal: number
  fourchetteBasse: number
  fourchetteHaute: number
  travauxPourcentagePrix: number | null
  confidence: number        // 0-100
  photosAnalysees: number
}

// ── Prompt d'expertise ────────────────────────────────────────────────────────

function buildPrompt(surface: number, typeBien: string, ville: string): string {
  return `Tu es un expert en rénovation immobilière en France, avec 20 ans d'expérience dans les chiffrages de travaux.

Analyse ces photos d'un bien immobilier : ${typeBien} de ${surface} m² à ${ville}.

Pour chaque pièce visible :
1. Identifie le type de pièce (cuisine, salon, chambre, salle de bain, WC, couloir, extérieur)
2. Évalue précisément l'état et les défauts visibles (revêtements, équipements, menuiseries, humidité, vétusté)
3. Liste les travaux nécessaires et leur coût

BARÈME DE RÉFÉRENCE (France 2025, fourniture + pose + TVA incluse) :
- Peinture intérieure : 18-28 €/m² surface habitable
- Rafraîchissement sol stratifié : 35-60 €/m²
- Remplacement parquet massif : 110-190 €/m²
- Carrelage cuisine/sdb : 70-120 €/m²
- Cuisine équipée standard (8-12 m²) : 8 000-16 000 €
- Cuisine équipée haut gamme : 18 000-35 000 €
- Salle de bain complète (5-8 m²) : 6 500-14 000 €
- WC rénovation : 1 500-3 500 €
- Fenêtre PVC double vitrage (pose comprise) : 550-950 €/unité
- Fenêtre aluminium double vitrage : 950-1 800 €/unité
- Porte palière blindée : 1 500-3 500 €
- Électricité mise aux normes partielle : 3 500-8 000 €
- Mise aux normes électrique complète : 12 000-20 000 € pour 100 m²
- Plomberie (robinetterie + raccords) : 600-3 000 €
- Chauffe-eau thermodynamique : 1 200-2 500 €
- Chaudière gaz à condensation : 3 500-6 000 €
- Isolation combles perdus : 25-50 €/m²
- Isolation murs intérieurs : 60-100 €/m²
- Ravalement façade (maison) : 40-80 €/m² de façade
- Toiture rénovation (maison) : 80-200 €/m²
- Dressing/rangements : 800-3 000 €

IMPORTANT :
- N'invente PAS de travaux non visibles sur les photos
- Si une pièce est en bon état, dis-le clairement et mets 0 €
- Sois précis et réaliste, pas optimiste ni alarmiste
- Base tes estimations sur ce qui est réellement visible
- Si tu ne peux pas évaluer clairement une zone, l'indique dans le résumé

Réponds UNIQUEMENT avec ce JSON valide (aucun texte avant ou après) :
{
  "etatGeneral": "bon",
  "resume": "Description courte de l'état général en 1-2 phrases.",
  "postes": [
    {"poste": "Cuisine", "etat": "vétuste, équipements à remplacer", "cout": 11000, "urgence": "immediate"},
    {"poste": "Salle de bain", "etat": "carrelage fissuré, robinetterie ancienne", "cout": 8500, "urgence": "immediate"},
    {"poste": "Sols salon/chambres", "etat": "parquet à rénover, quelques lames abîmées", "cout": 4200, "urgence": "court-terme"},
    {"poste": "Peinture générale", "etat": "peintures jaunies et taches", "cout": 3500, "urgence": "court-terme"},
    {"poste": "Menuiseries", "etat": "fenêtres simple vitrage à remplacer", "cout": 5500, "urgence": "optionnel"}
  ],
  "travauxTotal": 32700,
  "fourchetteBasse": 27000,
  "fourchetteHaute": 42000,
  "confidence": 72,
  "photosAnalysees": 4
}

Valeurs possibles pour etatGeneral :
- "neuf" : bien neuf ou entièrement refait (<2 ans)
- "tres-bon" : très bon état, aucun travaux nécessaires
- "bon" : bon état, éventuellement quelques rafraîchissements cosmétiques
- "rafraichissement" : rafraîchissement nécessaire (peinture, sols), budget <10% du prix
- "renovation-legere" : rénovation légère (cuisine, sdb, sols), budget 10-20% du prix
- "renovation-lourde" : rénovation lourde (tout ou presque), budget >20% du prix

Valeurs pour urgence :
- "immediate" : travaux bloquants pour la location ou dégradant significativement la valeur
- "court-terme" : à réaliser dans les 12-24 mois
- "optionnel" : amélioration utile mais non urgente`
}

// ── Fetch image depuis URL → base64 ──────────────────────────────────────────

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IMMORA/2.0)',
        'Accept': 'image/webp,image/jpeg,image/png,image/*',
      },
    })
    clearTimeout(timeout)

    if (!resp.ok) return null

    const contentType = resp.headers.get('content-type') || 'image/jpeg'
    const mediaType = contentType.split(';')[0].trim()
    // OpenAI accepte: image/jpeg, image/png, image/webp, image/gif
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const safeType = allowed.includes(mediaType) ? mediaType : 'image/jpeg'

    const buffer = await resp.arrayBuffer()

    // Limite de taille : 20MB (limite OpenAI)
    if (buffer.byteLength > 20 * 1024 * 1024) return null

    const base64 = Buffer.from(buffer).toString('base64')
    return { data: base64, mediaType: safeType }
  } catch {
    return null
  }
}

// ── Parse JSON défensif ────────────────────────────────────────────────────────

function parseAIResponse(text: string): PhotoAnalysisResult | null {
  try {
    // Extraire le JSON même s'il y a du texte autour
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const raw = JSON.parse(jsonMatch[0])

    // Valider et normaliser
    const postes = Array.isArray(raw.postes) ? raw.postes.filter((p: { poste?: unknown; cout?: unknown }) =>
      p.poste && typeof p.cout === 'number' && p.cout >= 0
    ) : []

    const total = typeof raw.travauxTotal === 'number' && raw.travauxTotal >= 0
      ? raw.travauxTotal
      : postes.reduce((s: number, p: { cout: number }) => s + p.cout, 0)

    const etatGeneral = ['neuf','tres-bon','bon','rafraichissement','renovation-legere','renovation-lourde']
      .includes(raw.etatGeneral) ? raw.etatGeneral : 'bon'

    return {
      etatGeneral,
      resume:          raw.resume ?? '',
      postes,
      travauxTotal:    Math.round(total),
      fourchetteBasse: Math.round(raw.fourchetteBasse ?? total * 0.8),
      fourchetteHaute: Math.round(raw.fourchetteHaute ?? total * 1.3),
      travauxPourcentagePrix: null, // rempli dans le POST handler
      confidence:      typeof raw.confidence === 'number' ? Math.min(100, Math.max(0, raw.confidence)) : 60,
      photosAnalysees: typeof raw.photosAnalysees === 'number' ? raw.photosAnalysees : postes.length,
    }
  } catch {
    return null
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Service vision non configuré (OPENAI_API_KEY manquant)' },
      { status: 503, headers: CORS }
    )
  }

  try {
    const body = await req.json()
    const {
      imageUrls,
      surface   = 50,
      typeBien  = 'Appartement',
      ville     = 'France',
      prixAchat = 0,
    } = body

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'imageUrls requis' }, { status: 400, headers: CORS })
    }

    // Limite à 5 photos, on priorise les premières (façade → salon → cuisine → sdb → chambre)
    const urlsToAnalyse = imageUrls.slice(0, 5)

    // ── Fetch images en parallèle ────────────────────────────────────────────
    const imagesData = await Promise.all(
      urlsToAnalyse.map(url => fetchImageAsBase64(url))
    )
    const validImages = imagesData.filter(Boolean) as { data: string; mediaType: string }[]

    if (validImages.length === 0) {
      return NextResponse.json(
        { error: 'Aucune image accessible (URLs expirées ou protégées)' },
        { status: 422, headers: CORS }
      )
    }

    // ── Appel OpenAI vision ──────────────────────────────────────────────────
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const imageContent = validImages.map(img => ({
      type: 'image_url' as const,
      image_url: {
        url:    `data:${img.mediaType};base64,${img.data}`,
        detail: 'low' as const,  // "low" = rapide + moins cher, suffisant pour évaluer l'état
      },
    }))

    const completion = await client.chat.completions.create({
      model:      'gpt-4o-mini',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text',
              text: buildPrompt(surface, typeBien, ville),
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,  // Low temperature → résultats cohérents et précis
    })

    const rawText = completion.choices[0]?.message?.content ?? ''
    const result  = parseAIResponse(rawText)

    if (!result) {
      return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500, headers: CORS })
    }

    // Ajouter le % du prix d'achat
    if (prixAchat > 0) {
      result.travauxPourcentagePrix = Math.round((result.travauxTotal / prixAchat) * 100)
    }

    // Mettre à jour photosAnalysees avec le vrai nombre
    result.photosAnalysees = validImages.length

    return NextResponse.json(result, { status: 200, headers: CORS })

  } catch (err) {
    console.error('[photo-analysis]', err)
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse des photos' },
      { status: 500, headers: CORS }
    )
  }
}
