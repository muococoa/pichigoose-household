// Sends the "You're invited!" email for an invite made in the app.
// The app calls this right after invite_to_household. It checks that the caller can see the
// invite (so only the household's members can trigger it), sends one email through Resend,
// and won't send the same invite again within ten minutes.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SITE = 'https://www.pichigoose.com'
const IMG = `${SITE}/email`
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const words = {
  en: {
    subject: (inviter: string) => `${inviter || 'Someone'} invited you to Pichigoose`,
    preheader: (household: string) => `Join ${household} with one tap.`,
    headline: { src: `${IMG}/invited-en.png`, width: 252, alt: "You're invited!" },
    body: (inviter: string, household: string) =>
      `${inviter || 'Someone'} invited you to <b>${household}</b> on Pichigoose, to share shopping lists, to-dos and notes.`,
    button: (household: string) => `Join ${household}`,
    small: 'Not expecting this? You can ignore this email.',
  },
  sr: {
    subject: (inviter: string) => `${inviter || 'Neko'} te poziva na Pichigoose`,
    preheader: (household: string) => `Pridruži se: ${household}.`,
    headline: { src: `${IMG}/invited-sr.png`, width: 244, alt: 'Poziv za tebe!' },
    body: (inviter: string, household: string) =>
      `${inviter || 'Neko'} te poziva u <b>${household}</b> na Pichigoose, da delite liste za kupovinu, zadatke i beleške.`,
    button: () => 'Pridruži se',
    small: 'Ne očekuješ ovo? Slobodno zanemari ovaj email.',
  },
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

// The same note on lined paper as the password reset email (supabase/templates/recovery.html).
function html(lang: 'en' | 'sr', inviter: string, household: string, link: string) {
  const w = words[lang]
  const font = "Nunito,'Trebuchet MS',Arial,sans-serif"
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light"><title>Pichigoose</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&display=swap" rel="stylesheet">
<style>body{margin:0;padding:0;background:#F6F0E8}@media (max-width:560px){.card{padding:0 22px 26px !important}}</style></head>
<body style="margin:0;padding:0;background:#F6F0E8 url('${IMG}/paper-lined.jpg') repeat;">
<div style="display:none;max-height:0;overflow:hidden;">${w.preheader(household)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F6F0E8" background="${IMG}/paper-lined.jpg" style="background:#F6F0E8 url('${IMG}/paper-lined.jpg') repeat;">
<tr><td align="center" style="padding:28px 12px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td align="center" style="line-height:0;font-size:0;padding:0;"><img src="${IMG}/tape-pink-top.png" width="111" height="14" alt="" style="display:block;border:0;margin:0 auto;"></td></tr>
<tr><td class="card" bgcolor="#FFFDF8" background="${IMG}/paper.jpg" style="background:#FFFDF8 url('${IMG}/paper.jpg') repeat;border-radius:6px;padding:0 40px 32px;border-right:2px solid #DDD3CE;border-bottom:3px solid #DDD3CE;font-family:${font};color:#2E2638;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="line-height:0;font-size:0;padding:0 0 22px;"><img src="${IMG}/tape-pink-bottom.png" width="111" height="14" alt="" style="display:block;border:0;margin:0 auto;"></td></tr>
<tr><td align="center" style="padding-bottom:6px;"><img src="${IMG}/pichi-stamp.png" width="132" height="154" alt="Pichi" style="display:block;border:0;"></td></tr>
<tr><td align="center" style="padding:4px 0 8px;"><img src="${w.headline.src}" width="${w.headline.width}" height="76" alt="${w.headline.alt}" style="display:block;border:0;"></td></tr>
<tr><td align="center" style="font-size:17px;line-height:26px;font-weight:600;padding:0 0 24px;">${w.body(esc(inviter), esc(household))}</td></tr>
<tr><td align="center" style="padding:0 0 26px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="border-radius:8px 26px 12px 22px;background:#8466B8;border:4px solid #FFFFFF;box-shadow:0 0 0 1px rgba(30,26,48,.10),2px 3px 4px rgba(30,26,48,.22);">
<a href="${link}" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:16px;line-height:20px;font-weight:800;color:#FFFFFF;text-decoration:none;border-radius:8px 26px 12px 22px;">${esc(w.button(household))}</a>
</td></tr></table></td></tr>
<tr><td align="center" style="font-size:13px;line-height:20px;font-weight:600;color:#63586B;">${w.small}</td></tr>
</table></td></tr>
<tr><td align="center" style="padding:26px 0 0;"><a href="${SITE}" style="text-decoration:none;"><img src="${IMG}/logo.png" width="96" height="72" alt="Pichigoose" style="display:block;border:0;margin:0 auto;"></a></td></tr>
</table></td></tr></table></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  try {
    const { invite_id, language } = await req.json()
    const auth = req.headers.get('Authorization') ?? ''
    const asCaller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })

    // Row Level Security decides: only the household's members can read this invite.
    const { data: invite } = await asCaller
      .from('household_invites')
      .select('id, email, household_id, household_name, inviter_name, emailed_at, accepted_at')
      .eq('id', invite_id)
      .maybeSingle()
    if (!invite) return json({ error: 'not found' }, 404)
    if (invite.accepted_at) return json({ status: 'already_joined' })
    if (invite.emailed_at && Date.now() - new Date(invite.emailed_at).getTime() < 10 * 60 * 1000) return json({ status: 'recently_sent' })

    const { data: household } = await asCaller.from('households').select('address, secret').eq('id', invite.household_id).single()
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    // Write in their language if they already use Pichigoose, otherwise in the inviter's.
    const { data: theirLang } = await admin.rpc('language_for_email', { e: invite.email })
    const lang: 'en' | 'sr' = (theirLang ?? language) === 'sr' ? 'sr' : 'en'
    // The link carries the secret password, so the invited person never has to type it.
    const link = `${SITE}/join/${household!.address}/${encodeURIComponent(household!.secret)}`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Pichigoose <hello@pichigoose.com>',
        to: [invite.email],
        subject: words[lang].subject(invite.inviter_name),
        html: html(lang, invite.inviter_name, invite.household_name, link),
      }),
    })
    if (!res.ok) return json({ error: 'email failed', detail: await res.text() }, 502)
    await admin.from('household_invites').update({ emailed_at: new Date().toISOString() }).eq('id', invite.id)
    return json({ status: 'sent' })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
