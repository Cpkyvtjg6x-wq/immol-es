'use client'

import { InvestmentResult, FiscalRegime, InvestmentParams } from '@/lib/types'
import { formatCurrency, formatPct } from '@/lib/utils'

interface Props {
  result: InvestmentResult
  fiscalResults?: FiscalRegime[] | null
  params?: InvestmentParams | null
  simName?: string
}

// ─── PDF Export ────────────────────────────────────────────────────────────────

async function generatePDF(result: InvestmentResult, fiscalResults: FiscalRegime[] | null, params: InvestmentParams | null, simName: string) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = margin

  // ─── Palette ────────────────────────────────────────────────────────────────
  const emerald: [number, number, number] = [16, 185, 129]
  const zinc900: [number, number, number] = [9, 9, 11]
  const zinc600: [number, number, number] = [82, 82, 91]
  const zinc300: [number, number, number] = [212, 212, 216]
  const white: [number, number, number] = [255, 255, 255]

  // ─── Header band ────────────────────────────────────────────────────────────
  doc.setFillColor(...zinc900)
  doc.rect(0, 0, pageW, 32, 'F')

  doc.setFillColor(...emerald)
  doc.roundedRect(margin, 8, 10, 10, 2, 2, 'F')
  doc.setTextColor(...white)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('IM', margin + 2.5, 15)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Immolyse', margin + 13, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...zinc300)
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(`Rapport généré le ${dateStr}`, pageW - margin, 15, { align: 'right' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...emerald)
  doc.text(simName || 'Simulation immobilière', margin, 27)

  y = 40

  // ─── Section title helper ─────────────────────────────────────────────────
  const sectionTitle = (title: string) => {
    doc.setFillColor(24, 24, 27)
    doc.rect(margin - 2, y - 1, pageW - 2 * margin + 4, 8, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...emerald)
    doc.text(title.toUpperCase(), margin, y + 5)
    y += 12
  }

  // ─── KPIs ────────────────────────────────────────────────────────────────────
  sectionTitle('Indicateurs clés de rentabilité')

  const kpis = [
    ['Rendement brut',     formatPct(result.rendBrut),               'Rendement net',      formatPct(result.rendNet)],
    ['Cashflow mensuel',   `${result.cashflowMensuel >= 0 ? '+' : ''}${Math.round(result.cashflowMensuel)} €`,
     'Effort d\'épargne',  `${Math.round(result.effortEpargne)} €/mois`],
    ['TRI',                result.tri > 0 ? formatPct(result.tri) : 'N/A',
     'ROI sur apport',     formatPct(result.roiApport)],
    ['Prix de revient',    formatCurrency(result.prixRevient),        'Montant emprunté',   formatCurrency(result.montantEmprunte)],
    ['Mensualité crédit',  `${Math.round(result.mensualiteCredit)} €/mois`,
     'Coût total crédit',  formatCurrency(result.coutCredit)],
    ['Point mort (loyer)', `${Math.round(result.pointMort)} €/mois`, 'Mois loués/an',      `${result.moisLoues} mois`],
  ]

  autoTable(doc, {
    startY: y,
    head: [],
    body: kpis,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 9, textColor: [212, 212, 216], cellPadding: 2.5, lineColor: [39, 39, 42], lineWidth: 0.1 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: zinc600, cellWidth: 45 },
      1: { fontStyle: 'bold', textColor: white, cellWidth: 35 },
      2: { fontStyle: 'bold', textColor: zinc600, cellWidth: 45 },
      3: { fontStyle: 'bold', textColor: white, cellWidth: 35 },
    },
    didDrawPage: (d) => { y = (d.cursor?.y ?? y) + 6 },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // ─── Fiscal regimes ─────────────────────────────────────────────────────────
  const activeRegimes = fiscalResults?.filter(r => !r.disabled) ?? []
  if (activeRegimes.length > 0) {
    if (y > 220) { doc.addPage(); y = margin }
    sectionTitle('Comparatif fiscal')

    const bestId = activeRegimes.reduce((b, r) => r.net > b.net ? r : b, activeRegimes[0])?.id

    autoTable(doc, {
      startY: y,
      head: [['Régime', 'Rev. imposable', 'Impôt IR', 'Prélèv. sociaux', 'Total fiscal', 'Net après impôt', 'Rend. N-N']],
      body: activeRegimes.map(r => [
        r.name,
        formatCurrency(r.revImposable),
        formatCurrency(r.impot),
        formatCurrency(r.ps),
        formatCurrency(r.totalFiscal),
        formatCurrency(r.net),
        formatPct(r.rendNetNet),
      ]),
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: { fillColor: zinc900, textColor: zinc600, fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 8, textColor: [212, 212, 216], cellPadding: 2.5, lineColor: [39, 39, 42], lineWidth: 0.1 },
      didParseCell: (d) => {
        if (d.row.index >= 0 && d.row.raw && (d.row.raw as string[])[0] === activeRegimes.find(r => r.id === bestId)?.name) {
          d.cell.styles.textColor = emerald
          d.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // ─── Amortissement ─────────────────────────────────────────────────────────
  if (result.tableauAmortissement && result.tableauAmortissement.length > 0) {
    doc.addPage(); y = margin
    sectionTitle('Tableau d\'amortissement (12 premières années)')

    const amortRows = result.tableauAmortissement
      .filter(r => r.mois % 12 === 0)
      .slice(0, 12)
      .map(r => [
        `Année ${r.annee}`,
        formatCurrency(r.mensualite) + '/mois',
        formatCurrency(r.capitalRembourse),
        formatCurrency(r.interetsPaies),
        formatCurrency(r.capitalRestant),
      ])

    autoTable(doc, {
      startY: y,
      head: [['Période', 'Mensualité', 'Capital remb.', 'Intérêts', 'Capital restant']],
      body: amortRows,
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: { fillColor: zinc900, textColor: zinc600, fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 8, textColor: [212, 212, 216], cellPadding: 2.5, lineColor: [39, 39, 42], lineWidth: 0.1 },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // ─── Projection 20 ans ─────────────────────────────────────────────────────
  if (result.projection && result.projection.length > 0) {
    if (y > 200) { doc.addPage(); y = margin }
    sectionTitle('Projection patrimoniale 20 ans')

    autoTable(doc, {
      startY: y,
      head: [['Année', 'Valeur bien', 'Capital restant dû', 'Patrimoine net', 'Cashflow cumulé']],
      body: result.projection.map(r => [
        `An ${r.annee}`,
        formatCurrency(r.valeurBien),
        formatCurrency(r.capitalRestant),
        formatCurrency(r.patrimoine),
        `${r.cashflowCumule >= 0 ? '+' : ''}${formatCurrency(r.cashflowCumule)}`,
      ]),
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: { fillColor: zinc900, textColor: zinc600, fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 8, textColor: [212, 212, 216], cellPadding: 2.5, lineColor: [39, 39, 42], lineWidth: 0.1 },
    })
  }

  // ─── Footer on each page ─────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const ph = doc.internal.pageSize.getHeight()
    doc.setFillColor(24, 24, 27)
    doc.rect(0, ph - 10, pageW, 10, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...zinc600)
    doc.text('Immolyse — Rapport confidentiel à usage personnel. Ne constitue pas un conseil financier.', margin, ph - 4)
    doc.text(`${i} / ${totalPages}`, pageW - margin, ph - 4, { align: 'right' })
  }

  doc.save(`${(simName || 'immolyse').replace(/[^a-z0-9]/gi, '_')}.pdf`)
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

async function generateExcel(result: InvestmentResult, fiscalResults: FiscalRegime[] | null, params: InvestmentParams | null, simName: string) {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()

  // ─── Sheet 1 : Résumé ────────────────────────────────────────────────────
  const resumeData = [
    ['Immolyse — Rapport de simulation', '', '', ''],
    [simName, '', new Date().toLocaleDateString('fr-FR'), ''],
    ['', '', '', ''],
    ['INDICATEURS CLÉS', '', '', ''],
    ['Rendement brut', result.rendBrut + '%', 'Rendement net', result.rendNet + '%'],
    ['Cashflow mensuel', Math.round(result.cashflowMensuel) + ' €', 'Effort épargne', Math.round(result.effortEpargne) + ' €/mois'],
    ['TRI', result.tri > 0 ? result.tri.toFixed(2) + '%' : 'N/A', 'ROI sur apport', result.roiApport.toFixed(2) + '%'],
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
      ['Apport', params.apport, 'Taux crédit', params.taux + '%'],
      ['Durée', params.duree + ' ans', 'Type prêt', params.loanType],
      ['Régime locatif', params.locType, 'TMI', params.tmi + '%'],
    )
  }

  const ws1 = XLSX.utils.aoa_to_sheet(resumeData)
  ws1['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 28 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Résumé')

  // ─── Sheet 2 : Fiscal ────────────────────────────────────────────────────
  const activeRegimes = fiscalResults?.filter(r => !r.disabled) ?? []
  if (activeRegimes.length > 0) {
    const fiscalData = [
      ['Régime', 'Revenu imposable', 'Impôt IR', 'Prélèv. sociaux', 'Total fiscal', 'Net après impôt', 'Rendement net-net %'],
      ...activeRegimes.map(r => [
        r.name, r.revImposable, r.impot, r.ps, r.totalFiscal, r.net, r.rendNetNet,
      ])
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(fiscalData)
    ws2['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Fiscalité')
  }

  // ─── Sheet 3 : Amortissement ──────────────────────────────────────────────
  if (result.tableauAmortissement && result.tableauAmortissement.length > 0) {
    const amortData = [
      ['Mois', 'Année', 'Mensualité', 'Capital remboursé', 'Intérêts payés', 'Capital restant'],
      ...result.tableauAmortissement.map(r => [
        r.mois, r.annee, r.mensualite, r.capitalRembourse, r.interetsPaies, r.capitalRestant,
      ])
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(amortData)
    ws3['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Amortissement')
  }

  // ─── Sheet 4 : Projection ──────────────────────────────────────────────────
  if (result.projection && result.projection.length > 0) {
    const projData = [
      ['Année', 'Valeur bien', 'Capital restant dû', 'Patrimoine net', 'Cashflow cumulé'],
      ...result.projection.map(r => [
        r.annee, r.valeurBien, r.capitalRestant, r.patrimoine, r.cashflowCumule,
      ])
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(projData)
    ws4['!cols'] = [{ wch: 8 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws4, 'Projection 20 ans')
  }

  XLSX.writeFile(wb, `${(simName || 'immolyse').replace(/[^a-z0-9]/gi, '_')}.xlsx`)
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExportButtons({ result, fiscalResults, params, simName = 'Simulation' }: Props) {
  const handlePDF = async () => {
    await generatePDF(result, fiscalResults ?? null, params ?? null, simName)
  }

  const handleExcel = async () => {
    await generateExcel(result, fiscalResults ?? null, params ?? null, simName)
  }

  return (
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
  )
}
