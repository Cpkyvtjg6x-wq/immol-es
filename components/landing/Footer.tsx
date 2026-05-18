import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-white font-bold">Immolyse</span>
            </div>
            <p className="text-sm text-zinc-500">
              L'outil d'analyse immobilière pour investisseurs sérieux.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Produit</h4>
            <div className="space-y-2">
              {['Fonctionnalités', 'Tarifs', 'Changelog'].map((l) => (
                <div key={l}><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">{l}</Link></div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ressources</h4>
            <div className="space-y-2">
              {['Documentation', 'Guide fiscalité', 'Glossaire'].map((l) => (
                <div key={l}><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">{l}</Link></div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Légal</h4>
            <div className="space-y-2">
              {['CGU', 'Confidentialité', 'Mentions légales'].map((l) => (
                <div key={l}><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">{l}</Link></div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-800/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} Immolyse. Tous droits réservés.
          </p>
          <p className="text-xs text-zinc-700">
            Immolyse fournit des outils d'analyse indicatifs. Consultez un conseiller pour vos décisions d'investissement.
          </p>
        </div>
      </div>
    </footer>
  )
}
