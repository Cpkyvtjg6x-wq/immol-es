'use client'

import { useRef } from 'react'
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

async function generatePDF(
  result: InvestmentResult,
  fiscalResults: FiscalRegime[] | null,
  params: InvestmentParams | null,
  score: ScoreResult | null,
  simName: string,
  container: HTMLDivElement
) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const activeRegimes = fiscalResults?.filter(r => !r.disabled) ?? []
  const bestRegime = activeRegimes.length > 0
    ? activeRegimes.reduce((b, r) => r.rendNetNet > b.rendNetNet ? r : b, activeRegimes[0])
    : null

  const scoreNum = score?.global ?? 0
  const scoreLbl = score?.label ?? '—'
  const scoreColor = scoreNum >= 65 ? '#16a34a' : scoreNum >= 40 ? '#d97706' : '#dc2626'
  const scoreAlpha = scoreNum >= 65 ? '#f0fdf4' : scoreNum >= 40 ? '#fff7ed' : '#fef2f2'
  const scoreBorder = scoreNum >= 65 ? '#bbf7d0' : scoreNum >= 40 ? '#fed7aa' : '#fecaca'

  const cityName = result.ville || params?.ville || ''
  const surface = params?.surface ?? 0
  const dpe = params?.dpe ?? '—'
  const typeBien = params?.typeBien ?? ''
  const prixAchat = params?.prixAchat ?? result.prixRevient - (params?.fraisNotaire ?? 0) - (params?.travaux ?? 0)
  const apport = params?.apport ?? 0
  const taux = params?.taux ?? 0
  const duree = params?.duree ?? 20
  const assurTaux = params?.assuranceTaux ?? 0
  const fraisNotaire = params?.fraisNotaire ?? 0
  const travaux = params?.travaux ?? 0
  const loanType = params?.loanType ?? 'amortissable'
  const locType = params?.locType ?? 'nu'
  const tmi = params?.tmi ?? 30
  const taxeFonciere = params?.taxeFonciere ?? 0
  const chargesCopro = params?.chargesCopro ?? 0
  const assurancePno = params?.assurancePno ?? 0
  const fraisGestionPct = params?.fraisGestionPct ?? 0
  const provisionPct = params?.provisionPct ?? 0
  const fraisComptable = params?.fraisComptable ?? 0
  const gliPct = params?.gliPct ?? 0
  const cfe = params?.cfe ?? 0
  const horizonRevente = params?.horizonRevente ?? duree
  const bienPrixM2 = surface > 0 ? Math.round(prixAchat / surface) : 0

  const cfMensuel = result.cashflowMensuel
  const rendBrut = result.rendBrut
  const rendNet = result.rendNet
  const roiApport = result.roiApport
  const loyer = result.loyer
  const moisLoues = result.moisLoues
  const totalCharges = result.totalCharges
  const mensualite = result.mensualiteTotale

  const cfColor = cfMensuel >= 100 ? '#16a34a' : cfMensuel >= 0 ? '#d97706' : '#dc2626'
  const rendBrutColor = rendBrut >= 5 ? '#16a34a' : rendBrut >= 3 ? '#d97706' : '#dc2626'
  const rendNetColor = rendNet >= 3.5 ? '#16a34a' : rendNet >= 2 ? '#d97706' : '#dc2626'
  const roiColor = roiApport >= 10 ? '#16a34a' : roiApport >= 5 ? '#d97706' : '#dc2626'

  // ── Shared HTML helpers ──────────────────────────────────────────────────────
  const PAGE_STYLE = `style="width:794px;min-height:1123px;padding:40px 48px;font-family:'Inter',system-ui,sans-serif;font-size:13px;color:#111;background:#fff;box-sizing:border-box;overflow:hidden;position:relative"`

  const HEADER = (subtitle: string) => `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2.5px solid #16a34a;padding-bottom:16px;margin-bottom:24px">
      <div>
        <div style="font-size:21px;font-weight:800;color:#111;letter-spacing:-.4px">Immo<span style="color:#16a34a">lyse</span></div>
        <div style="font-size:11px;color:#888;margin-top:2px">${subtitle}</div>
      </div>
      <div style="text-align:right;font-size:11px;color:#888;line-height:1.9">
        <div style="font-size:12px;font-weight:600;color:#111">Rapport d'analyse immobilière</div>
        <div>Généré le ${today}</div>
        ${cityName ? `<div>Marché&nbsp;: <strong style="color:#111">${cityName}</strong></div>` : ''}
      </div>
    </div>`

  const SECTION = (title: string, emoji = '') => `
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#16a34a;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb">${emoji ? emoji + '&nbsp;&nbsp;' : ''}${title}</div>`

  const FIELD = (label: string, value: string) => `
    <div style="padding:6px 0;border-bottom:1px solid #f5f5f5">
      <div style="font-size:9.5px;color:#999;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">${label}</div>
      <div style="font-size:12.5px;font-weight:600;color:#111">${value}</div>
    </div>`

  const KPI = (label: string, value: string, color: string) => `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:11px 14px">
      <div style="font-size:9px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">${label}</div>
      <div style="font-size:19px;font-weight:800;color:${color};line-height:1.1">${value}</div>
    </div>`

  const FOOTER = (page: number, total: number) => `
    <div style="position:absolute;bottom:20px;left:48px;right:48px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:9px;color:#bbb;display:flex;justify-content:space-between">
      <span>Immolyse · Rapport confidentiel à usage personnel · Ne constitue pas un conseil financier</span>
      <span>${page} / ${total}</span>
    </div>`

  // ══════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Score · KPIs · Bien · Financement · Charges · Revenus
  // ══════════════════════════════════════════════════════════════════════════════
  const rendNetNetNum = bestRegime?.rendNetNet ?? 0
  const cfNetNetNum = bestRegime?.cfNet ?? 0
  const netNetColor = rendNetNetNum >= 3 ? '#16a34a' : rendNetNetNum >= 1.5 ? '#d97706' : '#dc2626'

  const page1 = `<div ${PAGE_STYLE}>
  ${HEADER(`${typeBien}${surface ? ' · ' + surface + ' m²' : ''}${dpe !== '—' ? ' · DPE ' + dpe : ''}`)}

  <!-- Score hero + KPIs -->
  <div style="background:${scoreAlpha};border:1px solid ${scoreBorder};border-radius:10px;padding:18px 22px;display:flex;align-items:center;gap:20px;margin-bottom:22px">
    <div style="flex-shrink:0">
      <div style="font-size:52px;font-weight:800;color:${scoreColor};line-height:1">${scoreNum}<span style="font-size:20px;color:#888">/100</span></div>
      <div style="font-size:14px;font-weight:700;color:#111;margin-top:4px">${scoreLbl}</div>
      <div style="font-size:10px;color:#888;margin-top:2px">Score de rentabilité</div>
    </div>
    <div style="flex:1;min-width:260px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        ${KPI('Rendement brut', fP(rendBrut), rendBrutColor)}
        ${KPI('Rendement net', fP(rendNet), rendNetColor)}
        ${KPI('Cash-flow mensuel', (cfMensuel >= 0 ? '+' : '') + fE(cfMensuel) + '/mois', cfColor)}
        ${KPI('ROI sur apport', fP(roiApport), roiColor)}
      </div>
      ${bestRegime ? `<div style="background:#fff;border:1px solid #e5e7eb;border-left:3px solid ${netNetColor};border-radius:7px;padding:9px 14px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#16a34a;margin-bottom:2px">✦ Après impôts — ${bestRegime.name}</div>
          <div style="font-size:10px;color:#666">CF net : <strong>${fE(cfNetNetNum)}/mois</strong></div>
        </div>
        <div style="font-size:20px;font-weight:800;color:${netNetColor};line-height:1">${fP(rendNetNetNum)}</div>
      </div>` : ''}
    </div>
  </div>

  <!-- Bien + Financement -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:20px">
    <div>
      ${SECTION('Le bien', '🏠')}
      <div style="display:grid;grid-template-columns:1fr 1fr">
        ${FIELD("Type", typeBien || '—')}
        ${FIELD("DPE", dpe + (dpe === 'F' || dpe === 'G' ? ' ⚠️' : ''))}
        ${FIELD("Prix d'achat", fE(prixAchat))}
        ${FIELD("Frais notaire", fE(fraisNotaire))}
        ${FIELD("Travaux", fE(travaux))}
        ${FIELD("Prix de revient", fE(result.prixRevient))}
        ${FIELD("Surface", surface ? surface + ' m²' : '—')}
        ${FIELD("Prix au m²", bienPrixM2 ? fE(bienPrixM2) + '/m²' : '—')}
      </div>
    </div>
    <div>
      ${SECTION('Financement', '🏦')}
      <div style="display:grid;grid-template-columns:1fr 1fr">
        ${FIELD("Apport", fE(apport))}
        ${FIELD("Emprunté", fE(result.montantEmprunte))}
        ${FIELD("Taux crédit", taux.toFixed(2) + ' %')}
        ${FIELD("Durée", duree + ' ans')}
        ${FIELD("Assurance", assurTaux.toFixed(2) + ' %/an')}
        ${FIELD("Mensualité", fE(mensualite) + '/mois')}
        ${FIELD("Type de prêt", loanType === 'in-fine' ? 'In fine' : 'Amortissable')}
        ${FIELD("Coût total crédit", fE(result.coutCredit))}
        ${FIELD("Loyer seuil", fE(result.pointMort) + '/mois')}
        ${FIELD("TRI", result.tri > 0 ? fP(result.tri) : 'N/A')}
      </div>
    </div>
  </div>

  <!-- Charges + Revenus -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">
    <div>
      ${SECTION('Charges annuelles', '📋')}
      <div style="display:grid;grid-template-columns:1fr 1fr">
        ${FIELD("Taxe foncière", fE(taxeFonciere))}
        ${FIELD("Charges copro", fE(chargesCopro))}
        ${FIELD("Assurance PNO", fE(assurancePno))}
        ${gliPct > 0 ? FIELD("GLI", gliPct.toFixed(1) + ' %') : ''}
        ${FIELD("Frais gestion", fraisGestionPct.toFixed(0) + ' %')}
        ${FIELD("Provision travaux", provisionPct.toFixed(0) + ' %')}
        ${fraisComptable > 0 ? FIELD("Frais comptable", fE(fraisComptable)) : ''}
        ${cfe > 0 ? FIELD("CFE (LMNP)", fE(cfe)) : ''}
      </div>
      <div style="margin-top:8px;padding:8px 12px;background:#fef9ec;border:1px solid #fde68a;border-radius:6px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:10px;color:#92400e;font-weight:600">TOTAL CHARGES / AN</span>
        <span style="font-size:14px;font-weight:800;color:#b45309">${fE(totalCharges)}</span>
      </div>
    </div>
    <div>
      ${SECTION('Revenus locatifs', '💰')}
      <div style="display:grid;grid-template-columns:1fr 1fr">
        ${FIELD("Type location", locType === 'meuble' ? 'Meublée (LMNP)' : locType === 'coloc' ? 'Colocation' : locType === 'saisonnier' ? 'Saisonnier' : 'Nue')}
        ${FIELD("Loyer mensuel", fE(loyer) + '/mois')}
        ${FIELD("Vacance locative", (12 - moisLoues) + ' mois/an')}
        ${FIELD("Mois loués/an", moisLoues + ' mois')}
        ${FIELD("Revenus bruts/an", fE(result.loyerAnnuelBrut))}
        ${FIELD("Revenus nets/an", fE(result.loyerAnnuelNet))}
      </div>
      <div style="margin-top:8px;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:10px;color:#166534;font-weight:600">CASH-FLOW NET / MOIS</span>
        <span style="font-size:14px;font-weight:800;color:${cfColor}">${cfMensuel >= 0 ? '+' : ''}${fE(cfMensuel)}/mois</span>
      </div>
    </div>
  </div>
  ${FOOTER(1, 3)}
</div>`

  // ══════════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Comparatif fiscal complet
  // ══════════════════════════════════════════════════════════════════════════════
  const fiscalRows = activeRegimes.map(r => {
    const isBest = r.id === bestRegime?.id
    const netColor = r.net >= 0 ? '#16a34a' : '#dc2626'
    const cfC = r.cfNet >= 100 ? '#16a34a' : r.cfNet >= 0 ? '#d97706' : '#dc2626'
    return `<tr style="border-bottom:1px solid #f5f5f5;${isBest ? 'background:#f0fdf4;' : ''}">
      <td style="padding:8px 10px;font-size:11px;font-weight:${isBest ? 700 : 500};color:${isBest ? '#166534' : '#111'};border-left:${isBest ? '3px solid #16a34a' : '3px solid transparent'}">${r.name}${isBest ? ' ★' : ''}</td>
      <td style="padding:8px 10px;font-size:11px;color:#555">${fE(r.revImposable)}</td>
      <td style="padding:8px 10px;font-size:11px;color:#dc2626">${fE(r.impot)}</td>
      <td style="padding:8px 10px;font-size:11px;color:#888">${fE(r.ps)}</td>
      <td style="padding:8px 10px;font-size:11px;font-weight:600;color:#dc2626">${fE(r.totalFiscal)}</td>
      <td style="padding:8px 10px;font-size:11px;font-weight:700;color:${netColor}">${fE(r.net)}</td>
      <td style="padding:8px 10px;font-size:11px;font-weight:700;color:${cfC}">${fE(r.cfNet)}/mois</td>
      <td style="padding:8px 10px;font-size:11px;font-weight:700;color:${netColor}">${fP(r.rendNetNet)}</td>
    </tr>`
  }).join('')

  // Économie annuelle vs pire régime
  const worstRegime = activeRegimes.length > 1
    ? activeRegimes.reduce((w, r) => r.net < w.net ? r : w, activeRegimes[0])
    : null
  const economie = bestRegime && worstRegime && bestRegime.id !== worstRegime.id
    ? bestRegime.net - worstRegime.net : 0

  // Score breakdown bars
  const subScores = score?.subScores ?? null
  const scoreBar = (label: string, val: number) => {
    const c = val >= 65 ? '#16a34a' : val >= 40 ? '#d97706' : '#dc2626'
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:11px">
      <div style="width:160px;color:#555">${label}</div>
      <div style="flex:1;height:7px;background:#e5e7eb;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${val}%;background:${c};border-radius:4px"></div>
      </div>
      <div style="width:36px;text-align:right;font-weight:600;color:#111">${val}/100</div>
    </div>`
  }

  const page2 = `<div ${PAGE_STYLE}>
  ${HEADER('Fiscalité & Score détaillé')}

  ${SECTION('Comparatif des régimes fiscaux', '⚖️')}

  ${bestRegime ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 18px;margin-bottom:14px;display:flex;align-items:center;gap:18px">
    <div style="font-size:32px;color:#16a34a;line-height:1">★</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:700;color:#166534">Régime optimal : ${bestRegime.name}</div>
      <div style="font-size:11px;color:#15803d;margin-top:3px">
        Revenu net/an : <strong>${fE(bestRegime.net)}</strong> ·
        CF mensuel : <strong>${fE(bestRegime.cfNet)}/mois</strong> ·
        Impôt estimé : <strong>${fE(bestRegime.impot)}</strong>
      </div>
      <div style="font-size:10px;color:#888;margin-top:2px">TMI : ${tmi} % · Prélèvements sociaux : 17,2 %</div>
    </div>
    ${economie > 0 ? `<div style="text-align:center;background:#fff;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px">
      <div style="font-size:9px;color:#16a34a;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Économie vs pire</div>
      <div style="font-size:20px;font-weight:800;color:#16a34a;line-height:1.2">+${fE(economie)}</div>
      <div style="font-size:9px;color:#888">par an</div>
    </div>` : ''}
  </div>` : ''}

  ${activeRegimes.length > 0 ? `<div style="overflow:hidden;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:22px">
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">Régime</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">Rev. imposable</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">Impôt IR</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">Prélèv. soc.</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">Total fiscal</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">Net/an</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">CF net/mois</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">Rend. N-N</th>
        </tr>
      </thead>
      <tbody>${fiscalRows}</tbody>
    </table>
  </div>` : `<div style="padding:20px;text-align:center;color:#888;font-size:12px;background:#f9fafb;border-radius:8px;margin-bottom:22px">Aucun régime fiscal actif — complétez les paramètres de revenus.</div>`}

  <!-- Score détaillé -->
  ${subScores ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:4px">
    <div>
      ${SECTION('Score détaillé', '📊')}
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-size:13px;font-weight:700;color:#111">Score global</div>
          <div style="font-size:28px;font-weight:800;color:${scoreColor}">${scoreNum}/100</div>
        </div>
        ${scoreBar('Rentabilité', subScores.rentabilite)}
        ${scoreBar('Cash-flow', subScores.cashflow)}
        ${scoreBar('Fiscalité', subScores.fiscalite)}
        ${scoreBar('Marché', subScores.marche)}
      </div>
    </div>
    <div>
      ${SECTION('Synthèse du score', '💡')}
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px">
        <div style="font-size:11px;color:#555;line-height:1.7;margin-bottom:12px">${score?.summary ?? ''}</div>
        ${score?.details ? score.details.slice(0, 5).map(d => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:11px">
          <span style="color:${d.good ? '#16a34a' : '#dc2626'}">${d.good ? '✓' : '✗'}</span>
          <span style="color:#555;flex:1">${d.label}</span>
          <span style="font-weight:700;color:${d.good ? '#16a34a' : '#dc2626'}">${d.pts}/${d.max}</span>
        </div>`).join('') : ''}
      </div>
    </div>
  </div>` : ''}

  ${FOOTER(2, 3)}
</div>`

  // ══════════════════════════════════════════════════════════════════════════════
  // PAGE 3 — Projection · Amortissement · Analyse
  // ══════════════════════════════════════════════════════════════════════════════
  const totalLoyers = loyer * moisLoues * horizonRevente
  const totalMensualites = mensualite * 12 * horizonRevente
  const totalChargesTotal = totalCharges * horizonRevente
  const impotAn = bestRegime ? bestRegime.totalFiscal : 0
  const totalImpots = impotAn * horizonRevente
  const totalCF = cfMensuel * 12 * horizonRevente

  const projRows = [
    { l: '💰 Loyers perçus', v: totalLoyers, bar: true },
    { l: '📉 Mensualités crédit', v: -totalMensualites, bar: true },
    { l: '🏗️ Charges annuelles', v: -totalChargesTotal, bar: true },
    { l: '🧾 Impôts estimés', v: -totalImpots, bar: true },
    { l: '🏦 Capital constitué', v: result.montantEmprunte, bar: true, note: '(patrimoine crédit)' },
    { l: '📊 Cash-flow cumulé', v: totalCF, bar: true, bold: true },
  ]
  const maxV = Math.max(...projRows.map(r => Math.abs(r.v)), 1)

  const projHTML = projRows.map(r => {
    const w = Math.round(Math.abs(r.v) / maxV * 80)
    const c = r.v >= 0 ? '#16a34a' : '#dc2626'
    return `<tr style="border-bottom:1px solid #f5f5f5;${r.bold ? 'background:#f9fafb;font-weight:700;' : ''}">
      <td style="padding:8px 10px;color:#111;font-size:11px">${r.l}${r.note ? ` <span style="font-size:9px;color:#888">${r.note}</span>` : ''}</td>
      <td style="padding:8px 10px;font-weight:${r.bold ? 800 : 600};color:${r.v >= 0 ? '#16a34a' : '#dc2626'};white-space:nowrap;text-align:right;font-size:11px">${r.v >= 0 ? '+' : ''}${fE(r.v)}</td>
      <td style="padding:8px 10px;width:150px">
        <div style="height:7px;width:${w}%;background:${c};border-radius:3px${r.v < 0 ? ';margin-left:auto' : ''};max-width:100%"></div>
      </td>
    </tr>`
  }).join('')

  // Tableau amortissement (6 premières années)
  const amortRows = result.tableauAmortissement
    ?.filter(r => r.mois % 12 === 0)
    .slice(0, 6)
    .map(r => `<tr style="border-bottom:1px solid #f5f5f5">
      <td style="padding:7px 10px;font-size:11px;color:#555">An ${r.annee}</td>
      <td style="padding:7px 10px;font-size:11px;color:#111;font-weight:600">${fE(r.mensualite)}/mois</td>
      <td style="padding:7px 10px;font-size:11px;color:#16a34a;font-weight:600">${fE(r.capitalRembourse)}</td>
      <td style="padding:7px 10px;font-size:11px;color:#dc2626">${fE(r.interetsPaies)}</td>
      <td style="padding:7px 10px;font-size:11px;color:#111">${fE(r.capitalRestant)}</td>
    </tr>`).join('') ?? ''

  const ANALYSIS_CARD = (emoji: string, title: string, value: string, vColor: string, detail: string, suggestion: string) => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:13px 15px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px">
        <div style="font-size:12px;font-weight:600;color:#555">${emoji} ${title}</div>
        <div style="font-size:19px;font-weight:800;color:${vColor}">${value}</div>
      </div>
      <div style="font-size:10.5px;color:#555;line-height:1.6;margin-bottom:${suggestion ? '7px' : '0'}">${detail}</div>
      ${suggestion ? `<div style="font-size:10.5px;color:#16a34a;border-top:1px solid #f0fdf4;padding-top:6px;line-height:1.5">${suggestion}</div>` : ''}
    </div>`

  const page3 = `<div ${PAGE_STYLE}>
  ${HEADER(`Projection financière & Analyse — horizon ${horizonRevente} ans`)}

  <!-- Projection -->
  ${SECTION(`Projection financière sur ${horizonRevente} ans`, '📊')}
  <div style="overflow:hidden;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:20px">
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">Poste</th>
          <th style="padding:8px 10px;text-align:right;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">Montant total</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;border-bottom:2px solid #e5e7eb;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;width:150px">Poids relatif</th>
        </tr>
      </thead>
      <tbody>${projHTML}</tbody>
    </table>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
    <!-- Tableau amortissement -->
    ${amortRows ? `<div>
      ${SECTION("Amortissement (6 premières années)", '🏦')}
      <div style="overflow:hidden;border-radius:8px;border:1px solid #e5e7eb">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:7px 8px;text-align:left;color:#555;font-size:9px;font-weight:600;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:.04em">Période</th>
              <th style="padding:7px 8px;text-align:left;color:#555;font-size:9px;font-weight:600;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:.04em">Mensualité</th>
              <th style="padding:7px 8px;text-align:left;color:#555;font-size:9px;font-weight:600;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:.04em">Capital</th>
              <th style="padding:7px 8px;text-align:left;color:#555;font-size:9px;font-weight:600;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:.04em">Intérêts</th>
              <th style="padding:7px 8px;text-align:left;color:#555;font-size:9px;font-weight:600;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:.04em">Restant dû</th>
            </tr>
          </thead>
          <tbody>${amortRows}</tbody>
        </table>
      </div>
    </div>` : '<div></div>'}

    <!-- Revente -->
    <div>
      ${SECTION("Estimation à la revente", '🏡')}
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
          ${FIELD("Prix de revente estimé", fE(result.prixRevente))}
          ${FIELD("Plus-value brute", fE(result.plusValueBrute))}
          ${FIELD("Impôt sur PV", fE(result.impotPlusValue))}
          ${FIELD("Patrimoine net revente", fE(result.patrimoineNetRevente))}
          ${FIELD("TRI global", result.tri > 0 ? fP(result.tri) : 'N/A')}
          ${FIELD("Horizon", horizonRevente + ' ans')}
        </div>
        <div style="margin-top:10px;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;text-align:center">
          <div style="font-size:9px;color:#166534;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Patrimoine net après revente</div>
          <div style="font-size:22px;font-weight:800;color:#16a34a">${fE(result.patrimoineNetRevente)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Analyse des indicateurs -->
  ${SECTION('Analyse des indicateurs', '🔍')}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    ${ANALYSIS_CARD('📈', 'Rendement brut', fP(rendBrut), rendBrutColor,
      `Loyers annuels de ${fE(loyer * 12)} rapportés au prix d'achat de ${fE(prixAchat)}.`,
      rendBrut >= 5 ? '✓ Au-dessus de 5 %, bien positionné.' :
        rendBrut >= 3 ? '→ Correct. Visez 5 %+ pour un meilleur équilibre.' :
          '→ En dessous de 3 %. Renégociez le prix ou augmentez le loyer.')}
    ${ANALYSIS_CARD('💶', 'Cash-flow net', (cfMensuel >= 0 ? '+' : '') + fE(cfMensuel) + '/mois', cfColor,
      `Après mensualité (${fE(mensualite)}/mois) et charges (${fE(totalCharges)}/an).`,
      cfMensuel >= 100 ? '✓ Cash-flow positif confortable. Projet autofinancé.' :
        cfMensuel >= 0 ? '→ Équilibré. Surveillez la vacance locative.' :
          `→ Effort mensuel de ${fE(-cfMensuel)}. Renégociez ou optimisez la fiscalité.`)}
    ${ANALYSIS_CARD('🏦', 'Rendement net', fP(rendNet), rendNetColor,
      `Après déduction de toutes les charges (${fE(totalCharges)}/an) sur le prix de revient total.`,
      rendNet >= 3.5 ? '✓ Rendement net solide.' :
        rendNet >= 2 ? '→ Correct. Optimisez les charges ou la fiscalité.' :
          '→ Inférieur à 2 %. Réduire les charges ou le prix de revient.')}
    ${ANALYSIS_CARD('💼', 'ROI sur apport', fP(roiApport), roiColor,
      `Retour annuel sur ${fE(apport)} d'apport. L'effet de levier du crédit amplifie ce ratio.`,
      roiApport >= 10 ? '✓ Excellent levier. L\'effet crédit joue pleinement.' :
        roiApport >= 5 ? '→ Levier correct.' :
          '→ Revoyez la structure de financement.')}
  </div>

  ${FOOTER(3, 3)}
</div>`

  // ── Render HTML → Canvas → PDF ──────────────────────────────────────────────
  container.innerHTML = page1 + page2 + page3
  container.style.cssText = 'display:block;position:fixed;left:-9999px;top:0;background:#fff;width:794px;z-index:-1;pointer-events:none;'

  try {
    const html2canvas = (await import('html2canvas')).default
    const { default: jsPDF } = await import('jspdf')

    // Attendre que les polices soient chargées
    await document.fonts.ready
    await new Promise(r => setTimeout(r, 350))

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pages = container.querySelectorAll<HTMLElement>('[data-pdf-page]')
    const allPages = pages.length > 0
      ? Array.from(pages)
      : Array.from(container.children) as HTMLElement[]

    for (let i = 0; i < allPages.length; i++) {
      if (i > 0) doc.addPage()
      const canvas = await html2canvas(allPages[i] as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const ratio = canvas.height / canvas.width
      const pdfH = Math.min(297, Math.round(210 * ratio * 10) / 10)
      doc.addImage(imgData, 'JPEG', 0, 0, 210, pdfH)
    }

    const safeName = (simName || 'immolyse').replace(/[^a-z0-9]/gi, '_')
    doc.save(`Immolyse_${safeName}.pdf`)
  } finally {
    container.style.cssText = 'display:none;'
    container.innerHTML = ''
  }
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
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePDF = async () => {
    if (!containerRef.current) return
    await generatePDF(
      result,
      fiscalResults ?? null,
      params ?? null,
      score ?? null,
      simName,
      containerRef.current
    )
  }

  const handleExcel = async () => {
    await generateExcel(result, fiscalResults ?? null, params ?? null, simName)
  }

  return (
    <>
      {/* Hidden PDF render container */}
      <div ref={containerRef} style={{ display: 'none' }} aria-hidden="true" />

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
