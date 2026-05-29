import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type {
  InvestmentParams, InvestmentResult, FiscalResult, BankReportProfile, BankRatios,
} from '@/lib/types'
import { structureLabel, typeContratLabel, situationFamLabel, documentsRequis } from '@/lib/bank-report'

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
  // Cover dark palette
  coverCard:   '#1e293b',
  coverBorder: '#334155',
  coverText:   '#ffffff',
  coverMid:    '#94a3b8',
  coverDim:    '#475569',
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fE = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' €'
const fP = (n: number, dec = 1) => n.toFixed(dec) + ' %'
const safe = (s: string | number | undefined | null, fb = '—') =>
  s === null || s === undefined || s === '' ? fb : String(s)

// Color helpers
const cfC  = (v: number) => v >= 100 ? T.green : v >= 0 ? T.amber : T.red
const rnC  = (v: number) => v >= 4 ? T.green : v >= 2.5 ? T.amber : T.red
const rbC  = (v: number) => v >= 6 ? T.green : v >= 4 ? T.amber : T.red
const endC = (p: number) => p <= 30 ? T.green : p <= 35 ? T.amber : T.red
const ravC = (v: number, c: number) => v >= c ? T.green : v >= c * 0.8 ? T.amber : T.red

const locTypeLabel: Record<string, string> = {
  nu: 'Location nue', meuble: 'Location meublée',
  coloc: 'Colocation', saisonnier: 'Saisonnier',
}

// ─── Shared style objects (plain objects, not StyleSheet, pour pouvoir les spread) ──
const PAGE_STYLE = {
  fontFamily: 'Helvetica' as const, fontSize: 9,
  color: T.dark, backgroundColor: T.white,
  paddingHorizontal: 40, paddingTop: 30, paddingBottom: 48,
}
const HDR_ROW = {
  flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
  marginBottom: 14, paddingBottom: 10,
  borderBottomWidth: 2, borderBottomColor: T.dark, borderBottomStyle: 'solid' as const,
}
const SEC_STYLE = {
  fontFamily: 'Helvetica-Bold' as const, fontSize: 6.5,
  textTransform: 'uppercase' as const, letterSpacing: 1.5, color: T.dark,
  marginTop: 13, marginBottom: 5, paddingBottom: 3,
  borderBottomWidth: 1, borderBottomColor: T.border, borderBottomStyle: 'solid' as const,
}
const ROW_STYLE = {
  flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'baseline' as const,
  paddingTop: 3.5, paddingBottom: 3.5,
  borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderBottomStyle: 'solid' as const,
}
const ROW_LABEL = { fontSize: 8.5, color: T.mid, flex: 1, paddingRight: 8 }
const ROW_NOTE  = { fontSize: 7.5, color: T.light }
const ROW_VAL   = { fontSize: 9, fontFamily: 'Helvetica-Bold' as const, color: T.dark, textAlign: 'right' as const }
const CARD = {
  backgroundColor: T.bg,
  borderWidth: 1, borderColor: T.border, borderStyle: 'solid' as const,
  borderRadius: 7, padding: 13,
}
const FOOT_STYLE = {
  position: 'absolute' as const, bottom: 16, left: 40, right: 40,
  borderTopWidth: 1, borderTopColor: T.border, borderTopStyle: 'solid' as const,
  paddingTop: 7, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
}
// For TS compatibility only — not actually used
const s = { page: PAGE_STYLE, hdrRow: HDR_ROW, sec: SEC_STYLE, row: ROW_STYLE,
  rowLabel: ROW_LABEL, rowNote: ROW_NOTE, rowVal: ROW_VAL, card: CARD, foot: FOOT_STYLE }

// ─── Micro-components ─────────────────────────────────────────────────────────

function Foot({ page, total }: { page: number; total: number }) {
  return (
    <View style={FOOT_STYLE}>
      <Text style={{ fontSize: 7, color: T.light }}>
        IMMORA · Dossier de financement confidentiel · Ne constitue pas un conseil financier ou juridique
      </Text>
      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: T.mid }}>{page} / {total}</Text>
    </View>
  )
}

function Hdr({ subtitle, today }: { subtitle: string; today: string }) {
  return (
    <View style={HDR_ROW}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: T.dark }}>
          IMMO<Text style={{ color: T.green }}>RA</Text>
        </Text>
        <View style={{ width: 1, height: 12, backgroundColor: T.border }} />
        <Text style={{ fontSize: 9, color: T.mid }}>{subtitle}</Text>
      </View>
      <Text style={{ fontSize: 7.5, color: T.light }}>Confidentiel · {today}</Text>
    </View>
  )
}

function Sec({ title }: { title: string }) {
  return <Text style={SEC_STYLE}>{title}</Text>
}

function Row({ label, value, note, color }: { label: string; value: string; note?: string; color?: string }) {
  return (
    <View style={ROW_STYLE}>
      <Text style={ROW_LABEL}>
        {label}
        {note ? <Text style={ROW_NOTE}>{'  '}{note}</Text> : null}
      </Text>
      <Text style={{ ...ROW_VAL, ...(color ? { color } : {}) }}>{value}</Text>
    </View>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <View style={{ ...CARD, borderLeftWidth: 3, borderLeftColor: accent, borderLeftStyle: 'solid' as const }}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' as const, textTransform: 'uppercase' as const, letterSpacing: 1, color: T.light, marginBottom: 6 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold' as const, color: T.dark, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ fontSize: 8, color: T.light, marginTop: 4 }}>{sub}</Text>
    </View>
  )
}

function Bdg({ text, good }: { text: string; good: boolean }) {
  return (
    <View style={{
      backgroundColor: good ? T.greenBg : T.redBg,
      borderWidth: 1, borderColor: good ? T.greenBorder : T.redBorder, borderStyle: 'solid' as const,
      borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3,
      alignSelf: 'flex-start' as const, marginTop: 6,
    }}>
      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' as const, color: good ? T.greenDark : T.red }}>
        {good ? '• ' : '• '}{text}
      </Text>
    </View>
  )
}

function InfoBox({ text }: { text: string }) {
  return (
    <View style={{
      backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderStyle: 'solid' as const,
      borderLeftWidth: 3, borderLeftColor: T.dark, borderLeftStyle: 'solid' as const,
      borderRadius: 6, padding: 12, marginTop: 8,
    }}>
      <Text style={{ fontSize: 9, color: '#1e293b', lineHeight: 1.65 }}>{text}</Text>
    </View>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface BankReportPDFProps {
  params:     InvestmentParams
  result:     InvestmentResult
  fiscal:     FiscalResult
  profile:    BankReportProfile
  ratios:     BankRatios
  today:      string
  totalPages: number
}

// ════════════════════════════════════════════════════════════════════════════════
// COVER PAGE
// ════════════════════════════════════════════════════════════════════════════════
function CoverPage({ params, result, profile, ratios, today, totalPages }: BankReportPDFProps) {
  const cfColor = cfC(result.cashflowMensuel)
  const subtitle = [
    params.surface ? `${params.surface} m²` : '',
    params.typeBien || '',
    params.dpe ? `DPE ${params.dpe}` : '',
    params.etat === 'neuf' ? 'Neuf' : 'Ancien',
  ].filter(Boolean).join(' · ')

  const revenusCoEmp = profile.hasCoEmprunteur && profile.coemprunteurRevenus ? profile.coemprunteurRevenus : 0
  const revenusTotaux = profile.revenusNetsProFoyer + revenusCoEmp

  return (
    <Page size="A4" style={{ fontFamily: 'Helvetica', fontSize: 9, padding: 0, backgroundColor: T.dark }}>
      {/* ── Dark hero ── */}
      <View style={{ backgroundColor: T.dark, paddingHorizontal: 40, paddingTop: 36, paddingBottom: 28 }}>
        {/* Logo + header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: T.coverText }}>
            IMMO<Text style={{ color: T.green }}>RA</Text>
          </Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: T.coverMid }}>Dossier de financement immobilier locatif</Text>
            <Text style={{ fontSize: 7.5, color: T.coverDim, marginTop: 3 }}>Confidentiel · Généré le {today}</Text>
          </View>
        </View>

        {/* Eyebrow + city */}
        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: T.green, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 9 }}>
          Demande de financement
        </Text>
        <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold', color: T.coverText, letterSpacing: -1, marginBottom: 7 }}>
          {safe(params.ville, 'Investissement locatif')}
        </Text>
        <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 26 }}>{subtitle}</Text>

        {/* 3 KPI cards */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            {
              label: 'Montant emprunté',
              value: fE(result.montantEmprunte),
              sub: `${params.duree} ans · ${fP(params.taux)} · assur. ${fP(params.assuranceTaux)}`,
              color: T.coverText,
            },
            {
              label: 'Mensualité totale',
              value: fE(result.mensualiteTotale) + '/mois',
              sub: 'Capital + intérêts + assurance',
              color: T.coverText,
            },
            {
              label: 'Cashflow mensuel',
              value: (result.cashflowMensuel >= 0 ? '+' : '') + fE(result.cashflowMensuel) + '/mois',
              sub: `Loyer ${fE(result.loyer)} · Rend. brut ${fP(result.rendBrut)}`,
              color: cfColor,
            },
          ].map((k, i) => (
            <View key={i} style={{
              flex: 1, backgroundColor: T.coverCard, borderRadius: 7, padding: 13,
              borderWidth: 1, borderColor: T.coverBorder, borderStyle: 'solid',
            }}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, color: T.coverMid, marginBottom: 7 }}>
                {k.label}
              </Text>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: k.color }}>{k.value}</Text>
              <Text style={{ fontSize: 7.5, color: T.coverDim, marginTop: 5 }}>{k.sub}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── White bottom section ── */}
      <View style={{ flex: 1, backgroundColor: T.white, paddingHorizontal: 40, paddingTop: 22, paddingBottom: 50 }}>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 18 }}>
          {/* Borrower */}
          <View style={[s.card, { flex: 1 }]}>
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.8, color: T.light, marginBottom: 8 }}>Emprunteur</Text>
            <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: T.dark, marginBottom: 5 }}>{safe(profile.nomPrenom, 'Non renseigné')}</Text>
            <Text style={{ fontSize: 9.5, color: T.mid, marginBottom: 2 }}>
              {typeContratLabel(profile.typeContrat)} · {profile.anciennetePoste} an{profile.anciennetePoste > 1 ? 's' : ''} d'ancienneté
            </Text>
            <Text style={{ fontSize: 9.5, color: T.mid, marginBottom: 2 }}>
              {situationFamLabel(profile.situationFamiliale)} · {profile.nbParts} part{profile.nbParts > 1 ? 's' : ''}
            </Text>
            <Text style={{ fontSize: 9, color: '#64748b' }}>{safe(profile.profession)}</Text>
            {profile.hasCoEmprunteur && profile.coemprunteurNom ? (
              <View style={{ marginTop: 8, backgroundColor: T.greenBg, borderRadius: 5, borderWidth: 1, borderColor: T.greenBorder, borderStyle: 'solid', padding: 7 }}>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: T.greenDark, marginBottom: 2 }}>+ {profile.coemprunteurNom}</Text>
                <Text style={{ fontSize: 8, color: T.mid }}>{safe(profile.coemprunteurProfession)} · {typeContratLabel(profile.coemprunteurTypeContrat || 'cdi')}</Text>
              </View>
            ) : null}
          </View>

          {/* Structure */}
          <View style={[s.card, { flex: 1 }]}>
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.8, color: T.light, marginBottom: 8 }}>Structure d'acquisition</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: T.dark, marginBottom: 8 }}>{structureLabel(profile.modeAcquisition)}</Text>
            {profile.nomSociete ? (
              <Text style={{ fontSize: 9.5, color: T.mid, marginBottom: 6 }}>
                {profile.nomSociete}{profile.siren ? ' · SIREN ' + profile.siren : ''}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <View style={{ width: 6, height: 6, backgroundColor: T.green, borderRadius: 3 }} />
              <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: T.green }}>
                {fE(result.montantEmprunte)} · {params.duree} ans · {fP(params.taux)}
              </Text>
            </View>
            <Row label="Apport personnel" value={fE(params.apport)} />
            <Row label="Revenus nets mensuels" value={fE(revenusTotaux)} />
          </View>
        </View>

        {/* Bottom stat bar */}
        <View style={{ backgroundColor: T.dark, borderRadius: 8, padding: 14, flexDirection: 'row' }}>
          {[
            { label: 'Prix de revient', value: fE(result.prixRevient) },
            { label: 'Apport', value: fE(params.apport) },
            { label: 'Rend. net', value: fP(result.rendNet), color: T.green },
            { label: `TRI ${params.horizonRevente} ans`, value: fP(result.tri), color: T.green },
          ].map((item, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: '#1e293b', borderLeftStyle: 'solid' }}>
              <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.8, color: '#475569', marginBottom: 5 }}>{item.label}</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: item.color || T.coverText }}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <Foot page={1} total={totalPages} />
    </Page>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 1 — PROFIL EMPRUNTEUR
// ════════════════════════════════════════════════════════════════════════════════
function ProfilePage({ params, result, profile, ratios, today, totalPages }: BankReportPDFProps) {
  const revenusCoEmp = profile.hasCoEmprunteur && profile.coemprunteurRevenus ? profile.coemprunteurRevenus : 0
  const revenusTotaux = profile.revenusNetsProFoyer + revenusCoEmp

  return (
    <Page size="A4" style={s.page}>
      <Hdr subtitle="Profil de l'emprunteur" today={today} />
      <View style={{ flexDirection: 'row', gap: 22 }}>
        {/* Left col */}
        <View style={{ flex: 1 }}>
          <Sec title="Situation personnelle" />
          <Row label="Nom / Prénom" value={safe(profile.nomPrenom)} />
          <Row label="Situation familiale" value={situationFamLabel(profile.situationFamiliale)} />
          <Row label="Enfants à charge" value={String(profile.nbEnfants)} />
          <Row label="Parts fiscales" value={String(profile.nbParts)} />

          <Sec title="Situation professionnelle" />
          <Row label="Profession" value={safe(profile.profession)} />
          <Row label="Type de contrat" value={typeContratLabel(profile.typeContrat)} />
          <Row label="Ancienneté" value={`${profile.anciennetePoste} an${profile.anciennetePoste > 1 ? 's' : ''}`} />

          {profile.hasCoEmprunteur && (
            <>
              <Sec title="Co-emprunteur" />
              <Row label="Nom / Prénom" value={safe(profile.coemprunteurNom)} />
              <Row label="Profession" value={safe(profile.coemprunteurProfession)} />
              <Row label="Contrat" value={typeContratLabel(profile.coemprunteurTypeContrat || 'cdi')} />
              <Row label="Ancienneté" value={`${profile.coemprunteurAnciennete ?? 0} an${(profile.coemprunteurAnciennete ?? 0) > 1 ? 's' : ''}`} />
              <Row label="Revenus mensuels nets" value={fE(revenusCoEmp)} color={T.green} />
            </>
          )}

          <Sec title="Patrimoine" />
          <Row label="Épargne totale disponible" value={fE(profile.epargneTotale)} />
          <Row label="Apport dans ce projet" value={fE(params.apport)} />
          <Row label="Épargne résiduelle" value={fE(Math.max(0, profile.epargneTotale - params.apport))} note="après apport" />
        </View>

        {/* Right col */}
        <View style={{ flex: 1 }}>
          <Sec title="Revenus mensuels nets du foyer" />
          <Row label="Revenus emprunteur principal" value={fE(profile.revenusNetsProFoyer)} />
          {revenusCoEmp > 0 && <Row label="Revenus co-emprunteur" value={fE(revenusCoEmp)} />}
          {revenusCoEmp > 0 && <Row label="Total revenus nets du foyer" value={fE(revenusTotaux)} color={T.green} />}
          {profile.autresRevenusLocatifs > 0 && <Row label="Autres revenus locatifs" value={fE(profile.autresRevenusLocatifs)} />}
          <Row label="Intégration bancaire des loyers" value={fE(ratios.loyerIntegreBanque)} note="70 % — méthode HCSF" />
          <Row label="Base revenus retenue par la banque" value={fE(revenusTotaux + ratios.loyerIntegreBanque)} color={T.green} />

          <Sec title="Charges actuelles" />
          <Row label="Loyer / mensualité résidence princ." value={fE(profile.loyerActuel)} />
          <Row label="Autres crédits en cours" value={fE(profile.autresCreditsMensualites)} />
          <Row label="Total charges actuelles" value={fE(profile.loyerActuel + profile.autresCreditsMensualites)} color={T.red} />

          <Sec title="Charges après projet" />
          <Row label="Mensualité nouveau crédit" value={fE(result.mensualiteTotale)} note="capital + intérêts + assurance" />
          <Row label="Autres crédits conservés" value={fE(profile.autresCreditsMensualites)} />
          <Row label="Total charges après projet" value={fE(profile.autresCreditsMensualites + result.mensualiteTotale)} color={T.red} />

          {/* Taux endettement */}
          <View style={{ marginTop: 12, backgroundColor: T.bg, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: T.border, borderStyle: 'solid' }}>
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.8, color: T.light, marginBottom: 6 }}>
              Taux d'endettement après projet
            </Text>
            <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: endC(ratios.tauxEndettementApres), letterSpacing: -0.5 }}>
              {fP(ratios.tauxEndettementApres)}
            </Text>
            <Text style={{ fontSize: 8, color: T.mid, marginTop: 4 }}>
              Avant projet : {fP(ratios.tauxEndettementAvant)} · Limite HCSF : 35 %
            </Text>
          </View>
        </View>
      </View>
      <Foot page={2} total={totalPages} />
    </Page>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 2 — LE PROJET IMMOBILIER
// ════════════════════════════════════════════════════════════════════════════════
function ProjectPage({ params, result, profile, today, totalPages }: BankReportPDFProps) {
  const prixM2 = params.surface > 0 ? Math.round(params.prixAchat / params.surface) : 0
  const dpeWarn = params.dpe === 'F' || params.dpe === 'G' ? ' — Passoire thermique' : params.dpe === 'A' || params.dpe === 'B' ? ' — Excellent' : ''

  return (
    <Page size="A4" style={s.page}>
      <Hdr subtitle="Le projet immobilier" today={today} />
      <View style={{ flexDirection: 'row', gap: 22 }}>
        <View style={{ flex: 1 }}>
          <Sec title="Caractéristiques du bien" />
          <Row label="Adresse / Ville" value={safe(profile.adresseBien || params.ville)} />
          <Row label="Type de bien" value={safe(params.typeBien)} />
          <Row label="Surface" value={params.surface ? `${params.surface} m²` : '—'} />
          <Row label="Prix au m²" value={prixM2 ? fE(prixM2) + '/m²' : '—'} />
          <Row label="DPE" value={safe(params.dpe) + dpeWarn} color={params.dpe === 'F' || params.dpe === 'G' ? T.red : T.dark} />
          <Row label="État du bien" value={params.etat === 'neuf' ? 'Neuf / VEFA' : 'Ancien'} />
          {params.travaux > 0 && <Row label="Travaux prévus" value={fE(params.travaux)} />}

          <Sec title="Mode d'exploitation locative" />
          <Row label="Type de location" value={locTypeLabel[params.locType] ?? params.locType} />
          <Row label="Loyer mensuel estimé" value={fE(result.loyer)} />
          <Row label="Source estimation loyer" value={safe(profile.sourceEstimationLoyer, 'Étude de marché')} />
          <Row label="Vacance locative retenue" value={`${params.vacance} mois/an`} />
          <Row label="Mois loués / an" value={`${result.moisLoues} mois`} />
          <Row label="Revenu locatif annuel" value={fE(result.revAnnuel)} color={T.green} />
        </View>

        <View style={{ flex: 1 }}>
          <Sec title="Plan de financement" />
          <Row label="Prix d'achat" value={fE(params.prixAchat)} />
          <Row label="Frais de notaire" value={fE(params.fraisNotaire)} />
          {params.travaux > 0 && <Row label="Travaux" value={fE(params.travaux)} />}
          <Row label="Prix de revient total" value={fE(result.prixRevient)} color={T.green} />
          <View style={{ height: 6 }} />
          <Row label="Apport personnel" value={fE(params.apport)} />
          <Row label="Montant emprunté" value={fE(result.montantEmprunte)} />
          <Row label="Taux du crédit" value={`${fP(params.taux)} + ${fP(params.assuranceTaux)} assurance`} />
          <Row label="Durée" value={`${params.duree} ans`} />
          <Row label="Type de prêt" value={params.loanType === 'in-fine' ? 'In fine' : 'Amortissable'} />
          <Row label="Mensualité totale" value={fE(result.mensualiteTotale)} color={T.red} />
          <Row label="Coût total du crédit" value={fE(result.coutCredit)} color={T.red} />

          <Sec title="Charges annuelles du bien" />
          <Row label="Taxe foncière" value={fE(params.taxeFonciere)} />
          <Row label="Charges de copropriété" value={fE(params.chargesCopro)} />
          <Row label="Assurance PNO" value={fE(params.assurancePno)} />
          {params.fraisGestionPct > 0 && <Row label="Frais de gestion locative" value={`${fP(params.fraisGestionPct)} du loyer`} />}
          <Row label="Total charges annuelles" value={fE(result.totalCharges)} color={T.red} />
        </View>
      </View>
      <Foot page={3} total={totalPages} />
    </Page>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 3 — INDICATEURS BANCAIRES
// ════════════════════════════════════════════════════════════════════════════════
function BankPage({ params, result, profile, ratios, today, totalPages }: BankReportPDFProps) {
  const revenusCoEmp = profile.hasCoEmprunteur && profile.coemprunteurRevenus ? profile.coemprunteurRevenus : 0
  const revenusTotaux = profile.revenusNetsProFoyer + revenusCoEmp

  return (
    <Page size="A4" style={s.page}>
      <Hdr subtitle="Indicateurs bancaires clés" today={today} />

      {/* 4 KPIs in 2×2 grid */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <Kpi
          label="Taux d'endettement après projet"
          value={fP(ratios.tauxEndettementApres)}
          sub={`Avant : ${fP(ratios.tauxEndettementAvant)} · Limite HCSF : 35 %`}
          accent={endC(ratios.tauxEndettementApres)}
        />
        <Kpi
          label="Couverture loyer / mensualité"
          value={fP(ratios.tauxCouverture)}
          sub={`Loyer ${fE(result.loyer)} / Mensualité ${fE(result.mensualiteTotale)}`}
          accent={ratios.tauxCouverture >= 110 ? T.green : ratios.tauxCouverture >= 85 ? T.amber : T.red}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <Kpi
          label="Reste à vivre mensuel"
          value={fE(ratios.resteAVivre)}
          sub={`Objectif : min ${fE(ratios.resteAVivreCible)} pour ce profil`}
          accent={ravC(ratios.resteAVivre, ratios.resteAVivreCible)}
        />
        <Kpi
          label="Saut de charges mensuel"
          value={(ratios.sautCharges > 0 ? '+' : '') + fE(ratios.sautCharges)}
          sub={ratios.sautCharges <= 0 ? 'Situation allégée après projet' : 'Effort net mensuel'}
          accent={ratios.sautCharges <= 0 ? T.green : ratios.sautCharges <= 200 ? T.amber : T.red}
        />
      </View>

      {/* Method */}
      <Sec title="Norme bancaire HCSF 2026" />
      <View style={[s.card, { marginBottom: 12, padding: 11 }]}>
        <Text style={{ fontSize: 9, color: T.mid, lineHeight: 1.6 }}>
          {'Taux d\'endettement calculé selon la règle HCSF : '}
          <Text style={{ fontFamily: 'Helvetica-Bold', color: T.dark }}>toutes charges / revenus de référence max. 35 %</Text>
          {`, assurance incluse. Les loyers futurs sont intégrés à `}
          <Text style={{ fontFamily: 'Helvetica-Bold', color: T.dark }}>70 %</Text>
          {` dans les revenus (méthode prudentielle). Loyer retenu : `}
          <Text style={{ fontFamily: 'Helvetica-Bold', color: T.dark }}>{fE(ratios.loyerIntegreBanque)}/mois</Text>
          {` (= ${fE(result.loyer)} × 70 %).`}
        </Text>
      </View>

      {/* Stress tests */}
      <Sec title="Analyse des stress tests" />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        {/* +1% taux */}
        <View style={[s.card, { flex: 1, padding: 11 }]}>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: T.mid, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Scénario +1 % de taux
          </Text>
          <Row label="Nouvelle mensualité" value={fE(ratios.stressTaux1Pct.nouvelleMensualite)} />
          <Row label="Surcoût mensuel" value={'+' + fE(ratios.stressTaux1Pct.deltaVsMensualiteBase)} color={T.red} />
          <Row label="Cashflow résultant" value={(ratios.stressTaux1Pct.nouveauCashflow >= 0 ? '+' : '') + fE(ratios.stressTaux1Pct.nouveauCashflow)} color={cfC(ratios.stressTaux1Pct.nouveauCashflow)} />
          <Row label="Taux d'endettement" value={fP(ratios.stressTaux1Pct.tauxEndettement)} color={endC(ratios.stressTaux1Pct.tauxEndettement)} />
          <Bdg text={ratios.stressTaux1Pct.tauxEndettement <= 35 ? 'Projet résistant' : 'Attention'} good={ratios.stressTaux1Pct.tauxEndettement <= 35} />
        </View>
        {/* -10% loyer */}
        <View style={[s.card, { flex: 1, padding: 11 }]}>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: T.mid, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Scénario −10 % de loyer
          </Text>
          <Row label="Loyer réduit" value={fE(ratios.stressLoyer10Pct.nouveauLoyer)} />
          <Row label="Nouveau cashflow" value={(ratios.stressLoyer10Pct.nouveauCashflow >= 0 ? '+' : '') + fE(ratios.stressLoyer10Pct.nouveauCashflow)} color={cfC(ratios.stressLoyer10Pct.nouveauCashflow)} />
          <Row label="Taux de couverture" value={fP(ratios.stressLoyer10Pct.tauxCouverture)} />
          <Bdg text={ratios.stressLoyer10Pct.tauxCouverture >= 80 ? 'Couverture maintenue' : 'Vigilance'} good={ratios.stressLoyer10Pct.tauxCouverture >= 80} />
        </View>
        {/* +2 mois vacance */}
        <View style={[s.card, { flex: 1, padding: 11 }]}>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: T.mid, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Scénario +2 mois vacance
          </Text>
          <Row label="Perte de loyers/an" value={fE(ratios.stressVacance2Mois.perteLoyersAnnuelle)} color={T.red} />
          <Row label="CF mensuel moyen" value={(ratios.stressVacance2Mois.nouveauCashflowMensuelMoyen >= 0 ? '+' : '') + fE(ratios.stressVacance2Mois.nouveauCashflowMensuelMoyen)} color={cfC(ratios.stressVacance2Mois.nouveauCashflowMensuelMoyen)} />
          <Bdg text={ratios.stressVacance2Mois.nouveauCashflowMensuelMoyen >= -300 ? 'Risque maîtrisé' : 'Vigilance'} good={ratios.stressVacance2Mois.nouveauCashflowMensuelMoyen >= -300} />
        </View>
      </View>

      {/* Recommandation */}
      <Sec title="Synthèse de l'analyste" />
      <InfoBox text={ratios.recommandationBanquier} />
      <Foot page={4} total={totalPages} />
    </Page>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 4 — ANALYSE DE RENTABILITÉ
// ════════════════════════════════════════════════════════════════════════════════
function RentabilityPage({ params, result, today, totalPages }: BankReportPDFProps) {
  const cfColor = cfC(result.cashflowMensuel)
  const mult = (result.patrimoineNetRevente / Math.max(1, params.apport)).toFixed(1)

  return (
    <Page size="A4" style={s.page}>
      <Hdr subtitle="Analyse de rentabilité" today={today} />

      {/* 4 KPIs in a row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <Kpi label="Rendement brut" value={fP(result.rendBrut)} sub="Loyers / prix de revient" accent={rbC(result.rendBrut)} />
        <Kpi label="Rendement net" value={fP(result.rendNet)} sub="Après charges, avant impôts" accent={rnC(result.rendNet)} />
        <Kpi label="Cashflow mensuel" value={(result.cashflowMensuel >= 0 ? '+' : '') + fE(result.cashflowMensuel)} sub="Loyers − mensualité − charges" accent={cfColor} />
        <Kpi label="ROI sur apport" value={fP(result.roiApport)} sub="Cashflow annuel / apport" accent={result.roiApport >= 7 ? T.green : result.roiApport >= 3 ? T.amber : T.red} />
      </View>

      <View style={{ flexDirection: 'row', gap: 22 }}>
        <View style={{ flex: 1 }}>
          <Sec title="Décomposition du cashflow mensuel" />
          <Row label="Loyer mensuel encaissé" value={'+' + fE(result.loyer)} color={T.green} />
          <Row label="Mensualité crédit + assurance" value={'−' + fE(result.mensualiteTotale)} color={T.red} />
          <Row label="Charges mensualisées" value={'−' + fE(result.totalCharges / 12)} color={T.red} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 7, paddingBottom: 7, borderTopWidth: 1.5, borderTopColor: T.dark, borderTopStyle: 'solid', marginTop: 3 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: T.dark }}>Cashflow net mensuel</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: cfColor }}>
              {(result.cashflowMensuel >= 0 ? '+' : '') + fE(result.cashflowMensuel)}
            </Text>
          </View>
          <Row label="Effort d'épargne si CF négatif" value={result.effortEpargne > 0 ? fE(result.effortEpargne) + '/mois' : 'Aucun'} />

          <Sec title="Comparatif avec le marché" />
          <Row label="Rendement brut du projet" value={fP(result.rendBrut)} color={rbC(result.rendBrut)} />
          <Row label="Référence bonne rentabilité FR" value="min. 6 %" />
          <Row label="Rendement net du projet" value={fP(result.rendNet)} color={rnC(result.rendNet)} />
          <Row label="Référence marché FR" value="min. 4 % net" />
          <Bdg text={result.rendBrut >= 5 ? 'Au-dessus du marché' : result.rendBrut >= 4 ? 'Dans la moyenne' : 'En dessous du marché'} good={result.rendBrut >= 5} />
        </View>

        <View style={{ flex: 1 }}>
          <Sec title="Indicateurs complémentaires" />
          <Row label="Point mort locatif" value={fE(result.pointMort) + '/an'} note="loyer min pour couvrir toutes charges" />
          <Row label="Mois loués / an" value={`${result.moisLoues} mois`} />
          <Row label="Vacance annuelle estimée" value={fE(result.vacanceAnnuelle)} />
          <Row label="Cashflow annuel" value={(result.cashflowAnnuel >= 0 ? '+' : '') + fE(result.cashflowAnnuel)} color={cfC(result.cashflowAnnuel)} />

          <Sec title={`Projection patrimoniale — ${params.horizonRevente} ans`} />
          <Row label="Valeur estimée à la revente" value={fE(result.prixRevente)} />
          <Row label="Plus-value brute estimée" value={fE(result.plusValueBrute)} color={T.green} />
          <Row label="Impôt sur plus-value estimé" value={fE(result.impotPlusValue)} color={T.red} />
          <Row label="Patrimoine net à la revente" value={fE(result.patrimoineNetRevente)} color={T.green} />
          <Row label={`TRI sur ${params.horizonRevente} ans`} value={fP(result.tri)} color={result.tri >= 7 ? T.green : result.tri >= 4 ? T.amber : T.red} />

          <InfoBox text={`En ${params.horizonRevente} ans, cet investissement génère un patrimoine net de ${fE(result.patrimoineNetRevente)} pour un apport initial de ${fE(params.apport)}, soit une multiplication de ×${mult}.`} />
        </View>
      </View>
      <Foot page={5} total={totalPages} />
    </Page>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 5 — OPTIMISATION FISCALE
// ════════════════════════════════════════════════════════════════════════════════
function FiscalPage({ params, fiscal, today, totalPages }: BankReportPDFProps) {
  const activeRegimes = fiscal.regimes.filter(r => !r.disabled)
  const bestRegime = activeRegimes.length > 0
    ? activeRegimes.reduce((b, r) => r.rendNetNet > b.rendNetNet ? r : b, activeRegimes[0])
    : null
  const worstFiscal = activeRegimes.length > 1 ? Math.max(...activeRegimes.map(r => r.totalFiscal)) : 0
  const saving = bestRegime && activeRegimes.length > 1 ? worstFiscal - bestRegime.totalFiscal : 0

  return (
    <Page size="A4" style={s.page}>
      <Hdr subtitle="Optimisation fiscale" today={today} />
      <View style={{ flexDirection: 'row', gap: 22, marginBottom: 14 }}>
        {/* Best regime */}
        <View style={{ flex: 1 }}>
          <Sec title="Régime fiscal optimal retenu" />
          {bestRegime ? (
            <>
              <View style={{ backgroundColor: T.greenBg, borderWidth: 1, borderColor: T.greenBorder, borderStyle: 'solid', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: T.greenDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>• Meilleur régime identifié</Text>
                <Text style={{ fontSize: 17, fontFamily: 'Helvetica-Bold', color: T.dark, marginBottom: 10 }}>{bestRegime.name}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 7.5, color: T.mid, textTransform: 'uppercase', marginBottom: 3 }}>Rend. nette-nette</Text>
                    <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: T.green }}>{fP(bestRegime.rendNetNet)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 7.5, color: T.mid, textTransform: 'uppercase', marginBottom: 3 }}>CF net impôts</Text>
                    <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: T.dark }}>
                      {(bestRegime.cfNet >= 0 ? '+' : '') + fE(bestRegime.cfNet)}/mois
                    </Text>
                  </View>
                </View>
              </View>
              <Row label="Revenu imposable" value={fE(bestRegime.revImposable)} />
              <Row label="Impôt sur le revenu" value={fE(bestRegime.impot)} color={T.red} />
              <Row label="Prélèvements sociaux" value={fE(bestRegime.ps)} color={T.red} />
              <Row label="Total fiscal annuel" value={fE(bestRegime.totalFiscal)} color={T.red} />
            </>
          ) : (
            <Text style={{ fontSize: 9.5, color: T.mid }}>Données fiscales non disponibles.</Text>
          )}
        </View>

        {/* All regimes */}
        <View style={{ flex: 1 }}>
          <Sec title="Comparaison des régimes disponibles" />
          {activeRegimes.slice(0, 6).map((r, i) => (
            <View key={i} style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              padding: 9, marginBottom: 5,
              backgroundColor: T.bg,
              borderWidth: 1, borderColor: r === bestRegime ? T.greenBorder : T.border, borderStyle: 'solid',
              borderLeftWidth: r === bestRegime ? 3 : 1,
              borderLeftColor: r === bestRegime ? T.green : T.border,
              borderRadius: 6,
            }}>
              <View>
                <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: T.dark }}>
                  {r.name}{r === bestRegime ? <Text style={{ fontSize: 8, color: T.green }}>{' '}· Optimal</Text> : null}
                </Text>
                <Text style={{ fontSize: 8, color: T.mid, marginTop: 2 }}>
                  CF net : {(r.cfNet >= 0 ? '+' : '') + fE(r.cfNet)}/mois
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: r.rendNetNet >= 4 ? T.green : r.rendNetNet >= 2 ? T.amber : T.red }}>
                {fP(r.rendNetNet)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Sec title="Impact fiscal global sur la durée de détention" />
      <View style={[s.card, { padding: 12 }]}>
        <Text style={{ fontSize: 9, color: T.mid, lineHeight: 1.7 }}>
          {'Avec le régime '}
          <Text style={{ fontFamily: 'Helvetica-Bold', color: T.dark }}>{bestRegime?.name ?? '—'}</Text>
          {', la charge fiscale annuelle est estimée à '}
          <Text style={{ fontFamily: 'Helvetica-Bold', color: T.dark }}>{bestRegime ? fE(bestRegime.totalFiscal) : '—'}</Text>
          {saving > 0 ? (
            <Text>{`, soit une économie de `}
              <Text style={{ fontFamily: 'Helvetica-Bold', color: T.green }}>{fE(saving)}</Text>
              {` par rapport au régime le moins favorable. Sur ${params.horizonRevente} ans, économie cumulée estimée à `}
              <Text style={{ fontFamily: 'Helvetica-Bold', color: T.green }}>{fE(saving * params.horizonRevente)}</Text>.
            </Text>
          ) : '.'}
        </Text>
      </View>
      <Foot page={6} total={totalPages} />
    </Page>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 6 — SYNTHÈSE & DOCUMENTS
// ════════════════════════════════════════════════════════════════════════════════
function SynthesisPage({ profile, ratios, today, totalPages }: BankReportPDFProps) {
  const docs = documentsRequis(profile.modeAcquisition)
  const half = Math.ceil(docs.length / 2)
  const col1 = docs.slice(0, half)
  const col2 = docs.slice(half)

  return (
    <Page size="A4" style={s.page}>
      <Hdr subtitle="Synthèse & documents du dossier" today={today} />
      <View style={{ flexDirection: 'row', gap: 22, marginBottom: 16 }}>
        {/* Points forts */}
        <View style={{ flex: 1 }}>
          <Sec title="Points forts du dossier" />
          {ratios.pointsForts.length > 0 ? ratios.pointsForts.map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 7, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.greenBg, borderBottomStyle: 'solid' }}>
              <Text style={{ fontSize: 10, color: T.green, flexShrink: 0 }}>•</Text>
              <Text style={{ fontSize: 9, color: '#1e293b', lineHeight: 1.5, flex: 1 }}>{p}</Text>
            </View>
          )) : <Text style={{ fontSize: 9, color: T.mid }}>Complétez le profil pour générer l'analyse.</Text>}
        </View>

        {/* Points vigilance */}
        <View style={{ flex: 1 }}>
          <Sec title="Points de vigilance" />
          {ratios.pointsVigilance.length > 0 ? ratios.pointsVigilance.map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 7, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.amberBg, borderBottomStyle: 'solid' }}>
              <Text style={{ fontSize: 10, color: T.amber, flexShrink: 0 }}>•</Text>
              <Text style={{ fontSize: 9, color: '#1e293b', lineHeight: 1.5, flex: 1 }}>{p}</Text>
            </View>
          )) : (
            <View style={{ flexDirection: 'row', gap: 7, paddingVertical: 6 }}>
              <Text style={{ fontSize: 10, color: T.green, flexShrink: 0 }}>•</Text>
              <Text style={{ fontSize: 9, color: T.mid }}>Aucun point de vigilance détecté.</Text>
            </View>
          )}
        </View>
      </View>

      <Sec title="Documents à fournir avec ce dossier" />
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <View style={{ flex: 1 }}>
          {col1.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: T.bg, borderBottomStyle: 'solid' }}>
              <View style={{ width: 16, height: 16, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderStyle: 'solid', borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 7, color: T.mid, fontFamily: 'Helvetica-Bold' }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 9, color: T.mid, flex: 1 }}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          {col2.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: T.bg, borderBottomStyle: 'solid' }}>
              <View style={{ width: 16, height: 16, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderStyle: 'solid', borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 7, color: T.mid, fontFamily: 'Helvetica-Bold' }}>{half + i + 1}</Text>
              </View>
              <Text style={{ fontSize: 9, color: T.mid, flex: 1 }}>{d}</Text>
            </View>
          ))}
        </View>
      </View>
      <Foot page={7} total={totalPages} />
    </Page>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 7 — STRUCTURE JURIDIQUE (si société)
// ════════════════════════════════════════════════════════════════════════════════
function LegalPage({ profile, today, totalPages }: BankReportPDFProps) {
  const garanties: [string, string][] = ['sci-ir', 'sci-is', 'sarl-famille', 'holding-sci'].includes(profile.modeAcquisition)
    ? [
        ['Caution personnelle', profile.modeAcquisition === 'holding-sci' ? 'Caution de la Holding' : 'Des associés garants'],
        ['Hypothèque', 'Sur le bien acquis'],
        ...(['sci-is', 'holding-sci'].includes(profile.modeAcquisition) ? [['Nantissement', 'Des parts sociales'] as [string, string]] : []),
      ]
    : []

  const specificNote: Record<string, string> = {
    'sci-ir': 'La SCI IR est fiscalement transparente : la banque analyse la capacité personnelle des associés. Les revenus locatifs remontent proportionnellement aux parts. Le taux d\'endettement est calculé au niveau des associés garants.',
    'sci-is': 'La SCI IS amortit le bien comptablement, réduisant le résultat apparent sans affecter le cash-flow réel. La banque est sensibilisée au fait que le cash-flow opérationnel reste positif malgré un résultat comptable potentiellement faible.',
    'sarl-famille': 'La SARL de famille permet d\'opter pour le régime des sociétés de personnes (IS ou IR). Les associés justifient du lien familial. La banque examine les bilans, comptes de résultat et la capacité personnelle des cogérants.',
    'holding-sci': 'Le montage Holding + SCI optimise la remontée de trésorerie via le régime mère-fille (dividendes quasi exonérés). La banque peut accepter une garantie au niveau de la Holding plutôt que personnelle.',
  }

  return (
    <Page size="A4" style={s.page}>
      <Hdr subtitle="Structure juridique & gouvernance" today={today} />
      <View style={{ flexDirection: 'row', gap: 22 }}>
        <View style={{ flex: 1 }}>
          <Sec title="Identification de la structure" />
          <Row label="Forme juridique" value={structureLabel(profile.modeAcquisition)} />
          {profile.nomSociete && <Row label="Dénomination sociale" value={profile.nomSociete} />}
          {profile.siren && <Row label="SIREN" value={profile.siren} />}
          {profile.dateCreationSociete && <Row label="Date de création" value={profile.dateCreationSociete} />}
          {profile.capitalSocial && <Row label="Capital social" value={fE(profile.capitalSocial)} />}

          <Sec title="Répartition du capital" />
          {(profile.associes ?? []).length > 0
            ? (profile.associes ?? []).map((a, i) => <Row key={i} label={a.nom || `Associé ${i + 1}`} value={`${a.partsPct} %`} />)
            : <Row label="Associé principal" value="100 %" />
          }

          {garanties.length > 0 && (
            <>
              <Sec title="Garanties proposées à la banque" />
              {garanties.map(([label, value], i) => <Row key={i} label={label} value={value} />)}
            </>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Sec title="Spécificités bancaires" />
          {specificNote[profile.modeAcquisition] && (
            <View style={{ backgroundColor: T.amberBg, borderWidth: 1, borderColor: T.amberBorder, borderStyle: 'solid', borderRadius: 7, padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 9, color: '#1e293b', lineHeight: 1.7 }}>
                {specificNote[profile.modeAcquisition]}
              </Text>
            </View>
          )}

          <Sec title="Flux financiers au sein du montage" />
          {profile.modeAcquisition === 'holding-sci' ? (
            <>
              <View style={[s.card, { marginBottom: 7, padding: 10 }]}>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: T.dark, marginBottom: 3 }}>Flux entrants SCI</Text>
                <Text style={{ fontSize: 9, color: T.mid, lineHeight: 1.5 }}>Loyers locatifs — couvrent mensualité + charges courantes de la SCI</Text>
              </View>
              <View style={[s.card, { padding: 10 }]}>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: T.dark, marginBottom: 3 }}>Remontée Holding</Text>
                <Text style={{ fontSize: 9, color: T.mid, lineHeight: 1.5 }}>Bénéfices SCI — dividendes Holding (régime mère-fille, 95 % exonéré) — trésorerie pour nouveaux investissements</Text>
              </View>
            </>
          ) : (
            <View style={[s.card, { padding: 10 }]}>
              <Text style={{ fontSize: 9, color: T.mid, lineHeight: 1.6 }}>
                {`Loyers encaissés par la ${profile.modeAcquisition === 'sci-ir' ? 'SCI' : profile.modeAcquisition === 'sarl-famille' ? 'SARL' : 'société'} — paiement des charges et de la mensualité bancaire — résultat distribué ou conservé selon la stratégie patrimoniale des associés.`}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Foot page={8} total={totalPages} />
    </Page>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// DOCUMENT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════════
export default function BankReportPDF(props: BankReportPDFProps) {
  const hasCompany = props.profile.modeAcquisition !== 'nom-propre'

  return (
    <Document
      title={`Dossier Bancaire IMMORA — ${props.profile.nomPrenom || 'Investisseur'}`}
      author="IMMORA"
      subject="Dossier de financement immobilier locatif"
      creator="IMMORA"
    >
      <CoverPage {...props} />
      <ProfilePage {...props} />
      <ProjectPage {...props} />
      <BankPage {...props} />
      <RentabilityPage {...props} />
      <FiscalPage {...props} />
      <SynthesisPage {...props} />
      {hasCompany && <LegalPage {...props} />}
    </Document>
  )
}
