// ─── IMMORA — Content script d'auth (tourne UNIQUEMENT sur immora.app) ───────
//
// Récupère la session utilisateur via un appel SAME-ORIGIN à /api/extension-session
// (le cookie de session part automatiquement) et la relaie au service worker, qui
// la met en cache dans chrome.storage.local. Les content scripts des sites
// d'annonces liront ensuite ce token depuis le cache.
//
// C'est le SEUL moyen fiable : le service worker MV3 ne peut pas lire les cookies
// d'immora.app via chrome.cookies (permission non effective au runtime).

(function () {
  function syncImmoraSession() {
    fetch('/api/extension-session', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const session =
          data && data.authenticated && data.access_token
            ? {
                access_token: data.access_token,
                userId: data.userId ?? null,
                email: data.email ?? null,
                tier: data.tier ?? 'free',
                ts: Date.now(),
              }
            : null
        try {
          chrome.runtime.sendMessage({ type: 'IMMORA_SESSION', session })
        } catch (_) {
          /* extension rechargée / contexte invalidé → on ignore */
        }
      })
      .catch(() => {})
  }

  syncImmoraSession()

  // Re-synchronise quand l'utilisateur revient sur l'onglet immora.app
  // (connexion, rafraîchissement du token Supabase, etc.).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncImmoraSession()
  })
})()
