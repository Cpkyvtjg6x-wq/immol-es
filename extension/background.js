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

async function getImmoraAuthToken() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: 'immora.app' })

    const matching = cookies
      .filter((c) => c.name === AUTH_COOKIE_NAME || c.name.startsWith(`${AUTH_COOKIE_NAME}.`))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (matching.length === 0) return null

    const raw = matching.map((c) => c.value).join('')
    let payload = raw
    if (payload.startsWith('base64-')) {
      try { payload = atob(payload.slice('base64-'.length)) } catch (_) { /* keep raw */ }
    }

    const session = JSON.parse(payload)
    return session?.access_token ?? null
  } catch (err) {
    console.warn('[IMMORA bg] getImmoraAuthToken error:', err)
    return null
  }
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

  if (msg.type === 'GET_AUTH_TOKEN') {
    getImmoraAuthToken().then((token) => sendResponse({ token }))
    return true // keep channel open for async
  }

  return true
})

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
