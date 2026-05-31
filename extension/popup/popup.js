// ─── IMMORA Popup ─────────────────────────────────────────────────────────────

const LISTING_PATTERNS = [
  /seloger\.com\/(annonces|achat|location|detail)\//,
  /leboncoin\.fr\/(ad|annonces|ventes_immobilieres|locations)\//,
  /pap\.fr\/annonce\//,
  /bienici\.com\/annonce\/(vente|location)\//,
  /logic-immo\.com\/(detail-vente|detail-location|annonce-immo)\//,
]

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0]
  if (!tab?.url) return

  const isListing = LISTING_PATTERNS.some(p => p.test(tab.url))

  if (isListing) {
    const banner = document.getElementById('current-page-status')
    if (banner) banner.style.display = 'block'
  }
})
