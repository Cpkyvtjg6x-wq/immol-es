// ─── IMMORA Email Service — Resend ──────────────────────────────────────────
// Docs: https://resend.com/docs
// Installer: npm install resend (dans saas/)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'IMMORA <bonjour@immora.fr>'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY non définie — email non envoyé')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[Email] Erreur Resend:', err)
      return false
    }
    return true
  } catch (err) {
    console.error('[Email] Erreur réseau:', err)
    return false
  }
}

// ─── Templates ──────────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IMMORA</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                <tr>
                  <td style="background:#10b981;width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;padding:0 8px;">
                    <span style="color:#09090b;font-size:18px;font-weight:900;">⌂</span>
                  </td>
                  <td style="padding-left:10px;font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;">
                    IMMO<span style="color:#10b981;">RA</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#111113;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:12px;color:#52525b;">
              IMMORA · <a href="https://immora.fr" style="color:#10b981;text-decoration:none;">immora.fr</a>
              · <a href="https://immora.fr/unsubscribe" style="color:#52525b;text-decoration:none;">Se désabonner</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const btn = (text: string, url: string) =>
  `<a href="${url}" style="display:inline-block;background:#10b981;color:#09090b;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-top:24px;">${text}</a>`

const h1Style = 'font-size:24px;font-weight:900;color:#ffffff;margin:0 0 12px 0;letter-spacing:-0.03em;'
const pStyle = 'font-size:14px;color:#a1a1aa;line-height:1.7;margin:0 0 16px 0;'
const kpiBox = (label: string, value: string, color = '#10b981') =>
  `<td style="text-align:center;padding:16px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.07);">
    <div style="font-size:10px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${label}</div>
    <div style="font-size:20px;font-weight:900;color:${color};">${value}</div>
  </td>`

// ── 1. Email de bienvenue ────────────────────────────────────────────────────
export function emailBienvenue(firstName: string, appUrl: string): string {
  return baseLayout(`
    <h1 style="${h1Style}">Bienvenue sur IMMORA, ${firstName} 👋</h1>
    <p style="${pStyle}">
      Votre compte est créé. Vous pouvez maintenant analyser vos investissements immobiliers,
      calculer votre cashflow, simuler votre fiscalité et générer un dossier bancaire professionnel.
    </p>
    <p style="${pStyle}">Ce que vous pouvez faire dès maintenant :</p>
    <table width="100%" cellspacing="8" style="margin:16px 0;">
      <tr>
        <td style="padding:12px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;font-size:13px;color:#d1fae5;">
          📊 <strong>Calculateur complet</strong> — rendement, cashflow, TRI, fiscalité
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;font-size:13px;color:#a1a1aa;">
          🏦 <strong>Dossier bancaire (Pro)</strong> — ratios HCSF, taux d'endettement, reste à vivre
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;font-size:13px;color:#a1a1aa;">
          📄 <strong>Export PDF pro (Pro)</strong> — rapport prêt pour votre banquier
        </td>
      </tr>
    </table>
    <div style="text-align:center;">
      ${btn('Analyser mon premier bien →', `${appUrl}/analyse`)}
    </div>
    <p style="font-size:12px;color:#52525b;margin-top:24px;text-align:center;">
      Des questions ? Répondez directement à cet email.
    </p>
  `)
}

// ── 2. Confirmation paiement ─────────────────────────────────────────────────
export function emailPaiementConfirme(
  firstName: string,
  planName: string,
  appUrl: string
): string {
  const planLabel = planName === 'business' ? 'Agence' : 'Pro'
  return baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:56px;height:56px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">✓</div>
    </div>
    <h1 style="${h1Style}text-align:center;">Paiement confirmé 🎉</h1>
    <p style="${pStyle}text-align:center;">
      Bienvenue dans IMMORA <strong style="color:#10b981;">${planLabel}</strong>, ${firstName} !
      Toutes vos nouvelles fonctionnalités sont activées.
    </p>
    <table width="100%" cellspacing="8" style="margin:20px 0;">
      <tr>
        <td style="padding:12px 16px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;font-size:13px;color:#d1fae5;">
          ✅ Simulations illimitées
        </td>
      </tr>
      <tr><td style="height:6px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;font-size:13px;color:#d1fae5;">
          ✅ Export PDF &amp; Excel professionnel
        </td>
      </tr>
      <tr><td style="height:6px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;font-size:13px;color:#d1fae5;">
          ✅ Dossier bancaire HCSF complet
        </td>
      </tr>
      ${planLabel === 'Agence' ? `<tr><td style="height:6px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;font-size:13px;color:#d1fae5;">
          ✅ Jusqu'à 5 utilisateurs + PDF white-label
        </td>
      </tr>` : ''}
    </table>
    <div style="text-align:center;">
      ${btn('Accéder à mon tableau de bord →', `${appUrl}/dashboard`)}
    </div>
    <p style="font-size:12px;color:#52525b;margin-top:24px;text-align:center;">
      Gérez votre abonnement à tout moment depuis <a href="${appUrl}/profile" style="color:#10b981;">votre profil</a>.
    </p>
  `)
}

// ── 3. Trial qui expire dans 3 jours ────────────────────────────────────────
export function emailTrialExpire(firstName: string, appUrl: string): string {
  return baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:56px;height:56px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">⏰</div>
    </div>
    <h1 style="${h1Style}text-align:center;">Votre essai expire dans 3 jours</h1>
    <p style="${pStyle}text-align:center;">
      ${firstName}, votre période d'essai IMMORA Pro se termine bientôt.
      Continuez à profiter de toutes les fonctionnalités Pro en activant votre abonnement.
    </p>
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin:20px 0;">
      <p style="font-size:13px;font-weight:700;color:#ffffff;margin:0 0 12px 0;">Ce que vous perdrez à la fin de l'essai :</p>
      <p style="font-size:13px;color:#a1a1aa;margin:0 0 6px 0;">❌ Export PDF professionnel illimité</p>
      <p style="font-size:13px;color:#a1a1aa;margin:0 0 6px 0;">❌ Dossier bancaire HCSF</p>
      <p style="font-size:13px;color:#a1a1aa;margin:0 0 6px 0;">❌ Simulations illimitées</p>
      <p style="font-size:13px;color:#a1a1aa;margin:0;">❌ Analyse IA de vos investissements</p>
    </div>
    <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
      <p style="font-size:13px;color:#d1fae5;margin:0 0 4px 0;">Plan Pro</p>
      <p style="font-size:32px;font-weight:900;color:#10b981;margin:0 0 4px 0;">19€<span style="font-size:16px;font-weight:400;color:#6ee7b7;">/mois</span></p>
      <p style="font-size:12px;color:#6ee7b7;margin:0;">ou 15€/mois facturé annuellement</p>
    </div>
    <div style="text-align:center;">
      ${btn('Activer mon abonnement →', `${appUrl}/#pricing`)}
    </div>
    <p style="font-size:12px;color:#52525b;margin-top:24px;text-align:center;">
      Sans engagement · Annulation en 1 clic · Données conservées
    </p>
  `)
}

// ── 4. Récapitulatif hebdomadaire (optionnel) ────────────────────────────────
export function emailRecapHebdo(
  firstName: string,
  stats: { nbSimulations: number; cashflowTotal: number; meilleurRendement: number },
  appUrl: string
): string {
  const cfColor = stats.cashflowTotal >= 0 ? '#10b981' : '#ef4444'
  const cfSign = stats.cashflowTotal >= 0 ? '+' : ''
  return baseLayout(`
    <h1 style="${h1Style}">Votre semaine sur IMMORA</h1>
    <p style="${pStyle}">Bonjour ${firstName}, voici un résumé de votre activité cette semaine.</p>
    <table width="100%" cellspacing="8" style="margin:20px 0;">
      <tr>
        ${kpiBox('Simulations', stats.nbSimulations.toString())}
        <td style="width:8px;"></td>
        ${kpiBox('Cashflow total', `${cfSign}${Math.round(stats.cashflowTotal)} €/mois`, cfColor)}
        <td style="width:8px;"></td>
        ${kpiBox('Meilleur rend.', `${stats.meilleurRendement.toFixed(1)}%`)}
      </tr>
    </table>
    <div style="text-align:center;">
      ${btn('Voir mon tableau de bord →', `${appUrl}/dashboard`)}
    </div>
  `)
}
