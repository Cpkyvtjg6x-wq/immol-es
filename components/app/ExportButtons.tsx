'use client'

import React from 'react'
import { InvestmentResult, FiscalRegime, InvestmentParams, ScoreResult } from '@/lib/types'

interface Props {
  result: InvestmentResult
  fiscalResults?: FiscalRegime[] | null
  params?: InvestmentParams | null
  score?: ScoreResult | null
  simName?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fE = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €'
const fP = (n: number) => n.toFixed(2) + ' %'

// ─── PDF Generation (html2canvas + jsPDF) ────────────────────────────────────

// ─── PDF Generation (@react-pdf/renderer) ────────────────────────────────────

async function generatePDF(
  result: InvestmentResult,
  fiscalResults: FiscalRegime[] | null,
  params: InvestmentParams | null,
  score: ScoreResult | null,
  simName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _container: HTMLDivElement
) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const { pdf } = await import('@react-pdf/renderer')
  const { default: SimulationPDF } = await import('@/components/pdf/SimulationPDF')

  const element = React.createElement(SimulationPDF, {
    result,
    params,
    score,
    fiscalResults,
    today,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const safeName = (simName || 'immolyse').replace(/[^a-z0-9]/gi, '_')
  link.download = `Immolyse_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─── Excel Export (inchangé) ──────────────────────────────────────────────────

async function generateExcel(
  result: InvestmentResult,
  fiscalResults: FiscalRegime[] | null,
  params: InvestmentParams | null,
  simName: string
) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const resumeData = [
    ['Immolyse — Rapport de simulation', '', '', ''],
    [simName, '', new Date().toLocaleDateString('fr-FR'), ''],
    ['', '', '', ''],
    ['INDICATEURS CLÉS', '', '', ''],
    ['Rendement brut', result.rendBrut + ' %', 'Rendement net', result.rendNet + ' %'],
    ['Cashflow mensuel', Math.round(result.cashflowMensuel) + ' €', 'Effort épargne', Math.round(result.effortEpargne) + ' €/mois'],
    ['TRI', result.tri > 0 ? result.tri.toFixed(2) + ' %' : 'N/A', 'ROI sur apport', result.roiApport.toFixed(2) + ' %'],
    ['', '', '', ''],
    ['FINANCEMENT', '', '', ''],
    ['Prix de revient', result.prixRevient, 'Montant emprunté', result.montantEmprunte],
    ['Mensualité crédit', Math.round(result.mensualiteCredit), 'Coût total crédit', Math.round(result.coutCredit)],
    ['', '', '', ''],
    ['REVENUS', '', '', ''],
    ['Loyer brut annuel', result.loyerAnnuelBrut, 'Loyer net annuel', result.loyerAnnuelNet],
    ['Vacance annuelle', result.vacanceAnnuelle, 'Mois loués', result.moisLoues],
    ['', '', '', ''],
    ['CHARGES', '', '', ''],
    ['Total charges annuelles', result.totalCharges, 'Frais gestion', result.fraisGestionAnnuel],
    ['Point mort loyer', Math.round(result.pointMort), 'CFE', result.cfe],
    ['', '', '', ''],
    ['REVENTE', '', '', ''],
    ['Prix revente estimé', result.prixRevente, 'Plus-value brute', result.plusValueBrute],
    ['Impôt sur plus-value', result.impotPlusValue, 'Patrimoine net revente', result.patrimoineNetRevente],
  ]

  if (params) {
    resumeData.push(
      ['', '', '', ''],
      ['PARAMÈTRES', '', '', ''],
      ['Ville', params.ville, 'Type bien', params.typeBien],
      ['Prix achat', params.prixAchat, 'Surface', params.surface + ' m²'],
      ['Travaux', params.travaux, 'DPE', params.dpe],
      ['Apport', params.apport, 'Taux crédit', params.taux + ' %'],
      ['Durée', params.duree + ' ans', 'Type prêt', params.loanType],
      ['Régime locatif', params.locType, 'TMI', params.tmi + ' %'],
    )
  }

  const ws1 = XLSX.utils.aoa_to_sheet(resumeData)
  ws1['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 28 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Résumé')

  const activeRegimes = fiscalResults?.filter(r => !r.disabled) ?? []
  if (activeRegimes.length > 0) {
    const fiscalData = [
      ['Régime', 'Revenu imposable', 'Impôt IR', 'Prélèv. sociaux', 'Total fiscal', 'Net après impôt', 'Rendement net-net %'],
      ...activeRegimes.map(r => [r.name, r.revImposable, r.impot, r.ps, r.totalFiscal, r.net, r.rendNetNet])
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(fiscalData)
    ws2['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Fiscalité')
  }

  if (result.tableauAmortissement && result.tableauAmortissement.length > 0) {
    const amortData = [
      ['Mois', 'Année', 'Mensualité', 'Capital remboursé', 'Intérêts payés', 'Capital restant'],
      ...result.tableauAmortissement.map(r => [r.mois, r.annee, r.mensualite, r.capitalRembourse, r.interetsPaies, r.capitalRestant])
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(amortData)
    ws3['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Amortissement')
  }

  if (result.projection && result.projection.length > 0) {
    const projData = [
      ['Année', 'Valeur bien', 'Capital restant dû', 'Patrimoine net', 'Cashflow cumulé'],
      ...result.projection.map(r => [r.annee, r.valeurBien, r.capitalRestant, r.patrimoine, r.cashflowCumule])
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(projData)
    ws4['!cols'] = [{ wch: 8 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws4, 'Projection 20 ans')
  }

  XLSX.writeFile(wb, `Immolyse_${(simName || 'immolyse').replace(/[^a-z0-9]/gi, '_')}.xlsx`)
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExportButtons({ result, fiscalResults, params, score, simName = 'Simulation' }: Props) {
  const handlePDF = async () => {
    await generatePDF(
      result,
      fiscalResults ?? null,
      params ?? null,
      score ?? null,
      simName,
      null as unknown as HTMLDivElement
    )
  }

  const handleExcel = async () => {
    await generateExcel(result, fiscalResults ?? null, params ?? null, simName)
  }

  return (
    <>

      <div className="flex items-center gap-2">
        {/* PDF */}
        <button
          onClick={handlePDF}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-300 bg-white/[0.05] border border-white/[0.09] px-3 py-1.5 rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
        >
          <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          PDF
        </button>

        {/* Excel */}
        <button
          onClick={handleExcel}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-300 bg-white/[0.05] border border-white/[0.09] px-3 py-1.5 rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
        >
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </button>
      </div>
    </>
  )
}
