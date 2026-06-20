// =====================================================
// Supabase Edge Function: Downgrade Subscriptions
// تخفيض الاشتراكات الذهبية/البلاتينية المنتهية إلى فضي
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async () => {
  try {
    const now = new Date().toISOString();
    
    // جلب الحسابات المنتهية الاشتراك
    const { data: expiredBusinesses, error } = await supabase
      .from('business_profiles')
      .select('id, business_name, subscription_tier, subscription_expires_at')
      .in('subscription_tier', ['gold', 'platinum'])
      .lt('subscription_expires_at', now);
    
    if (error) throw error;
    
    let downgradedCount = 0;
    
    for (const business of expiredBusinesses || []) {
      // تخفيض إلى فضي
      const { error: updateError } = await supabase
        .from('business_profiles')
        .update({ 
          subscription_tier: 'silver',
          subscription_expires_at: null,
          updated_at: now
        })
        .eq('id', business.id);
      
      if (updateError) {
        console.error(`Error downgrading ${business.id}:`, updateError);
        continue;
      }
      
      // إرسال إشعار
      await supabase.from('notifications').insert({
        user_id: business.id,
        message: 'انتهى اشتراكك الذهبي/البلاتيني. تم تخفيض حسابك إلى الفضي. يرجى التجديد للاستفادة من الميزات',
        type: 'subscription_expired',
        created_at: now
      });
      
      downgradedCount++;
    }
    
    // تسجيل في logs
    console.log(`[Downgrade] ${downgradedCount} businesses downgraded to silver`);
    
    // إرسال إشعار عبر البريد الإلكتروني للأدمن
    await sendAdminNotification(downgradedCount);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Downgraded ${downgradedCount} businesses`,
        timestamp: now 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in downgrade-subscriptions:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function sendAdminNotification(count: number) {
  try {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_type', 'admin');
    
    for (const admin of admins || []) {
      await supabase.from('notifications').insert({
        user_id: admin.id,
        message: `تم تخفيض ${count} حساب تجاري إلى الفضي بسبب انتهاء الاشتراك`,
        type: 'admin_alert',
        created_at: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('Error sending admin notification:', e);
  }
}