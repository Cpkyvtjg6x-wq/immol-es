// ─── IMMORA — Content Script PAP.fr ──────────────────────────────────────────
// Dépend de shared.js (chargé avant dans le manifest)
;(function () {
  'use strict'

  const SOURCE = 'PAP'

  // ════════════════════════════════════════════════════════════════════════════
  // EXTRACTION
  // ════════════════════════════════════════════════════════════════════════════

  function extractData() {
    const data = { source: SOURCE }

    // ── Couche 1 : JSON-LD ───────────────────────────────────────────────────
    const ld = immoraExtractFromJsonLd(['realestate', 'product', 'listing'])
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
      ]
      for (const meta of metas) {
        if (!meta) continue
        const content = meta.getAttribute('content') || ''
        if (!data.prixAchat) {
          const p = immoraExtractPrice(content)
          if (p > 10000) data.prixAchat = p
        }
        if (!data.surface) {
          const s = immoraExtractSurface(content)
          if (s) data.surface = s
        }
        if (!data.ville && content) {
          const m = content.match(/\bà\s+([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ\s-]{1,30})/u)
          if (m) data.ville = immoraCleanCity(m[1])
        }
      }
    }

    // ── Couche 3 : DOM sélecteurs PAP ────────────────────────────────────────
    if (!data.prixAchat) {
      const priceSelectors = [
        '.price-label', '.ad-price', '[class*="price" i]',
        '[itemprop="price"]', 'span[class*="Price"]', 'p[class*="price" i]',
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
        '[class*="surface" i]', '[class*="area" i]', '[itemprop="floorSize"]',
        'li:has([class*="surface" i])',
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
        '[class*="city" i]', '[class*="location" i]',
        '[itemprop="addressLocality"]', 'address',
        '[class*="localisation" i]',
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

    if (!data.prixAchat) {
      const p = immoraExtractPrice(bodyText)
      if (p > 10000) data.prixAchat = p
    }
    if (!data.surface) {
      const s = immoraExtractSurface(bodyText)
      if (s) data.surface = s
    }
    if (!data.dpe) {
      data.dpe = immoraExtractDpe(bodyText) ?? undefined
    }
    if (!data.nbPieces) {
      const r = immoraExtractRooms(bodyText)
      if (r) data.nbPieces = r
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
    return /\/annonce\//.test(window.location.href)
  }

  function init() {
    immoraInit({ isDetailPage, extractData, source: SOURCE })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    setTimeout(init, 1000)
  }

})()
