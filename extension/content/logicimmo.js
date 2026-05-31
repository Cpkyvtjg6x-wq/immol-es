// ─── IMMORA — Content Script Logic-Immo ──────────────────────────────────────
// Dépend de shared.js (chargé avant dans le manifest)
// Logic-Immo URL patterns: logic-immo.com/detail-vente-..., /annonce-immo/...
;(function () {
  'use strict'

  const SOURCE = 'Logic-Immo'

  // ════════════════════════════════════════════════════════════════════════════
  // EXTRACTION
  // ════════════════════════════════════════════════════════════════════════════

  function extractData() {
    const data = { source: SOURCE }

    // ── Couche 1 : JSON-LD ───────────────────────────────────────────────────
    const ld = immoraExtractFromJsonLd(['realestate', 'product', 'listing', 'offer'])
    if (ld) {
      const priceRaw = ld.price ?? ld.offers?.price
      if (priceRaw) {
        const p = immoraExtractPrice(String(priceRaw))
        if (p > 10000) data.prixAchat = p
      }
      const floor = ld.floorSize?.value ?? ld.floorSize
      if (floor) {
        const s = parseFloat(floor)
        if (s > 5 && s < 2000) data.surface = Math.round(s)
      }
      const loc = ld.address?.addressLocality ?? ld.address?.addressRegion
      if (loc) data.ville = immoraCleanCity(loc)
    }

    // ── Couche 2 : Meta OG ────────────────────────────────────────────────────
    if (!data.prixAchat) {
      const metas = [
        document.querySelector('meta[property="og:title"]'),
        document.querySelector('meta[property="og:description"]'),
        document.querySelector('meta[name="description"]'),
        document.querySelector('meta[itemprop="price"]'),
      ]
      for (const meta of metas) {
        if (!meta) continue
        const content = meta.getAttribute('content') || ''
        if (!data.prixAchat) { const p = immoraExtractPrice(content); if (p > 10000) data.prixAchat = p }
        if (!data.surface) { const s = immoraExtractSurface(content); if (s) data.surface = s }
        if (!data.ville) {
          const m = content.match(/\bà\s+([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ\s-]{1,30})/u)
          if (m) data.ville = immoraCleanCity(m[1])
        }
      }
    }

    // ── Couche 3 : DOM ────────────────────────────────────────────────────────
    if (!data.prixAchat) {
      const priceSelectors = [
        '[class*="price" i]', '[class*="Price"]', '[class*="prix" i]',
        '[itemprop="price"]', '.ad-price', '.listing-price',
        'span[class*="price" i]', 'div[class*="price" i]',
      ]
      for (const sel of priceSelectors) {
        try {
          for (const el of document.querySelectorAll(sel)) {
            const p = immoraExtractPrice(el.textContent)
            if (p > 10000) { data.prixAchat = p; break }
          }
        } catch (_) {}
        if (data.prixAchat) break
      }
    }

    if (!data.surface) {
      const surfSelectors = [
        '[class*="surface" i]', '[itemprop="floorSize"]',
        '[class*="area" i]', 'li:has([class*="m²"])',
      ]
      for (const sel of surfSelectors) {
        try {
          for (const el of document.querySelectorAll(sel)) {
            const s = immoraExtractSurface(el.textContent)
            if (s) { data.surface = s; break }
          }
        } catch (_) {}
        if (data.surface) break
      }
    }

    if (!data.ville) {
      const citySelectors = [
        '[itemprop="addressLocality"]', '[class*="city" i]',
        '[class*="location" i]', 'address',
      ]
      for (const sel of citySelectors) {
        try {
          const el = document.querySelector(sel)
          if (el) {
            const city = immoraCleanCity(el.textContent)
            if (city.length > 2) { data.ville = city; break }
          }
        } catch (_) {}
      }
    }

    // ── Couche 4 : regex brute ─────────────────────────────────────────────
    const bodyText = immoraGetVisibleText()
    if (!data.prixAchat) { const p = immoraExtractPrice(bodyText); if (p > 10000) data.prixAchat = p }
    if (!data.surface)   { const s = immoraExtractSurface(bodyText); if (s) data.surface = s }
    if (!data.dpe)       { data.dpe = immoraExtractDpe(bodyText) ?? undefined }
    if (!data.nbPieces)  { const r = immoraExtractRooms(bodyText); if (r) data.nbPieces = r }
    if (!data.ville) {
      // URL: logic-immo.com/detail-vente-appartement-lyon-69000,...
      const urlMatch = window.location.pathname.match(/-([\w-]+)-(\d{5})/i)
      if (urlMatch) {
        data.ville = urlMatch[1].split('-').filter(w => w.length > 2).join(' ').replace(/\b\w/g, c => c.toUpperCase())
      }
    }

    // Type de bien
    const titleText = (document.title + ' ' + (document.querySelector('h1')?.textContent ?? '')).toLowerCase()
    if (titleText.includes('maison') || titleText.includes('villa')) data.typeBien = 'Maison'
    else if (titleText.includes('studio')) data.typeBien = 'Studio'
    else data.typeBien = 'Appartement'

    return immoraExtractEnrichissement(data)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════════════════════════

  function isDetailPage() {
    const url = window.location.href
    return (
      /\/detail-vente-/.test(url) ||
      /\/detail-location-/.test(url) ||
      /\/annonce-immo\//.test(url) ||
      /\/vente\//.test(url)
    )
  }

  function init() {
    immoraInit({ isDetailPage, extractData, source: SOURCE })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    setTimeout(init, 800)
  }

})()
