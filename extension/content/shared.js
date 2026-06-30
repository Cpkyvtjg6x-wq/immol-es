// ─── IMMORA — Shared Content Script Library ───────────────────────────────────
// Ce fichier est chargé AVANT chaque script de site (seloger, leboncoin, etc.)
// Il expose des fonctions globales utilisées par tous les content scripts.
// Note: pas d'IIFE — les fonctions doivent être accessibles globalement.

const IMMORA_API = 'https://immora.app'
console.log('[IMMORA] shared.js chargé ✓')

// ════════════════════════════════════════════════════════════════════════════
// WIDGET — HTML + CSS injection
// ════════════════════════════════════════════════════════════════════════════

function immoraCreateWidget(source) {
  if (document.getElementById('immora-widget')) return null

  const widget = document.createElement('div')
  widget.id = 'immora-widget'
  widget.innerHTML = immoraWidgetMarkup(source)

  document.body.appendChild(widget)
  immoraSetupTabs()
  return widget
}

function immoraWidgetMarkup(source) {
  return `
    <div id="immora-mini" title="Ouvrir l'analyse Immora">
      <div id="immora-mini-score">…</div>
      <div id="immora-mini-text">/100</div>
    </div>
    <div id="immora-card">
      <div class="imm-header">
        <div class="imm-logo">
          <span class="imm-logo-mark">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <defs><clipPath id="immora-logo-clip"><circle cx="12" cy="12" r="9.1"/></clipPath></defs>
              <g clip-path="url(#immora-logo-clip)">
                <path d="M 4 18 C 11 18 15 8 19 5" stroke="#34d399" stroke-width="1.6" fill="none"/>
                <line x1="2" y1="18" x2="22" y2="18" stroke="#fff" stroke-width="1.8"/>
              </g>
              <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="1.8" fill="none" opacity="0.9"/>
            </svg>
          </span>
          <span class="imm-logo-name">Immora</span>
        </div>
        <div class="imm-header-right">
          <span class="imm-badge">${source}</span>
          <button id="immora-toggle" class="imm-iconbtn" title="Réduire" aria-label="Réduire">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" d="M5 12h14"/></svg>
          </button>
        </div>
      </div>

      <div id="immora-loading" class="imm-loading">
        <div class="imm-spinner"></div>
        <p>Analyse en cours…</p>
      </div>

      <div id="immora-error" class="imm-error" style="display:none">
        <div class="imm-error-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 8v5M12 16h.01"/></svg></div>
        <p id="immora-error-msg">Impossible d'extraire les données.</p>
        <button id="immora-retry" class="imm-retry">Réessayer</button>
      </div>

      <div class="imm-tabs" id="immora-tabs" style="display:none">
        <div class="imm-tab is-active" data-tab="synthese">Synthèse</div>
        <div class="imm-tab" data-tab="detail">Détail</div>
      </div>

      <div id="immora-body" style="display:none">
        <div class="imm-view is-active" data-view="synthese">
          <div class="imm-data">
            <span class="imm-data-dot" id="imm-data-dot"></span>
            <span class="imm-data-label">Données extraites</span>
            <span class="imm-data-count imm-mono" id="imm-data-count">—</span>
            <span class="imm-data-bar"><span class="imm-data-fill" id="imm-data-fill"></span></span>
          </div>

          <div class="imm-warnings" id="imm-warnings"></div>

          <div class="imm-hero">
            <div class="imm-ring">
              <svg width="70" height="70" viewBox="0 0 70 70">
                <circle class="imm-ring-track" cx="35" cy="35" r="30" fill="none" stroke-width="5.5"/>
                <circle class="imm-ring-prog" id="imm-ring-prog" cx="35" cy="35" r="30" fill="none" stroke-width="5.5" stroke-dasharray="188.5" stroke-dashoffset="188.5"/>
              </svg>
              <div class="imm-ring-center"><span class="imm-ring-num" id="imm-ring-num">—</span><span class="imm-ring-max imm-mono">/100</span></div>
            </div>
            <div class="imm-verdict">
              <div class="imm-verdict-label" id="imm-verdict-label">Analyse…</div>
              <div class="imm-verdict-sub" id="imm-verdict-sub">—</div>
            </div>
          </div>

          <div class="imm-kpis">
            <div class="imm-kpi"><div class="imm-kpi-label imm-mono">Cashflow / mois</div><div class="imm-kpi-val" id="imm-kpi-cashflow">—</div></div>
            <div class="imm-kpi"><div class="imm-kpi-label imm-mono">Rendement net</div><div class="imm-kpi-val" id="imm-kpi-rendnet">—</div></div>
            <div class="imm-kpi"><div class="imm-kpi-label imm-mono">Rendement brut</div><div class="imm-kpi-val" id="imm-kpi-rendbrut">—</div></div>
            <div class="imm-kpi"><div class="imm-kpi-label imm-mono">Mensualité</div><div class="imm-kpi-val" id="imm-kpi-mensualite">—</div></div>
          </div>
        </div>

        <div class="imm-view" data-view="detail">
          <div class="imm-section-label imm-mono">Sous-scores</div>
          <div class="imm-subs" id="immora-subscores">
            <div class="imm-sub" data-sub="rentabilite"><span class="imm-sub-label">Rentabilité</span><span class="imm-sub-bar"><span class="imm-sub-fill"></span></span><span class="imm-sub-val">—</span></div>
            <div class="imm-sub" data-sub="cashflow"><span class="imm-sub-label">Cashflow</span><span class="imm-sub-bar"><span class="imm-sub-fill"></span></span><span class="imm-sub-val">—</span></div>
            <div class="imm-sub" data-sub="fiscalite"><span class="imm-sub-label">Fiscalité</span><span class="imm-sub-bar"><span class="imm-sub-fill"></span></span><span class="imm-sub-val">—</span></div>
            <div class="imm-sub" data-sub="marche"><span class="imm-sub-label">Marché</span><span class="imm-sub-bar"><span class="imm-sub-fill"></span></span><span class="imm-sub-val">—</span></div>
          </div>

          <div class="imm-row" id="immora-nego" style="display:none">
            <div class="imm-row-left"><div class="imm-row-label imm-mono">Offre conseillée</div><div class="imm-row-detail" id="immora-nego-detail">—</div></div>
            <div class="imm-row-right"><div class="imm-row-value" id="immora-nego-price">—</div><div class="imm-row-meta"><span class="imm-row-eco" id="immora-nego-eco">—</span><span class="imm-tag" id="immora-nego-tag">—</span></div></div>
          </div>

          <div class="imm-row" id="immora-fiscal" style="display:none">
            <div class="imm-row-left"><div class="imm-row-label imm-mono">Meilleur régime fiscal</div><div class="imm-row-name" id="immora-fiscal-name">—</div></div>
            <div class="imm-row-right"><div class="imm-row-value" id="immora-fiscal-rend">—</div><div class="imm-row-sub">net-net</div></div>
          </div>

          <div id="immora-marche"></div>

          <div class="imm-notice imm-mono" id="immora-notice">—</div>
        </div>
      </div>

      <div class="imm-cta-wrap" id="immora-cta-wrap" style="display:none">
        <a id="immora-cta" class="imm-cta" href="#" target="_blank" rel="noopener"><span>Analyser en détail</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></a>
      </div>
    </div>`
}

// ════════════════════════════════════════════════════════════════════════════
// RENDER — Remplissage du widget avec les résultats de l'API
// ════════════════════════════════════════════════════════════════════════════

function immoraRenderResults(r) {
  const score = Math.round(r.score ?? 0)

  // Affichage : masquer le chargement, montrer onglets + corps + CTA
  const setDisp = (id, d) => { const e = document.getElementById(id); if (e) e.style.display = d }
  setDisp('immora-loading', 'none')
  setDisp('immora-tabs', 'flex')
  setDisp('immora-body', 'block')
  setDisp('immora-cta-wrap', 'block')

  const miniScore = document.getElementById('immora-mini-score')
  if (miniScore) miniScore.textContent = score

  // ── Verdict cohérent avec le cashflow (pas seulement le score) ──
  const cf = Math.round(r.cashflowMensuel ?? 0)
  const brut = (r.rendBrut ?? 0).toFixed(1)
  const cfStr = (cf >= 0 ? '+' : '') + cf + ' €/mois'
  let label, sub, vColor
  if (score >= 78) {
    if (cf >= 30) { label = 'Excellent deal'; vColor = '#34d399'; sub = `Cashflow ${cfStr} · ${brut}% brut` }
    else if (cf >= -120) { label = 'Très bon rendement'; vColor = '#34d399'; sub = `${brut}% brut · cashflow quasi neutre (${cfStr})` }
    else { label = 'Fort rendement, effort'; vColor = '#fbbf24'; sub = `${brut}% brut mais cashflow ${cfStr}` }
  } else if (score >= 58) {
    if (cf >= 0) { label = 'Bon deal'; vColor = '#34d399'; sub = `Cashflow ${cfStr} · ${brut}% brut` }
    else if (cf >= -150) { label = 'Bon deal'; vColor = '#34d399'; sub = `${brut}% brut · effort léger ${cfStr}` }
    else { label = 'Bon rendement'; vColor = '#fbbf24'; sub = `${brut}% brut · effort ${cfStr}` }
  } else if (score >= 40) {
    label = 'Projet correct'; vColor = '#fbbf24'; sub = `À négocier${r.negoPct ? ` −${r.negoPct}%` : ''} · ${cfStr}`
  } else if (score >= 22) {
    label = 'Rentabilité limitée'; vColor = '#fbbf24'; sub = `Effort d'épargne ${cfStr}`
  } else {
    label = 'Très surévalué'; vColor = '#f87171'; sub = `${cfStr} — pari sur la valorisation`
  }

  // ── Anneau de score ──
  const ringNum = document.getElementById('imm-ring-num')
  const ringProg = document.getElementById('imm-ring-prog')
  if (ringNum) { immoraAnimateNumber(ringNum, 0, score, 900); ringNum.style.color = vColor }
  if (ringProg) {
    const C = 188.5
    ringProg.style.stroke = vColor
    requestAnimationFrame(() => { ringProg.style.strokeDashoffset = String(C * (1 - score / 100)) })
  }
  const vl = document.getElementById('imm-verdict-label'); if (vl) { vl.textContent = label; vl.style.color = vColor }
  const vs = document.getElementById('imm-verdict-sub'); if (vs) vs.textContent = sub
  if (miniScore) miniScore.style.color = vColor

  // ── 4 bulles KPI (couleur sur la valeur uniquement) ──
  const kpi = (id, text, tone) => { const e = document.getElementById(id); if (e) { e.textContent = text; e.className = 'imm-kpi-val' + (tone ? ' imm-' + tone : '') } }
  kpi('imm-kpi-cashflow', (cf >= 0 ? '+' : '') + cf + ' €', cf >= 50 ? 'green' : cf >= -100 ? 'amber' : 'red')
  const rn = (r.rendNet ?? 0); kpi('imm-kpi-rendnet', rn.toFixed(2) + ' %', rn >= 3.5 ? 'green' : rn >= 2 ? 'amber' : 'red')
  const rb = (r.rendBrut ?? 0); kpi('imm-kpi-rendbrut', rb.toFixed(2) + ' %', null)
  kpi('imm-kpi-mensualite', Math.round(r.mensualite ?? 0) + ' €', null)

  // ── Warnings DPE F/G ──
  immoraRenderWarnings(r.warnings ?? [])

  // ── Sous-scores (Détail) ──
  const subScores = r.subScores ?? {}
  document.querySelectorAll('#immora-subscores .imm-sub').forEach((el) => {
    const key = el.dataset.sub
    const val = Math.round(subScores[key] ?? 0)
    const fill = el.querySelector('.imm-sub-fill')
    const valEl = el.querySelector('.imm-sub-val')
    const c = val >= 70 ? '#34d399' : val >= 50 ? '#fbbf24' : val >= 30 ? '#fb923c' : '#f87171'
    if (fill) { fill.style.background = c; requestAnimationFrame(() => { fill.style.width = val + '%' }) }
    if (valEl) { valEl.textContent = val; valEl.style.color = c }
    el.title = val + '/100'
  })

  // ── Offre conseillée (Détail) ──
  if (r.prixMax) {
    const fmt = (v) => v.toLocaleString('fr-FR') + ' €'
    const negoEl = document.getElementById('immora-nego')
    const tagEl = document.getElementById('immora-nego-tag')
    const priceEl = document.getElementById('immora-nego-price')
    const ecoEl = document.getElementById('immora-nego-eco')
    const detailEl = document.getElementById('immora-nego-detail')
    const pct = r.negoPct ?? 0
    const m2Str = r.prixM2 ? `${r.prixM2.toLocaleString('fr-FR')} €/m²` : ''
    if (negoEl) negoEl.style.display = 'flex'
    if (priceEl) priceEl.textContent = fmt(r.prixMax)
    if (ecoEl) { ecoEl.textContent = r.economie > 0 ? '−' + fmt(r.economie) : 'prix juste'; ecoEl.className = 'imm-row-eco' + (pct <= 3 ? ' imm-green' : pct > 6 ? ' imm-red' : '') }
    if (tagEl) { const tc = pct <= 3 ? 'green' : pct <= 6 ? 'amber' : 'red'; tagEl.className = 'imm-tag imm-tag-' + tc; tagEl.textContent = '−' + pct + '%' }
    if (detailEl) detailEl.textContent = (pct <= 3 ? 'Prix attractif' : pct <= 6 ? 'Marge de négo standard' : 'Bien surévalué') + (m2Str ? ' · ' + m2Str : '')
  }

  // ── Régime fiscal (Détail) ──
  if (r.bestRegime) {
    const fc = r.bestRegime.rendNetNet >= 4 ? '#34d399' : r.bestRegime.rendNetNet >= 2 ? '#fbbf24' : '#f87171'
    const fEl = document.getElementById('immora-fiscal')
    const nameEl = document.getElementById('immora-fiscal-name')
    const rendEl = document.getElementById('immora-fiscal-rend')
    if (fEl) fEl.style.display = 'flex'
    if (nameEl) nameEl.textContent = r.bestRegime.name
    if (rendEl) { rendEl.textContent = r.bestRegime.rendNetNet.toFixed(2) + ' %'; rendEl.style.color = fc }
  }

  // ── Marché (ou verrou Free) ──
  immoraRenderMarche(r)

  // ── Notice (hypothèses) ──
  const noticeEl = document.getElementById('immora-notice')
  if (noticeEl) {
    const loyerLabel = r.loyerSource === 'annonce' ? "loyer issu de l'annonce"
      : r.loyerSource === 'fourni' ? 'loyer fourni'
      : r.loyerSource === 'marche' ? 'loyer marché estimé'
      : 'loyer estimé'
    const apportPct = r.apportEstime && r.prixAchat ? Math.round((r.apportEstime / r.prixAchat) * 100) : 20
    const tmiUsed = r.tmiUsed ?? 30
    noticeEl.textContent = `${loyerLabel} · ${apportPct}% apport · 3,5% · TMI ${tmiUsed}%`
  }

  // ── CTA ──
  const cta = document.getElementById('immora-cta')
  if (cta && r.analyseUrl) cta.href = r.analyseUrl
}

function immoraRenderMarche(r) {
  const el = document.getElementById('immora-marche')
  if (!el) return
  const mc = r.marcheContext
  if (!mc) { el.innerHTML = ''; return }
  if (mc.positionnement) {
    const badgeClass = { 'opportunite': 'imm-tag-green', 'attractif': 'imm-tag-green', 'correct': 'imm-tag-amber', 'surevalue': 'imm-tag-amber', 'tres-surevalue': 'imm-tag-red' }[mc.positionnement] || 'imm-tag-amber'
    const dotColor = { forte: '#34d399', moyenne: '#fbbf24', faible: '#f87171' }[mc.tension] || '#34d399'
    const ref = mc.prixM2Ref ? ` · réf. ${mc.prixM2Ref.toLocaleString('fr-FR')} €/m²` : ''
    el.innerHTML = `<div class="imm-row"><div class="imm-marche-left"><span class="imm-dot" style="background:${dotColor}"></span><div class="imm-row-left"><div class="imm-row-name">Marché ${mc.ville || 'local'}</div><div class="imm-row-detail">${mc.positionnementLabel || ''}${ref}</div></div></div><span class="imm-tag ${badgeClass}">${mc.ecartMarche > 0 ? '+' : ''}${mc.ecartMarche}%</span></div>`
  } else if (mc.gatedPro) {
    el.innerHTML = `<div class="imm-lock"><div class="imm-lock-left"><span class="imm-lock-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg></span><div class="imm-lock-texts"><div class="imm-lock-title">Données marché détaillées</div><div class="imm-lock-sub">Positionnement, tension, écart au m²</div></div></div><button class="imm-lock-cta" id="immora-lock-cta">Passer à Pro</button></div>`
    const b = document.getElementById('immora-lock-cta')
    if (b) b.addEventListener('click', () => window.open(`${IMMORA_API}/checkout/start?plan=pro&cycle=annual`, '_blank', 'noopener'))
  } else if (mc.loyerM2Ref) {
    el.innerHTML = `<div class="imm-row"><div class="imm-marche-left"><span class="imm-dot"></span><div class="imm-row-left"><div class="imm-row-name">Marché ${mc.ville || 'local'}</div><div class="imm-row-detail">Loyer réf. : ${mc.loyerM2Ref} €/m²/mois</div></div></div></div>`
  } else { el.innerHTML = '' }
}

function immoraShowError(msg) {
  const loading = document.getElementById('immora-loading')
  const error   = document.getElementById('immora-error')
  const msgEl   = document.getElementById('immora-error-msg')
  if (loading) loading.style.display = 'none'
  if (msgEl && msg) msgEl.textContent = msg
  if (error)  error.style.display = 'block'
}

// ════════════════════════════════════════════════════════════════════════════
// TOGGLE — Collapse / Expand
// ════════════════════════════════════════════════════════════════════════════

function immoraSetupTabs() {
  document.querySelectorAll('#immora-card .imm-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const v = tab.dataset.tab
      document.querySelectorAll('#immora-card .imm-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === v))
      document.querySelectorAll('#immora-card .imm-view').forEach((el) => el.classList.toggle('is-active', el.dataset.view === v))
    })
  })
}

function immoraSetupToggle(widget, onRetry) {
  const toggle = document.getElementById('immora-toggle')
  const mini   = document.getElementById('immora-mini')
  const retry  = document.getElementById('immora-retry')

  if (toggle) toggle.addEventListener('click', (e) => {
    e.stopPropagation()
    widget.classList.add('imm-collapsed')
  })
  if (mini) mini.addEventListener('click', () => {
    widget.classList.remove('imm-collapsed')
  })
  if (retry && onRetry) retry.addEventListener('click', () => {
    const error   = document.getElementById('immora-error')
    const loading = document.getElementById('immora-loading')
    if (error)   error.style.display = 'none'
    if (loading) loading.style.display = 'block'
    onRetry()
  })
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ════════════════════════════════════════════════════════════════════════════

function immoraAnimateNumber(el, from, to, duration) {
  const start = performance.now()
  const ease = (t) => 1 - Math.pow(1 - t, 3)
  function step(now) {
    const t = Math.min(1, (now - start) / duration)
    const val = Math.round(from + (to - from) * ease(t))
    el.textContent = String(val)
    if (t < 1) requestAnimationFrame(step)
    else el.textContent = String(to)
  }
  requestAnimationFrame(step)
}

// ════════════════════════════════════════════════════════════════════════════
// CACHE — chrome.storage.local pour éviter de re-faire l'analyse 2× sur la
// même annonce dans la même heure. Diminue les coûts API et accélère le widget.
// ════════════════════════════════════════════════════════════════════════════

const IMMORA_CACHE_TTL_MS = 60 * 60 * 1000 // 1h
const IMMORA_CACHE_MAX_ENTRIES = 100        // garde-fou sur la quota

// Hash très simple d'une URL → clé courte. Suffit pour notre cas (collisions
// rarissimes sur des URLs d'annonces immobilières).
function immoraUrlKey(url) {
  let h = 5381
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h) ^ url.charCodeAt(i)
  return 'i2_' + (h >>> 0).toString(36)
}

async function immoraCacheGet(url) {
  return new Promise((resolve) => {
    try {
      const key = immoraUrlKey(url)
      chrome.storage.local.get([key], (items) => {
        const entry = items?.[key]
        if (!entry || (Date.now() - entry.t) > IMMORA_CACHE_TTL_MS) {
          resolve(null); return
        }
        resolve(entry.r)
      })
    } catch (_) { resolve(null) }
  })
}

async function immoraCacheSet(url, result) {
  try {
    const key = immoraUrlKey(url)
    chrome.storage.local.set({ [key]: { t: Date.now(), r: result } })
    // GC opportuniste : si on dépasse la limite, on purge les plus vieilles
    chrome.storage.local.get(null, (all) => {
      const entries = Object.entries(all || {}).filter(([k]) => k.startsWith('i2_'))
      if (entries.length > IMMORA_CACHE_MAX_ENTRIES) {
        const toRemove = entries
          .sort((a, b) => (a[1]?.t ?? 0) - (b[1]?.t ?? 0))
          .slice(0, entries.length - IMMORA_CACHE_MAX_ENTRIES)
          .map(([k]) => k)
        chrome.storage.local.remove(toRemove)
      }
    })
  } catch (_) {}
}

// ════════════════════════════════════════════════════════════════════════════
// AUTH — Récupère le token Supabase via le service worker (background.js)
// ════════════════════════════════════════════════════════════════════════════

// Cache du token + tier dans la mémoire du content script (valide pour la
// durée de vie de la page). On les rafraîchit à chaque init().
let immoraAuthToken = null
let immoraUserTier = null // 'free' | 'pro' | 'business' | null (anonyme)

async function immoraFetchAuthToken() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }, (resp) => {
        if (chrome.runtime.lastError) { resolve(null); return }
        resolve(resp?.token ?? null)
      })
    } catch (_) { resolve(null) }
  })
}

// ════════════════════════════════════════════════════════════════════════════
// API — Appel POST à /api/quick-analysis (avec Authorization si dispo)
// ════════════════════════════════════════════════════════════════════════════

async function immoraCallAPI(data, opts = {}) {
  const { skipCache = false } = opts
  // Clé de cache = URL de la page + tier actuel (Free et Pro ont des réponses
  // différentes pour la même URL → pas de mélange).
  const cacheKey = `${location.href}|${immoraUserTier ?? 'anon'}|t=${data.travaux ?? 0}`

  if (!skipCache) {
    const cached = await immoraCacheGet(cacheKey)
    if (cached) return cached
  }

  const headers = { 'Content-Type': 'application/json' }
  if (immoraAuthToken) {
    headers['Authorization'] = `Bearer ${immoraAuthToken}`
  }

  const resp = await fetch(`${IMMORA_API}/api/quick-analysis`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(data),
  })

  // L'API renvoie le tier de l'utilisateur dans le header (pour info UI)
  const tierHeader = resp.headers.get('x-immora-tier')
  if (tierHeader) immoraUserTier = tierHeader

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const json = await resp.json()
  // On ne cache que les réponses concluantes
  immoraCacheSet(cacheKey, json)
  return json
}

// ════════════════════════════════════════════════════════════════════════════
// PARSEURS COMMUNS
// ════════════════════════════════════════════════════════════════════════════

function immoraExtractPrice(text) {
  if (!text) return 0
  const patterns = [
    /(\d{1,3}(?:[\s.]\d{3})+)\s*€/g,     // 250 000 € ou 250.000€
    /(\d{1,3}(?:,\d{3})+)\s*€/g,          // 250,000€
    /(\d{5,7})\s*€/g,                      // 250000€
    /(\d{1,3})\s*k\s*€/gi,                 // 250k€
  ]
  let best = 0
  for (const re of patterns) {
    let m; re.lastIndex = 0
    while ((m = re.exec(text)) !== null) {
      let val = parseFloat(m[1].replace(/[\s.,]/g, ''))
      if (re.source.includes('k')) val *= 1000
      if (val > 10000 && val < 10_000_000 && val > best) best = val
    }
  }
  return Math.round(best)
}

function immoraExtractSurface(text) {
  if (!text) return 0
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i)
  if (m) {
    const s = parseFloat(m[1].replace(',', '.'))
    if (s > 5 && s < 2000) return Math.round(s)
  }
  return 0
}

function immoraCleanCity(text) {
  return (text || '')
    .trim()
    .replace(/\d{5}/g, '')
    .replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(/[,\n]/)[0]
    .trim()
    .slice(0, 50)
}

function immoraGetVisibleText() {
  const clone = document.body.cloneNode(true)
  clone.querySelectorAll('script, style, noscript, svg').forEach(el => el.remove())
  return clone.innerText || clone.textContent || ''
}

// Recherche récursive dans un objet JSON
function immoraDeepFind(obj, keys, depth = 0) {
  if (depth > 8 || !obj || typeof obj !== 'object') return null
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      const found = immoraDeepFind(val, keys, depth + 1)
      if (found) return found
    }
  }
  return null
}

// Extraction prix depuis __NEXT_DATA__ ou autre objet de page
function immoraExtractFromNextData(keys) {
  try {
    const el = document.getElementById('__NEXT_DATA__')
    if (!el) return null
    return immoraDeepFind(JSON.parse(el.textContent), keys)
  } catch (_) { return null }
}

// Extraction depuis les balises JSON-LD schema.org
function immoraExtractFromJsonLd(types = ['realestate', 'product', 'listing', 'offer']) {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const script of scripts) {
      const json = JSON.parse(script.textContent)
      const items = Array.isArray(json) ? json : [json]
      for (const item of items) {
        const type = (item['@type'] || '').toLowerCase()
        if (types.some(t => type.includes(t))) return item
      }
    }
  } catch (_) {}
  return null
}

// Extraction DPE depuis le texte de la page
function immoraExtractDpe(text) {
  const m = text.match(/\b(?:classe\s+)?DPE\s*:?\s*([A-G])\b/i)
    ?? text.match(/\bénergie\s*:?\s*([A-G])\b/i)
    ?? text.match(/\bclasse\s+(?:énergie|énergétique)\s*:?\s*([A-G])\b/i)
    ?? text.match(/\b([A-G])\s*(?:kWh|classe\s+DPE)/i)
  return m ? m[1].toUpperCase() : null
}

// Extraction nombre de pièces
function immoraExtractRooms(text) {
  const m = text.match(/(\d+)\s*(?:pièces?|rooms?|p\.)/i)
    ?? text.match(/(\d+)\s*pcs?/i)
  if (m) {
    const n = parseInt(m[1])
    if (n > 0 && n < 30) return n
  }
  return null
}

// Extraction code postal (5 chiffres)
function immoraExtractPostalCode(text) {
  const m = text.match(/\b(7[5-9]\d{3}|[0-9]{5})\b/)
  if (m) return m[1]
  // Depuis l'URL
  const urlM = window.location.href.match(/[^a-z](\d{5})[^a-z]/)
  return urlM ? urlM[1] : null
}

// Extraction étage (0 = RDC, -1 = non trouvé)
function immoraExtractEtage(text) {
  const t = text.toLowerCase()
  if (/\brdc\b|rez[- ]de[- ]chauss/i.test(t)) return 0
  const m = t.match(/(\d{1,2})(?:er|ème|e|eme|nd)?\s*(?:étage|etage|floor)/i)
    ?? t.match(/étage\s*:?\s*(\d{1,2})/i)
    ?? t.match(/\bau\s+(\d{1,2})/i)
  if (m) {
    const n = parseInt(m[1])
    if (n >= 0 && n <= 50) return n
  }
  return null
}

// Extraction état du bien
function immoraExtractEtat(text) {
  const t = text.toLowerCase()
  if (/neuf|programme\s*neuf|livraison|vefa/i.test(t)) return 'neuf'
  if (/refait\s*(?:à\s*neuf)?|rénov|réhabilit|entièrement\s*refait|tout\s*refait/i.test(t)) return 'refait'
  if (/travaux\s*(?:à\s*prévoir|nécessaires?|importants?)|à\s*rénover|à\s*rafraîchir/i.test(t)) return 'travaux'
  if (/bon\s*état|bien\s*entretenu|très\s*bon|parfait\s*état/i.test(t)) return 'bon'
  return null
}

// Extraction type de chauffage
function immoraExtractChauffage(text) {
  const t = text.toLowerCase()
  if (/chauffage\s*(?:urbain|collectif\s*gaz|au\s*gaz\s*collect)/i.test(t)) return 'collectif-gaz'
  if (/pompe\s*à\s*chaleur|pac\b|thermodynamique/i.test(t)) return 'pac'
  if (/chauffage\s*(?:individuel|autonome)/i.test(t)) return 'individuel-gaz'
  if (/chauffage\s*electr|convecteur|radiateur\s*electr|tout\s*electr/i.test(t)) return 'electrique'
  if (/chaudière\s*(?:gaz|individuelle)|gaz\s*(?:de\s*ville|naturel)/i.test(t)) return 'individuel-gaz'
  if (/chauffage\s*collectif/i.test(t)) return 'collectif'
  return null
}

// Extraction aménités depuis le texte de l'annonce
function immoraExtractAmenities(text) {
  const t = text.toLowerCase()
  return {
    parking:    /\bparking\b|\bgarage\b|\bplace\s*de\s*stat|\bstationnement\b|\bbox\s*(?:fermé|privatif|double)/i.test(t),
    cave:       /\bcave\b|\bcellier\b|\bgrenier\b/i.test(t),
    balcon:     /\bbalcon\b/i.test(t),
    terrasse:   /\bterrasse\b/i.test(t),
    jardin:     /\bjardin\b|\bcour\b|\bespaces?\s*verts?\b/i.test(t),
    ascenseur:  /\bascenseur\b|\blift\b/i.test(t),
    digicode:   /\bdigicode\b|\binterphone\b|\bvidéophone\b|\bvisiophone\b/i.test(t),
    piscine:    /\bpiscine\b/i.test(t),
    gardien:    /\bgardien\b|\bconcierg/i.test(t),
    calme:      /\bcalme\b|\btranquille\b|\bpas\s*de\s*vis[- ]à[- ]vis\b/i.test(t),
    lumineux:   /\blumineux\b|\bensoleillé\b|\bbien\s*exposé\b|\bplein\s*sud\b|\bsud[- ]est\b/i.test(t),
    doubleLiving: /\bdouble\s*(?:séjour|salon|living)\b|\bsalon\s*(?:double|lumineux)\b/i.test(t),
  }
}

// Extraction complète de la description de l'annonce (texte brut)
function immoraExtractFullDescription() {
  // Sélecteurs communs pour la description longue sur les portails FR
  const selectors = [
    '[data-testid="description"]',
    '[class*="description" i]',
    '[class*="Description"]',
    '[class*="comment" i]',
    '[class*="Comment"]',
    '[itemprop="description"]',
    '.ad-description',
    '.listing-description',
    '#description',
    '[data-qa-id="adview_description_container"]',
    '[class*="adDescription" i]',
  ]
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel)
      if (el) {
        const text = el.textContent.replace(/\s+/g, ' ').trim()
        if (text.length > 50) return text.slice(0, 1500) // max 1500 chars
      }
    } catch (_) {}
  }
  return null
}

// Extraction quartier depuis le texte de l'annonce
function immoraExtractQuartier(text) {
  if (!text) return null
  // Patterns courants : "quartier Bastille", "secteur Confluence", "proche Bellecour"
  const patterns = [
    /quartier\s+([A-ZÀ-Ÿa-zA-Zà-ÿ\s-]{2,30}?)(?:\s*[,\-.]|\s*$)/i,
    /secteur\s+([A-ZÀ-Ÿa-zA-Zà-ÿ\s-]{2,30}?)(?:\s*[,\-.]|\s*$)/i,
    /\bproche\s+(?:du\s+|de\s+(?:la\s+|l['']\s*)?)?([A-ZÀ-Ÿ][a-zA-Zà-ÿ\s-]{2,25})(?:\s*[,\-.]|\s*$)/i,
    /arrondissement[s\s]*:?\s*([0-9]{1,2}(?:er|ème|e)?)/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m && m[1]) return m[1].trim().slice(0, 40)
  }
  return null
}

// Extraction complète enrichie — appelle toutes les fonctions ci-dessus
function immoraExtractEnrichissement(baseData) {
  const desc = immoraExtractFullDescription()
  const bodyText = immoraGetVisibleText()
  const fullText = (desc || '') + ' ' + bodyText

  const amenities  = immoraExtractAmenities(fullText)
  const etat       = immoraExtractEtat(fullText)
  const chauffage  = immoraExtractChauffage(fullText)
  const etage      = immoraExtractEtage(fullText)
  const cp         = immoraExtractPostalCode(bodyText)
  const quartier   = baseData.quartier ?? immoraExtractQuartier(fullText)

  // Charges copro dans la description
  let chargesCopro = baseData.chargesCopro
  if (!chargesCopro) {
    const m = fullText.match(/charges?\s*(?:de\s+)?(?:copro[^\s]*)?\s*:?\s*(\d[\d\s]*)\s*€\/(?:mois|an|m)/i)
    if (m) {
      const c = parseInt(m[1].replace(/\s/g, ''))
      if (c > 0 && c < 5000) chargesCopro = c < 500 ? c * 12 : c
    }
  }

  // Taxe foncière dans la description
  let taxeFonciere = baseData.taxeFonciere
  if (!taxeFonciere) {
    const m = fullText.match(/taxe\s+fonci[eè]re\s*:?\s*(\d[\d\s]*)\s*€/i)
    if (m) {
      const t = parseInt(m[1].replace(/\s/g, ''))
      if (t > 0 && t < 20000) taxeFonciere = t
    }
  }

  // Loyer actuel si mentionné (bien loué)
  let loyerActuel = null
  const loyerMatch = fullText.match(/loué?\s+(?:actuellement\s+)?(?:à\s+)?(\d[\d\s]*)\s*€\s*\/?\s*mois/i)
    ?? fullText.match(/loyer\s*(?:actuel|en\s*cours|mensuel)?\s*:?\s*(\d[\d\s]*)\s*€/i)
  if (loyerMatch) {
    const l = parseInt(loyerMatch[1].replace(/\s/g, ''))
    if (l > 100 && l < 20000) loyerActuel = l
  }

  // Titre + description envoyés au backend pour le matching quartier
  // (alias quartiers Mosson / Hauts de Massane / Antigone / etc.)
  const titre = document.querySelector('h1')?.textContent?.trim().slice(0, 200) || ''
  const adresseEl = document.querySelector('[itemprop="address"], [class*="address" i], address')
  const adresse = adresseEl?.textContent?.trim().slice(0, 200) || ''

  return {
    ...baseData,
    ...(cp         ? { codePostal: cp }         : {}),
    ...(quartier   ? { quartier }                : {}),
    ...(etage !== null ? { etage }              : {}),
    ...(etat       ? { etat }                   : {}),
    ...(chauffage  ? { chauffage }              : {}),
    ...(chargesCopro ? { chargesCopro }         : {}),
    ...(taxeFonciere ? { taxeFonciere }         : {}),
    ...(loyerActuel  ? { loyerActuel }          : {}),
    ...(titre        ? { titre }                : {}),
    ...(adresse      ? { adresse }              : {}),
    ...(desc         ? { description: desc.slice(0, 2000) } : {}),
    amenities,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXTRACTION PHOTOS — URLs du carrousel de l'annonce
// ════════════════════════════════════════════════════════════════════════════

function immoraExtractPhotos() {
  const urls = new Set()

  // ── Sélecteurs génériques (tous portails) ──────────────────────────────────
  const imgSelectors = [
    // SeLoger
    '[data-testid*="photo" i] img',
    '[class*="PhotoCarousel" i] img',
    '[class*="photoCarousel" i] img',
    '[class*="SlidePhoto" i] img',
    '[class*="Media"] img[src*="seloger"]',
    // Leboncoin
    '[data-qa-id="gallery"] img',
    '[data-testid="slider"] img',
    '[class*="carousel" i] img[src*="leboncoin"]',
    '[class*="Carousel" i] img[src*="leboncoin"]',
    // BienIci
    '[class*="gallery" i] img[src*="bienici"]',
    '[class*="Gallery" i] img[src*="bienici"]',
    '[class*="Photo" i] img[src*="bienici"]',
    // Logic-Immo
    '[class*="slider" i] img[src*="logic-immo"]',
    '[class*="photo" i] img[src*="logic-immo"]',
    // PAP
    '[class*="gallery" i] img[src*="pap"]',
    '[class*="photo" i] img[src*="pap"]',
    // Générique — galeries d'images
    '[class*="gallery" i] img',
    '[class*="Gallery" i] img',
    '[class*="carousel" i] img',
    '[class*="Carousel" i] img',
    '[class*="slider" i] img',
    '[class*="Slider"] img',
    'picture source[srcset]',
  ]

  for (const sel of imgSelectors) {
    try {
      document.querySelectorAll(sel).forEach(el => {
        let url = ''
        if (el.tagName === 'SOURCE') {
          // Prend la première URL du srcset
          const srcset = el.getAttribute('srcset') || ''
          url = srcset.split(',')[0].trim().split(' ')[0]
        } else {
          url = el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || ''
        }
        url = url.trim()
        if (url && url.startsWith('http') && immoraIsPhotoUrl(url)) {
          urls.add(immoraGetFullResUrl(url))
        }
      })
    } catch (_) {}
    if (urls.size >= 8) break
  }

  // ── Fallback : toutes les images > 300px de la page ──────────────────────
  if (urls.size < 2) {
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || ''
      if (src.startsWith('http')
        && (img.naturalWidth > 300 || img.width > 300 || parseInt(img.getAttribute('width') || '0') > 300)
        && immoraIsPhotoUrl(src)) {
        urls.add(immoraGetFullResUrl(src))
      }
    })
  }

  // Retourne max 5 photos (les premières = les plus représentatives)
  return Array.from(urls).slice(0, 5)
}

// Filtre les URLs qui ressemblent à des photos de bien (pas logos, icônes, maps)
function immoraIsPhotoUrl(url) {
  const low = url.toLowerCase()
  // Exclusions
  if (low.includes('logo') || low.includes('icon') || low.includes('avatar')
    || low.includes('map') || low.includes('badge') || low.includes('sprite')
    || low.includes('pixel') || low.includes('tracking') || low.includes('placeholder')
    || /\/(ads?|pub|banner)\//i.test(url)) return false
  // Inclusions : formats image courants
  return /\.(jpe?g|png|webp)(\?|$)/i.test(url)
    || low.includes('/visuels/') || low.includes('/photos/')
    || low.includes('img.leboncoin') || low.includes('v.seloger')
    || low.includes('bienici.com') || low.includes('logic-immo')
    || low.includes('pap.fr')
}

// Tente d'obtenir la version haute résolution d'une URL thumbnail
function immoraGetFullResUrl(url) {
  // SeLoger : remplacer la taille dans l'URL
  url = url.replace(/\/s\/width\/\d+\//, '/s/width/800/')
  url = url.replace(/\/s\/crop\/\d+x\d+\//, '/s/width/800/')
  // Leboncoin : supprimer le suffixe thumbnail
  url = url.replace(/-thumb\.(jpe?g|png|webp)/i, '.$1')
  url = url.replace(/[?&]width=\d+/i, '?width=800')
  return url
}

// ════════════════════════════════════════════════════════════════════════════
// INIT — Logique commune de lancement avec retry pour SPA
// ════════════════════════════════════════════════════════════════════════════

function immoraInit({ isDetailPage, extractData, source, maxRetries = 5, retryDelay = 800 }) {
  if (!isDetailPage()) return
  if (document.getElementById('immora-widget')) return

  const widget = immoraCreateWidget(source)
  if (!widget) return

  // Récupère le token auth en parallèle de l'extraction des données.
  // Sans token → user anonyme → API renvoie un score basique.
  immoraFetchAuthToken().then((t) => { immoraAuthToken = t })

  // ── Appel API principal ──────────────────────────────────────────────────
  const doAnalyse = (data, onSuccess) => {
    immoraCallAPI(data)
      .then(r => {
        // On joint les params envoyés à la réponse, utile au bouton "Sauver"
        if (r && typeof r === 'object') r.__sentParams = data
        immoraRenderResults(r)
        if (onSuccess) onSuccess(r, data)
      })
      .catch((err) => {
        console.error('[IMMORA]', err)
        immoraShowError('Erreur de connexion à l\'API IMMORA.')
      })
  }

  // ── Phase 2 : analyse photos async ──────────────────────────────────────
  const doPhotoAnalysis = (data, initialResult) => {
    const photoUrls = immoraExtractPhotos()
    if (!photoUrls || photoUrls.length === 0) return

    // Afficher le spinner photo dans le widget
    immoraShowPhotoLoading(photoUrls.length)

    const photoHeaders = { 'Content-Type': 'application/json' }
    if (immoraAuthToken) photoHeaders['Authorization'] = `Bearer ${immoraAuthToken}`

    fetch(`${IMMORA_API}/api/photo-analysis`, {
      method:  'POST',
      headers: photoHeaders,
      body: JSON.stringify({
        imageUrls: photoUrls,
        surface:   data.surface,
        typeBien:  data.typeBien ?? 'Appartement',
        ville:     data.ville ?? '',
        prixAchat: data.prixAchat,
      }),
    })
    .then(async (r) => {
      // 402 Payment Required → user Free, on affiche un teaser Pro
      if (r.status === 402) {
        immoraShowPhotoUpgrade()
        return null
      }
      // 503 = ANTHROPIC_API_KEY manquant sur le serveur → on cache silencieusement
      // (problème de config infra, pas la faute de l'utilisateur)
      if (r.status === 503) {
        immoraHidePhotoLoading()
        console.warn('[IMMORA photos] serveur non configuré (503)')
        return null
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then(photoResult => {
      if (!photoResult) return // 402 déjà géré
      immoraRenderPhotoAnalysis(photoResult, data.prixAchat)

      // Si travaux significatifs (>3% du prix) → recalcul avec travaux
      const travauxTotal = photoResult.travauxTotal ?? 0
      if (travauxTotal > (data.prixAchat * 0.03)) {
        const enrichedData = { ...data, travaux: travauxTotal }
        immoraCallAPI(enrichedData)
          .then(updatedResult => {
            immoraUpdateScoreAfterTravaux(updatedResult, initialResult)
          })
          .catch(() => {}) // silencieux si le recalcul échoue
      }
    })
    .catch(err => {
      console.warn('[IMMORA photos]', err)
      immoraHidePhotoLoading()
    })
  }

  // ── Extraction avec retry ─────────────────────────────────────────────────
  const tryExtract = (attempt = 0) => {
    let data = {}
    try {
      data = extractData() || {}
    } catch (e) {
      console.warn('[IMMORA] extractData erreur:', e)
    }
    if (!data.prixAchat && attempt < maxRetries) {
      setTimeout(() => tryExtract(attempt + 1), retryDelay)
      return
    }
    if (!data.prixAchat) {
      immoraShowError('Prix introuvable. Essayez "Réessayer" une fois la page chargée.')
      return
    }
    // Indicateur de complétude dans le widget
    const completeness = immoraExtractionCompleteness(data)
    immoraSetSourceBadge(source, completeness)

    // Phase 1 : analyse rapide
    doAnalyse(data, (result) => {
      // Phase 2 : analyse photos (après 500ms pour laisser le widget s'afficher)
      /* analyse photo désactivée dans la refonte v2 — à réintégrer */
    })
  }

  immoraSetupToggle(widget, () => {
    const data = extractData()
    if (!data.prixAchat) {
      immoraShowError('Prix introuvable sur cette page.')
      return
    }
    doAnalyse(data, null)
  })

  setTimeout(() => tryExtract(), 1000)
}

// ── Helpers UI pour la section photos ────────────────────────────────────────

function immoraShowPhotoLoading(nbPhotos) {
  const el = document.getElementById('immora-photo-section')
  if (el) {
    el.style.display = 'block'
    el.innerHTML = `
      <div class="immo-photo-loading">
        <div class="immo-spinner-small"></div>
        <span>Analyse de ${nbPhotos} photo${nbPhotos > 1 ? 's' : ''} en cours…</span>
      </div>`
  }
}

function immoraHidePhotoLoading() {
  const el = document.getElementById('immora-photo-section')
  if (el) el.style.display = 'none'
}

// Bandeau d'avertissement (DPE F/G, autres severities)
function immoraRenderWarnings(warnings) {
  const wrap = document.getElementById('imm-warnings')
  if (!wrap) return
  if (!warnings || !warnings.length) { wrap.innerHTML = ''; return }
  const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>`
  wrap.innerHTML = warnings.map((w) => {
    const cls = w.severity === 'critical' ? 'imm-warn-critical' : 'imm-warn-high'
    return `<div class="imm-warn ${cls}">${icon}<span>${w.message}</span></div>`
  }).join('')
}

function immoraShowPhotoUpgrade() {
  const el = document.getElementById('immora-photo-section')
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div class="immo-photo-upgrade">
      <div class="immo-photo-upgrade-left">
        <div class="immo-photo-upgrade-label">Analyse travaux par IA</div>
        <div class="immo-photo-upgrade-text">Estimation chiffrée des travaux poste par poste (cuisine, sdb, peinture…) à partir des photos de l'annonce.</div>
      </div>
      <a class="immo-photo-upgrade-cta" href="${IMMORA_API}/checkout/start?plan=pro&cycle=annual" target="_blank" rel="noopener">
        Pro · 12,90€/mois
      </a>
    </div>`
}

// Met à jour le badge source en bas (avec compteur de complétude)
function immoraSetSourceBadge(source, completeness) {
  const { detected, total } = completeness
  const pct = total ? Math.round((detected / total) * 100) : 0
  const color = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171'
  const cnt = document.getElementById('imm-data-count')
  const dot = document.getElementById('imm-data-dot')
  const bar = document.getElementById('imm-data-fill')
  if (cnt) cnt.textContent = `${detected}/${total}`
  if (dot) dot.style.background = color
  if (bar) { bar.style.background = color; requestAnimationFrame(() => { bar.style.width = pct + '%' }) }
}

function immoraExtractionCompleteness(data) {
  const fields = [
    'prixAchat', 'surface', 'ville', 'dpe', 'nbPieces', 'typeBien',
    'codePostal', 'etage', 'etat', 'chauffage',
    'chargesCopro', 'taxeFonciere', 'loyerActuel',
  ]
  const detected = fields.filter((k) => data?.[k] !== undefined && data[k] !== null && data[k] !== '').length
  // Aménités détectées comptent comme 1 champ si au moins 1 trouvée
  const amen = data?.amenities ? Object.values(data.amenities).some(Boolean) ? 1 : 0 : 0
  return { detected: detected + amen, total: fields.length + 1 }
}

function immoraRenderPhotoAnalysis(r, prixAchat) {
  const el = document.getElementById('immora-photo-section')
  if (!el) return

  const urgenceLabel = { immediate: 'Urgent', 'court-terme': '< 2 ans', optionnel: 'Optionnel' }
  const urgenceClass = { immediate: 'immo-tag-red', 'court-terme': 'immo-tag-amber', optionnel: 'immo-tag-green' }

  const etatConfig = {
    'neuf':             { color: '#10b981', label: 'Neuf', emoji: '✨' },
    'tres-bon':         { color: '#10b981', label: 'Très bon état', emoji: '✅' },
    'bon':              { color: '#34d399', label: 'Bon état', emoji: '👍' },
    'rafraichissement': { color: '#f59e0b', label: 'Rafraîchissement', emoji: '🖌️' },
    'renovation-legere':{ color: '#f97316', label: 'Rénovation légère', emoji: '🔨' },
    'renovation-lourde':{ color: '#ef4444', label: 'Rénovation lourde', emoji: '🏗️' },
  }

  const cfg = etatConfig[r.etatGeneral] ?? etatConfig['bon']
  const total = r.travauxTotal ?? 0
  const pct   = prixAchat > 0 ? Math.round((total / prixAchat) * 100) : null
  const fmt   = v => v.toLocaleString('fr-FR') + ' €'

  // Postes triés par coût décroissant, on n'affiche que ceux > 0
  const postesVisible = (r.postes ?? [])
    .filter(p => p.cout > 0)
    .sort((a, b) => b.cout - a.cout)
    .slice(0, 6)

  el.style.display = 'block'
  el.innerHTML = `
    <div class="immo-photo-header" id="immo-photo-toggle" style="cursor:pointer">
      <div class="immo-photo-header-left">
        <span class="immo-photo-label">📸 Analyse travaux · ${r.photosAnalysees ?? '?'} photo${(r.photosAnalysees ?? 0) > 1 ? 's' : ''}</span>
        <div class="immo-photo-etat" style="color:${cfg.color}">${cfg.emoji} ${cfg.label}</div>
      </div>
      <div class="immo-photo-header-right">
        ${total > 0 ? `<div class="immo-photo-total" style="color:${cfg.color}">${fmt(total)}</div>` : '<div class="immo-photo-total" style="color:#10b981">Aucun travaux</div>'}
        ${pct !== null && total > 0 ? `<div class="immo-photo-pct">${pct}% du prix</div>` : ''}
        <div class="immo-photo-chevron" id="immo-photo-chevron">▸</div>
      </div>
    </div>
    <div id="immo-photo-detail" style="display:none">
      <div class="immo-photo-resume">${r.resume ?? ''}</div>
      ${postesVisible.length > 0 ? `
      <div class="immo-photo-postes">
        ${postesVisible.map(p => `
          <div class="immo-photo-poste">
            <div class="immo-photo-poste-left">
              <span class="immo-photo-poste-name">${p.poste}</span>
              <span class="immo-photo-poste-etat">${p.etat ?? ''}</span>
            </div>
            <div class="immo-photo-poste-right">
              <span class="immo-photo-poste-cout">${fmt(p.cout)}</span>
              <span class="immo-tag ${urgenceClass[p.urgence] ?? 'immo-tag-amber'}">${urgenceLabel[p.urgence] ?? ''}</span>
            </div>
          </div>`).join('')}
      </div>` : ''}
      <div class="immo-photo-fourchette">
        Fourchette : ${fmt(r.fourchetteBasse)} – ${fmt(r.fourchetteHaute)}
        <span class="immo-photo-confidence">(confiance ${r.confidence ?? 0}%)</span>
      </div>
    </div>`

  // Toggle collapse/expand
  const toggle = document.getElementById('immo-photo-toggle')
  const detail = document.getElementById('immo-photo-detail')
  const chevron = document.getElementById('immo-photo-chevron')
  if (toggle && detail && chevron) {
    // Ouvrir par défaut si travaux significatifs
    if (total > 5000) {
      detail.style.display = 'block'
      chevron.textContent = '▾'
    }
    toggle.addEventListener('click', () => {
      const open = detail.style.display !== 'none'
      detail.style.display = open ? 'none' : 'block'
      chevron.textContent  = open ? '▸' : '▾'
    })
  }
}

// Mise à jour du score + KPIs après recalcul avec travaux
function immoraUpdateScoreAfterTravaux(updated, initial) {
  if (!updated || !initial) return
  const scoreDiff = Math.round(updated.score) - Math.round(initial.score)
  if (Math.abs(scoreDiff) < 2) return // pas de diff notable → on ne touche pas

  const newScore = Math.round(updated.score)
  const newColor = newScore >= 70 ? '#10b981' : newScore >= 50 ? '#f59e0b' : '#ef4444'

  // Ring : nombre + arc + couleur
  const scoreNumberEl = document.getElementById('immora-score-number')
  const scoreBarFill  = document.getElementById('immora-score-bar-fill')
  if (scoreNumberEl) {
    scoreNumberEl.style.transition = 'color 0.4s'
    scoreNumberEl.textContent = newScore
    scoreNumberEl.style.color = newColor
  }
  if (scoreBarFill) {
    scoreBarFill.style.background = newColor
    scoreBarFill.style.width = newScore + '%'
  }
  const miniEl = document.getElementById('immora-mini-score')
  if (miniEl) { miniEl.textContent = newScore; miniEl.style.color = newColor }

  // Stats (cashflow / net / brut) — couleur sur la valeur
  const stat = (id, text, tone) => {
    const el = document.getElementById(id)
    if (el) { el.textContent = text; el.className = 'immo-stat-val immo-' + tone }
  }
  const cfV = Math.round(updated.cashflowMensuel ?? 0)
  stat('immo-cashflow', (cfV >= 0 ? '+' : '') + cfV + ' €', cfV >= 50 ? 'green' : cfV >= -100 ? 'amber' : 'red')
  const rnV = (updated.rendNet ?? 0)
  stat('immo-rend-net', rnV.toFixed(2) + '%', rnV >= 3.5 ? 'green' : rnV >= 2 ? 'amber' : 'red')
  const rbV = (updated.rendBrut ?? 0)
  stat('immo-rend-brut', rbV.toFixed(2) + '%', rbV >= 5 ? 'green' : rbV >= 3.5 ? 'amber' : 'red')

  // Mettre à jour le CTA URL avec les travaux
  const cta = document.getElementById('immora-cta')
  if (cta && updated.analyseUrl) cta.href = updated.analyseUrl

  // Indicateur visuel discret du recalcul
  const notice = document.getElementById('immora-notice')
  if (notice) {
    const sign = scoreDiff > 0 ? '+' : ''
    notice.textContent = `Score recalculé avec travaux (${sign}${scoreDiff} pts)`
    notice.style.color = scoreDiff >= 0 ? 'rgba(16,185,129,0.55)' : 'rgba(245,158,11,0.55)'
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SAVE — Bouton "Sauvegarder dans ma bibliothèque" (Pro/Agence uniquement)
// ════════════════════════════════════════════════════════════════════════════

function immoraRenderSaveButton(result) {
  // On insère un bouton à côté du CTA principal
  const ctaContainer = document.getElementById('immora-cta')?.parentElement
  if (!ctaContainer) return
  if (document.getElementById('immora-save-btn')) return

  const canSave = result?.features?.savePro === true
  const btn = document.createElement('button')
  btn.id = 'immora-save-btn'
  btn.className = canSave ? 'immo-save-btn' : 'immo-save-btn immo-save-btn-locked'
  btn.type = 'button'
  btn.innerHTML = canSave
    ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg> Sauver'
    : '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 016 0v3H9z"/></svg> Pro'

  btn.addEventListener('click', async (e) => {
    e.preventDefault()
    if (!canSave) {
      window.open(`${IMMORA_API}/checkout/start?plan=pro&cycle=annual`, '_blank', 'noopener')
      return
    }
    if (btn.classList.contains('immo-save-loading')) return
    btn.classList.add('immo-save-loading')
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (immoraAuthToken) headers['Authorization'] = `Bearer ${immoraAuthToken}`

      const resp = await fetch(`${IMMORA_API}/api/simulations/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: (document.title || 'Annonce').slice(0, 80),
          params: result.__sentParams || {},
          results: {
            rendBrut: result.rendBrut,
            rendNet: result.rendNet,
            cashflowMensuel: result.cashflowMensuel,
            mensualiteCredit: result.mensualite,
            prixRevient: result.prixRevient,
          },
          score: result.score,
          sourceUrl: location.href,
          sourcePortal: document.getElementById('immora-source-badge')?.textContent?.split('·')[0]?.trim(),
        }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      btn.classList.remove('immo-save-loading')
      btn.classList.add('immo-save-ok')
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Sauvé'
    } catch (err) {
      console.warn('[IMMORA save]', err)
      btn.classList.remove('immo-save-loading')
      btn.textContent = 'Erreur'
      setTimeout(() => {
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg> Sauver'
      }, 2000)
    }
  })

  ctaContainer.appendChild(btn)
}

// Observer SPA : re-lance init() à chaque changement d'URL
function immoraSpaObserver(initFn) {
  let lastUrl = location.href
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      const existing = document.getElementById('immora-widget')
      if (existing) existing.remove()
      setTimeout(initFn, 1500)
    }
  }).observe(document.body, { childList: true, subtree: true })
}
