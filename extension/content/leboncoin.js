// ─── IMMORA — Content Script Leboncoin ───────────────────────────────────────
// Dépend de shared.js (chargé avant dans le manifest)
;(function () {
  'use strict'

  const SOURCE = 'Leboncoin'

  // ════════════════════════════════════════════════════════════════════════════
  // EXTRACTION — 4 couches de fallback (Leboncoin = React SPA)
  // ════════════════════════════════════════════════════════════════════════════

  function extractData() {
    const data = { source: SOURCE }

    // ── Couche 1 : JSON-LD ───────────────────────────────────────────────────
    const ld = immoraExtractFromJsonLd(['product', 'realestate', 'listing', 'offer'])
    if (ld) {
      const priceRaw = ld.price ?? ld.offers?.price ?? ld.offers?.[0]?.price
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

    // ── Couche 2 : __NEXT_DATA__ ─────────────────────────────────────────────
    if (!data.prixAchat) {
      const priceNode = immoraExtractFromNextData(['price', 'Price', 'amount', 'ad_price', 'listPrice', 'first_publication_date'])
      // Leboncoin stocke souvent le prix dans un objet "price" { value, currency }
      try {
        const el = document.getElementById('__NEXT_DATA__')
        if (el) {
          const nd = JSON.parse(el.textContent)
          // Recherche spécifique Leboncoin : props.pageProps.ad.price
          const adNode = immoraDeepFind(nd, ['ad', 'listing', 'classified'])
          if (adNode) {
            const ad = adNode.ad ?? adNode.listing ?? adNode.classified
            if (ad) {
              const priceVal = ad.price ?? ad.price_cents ? (ad.price_cents / 100) : null
              if (priceVal && immoraExtractPrice(String(priceVal)) > 10000) {
                data.prixAchat = Math.round(priceVal)
              }
              if (ad.attributes) {
                for (const attr of (Array.isArray(ad.attributes) ? ad.attributes : [])) {
                  if (attr.key === 'square' && attr.value) {
                    const s = parseFloat(attr.value)
                    if (s > 5 && s < 2000) data.surface = Math.round(s)
                  }
                  if (attr.key === 'rooms' && attr.value) {
                    const r = parseInt(attr.value)
                    if (r > 0 && r < 30) data.nbPieces = r
                  }
                  if (attr.key === 'energy_rate' && attr.value) {
                    const dpe = String(attr.value).match(/[A-G]/)?.[0]
                    if (dpe) data.dpe = dpe.toUpperCase()
                  }
                }
              }
              if (ad.location) {
                data.ville = immoraCleanCity(ad.location.city ?? ad.location.name ?? '')
              }
            }
          }
        }
      } catch (_) {}
    }

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
        if (!data.prixAchat) {
          const p = immoraExtractPrice(content)
          if (p > 10000) data.prixAchat = p
        }
        if (!data.surface) {
          const s = immoraExtractSurface(content)
          if (s) data.surface = s
        }
      }
    }

    // ── Couche 4 : DOM sélecteurs ─────────────────────────────────────────────
    if (!data.prixAchat) {
      const priceSelectors = [
        '[data-qa-id="adview_price"]',
        '[data-testid="price"]',
        '[class*="price" i]',
        '[aria-label*="prix"]',
        'span[class*="Price"]',
        '[class*="Price"]',
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
        '[data-qa-id="criteria_item_square"]',
        '[aria-label*="m²"]',
        '[class*="surface" i]',
        '[class*="criteria" i]',
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
        '[data-qa-id="adview_location_informations"]',
        '[data-testid="location"]',
        '[class*="location" i]',
        '[class*="Location"]',
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

    // ── Couche 4b : regex brute sur le texte visible ─────────────────────────
    if (!data.prixAchat || !data.surface || !data.ville) {
      const bodyText = immoraGetVisibleText()
      if (!data.prixAchat) {
        const p = immoraExtractPrice(bodyText)
        if (p > 10000) data.prixAchat = p
      }
      if (!data.surface) {
        const s = immoraExtractSurface(bodyText)
        if (s) data.surface = s
      }
      if (!data.ville) {
        const cityMatch = bodyText.match(/(?:situé|ville|localisation|commune)\s*:?\s*([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ\s-]{2,30})/ui)
        if (cityMatch) data.ville = immoraCleanCity(cityMatch[1])
      }
      if (!data.dpe) {
        data.dpe = immoraExtractDpe(bodyText) ?? undefined
      }
      if (!data.nbPieces) {
        const r = immoraExtractRooms(bodyText)
        if (r) data.nbPieces = r
      }
    }

    // ── Type de bien depuis le titre ───────────────────────────────────────────
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
      /\/ad\/\d+/.test(url) ||
      document.querySelector('[data-qa-id="adview_price"]') !== null ||
      document.querySelector('[data-testid="price"]') !== null
    )
  }

  function init() {
    immoraInit({ isDetailPage, extractData, source: SOURCE, maxRetries: 6, retryDelay: 1000 })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  // Leboncoin est une SPA React — essentiel pour la navigation interne
  immoraSpaObserver(init)

})()
