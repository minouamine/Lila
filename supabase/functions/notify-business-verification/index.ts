import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function getGmailAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GMAIL_CLIENT_ID')!,
      client_secret: Deno.env.get('GMAIL_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GMAIL_REFRESH_TOKEN')!,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function sendGmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
}) {
  const accessToken = await getGmailAccessToken();

  const boundary = `boundary_${Date.now()}`;
  const rawEmail = [
    `From: LILA <${opts.from}>`,
    `To: ${opts.to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(opts.subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(opts.text))),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(opts.html))),
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedEmail }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail API error: ${err}`);
  }

  return await res.json();
}

Deno.serve(async (req: Request) => {
  try {
    // ── 1. Parse request body ──────────────────────────────────────────────
    const { business_id, status, rejected_reason } = await req.json();

    if (!business_id || !status) {
      return new Response(
        JSON.stringify({ error: 'business_id and status are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'status must be "approved" or "rejected"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Fetch business + user email ─────────────────────────────────────
    const { data: business, error: dbError } = await supabase
      .from('business_profiles')
      .select('business_name, id, profiles(email, full_name)')
      .eq('id', business_id)
      .single();

    if (dbError || !business) {
      console.error('DB error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = business.profiles?.email;
    const userName = business.profiles?.full_name || business.business_name;

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. Build email content ─────────────────────────────────────────────
    const appUrl = Deno.env.get('APP_URL') || '';
    let subject = '';
    let htmlContent = '';
    let textContent = '';

    if (status === 'approved') {
      subject = '✅ تم قبول حسابك التجاري على LILA';
      textContent = `مبروك ${userName}! تم قبول حسابك التجاري ${business.business_name} على منصة LILA.`;
      htmlContent = `
        <div style="font-family:Arial,sans-serif; direction:rtl; text-align:right; max-width:520px; margin:auto; padding:24px; border:1px solid #e2e8f0; border-radius:12px;">
          <h2 style="color:#00c87a;">مبروك! تم قبول حسابك التجاري 🎉</h2>
          <p style="color:#374151;">مرحباً <strong>${userName}</strong>،</p>
          <p style="color:#374151;">يسعدنا إخبارك بأن حسابك التجاري <strong>${business.business_name}</strong> تمت مراجعته وقبوله على منصة LILA.</p>
          <p style="color:#374151;">يمكنك الآن الدخول إلى لوحة التحكم وبدء استقبال الحجوزات.</p>
          <br>
          <a href="${appUrl}/pages/business-dashboard.html"
             style="display:inline-block; background:#ff8c00; color:#fff; padding:12px 28px; text-decoration:none; border-radius:8px; font-weight:bold;">
            الدخول إلى لوحة التحكم
          </a>
          <br><br>
          <p style="color:#9ca3af; font-size:13px;">فريق LILA</p>
        </div>`;
    } else {
      subject = '❌ تم رفض طلب حسابك التجاري على LILA';
      textContent = `مرحباً ${userName}، تم رفض طلب حسابك التجاري ${business.business_name}. السبب: ${rejected_reason || 'لم يتم تحديد سبب'}.`;
      htmlContent = `
        <div style="font-family:Arial,sans-serif; direction:rtl; text-align:right; max-width:520px; margin:auto; padding:24px; border:1px solid #e2e8f0; border-radius:12px;">
          <h2 style="color:#e53e3e;">نأسف، تم رفض طلبك</h2>
          <p style="color:#374151;">مرحباً <strong>${userName}</strong>،</p>
          <p style="color:#374151;">بعد مراجعة طلب حسابك التجاري <strong>${business.business_name}</strong>، تم رفضه للسبب التالي:</p>
          <p style="background:#fff3cd; padding:14px; border-radius:8px; color:#856404; border-right:4px solid #f6a92a;">
            ${rejected_reason || 'لم يتم تحديد سبب'}
          </p>
          <p style="color:#374151;">يمكنك التقديم مجدداً بعد تصحيح المشكلة.</p>
          <br>
          <p style="color:#9ca3af; font-size:13px;">فريق LILA</p>
        </div>`;
    }

    // ── 4. Send via Gmail API ──────────────────────────────────────────────
    const gmailUser = Deno.env.get('GMAIL_USER')!;
    const result = await sendGmail({
      from: gmailUser,
      to: userEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('Email sent:', result.id);

    return new Response(
      JSON.stringify({ success: true, message_id: result.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});