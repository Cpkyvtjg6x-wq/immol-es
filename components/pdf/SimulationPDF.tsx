import React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { InvestmentParams, InvestmentResult, FiscalRegime, ScoreResult } from '@/lib/types'

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  dark:        '#0f172a',
  mid:         '#475569',
  light:       '#94a3b8',
  border:      '#e2e8f0',
  bg:          '#f8fafc',
  white:       '#ffffff',
  green:       '#10b981',
  greenDark:   '#059669',
  greenBg:     '#f0fdf4',
  greenBorder: '#bbf7d0',
  amber:       '#f59e0b',
  amberBg:     '#fffbeb',
  amberBorder: '#fcd34d',
  red:         '#ef4444',
  redBg:       '#fef2f2',
  redBorder:   '#fecaca',
  coverBg:     '#0f172a',
  coverCard:   '#1e293b',
  coverBorder: '#334155',
}

// ─── Shared styles (plain const — no StyleSheet.create — to allow spreading) ─
const PAGE = {
  fontFamily: 'Helvetica',
  fontSize: 9,
  color: T.dark,
  backgroundColor: T.white,
  paddingTop: 36,
  paddingBottom: 48,
  paddingHorizontal: 36,
}

const CARD = {
  backgroundColor: T.bg,
  borderWidth: 1,
  borderColor: T.border,
  borderStyle: 'solid' as const,
  borderRadius: 6,
  padding: 11,
}

const HDR_BAR = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'flex-end' as const,
  borderBottomWidth: 2,
  borderBottomColor: T.dark,
  borderBottomStyle: 'solid' as const,
  paddingBottom: 10,
  marginBottom: 18,
}

const SEC_LABEL = {
  fontSize: 7.5,
  fontFamily: 'Helvetica-Bold' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  color: T.dark,
  borderBottomWidth: 1,
  borderBottomColor: T.border,
  borderBottomStyle: 'solid' as const,
  paddingBottom: 5,
  marginBottom: 8,
}

const FIELD_LABEL = {
  fontSize: 7,
  color: T.light,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.4,
  marginBottom: 1,
}

const FIELD_VAL = {
  fontSize: 9,
  fontFamily: 'Helvetica-Bold' as const,
  color: T.dark,
}

const FOOT_STYLE = {
  position: 'absolute' as const,
  bottom: 18,
  left: 36,
  right: 36,
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  borderTopWidth: 1,
  borderTopColor: T.border,
  borderTopStyle: 'solid' as const,
  paddingTop: 6,
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fE  = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' €'
const fP  = (n: number) => n.toFixed(2) + ' %'
const fP1 = (n: number) => n.toFixed(1) + ' %'

// ─── Helper components ────────────────────────────────────────────────────────

function Foot({ page, total, today }: { page: number; total: number; today: string }) {
  return (
    <View style={FOOT_STYLE} fixed>
      <Text style={{ fontSize: 7, color: T.light }}>
        IMMORA · Rapport confidentiel · Ne constitue pas un conseil financier
      </Text>
      <Text style={{ fontSize: 7, color: T.light }}>{today} · {page} / {total}</Text>
    </View>
  )
}

function Hdr({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={HDR_BAR}>
      <View>
        <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold' as const, color: T.dark, letterSpacing: -0.3 }}>
          IMMO<Text style={{ color: T.green }}>RA</Text>
        </Text>
        {subtitle ? <Text style={{ fontSize: 8, color: T.light, marginTop: 1 }}>{subtitle}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end' as const }}>
        <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' as const, color: T.dark }}>{title}</Text>
      </View>
    </View>
  )
}

function Sec({ label }: { label: string }) {
  return <Text style={SEC_LABEL}>{label}</Text>
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderBottomStyle: 'solid' as const }}>
      <Text style={FIELD_LABEL}>{label}</Text>
      <Text style={FIELD_VAL}>{value}</Text>
    </View>
  )
}

function Kpi({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <View style={{ ...CARD, flex: 1 }}>
      <Text style={{ fontSize: 7, color: T.light, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: 17, fontFamily: 'Helvetica-Bold' as const, color, lineHeight: 1.1 }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 7, color: T.mid, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  )
}

function InfoBox({ color, bg, border, children }: { color: string; bg: string; border: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: bg, borderWidth: 1, borderColor: border, borderStyle: 'solid' as const, borderRadius: 6, padding: 10, marginTop: 6 }}>
      <Text style={{ fontSize: 8.5, color, lineHeight: 1.5 }}>{children}</Text>
    </View>
  )
}

// ─── Score color helper ───────────────────────────────────────────────────────
function scoreColors(score: number) {
  if (score >= 65) return { color: T.greenDark, bg: T.greenBg, border: T.greenBorder }
  if (score >= 40) return { color: T.amber, bg: T.amberBg, border: T.amberBorder }
  return { color: T.red, bg: T.redBg, border: T.redBorder }
}

function cfColor(cf: number) {
  if (cf >= 100) return T.greenDark
  if (cf >= 0)   return T.amber
  return T.red
}

function rendColor(r: number, seuil1: number, seuil2: number) {
  if (r >= seuil1) return T.greenDark
  if (r >= seuil2) return T.amber
  return T.red
}

// ─── Page 1 — KPIs + Bien + Financement + Charges + Revenus ─────────────────

function Page1({
  result, params, score, fiscalResults, today,
}: {
  result: InvestmentResult
  params: InvestmentParams | null
  score: ScoreResult | null
  fiscalResults: FiscalRegime[] | null
  today: string
}) {
  const activeRegimes = fiscalResults?.filter(r => !r.disabled) ?? []
  const bestRegime = activeRegimes.length > 0
    ? activeRegimes.reduce((b, r) => r.rendNetNet > b.rendNetNet ? r : b, activeRegimes[0])
    : null

  const scoreNum  = score?.global ?? 0
  const scoreLbl  = score?.label ?? '—'
  const sc        = scoreColors(scoreNum)

  const prixAchat     = params?.prixAchat ?? 0
  const surface       = params?.surface ?? 0
  const dpe           = params?.dpe ?? '—'
  const typeBien      = params?.typeBien ?? ''
  const fraisNotaire  = params?.fraisNotaire ?? 0
  const travaux       = params?.travaux ?? 0
  const apport        = params?.apport ?? 0
  const taux          = params?.taux ?? 0
  const duree         = params?.duree ?? 20
  const assurTaux     = params?.assuranceTaux ?? 0
  const loanType      = params?.loanType ?? 'amortissable'
  const locType       = params?.locType ?? 'nu'
  const taxeFonciere  = params?.taxeFonciere ?? 0
  const chargesCopro  = params?.chargesCopro ?? 0
  const assurancePno  = params?.assurancePno ?? 0
  const fraisGestionPct = params?.fraisGestionPct ?? 0
  const provisionPct  = params?.provisionPct ?? 0
  const fraisComptable = params?.fraisComptable ?? 0
  const gliPct        = params?.gliPct ?? 0
  const cfe           = params?.cfe ?? 0

  const bienPrixM2 = surface > 0 ? Math.round(prixAchat / surface) : 0
  const cfMensuel  = result.cashflowMensuel

  const rendNetNetNum = bestRegime?.rendNetNet ?? 0
  const cfNetNetNum   = bestRegime?.cfNet ?? 0
  const netNetC       = rendColor(rendNetNetNum, 3, 1.5)

  return (
    <Page size="A4" style={PAGE}>
      <Hdr
        title="Rapport d'analyse immobilière"
        subtitle={[typeBien, surface ? surface + ' m²' : '', dpe !== '—' ? 'DPE ' + dpe : ''].filter(Boolean).join(' · ')}
      />

      {/* Score hero */}
      <View style={{ ...CARD, backgroundColor: sc.bg, borderColor: sc.border, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 18, marginBottom: 14 }}>
        <View style={{ flexShrink: 0 }}>
          <Text style={{ fontSize: 44, fontFamily: 'Helvetica-Bold' as const, color: sc.color, lineHeight: 1 }}>
            {scoreNum}<Text style={{ fontSize: 16, color: T.light }}>/100</Text>
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' as const, color: T.dark, marginTop: 3 }}>{scoreLbl}</Text>
          <Text style={{ fontSize: 7.5, color: T.mid, marginTop: 1 }}>Score de rentabilité</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' as const, gap: 6, marginBottom: 6 }}>
            <Kpi label="Rendement brut"  value={fP1(result.rendBrut)}  color={rendColor(result.rendBrut, 5, 3)} />
            <Kpi label="Rendement net"   value={fP1(result.rendNet)}   color={rendColor(result.rendNet, 3.5, 2)} />
            <Kpi label="Cash-flow/mois"  value={(cfMensuel >= 0 ? '+' : '') + fE(cfMensuel) + '/mois'} color={cfColor(cfMensuel)} />
            <Kpi label="ROI sur apport"  value={fP1(result.roiApport)} color={rendColor(result.roiApport, 10, 5)} />
          </View>
          {bestRegime && (
            <View style={{ backgroundColor: T.white, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, borderLeftColor: netNetC, borderStyle: 'solid' as const, borderRadius: 5, padding: 8, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const }}>
              <View>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' as const, color: T.green, letterSpacing: 0.5, marginBottom: 2 }}>• APRÈS IMPÔTS — {bestRegime.name.toUpperCase()}</Text>
                <Text style={{ fontSize: 8, color: T.mid }}>CF net : <Text style={{ fontFamily: 'Helvetica-Bold' as const, color: T.dark }}>{fE(cfNetNetNum)}/mois</Text></Text>
              </View>
              <Text style={{ fontSize: 17, fontFamily: 'Helvetica-Bold' as const, color: netNetC }}>{fP1(rendNetNetNum)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bien + Financement */}
      <View style={{ flexDirection: 'row' as const, gap: 18, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Sec label="Le bien" />
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 0 }}>
            <View style={{ width: '50%' }}><Field label="Type" value={typeBien || '—'} /></View>
            <View style={{ width: '50%' }}><Field label="DPE" value={dpe + (dpe === 'F' || dpe === 'G' ? ' (passoire)' : '')} /></View>
            <View style={{ width: '50%' }}><Field label="Prix d'achat" value={fE(prixAchat)} /></View>
            <View style={{ width: '50%' }}><Field label="Frais notaire" value={fE(fraisNotaire)} /></View>
            <View style={{ width: '50%' }}><Field label="Travaux" value={fE(travaux)} /></View>
            <View style={{ width: '50%' }}><Field label="Prix de revient" value={fE(result.prixRevient)} /></View>
            <View style={{ width: '50%' }}><Field label="Surface" value={surface ? surface + ' m²' : '—'} /></View>
            <View style={{ width: '50%' }}><Field label="Prix au m²" value={bienPrixM2 ? fE(bienPrixM2) + '/m²' : '—'} /></View>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Sec label="Financement" />
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const }}>
            <View style={{ width: '50%' }}><Field label="Apport" value={fE(apport)} /></View>
            <View style={{ width: '50%' }}><Field label="Emprunté" value={fE(result.montantEmprunte)} /></View>
            <View style={{ width: '50%' }}><Field label="Taux crédit" value={taux.toFixed(2) + ' %'} /></View>
            <View style={{ width: '50%' }}><Field label="Durée" value={duree + ' ans'} /></View>
            <View style={{ width: '50%' }}><Field label="Assurance" value={assurTaux.toFixed(2) + ' %/an'} /></View>
            <View style={{ width: '50%' }}><Field label="Mensualité" value={fE(result.mensualiteTotale) + '/mois'} /></View>
            <View style={{ width: '50%' }}><Field label="Type de prêt" value={loanType === 'in-fine' ? 'In fine' : 'Amortissable'} /></View>
            <View style={{ width: '50%' }}><Field label="Coût total crédit" value={fE(result.coutCredit)} /></View>
            <View style={{ width: '50%' }}><Field label="Loyer seuil" value={fE(result.pointMort) + '/mois'} /></View>
            <View style={{ width: '50%' }}><Field label="TRI" value={result.tri > 0 ? fP(result.tri) : 'N/A'} /></View>
          </View>
        </View>
      </View>

      {/* Charges + Revenus */}
      <View style={{ flexDirection: 'row' as const, gap: 18 }}>
        <View style={{ flex: 1 }}>
          <Sec label="Charges annuelles" />
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const }}>
            <View style={{ width: '50%' }}><Field label="Taxe foncière" value={fE(taxeFonciere)} /></View>
            <View style={{ width: '50%' }}><Field label="Charges copro" value={fE(chargesCopro)} /></View>
            <View style={{ width: '50%' }}><Field label="Assurance PNO" value={fE(assurancePno)} /></View>
            {gliPct > 0 && <View style={{ width: '50%' }}><Field label="GLI" value={fP1(gliPct)} /></View>}
            <View style={{ width: '50%' }}><Field label="Frais gestion" value={fraisGestionPct.toFixed(0) + ' %'} /></View>
            <View style={{ width: '50%' }}><Field label="Provision travaux" value={provisionPct.toFixed(0) + ' %'} /></View>
            {fraisComptable > 0 && <View style={{ width: '50%' }}><Field label="Frais comptable" value={fE(fraisComptable)} /></View>}
            {cfe > 0 && <View style={{ width: '50%' }}><Field label="CFE (LMNP)" value={fE(cfe)} /></View>}
          </View>
          <View style={{ marginTop: 6, backgroundColor: T.amberBg, borderWidth: 1, borderColor: T.amberBorder, borderStyle: 'solid' as const, borderRadius: 5, padding: 7, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const }}>
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold' as const, color: '#92400e' }}>TOTAL CHARGES / AN</Text>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' as const, color: '#b45309' }}>{fE(result.totalCharges)}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Sec label="Revenus locatifs" />
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const }}>
            <View style={{ width: '50%' }}><Field label="Type location" value={locType === 'meuble' ? 'Meublée (LMNP)' : locType === 'coloc' ? 'Colocation' : locType === 'saisonnier' ? 'Saisonnier' : 'Nue'} /></View>
            <View style={{ width: '50%' }}><Field label="Loyer mensuel" value={fE(result.loyer) + '/mois'} /></View>
            <View style={{ width: '50%' }}><Field label="Vacance locative" value={(12 - result.moisLoues) + ' mois/an'} /></View>
            <View style={{ width: '50%' }}><Field label="Mois loués/an" value={result.moisLoues + ' mois'} /></View>
            <View style={{ width: '50%' }}><Field label="Revenus bruts/an" value={fE(result.loyerAnnuelBrut)} /></View>
            <View style={{ width: '50%' }}><Field label="Revenus nets/an" value={fE(result.loyerAnnuelNet)} /></View>
          </View>
          <View style={{ marginTop: 6, backgroundColor: T.greenBg, borderWidth: 1, borderColor: T.greenBorder, borderStyle: 'solid' as const, borderRadius: 5, padding: 7, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const }}>
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold' as const, color: T.greenDark }}>CASH-FLOW NET / MOIS</Text>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' as const, color: cfColor(cfMensuel) }}>{cfMensuel >= 0 ? '+' : ''}{fE(cfMensuel)}/mois</Text>
          </View>
        </View>
      </View>

      <Foot page={1} total={3} today={today} />
    </Page>
  )
}

// ─── Page 2 — Fiscalité + Score détaillé ─────────────────────────────────────

function Page2({
  result, params, score, fiscalResults, today,
}: {
  result: InvestmentResult
  params: InvestmentParams | null
  score: ScoreResult | null
  fiscalResults: FiscalRegime[] | null
  today: string
}) {
  const activeRegimes = fiscalResults?.filter(r => !r.disabled) ?? []
  const bestRegime = activeRegimes.length > 0
    ? activeRegimes.reduce((b, r) => r.rendNetNet > b.rendNetNet ? r : b, activeRegimes[0])
    : null
  const worstRegime = activeRegimes.length > 1
    ? activeRegimes.reduce((w, r) => r.net < w.net ? r : w, activeRegimes[0])
    : null
  const economie = bestRegime && worstRegime && bestRegime.id !== worstRegime.id
    ? bestRegime.net - worstRegime.net : 0

  const tmi = params?.tmi ?? 30
  const scoreNum = score?.global ?? 0
  const sc = scoreColors(scoreNum)
  const subScores = score?.subScores ?? null

  // Score bar helper
  const ScoreBar = ({ label, val }: { label: string; val: number }) => {
    const c = val >= 65 ? T.greenDark : val >= 40 ? T.amber : T.red
    return (
      <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 6 }}>
        <Text style={{ width: 110, fontSize: 8, color: T.mid }}>{label}</Text>
        <View style={{ flex: 1, height: 5, backgroundColor: T.border, borderRadius: 3 }}>
          <View style={{ height: 5, width: `${val}%` as unknown as number, backgroundColor: c, borderRadius: 3 }} />
        </View>
        <Text style={{ width: 30, fontSize: 8, fontFamily: 'Helvetica-Bold' as const, color: T.dark, textAlign: 'right' as const }}>{val}/100</Text>
      </View>
    )
  }

  return (
    <Page size="A4" style={PAGE}>
      <Hdr title="Fiscalité & Score détaillé" />

      <Sec label="Comparatif des régimes fiscaux" />

      {bestRegime && (
        <View style={{ backgroundColor: T.greenBg, borderWidth: 1, borderColor: T.greenBorder, borderStyle: 'solid' as const, borderRadius: 6, padding: 10, marginBottom: 10, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 }}>
          <Text style={{ fontSize: 22, color: T.green }}>•</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' as const, color: T.greenDark }}>Régime optimal : {bestRegime.name}</Text>
            <Text style={{ fontSize: 8, color: T.greenDark, marginTop: 2 }}>
              Revenu net/an : {fE(bestRegime.net)}  ·  CF mensuel : {fE(bestRegime.cfNet)}/mois  ·  Impôt estimé : {fE(bestRegime.impot)}
            </Text>
            <Text style={{ fontSize: 7.5, color: T.light, marginTop: 1 }}>TMI : {tmi} %  ·  Prélèvements sociaux : 17,2 %</Text>
          </View>
          {economie > 0 && (
            <View style={{ backgroundColor: T.white, borderWidth: 1, borderColor: T.greenBorder, borderStyle: 'solid' as const, borderRadius: 6, padding: 8, alignItems: 'center' as const }}>
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' as const, color: T.green, letterSpacing: 0.4 }}>ÉCONOMIE VS PIRE</Text>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold' as const, color: T.green }}>+{fE(economie)}</Text>
              <Text style={{ fontSize: 7, color: T.light }}>par an</Text>
            </View>
          )}
        </View>
      )}

      {/* Tableau fiscal */}
      {activeRegimes.length > 0 && (
        <View style={{ borderWidth: 1, borderColor: T.border, borderStyle: 'solid' as const, borderRadius: 6, overflow: 'hidden' as const, marginBottom: 18 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row' as const, backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.border, borderBottomStyle: 'solid' as const }}>
            {['Régime', 'Rev. imposable', 'Impôt IR', 'Prél. soc.', 'Total fiscal', 'Net/an', 'CF net/mois', 'Rend. N-N'].map((h, i) => (
              <Text key={i} style={{ flex: i === 0 ? 1.6 : 1, fontSize: 6.5, fontFamily: 'Helvetica-Bold' as const, color: T.mid, padding: 6, textTransform: 'uppercase' as const, letterSpacing: 0.3 }}>{h}</Text>
            ))}
          </View>
          {activeRegimes.map((r, i) => {
            const isBest = r.id === bestRegime?.id
            const netC = r.net >= 0 ? T.greenDark : T.red
            const cfC2 = r.cfNet >= 100 ? T.greenDark : r.cfNet >= 0 ? T.amber : T.red
            return (
              <View key={i} style={{ flexDirection: 'row' as const, backgroundColor: isBest ? T.greenBg : (i % 2 === 0 ? T.white : T.bg), borderBottomWidth: i < activeRegimes.length - 1 ? 1 : 0, borderBottomColor: T.border, borderBottomStyle: 'solid' as const, borderLeftWidth: isBest ? 3 : 0, borderLeftColor: T.green, borderLeftStyle: 'solid' as const }}>
                <Text style={{ flex: 1.6, fontSize: 8, fontFamily: isBest ? 'Helvetica-Bold' as const : 'Helvetica' as const, color: isBest ? T.greenDark : T.dark, padding: 6 }}>{r.name}{isBest ? ' •' : ''}</Text>
                <Text style={{ flex: 1, fontSize: 8, color: T.mid, padding: 6 }}>{fE(r.revImposable)}</Text>
                <Text style={{ flex: 1, fontSize: 8, color: T.red, padding: 6 }}>{fE(r.impot)}</Text>
                <Text style={{ flex: 1, fontSize: 8, color: T.mid, padding: 6 }}>{fE(r.ps)}</Text>
                <Text style={{ flex: 1, fontSize: 8, color: T.red, padding: 6 }}>{fE(r.totalFiscal)}</Text>
                <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold' as const, color: netC, padding: 6 }}>{fE(r.net)}</Text>
                <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold' as const, color: cfC2, padding: 6 }}>{fE(r.cfNet)}/mois</Text>
                <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold' as const, color: netC, padding: 6 }}>{fP1(r.rendNetNet)}</Text>
              </View>
            )
          })}
        </View>
      )}

      {/* Score détaillé */}
      {subScores && (
        <View style={{ flexDirection: 'row' as const, gap: 18 }}>
          <View style={{ flex: 1 }}>
            <Sec label="Score détaillé" />
            <View style={{ ...CARD }}>
              <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 12 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' as const, color: T.dark }}>Score global</Text>
                <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold' as const, color: sc.color }}>{scoreNum}/100</Text>
              </View>
              <ScoreBar label="Rentabilité" val={subScores.rentabilite} />
              <ScoreBar label="Cash-flow" val={subScores.cashflow} />
              <ScoreBar label="Fiscalité" val={subScores.fiscalite} />
              <ScoreBar label="Marché" val={subScores.marche} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Sec label="Synthèse du score" />
            <View style={{ ...CARD }}>
              {score?.summary && (
                <Text style={{ fontSize: 8.5, color: T.mid, lineHeight: 1.6, marginBottom: 10 }}>{score.summary}</Text>
              )}
              {score?.details?.slice(0, 5).map((d, i) => (
                <View key={i} style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 5 }}>
                  <Text style={{ fontSize: 8, color: d.good ? T.greenDark : T.red }}>{d.good ? '•' : '×'}</Text>
                  <Text style={{ flex: 1, fontSize: 8, color: T.mid }}>{d.label}</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' as const, color: d.good ? T.greenDark : T.red }}>{d.pts}/{d.max}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Revente */}
      <View style={{ marginTop: 14 }}>
        <Sec label="Estimation à la revente" />
        <View style={{ flexDirection: 'row' as const, gap: 8 }}>
          {[
            { label: 'Prix de revente estimé', value: fE(result.prixRevente) },
            { label: 'Plus-value brute', value: fE(result.plusValueBrute) },
            { label: 'Impôt sur plus-value', value: fE(result.impotPlusValue) },
            { label: 'Patrimoine net revente', value: fE(result.patrimoineNetRevente) },
            { label: 'TRI global', value: result.tri > 0 ? fP(result.tri) : 'N/A' },
            { label: 'Horizon', value: (params?.horizonRevente ?? params?.duree ?? 20) + ' ans' },
          ].map((f, i) => (
            <View key={i} style={{ ...CARD, flex: 1 }}>
              <Text style={{ fontSize: 7, color: T.light, textTransform: 'uppercase' as const, letterSpacing: 0.4, marginBottom: 3 }}>{f.label}</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' as const, color: T.dark }}>{f.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <Foot page={2} total={3} today={today} />
    </Page>
  )
}

// ─── Page 3 — Projection + Amortissement + Analyse ───────────────────────────

function Page3({
  result, params, fiscalResults, today,
}: {
  result: InvestmentResult
  params: InvestmentParams | null
  fiscalResults: FiscalRegime[] | null
  today: string
}) {
  const activeRegimes = fiscalResults?.filter(r => !r.disabled) ?? []
  const bestRegime = activeRegimes.length > 0
    ? activeRegimes.reduce((b, r) => r.rendNetNet > b.rendNetNet ? r : b, activeRegimes[0])
    : null

  const horizonRevente  = params?.horizonRevente ?? params?.duree ?? 20
  const loyer           = result.loyer
  const moisLoues       = result.moisLoues
  const mensualite      = result.mensualiteTotale
  const totalCharges    = result.totalCharges
  const cfMensuel       = result.cashflowMensuel
  const impotAn         = bestRegime ? bestRegime.totalFiscal : 0
  const prixAchat       = params?.prixAchat ?? 0
  const apport          = params?.apport ?? 0

  const totalLoyers     = loyer * moisLoues * horizonRevente
  const totalMensua     = mensualite * 12 * horizonRevente
  const totalChargesT   = totalCharges * horizonRevente
  const totalImpots     = impotAn * horizonRevente
  const totalCF         = cfMensuel * 12 * horizonRevente

  const projRows = [
    { label: 'Loyers perçus',       val: totalLoyers,                    pos: true },
    { label: 'Mensualités crédit',  val: -totalMensua,                   pos: false },
    { label: 'Charges annuelles',   val: -totalChargesT,                 pos: false },
    { label: 'Impôts estimés',      val: -totalImpots,                   pos: false },
    { label: 'Capital constitué',   val: result.montantEmprunte,         pos: true, note: '(patrimoine)' },
    { label: 'Cash-flow cumulé',    val: totalCF,                        pos: totalCF >= 0, bold: true },
  ]
  const maxV = Math.max(...projRows.map(r => Math.abs(r.val)), 1)

  // Amortissement — 1 ligne par an, 6 premières années
  const amortRows = result.tableauAmortissement
    ?.filter(r => r.mois % 12 === 0)
    .slice(0, 6) ?? []

  // Analyse cards
  const rendBrut  = result.rendBrut
  const rendNet   = result.rendNet
  const roiApport = result.roiApport

  const analyses = [
    {
      emoji: '📈', title: 'Rendement brut', value: fP1(rendBrut), color: rendColor(rendBrut, 5, 3),
      detail: `Loyers annuels de ${fE(loyer * 12)} rapportés au prix d'achat de ${fE(prixAchat)}.`,
      suggest: rendBrut >= 5 ? 'Au-dessus de 5 %, bien positionné.' : rendBrut >= 3 ? 'Correct. Visez 5 %+ pour un meilleur équilibre.' : 'En dessous de 3 %. Renégociez le prix ou augmentez le loyer.',
    },
    {
      emoji: '💶', title: 'Cash-flow net', value: (cfMensuel >= 0 ? '+' : '') + fE(cfMensuel) + '/mois', color: cfColor(cfMensuel),
      detail: `Après mensualité (${fE(mensualite)}/mois) et charges (${fE(totalCharges)}/an).`,
      suggest: cfMensuel >= 100 ? 'Cash-flow positif confortable. Projet autofinancé.' : cfMensuel >= 0 ? 'Équilibré. Surveillez la vacance locative.' : `Effort mensuel de ${fE(-cfMensuel)}. Renégociez ou optimisez la fiscalité.`,
    },
    {
      emoji: '🏦', title: 'Rendement net', value: fP1(rendNet), color: rendColor(rendNet, 3.5, 2),
      detail: `Après déduction de toutes les charges (${fE(totalCharges)}/an) sur le prix de revient total.`,
      suggest: rendNet >= 3.5 ? 'Rendement net solide.' : rendNet >= 2 ? 'Correct. Optimisez les charges ou la fiscalité.' : 'Inférieur à 2 %. Réduire les charges ou le prix de revient.',
    },
    {
      emoji: '💼', title: 'ROI sur apport', value: fP1(roiApport), color: rendColor(roiApport, 10, 5),
      detail: `Retour annuel sur ${fE(apport)} d'apport. L'effet de levier du crédit amplifie ce ratio.`,
      suggest: roiApport >= 10 ? 'Excellent levier. L\'effet crédit joue pleinement.' : roiApport >= 5 ? 'Levier correct.' : 'Revoyez la structure de financement.',
    },
  ]

  return (
    <Page size="A4" style={PAGE}>
      <Hdr title={`Projection & Analyse — horizon ${horizonRevente} ans`} />

      <Sec label={`Projection financière sur ${horizonRevente} ans`} />

      {/* Tableau projection */}
      <View style={{ borderWidth: 1, borderColor: T.border, borderStyle: 'solid' as const, borderRadius: 6, overflow: 'hidden' as const, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row' as const, backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.border, borderBottomStyle: 'solid' as const }}>
          <Text style={{ flex: 2, fontSize: 6.5, fontFamily: 'Helvetica-Bold' as const, color: T.mid, padding: 6, textTransform: 'uppercase' as const, letterSpacing: 0.3 }}>Poste</Text>
          <Text style={{ flex: 1, fontSize: 6.5, fontFamily: 'Helvetica-Bold' as const, color: T.mid, padding: 6, textAlign: 'right' as const, textTransform: 'uppercase' as const, letterSpacing: 0.3 }}>Montant total</Text>
          <Text style={{ flex: 1.5, fontSize: 6.5, fontFamily: 'Helvetica-Bold' as const, color: T.mid, padding: 6, textTransform: 'uppercase' as const, letterSpacing: 0.3 }}>Poids relatif</Text>
        </View>
        {projRows.map((r, i) => {
          const w = Math.round(Math.abs(r.val) / maxV * 80)
          const c = r.val >= 0 ? T.greenDark : T.red
          return (
            <View key={i} style={{ flexDirection: 'row' as const, backgroundColor: r.bold ? T.bg : T.white, borderBottomWidth: i < projRows.length - 1 ? 1 : 0, borderBottomColor: '#f1f5f9', borderBottomStyle: 'solid' as const, alignItems: 'center' as const }}>
              <Text style={{ flex: 2, fontSize: 8, fontFamily: r.bold ? 'Helvetica-Bold' as const : 'Helvetica' as const, color: T.dark, padding: 6 }}>
                {r.label}{r.note ? <Text style={{ fontSize: 7, color: T.light }}> {r.note}</Text> : null}
              </Text>
              <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold' as const, color: c, padding: 6, textAlign: 'right' as const }}>
                {r.val >= 0 ? '+' : ''}{fE(r.val)}
              </Text>
              <View style={{ flex: 1.5, padding: 6, flexDirection: 'row' as const, alignItems: 'center' as const }}>
                <View style={{ height: 6, width: `${w}%` as unknown as number, backgroundColor: c, borderRadius: 3 }} />
              </View>
            </View>
          )
        })}
      </View>

      {/* Amortissement + Patrimoine revente */}
      <View style={{ flexDirection: 'row' as const, gap: 18, marginBottom: 14 }}>
        {amortRows.length > 0 && (
          <View style={{ flex: 1 }}>
            <Sec label="Amortissement (6 premières années)" />
            <View style={{ borderWidth: 1, borderColor: T.border, borderStyle: 'solid' as const, borderRadius: 6, overflow: 'hidden' as const }}>
              <View style={{ flexDirection: 'row' as const, backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.border, borderBottomStyle: 'solid' as const }}>
                {['Période', 'Mensualité', 'Capital', 'Intérêts', 'Restant dû'].map((h, i) => (
                  <Text key={i} style={{ flex: 1, fontSize: 6, fontFamily: 'Helvetica-Bold' as const, color: T.mid, padding: 5, textTransform: 'uppercase' as const }}>{h}</Text>
                ))}
              </View>
              {amortRows.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row' as const, backgroundColor: i % 2 === 0 ? T.white : T.bg, borderBottomWidth: i < amortRows.length - 1 ? 1 : 0, borderBottomColor: '#f1f5f9', borderBottomStyle: 'solid' as const }}>
                  <Text style={{ flex: 1, fontSize: 7.5, color: T.mid, padding: 5 }}>An {r.annee}</Text>
                  <Text style={{ flex: 1, fontSize: 7.5, color: T.dark, padding: 5 }}>{fE(r.mensualite)}</Text>
                  <Text style={{ flex: 1, fontSize: 7.5, color: T.greenDark, padding: 5 }}>{fE(r.capitalRembourse)}</Text>
                  <Text style={{ flex: 1, fontSize: 7.5, color: T.red, padding: 5 }}>{fE(r.interetsPaies)}</Text>
                  <Text style={{ flex: 1, fontSize: 7.5, color: T.dark, padding: 5 }}>{fE(r.capitalRestant)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Sec label="Patrimoine net à la revente" />
          <View style={{ ...CARD, alignItems: 'center' as const }}>
            <Text style={{ fontSize: 8, color: T.light, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>Patrimoine net après revente</Text>
            <Text style={{ fontSize: 26, fontFamily: 'Helvetica-Bold' as const, color: T.green, marginBottom: 6 }}>{fE(result.patrimoineNetRevente)}</Text>
            <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 0, width: '100%' }}>
              <View style={{ width: '50%' }}><Field label="Prix revente estimé" value={fE(result.prixRevente)} /></View>
              <View style={{ width: '50%' }}><Field label="Plus-value brute" value={fE(result.plusValueBrute)} /></View>
              <View style={{ width: '50%' }}><Field label="Impôt sur PV" value={fE(result.impotPlusValue)} /></View>
              <View style={{ width: '50%' }}><Field label="TRI" value={result.tri > 0 ? fP(result.tri) : 'N/A'} /></View>
            </View>
          </View>
        </View>
      </View>

      {/* Analyse des indicateurs */}
      <Sec label="Analyse des indicateurs" />
      <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 }}>
        {analyses.map((a, i) => (
          <View key={i} style={{ width: '48.5%', borderWidth: 1, borderColor: T.border, borderStyle: 'solid' as const, borderRadius: 6, padding: 10 }}>
            <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 5 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' as const, color: T.mid }}>{a.emoji} {a.title}</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold' as const, color: a.color }}>{a.value}</Text>
            </View>
            <Text style={{ fontSize: 7.5, color: T.mid, lineHeight: 1.5, marginBottom: 5 }}>{a.detail}</Text>
            <Text style={{ fontSize: 7.5, color: T.greenDark, borderTopWidth: 1, borderTopColor: T.greenBg, borderTopStyle: 'solid' as const, paddingTop: 5, lineHeight: 1.4 }}>{a.suggest}</Text>
          </View>
        ))}
      </View>

      <Foot page={3} total={3} today={today} />
    </Page>
  )
}

// ─── Export props ─────────────────────────────────────────────────────────────

export interface SimulationPDFProps {
  result: InvestmentResult
  params: InvestmentParams | null
  score: ScoreResult | null
  fiscalResults: FiscalRegime[] | null
  today: string
}

// ─── Document ─────────────────────────────────────────────────────────────────

export default function SimulationPDF(props: SimulationPDFProps) {
  return (
    <Document title="Rapport IMMORA" author="IMMORA">
      <Page1 {...props} />
      <Page2 {...props} />
      <Page3 {...props} />
    </Document>
  )
}
