-- ========================================
-- LILA DATABASE SCHEMA (Supabase/PostgreSQL)
-- مشروع صالونات وخدمات النساء في الجزائر
-- ========================================

-- 1. USERS (تمتد من auth.users)
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
    device_fingerprint TEXT -- للمستخدمات العاديات عند التقييم
);

-- 2. BUSINESS ACCOUNTS (الحسابات التجارية)
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
    services TEXT[] DEFAULT '{}', -- صالون حلاقة، صالون تجميل، حلاقة منزلية، حلاقة متنقلة، بائعة منتجات، مؤجرة أزياء، خدمات منزلية
    
    -- التوثيق
    id_front_url TEXT,
    id_back_url TEXT,
    commercial_registry_url TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    has_gold_badge BOOLEAN DEFAULT FALSE, -- علامة موثوق (سجل تجاري)
    verification_rejected_reason TEXT,
    
    -- التواجد الجغرافي
    wilaya_code INTEGER,
    wilaya_name TEXT,
    daira_name TEXT,
    baladiyah_name TEXT,
    address_description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    travel_range_km INTEGER DEFAULT 0, -- للحلاقات المتنقلات (كم)
    is_online BOOLEAN DEFAULT FALSE, -- متاحة الآن
    
    -- مواعيد العمل
    working_hours JSONB, -- { "saturday": "09:00-18:00", ... }
    contact_hours JSONB,
    
    -- خيارات إضافية
    is_mixte_salon BOOLEAN DEFAULT FALSE, -- يوجد رجال حلاقون
    is_on_vacation BOOLEAN DEFAULT FALSE,
    vacation_until DATE,
    
    -- الاشتراك
    subscription_tier TEXT DEFAULT 'silver' CHECK (subscription_tier IN ('silver', 'gold', 'platinum')),
    subscription_expires_at TIMESTAMPTZ,
    referral_used_by UUID REFERENCES public.business_profiles(id), -- من رشحها
    referral_months_earned INTEGER DEFAULT 0, -- شهور مجانية مستحقة
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BUSINESS GALLERY (ألبوم الصور مع تصنيف)
CREATE TABLE public.business_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    category TEXT CHECK (category IN ('before_after', 'completed_work', 'products')),
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SHORT VIDEOS (فيديو 15 ثانية)
CREATE TABLE public.business_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STORIES (قصص 24 ساعة - ذهبي/بلاتيني فقط)
CREATE TABLE public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    expires_at TIMESTAMPTZ NOT NULL, -- created_at + 24 hours
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. POSTS (منشورات مكتوبة)
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- max 500 words
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. FOLLOWS (متابعة)
CREATE TABLE public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- المستخدمة العادية
    following_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE, -- الحساب التجاري
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- 8. FAVORITES (مفضلة - مستقلة عن المتابعة)
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, business_id)
);

-- 9. BOOKINGS (حجوزات)
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL, -- حجز موعد صالون، حجز فستان، طلب منتج، طلب خدمة منزلية
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    customer_notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    is_emergency BOOLEAN DEFAULT FALSE, -- طوارئ نسائية (خلال ساعتين)
    emergency_fee INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. REVIEWS (تقييمات 5 نجوم مع تقييمات فرعية)
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating_quality INTEGER CHECK (rating_quality >= 1 AND rating_quality <= 5),
    rating_price INTEGER CHECK (rating_price >= 1 AND rating_price <= 5),
    rating_manners INTEGER CHECK (rating_manners >= 1 AND rating_manners <= 5),
    rating_overall INTEGER CHECK (rating_overall >= 1 AND rating_overall <= 5),
    comment TEXT,
    images TEXT[] DEFAULT '{}',
    reply_from_business TEXT, -- رد واحد فقط لكل تقييم
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, business_id) -- كل مستخدمة تقييم واحد فقط لكل حساب
);

-- 11. REPORTS (إبلاغات)
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. WARNINGS (تحذيرات للحسابات التجارية)
CREATE TABLE public.warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    is_automatic BOOLEAN DEFAULT FALSE, -- تحذير آلي بعد 3 بلاغات
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ADVERTISEMENTS (إعلانات ممولة)
CREATE TABLE public.advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    wilaya_code INTEGER NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. PAYMENT_REQUESTS (طلبات الدفع للترقية)
CREATE TABLE public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    requested_tier TEXT CHECK (requested_tier IN ('gold', 'platinum')),
    amount INTEGER NOT NULL, -- 3000 أو 6000 دج
    transfer_receipt_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ========================================
-- FUNCTIONS & TRIGGERS
-- ========================================

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_profiles_updated_at BEFORE UPDATE ON public.business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- التحذير التلقائي عند 3 بلاغات
CREATE OR REPLACE FUNCTION auto_warning_on_3_reports()
RETURNS TRIGGER AS $$
DECLARE
    report_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO report_count FROM public.reports WHERE target_business_id = NEW.target_business_id AND status = 'pending';
    IF report_count >= 3 THEN
        INSERT INTO public.warnings (business_id, reason, is_automatic)
        VALUES (NEW.target_business_id, 'تلقى الحساب 3 بلاغات', TRUE);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_warning AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION auto_warning_on_3_reports();