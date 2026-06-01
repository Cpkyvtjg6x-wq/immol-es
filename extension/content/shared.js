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
  widget.innerHTML = `
    <div id="immora-mini" title="Cliquer pour ouvrir l'analyse IMMORA">
      <div id="immora-mini-score" style="color:#fff">…</div>
      <div id="immora-mini-text">/100<br/><span>IMMORA</span></div>
    </div>
    <div id="immora-card" class="immora-card-tier-anon">
      <div class="immora-aurora"></div>

      <!-- ═══ HEADER ═══ -->
      <div id="immora-header">
        <div id="immora-logo">
          <div id="immora-logo-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <defs><clipPath id="immora-logo-clip"><circle cx="12" cy="12" r="9.1"/></clipPath></defs>
              <g clip-path="url(#immora-logo-clip)">
                <path d="M 4 18 C 11 18 15 8 19 5" stroke="#10b981" stroke-width="1.7" fill="none"/>
                <line x1="2" y1="18" x2="22" y2="18" stroke="#fff" stroke-width="1.7"/>
              </g>
              <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="1.7" fill="none" opacity="0.85"/>
            </svg>
          </div>
          <div id="immora-logo-text">IMMO<span>RA</span></div>
        </div>
        <div id="immora-header-right">
          <div id="immora-source-badge">${source}</div>
          <button id="immora-toggle" title="Réduire" aria-label="Réduire">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" d="M5 12h14"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- ═══ LOADING ═══ -->
      <div id="immora-loading">
        <div class="immo-spinner"></div>
        <p>Analyse en cours…</p>
      </div>

      <!-- ═══ BODY ═══ -->
      <div id="immora-body" style="display:none">

        <!-- ① VERDICT — ring compact à gauche + verdict à droite -->
        <div id="immora-hero">
          <div id="immora-score-ring">
            <svg viewBox="0 0 100 100" width="64" height="64">
              <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.07)" stroke-width="9" fill="none"/>
              <circle id="immora-score-ring-fill" cx="50" cy="50" r="44" stroke="#10b981" stroke-width="9" fill="none"
                stroke-linecap="round" stroke-dasharray="276.46" stroke-dashoffset="276.46"
                transform="rotate(-90 50 50)"/>
            </svg>
            <div id="immora-score-ring-content">
              <div id="immora-score-ring-number">—</div>
            </div>
          </div>
          <div id="immora-verdict">
            <div id="immora-verdict-label">Analyse…</div>
            <div id="immora-verdict-sub">—</div>
          </div>
        </div>

        <!-- ② MÉTRIQUES CLÉS — 2 cartes primaires (net + cashflow) -->
        <div id="immora-metrics">
          <div class="immo-metric" id="immo-metric-net">
            <div class="immo-metric-label">Rendement net</div>
            <div class="immo-metric-value" id="immo-rend-net">—</div>
          </div>
          <div class="immo-metric" id="immo-metric-cf">
            <div class="immo-metric-label">Cashflow / mois</div>
            <div class="immo-metric-value" id="immo-cashflow">—</div>
          </div>
        </div>
        <!-- métriques secondaires — strip compact -->
        <div id="immora-metrics-sec">
          <div class="immo-metric-sec">
            <span class="immo-metric-sec-label">Rendement brut</span>
            <span class="immo-metric-sec-val" id="immo-rend-brut">—</span>
          </div>
          <div class="immo-metric-sec-divider"></div>
          <div class="immo-metric-sec">
            <span class="immo-metric-sec-label">Mensualité crédit</span>
            <span class="immo-metric-sec-val" id="immo-mensualite">—</span>
          </div>
        </div>

        <!-- ③ SOUS-SCORES (label | barre | valeur — alignés sur 1 ligne) -->
        <div id="immora-subscores">
          <div class="immora-sub" data-sub="rentabilite">
            <span class="immora-sub-label">Rentabilité</span>
            <span class="immora-sub-bar"><span class="immora-sub-fill"></span></span>
            <span class="immora-sub-val">—</span>
          </div>
          <div class="immora-sub" data-sub="cashflow">
            <span class="immora-sub-label">Cashflow</span>
            <span class="immora-sub-bar"><span class="immora-sub-fill"></span></span>
            <span class="immora-sub-val">—</span>
          </div>
          <div class="immora-sub" data-sub="fiscalite">
            <span class="immora-sub-label">Fiscalité</span>
            <span class="immora-sub-bar"><span class="immora-sub-fill"></span></span>
            <span class="immora-sub-val">—</span>
          </div>
          <div class="immora-sub" data-sub="marche">
            <span class="immora-sub-label">Marché</span>
            <span class="immora-sub-bar"><span class="immora-sub-fill"></span></span>
            <span class="immora-sub-val">—</span>
          </div>
        </div>

        <!-- ④ OFFRE CONSEILLÉE — rangée compacte (label+détail | prix+tag) -->
        <div id="immora-nego">
          <div class="immo-nego-left">
            <div class="immo-nego-label">Offre conseillée</div>
            <div id="immora-nego-detail" class="immo-nego-detail">—</div>
          </div>
          <div class="immo-nego-right">
            <div id="immora-nego-price" class="immo-nego-price">—</div>
            <div class="immo-nego-row">
              <span id="immora-nego-eco" class="immo-nego-eco">—</span>
              <span id="immora-nego-tag" class="immo-tag-amber">—</span>
            </div>
          </div>
        </div>

        <!-- ⑤ FISCAL — rangée compacte, accent indigo -->
        <div id="immora-fiscal">
          <div class="immo-fiscal-left">
            <div class="immo-fiscal-label">Meilleur régime fiscal</div>
            <div id="immora-fiscal-name" class="immo-fiscal-name">—</div>
          </div>
          <div class="immo-fiscal-right">
            <span id="immora-fiscal-rend" class="immo-fiscal-rend">—</span>
            <span class="immo-fiscal-sub">net-net</span>
          </div>
        </div>

        <!-- ⑥ MARCHÉ -->
        <div id="immora-marche" style="display:none"></div>

        <!-- ⑦ PHOTOS travaux -->
        <div id="immora-photo-section" style="display:none"></div>

        <!-- ⑧ NOTICE -->
        <div id="immora-notice">Loyer marché estimé · 20% apport · 3.5% · TMI 30%</div>

        <!-- ⑨ CTA principal + bouton Sauver -->
        <div id="immora-cta-row">
          <a id="immora-cta" href="#" target="_blank" rel="noopener">
            <span>Analyser en détail</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- ═══ ERROR ═══ -->
      <div id="immora-error" style="display:none">
        <div class="immo-error-icon">!</div>
        <p id="immora-error-msg">Impossible d'extraire les données.</p>
        <button id="immora-retry">Réessayer</button>
      </div>
    </div>`

  document.body.appendChild(widget)
  return widget
}

// ════════════════════════════════════════════════════════════════════════════
// RENDER — Remplissage du widget avec les résultats de l'API
// ════════════════════════════════════════════════════════════════════════════

function immoraRenderResults(r) {
  const score = Math.round(r.score ?? 0)
  const scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'

  // Tag de classe sur la card selon le tier (active des accents premium côté CSS)
  const card = document.getElementById('immora-card')
  if (card) {
    card.classList.remove('immora-card-tier-anon', 'immora-card-tier-free', 'immora-card-tier-pro', 'immora-card-tier-business')
    const tierClass = immoraUserTier ? `immora-card-tier-${immoraUserTier}` : 'immora-card-tier-anon'
    card.classList.add(tierClass)
    // Couleur de fond pilotée par le score (très subtile)
    card.style.setProperty('--immora-score-color', scoreColor)
  }

  // ── Hero : ring SVG (r=44 → C = 2π×44 = 276.46) ────────────────────────
  const ringFill = document.getElementById('immora-score-ring-fill')
  const ringNumber = document.getElementById('immora-score-ring-number')
  const CIRCUMFERENCE = 276.46
  if (ringFill) {
    const offset = CIRCUMFERENCE - (CIRCUMFERENCE * score) / 100
    ringFill.style.stroke = scoreColor
    requestAnimationFrame(() => {
      ringFill.style.transition = 'stroke-dashoffset 1100ms cubic-bezier(0.16,1,0.3,1), stroke 300ms'
      ringFill.style.strokeDashoffset = String(offset)
    })
  }
  if (ringNumber) {
    ringNumber.style.color = scoreColor
    immoraAnimateNumber(ringNumber, 0, score, 1000)
  }

  // Mini badge (collapsed)
  const miniScore = document.getElementById('immora-mini-score')
  if (miniScore) { miniScore.textContent = score; miniScore.style.color = scoreColor }

  // ── Verdict — cohérent avec le CASHFLOW, pas seulement le score ──────────
  // Un fort rendement brut peut donner un score élevé tout en ayant un cashflow
  // négatif : on ne dit alors PAS "Excellent deal" (ce qui jurait avec le −45€
  // rouge affiché juste à côté), mais "Très bon rendement · cashflow quasi
  // neutre". La couleur du verdict suit cette nuance (vert / ambre / rouge).
  const verdictLabel = document.getElementById('immora-verdict-label')
  const verdictSub = document.getElementById('immora-verdict-sub')
  if (verdictLabel && verdictSub) {
    const cf = Math.round(r.cashflowMensuel ?? 0)
    const brut = (r.rendBrut ?? 0).toFixed(1)
    const cfStr = (cf >= 0 ? '+' : '') + cf + ' €/mois'
    let label, sub, vColor
    if (score >= 78) {
      if (cf >= 30) {
        label = 'Excellent deal'; vColor = '#10b981'
        sub = `Cashflow ${cfStr} · ${brut}% brut`
      } else if (cf >= -120) {
        label = 'Très bon rendement'; vColor = '#10b981'
        sub = `${brut}% brut · cashflow quasi neutre (${cfStr})`
      } else {
        label = 'Fort rendement, effort'; vColor = '#f59e0b'
        sub = `${brut}% brut mais cashflow ${cfStr}`
      }
    } else if (score >= 58) {
      if (cf >= 0) {
        label = 'Bon deal'; vColor = '#10b981'
        sub = `Cashflow ${cfStr} · ${brut}% brut`
      } else {
        label = 'Bon deal'; vColor = '#34d399'
        sub = `${brut}% brut · effort ${cfStr}`
      }
    } else if (score >= 40) {
      label = 'Projet correct'; vColor = '#f59e0b'
      sub = `À négocier${r.negoPct ? ` −${r.negoPct}%` : ''} · ${cfStr}`
    } else if (score >= 22) {
      label = 'Rentabilité limitée'; vColor = '#f59e0b'
      sub = `Effort d'épargne ${cfStr}`
    } else {
      label = 'Très surévalué'; vColor = '#ef4444'
      sub = `${cfStr} — pari sur la valorisation`
    }
    verdictLabel.textContent = label
    verdictLabel.style.color = vColor
    verdictSub.textContent = sub
  }

  // ── 4 sous-scores (label | barre | valeur sur 1 ligne) ─────────────────
  const subScores = r.subScores ?? {}
  document.querySelectorAll('#immora-subscores .immora-sub').forEach((el) => {
    const key = el.dataset.sub
    const val = Math.round(subScores[key] ?? 0)
    const fill = el.querySelector('.immora-sub-fill')
    const valEl = el.querySelector('.immora-sub-val')
    if (!fill) return
    const c = val >= 70 ? '#10b981' : val >= 50 ? '#f59e0b' : val >= 30 ? '#fb923c' : '#ef4444'
    fill.style.background = c
    if (valEl) {
      valEl.textContent = val
      valEl.style.color = c
    }
    requestAnimationFrame(() => {
      fill.style.transition = 'width 900ms cubic-bezier(0.16,1,0.3,1)'
      fill.style.width = val + '%'
    })
    el.title = `${val}/100`
  })

  // Warnings DPE F/G
  immoraRenderWarnings(r.warnings ?? [])

  // ── Métriques clés — primaires (rendement net + cashflow), grandes & colorées
  const setMetric = (cardId, valId, text, tone) => {
    const val  = document.getElementById(valId)
    const card = document.getElementById(cardId)
    if (val)  val.textContent = text
    if (card) card.className = 'immo-metric immo-metric-' + tone
  }
  const rnVal = (r.rendNet ?? 0)
  setMetric('immo-metric-net', 'immo-rend-net', rnVal.toFixed(2) + '%',
    rnVal >= 3.5 ? 'green' : rnVal >= 2 ? 'amber' : 'red')
  const cfVal = Math.round(r.cashflowMensuel ?? 0)
  // −45€ = quasi neutre → ambre (pas rouge alarmant), cohérent avec le verdict
  setMetric('immo-metric-cf', 'immo-cashflow', (cfVal >= 0 ? '+' : '') + cfVal + ' €',
    cfVal >= 50 ? 'green' : cfVal >= -100 ? 'amber' : 'red')

  // ── Métriques secondaires — brut + mensualité (strip compact) ───────────
  const rb = document.getElementById('immo-rend-brut')
  if (rb) {
    const rbVal = (r.rendBrut ?? 0)
    rb.textContent = rbVal.toFixed(2) + '%'
    rb.className = 'immo-metric-sec-val ' + (rbVal >= 5 ? 'immo-green' : rbVal >= 3.5 ? 'immo-amber' : 'immo-red')
  }
  const mens = document.getElementById('immo-mensualite')
  if (mens) mens.textContent = Math.round(r.mensualite ?? 0) + ' €'

  // ── Offre conseillée — rangée compacte (plus le bloc-prix géant d'avant) ──
  if (r.prixMax) {
    const fmt    = v => v.toLocaleString('fr-FR') + ' €'
    const negoEl   = document.getElementById('immora-nego')
    const tagEl    = document.getElementById('immora-nego-tag')
    const priceEl  = document.getElementById('immora-nego-price')
    const ecoEl    = document.getElementById('immora-nego-eco')
    const detailEl = document.getElementById('immora-nego-detail')
    const pct    = r.negoPct ?? 0
    const ecoStr = fmt(r.economie ?? 0)
    const m2Str  = r.prixM2 ? `${r.prixM2.toLocaleString('fr-FR')} €/m²` : ''

    if (priceEl) priceEl.textContent = fmt(r.prixMax)
    if (ecoEl)   ecoEl.textContent = r.economie > 0 ? `−${ecoStr}` : 'prix juste'

    if (pct <= 3) {
      if (negoEl)   negoEl.className = 'immo-nego-good'
      if (tagEl)    { tagEl.className = 'immo-tag-green'; tagEl.textContent = `−${pct}%` }
      if (detailEl) detailEl.textContent = `Prix attractif${m2Str ? ' · ' + m2Str : ''}`
    } else if (pct <= 6) {
      if (negoEl)   negoEl.className = ''
      if (tagEl)    { tagEl.className = 'immo-tag-amber'; tagEl.textContent = `−${pct}%` }
      if (detailEl) detailEl.textContent = `Marge de négo standard${m2Str ? ' · ' + m2Str : ''}`
    } else {
      if (negoEl)   negoEl.className = 'immo-nego-warn'
      if (tagEl)    { tagEl.className = 'immo-tag-red'; tagEl.textContent = `−${pct}%` }
      if (detailEl) detailEl.textContent = `Bien surévalué${m2Str ? ' · ' + m2Str : ''}`
    }
  }

  // Régime fiscal
  if (r.bestRegime) {
    const fc = r.bestRegime.rendNetNet >= 4 ? '#10b981' : r.bestRegime.rendNetNet >= 2 ? '#f59e0b' : '#ef4444'
    const nameEl = document.getElementById('immora-fiscal-name')
    const rendEl = document.getElementById('immora-fiscal-rend')
    if (nameEl) nameEl.textContent = r.bestRegime.name
    if (rendEl) { rendEl.textContent = r.bestRegime.rendNetNet.toFixed(2) + '%'; rendEl.style.color = fc }
  }

  // CTA
  const cta = document.getElementById('immora-cta')
  if (cta && r.analyseUrl) cta.href = r.analyseUrl

  // Bouton "Sauvegarder dans ma bibliothèque" (Pro/Agence)
  immoraRenderSaveButton(r)

  // Contexte marché local
  if (r.marcheContext) {
    const mc  = r.marcheContext
    const mel = document.getElementById('immora-marche')
    if (mel && mc.positionnement) {
      const badgeClass = {
        'opportunite':    'badge-opportunite',
        'attractif':      'badge-attractif',
        'correct':        'badge-correct',
        'surevalue':      'badge-surevalue',
        'tres-surevalue': 'badge-tres-surevalue',
      }[mc.positionnement] || 'badge-correct'

      const marcheClass = {
        'opportunite':    'marche-opportunite',
        'attractif':      'marche-attractif',
        'correct':        '',
        'surevalue':      'marche-surevalue',
        'tres-surevalue': 'marche-tres-surevalue',
      }[mc.positionnement] || ''

      const tensionEmoji = { forte: '🔥', moyenne: '📊', faible: '💤' }[mc.tension] || '📊'
      const ref = mc.prixM2Ref ? ` · réf. ${mc.prixM2Ref.toLocaleString('fr-FR')} €/m²` : ''

      mel.className = marcheClass
      mel.style.display = 'flex'
      mel.innerHTML = `
        <div class="immo-marche-left">
          <div class="immo-marche-label">${tensionEmoji} Marché ${mc.ville || 'local'}</div>
          <div class="immo-marche-text">${mc.positionnementLabel || ''}${ref}</div>
        </div>
        <div class="immo-marche-badge ${badgeClass}">${mc.ecartMarche > 0 ? '+' : ''}${mc.ecartMarche}%</div>
      `
    } else if (mel && mc.loyerM2Ref) {
      // Pas de surface → juste afficher le loyer ref
      mel.style.display = 'flex'
      mel.innerHTML = `
        <div class="immo-marche-left">
          <div class="immo-marche-label">📊 Marché ${mc.ville || 'local'}</div>
          <div class="immo-marche-text">Loyer réf. : ${mc.loyerM2Ref} €/m²/mois</div>
        </div>
      `
    }
  }

  // Mise à jour du notice avec la source du loyer et les hypothèses réelles
  const noticeEl = document.getElementById('immora-notice')
  if (noticeEl) {
    const loyerLabel = r.loyerSource === 'annonce'   ? 'loyer issu de l\'annonce'
      : r.loyerSource === 'fourni'   ? 'loyer fourni'
      : r.loyerSource === 'marche'   ? 'loyer marché estimé'
      : 'loyer estimé'
    // Le backend renvoie params.apport et params.tmi → on les utilise tels quels
    const apportPct = r.apportEstime && r.prixAchat ? Math.round((r.apportEstime / r.prixAchat) * 100) : 20
    const tmiUsed = r.tmiUsed ?? 30
    const tierTag = immoraUserTier && immoraUserTier !== 'free' ? ' · ✓ vos paramètres' : ''
    noticeEl.textContent = `${loyerLabel} · ${apportPct}% apport · 3.5% · TMI ${tmiUsed}%${tierTag}`
  }

  // Affichage
  const loading = document.getElementById('immora-loading')
  const body    = document.getElementById('immora-body')
  if (loading) loading.style.display = 'none'
  if (body)    body.style.display = 'block'
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

function immoraSetupToggle(widget, onRetry) {
  const toggle = document.getElementById('immora-toggle')
  const mini   = document.getElementById('immora-mini')
  const retry  = document.getElementById('immora-retry')

  if (toggle) toggle.addEventListener('click', (e) => {
    e.stopPropagation()
    widget.classList.add('immo-collapsed-state')
  })
  if (mini) mini.addEventListener('click', () => {
    widget.classList.remove('immo-collapsed-state')
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
  return 'i_' + (h >>> 0).toString(36)
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
      const entries = Object.entries(all || {}).filter(([k]) => k.startsWith('i_'))
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
      setTimeout(() => doPhotoAnalysis(data, result), 500)
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
  // Supprime un éventuel ancien bandeau
  const existing = document.getElementById('immora-warnings')
  if (existing) existing.remove()
  if (!warnings || warnings.length === 0) return

  const hero = document.getElementById('immora-hero')
  if (!hero) return

  const wrap = document.createElement('div')
  wrap.id = 'immora-warnings'
  wrap.innerHTML = warnings.map((w) => {
    const isCritical = w.severity === 'critical'
    return `<div class="immora-warning ${isCritical ? 'immora-warning-critical' : 'immora-warning-high'}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.85-2.77L13.85 4.78a2 2 0 00-3.7 0L3.15 16.23A2 2 0 005 19z"/>
      </svg>
      <span>${w.message}</span>
    </div>`
  }).join('')

  // Insère juste après le hero (avant les sous-scores)
  hero.parentNode.insertBefore(wrap, hero.nextSibling)
}

// CTA upgrade Pro quand l'analyse photos est gated (free → 402)
function immoraShowPhotoUpgrade() {
  const el = document.getElementById('immora-photo-section')
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div class="immo-photo-upgrade">
      <div class="immo-photo-upgrade-left">
        <div class="immo-photo-upgrade-label">📸 Analyse travaux par IA</div>
        <div class="immo-photo-upgrade-text">Estimation chiffrée des travaux poste par poste (cuisine, sdb, peinture…) à partir des photos de l'annonce.</div>
      </div>
      <a class="immo-photo-upgrade-cta" href="${IMMORA_API}/checkout/start?plan=pro&cycle=annual" target="_blank" rel="noopener">
        Pro · 12,90€/mois
      </a>
    </div>`
}

// Met à jour le badge source en bas (avec compteur de complétude)
function immoraSetSourceBadge(source, completeness) {
  const el = document.getElementById('immora-source-badge')
  if (!el) return
  const { detected, total } = completeness
  let color = '#10b981' // vert
  if (detected < total * 0.5) color = '#ef4444'      // rouge
  else if (detected < total * 0.75) color = '#f59e0b' // ambre
  el.innerHTML = `${source} · <span style="color:${color}">${detected}/${total}</span>`
  el.title = `${detected} champs détectés sur ${total} (les manquants sont estimés)`
}

// Compte les champs réellement extraits (vs estimés/par défaut)
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
  const ringNumber = document.getElementById('immora-score-ring-number')
  const ringFill   = document.getElementById('immora-score-ring-fill')
  if (ringNumber) {
    ringNumber.style.transition = 'color 0.4s'
    ringNumber.textContent = newScore
    ringNumber.style.color = newColor
  }
  if (ringFill) {
    ringFill.style.stroke = newColor
    ringFill.style.strokeDashoffset = String(276.46 - (276.46 * newScore) / 100)
  }
  const miniEl = document.getElementById('immora-mini-score')
  if (miniEl) { miniEl.textContent = newScore; miniEl.style.color = newColor }

  // Cartes métriques (net + cashflow) + brut secondaire
  const setCard = (cardId, valId, text, t) => {
    const val = document.getElementById(valId), card = document.getElementById(cardId)
    if (val)  val.textContent = text
    if (card) card.className = 'immo-metric immo-metric-' + t
  }
  const rnV = (updated.rendNet ?? 0)
  setCard('immo-metric-net', 'immo-rend-net', rnV.toFixed(2) + '%', rnV >= 3.5 ? 'green' : rnV >= 2 ? 'amber' : 'red')
  const cfV = Math.round(updated.cashflowMensuel ?? 0)
  setCard('immo-metric-cf', 'immo-cashflow', (cfV >= 0 ? '+' : '') + cfV + ' €', cfV >= 50 ? 'green' : cfV >= -100 ? 'amber' : 'red')
  const rb = document.getElementById('immo-rend-brut')
  if (rb) {
    const v = (updated.rendBrut ?? 0)
    rb.textContent = v.toFixed(2) + '%'
    rb.className = 'immo-metric-sec-val ' + (v >= 5 ? 'immo-green' : v >= 3.5 ? 'immo-amber' : 'immo-red')
  }

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
