'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { useAuth } from '@/lib/hooks/useAuth'
import { calculateInvestment, DEFAULT_PARAMS } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { calculateScore } from '@/lib/score'
import { calculateBankRatios, structureLabel, typeContratLabel, situationFamLabel, documentsRequis } from '@/lib/bank-report'
import type { InvestmentParams, InvestmentResult, FiscalResult, ScoreResult, BankReportProfile, BankRatios } from '@/lib/types'

const LS_KEY = 'immolyse_last_params' // sessionStorage uniquement

// ─── Helpers d'affichage ──────────────────────────────────────────────────────
const fE = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €'
const fP = (n: number, dec = 1) => n.toFixed(dec) + ' %'

/**
 * Barre de ratio.
 *  - danger = true  → « bas = bon » (taux d'endettement, effort) : rouge si élevé.
 *  - danger = false → « haut = bon » (couverture, reste à vivre) : vert si élevé.
 */
function RatioBar({ value, max, danger }: { value: number; max: number; danger?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const color = danger
    ? pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-400' : 'bg-emerald-500'
    : pct >= 65 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="w-full bg-th-surface3 rounded-full h-1.5 mt-1 overflow-hidden">
      <motion.div
        className={`h-1.5 rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

// ─── Générateur PDF (@react-pdf/renderer) ────────────────────────────────────
async function generateBankPDF(
  params: InvestmentParams,
  result: InvestmentResult,
  fiscal: FiscalResult,
  score: ScoreResult,
  profile: BankReportProfile,
  ratios: BankRatios,
) {
  // Import dynamique pour éviter le SSR
  const { pdf } = await import('@react-pdf/renderer')
  const { default: BankReportPDF } = await import('@/components/pdf/BankReportPDF')

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const hasCompany = profile.modeAcquisition !== 'nom-propre'
  const totalPages = hasCompany ? 8 : 7

  const element = React.createElement(BankReportPDF, {
    params, result, fiscal, profile, ratios, today, totalPages,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const nom = (profile.nomPrenom || 'IMMORA').replace(/\s+/g, '_')
  link.download = `Dossier_Bancaire_IMMORA_${nom}_${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/* eslint-disable @typescript-eslint/no-unused-vars */
// ─── ANCIENNE FONCTION html2canvas — conservée pour rollback ─────────────────
async function _generateBankPDF_legacy(
  params: InvestmentParams,
  result: InvestmentResult,
  fiscal: FiscalResult,
  score: ScoreResult,
  profile: BankReportProfile,
  ratios: BankRatios,
) {
  const jsPDFModule = await import('jspdf')
  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = jsPDFModule

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const enabledRegimes = fiscal.regimes.filter(r => !r.disabled)
  const bestRegime = enabledRegimes.length > 0
    ? enabledRegimes.reduce((b, r) => r.rendNetNet > b.rendNetNet ? r : b, enabledRegimes[0])
    : null

  const endDot  = (pct: number) => pct <= 30 ? '#059669' : pct <= 35 ? '#d97706' : '#dc2626'
  const coverDot = (pct: number) => pct >= 110 ? '#059669' : pct >= 85 ? '#d97706' : '#dc2626'
  const ravDot   = (v: number, c: number) => v >= c ? '#059669' : v >= c * 0.8 ? '#d97706' : '#dc2626'

  // Tronque et sécurise les strings pour le HTML
  const trunc = (s: string | undefined | null, n: number): string =>
    !s ? '—' : s.length > n ? s.slice(0, n) + '…' : s

  const PAGE_W = 794
  const PAGE_H = 1123
  const FONT = `font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`
  const PS = `style="width:${PAGE_W}px;height:${PAGE_H}px;padding:40px 52px 32px;${FONT};font-size:12px;color:#0f172a;background:#fff;box-sizing:border-box;overflow:hidden;position:relative"`

  // ── Composants HTML — version 2.0 (overflow-safe, premium) ──────────────────
  const HEADER = (subtitle: string) => `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-bottom:11px;border-bottom:2px solid #10b981">
      <div style="display:flex;align-items:center;gap:10px;overflow:hidden">
        <div style="font-size:16px;font-weight:800;letter-spacing:-.3px;color:#0f172a;flex-shrink:0">IMMO<span style="color:#10b981">RA</span></div>
        <div style="width:1px;height:14px;background:#e2e8f0;flex-shrink:0"></div>
        <div style="font-size:10px;font-weight:500;color:#475569;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${trunc(subtitle, 70)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:12px">
        <div style="font-size:8.5px;color:#94a3b8;white-space:nowrap">Confidentiel · ${today}</div>
      </div>
    </div>`

  const SECTION = (title: string) => `
    <div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#10b981;margin:14px 0 6px;padding-bottom:4px;border-bottom:1.5px solid #e2e8f0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${title}</div>`

  const ROW = (label: string, value: string, note = '') => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:4.5px 0;border-bottom:1px solid #f8fafc;overflow:hidden;min-width:0">
      <div style="font-size:9.5px;color:#64748b;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;padding-right:8px">${trunc(label, 55)}${note ? `<span style="font-size:8px;color:#94a3b8;margin-left:5px">${note}</span>` : ''}</div>
      <div style="font-size:10px;font-weight:700;color:#0f172a;flex-shrink:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:210px;text-align:right">${trunc(value, 32)}</div>
    </div>`

  const KPIB = (label: string, value: string, sub: string, dot: string) => `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid ${dot};border-radius:8px;padding:11px 13px;overflow:hidden">
      <div style="font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trunc(label, 45)}</div>
      <div style="font-size:19px;font-weight:800;color:#0f172a;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${value}</div>
      <div style="font-size:8.5px;color:#94a3b8;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trunc(sub, 55)}</div>
    </div>`

  const BADGE = (text: string, good: boolean) => `
    <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:700;background:${good ? '#f0fdf4' : '#fef2f2'};color:${good ? '#059669' : '#dc2626'};border:1px solid ${good ? '#bbf7d0' : '#fecaca'};white-space:nowrap">${good ? '✓' : '⚠'} ${text}</span>`

  const FOOTER = (page: number, total: number) => `
    <div style="position:absolute;bottom:14px;left:52px;right:52px;border-top:1px solid #e2e8f0;padding-top:7px;font-size:7.5px;color:#94a3b8;display:flex;justify-content:space-between;align-items:center">
      <span>IMMORA · Dossier de financement confidentiel · Ne constitue pas un conseil financier ou juridique</span>
      <span style="font-weight:600;color:#64748b;flex-shrink:0;margin-left:12px">${page} / ${total}</span>
    </div>`

  const docs = documentsRequis(profile.modeAcquisition)
  const hasCompany = profile.modeAcquisition !== 'nom-propre'
  const TOTAL_PAGES = hasCompany ? 8 : 7

  // Co-emprunteur
  const revenusCoEmp = (profile.hasCoEmprunteur && profile.coemprunteurRevenus) ? profile.coemprunteurRevenus : 0
  const revenusTotaux = profile.revenusNetsProFoyer + revenusCoEmp
  const locTypeLabel: Record<string, string> = { nu: 'Location nue', meuble: 'Location meublée', coloc: 'Colocation', saisonnier: 'Saisonnier' }
  const prixM2 = params.surface > 0 ? Math.round(params.prixAchat / params.surface) : 0
  const cfColor = result.cashflowMensuel >= 100 ? '#059669' : result.cashflowMensuel >= 0 ? '#d97706' : '#dc2626'
  const coverCfColor = cfColor
  const rnColor = result.rendNet >= 4 ? '#059669' : result.rendNet >= 2.5 ? '#d97706' : '#dc2626'
  const rbColor = result.rendBrut >= 6 ? '#059669' : result.rendBrut >= 4 ? '#d97706' : '#dc2626'

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE DE COUVERTURE
  // ════════════════════════════════════════════════════════════════════════════
  const coverPage = `<div ${PS}>
    <!-- Background décoratif (zone sombre en haut) -->
    <div style="position:absolute;top:0;left:0;right:0;height:340px;background:#0f172a;border-bottom:3px solid #10b981"></div>

    <!-- Logo + date -->
    <div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
      <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-.5px">IMMO<span style="color:#10b981">RA</span></div>
      <div style="text-align:right;font-size:9px;color:rgba(255,255,255,.45);line-height:1.8">
        <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,.7)">Dossier de financement immobilier</div>
        <div>Confidentiel · Généré le ${today}</div>
      </div>
    </div>

    <!-- Titre principal -->
    <div style="position:relative;z-index:1;margin-bottom:28px">
      <div style="font-size:10px;font-weight:600;color:#10b981;letter-spacing:.18em;text-transform:uppercase;margin-bottom:10px">Demande de financement immobilier locatif</div>
      <div style="font-size:34px;font-weight:800;color:#fff;line-height:1.12;margin-bottom:6px">${params.ville || 'Investissement locatif'}</div>
      <div style="font-size:14px;color:rgba(255,255,255,.55);font-weight:400">
        ${params.surface ? params.surface + ' m²' : ''} ${params.typeBien ? '· ' + params.typeBien : ''} ${params.dpe ? '· DPE ' + params.dpe : ''} ${params.etat === 'neuf' ? '· Neuf' : '· Ancien'}
      </div>
    </div>

    <!-- KPIs financiers clés (sur fond sombre) -->
    <div style="position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:50px">
      <div style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:14px 16px">
        <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.45);margin-bottom:6px">Montant emprunté</div>
        <div style="font-size:20px;font-weight:800;color:#fff;line-height:1">${fE(result.montantEmprunte)}</div>
        <div style="font-size:9px;color:rgba(255,255,255,.35);margin-top:4px">${params.duree} ans · ${fP(params.taux)} · assur. ${fP(params.assuranceTaux)}</div>
      </div>
      <div style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:14px 16px">
        <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.45);margin-bottom:6px">Mensualité totale</div>
        <div style="font-size:20px;font-weight:800;color:#fff;line-height:1">${fE(result.mensualiteTotale)}<span style="font-size:12px;font-weight:500">/mois</span></div>
        <div style="font-size:9px;color:rgba(255,255,255,.35);margin-top:4px">Capital + intérêts + assurance</div>
      </div>
      <div style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:14px 16px">
        <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.45);margin-bottom:6px">Cashflow net mensuel</div>
        <div style="font-size:20px;font-weight:800;color:${coverCfColor};line-height:1">${(result.cashflowMensuel >= 0 ? '+' : '') + fE(result.cashflowMensuel)}<span style="font-size:12px;font-weight:500">/mois</span></div>
        <div style="font-size:9px;color:rgba(255,255,255,.35);margin-top:4px">Loyer ${fE(result.loyer)} · Rend. brut ${fP(result.rendBrut)}</div>
      </div>
    </div>

    <!-- Infos emprunteur + structure (sur fond blanc) -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 22px">
        <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:10px">Emprunteur</div>
        <div style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:5px">${profile.nomPrenom || '—'}</div>
        <div style="font-size:11px;color:#475569;margin-bottom:2px">${typeContratLabel(profile.typeContrat)} · ${profile.anciennetePoste} an${profile.anciennetePoste > 1 ? 's' : ''} d'ancienneté</div>
        <div style="font-size:11px;color:#475569;margin-bottom:2px">${situationFamLabel(profile.situationFamiliale)} · ${profile.nbParts} part${profile.nbParts > 1 ? 's' : ''} fiscale${profile.nbParts > 1 ? 's' : ''}</div>
        <div style="font-size:11px;color:#64748b">${profile.profession || '—'}</div>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 22px">
        <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:10px">Structure d'acquisition</div>
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px">${structureLabel(profile.modeAcquisition)}</div>
        ${profile.nomSociete ? `<div style="font-size:11px;color:#475569;margin-bottom:2px">${profile.nomSociete}${profile.siren ? ' · SIREN ' + profile.siren : ''}</div>` : ''}
        <div style="margin-top:8px;display:flex;align-items:center;gap:6px">
          <div style="width:6px;height:6px;background:#10b981;border-radius:50%;flex-shrink:0"></div>
          <div style="font-size:10px;color:#10b981;font-weight:600">${fE(result.montantEmprunte)} · ${params.duree} ans · ${fP(params.taux)}</div>
        </div>
      </div>
    </div>

    <!-- Bande de bas de page avec infos clés -->
    <div style="background:#0f172a;border-radius:10px;padding:14px 20px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
      <div style="text-align:center">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.4);margin-bottom:4px">Prix de revient</div>
        <div style="font-size:13px;font-weight:700;color:#fff">${fE(result.prixRevient)}</div>
      </div>
      <div style="text-align:center;border-left:1px solid rgba(255,255,255,.08)">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.4);margin-bottom:4px">Apport</div>
        <div style="font-size:13px;font-weight:700;color:#fff">${fE(params.apport)}</div>
      </div>
      <div style="text-align:center;border-left:1px solid rgba(255,255,255,.08)">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.4);margin-bottom:4px">Rend. net</div>
        <div style="font-size:13px;font-weight:700;color:#10b981">${fP(result.rendNet)}</div>
      </div>
      <div style="text-align:center;border-left:1px solid rgba(255,255,255,.08)">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.4);margin-bottom:4px">TRI ${params.horizonRevente} ans</div>
        <div style="font-size:13px;font-weight:700;color:#10b981">${fP(result.tri)}</div>
      </div>
    </div>

    ${FOOTER(1, TOTAL_PAGES)}
  </div>`

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — PROFIL EMPRUNTEUR
  // ════════════════════════════════════════════════════════════════════════════
  const page1 = `<div ${PS}>
    ${HEADER('Profil de l\'emprunteur')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">
      <div>
        ${SECTION('Situation personnelle')}
        ${ROW('Nom / Prénom', profile.nomPrenom)}
        ${ROW('Situation familiale', situationFamLabel(profile.situationFamiliale))}
        ${ROW('Enfants à charge', String(profile.nbEnfants))}
        ${ROW('Parts fiscales', String(profile.nbParts))}

        ${SECTION('Situation professionnelle')}
        ${ROW('Profession', profile.profession)}
        ${ROW('Type de contrat', typeContratLabel(profile.typeContrat))}
        ${ROW('Ancienneté', profile.anciennetePoste + ' an' + (profile.anciennetePoste > 1 ? 's' : ''))}
        ${profile.hasCoEmprunteur && profile.coemprunteurNom ? `
          <div style="margin-top:4px;padding:8px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:7px;font-size:9.5px;color:#166534">
            <div style="font-weight:700;margin-bottom:3px">Co-emprunteur : ${trunc(profile.coemprunteurNom, 35)}</div>
            <div>${trunc(profile.coemprunteurProfession || '—', 35)} · ${profile.coemprunteurTypeContrat ? typeContratLabel(profile.coemprunteurTypeContrat) : '—'} · ${profile.coemprunteurAnciennete ?? 0} an${(profile.coemprunteurAnciennete ?? 0) > 1 ? 's' : ''}</div>
          </div>` : ''}

        ${SECTION('Patrimoine')}
        ${ROW('Épargne totale disponible', fE(profile.epargneTotale))}
        ${ROW('Apport dans ce projet', fE(params.apport))}
        ${ROW('Épargne résiduelle après apport', fE(Math.max(0, profile.epargneTotale - params.apport)), '(hors investissement)')}
      </div>
      <div>
        ${SECTION('Revenus mensuels nets du foyer')}
        ${ROW('Revenus emprunteur principal', fE(profile.revenusNetsProFoyer))}
        ${revenusCoEmp > 0 ? ROW('Revenus co-emprunteur', fE(revenusCoEmp)) : ''}
        ${revenusCoEmp > 0 ? ROW('Total revenus nets du foyer', fE(revenusTotaux)) : ''}
        ${profile.autresRevenusLocatifs > 0 ? ROW('Autres revenus locatifs', fE(profile.autresRevenusLocatifs)) : ''}
        ${ROW('Intégration bancaire des loyers', fE(ratios.loyerIntegreBanque), '(70 % du loyer, méthode HCSF)')}
        ${ROW('Base de revenus retenue par la banque', fE(revenusTotaux + ratios.loyerIntegreBanque), '(référence HCSF)')}

        ${SECTION('Charges mensuelles actuelles')}
        ${ROW('Loyer / mensualité résidence principale', fE(profile.loyerActuel))}
        ${ROW('Autres crédits en cours', fE(profile.autresCreditsMensualites))}
        ${ROW('Total charges actuelles', fE(profile.loyerActuel + profile.autresCreditsMensualites))}

        ${SECTION('Après projet — charges cumulées')}
        ${ROW('Mensualité du nouveau crédit', fE(result.mensualiteTotale), '(capital + intérêts + assurance)')}
        ${ROW('Autres crédits conservés', fE(profile.autresCreditsMensualites))}
        ${ROW('Total charges après projet', fE(profile.autresCreditsMensualites + result.mensualiteTotale))}
      </div>
    </div>
    ${FOOTER(2, TOTAL_PAGES)}
  </div>`

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2 — LE PROJET IMMOBILIER
  // ════════════════════════════════════════════════════════════════════════════
  const page2 = `<div ${PS}>
    ${HEADER('Le projet immobilier')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">
      <div>
        ${SECTION('Caractéristiques du bien')}
        ${ROW('Adresse / Ville', (profile.adresseBien || '') + (profile.adresseBien ? '' : params.ville))}
        ${ROW('Type de bien', params.typeBien || '—')}
        ${ROW('Surface', params.surface ? params.surface + ' m²' : '—')}
        ${ROW('Prix au m²', prixM2 ? fE(prixM2) + '/m²' : '—')}
        ${ROW('DPE (diagnostic énergétique)', params.dpe + ((params.dpe === 'F' || params.dpe === 'G') ? ' ⚠ Passoire thermique' : params.dpe === 'A' || params.dpe === 'B' ? ' ✓ Excellent' : ''))}
        ${ROW('État du bien', params.etat === 'neuf' ? 'Neuf / VEFA' : 'Ancien')}
        ${params.travaux > 0 ? ROW('Travaux prévus', fE(params.travaux)) : ''}

        ${SECTION('Mode d\'exploitation locative')}
        ${ROW('Type de location', locTypeLabel[params.locType] ?? params.locType)}
        ${ROW('Loyer mensuel estimé', fE(result.loyer))}
        ${ROW('Source estimation loyer', profile.sourceEstimationLoyer || 'Étude de marché')}
        ${ROW('Vacance locative retenue', params.vacance + ' mois/an')}
        ${ROW('Mois loués / an', result.moisLoues + ' mois')}
        ${ROW('Revenu locatif annuel net vacance', fE(result.revAnnuel))}
      </div>
      <div>
        ${SECTION('Plan de financement')}
        ${ROW('Prix d\'achat', fE(params.prixAchat))}
        ${ROW('Frais de notaire', fE(params.fraisNotaire))}
        ${params.travaux > 0 ? ROW('Travaux', fE(params.travaux)) : ''}
        ${ROW('Prix de revient total', fE(result.prixRevient))}
        <div style="height:8px"></div>
        ${ROW('Apport personnel', fE(params.apport))}
        ${ROW('Montant emprunté', fE(result.montantEmprunte))}
        ${ROW('Taux du crédit', fP(params.taux) + ' + ' + fP(params.assuranceTaux) + ' assurance')}
        ${ROW('Durée', params.duree + ' ans')}
        ${ROW('Type de prêt', params.loanType === 'in-fine' ? 'In fine' : 'Amortissable')}
        ${ROW('Mensualité totale', fE(result.mensualiteTotale))}
        ${ROW('Coût total du crédit', fE(result.coutCredit))}

        ${SECTION('Charges annuelles du bien')}
        ${ROW('Taxe foncière', fE(params.taxeFonciere))}
        ${ROW('Charges de copropriété', fE(params.chargesCopro))}
        ${ROW('Assurance PNO', fE(params.assurancePno))}
        ${params.fraisGestionPct > 0 ? ROW('Frais de gestion locative', fP(params.fraisGestionPct) + ' du loyer') : ''}
        ${ROW('Total charges annuelles', fE(result.totalCharges))}
      </div>
    </div>
    ${FOOTER(3, TOTAL_PAGES)}
  </div>`

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 3 — INDICATEURS BANCAIRES CLÉS
  // ════════════════════════════════════════════════════════════════════════════
  const page3 = `<div ${PS}>
    ${HEADER('Indicateurs bancaires clés')}

    <!-- 4 KPIs principaux -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px">
      ${KPIB(
        'Taux d\'endettement après projet',
        fP(ratios.tauxEndettementApres),
        `Avant projet : ${fP(ratios.tauxEndettementAvant)} · Limite HCSF : 35 %`,
        endDot(ratios.tauxEndettementApres)
      )}
      ${KPIB(
        'Taux de couverture loyer / mensualité',
        fP(ratios.tauxCouverture),
        `Loyer : ${fE(result.loyer)} / Mensualité : ${fE(result.mensualiteTotale)}`,
        coverDot(ratios.tauxCouverture)
      )}
      ${KPIB(
        'Reste à vivre mensuel',
        fE(ratios.resteAVivre),
        `Objectif : min ${fE(ratios.resteAVivreCible)} pour ce profil`,
        ravDot(ratios.resteAVivre, ratios.resteAVivreCible)
      )}
      ${KPIB(
        'Saut de charges mensuel',
        (ratios.sautCharges > 0 ? '+' : '') + fE(ratios.sautCharges),
        ratios.sautCharges <= 0 ? 'Situation allégée après projet' : 'Effort net mensuel de l\'emprunteur',
        ratios.sautCharges <= 0 ? '#10b981' : ratios.sautCharges <= 200 ? '#f59e0b' : '#ef4444'
      )}
    </div>

    ${SECTION('Méthode de calcul — Norme bancaire HCSF 2026')}
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:18px;font-size:10.5px;color:#475569;line-height:1.6">
      Le taux d'endettement est calculé selon la règle HCSF en vigueur : <strong>toutes charges mensuelles / revenus de référence ≤ 35 %</strong>, assurance incluse.<br>
      Les futurs loyers sont intégrés à <strong>70 %</strong> dans les revenus (méthode prudentielle standard). Loyer retenu par la banque : <strong>${fE(ratios.loyerIntegreBanque)}/mois</strong> (= ${fE(result.loyer)} × 70 %).
    </div>

    ${SECTION('Analyse des stress tests')}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:18px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px">
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Scénario +1 % de taux</div>
        ${ROW('Nouvelle mensualité', fE(ratios.stressTaux1Pct.nouvelleMensualite))}
        ${ROW('Surcoût mensuel', '+' + fE(ratios.stressTaux1Pct.deltaVsMensualiteBase))}
        ${ROW('Cashflow résultant', (ratios.stressTaux1Pct.nouveauCashflow >= 0 ? '+' : '') + fE(ratios.stressTaux1Pct.nouveauCashflow))}
        ${ROW('Taux d\'endett. résultant', fP(ratios.stressTaux1Pct.tauxEndettement))}
        <div style="margin-top:6px">${BADGE(ratios.stressTaux1Pct.tauxEndettement <= 35 ? 'Projet résistant' : 'Attention', ratios.stressTaux1Pct.tauxEndettement <= 35)}</div>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px">
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Scénario −10 % de loyer</div>
        ${ROW('Loyer réduit', fE(ratios.stressLoyer10Pct.nouveauLoyer))}
        ${ROW('Nouveau cashflow', (ratios.stressLoyer10Pct.nouveauCashflow >= 0 ? '+' : '') + fE(ratios.stressLoyer10Pct.nouveauCashflow))}
        ${ROW('Taux de couverture', fP(ratios.stressLoyer10Pct.tauxCouverture))}
        <div style="margin-top:18px">${BADGE(ratios.stressLoyer10Pct.tauxCouverture >= 80 ? 'Couverture maintenue' : 'Vigilance', ratios.stressLoyer10Pct.tauxCouverture >= 80)}</div>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px">
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Scénario +2 mois vacance</div>
        ${ROW('Perte de loyers/an', fE(ratios.stressVacance2Mois.perteLoyersAnnuelle))}
        ${ROW('CF mensuel moyen', (ratios.stressVacance2Mois.nouveauCashflowMensuelMoyen >= 0 ? '+' : '') + fE(ratios.stressVacance2Mois.nouveauCashflowMensuelMoyen))}
        <div style="margin-top:30px">${BADGE(ratios.stressVacance2Mois.nouveauCashflowMensuelMoyen >= -300 ? 'Risque maîtrisé' : 'Vigilance', ratios.stressVacance2Mois.nouveauCashflowMensuelMoyen >= -300)}</div>
      </div>
    </div>

    ${SECTION('Synthèse de l\'analyste')}
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;font-size:10.5px;color:#1e293b;line-height:1.65">
      ${ratios.recommandationBanquier}
    </div>

    ${FOOTER(4, TOTAL_PAGES)}
  </div>`

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 4 — ANALYSE DE RENTABILITÉ
  // ════════════════════════════════════════════════════════════════════════════
  const page4 = `<div ${PS}>
    ${HEADER('Analyse de rentabilité')}

    <!-- KPIs rendement -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
      ${KPIB('Rendement brut', fP(result.rendBrut), 'Loyers / Prix de revient', rbColor)}
      ${KPIB('Rendement net', fP(result.rendNet), 'Après charges, avant impôts', rnColor)}
      ${KPIB('Cashflow mensuel', (result.cashflowMensuel >= 0 ? '+' : '') + fE(result.cashflowMensuel), 'Loyers – mensualité – charges', cfColor)}
      ${KPIB('ROI sur apport', fP(result.roiApport), 'Cashflow annuel / apport', result.roiApport >= 7 ? '#10b981' : result.roiApport >= 3 ? '#f59e0b' : '#ef4444')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">
      <div>
        ${SECTION('Décomposition du cashflow mensuel')}
        ${ROW('Loyer mensuel encaissé', '+' + fE(result.loyer))}
        ${ROW('Mensualité crédit + assurance', '−' + fE(result.mensualiteTotale))}
        ${ROW('Charges mensualisées', '−' + fE(result.totalCharges / 12))}
        <div style="padding:7px 0;border-top:1.5px solid #0f172a;margin-top:4px;display:flex;justify-content:space-between">
          <div style="font-size:11px;font-weight:700;color:#0f172a">Cashflow net mensuel</div>
          <div style="font-size:13px;font-weight:800;color:${cfColor}">${(result.cashflowMensuel >= 0 ? '+' : '') + fE(result.cashflowMensuel)}</div>
        </div>
        ${ROW('Effort d\'épargne si CF négatif', result.effortEpargne > 0 ? fE(result.effortEpargne) + '/mois' : 'Aucun')}

        ${SECTION('Comparatif avec le marché')}
        ${ROW('Rendement brut', fP(result.rendBrut))}
        ${ROW('Référence marché FR (bonne renta)', '≥ 6 %')}
        ${ROW('Rendement net', fP(result.rendNet))}
        ${ROW('Référence marché FR', '≥ 4 % net')}
        <div style="margin-top:8px">${BADGE(result.rendBrut >= 5 ? 'Au-dessus du marché' : result.rendBrut >= 4 ? 'Dans la moyenne' : 'En dessous du marché', result.rendBrut >= 5)}</div>
      </div>
      <div>
        ${SECTION('Indicateurs complémentaires')}
        ${ROW('Point mort locatif', fE(result.pointMort) + '/an', '(loyer min pour couvrir toutes charges)')}
        ${ROW('Mois loués / an', result.moisLoues + ' mois')}
        ${ROW('Vacance annuelle', fE(result.vacanceAnnuelle))}
        ${ROW('Cashflow annuel', (result.cashflowAnnuel >= 0 ? '+' : '') + fE(result.cashflowAnnuel))}

        ${SECTION('Projection patrimoniale — ' + params.horizonRevente + ' ans')}
        ${ROW('Valeur estimée à la revente', fE(result.prixRevente))}
        ${ROW('Capital restant dû à la revente', fE(result.prixRevente - result.patrimoineNetRevente))}
        ${ROW('Plus-value brute estimée', fE(result.plusValueBrute))}
        ${ROW('Impôt sur plus-value estimé', fE(result.impotPlusValue))}
        ${ROW('Patrimoine net à la revente', fE(result.patrimoineNetRevente))}
        ${ROW('TRI sur ' + params.horizonRevente + ' ans', fP(result.tri))}

        <div style="margin-top:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:7px;padding:10px 14px;font-size:10px;color:#166534">
          <strong>Enrichissement net</strong> : en ${params.horizonRevente} ans, cet investissement génère un patrimoine net de <strong>${fE(result.patrimoineNetRevente)}</strong> pour un apport initial de ${fE(params.apport)}, soit une multiplication de <strong>×${(result.patrimoineNetRevente / Math.max(1, params.apport)).toFixed(1)}</strong>.
        </div>
      </div>
    </div>
    ${FOOTER(5, TOTAL_PAGES)}
  </div>`

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 5 — OPTIMISATION FISCALE
  // ════════════════════════════════════════════════════════════════════════════
  const activeRegimes = fiscal.regimes.filter(r => !r.disabled)

  const page5 = `<div ${PS}>
    ${HEADER('Optimisation fiscale')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:18px">
      <div>
        ${SECTION('Régime fiscal optimal retenu')}
        ${bestRegime ? `
          <div style="background:#f0fdf4;border:1px solid #6ee7b7;border-radius:10px;padding:16px 20px;margin-bottom:12px">
            <div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">✦ Meilleur régime identifié</div>
            <div style="font-size:18px;font-weight:800;color:#0f172a">${bestRegime.name}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
              <div><div style="font-size:8.5px;color:#64748b;text-transform:uppercase">Rend. nette-nette</div><div style="font-size:16px;font-weight:800;color:#10b981">${fP(bestRegime.rendNetNet)}</div></div>
              <div><div style="font-size:8.5px;color:#64748b;text-transform:uppercase">CF net impôts</div><div style="font-size:16px;font-weight:800;color:#0f172a">${(bestRegime.cfNet >= 0 ? '+' : '') + fE(bestRegime.cfNet)}/mois</div></div>
            </div>
          </div>
          ${ROW('Revenu imposable', fE(bestRegime.revImposable))}
          ${ROW('Impôt sur le revenu', fE(bestRegime.impot))}
          ${ROW('Prélèvements sociaux', fE(bestRegime.ps))}
          ${ROW('Total fiscal annuel', fE(bestRegime.totalFiscal))}
        ` : '<div style="color:#64748b;font-size:11px">Données fiscales non disponibles.</div>'}
      </div>
      <div>
        ${SECTION('Comparaison des régimes disponibles')}
        <div style="display:flex;flex-direction:column;gap:6px">
          ${activeRegimes.slice(0, 5).map(r => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f8fafc;border:1px solid ${r === bestRegime ? '#6ee7b7' : '#e2e8f0'};border-radius:7px${r === bestRegime ? ';border-left:3px solid #10b981' : ''}">
              <div>
                <div style="font-size:10.5px;font-weight:600;color:#0f172a">${r.name}${r === bestRegime ? ' <span style="color:#10b981;font-size:9px">✦ Optimal</span>' : ''}</div>
                <div style="font-size:9px;color:#64748b">CF net : ${(r.cfNet >= 0 ? '+' : '') + fE(r.cfNet)}/mois</div>
              </div>
              <div style="font-size:15px;font-weight:800;color:${r.rendNetNet >= 4 ? '#10b981' : r.rendNetNet >= 2 ? '#f59e0b' : '#ef4444'}">${fP(r.rendNetNet)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>
    ${SECTION('Impact fiscal global sur la durée de détention')}
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;font-size:10.5px;color:#475569;line-height:1.7">
      Avec le régime <strong>${bestRegime?.name ?? '—'}</strong>, la charge fiscale annuelle est estimée à <strong>${bestRegime ? fE(bestRegime.totalFiscal) : '—'}</strong>, soit une économie de <strong>${bestRegime && activeRegimes.length > 1 ? fE(Math.max(...activeRegimes.map(r => r.totalFiscal)) - bestRegime.totalFiscal) : '—'}</strong> par rapport au régime le moins favorable.
      Sur ${params.horizonRevente} ans, cette optimisation représente une économie cumulée estimée de <strong>${bestRegime && activeRegimes.length > 1 ? fE((Math.max(...activeRegimes.map(r => r.totalFiscal)) - bestRegime.totalFiscal) * params.horizonRevente) : '—'}</strong>.
    </div>
    ${FOOTER(6, TOTAL_PAGES)}
  </div>`

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 6 — POINTS FORTS / VIGILANCE + DOCUMENTS REQUIS
  // ════════════════════════════════════════════════════════════════════════════
  const page6 = `<div ${PS}>
    ${HEADER('Synthèse & documents du dossier')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:20px">
      <div>
        ${SECTION('Points forts du dossier')}
        ${ratios.pointsForts.map(p => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #f0fdf4">
            <span style="color:#10b981;font-size:12px;flex-shrink:0;margin-top:1px">✓</span>
            <span style="font-size:10.5px;color:#1e293b;line-height:1.5">${p}</span>
          </div>`).join('')}
        ${ratios.pointsForts.length === 0 ? '<div style="color:#64748b;font-size:10.5px">Complétez le profil pour générer l\'analyse.</div>' : ''}
      </div>
      <div>
        ${SECTION('Points de vigilance')}
        ${ratios.pointsVigilance.map(p => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #fff7ed">
            <span style="color:#f59e0b;font-size:12px;flex-shrink:0;margin-top:1px">⚠</span>
            <span style="font-size:10.5px;color:#1e293b;line-height:1.5">${p}</span>
          </div>`).join('')}
        ${ratios.pointsVigilance.length === 0 ? '<div style="color:#64748b;font-size:10.5px;padding:7px 0">Aucun point de vigilance détecté.</div>' : ''}
      </div>
    </div>

    ${SECTION('Documents à fournir avec ce dossier')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 28px">
      ${docs.map((d, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f8fafc">
          <span style="width:17px;height:17px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:8px;color:#64748b">${i + 1}</span>
          <span style="font-size:10px;color:#475569">${d}</span>
        </div>`).join('')}
    </div>
    ${FOOTER(7, TOTAL_PAGES)}
  </div>`

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 7 — STRUCTURE JURIDIQUE (si société)
  // ════════════════════════════════════════════════════════════════════════════
  const page7Society = hasCompany ? `<div ${PS}>
    ${HEADER('Structure juridique & gouvernance')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">
      <div>
        ${SECTION('Identification de la structure')}
        ${ROW('Forme juridique', structureLabel(profile.modeAcquisition))}
        ${profile.nomSociete ? ROW('Dénomination sociale', profile.nomSociete) : ''}
        ${profile.siren ? ROW('SIREN', profile.siren) : ''}
        ${profile.dateCreationSociete ? ROW('Date de création', profile.dateCreationSociete) : ''}
        ${profile.capitalSocial ? ROW('Capital social', fE(profile.capitalSocial)) : ''}

        ${SECTION('Répartition du capital')}
        ${(profile.associes ?? []).map(a => ROW(a.nom, fP(a.partsPct, 0) + ' des parts')).join('') || ROW('Associé principal', profile.nomPrenom + ' — 100 %')}

        ${SECTION('Garanties proposées à la banque')}
        ${['sci-ir', 'sci-is'].includes(profile.modeAcquisition) ? `
          ${ROW('Caution personnelle', 'Des associés garants (proportionnelle aux parts)')}
          ${ROW('Hypothèque', 'Sur le bien acquis')}
          ${profile.modeAcquisition === 'sci-is' ? ROW('Nantissement', 'Des parts sociales de la SCI') : ''}
        ` : ''}
        ${profile.modeAcquisition === 'sarl-famille' ? `
          ${ROW('Caution personnelle', 'Des cogérants')}
          ${ROW('Hypothèque', 'Sur le bien acquis')}
        ` : ''}
        ${profile.modeAcquisition === 'holding-sci' ? `
          ${ROW('Caution société', 'La Holding se porte garante de la SCI')}
          ${ROW('Nantissement', 'Des parts SCI détenues par la Holding')}
          ${ROW('Hypothèque', 'Sur le bien acquis')}
        ` : ''}
      </div>
      <div>
        ${SECTION('Spécificités bancaires selon la structure')}
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;font-size:10.5px;color:#1e293b;line-height:1.7;margin-bottom:14px">
          ${profile.modeAcquisition === 'sci-ir' ? `
            La SCI IR est fiscalement transparente : la banque analyse la capacité de remboursement personnelle des associés. Les revenus locatifs de la SCI remontent fiscalement chez les associés proportionnellement à leurs parts. Le taux d'endettement est calculé au niveau des associés garants.
          ` : ''}
          ${profile.modeAcquisition === 'sci-is' ? `
            La SCI IS amortit le bien comptablement, ce qui réduit le résultat apparent sans affecter le cash flow réel. La banque est sensibilisée au fait que le cash flow opérationnel reste positif malgré un résultat comptable potentiellement faible. Le business plan prévisionnel ci-joint illustre cette mécanique.
          ` : ''}
          ${profile.modeAcquisition === 'sarl-famille' ? `
            La SARL de famille permet d'opter pour le régime des sociétés de personnes (IS ou IR selon option). Les associés doivent justifier du lien familial. La banque examine les bilans et comptes de résultat, ainsi que la capacité personnelle des cogérants à se porter caution.
          ` : ''}
          ${profile.modeAcquisition === 'holding-sci' ? `
            Le montage Holding + SCI optimise la remontée de trésorerie (dividendes IS → Holding au quasi en franchise d'impôt via régime mère-fille). La banque instruite de la solidité financière de la Holding peut accepter une garantie au niveau de la holding plutôt que personnelle. Les bilans des deux entités sont fournis.
          ` : ''}
        </div>

        ${SECTION('Flux financiers au sein du montage')}
        ${profile.modeAcquisition === 'holding-sci' ? `
          <div style="font-size:10.5px;color:#475569;line-height:1.7">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:10px 14px;margin-bottom:8px">
              <strong>Flux entrants SCI :</strong> loyers locatifs → couvrent mensualité du prêt SCI + charges courantes
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:10px 14px">
              <strong>Remontée Holding :</strong> bénéfices SCI → dividendes Holding (régime mère-fille 95 % exonéré) → trésorerie disponible pour nouveaux investissements
            </div>
          </div>
        ` : `
          <div style="font-size:10.5px;color:#475569;line-height:1.7">
            Loyers encaissés par la ${profile.modeAcquisition === 'sci-ir' ? 'SCI' : profile.modeAcquisition === 'sarl-famille' ? 'SARL' : 'société'} → paiement des charges et de la mensualité bancaire → résultat distribué ou conservé selon la stratégie patrimoniale des associés.
          </div>
        `}
      </div>
    </div>
    ${FOOTER(8, TOTAL_PAGES)}
  </div>` : ''

  // ── Rendu HTML → Canvas → PDF ──────────────────────────────────────────────
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1'
  document.body.appendChild(container)

  const pages = [coverPage, page1, page2, page3, page4, page5, page6, page7Society].filter(Boolean)
  const pdf = new jsPDF({ unit: 'px', format: [PAGE_W, PAGE_H], orientation: 'portrait' })

  for (let i = 0; i < pages.length; i++) {
    container.innerHTML = pages[i]
    await new Promise(r => setTimeout(r, 80))
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 3,
      useCORS: true,
      logging: false,
      width: PAGE_W,
      height: PAGE_H,
      backgroundColor: '#ffffff',
    })
    if (i > 0) pdf.addPage([PAGE_W, PAGE_H], 'portrait')
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, PAGE_W, PAGE_H)
  }

  document.body.removeChild(container)
  const nomLegacy = (profile.nomPrenom || 'IMMORA').replace(/\s+/g, '_')
  pdf.save(`Dossier_Bancaire_IMMORA_${nomLegacy}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// ─── Valeurs par défaut du profil ─────────────────────────────────────────────
const DEFAULT_PROFILE: BankReportProfile = {
  nomPrenom: '',
  dateNaissance: '',
  typeGarantie: 'caution',
  situationFamiliale: 'celibataire',
  nbParts: 1,
  nbEnfants: 0,
  profession: '',
  typeContrat: 'cdi',
  anciennetePoste: 1,
  hasCoEmprunteur: false,
  coemprunteurNom: '',
  coemprunteurProfession: '',
  coemprunteurTypeContrat: 'cdi',
  coemprunteurAnciennete: 1,
  coemprunteurRevenus: 0,
  revenusNetsProFoyer: 0,
  autresRevenusLocatifs: 0,
  loyerActuel: 0,
  autresCreditsMensualites: 0,
  epargneTotale: 0,
  modeAcquisition: 'nom-propre',
  nomSociete: '',
  siren: '',
  dateCreationSociete: '',
  associes: [],
  capitalSocial: 0,
  adresseBien: '',
  descriptionQuartier: '',
  sourceEstimationLoyer: 'Étude de marché locale',
}

// ─── Montage optimisé ─────────────────────────────────────────────────────────
interface MontageOptResult {
  endettGlobal: number
  endettDiff: number
  endettOpt: number
  dureeOpt: number
  mensualiteOpt: number
  apportComplementaire: number | null
  methodeRecommandee: 'globale' | 'differentielle'
  gainsMensuels: number
  points: string[]
}

function calcMontageOpt(
  params: InvestmentParams,
  result: InvestmentResult,
  profile: BankReportProfile,
): MontageOptResult | null {
  if (!profile.revenusNetsProFoyer || profile.revenusNetsProFoyer <= 0) return null

  const revenus     = profile.revenusNetsProFoyer
  const mensualite  = result.mensualiteTotale
  const loyer       = result.loyer
  const autresCredits  = profile.autresCreditsMensualites || 0
  const loyerActuel    = profile.loyerActuel || 0
  const autresLocatifs = profile.autresRevenusLocatifs || 0

  // ── Méthode globale HCSF ──────────────────────────────────────────────────
  const chargesGlobal  = mensualite + autresCredits + loyerActuel
  const revenusGlobal  = revenus + 0.7 * loyer + 0.7 * autresLocatifs
  const endettGlobal   = revenusGlobal > 0 ? (chargesGlobal / revenusGlobal) * 100 : 0

  // ── Méthode différentielle ────────────────────────────────────────────────
  const netInvest    = Math.max(0, mensualite - 0.7 * loyer)
  const chargesDiff  = netInvest + autresCredits + loyerActuel
  const endettDiff   = revenus > 0 ? (chargesDiff / revenus) * 100 : 0

  // ── Optimisation durée (jusqu'à 25 ans) ───────────────────────────────────
  const capital           = result.montantEmprunte
  const r                 = params.taux / 100 / 12
  const assuranceMens     = (params.assuranceTaux / 100) * capital / 12

  let dureeOpt     = params.duree
  let mensualiteOpt = mensualite

  for (let d = params.duree; d <= 25; d++) {
    const n         = d * 12
    const mensCredit = r > 0 ? capital * r / (1 - Math.pow(1 + r, -n)) : capital / n
    const mensTotal  = mensCredit + assuranceMens
    const netTest    = Math.max(0, mensTotal - 0.7 * loyer)
    const endDiff    = revenus > 0 ? ((netTest + autresCredits + loyerActuel) / revenus) * 100 : 0

    dureeOpt      = d
    mensualiteOpt = Math.round(mensTotal)
    if (endDiff <= 35) break
  }

  const netOpt     = Math.max(0, mensualiteOpt - 0.7 * loyer)
  const endettOpt  = revenus > 0 ? ((netOpt + autresCredits + loyerActuel) / revenus) * 100 : 0

  // ── Apport complémentaire si toujours > 35 % ────────────────────────────
  let apportComplementaire: number | null = null
  if (endettOpt > 35) {
    const n25         = 25 * 12
    const targetCharg = Math.max(0, revenus * 0.35 - autresCredits - loyerActuel)
    // targetCharg = max(0, mens25 - 0.7*loyer) → mens25 = targetCharg + 0.7*loyer
    const targetMens  = targetCharg + 0.7 * loyer
    const targetCredit = targetMens - assuranceMens
    const factor      = r > 0 ? r / (1 - Math.pow(1 + r, -n25)) : 1 / n25
    const targetCap   = factor > 0 ? targetCredit / factor : 0
    apportComplementaire = Math.max(0, Math.round(capital - targetCap))
  }

  const methodeRecommandee: 'globale' | 'differentielle' =
    endettDiff <= endettGlobal ? 'differentielle' : 'globale'

  const gainsMensuels = Math.max(0, Math.round(mensualite - mensualiteOpt))

  // ── Argumentaire ──────────────────────────────────────────────────────────
  const points: string[] = []
  if (endettDiff <= 35 && endettGlobal > 35)
    points.push('Exiger la méthode différentielle — elle fait passer le taux sous 35 % (légalement applicable aux investisseurs locatifs)')
  if (dureeOpt > params.duree)
    points.push(`Allonger à ${dureeOpt} ans pour réduire la mensualité de ${fE(gainsMensuels)}/mois`)
  if (loyer >= mensualite * 0.7)
    points.push('Mettre en avant le quasi-autofinancement : le loyer couvre 70 %+ de la mensualité')
  if (endettDiff <= 30)
    points.push(`Taux différentiel de ${endettDiff.toFixed(1)} % — profil solide pour la banque`)
  if ((profile.epargneTotale || 0) >= capital * 0.2)
    points.push('Épargne résiduelle rassurante après apport — gestion patrimoniale solide')
  if (apportComplementaire && apportComplementaire > 0)
    points.push(`Plan B : apport complémentaire de ${fE(apportComplementaire)} pour passer sous le seuil HCSF`)

  return {
    endettGlobal, endettDiff, endettOpt,
    dureeOpt, mensualiteOpt, apportComplementaire,
    methodeRecommandee, gainsMensuels, points,
  }
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function RapportBancairePage() {
  const router = useRouter()
  const { isPro, loading: authLoading } = useAuth()
  const [params, setParams] = useState<InvestmentParams>(DEFAULT_PARAMS)
  const [result, setResult] = useState<InvestmentResult | null>(null)
  const [fiscal, setFiscal] = useState<FiscalResult | null>(null)
  const [score, setScore] = useState<ScoreResult | null>(null)
  const [profile, setProfile] = useState<BankReportProfile>(DEFAULT_PROFILE)
  const [ratios, setRatios] = useState<BankRatios | null>(null)
  const [generating, setGenerating] = useState(false)
  const [hasData, setHasData] = useState(false)
  const [nbAssocies, setNbAssocies] = useState(1)
  const [methode, setMethode] = useState<'globale' | 'differentielle'>('differentielle')
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({})

  const montageOpt = useMemo<MontageOptResult | null>(() => {
    if (!result) return null
    return calcMontageOpt(params, result, profile)
  }, [params, result, profile])

  // Score de bancabilité (0-100) — UI uniquement, pas dans le PDF
  const scoreBancabilite = useMemo(() => {
    if (!ratios || !profile.revenusNetsProFoyer) return null
    // Taux d'endettement : 40 pts
    const endPts = ratios.tauxEndettementApres <= 25 ? 40
      : ratios.tauxEndettementApres <= 30 ? 32
      : ratios.tauxEndettementApres <= 33 ? 22
      : ratios.tauxEndettementApres <= 35 ? 12 : 0
    // Reste à vivre : 25 pts
    const ravPts = ratios.resteAVivre >= ratios.resteAVivreCible * 1.5 ? 25
      : ratios.resteAVivre >= ratios.resteAVivreCible * 1.2 ? 18
      : ratios.resteAVivre >= ratios.resteAVivreCible ? 10 : 0
    // Stabilité professionnelle : 20 pts
    const proPts = (profile.typeContrat === 'cdi' || profile.typeContrat === 'fonctionnaire') && profile.anciennetePoste >= 3 ? 20
      : (profile.typeContrat === 'cdi' || profile.typeContrat === 'fonctionnaire') ? 14
      : profile.typeContrat === 'retraite' ? 18
      : profile.typeContrat === 'independant' ? 7 : 5
    // Épargne résiduelle : 15 pts
    const epar = Math.max(0, (profile.epargneTotale || 0) - params.apport)
    const montantProjet = result?.prixRevient || params.prixAchat
    const eparPts = epar >= montantProjet * 0.15 ? 15
      : epar >= montantProjet * 0.08 ? 10
      : epar >= 5000 ? 5 : 0
    const total = endPts + ravPts + proPts + eparPts
    const label = total >= 80 ? 'Dossier solide' : total >= 60 ? 'Dossier correct' : total >= 40 ? 'À renforcer' : 'Dossier fragile'
    const color = total >= 80 ? 'emerald' : total >= 60 ? 'amber' : 'red'
    return {
      total, label, color,
      details: [
        { label: 'Taux d\'endettement', pts: endPts, max: 40 },
        { label: 'Reste à vivre', pts: ravPts, max: 25 },
        { label: 'Stabilité professionnelle', pts: proPts, max: 20 },
        { label: 'Épargne résiduelle', pts: eparPts, max: 15 },
      ]
    }
  }, [ratios, profile, params, result])

  function toggleDoc(key: string) {
    setCheckedDocs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Charger les params depuis localStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LS_KEY)
      if (raw) {
        const p: InvestmentParams = JSON.parse(raw)
        setParams(p)
        const res = calculateInvestment(p)
        const fis = calculateFiscal({ tmi: p.tmi, prixAchat: p.prixAchat, travaux: p.travaux ?? 0, prixRevient: res.prixRevient, locType: p.locType, lmpEnabled: p.lmpEnabled, sciIS: p.sciIS, sarlFamille: p.sarlFamille, structure: p.structure }, res)
        const sc = calculateScore(res, fis, null)
        setResult(res)
        setFiscal(fis)
        setScore(sc)
        setHasData(true)
        // Pré-remplir la structure depuis les params
        setProfile(prev => ({
          ...prev,
          modeAcquisition: p.structure === 'sci-is' ? 'sci-is' : p.structure === 'sarl-famille' ? 'sarl-famille' : p.structure === 'sci-ir' ? 'sci-ir' : 'nom-propre'
        }))
      }
    } catch {}
  }, [])

  // Recalculer les ratios dès que le profil change
  useEffect(() => {
    if (!result || !fiscal || !score) return
    if (profile.revenusNetsProFoyer > 0) {
      const r = calculateBankRatios(params, result, profile, fiscal, score)
      setRatios(r)
    }
  }, [profile, result, fiscal, score, params])

  function updateProfile(key: keyof BankReportProfile, value: unknown) {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  function updateAssocies(n: number) {
    setNbAssocies(n)
    const list = Array.from({ length: n }, (_, i) => profile.associes?.[i] ?? { nom: '', partsPct: Math.round(100 / n) })
    updateProfile('associes', list)
  }

  async function handleGenerate() {
    if (!result || !fiscal || !score) return
    setGenerating(true)
    try {
      const ratiosFinal = calculateBankRatios(params, result, profile, fiscal, score)
      await generateBankPDF(params, result, fiscal, score, profile, ratiosFinal)
    } finally {
      setGenerating(false)
    }
  }

  const isCompany = profile.modeAcquisition !== 'nom-propre'
  const canGenerate = profile.nomPrenom.trim().length > 1 && profile.revenusNetsProFoyer > 0

  // ── Couleurs ratios ──────────────────────────────────────────────────────
  const endColor = !ratios ? 'text-th-text-2' : ratios.tauxEndettementApres <= 30 ? 'text-emerald-400' : ratios.tauxEndettementApres <= 35 ? 'text-amber-400' : 'text-red-400'
  const coverColor = !ratios ? 'text-th-text-2' : ratios.tauxCouverture >= 110 ? 'text-emerald-400' : ratios.tauxCouverture >= 85 ? 'text-amber-400' : 'text-red-400'
  const ravColor = !ratios ? 'text-th-text-2' : ratios.resteAVivre >= (ratios?.resteAVivreCible ?? 800) ? 'text-emerald-400' : 'text-amber-400'
  const sautColor = !ratios ? 'text-th-text-2' : ratios.sautCharges <= 0 ? 'text-emerald-400' : ratios.sautCharges <= 200 ? 'text-amber-400' : 'text-red-400'

  // ── Guard Pro ──────────────────────────────────────────────────────────────
  if (!authLoading && !isPro) {
    return (
      <AppShell>
        <div className="min-h-screen bg-th-bg text-th-text-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/[0.14] border border-emerald-500/20 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-th-text-1 mb-2">Fonctionnalité Pro</h2>
              <p className="text-th-text-2 text-sm leading-relaxed">
                Le générateur de dossier bancaire est réservé aux membres Pro. Passez à Pro pour créer des dossiers professionnels en quelques minutes.
              </p>
            </div>
            <div className="bg-th-surface border border-th-border rounded-xl p-4 text-left space-y-2">
              {['Ratios bancaires HCSF calculés automatiquement', 'Stress tests intégrés', 'Structures juridiques (SCI, SARL…)', 'PDF 8 pages prêt à envoyer à la banque'].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-th-text-1">
                  <span className="text-emerald-400 text-xs">✓</span> {f}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.push('/#pricing')}
                className="flex-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold py-3 rounded-xl text-sm transition-all">
                Passer à Pro — 14j gratuits
              </button>
              <button onClick={() => router.back()}
                className="px-4 py-3 rounded-xl text-sm text-th-text-2 hover:text-th-text-1 border border-th-border hover:border-th-border-med transition-all">
                Retour
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-th-bg text-th-text-1">
        {/* ── Header ── */}
        <div className="border-b border-th-border bg-th-bg/80 backdrop-blur sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-emerald-500/[0.14] border border-emerald-500/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-th-text-1">Dossier Bancaire</h1>
                <p className="text-[10px] text-th-text-2">Pro · Génération automatique</p>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                canGenerate && !generating
                  ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40'
                  : 'bg-th-surface3 text-th-text-3 cursor-not-allowed border border-transparent'
              }`}
            >
              {generating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Génération en cours…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Générer le PDF
                </>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">

          {/* ── Alerte si pas de données ── */}
          {!hasData && (
            <div className="mb-6 p-4 bg-amber-500/[0.14] border border-amber-500/20 rounded-xl text-amber-300 text-sm">
              <strong>Aucune simulation détectée.</strong> Rendez-vous sur <a href="/analyse" className="underline">la page Analyser</a> pour remplir le calculateur, puis revenez ici pour générer votre dossier.
            </div>
          )}

          <div className="grid grid-cols-[1fr_340px] gap-8">

            {/* ── Colonne gauche : formulaire ── */}
            <div className="space-y-6">

              {/* ── Données du calculateur ── */}
              {hasData && result && (
                <section className="bg-th-surface border border-th-border rounded-2xl p-5">
                  <h2 className="text-xs font-bold text-th-text-2 uppercase tracking-widest mb-4">Données du calculateur</h2>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Prix d\'achat', value: fE(params.prixAchat) },
                      { label: 'Mensualité', value: fE(result.mensualiteTotale) + '/mois' },
                      { label: 'Loyer estimé', value: fE(result.loyer) + '/mois' },
                      { label: 'Cashflow', value: (result.cashflowMensuel >= 0 ? '+' : '') + fE(result.cashflowMensuel) + '/mois' },
                      { label: 'Rend. brut', value: fP(result.rendBrut) },
                      { label: 'Rend. net', value: fP(result.rendNet) },
                      { label: 'Score IMMORA', value: score ? score.global + '/100' : '—' },
                      { label: 'Apport', value: fE(params.apport) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-th-surface rounded-lg p-3">
                        <div className="text-[9px] text-th-text-2 uppercase tracking-widest mb-1">{label}</div>
                        <div className="text-sm font-bold text-th-text-1">{value}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Emprunteur principal ── */}
              <section className="bg-th-surface border border-th-border rounded-2xl overflow-hidden">
                {/* En-tête section */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-th-border">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/[0.14] flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-th-text-1">Emprunteur principal</h2>
                    <p className="text-[10px] text-th-text-2 mt-0.5">Identité, situation pro, revenus & charges</p>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* Identité */}
                  <div>
                    <div className="text-[9px] font-bold text-th-text-2 uppercase tracking-widest mb-3">Identité</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Nom & Prénom *</label>
                        <input value={profile.nomPrenom} onChange={e => updateProfile('nomPrenom', e.target.value)}
                          placeholder="Jean Dupont" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Date de naissance</label>
                        <input type="date" value={profile.dateNaissance ?? ''} onChange={e => updateProfile('dateNaissance', e.target.value)}
                          className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Situation familiale</label>
                        <select value={profile.situationFamiliale} onChange={e => updateProfile('situationFamiliale', e.target.value as BankReportProfile['situationFamiliale'])}
                          className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50">
                          <option value="celibataire">Célibataire</option>
                          <option value="marie">Marié(e)</option>
                          <option value="pacse">Pacsé(e)</option>
                          <option value="divorce">Divorcé(e)</option>
                          <option value="veuf">Veuf / Veuve</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Enfants à charge</label>
                        <input type="number" min={0} placeholder="0" value={profile.nbEnfants || ''} onChange={e => updateProfile('nbEnfants', Number(e.target.value))}
                          className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Parts fiscales</label>
                        <input type="number" min={1} step={0.5} placeholder="1" value={profile.nbParts || ''} onChange={e => updateProfile('nbParts', Number(e.target.value))}
                          className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Garantie du prêt</label>
                        <select value={profile.typeGarantie ?? 'caution'} onChange={e => updateProfile('typeGarantie', e.target.value as BankReportProfile['typeGarantie'])}
                          className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50">
                          <option value="caution">Caution (Crédit Logement)</option>
                          <option value="hypotheque">Hypothèque</option>
                          <option value="ppd">Privilège de prêteur de deniers</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Situation professionnelle */}
                  <div className="pt-4 border-t border-th-border">
                    <div className="text-[9px] font-bold text-th-text-2 uppercase tracking-widest mb-3">Situation professionnelle</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Profession *</label>
                        <input value={profile.profession} onChange={e => updateProfile('profession', e.target.value)}
                          placeholder="Ingénieur, Médecin…" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Type de contrat</label>
                        <select value={profile.typeContrat} onChange={e => updateProfile('typeContrat', e.target.value as BankReportProfile['typeContrat'])}
                          className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50">
                          <option value="cdi">CDI</option>
                          <option value="fonctionnaire">Fonctionnaire</option>
                          <option value="independant">Indépendant / Libéral</option>
                          <option value="cdd">CDD</option>
                          <option value="retraite">Retraité(e)</option>
                          <option value="autre">Autre</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[11px] text-th-text-2 mb-1 block">Ancienneté au poste (années)</label>
                        <input type="number" min={0} placeholder="0" value={profile.anciennetePoste || ''} onChange={e => updateProfile('anciennetePoste', Number(e.target.value))}
                          className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50" />
                      </div>
                    </div>
                  </div>

                  {/* Revenus & charges */}
                  <div className="pt-4 border-t border-th-border">
                    <div className="text-[9px] font-bold text-th-text-2 uppercase tracking-widest mb-3">Revenus & charges mensuels</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Revenus nets mensuels * <span className="text-th-text-3">(salaires, pensions…)</span></label>
                        <div className="relative">
                          <input type="number" min={0} value={profile.revenusNetsProFoyer || ''} onChange={e => updateProfile('revenusNetsProFoyer', Number(e.target.value))}
                            placeholder="3 500" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 pr-8 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                          <span className="absolute right-3 top-2.5 text-xs text-th-text-2">€</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Autres revenus locatifs <span className="text-th-text-3">(autres biens)</span></label>
                        <div className="relative">
                          <input type="number" min={0} value={profile.autresRevenusLocatifs || ''} onChange={e => updateProfile('autresRevenusLocatifs', Number(e.target.value))}
                            placeholder="0" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 pr-8 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                          <span className="absolute right-3 top-2.5 text-xs text-th-text-2">€</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Loyer / mensualité RP actuelle</label>
                        <div className="relative">
                          <input type="number" min={0} value={profile.loyerActuel || ''} onChange={e => updateProfile('loyerActuel', Number(e.target.value))}
                            placeholder="900" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 pr-8 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                          <span className="absolute right-3 top-2.5 text-xs text-th-text-2">€</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Autres crédits en cours <span className="text-th-text-3">(mensualités)</span></label>
                        <div className="relative">
                          <input type="number" min={0} value={profile.autresCreditsMensualites || ''} onChange={e => updateProfile('autresCreditsMensualites', Number(e.target.value))}
                            placeholder="0" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 pr-8 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                          <span className="absolute right-3 top-2.5 text-xs text-th-text-2">€</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[11px] text-th-text-2 mb-1 block">Épargne totale disponible <span className="text-th-text-3">(apport + réserve)</span></label>
                        <div className="relative">
                          <input type="number" min={0} value={profile.epargneTotale || ''} onChange={e => updateProfile('epargneTotale', Number(e.target.value))}
                            placeholder="50 000" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 pr-8 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                          <span className="absolute right-3 top-2.5 text-xs text-th-text-2">€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Bouton co-emprunteur ── */}
              <button
                onClick={() => updateProfile('hasCoEmprunteur', !profile.hasCoEmprunteur)}
                className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border transition-all text-sm font-semibold ${
                  profile.hasCoEmprunteur
                    ? 'bg-emerald-500/[0.14] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/[0.12]'
                    : 'bg-th-surface border-th-border border-dashed text-th-text-2 hover:border-th-border-med hover:text-th-text-1'
                }`}
              >
                {profile.hasCoEmprunteur ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Co-emprunteur ajouté — cliquer pour retirer
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Ajouter un co-emprunteur
                  </>
                )}
              </button>

              {/* ── Co-emprunteur ── */}
              {profile.hasCoEmprunteur && (
                <section className="bg-emerald-500/[0.03] border border-emerald-500/20 rounded-2xl overflow-hidden">
                  {/* En-tête section */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-500/10">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-th-text-1">Co-emprunteur</h2>
                      <p className="text-[10px] text-emerald-400/60 mt-0.5">Ses revenus s'ajoutent au calcul du taux d'endettement</p>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Identité co-emprunteur */}
                    <div>
                      <div className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest mb-3">Identité</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-th-text-2 mb-1 block">Nom & Prénom</label>
                          <input value={profile.coemprunteurNom ?? ''} onChange={e => updateProfile('coemprunteurNom', e.target.value)}
                            placeholder="Marie Dupont" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                        </div>
                        <div>
                          <label className="text-[11px] text-th-text-2 mb-1 block">Profession</label>
                          <input value={profile.coemprunteurProfession ?? ''} onChange={e => updateProfile('coemprunteurProfession', e.target.value)}
                            placeholder="Infirmière, Comptable…" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                        </div>
                      </div>
                    </div>

                    {/* Situation pro co-emprunteur */}
                    <div className="pt-4 border-t border-emerald-500/[0.08]">
                      <div className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest mb-3">Situation professionnelle</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-th-text-2 mb-1 block">Type de contrat</label>
                          <select value={profile.coemprunteurTypeContrat ?? 'cdi'} onChange={e => updateProfile('coemprunteurTypeContrat', e.target.value)}
                            className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50">
                            <option value="cdi">CDI</option>
                            <option value="fonctionnaire">Fonctionnaire</option>
                            <option value="independant">Indépendant / Libéral</option>
                            <option value="cdd">CDD</option>
                            <option value="retraite">Retraité(e)</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-th-text-2 mb-1 block">Ancienneté au poste (années)</label>
                          <input type="number" min={0} placeholder="0" value={profile.coemprunteurAnciennete || ''} onChange={e => updateProfile('coemprunteurAnciennete', Number(e.target.value))}
                            className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50" />
                        </div>
                      </div>
                    </div>

                    {/* Revenus co-emprunteur */}
                    <div className="pt-4 border-t border-emerald-500/[0.08]">
                      <div className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest mb-3">Revenus mensuels</div>
                      <div>
                        <label className="text-[11px] text-th-text-2 mb-1 block">Revenus nets mensuels <span className="text-th-text-3">(salaires, pensions…)</span></label>
                        <div className="relative">
                          <input type="number" min={0} value={profile.coemprunteurRevenus || ''} onChange={e => updateProfile('coemprunteurRevenus', Number(e.target.value))}
                            placeholder="2 800" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 pr-8 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                          <span className="absolute right-3 top-2.5 text-xs text-th-text-2">€</span>
                        </div>
                        {(profile.coemprunteurRevenus ?? 0) > 0 && profile.revenusNetsProFoyer > 0 && (
                          <div className="mt-2 px-3 py-2 bg-emerald-500/[0.12] rounded-lg flex items-center justify-between">
                            <span className="text-[10px] text-th-text-2">Total revenus foyer retenus</span>
                            <span className="text-xs font-bold text-emerald-400">{fE(profile.revenusNetsProFoyer + (profile.coemprunteurRevenus || 0))}/mois</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* ── Structure d'acquisition ── */}
              <section className="bg-th-surface border border-th-border rounded-2xl p-5">
                <h2 className="text-xs font-bold text-th-text-2 uppercase tracking-widest mb-4">Structure d'acquisition</h2>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {(['nom-propre', 'sci-ir', 'sci-is', 'sarl-famille', 'holding-sci'] as const).map(mode => (
                    <button key={mode} onClick={() => updateProfile('modeAcquisition', mode)}
                      className={`px-3 py-2.5 rounded-lg text-[11px] font-semibold border transition-all text-center ${
                        profile.modeAcquisition === mode
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-th-surface border-th-border text-th-text-2 hover:text-th-text-1 hover:border-th-border-med'
                      }`}>
                      {mode === 'nom-propre' ? 'Nom propre' : mode === 'sci-ir' ? 'SCI IR' : mode === 'sci-is' ? 'SCI IS' : mode === 'sarl-famille' ? 'SARL fam.' : 'Holding + SCI'}
                    </button>
                  ))}
                </div>

                {isCompany && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-th-border">
                    <div>
                      <label className="text-[11px] text-th-text-2 mb-1 block">Nom de la société</label>
                      <input value={profile.nomSociete ?? ''} onChange={e => updateProfile('nomSociete', e.target.value)}
                        placeholder="SCI Les Jardins" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[11px] text-th-text-2 mb-1 block">SIREN</label>
                      <input value={profile.siren ?? ''} onChange={e => updateProfile('siren', e.target.value)}
                        placeholder="123 456 789" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[11px] text-th-text-2 mb-1 block">Date de création</label>
                      <input value={profile.dateCreationSociete ?? ''} onChange={e => updateProfile('dateCreationSociete', e.target.value)}
                        placeholder="01/2023" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[11px] text-th-text-2 mb-1 block">Capital social</label>
                      <div className="relative">
                        <input type="number" min={0} value={profile.capitalSocial || ''} onChange={e => updateProfile('capitalSocial', Number(e.target.value))}
                          placeholder="1 000" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 pr-8 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                        <span className="absolute right-3 top-2.5 text-xs text-th-text-2">€</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] text-th-text-2 mb-1.5 block">Nombre d'associés</label>
                      <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4].map(n => (
                          <button key={n} onClick={() => updateAssocies(n)}
                            className={`w-8 h-8 rounded-lg text-sm font-bold border transition-all ${nbAssocies === n ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-th-surface border-th-border text-th-text-2 hover:text-th-text-1'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                      {(profile.associes ?? []).slice(0, nbAssocies).map((a, i) => (
                        <div key={i} className="grid grid-cols-[1fr_100px] gap-2 mt-2">
                          <input value={a.nom} onChange={e => { const arr = [...(profile.associes ?? [])]; arr[i] = { ...arr[i], nom: e.target.value }; updateProfile('associes', arr) }}
                            placeholder={`Associé ${i + 1}`} className="bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                          <div className="relative">
                            <input type="number" min={0} max={100} value={a.partsPct} onChange={e => { const arr = [...(profile.associes ?? [])]; arr[i] = { ...arr[i], partsPct: Number(e.target.value) }; updateProfile('associes', arr) }}
                              className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 pr-7 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50" />
                            <span className="absolute right-3 top-2.5 text-xs text-th-text-2">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* ── Montage optimisé ── */}
              <section className="bg-th-surface border border-th-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xs font-bold text-th-text-2 uppercase tracking-widest">Montage optimisé</h2>
                  <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md font-semibold">Argumentaire banque</span>
                </div>
                <p className="text-[11px] text-th-text-2 mb-4">Présentation optimale de votre dossier — méthode de calcul et durée ajustées.</p>

                {!montageOpt ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <div className="w-10 h-10 rounded-xl bg-th-surface border border-th-border flex items-center justify-center">
                      <svg className="w-5 h-5 text-th-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-xs text-th-text-2 text-center">Renseignez vos revenus mensuels<br/>ci-dessus pour débloquer l'analyse</p>
                  </div>
                ) : (
                  <>
                    {/* ── Étape 1 : méthode de calcul (2 cartes cliquables) ── */}
                    <div className="mb-2 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-bold flex items-center justify-center">1</span>
                      <span className="text-[11px] font-semibold text-th-text-1">Méthode de calcul du taux d'endettement</span>
                    </div>
                    <p className="text-[10.5px] text-th-text-2 mb-3 leading-relaxed">
                      Deux méthodes existent. Choisissez celle qui sera <span className="text-th-text-1 font-semibold">mise en avant dans le PDF</span> — la banque reste libre de sa propre méthode, mais la différentielle est un argument recevable pour un investisseur.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {([
                        { key: 'globale' as const, label: 'Globale', taux: montageOpt.endettGlobal, desc: 'Mensualité entière en charge, 70 % du loyer ajouté aux revenus. Méthode par défaut des banques.' },
                        { key: 'differentielle' as const, label: 'Différentielle', taux: montageOpt.endettDiff, desc: 'Seul l\'effort net (mensualité − 70 % du loyer) compte comme charge. Plus favorable.' },
                      ]).map((c, i) => {
                        const selected = methode === c.key
                        const reco = montageOpt.methodeRecommandee === c.key && montageOpt.endettDiff !== montageOpt.endettGlobal
                        const col = c.taux <= 30 ? 'text-emerald-400' : c.taux <= 35 ? 'text-amber-400' : 'text-red-400'
                        return (
                          <motion.button
                            key={c.key}
                            onClick={() => setMethode(c.key)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -2 }}
                            className={`text-left rounded-xl p-4 border transition-colors ${
                              selected ? 'bg-violet-500/[0.12] border-violet-500/40' : 'bg-th-surface border-th-border hover:border-th-border-med'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] uppercase tracking-widest text-th-text-2">{c.label}</span>
                              {reco && <span className="text-[8px] bg-violet-500/25 text-violet-300 px-1.5 py-0.5 rounded font-bold">RECO</span>}
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-2xl font-black ${col}`}>{c.taux.toFixed(1)}<span className="text-sm font-bold"> %</span></span>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-semibold ${c.taux <= 35 ? 'text-emerald-400 bg-emerald-500/[0.14]' : 'text-red-400 bg-red-500/[0.14]'}`}>{c.taux <= 35 ? 'sous 35 %' : 'hors 35 %'}</span>
                            </div>
                            <p className="text-[9.5px] text-th-text-3 mt-2 leading-relaxed">{c.desc}</p>
                            <div className={`mt-2.5 flex items-center gap-1.5 text-[9px] font-semibold ${selected ? 'text-violet-300' : 'text-th-text-3'}`}>
                              <span className={`w-2.5 h-2.5 rounded-full border ${selected ? 'border-violet-400 bg-violet-400' : 'border-th-border-med'}`} />
                              {selected ? 'Retenue pour le PDF' : 'Choisir'}
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>

                    {/* Gain de la différentielle */}
                    {montageOpt.endettDiff < montageOpt.endettGlobal && (
                      <div className="flex items-center gap-2 text-[10.5px] text-violet-300 bg-violet-500/[0.07] border border-violet-500/15 rounded-lg px-3 py-2 mb-4">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span>La différentielle réduit le taux de <span className="font-bold text-th-text-1">{(montageOpt.endettGlobal - montageOpt.endettDiff).toFixed(1)} pts</span>{montageOpt.endettDiff <= 35 && montageOpt.endettGlobal > 35 ? ' et fait passer le dossier sous le seuil HCSF.' : '.'}</span>
                      </div>
                    )}

                    {/* ── Étape 2 : optimisation de la durée ── */}
                    <div className="mb-2 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-bold flex items-center justify-center">2</span>
                      <span className="text-[11px] font-semibold text-th-text-1">Optimisation de la durée</span>
                    </div>
                    {montageOpt.dureeOpt > params.duree ? (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="rounded-xl p-3.5 bg-th-surface border border-th-border">
                          <div className="text-[9px] uppercase tracking-widest text-th-text-3 mb-2">Durée actuelle</div>
                          <div className="text-lg font-black text-th-text-1">{params.duree} ans</div>
                          <div className="text-[11px] text-th-text-2 mt-1">{fE(result?.mensualiteTotale ?? 0)}/mois</div>
                        </div>
                        <div className="rounded-xl p-3.5 bg-emerald-500/[0.07] border border-emerald-500/25">
                          <div className="text-[9px] uppercase tracking-widest text-emerald-400/80 mb-2">Durée optimisée</div>
                          <div className="text-lg font-black text-emerald-400">{montageOpt.dureeOpt} ans <span className="text-[10px] text-violet-400 font-bold">+{montageOpt.dureeOpt - params.duree}</span></div>
                          <div className="text-[11px] text-th-text-1 mt-1">{fE(montageOpt.mensualiteOpt)}/mois {montageOpt.gainsMensuels > 0 && <span className="text-emerald-400 font-semibold">−{fE(montageOpt.gainsMensuels)}</span>}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[10.5px] text-emerald-400 bg-emerald-500/[0.07] border border-emerald-500/20 rounded-lg px-3 py-2.5 mb-4">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        <span>Durée déjà optimale à <span className="font-bold">{params.duree} ans</span> — mensualité minimale, rien à allonger.</span>
                      </div>
                    )}

                    {/* ── Micro-alerte apport complémentaire ── */}
                    {montageOpt.apportComplementaire && montageOpt.apportComplementaire > 0 && (
                      <div className="flex items-start gap-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-4 py-3 mb-4">
                        <svg className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="text-[11px] text-th-text-2">
                          <span className="font-semibold text-amber-300">Toujours au-dessus de 35 %.</span> Un apport complémentaire de <span className="text-th-text-1 font-semibold">{fE(montageOpt.apportComplementaire)}</span> ferait passer le dossier sous le seuil HCSF à 25 ans.
                        </div>
                      </div>
                    )}

                    {/* ── Lien avec la structure d'acquisition ── */}
                    <div className="flex items-start gap-2.5 text-[10.5px] text-th-text-2 bg-th-surface border border-th-border rounded-lg px-3 py-2.5 mb-4">
                      <svg className="w-3.5 h-3.5 text-th-text-3 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>Structure retenue : <span className="text-th-text-1 font-semibold">{structureLabel(profile.modeAcquisition)}</span>. Son impact fiscal, les garanties et les documents associés figurent dans les pages dédiées du PDF.</span>
                    </div>

                    {/* ── Récap : ce qui sera repris dans le PDF ── */}
                    <div className="rounded-xl bg-violet-500/[0.06] border border-violet-500/15 px-4 py-3 mb-4">
                      <div className="text-[9px] font-bold text-violet-300 uppercase tracking-widest mb-2">Repris dans le dossier PDF</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-[9px] text-th-text-3 mb-0.5">Méthode</div>
                          <div className="text-[11px] font-bold text-th-text-1">{methode === 'differentielle' ? 'Différentielle' : 'Globale'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-th-text-3 mb-0.5">Taux retenu</div>
                          <div className="text-[11px] font-bold text-th-text-1">{(methode === 'differentielle' ? montageOpt.endettDiff : montageOpt.endettGlobal).toFixed(1)} %</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-th-text-3 mb-0.5">Durée</div>
                          <div className="text-[11px] font-bold text-th-text-1">{montageOpt.dureeOpt} ans</div>
                        </div>
                      </div>
                    </div>

                    {/* ── Argumentaire banque ── */}
                    {montageOpt.points.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-th-text-2 uppercase tracking-widest mb-2">Arguments à présenter à la banque</div>
                        <div className="space-y-1.5">
                          {montageOpt.points.map((pt, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + i * 0.05 }}
                              className="flex items-start gap-2.5 bg-th-surface border border-th-border rounded-lg px-3 py-2.5"
                            >
                              <svg className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>
                              <span className="text-[11px] text-th-text-1 leading-relaxed">{pt}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* ── Informations complémentaires ── */}
              <section className="bg-th-surface border border-th-border rounded-2xl p-5">
                <h2 className="text-xs font-bold text-th-text-2 uppercase tracking-widest mb-4">Informations complémentaires</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-th-text-2 mb-1 block">Adresse du bien</label>
                    <input value={profile.adresseBien ?? ''} onChange={e => updateProfile('adresseBien', e.target.value)}
                      placeholder="12 rue des Lilas, Lyon 3e" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <label className="text-[11px] text-th-text-2 mb-1 block">Source estimation loyer</label>
                    <input value={profile.sourceEstimationLoyer ?? ''} onChange={e => updateProfile('sourceEstimationLoyer', e.target.value)}
                      placeholder="Estimation agent immobilier" className="w-full bg-th-input-bg border border-th-border-med rounded-lg px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
              </section>

            </div>

            {/* ── Colonne droite : aperçu des ratios ── */}
            <div className="space-y-4 sticky top-20 self-start">

              {/* Score + statut */}
              {score && (
                <div className={`rounded-2xl p-5 border ${score.global >= 65 ? 'bg-emerald-500/[0.12] border-emerald-500/20' : score.global >= 40 ? 'bg-amber-500/[0.06] border-amber-500/20' : 'bg-red-500/[0.06] border-red-500/20'}`}>
                  <div className="flex items-center gap-3">
                    <div>
                      <div className={`text-4xl font-black ${score.global >= 65 ? 'text-emerald-400' : score.global >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{score.global}</div>
                      <div className="text-[10px] text-th-text-2">/100 score projet</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-th-text-1">{score.label}</div>
                      <div className="text-[10px] text-th-text-2 mt-0.5">{params.ville || 'Bien non défini'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Score de bancabilité */}
              {scoreBancabilite && (
                <div className="bg-th-surface border border-th-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-bold text-th-text-2 uppercase tracking-widest">Score bancabilité</div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      scoreBancabilite.color === 'emerald' ? 'bg-emerald-500/[0.14] text-emerald-400'
                      : scoreBancabilite.color === 'amber' ? 'bg-amber-500/[0.14] text-amber-400'
                      : 'bg-red-500/[0.14] text-red-400'
                    }`}>{scoreBancabilite.label}</span>
                  </div>
                  {/* Jauge */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className={`text-3xl font-black ${
                        scoreBancabilite.color === 'emerald' ? 'text-emerald-400'
                        : scoreBancabilite.color === 'amber' ? 'text-amber-400' : 'text-red-400'
                      }`}>{scoreBancabilite.total}</span>
                      <span className="text-sm text-th-text-2">/100</span>
                    </div>
                    <div className="w-full bg-th-surface3 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${
                        scoreBancabilite.color === 'emerald' ? 'bg-emerald-500'
                        : scoreBancabilite.color === 'amber' ? 'bg-amber-400' : 'bg-red-500'
                      }`} style={{ width: `${scoreBancabilite.total}%` }} />
                    </div>
                  </div>
                  {/* Détail des critères */}
                  <div className="space-y-1.5">
                    {scoreBancabilite.details.map(d => (
                      <div key={d.label} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="text-[10px] text-th-text-2">{d.label}</div>
                          <div className="w-full bg-th-surface3 rounded-full h-1 mt-0.5">
                            <div className={`h-1 rounded-full transition-all ${d.pts === d.max ? 'bg-emerald-500' : d.pts >= d.max * 0.5 ? 'bg-amber-400' : 'bg-red-500'}`}
                              style={{ width: `${(d.pts / d.max) * 100}%` }} />
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold tabular-nums w-8 text-right ${d.pts === d.max ? 'text-emerald-400' : d.pts >= d.max * 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                          {d.pts}/{d.max}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ratios bancaires */}
              <div className="bg-th-surface border border-th-border rounded-2xl p-4">
                <div className="text-[10px] font-bold text-th-text-2 uppercase tracking-widest mb-3">Ratios bancaires</div>
                <div className="space-y-3">
                  {[
                    {
                      label: 'Taux d\'endettement après projet',
                      value: ratios ? fP(ratios.tauxEndettementApres) : '—',
                      sub: `Limite HCSF : 35 %`,
                      color: endColor,
                      barValue: ratios?.tauxEndettementApres ?? 0,
                      barMax: 40,
                      danger: true,
                    },
                    {
                      label: 'Taux de couverture loyer/mensualité',
                      value: ratios ? fP(ratios.tauxCouverture) : '—',
                      sub: `${result ? fE(result.loyer) : '—'} loyer / ${result ? fE(result.mensualiteTotale) : '—'} mensualité`,
                      color: coverColor,
                      barValue: ratios?.tauxCouverture ?? 0,
                      barMax: 150,
                      danger: false,
                    },
                    {
                      label: 'Reste à vivre estimé',
                      value: ratios ? fE(ratios.resteAVivre) + '/mois' : '—',
                      sub: ratios ? `Cible : ${fE(ratios.resteAVivreCible)}/mois` : 'Renseignez vos revenus',
                      color: ravColor,
                      barValue: ratios ? Math.min(ratios.resteAVivre, ratios.resteAVivreCible * 2) : 0,
                      barMax: ratios ? ratios.resteAVivreCible * 2 : 3000,
                      danger: false,
                    },
                    {
                      label: 'Saut de charges net',
                      value: ratios ? (ratios.sautCharges > 0 ? '+' : '') + fE(ratios.sautCharges) + '/mois' : '—',
                      sub: ratios && ratios.sautCharges <= 0 ? 'Situation allégée' : 'Effort mensuel net',
                      color: sautColor,
                      barValue: ratios ? Math.max(0, ratios.sautCharges) : 0,
                      barMax: 500,
                      danger: true,
                    },
                  ].map(({ label, value, sub, color, barValue, barMax, danger }) => (
                    <div key={label} className="space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <div className="text-[11px] text-th-text-2">{label}</div>
                        <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
                      </div>
                      <RatioBar value={barValue} max={barMax} danger={danger} />
                      <div className="text-[10px] text-th-text-3">{sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Points forts/vigilance */}
              {ratios && (
                <div className="bg-th-surface border border-th-border rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-th-text-2 uppercase tracking-widest mb-3">Analyse rapide</div>
                  <div className="space-y-1.5">
                    {ratios.pointsForts.slice(0, 3).map((p, i) => (
                      <div key={i} className="flex gap-2 text-[10.5px] text-th-text-1">
                        <span className="text-emerald-400 shrink-0">✓</span> {p}
                      </div>
                    ))}
                    {ratios.pointsVigilance.slice(0, 2).map((p, i) => (
                      <div key={i} className="flex gap-2 text-[10.5px] text-th-text-2">
                        <span className="text-amber-400 shrink-0">⚠</span> {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bouton génération */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  canGenerate && !generating
                    ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40'
                    : 'bg-th-surface3 text-th-text-3 cursor-not-allowed border border-transparent'
                }`}
              >
                {generating ? 'Génération en cours…' : !canGenerate ? 'Remplissez le formulaire' : '↓ Générer le dossier PDF'}
              </button>
              {!canGenerate && (
                <p className="text-[10px] text-th-text-3 text-center -mt-2">
                  Nom & revenus mensuels requis
                </p>
              )}

              {/* Checklist documents */}
              {(() => {
                const docsList = documentsRequis(profile.modeAcquisition)
                const checked = docsList.filter((_, i) => checkedDocs[`${profile.modeAcquisition}_${i}`]).length
                const pct = docsList.length > 0 ? Math.round((checked / docsList.length) * 100) : 0
                return (
                  <div className="bg-th-surface border border-th-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-bold text-th-text-2 uppercase tracking-widest">Checklist documents</div>
                      <span className={`text-[10px] font-bold ${pct === 100 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-th-text-2'}`}>{checked}/{docsList.length}</span>
                    </div>
                    <div className="w-full bg-th-surface3 rounded-full h-1 mb-3">
                      <div className={`h-1 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-zinc-600'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
                      {docsList.map((doc, i) => {
                        const key = `${profile.modeAcquisition}_${i}`
                        const isChecked = !!checkedDocs[key]
                        return (
                          <button key={key} onClick={() => toggleDoc(key)}
                            className="w-full flex items-start gap-2 py-1.5 text-left hover:bg-th-surface rounded-lg px-1 transition-colors">
                            <div className={`w-3.5 h-3.5 rounded shrink-0 mt-0.5 border transition-all flex items-center justify-center ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                              {isChecked && <svg className="w-2 h-2 text-zinc-950" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M1.5 5l2.5 2.5 4.5-4.5" /></svg>}
                            </div>
                            <span className={`text-[10.5px] leading-relaxed ${isChecked ? 'text-th-text-3 line-through' : 'text-th-text-2'}`}>{doc}</span>
                          </button>
                        )
                      })}
                    </div>
                    {pct === 100 && (
                      <div className="mt-2 text-[10px] text-emerald-400 text-center font-semibold">✓ Dossier complet — prêt à envoyer</div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
