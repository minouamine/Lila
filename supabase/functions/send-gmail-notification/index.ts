// =====================================================
// Supabase Edge Function: Send Gmail Notification
// إرسال إشعارات عبر البريد الإلكتروني (Gmail) للأدمن عند:
// - تسجيل حساب تجاري جديد
// - طلب دفع جديد
// - إبلاغ جديد (بعد 3 بلاغات)
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@0.12.0/mod.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// تكوين البريد الإلكتروني
const emailConfig = {
  hostname: 'smtp.gmail.com',
  port: 465,
  username: Deno.env.get('GMAIL_USER') || '',
  password: Deno.env.get('GMAIL_APP_PASSWORD') || '',
  tls: true
};

const ADMIN_EMAILS = ['admin@lila.dz']; // قائمة إيميلات الأدمن

Deno.serve(async (req: Request) => {
  try {
    const { type, data } = await req.json();
    
    let subject = '';
    let htmlContent = '';
    let textContent = '';
    
    switch (type) {
      case 'new_business_registration':
        subject = `🔔 [LILA] حساب تجاري جديد ينتظر المراجعة`;
        htmlContent = `
          <h2>حساب تجاري جديد قيد المراجعة</h2>
          <p><strong>اسم الحساب:</strong> ${data.business_name}</p>
          <p><strong>اسم المستخدم:</strong> @${data.username}</p>
          <p><strong>البريد الإلكتروني:</strong> ${data.email}</p>
          <p><strong>نوع الخدمات:</strong> ${data.services?.join(', ')}</p>
          <p><strong>الولاية:</strong> ${data.wilaya_name}</p>
          <p><strong>تاريخ التسجيل:</strong> ${new Date(data.created_at).toLocaleString()}</p>
          <hr>
          <p><a href="${Deno.env.get('APP_URL')}/admin-dashboard.html" style="background:#ff8c00;color:white;padding:10px 20px;text-decoration:none;border-radius:8px;">مراجعة الحساب</a></p>
        `;
        textContent = `حساب تجاري جديد: ${data.business_name} - ${data.email}`;
        break;
        
      case 'new_payment_request':
        subject = `💰 [LILA] طلب دفع جديد للترقية`;
        htmlContent = `
          <h2>طلب دفع جديد</h2>
          <p><strong>الحساب التجاري:</strong> ${data.business_name}</p>
          <p><strong>الاشتراك المطلوب:</strong> ${data.requested_tier === 'gold' ? 'ذهبي (3000 دج/3 أشهر)' : 'بلاتيني (6000 دج/6 أشهر)'}</p>
          <p><strong>المبلغ:</strong> ${data.amount} دج</p>
          <p><strong>تاريخ الطلب:</strong> ${new Date(data.created_at).toLocaleString()}</p>
          <hr>
          <p><a href="${Deno.env.get('APP_URL')}/admin-dashboard.html?tab=payments" style="background:#ff8c00;color:white;padding:10px 20px;text-decoration:none;border-radius:8px;">مراجعة طلب الدفع</a></p>
        `;
        textContent = `طلب دفع جديد من ${data.business_name} بقيمة ${data.amount} دج`;
        break;
        
      case 'business_warning':
        subject = `⚠️ [LILA] تنبيه: 3 بلاغات ضد حساب تجاري`;
        htmlContent = `
          <h2>تنبيه: 3 بلاغات ضد حساب تجاري</h2>
          <p><strong>الحساب:</strong> ${data.business_name} (@${data.username})</p>
          <p><strong>عدد البلاغات:</strong> 3</p>
          <p><strong>تاريخ آخر بلاغ:</strong> ${new Date(data.last_report_date).toLocaleString()}</p>
          <hr>
          <p><a href="${Deno.env.get('APP_URL')}/admin-dashboard.html?tab=reports" style="background:#ff8c00;color:white;padding:10px 20px;text-decoration:none;border-radius:8px;">مراجعة الحساب</a></p>
        `;
        textContent = `3 بلاغات ضد الحساب ${data.business_name}`;
        break;
        
      default:
        return new Response(JSON.stringify({ success: false, error: 'Unknown notification type' }), { status: 400 });
    }
    
    // إرسال البريد الإلكتروني لكل الأدمن
    const client = new SMTPClient(emailConfig);
    
    for (const adminEmail of ADMIN_EMAILS) {
      try {
        await client.send({
          to: adminEmail,
          from: emailConfig.username,
          subject: subject,
          content: textContent,
          html: htmlContent
        });
        console.log(`[Gmail] Email sent to ${adminEmail}`);
      } catch (emailError) {
        console.error(`[Gmail] Failed to send to ${adminEmail}:`, emailError);
      }
    }
    
    await client.close();
    
    // تسجيل في logs
    console.log(`[Gmail] Notification sent: ${type}`);
    
    return new Response(
      JSON.stringify({ success: true, message: `Email notifications sent for ${type}` }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in send-gmail-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});