-- =====================================================
-- LILA - مشروع صالونات وخدمات النساء في الجزائر
-- ملف الهجرة رقم 002: سياسات أمان RLS (Row Level Security)
-- =====================================================

-- تمكين RLS على جميع الجداول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warning_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.id_cards_deletion_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- دالة مساعدة للتحقق من دور المستخدم
-- =====================================================

-- التحقق مما إذا كان المستخدم أدمن
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND user_type = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- التحقق مما إذا كان المستخدم صاحبة حساب تجاري
CREATE OR REPLACE FUNCTION public.is_business_owner(business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND user_type = 'business' AND id = business_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- سياسات جدول profiles
-- =====================================================

-- قراءة: الكل يقرأ (للبحث)
CREATE POLICY "Anyone can read profiles" ON public.profiles
    FOR SELECT USING (true);

-- تحديث: فقط صاحب الحساب أو الأدمن
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- إدراج: فقط المستخدم نفسه (عبر الزناد)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- حذف: فقط الأدمن
CREATE POLICY "Only admin can delete profiles" ON public.profiles
    FOR DELETE USING (public.is_admin());

-- =====================================================
-- سياسات جدول business_profiles
-- =====================================================

-- قراءة: الكل يقرأ الحسابات المفعلة فقط (غير المحظورة)
CREATE POLICY "Anyone can read approved business profiles" ON public.business_profiles
    FOR SELECT USING (
        verification_status = 'approved' 
        AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = business_profiles.id AND is_banned = true)
    );

-- قراءة الأدمن: يرى كل الحسابات (حتى قيد المراجعة والمحظورة)
CREATE POLICY "Admin can read all business profiles" ON public.business_profiles
    FOR SELECT USING (public.is_admin());

-- تحديث: صاحبة الحساب أو الأدمن
CREATE POLICY "Owner can update own business profile" ON public.business_profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- إدراج: فقط المستخدمة التي تفتح حساباً تجارياً
CREATE POLICY "User can insert business profile" ON public.business_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- حذف: فقط الأدمن
CREATE POLICY "Only admin can delete business profile" ON public.business_profiles
    FOR DELETE USING (public.is_admin());

-- =====================================================
-- سياسات جدول business_gallery
-- =====================================================

-- قراءة: الكل يقرأ
CREATE POLICY "Anyone can read business gallery" ON public.business_gallery
    FOR SELECT USING (true);

-- إدراج/تحديث/حذف: فقط صاحبة الحساب أو الأدمن
CREATE POLICY "Owner can manage gallery" ON public.business_gallery
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.business_profiles WHERE id = business_id AND id = auth.uid())
        OR public.is_admin()
    );

-- =====================================================
-- سياسات جدول posts
-- =====================================================

-- قراءة: الكل يقرأ منشورات الحسابات المفعلة
CREATE POLICY "Anyone can read posts" ON public.posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.business_profiles 
            WHERE id = posts.business_id AND verification_status = 'approved'
        )
    );

-- إدراج/تحديث/حذف: فقط صاحبة الحساب أو الأدمن
CREATE POLICY "Owner can manage posts" ON public.posts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.business_profiles WHERE id = business_id AND id = auth.uid())
        OR public.is_admin()
    );

-- =====================================================
-- سياسات جدول follows
-- =====================================================

-- قراءة: الكل يقرأ
CREATE POLICY "Anyone can read follows" ON public.follows
    FOR SELECT USING (true);

-- إدراج/حذف: فقط المستخدمة العادية (تتابع أو تلغي متابعة)
CREATE POLICY "Customers can manage follows" ON public.follows
    FOR ALL USING (auth.uid() = follower_id);

-- =====================================================
-- سياسات جدول favorites
-- =====================================================

-- قراءة: الكل يقرأ
CREATE POLICY "Anyone can read favorites" ON public.favorites
    FOR SELECT USING (true);

-- إدراج/حذف: فقط المستخدمة العادية
CREATE POLICY "Customers can manage favorites" ON public.favorites
    FOR ALL USING (auth.uid() = customer_id);

-- =====================================================
-- سياسات جدول bookings
-- =====================================================

-- قراءة العميلة: حجوزاتها فقط
CREATE POLICY "Customer read own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = customer_id);

-- قراءة صاحبة الحساب: حجوزات حسابها التجاري
CREATE POLICY "Business read own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = business_id);

-- قراءة الأدمن: الكل
CREATE POLICY "Admin read all bookings" ON public.bookings
    FOR SELECT USING (public.is_admin());

-- إدراج: العميلة تنشئ حجزاً لنفسها
CREATE POLICY "Customer insert bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- تحديث: صاحبة الحساب تحدث حالة الحجز
CREATE POLICY "Business update booking status" ON public.bookings
    FOR UPDATE USING (auth.uid() = business_id OR public.is_admin());

-- حذف: فقط الأدمن
CREATE POLICY "Only admin delete bookings" ON public.bookings
    FOR DELETE USING (public.is_admin());

-- =====================================================
-- سياسات جدول reviews
-- =====================================================

-- قراءة: الكل يقرأ
CREATE POLICY "Anyone can read reviews" ON public.reviews
    FOR SELECT USING (true);

-- إدراج: العميلة تنشئ تقييماً واحداً فقط بعد الحجز
CREATE POLICY "Customer insert review once" ON public.reviews
    FOR INSERT WITH CHECK (
        auth.uid() = customer_id
        AND NOT EXISTS (
            SELECT 1 FROM public.reviews 
            WHERE customer_id = auth.uid() AND business_id = NEW.business_id
        )
    );

-- تحديث: صاحبة الحساب ترد على التقييم (تحديث reply فقط)
CREATE POLICY "Business can reply to reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = business_id)
    WITH CHECK (OLD.reply_from_business IS NULL AND NEW.reply_from_business IS NOT NULL);

-- تحديث الأدمن: الكل
CREATE POLICY "Admin can update reviews" ON public.reviews
    FOR UPDATE USING (public.is_admin());

-- =====================================================
-- سياسات جدول reports
-- =====================================================

-- قراءة: الأدمن فقط يرى كل الإبلاغات
CREATE POLICY "Admin read all reports" ON public.reports
    FOR SELECT USING (public.is_admin());

-- إدراج: أي مستخدمة مسجلة تنشئ بلاغاً
CREATE POLICY "Customers can report" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- تحديث: الأدمن فقط يغير حالة الإبلاغ
CREATE POLICY "Admin update reports" ON public.reports
    FOR UPDATE USING (public.is_admin());

-- =====================================================
-- سياسات جدول warnings
-- =====================================================

-- قراءة: صاحبة الحساب ترى تحذيراتها، الأدمن يرى الكل
CREATE POLICY "Business read own warnings" ON public.warnings
    FOR SELECT USING (auth.uid() = business_id);

CREATE POLICY "Admin read all warnings" ON public.warnings
    FOR SELECT USING (public.is_admin());

-- إدراج/تحديث/حذف: فقط النظام (عبر الزناد) أو الأدمن
CREATE POLICY "Only system or admin manage warnings" ON public.warnings
    FOR ALL USING (public.is_admin());

-- =====================================================
-- سياسات جدول warning_review_requests
-- =====================================================

-- قراءة: صاحبة الحساب ترى طلباتها، الأدمن يرى الكل
CREATE POLICY "Business read own requests" ON public.warning_review_requests
    FOR SELECT USING (auth.uid() = business_id);

CREATE POLICY "Admin read all requests" ON public.warning_review_requests
    FOR SELECT USING (public.is_admin());

-- إدراج: صاحبة الحساب (ذهبي/بلاتيني فقط)
CREATE POLICY "Premium business can request review" ON public.warning_review_requests
    FOR INSERT WITH CHECK (
        auth.uid() = business_id 
        AND EXISTS (
            SELECT 1 FROM public.business_profiles 
            WHERE id = auth.uid() AND subscription_tier IN ('gold', 'platinum')
        )
    );

-- تحديث: الأدمن فقط
CREATE POLICY "Admin update requests" ON public.warning_review_requests
    FOR UPDATE USING (public.is_admin());

-- =====================================================
-- سياسات جدول advertisements
-- =====================================================

-- قراءة: الكل يقرأ الإعلانات النشطة
CREATE POLICY "Anyone read active ads" ON public.advertisements
    FOR SELECT USING (is_active = true AND ends_at > NOW());

-- إدراج/تحديث/حذف: فقط الأدمن
CREATE POLICY "Only admin manage ads" ON public.advertisements
    FOR ALL USING (public.is_admin());

-- =====================================================
-- سياسات جدول payment_requests
-- =====================================================

-- قراءة: صاحبة الحساب ترى طلباتها، الأدمن يرى الكل
CREATE POLICY "Business read own payment requests" ON public.payment_requests
    FOR SELECT USING (auth.uid() = business_id);

CREATE POLICY "Admin read all payment requests" ON public.payment_requests
    FOR SELECT USING (public.is_admin());

-- إدراج: صاحبة الحساب تنشئ طلب دفع
CREATE POLICY "Business create payment requests" ON public.payment_requests
    FOR INSERT WITH CHECK (auth.uid() = business_id);

-- تحديث: الأدمن فقط يغير حالة الطلب
CREATE POLICY "Admin update payment requests" ON public.payment_requests
    FOR UPDATE USING (public.is_admin());

-- =====================================================
-- سياسات جدول notifications
-- =====================================================

-- قراءة: المستخدم يرى إشعاراته فقط
CREATE POLICY "Users read own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- قراءة الأدمن: الكل (للإشراف)
CREATE POLICY "Admin read all notifications" ON public.notifications
    FOR SELECT USING (public.is_admin());

-- إدراج: النظام (عبر الزناد) أو الأدمن
CREATE POLICY "System or admin insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- تحديث: المستخدم يحدث حالة القراءة
CREATE POLICY "User update notification read status" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- سياسات جدول referral_logs
-- =====================================================

-- قراءة: الأدمن فقط
CREATE POLICY "Admin read referral logs" ON public.referral_logs
    FOR SELECT USING (public.is_admin());

-- إدراج: النظام فقط (عبر الزناد)
CREATE POLICY "Only system insert referral logs" ON public.referral_logs
    FOR INSERT WITH CHECK (false);

-- =====================================================
-- سياسات جدول id_cards_deletion_logs
-- =====================================================

-- قراءة: الأدمن فقط
CREATE POLICY "Admin read deletion logs" ON public.id_cards_deletion_logs
    FOR SELECT USING (public.is_admin());

-- إدراج: النظام فقط
CREATE POLICY "Only system insert deletion logs" ON public.id_cards_deletion_logs
    FOR INSERT WITH CHECK (false);

-- =====================================================
-- تمكين Realtime للجداول التي تحتاج تحديثاً تلقائياً
-- =====================================================

-- نشر الجداول على Realtime
BEGIN;
  INSERT INTO supabase_realtime.realtime_subscription (table_name) VALUES ('posts') ON CONFLICT DO NOTHING;
  INSERT INTO supabase_realtime.realtime_subscription (table_name) VALUES ('follows') ON CONFLICT DO NOTHING;
  INSERT INTO supabase_realtime.realtime_subscription (table_name) VALUES ('bookings') ON CONFLICT DO NOTHING;
  INSERT INTO supabase_realtime.realtime_subscription (table_name) VALUES ('reviews') ON CONFLICT DO NOTHING;
  INSERT INTO supabase_realtime.realtime_subscription (table_name) VALUES ('stories') ON CONFLICT DO NOTHING;
  INSERT INTO supabase_realtime.realtime_subscription (table_name) VALUES ('notifications') ON CONFLICT DO NOTHING;
COMMIT;

-- =====================================================
-- إنشاء مستخدم أدمن افتراضي (يُعدّل يدوياً بعد الإنشاء)
-- =====================================================
-- ملاحظة: يجب إنشاء المستخدم عبر Auth أولاً، ثم تحديث user_type يدوياً
-- UPDATE public.profiles SET user_type = 'admin' WHERE email = 'admin@lila.dz';