// ─── IMMORA — Content Script Bien'ici ────────────────────────────────────────
// Dépend de shared.js (chargé avant dans le manifest)
// BienIci = React/Next.js SPA — URL pattern: bienici.com/annonce/vente/...
;(function () {
  'use strict'

  const SOURCE = "Bien'ici"

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
      const energy = ld.energyClass ?? ld.dpe
      if (energy) {
        const dpe = String(energy).match(/[A-G]/)?.[0]
        if (dpe) data.dpe = dpe.toUpperCase()
      }
    }

    // ── Couche 2 : __NEXT_DATA__ ─────────────────────────────────────────────
    try {
      const el = document.getElementById('__NEXT_DATA__')
      if (el) {
        const nd = JSON.parse(el.textContent)
        // BienIci structure: pageProps.propertyDetail ou pageProps.ad
        const propNode = immoraDeepFind(nd, ['propertyDetail', 'property', 'ad', 'listing'])
        if (propNode) {
          const prop = propNode.propertyDetail ?? propNode.property ?? propNode.ad ?? propNode.listing
          if (prop) {
            if (!data.prixAchat && prop.price) {
              const p = immoraExtractPrice(String(prop.price))
              if (p > 10000) data.prixAchat = p
            }
            if (!data.surface && prop.surface) {
              const s = parseFloat(prop.surface)
              if (s > 5 && s < 2000) data.surface = Math.round(s)
            }
            if (!data.ville) {
              const city = prop.city ?? prop.location?.city ?? prop.address?.city
              if (city) data.ville = immoraCleanCity(city)
            }
            if (!data.dpe && prop.dpe) {
              const dpe = String(prop.dpe).match(/[A-G]/)?.[0]
              if (dpe) data.dpe = dpe.toUpperCase()
            }
            if (!data.nbPieces && prop.rooms) data.nbPieces = parseInt(prop.rooms)
          }
        }
      }
    } catch (_) {}

    // ── Couche 3 : Meta OG ────────────────────────────────────────────────────
    if (!data.prixAchat) {
      const metas = [
        document.querySelector('meta[property="og:title"]'),
        document.querySelector('meta[property="og:description"]'),
        document.querySelector('meta[name="description"]'),
      ]
      for (const meta of metas) {
        if (!meta) continue
        const content = meta.getAttribute('content') || ''
        if (!data.prixAchat) { const p = immoraExtractPrice(content); if (p > 10000) data.prixAchat = p }
        if (!data.surface) { const s = immoraExtractSurface(content); if (s) data.surface = s }
      }
    }

    // ── Couche 4 : DOM ────────────────────────────────────────────────────────
    if (!data.prixAchat) {
      const priceSelectors = [
        '[class*="price" i]', '[class*="Price"]',
        '[data-testid="price"]', '[itemprop="price"]',
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

    // Regex brute
    const bodyText = immoraGetVisibleText()
    if (!data.prixAchat) { const p = immoraExtractPrice(bodyText); if (p > 10000) data.prixAchat = p }
    if (!data.surface)   { const s = immoraExtractSurface(bodyText); if (s) data.surface = s }
    if (!data.dpe)       { data.dpe = immoraExtractDpe(bodyText) ?? undefined }
    if (!data.nbPieces)  { const r = immoraExtractRooms(bodyText); if (r) data.nbPieces = r }
    if (!data.ville) {
      // BienIci URL: bienici.com/annonce/vente/appartement-5-pieces-paris-75001
      const urlMatch = window.location.pathname.match(/([a-z][a-z-]+)-(\d{5})\/?(?:$|[^/])/i)
      if (urlMatch) data.ville = urlMatch[1].split('-').filter(w => !/^\d+$/.test(w) && w.length > 2).join(' ').replace(/\b\w/g, c => c.toUpperCase())
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
    return /\/annonce\/(vente|location|achat)\//.test(window.location.href)
  }

  function init() {
    immoraInit({ isDetailPage, extractData, source: SOURCE, maxRetries: 6, retryDelay: 1000 })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  immoraSpaObserver(init)

})()
