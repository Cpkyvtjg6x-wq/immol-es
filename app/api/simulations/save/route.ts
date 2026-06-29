// ─── IMMORA — Sauvegarde rapide d'une simulation depuis l'extension ──────────
// Appelée par le bouton "Sauvegarder dans ma bibliothèque" du widget Chrome.
//
// Requiert un Authorization Bearer (token Supabase) ET un tier Pro/Agence.
// Le Free renvoie 402 (la sauvegarde fait partie des features payantes).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateExtensionRequest } from '@/lib/extension-auth'
import { validate, simulationSaveSchema, jsonByteSize } from '@/lib/validation'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Expose-Headers': 'x-immora-tier',
}

export const runtime = 'nodejs'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateExtensionRequest(req.headers.get('authorization'))

  if (!auth.userId) {
    return NextResponse.json(
      { error: 'Authentification requise', upgrade_required: 'login' },
      { status: 401, headers: { ...CORS, 'x-immora-tier': auth.tier } },
    )
  }

  // Pas d'extension save pour Free : le quota de simulations + l'absence de
  // patrimoine font que ça n'a pas de sens. CTA upgrade.
  if (!auth.canTrackPatrimoine) {
    return NextResponse.json(
      { error: 'Sauvegarde réservée au plan Pro', upgrade_required: 'patrimoine' },
      { status: 402, headers: { ...CORS, 'x-immora-tier': auth.tier } },
    )
  }

  try {
    const body = await req.json()
    const v = validate(simulationSaveSchema, body)
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: 400, headers: CORS })
    }
    const {
      name,
      params,        // les params utilisés pour le calcul (extraits + estimés)
      results,       // résultats du calcul (cashflow, rendement…)
      score,         // score global
      sourceUrl,     // URL de l'annonce d'origine (Seloger, LBC…)
      sourcePortal,  // 'Seloger' | 'Leboncoin' | …
    } = v.data

    // Borne la taille du JSONB stocké (anti-abus stockage — un user Pro pourrait
    // sinon insérer des Mo de JSON arbitraire par sauvegarde).
    if (jsonByteSize(params) + jsonByteSize(results) > 200_000) {
      return NextResponse.json(
        { error: 'Données de simulation trop volumineuses' },
        { status: 413, headers: CORS },
      )
    }

    // Admin client (RLS ne nous gêne pas — on a déjà vérifié auth.userId)
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data, error } = await admin
      .from('simulations')
      .insert({
        user_id: auth.userId,
        name: String(name).slice(0, 80),
        params: {
          ...params,
          // Trace l'origine pour le dashboard / filtre par portail plus tard
          _source: { portal: sourcePortal ?? null, url: sourceUrl ?? null },
        },
        results: results ?? null,
        score: typeof score === 'number' ? score : null,
        tags: ['extension'],
      })
      .select('id')
      .single()

    if (error) {
      console.error('[simulations/save] insert error:', error)
      return NextResponse.json(
        { error: 'Erreur sauvegarde' },
        { status: 500, headers: CORS },
      )
    }

    return NextResponse.json(
      { ok: true, id: data?.id, tier: auth.tier },
      { status: 200, headers: { ...CORS, 'x-immora-tier': auth.tier } },
    )
  } catch (err) {
    console.error('[simulations/save] error:', err)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: CORS },
    )
  }
}
