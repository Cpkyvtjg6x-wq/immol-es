// ─── IMMORA Extension — Background Service Worker ────────────────────────────

const API_BASE = 'https://immora.app'
const SUPABASE_PROJECT_REF = 'aavfbwcbgicphpnwxawb'
const AUTH_COOKIE_NAME = `sb-${SUPABASE_PROJECT_REF}-auth-token`

// ════════════════════════════════════════════════════════════════════════════
// AUTH — Lit le cookie Supabase de immora.app pour identifier l'utilisateur
// ════════════════════════════════════════════════════════════════════════════
//
// Supabase stocke la session dans un cookie nommé `sb-<projectRef>-auth-token`
// (parfois découpé en `.0`, `.1` quand >4KB). On les concatène, on parse le
// JSON, et on extrait `access_token` (JWT).
//
// On NE peut PAS faire ça depuis un content script (CORS bloque l'envoi de
// cookies cross-origin), donc on passe par le service worker qui a la
// permission `cookies` pour `immora.app`.

// Index numérique du chunk (`sb-…-auth-token.0`, `.1`, …) pour un tri correct
// même au-delà de 9 chunks (localeCompare mettrait ".10" avant ".2").
function immoraChunkIndex(name) {
  const n = parseInt(name.split('.').pop(), 10)
  return Number.isNaN(n) ? -1 : n
}

// Décode base64 OU base64url, avec reconstruction UTF-8 correcte (le JSON de
// session peut contenir des accents dans les métadonnées user).
function immoraDecodeB64(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  let bin
  try { bin = atob(s) } catch (_) { return '' }
  try {
    return decodeURIComponent(
      Array.prototype.map.call(bin, (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''),
    )
  } catch (_) { return bin }
}

// Retourne { token, diag } — diag = trace courte pour comprendre un échec
// (nb de cookies vus, cookie(s) trouvé(s), encodage, parsing).
async function getImmoraAuth() {
  try {
    if (!chrome.cookies || !chrome.cookies.getAll) {
      return { token: null, diag: 'no-cookies-api' }
    }
    // 3 stratégies : par URL (la plus fiable), par domaine, et tout le jar
    // accessible. On fusionne (dédup par nom) pour être robuste au filtre.
    const byUrl    = await chrome.cookies.getAll({ url: 'https://immora.app/' })
    const byDomain = await chrome.cookies.getAll({ domain: 'immora.app' })
    const all      = await chrome.cookies.getAll({})
    const counts = `d:${byDomain.length} u:${byUrl.length} a:${all.length}`

    const seen = new Set()
    const pool = []
    for (const c of [...byUrl, ...byDomain, ...all]) {
      if (!seen.has(c.name)) { seen.add(c.name); pool.push(c) }
    }
    const matching = pool
      .filter((c) => c.name === AUTH_COOKIE_NAME || c.name.startsWith(`${AUTH_COOKIE_NAME}.`))
      .sort((a, b) => immoraChunkIndex(a.name) - immoraChunkIndex(b.name))

    if (matching.length === 0) {
      const sbNames = pool.filter((c) => c.name.startsWith('sb-')).map((c) => c.name).slice(0, 3).join(',')
      return { token: null, diag: `${counts} m:0 sb:[${sbNames}]` }
    }

    let raw = matching.map((c) => c.value).join('')
    if (/%[0-9A-Fa-f]{2}/.test(raw)) { try { raw = decodeURIComponent(raw) } catch (_) {} }

    let payload = raw
    let enc = 'raw'
    if (payload.startsWith('base64-')) { enc = 'b64'; payload = immoraDecodeB64(payload.slice(7)) }

    let session = null
    let perr = 'ok'
    try { session = JSON.parse(payload) } catch (_) { perr = 'err' }

    const token = session?.access_token ?? null
    return { token, diag: `${counts} m:${matching.length} ${enc} p:${perr} t:${token ? 1 : 0}` }
  } catch (err) {
    return { token: null, diag: `exc:${err && err.message ? err.message.slice(0, 24) : 'x'}` }
  }
}

async function getImmoraAuthToken() {
  return (await getImmoraAuth()).token
}

// ── Session relayée par le content script immora-auth.js (chrome.storage) ─────
// C'est la source PRIMAIRE du token (le service worker ne peut pas lire les
// cookies d'immora.app). Le token Supabase expire à ~1h → on considère la
// session périmée après 55 min (l'onglet immora.app la re-synchronise à la
// prochaine visite/refocus).
const IMMORA_SESSION_TTL_MS = 55 * 60 * 1000

async function getStoredSession() {
  try {
    const { immora_session } = await chrome.storage.local.get('immora_session')
    if (!immora_session || !immora_session.access_token) return null
    if (Date.now() - (immora_session.ts || 0) > IMMORA_SESSION_TTL_MS) return null
    return immora_session
  } catch (_) {
    return null
  }
}

// Résout le token : storage d'abord (fiable), repli sur le cookie (souvent KO
// en MV3 mais sans coût). Retourne { token, tier, diag }.
async function resolveAuthToken() {
  const s = await getStoredSession()
  if (s && s.access_token) {
    return { token: s.access_token, tier: s.tier ?? null, diag: `store tier:${s.tier ?? '?'}` }
  }
  const viaCookie = await getImmoraAuth()
  return { token: viaCookie.token, tier: null, diag: `store:0 -> cookie ${viaCookie.diag}` }
}

// ════════════════════════════════════════════════════════════════════════════
// Message routing
// ════════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_ANALYSE') {
    const params = new URLSearchParams()
    if (msg.data.prixAchat)  params.set('prix',    msg.data.prixAchat)
    if (msg.data.surface)    params.set('surface', msg.data.surface)
    if (msg.data.ville)      params.set('ville',   msg.data.ville)
    if (msg.data.dpe)        params.set('dpe',     msg.data.dpe)
    if (msg.data.locType)    params.set('locType', msg.data.locType)
    if (msg.data.source)     params.set('source',  msg.data.source)

    const url = `${API_BASE}/analyse?${params.toString()}`
    chrome.tabs.create({ url })
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'GET_API_BASE') {
    sendResponse({ apiBase: API_BASE })
    return true
  }

  // Relais depuis immora-auth.js (content script sur immora.app) : met en cache
  // la session dans chrome.storage.local (ou la vide si déconnecté).
  if (msg.type === 'IMMORA_SESSION') {
    chrome.storage.local.set({ immora_session: msg.session ?? null })
    sendResponse({ ok: true })
    return true
  }

  // Demandé par un content script d'annonce qui n'a pas de token : on (re)injecte
  // immora-auth.js dans tout onglet immora.app ouvert pour re-synchroniser la
  // session sans que l'utilisateur ait à faire quoi que ce soit.
  if (msg.type === 'SYNC_SESSION') {
    immoraSyncOpenTabs()
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'GET_AUTH_TOKEN') {
    resolveAuthToken().then((r) => sendResponse(r)) // { token, tier, diag }
    return true // keep channel open for async
  }

  return true
})

// ── Synchro auto de la session ────────────────────────────────────────────────
// Les content scripts (dont immora-auth.js) ne se réinjectent PAS dans les onglets
// déjà ouverts au (re)chargement de l'extension. Pour éviter d'exiger un F5 manuel
// sur immora.app, on injecte immora-auth.js dans tout onglet immora.app ouvert dès
// que l'extension démarre ou est installée/mise à jour.
function immoraSyncOpenTabs() {
  try {
    chrome.tabs.query({ url: 'https://immora.app/*' }, (tabs) => {
      if (chrome.runtime.lastError || !tabs) return
      for (const t of tabs) {
        if (t.id == null) continue
        chrome.scripting
          .executeScript({ target: { tabId: t.id }, files: ['content/immora-auth.js'] })
          .catch(() => {})
      }
    })
  } catch (_) { /* scripting indispo → ignore */ }
}

chrome.runtime.onInstalled.addListener(immoraSyncOpenTabs)
chrome.runtime.onStartup.addListener(immoraSyncOpenTabs)

// ════════════════════════════════════════════════════════════════════════════
// Badge sur l'icône quand on détecte une annonce
// ════════════════════════════════════════════════════════════════════════════

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isListing = isListingUrl(tab.url)
    if (isListing) {
      chrome.action.setBadgeText({ tabId, text: '✦' })
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' })
    } else {
      chrome.action.setBadgeText({ tabId, text: '' })
    }
  }
})

function isListingUrl(url) {
  return (
    url.includes('seloger.com/annonces/') ||
    url.includes('leboncoin.fr/ad/') ||
    url.includes('leboncoin.fr/annonces/') ||
    url.includes('leboncoin.fr/ventes_immobilieres/') ||
    url.includes('leboncoin.fr/locations/') ||
    url.includes('pap.fr/annonce/') ||
    url.includes('bienici.com/annonce/') ||
    url.includes('logic-immo.com/detail-vente-') ||
    url.includes('logic-immo.com/detail-location-') ||
    url.includes('logic-immo.com/annonce-immo/')
  )
}
