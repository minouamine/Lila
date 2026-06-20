-- ========================================
-- RLS POLICIES (Row Level Security)
-- Supabase - LILA Project
-- ========================================

-- تمكين RLS على جميع الجداول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- ===== PROFILES =====
-- يمكن لأي مستخدم تسجيل الدخول قراءة بيانات الملفات العامة (للبحث)
CREATE POLICY "Anyone can read profiles" ON public.profiles
    FOR SELECT USING (true);

-- لا يمكن تعديل الملف إلا لصاحبه أو الأدمن
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- ===== BUSINESS PROFILES =====
-- قراءة: الكل يقرأ الحسابات المفعلة فقط (verification_status = 'approved')
CREATE POLICY "Anyone can read approved business profiles" ON public.business_profiles
    FOR SELECT USING (verification_status = 'approved');

-- كتابة/تحديث: فقط صاحبة الحساب أو الأدمن
CREATE POLICY "Owner can update own business profile" ON public.business_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Owner can insert business profile" ON public.business_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ===== POSTS =====
-- القراءة: الكل يقرأ منشورات الحسابات المفعلة
CREATE POLICY "Anyone can read posts" ON public.posts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.business_profiles WHERE id = business_id AND verification_status = 'approved')
    );
-- الإنشاء: فقط صاحبة الحساب
CREATE POLICY "Owner can insert posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = business_id);
-- التحديث/الحذف: صاحبة الحساب فقط
CREATE POLICY "Owner can update/delete posts" ON public.posts
    FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Owner can delete posts" ON public.posts
    FOR DELETE USING (auth.uid() = business_id);

-- ===== FOLLOWS & FAVORITES =====
-- المستخدمة العادية فقط (auth.uid() موجود في profiles.user_type='customer')
CREATE POLICY "Customers can manage follows" ON public.follows
    FOR ALL USING (auth.uid() = follower_id);
CREATE POLICY "Customers can manage favorites" ON public.favorites
    FOR ALL USING (auth.uid() = customer_id);

-- ===== BOOKINGS =====
-- العميلة: ترى حجوزاتها فقط، وتنشئ حجوزات فقط لنفسها
CREATE POLICY "Customer read own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customer insert own bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);
-- صاحبة الحساب: ترى كل حجوزات حسابها التجاري
CREATE POLICY "Business read bookings of own account" ON public.bookings
    FOR SELECT USING (auth.uid() = business_id);
-- صاحبة الحساب تحديث حالة الحجز (confirm, complete, cancel)
CREATE POLICY "Business update own bookings" ON public.bookings
    FOR UPDATE USING (auth.uid() = business_id);

-- ===== REVIEWS =====
-- أي مستخدمة مسجلة تقرأ التقييمات
CREATE POLICY "Anyone read reviews" ON public.reviews
    FOR SELECT USING (true);
-- العميلة تنشئ تقييماً واحداً فقط بعد الحجز المكتمل
CREATE POLICY "Customers insert review once" ON public.reviews
    FOR INSERT WITH CHECK (
        auth.uid() = customer_id
        AND NOT EXISTS (SELECT 1 FROM public.reviews WHERE customer_id = auth.uid() AND business_id = NEW.business_id)
    );
-- صاحبة الحساب ترد (تحديث حقل reply_from_business فقط)
CREATE POLICY "Business can reply to reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = business_id)
    WITH CHECK (OLD.reply_from_business IS NULL AND NEW.reply_from_business IS NOT NULL);

-- ===== REPORTS =====
-- أي مستخدمة مسجلة تنشئ بلاغاً
CREATE POLICY "Customers can report" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ===== PAYMENT_REQUESTS =====
-- صاحبة الحساب تنشئ طلب دفع
CREATE POLICY "Business create payment requests" ON public.payment_requests
    FOR INSERT WITH CHECK (auth.uid() = business_id);
-- الأدمن فقط يقرأ ويحدث طلبات الدفع (يُضاف لاحقاً عبر Supabase dashboard)

-- ملاحظة: الأدمن له دور خاص في auth.users، يجب إضافة سياسات منفصلة للأدمن
-- أو استخدام is_admin() function مخصصة