-- =====================================================
-- LILA - مشروع صالونات وخدمات النساء في الجزائر
-- ملف الهجرة رقم 001: إنشاء قاعدة البيانات الأساسية
-- =====================================================

-- تمكين الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. جدول الملفات الشخصية (يمتد من auth.users)
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    user_type TEXT DEFAULT 'customer' CHECK (user_type IN ('customer', 'business', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    device_fingerprint TEXT
);

-- =====================================================
-- 2. جدول الحسابات التجارية
-- =====================================================
CREATE TABLE public.business_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    bio TEXT,
    logo_url TEXT,
    cover_photo_url TEXT,
    phone TEXT,
    whatsapp TEXT,
    instagram TEXT,
    tiktok TEXT,
    facebook TEXT,
    
    -- التخصصات (مصفوفة)
    services TEXT[] DEFAULT '{}',
    
    -- التوثيق
    id_front_url TEXT,
    id_back_url TEXT,
    commercial_registry_url TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    has_gold_badge BOOLEAN DEFAULT FALSE,
    verification_rejected_reason TEXT,
    
    -- التواجد الجغرافي
    wilaya_code INTEGER,
    wilaya_name TEXT,
    daira_name TEXT,
    baladiyah_name TEXT,
    address_description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    travel_range_km INTEGER DEFAULT 0,
    is_online BOOLEAN DEFAULT FALSE,
    
    -- مواعيد العمل
    working_hours JSONB,
    contact_hours JSONB,
    
    -- خيارات إضافية
    is_mixte_salon BOOLEAN DEFAULT FALSE,
    is_on_vacation BOOLEAN DEFAULT FALSE,
    vacation_until DATE,
    
    -- الاشتراك
    subscription_tier TEXT DEFAULT 'silver' CHECK (subscription_tier IN ('silver', 'gold', 'platinum')),
    subscription_expires_at TIMESTAMPTZ,
    referral_used_by UUID REFERENCES public.business_profiles(id),
    referral_months_earned INTEGER DEFAULT 0,
    
    -- إحصائيات محسوبة (سيتم تحديثها عبر triggers)
    followers_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. جدول ألبوم الصور للحسابات التجارية
-- =====================================================
CREATE TABLE public.business_gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    category TEXT CHECK (category IN ('before_after', 'completed_work', 'products')),
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. جدول الفيديوهات القصيرة (15 ثانية)
-- =====================================================
CREATE TABLE public.business_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. جدول القصص (24 ساعة - ذهبي/بلاتيني فقط)
-- =====================================================
CREATE TABLE public.stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. جدول المنشورات
-- =====================================================
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. جدول المتابعة
-- =====================================================
CREATE TABLE public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- =====================================================
-- 8. جدول المفضلة (مستقل عن المتابعة)
-- =====================================================
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, business_id)
);

-- =====================================================
-- 9. جدول الحجوزات
-- =====================================================
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    customer_notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    is_emergency BOOLEAN DEFAULT FALSE,
    emergency_fee INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. جدول التقييمات (5 نجوم مع تقييمات فرعية)
-- =====================================================
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating_quality INTEGER CHECK (rating_quality >= 1 AND rating_quality <= 5),
    rating_price INTEGER CHECK (rating_price >= 1 AND rating_price <= 5),
    rating_manners INTEGER CHECK (rating_manners >= 1 AND rating_manners <= 5),
    rating_overall INTEGER CHECK (rating_overall >= 1 AND rating_overall <= 5),
    comment TEXT,
    images TEXT[] DEFAULT '{}',
    reply_from_business TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, business_id)
);

-- =====================================================
-- 11. جدول الإبلاغات
-- =====================================================
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. جدول التحذيرات
-- =====================================================
CREATE TABLE public.warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    is_automatic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 13. جدول طلبات مراجعة التحذيرات (للذهبي والبلاتيني)
-- =====================================================
CREATE TABLE public.warning_review_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    warning_id UUID NOT NULL REFERENCES public.warnings(id) ON DELETE CASCADE,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- =====================================================
-- 14. جدول الإعلانات الممولة
-- =====================================================
CREATE TABLE public.advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    wilaya_code INTEGER NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 15. جدول طلبات الدفع للترقية
-- =====================================================
CREATE TABLE public.payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    requested_tier TEXT CHECK (requested_tier IN ('gold', 'platinum')),
    amount INTEGER NOT NULL,
    transfer_receipt_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- =====================================================
-- 16. جدول الإشعارات
-- =====================================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'system',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 17. جدول سجل الإحالات (Referral)
-- =====================================================
CREATE TABLE public.referral_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    months_awarded INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- الدوال والمؤشرات والفهارس
-- =====================================================

-- فهارس لتحسين الأداء
CREATE INDEX idx_business_profiles_wilaya ON public.business_profiles(wilaya_code);
CREATE INDEX idx_business_profiles_verification ON public.business_profiles(verification_status);
CREATE INDEX idx_business_profiles_subscription ON public.business_profiles(subscription_tier);
CREATE INDEX idx_business_profiles_avg_rating ON public.business_profiles(avg_rating DESC);
CREATE INDEX idx_business_profiles_created_at ON public.business_profiles(created_at DESC);
CREATE INDEX idx_business_profiles_is_online ON public.business_profiles(is_online);
CREATE INDEX idx_business_profiles_is_on_vacation ON public.business_profiles(is_on_vacation);
CREATE INDEX idx_business_profiles_services ON public.business_profiles USING GIN(services);
CREATE INDEX idx_business_profiles_location ON public.business_profiles(latitude, longitude);
CREATE INDEX idx_posts_business_id ON public.posts(business_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX idx_reviews_rating_overall ON public.reviews(rating_overall);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_favorites_customer ON public.favorites(customer_id);
CREATE INDEX idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX idx_advertisements_wilaya ON public.advertisements(wilaya_code);
CREATE INDEX idx_advertisements_active ON public.advertisements(is_active, ends_at);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX idx_reports_target ON public.reports(target_business_id, status);

-- =====================================================
-- دوال التحديث التلقائي
-- =====================================================

-- دالة تحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الزناد على الجداول
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_profiles_updated_at BEFORE UPDATE ON public.business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- دالة تحديث عدد المتابعين في business_profiles
-- =====================================================
CREATE OR REPLACE FUNCTION update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.business_profiles 
        SET followers_count = followers_count + 1 
        WHERE id = NEW.following_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.business_profiles 
        SET followers_count = followers_count - 1 
        WHERE id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_followers_count
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION update_followers_count();

-- =====================================================
-- دالة تحديث متوسط التقييمات وعددها
-- =====================================================
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- تحديث عدد التقييمات والمتوسط
        UPDATE public.business_profiles 
        SET 
            reviews_count = reviews_count + 1,
            avg_rating = (
                SELECT AVG(rating_overall)::DECIMAL(3,2)
                FROM public.reviews
                WHERE business_id = NEW.business_id
            )
        WHERE id = NEW.business_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.business_profiles 
        SET 
            reviews_count = reviews_count - 1,
            avg_rating = COALESCE((
                SELECT AVG(rating_overall)::DECIMAL(3,2)
                FROM public.reviews
                WHERE business_id = OLD.business_id
            ), 0)
        WHERE id = OLD.business_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_rating
AFTER INSERT OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_business_rating();

-- =====================================================
-- دالة التحذير التلقائي عند 3 بلاغات
-- =====================================================
CREATE OR REPLACE FUNCTION auto_warning_on_3_reports()
RETURNS TRIGGER AS $$
DECLARE
    report_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO report_count 
    FROM public.reports 
    WHERE target_business_id = NEW.target_business_id 
    AND status = 'pending';
    
    IF report_count >= 3 THEN
        INSERT INTO public.warnings (business_id, reason, is_automatic)
        VALUES (NEW.target_business_id, 'تلقى الحساب 3 بلاغات من المستخدمين', TRUE);
        
        -- إرسال إشعار تلقائي
        INSERT INTO public.notifications (user_id, message, type)
        VALUES (NEW.target_business_id, 'تم تسجيل 3 بلاغات ضد حسابك، سيتم مراجعته', 'warning');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_warning
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION auto_warning_on_3_reports();

-- =====================================================
-- دالة حذف القصص المنتهية تلقائياً
-- =====================================================
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void AS $$
BEGIN
    DELETE FROM public.stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- دالة التحقق من حد الحجوزات اليومي (للحسابات الفضية)
-- =====================================================
CREATE OR REPLACE FUNCTION check_daily_booking_limit()
RETURNS TRIGGER AS $$
DECLARE
    business_subscription TEXT;
    today_bookings INTEGER;
BEGIN
    SELECT subscription_tier INTO business_subscription
    FROM public.business_profiles
    WHERE id = NEW.business_id;
    
    IF business_subscription = 'silver' THEN
        SELECT COUNT(*) INTO today_bookings
        FROM public.bookings
        WHERE business_id = NEW.business_id
        AND DATE(created_at) = CURRENT_DATE;
        
        IF today_bookings >= 3 THEN
            RAISE EXCEPTION 'الحساب الفضي وصل إلى الحد اليومي للحجوزات (3 حجوزات)';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_daily_booking_limit
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION check_daily_booking_limit();

-- =====================================================
-- دالة حذف صور الهوية بعد قبول الحساب (تشفير server-side)
-- ملاحظة: يتم استدعاؤها من Edge Function أو Cron Job
-- =====================================================

-- جدول سجل حذف صور الهوية
CREATE TABLE public.id_cards_deletion_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_by TEXT DEFAULT 'system'
);