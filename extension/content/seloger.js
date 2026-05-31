// ─── IMMORA — Content Script Seloger ─────────────────────────────────────────
// Dépend de shared.js (chargé avant dans le manifest)
;(function () {
  'use strict'

  const SOURCE = 'Seloger'

  // ════════════════════════════════════════════════════════════════════════════
  // EXTRACTION — 4 couches de fallback
  // ════════════════════════════════════════════════════════════════════════════

  function extractData() {
    const data = { source: SOURCE }

    // ── Couche 1 : JSON-LD (schema.org) ─────────────────────────────────────
    const ld = immoraExtractFromJsonLd(['realestate', 'product', 'listing', 'offer'])
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
      const energy = ld.energyConsumptionDetails?.hasEnergyEfficiencyCategory ?? ld.energyClass ?? ld.dpe
      if (energy) {
        const dpe = String(energy).match(/[A-G]/)?.[0]
        if (dpe) data.dpe = dpe.toUpperCase()
      }
      const rooms = ld.numberOfRooms ?? ld.floorLevel
      if (rooms && parseInt(rooms) > 0 && parseInt(rooms) < 30) data.nbPieces = parseInt(rooms)
    }

    // ── Couche 2 : __NEXT_DATA__ (Next.js hydration) ─────────────────────────
    if (!data.prixAchat) {
      const priceNode = immoraExtractFromNextData(['price', 'prix', 'amount', 'sellPrice', 'rentalPrice',
        'ad_price', 'Price', 'listingPrice', 'offerPrice'])
      if (priceNode) {
        const p = immoraExtractPrice(String(priceNode.price ?? priceNode.prix ?? priceNode.amount ?? ''))
        if (p > 10000) data.prixAchat = p
      }
    }
    if (!data.surface) {
      const sNode = immoraExtractFromNextData(['surface', 'area', 'squareMeter', 'floor_size',
        'floorSize', 'living_area'])
      if (sNode) {
        const sv = parseFloat(sNode.surface ?? sNode.area ?? sNode.squareMeter ?? 0)
        if (sv > 5 && sv < 2000) data.surface = Math.round(sv)
      }
    }
    if (!data.ville) {
      const cNode = immoraExtractFromNextData(['city', 'ville', 'locality', 'town', 'addressLocality'])
      if (cNode) {
        const cityVal = cNode.city ?? cNode.ville ?? cNode.locality ?? cNode.town
        if (cityVal) data.ville = immoraCleanCity(String(cityVal))
      }
    }
    if (!data.dpe) {
      const eNode = immoraExtractFromNextData(['dpe', 'energyClass', 'energy_class', 'energyRating'])
      if (eNode) {
        const eVal = eNode.dpe ?? eNode.energyClass ?? eNode.energy_class
        if (eVal) {
          const dpe = String(eVal).match(/[A-G]/)?.[0]
          if (dpe) data.dpe = dpe.toUpperCase()
        }
      }
    }

    // ── Couche 3 : Meta tags OG ───────────────────────────────────────────────
    if (!data.prixAchat) {
      const metas = [
        document.querySelector('meta[property="og:title"]'),
        document.querySelector('meta[property="og:description"]'),
        document.querySelector('meta[name="description"]'),
        document.querySelector('meta[property="product:price:amount"]'),
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
        if (!data.ville) {
          const cityMatch = content.match(/\bà\s+([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ\s-]{1,30}?)(?:\s+\d{5})?(?:[,.]|$)/u)
          if (cityMatch) data.ville = immoraCleanCity(cityMatch[1])
        }
      }
    }

    // ── Couche 4 : DOM sélecteurs ─────────────────────────────────────────────
    if (!data.prixAchat) {
      const priceSelectors = [
        '[data-test="ad-price"]', '[data-testid="price"]',
        '[class*="Price__"]', '[class*="price__"]', '[class*="price-"]', '[class*="-price"]',
        '[itemprop="price"]', '.price', '#price',
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
        '[data-test="surface"]', '[class*="surface" i]', '[class*="Surface"]',
        '[itemprop="floorSize"]',
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
        '[data-test="city"]', '[class*="city" i]', '[class*="location" i]',
        '[class*="locality" i]', '[itemprop="addressLocality"]', 'address',
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
      const locMatch = bodyText.match(/(?:localisation|situé[e]? à|ville\s*:)\s*([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ\s-]{1,30})/ui)
      if (locMatch) data.ville = immoraCleanCity(locMatch[1])
    }
    if (!data.dpe) {
      data.dpe = immoraExtractDpe(bodyText) ?? undefined
    }
    if (!data.nbPieces) {
      const r = immoraExtractRooms(bodyText)
      if (r) data.nbPieces = r
    }

    // ── Couche 4c : h1 / title / URL ────────────────────────────────────────
    if (!data.prixAchat) {
      const h1 = document.querySelector('h1')
      if (h1) { const p = immoraExtractPrice(h1.textContent); if (p > 10000) data.prixAchat = p }
    }
    if (!data.prixAchat) {
      const p = immoraExtractPrice(document.title)
      if (p > 10000) data.prixAchat = p
    }
    if (!data.ville) {
      const urlMatch = window.location.pathname.match(/\/([a-z][a-z-]+)-\d{2,5}\//i)
      if (urlMatch) data.ville = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }

    // ── Charges copro ─────────────────────────────────────────────────────────
    const chargesMatch = bodyText.match(/charges?\s*(?:de\s+)?(?:copropri[eé]t[eé])?\s*:?\s*(\d[\d\s]*)\s*€/i)
    if (chargesMatch) {
      const c = immoraExtractPrice(chargesMatch[1])
      if (c > 0 && c < 5000) data.chargesCopro = c < 500 ? c * 12 : c
    }

    // ── Type de bien ──────────────────────────────────────────────────────────
    const titleText = (document.title + ' ' + (document.querySelector('h1')?.textContent ?? '')).toLowerCase()
    if (titleText.includes('maison') || titleText.includes('villa')) data.typeBien = 'Maison'
    else if (titleText.includes('studio')) data.typeBien = 'Studio'
    else if (titleText.includes('loft')) data.typeBien = 'Loft'
    else data.typeBien = 'Appartement'

    return immoraExtractEnrichissement(data)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════════════════════════

  function isDetailPage() {
    const url = window.location.href
    const isDetail  = /\/annonces\/\d+/.test(url) || /\.htm[l]?$/.test(url) || /\/achat\//.test(url) || /\/location\//.test(url)
    const isList    = /\/recherche\//.test(url) || /\/liste\//.test(url)
    return isDetail && !isList
  }

  function init() {
    immoraInit({ isDetailPage, extractData, source: SOURCE })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  immoraSpaObserver(init)

})()
