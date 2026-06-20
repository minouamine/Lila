// =====================================================
// Supabase Edge Function: Notify After Booking
// إرسال إشعار تلقائي للعميلة بعد الموعد بساعتين لتطلب التقييم
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  try {
    const { bookingId, customerId, businessId, bookingDate, bookingTime } = await req.json();
    
    if (!bookingId || !customerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // حساب وقت إرسال الإشعار (بعد ساعتين من وقت الموعد)
    const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
    const notifyAt = new Date(bookingDateTime.getTime() + 2 * 60 * 60 * 1000);
    const now = new Date();
    
    if (notifyAt > now) {
      // جدولة الإشعار للمستقبل
      console.log(`[NotifyAfterBooking] Scheduling notification for ${notifyAt}`);
      
      // تخزين في جدول المهام المجدولة
      await supabase.from('scheduled_notifications').insert({
        booking_id: bookingId,
        customer_id: customerId,
        business_id: businessId,
        scheduled_for: notifyAt.toISOString(),
        type: 'review_reminder',
        created_at: now.toISOString()
      });
      
      return new Response(
        JSON.stringify({ success: true, scheduled: true, notifyAt: notifyAt.toISOString() }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // إرسال الإشعار فوراً
    await supabase.from('notifications').insert({
      user_id: customerId,
      message: 'كيف كانت تجربتك؟ قيمي الخدمة الآن وأخبرينا برأيك',
      type: 'review_reminder',
      metadata: { booking_id: bookingId, business_id: businessId },
      created_at: now.toISOString()
    });
    
    return new Response(
      JSON.stringify({ success: true, sent: true, message: 'Review reminder sent' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in notify-after-booking:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Cron job scheduler (يُنفذ كل دقيقة)
Deno.serve({
  schedule: (c: any) => c.cron('every minute', async () => {
    const now = new Date().toISOString();
    
    const { data: pendingNotifications } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .lte('scheduled_for', now)
      .eq('sent', false);
    
    for (const notification of pendingNotifications || []) {
      await supabase.from('notifications').insert({
        user_id: notification.customer_id,
        message: 'كيف كانت تجربتك؟ قيمي الخدمة الآن وأخبرينا برأيك',
        type: 'review_reminder',
        metadata: { booking_id: notification.booking_id, business_id: notification.business_id },
        created_at: now
      });
      
      await supabase.from('scheduled_notifications').update({ sent: true }).eq('id', notification.id);
    }
  })
});