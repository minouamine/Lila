/**
 * ========================================
 * SUPABASE CLIENT CONFIGURATION
 * مشروع ليلى - LILA
 * ========================================
 */

// Supabase configuration - استبدل هذه القيم بقيم مشروعك الفعلية من لوحة تحكم Supabase
// استبدل هذين السطرين:
// const SUPABASE_URL = 'https://your-project.supabase.co';
// const SUPABASE_ANON_KEY = 'your-anon-key-here';

// بهذا:
const SUPABASE_URL = 'https://wwziobpnphffdfzhvhip.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3emlvYnBucGhmZmRmemh2aGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjgxNjMsImV4cCI6MjA5NTU0NDE2M30.BBRL1MjPG-2bN4LDqcyfXlxIRSaLPvBEY6U3FBrDnF4';

// تهيئة عميل Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================
// REALTIME SUBSCRIPTIONS (تحديث تلقائي)
// ========================================

/**
 * الاشتراك في التحديثات المباشرة لجدول معين
 * @param {string} table - اسم الجدول (posts, follows, bookings, reviews, stories)
 * @param {string} filterColumn - عمود التصفية (مثل business_id)
 * @param {string} filterValue - قيمة التصفية
 * @param {Function} onInsert - دالة تُستدعى عند إدراج جديد
 * @param {Function} onUpdate - دالة تُستدعى عند تحديث
 * @param {Function} onDelete - دالة تُستدعى عند حذف
 * @returns {object} الكائن المشترك (لإلغاء الاشتراك لاحقاً)
 */
function subscribeToRealtime(table, filterColumn, filterValue, onInsert, onUpdate, onDelete) {
    const channel = supabaseClient
        .channel(`${table}_changes`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: table,
                filter: `${filterColumn}=eq.${filterValue}`
            },
            (payload) => {
                console.log(`[Realtime] INSERT in ${table}:`, payload);
                if (onInsert) onInsert(payload.new);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: table,
                filter: `${filterColumn}=eq.${filterValue}`
            },
            (payload) => {
                console.log(`[Realtime] UPDATE in ${table}:`, payload);
                if (onUpdate) onUpdate(payload.new);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: table,
                filter: `${filterColumn}=eq.${filterValue}`
            },
            (payload) => {
                console.log(`[Realtime] DELETE in ${table}:`, payload);
                if (onDelete) onDelete(payload.old);
            }
        )
        .subscribe();

    return channel;
}

/**
 * إلغاء الاشتراك من قناة معينة
 * @param {object} channel - القناة المراد إلغاء الاشتراك منها
 */
async function unsubscribeFromRealtime(channel) {
    if (channel) {
        await supabaseClient.removeChannel(channel);
        console.log('[Realtime] Unsubscribed from channel');
    }
}

// ========================================
// CRUD OPERATIONS - PROFILES
// ========================================

/**
 * جلب ملف المستخدم حسب المعرف
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<object>} بيانات الملف الشخصي
 */
async function getProfileById(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data;
}

/**
 * تحديث ملف المستخدم
 * @param {string} userId - معرف المستخدم
 * @param {object} updates - الحقول المراد تحديثها
 * @returns {Promise<object>} نتيجة العملية
 */
async function updateProfile(userId, updates) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
    return data;
}

// ========================================
// CRUD OPERATIONS - BUSINESS PROFILES
// ========================================

/**
 * جلب الحسابات التجارية مع فلترة اختيارية
 * @param {object} filters - فلترة (wilaya_code, services, is_online, subscription_tier)
 * @param {number} limit - عدد النتائج
 * @param {number} offset - الإزاحة للصفحات
 * @returns {Promise<Array>} قائمة الحسابات التجارية
 */
async function getBusinessProfiles(filters = {}, limit = 20, offset = 0) {
    let query = supabaseClient
        .from('business_profiles')
        .select('*, profiles!inner(full_name, avatar_url)')
        .eq('verification_status', 'approved')
        .eq('is_banned', false);

    // تطبيق الفلاتر
    if (filters.wilaya_code) {
        query = query.eq('wilaya_code', filters.wilaya_code);
    }
    if (filters.services && filters.services.length > 0) {
        query = query.overlaps('services', filters.services);
    }
    if (filters.is_online !== undefined) {
        query = query.eq('is_online', filters.is_online);
    }
    if (filters.subscription_tier) {
        query = query.eq('subscription_tier', filters.subscription_tier);
    }
    if (filters.searchQuery) {
        query = query.or(`business_name.ilike.%${filters.searchQuery}%,username.ilike.%${filters.searchQuery}%`);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
        console.error('Error fetching business profiles:', error);
        return [];
    }
    return data;
}

/**
 * جلب حساب تجاري واحد حسب المعرف
 * @param {string} businessId - معرف الحساب التجاري
 * @returns {Promise<object>} بيانات الحساب
 */
async function getBusinessProfileById(businessId) {
    const { data, error } = await supabaseClient
        .from('business_profiles')
        .select('*, profiles!inner(full_name, avatar_url)')
        .eq('id', businessId)
        .single();

    if (error) {
        console.error('Error fetching business profile:', error);
        return null;
    }
    return data;
}

/**
 * إنشاء حساب تجاري جديد (بعد موافقة الأدمن)
 * @param {object} businessData - بيانات الحساب التجاري
 * @returns {Promise<object>} الحساب المنشأ
 */
async function createBusinessProfile(businessData) {
    const { data, error } = await supabaseClient
        .from('business_profiles')
        .insert(businessData)
        .select()
        .single();

    if (error) {
        console.error('Error creating business profile:', error);
        throw error;
    }
    return data;
}

/**
 * تحديث حساب تجاري
 * @param {string} businessId - معرف الحساب
 * @param {object} updates - الحقول المراد تحديثها
 * @returns {Promise<object>} الحساب المحدث
 */
async function updateBusinessProfile(businessId, updates) {
    const { data, error } = await supabaseClient
        .from('business_profiles')
        .update(updates)
        .eq('id', businessId)
        .select()
        .single();

    if (error) {
        console.error('Error updating business profile:', error);
        throw error;
    }
    return data;
}

// ========================================
// CRUD OPERATIONS - POSTS
// ========================================

/**
 * جلب منشورات حساب تجاري معين
 * @param {string} businessId - معرف الحساب التجاري
 * @param {number} limit - عدد المنشورات
 * @returns {Promise<Array>} قائمة المنشورات
 */
async function getPostsByBusiness(businessId, limit = 20) {
    const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
    return data;
}

/**
 * إنشاء منشور جديد
 * @param {object} postData - بيانات المنشور (business_id, content, image_urls)
 * @returns {Promise<object>} المنشور المنشأ
 */
async function createPost(postData) {
    const { data, error } = await supabaseClient
        .from('posts')
        .insert(postData)
        .select()
        .single();

    if (error) {
        console.error('Error creating post:', error);
        throw error;
    }
    return data;
}

/**
 * حذف منشور
 * @param {string} postId - معرف المنشور
 * @returns {Promise<boolean>} نجاح العملية
 */
async function deletePost(postId) {
    const { error } = await supabaseClient
        .from('posts')
        .delete()
        .eq('id', postId);

    if (error) {
        console.error('Error deleting post:', error);
        return false;
    }
    return true;
}

// ========================================
// CRUD OPERATIONS - FOLLOWS & FAVORITES
// ========================================

/**
 * متابعة حساب تجاري
 * @param {string} followerId - معرف المستخدمة العادية
 * @param {string} followingId - معرف الحساب التجاري
 * @returns {Promise<object>} نتيجة العملية
 */
async function followBusiness(followerId, followingId) {
    const { data, error } = await supabaseClient
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId })
        .select()
        .single();

    if (error) {
        console.error('Error following business:', error);
        throw error;
    }
    return data;
}

/**
 * إلغاء متابعة حساب تجاري
 * @param {string} followerId - معرف المستخدمة العادية
 * @param {string} followingId - معرف الحساب التجاري
 * @returns {Promise<boolean>} نجاح العملية
 */
async function unfollowBusiness(followerId, followingId) {
    const { error } = await supabaseClient
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

    if (error) {
        console.error('Error unfollowing business:', error);
        return false;
    }
    return true;
}

/**
 * التحقق مما إذا كانت المستخدمة تتابع حساباً معيناً
 * @param {string} followerId - معرف المستخدمة
 * @param {string} followingId - معرف الحساب التجاري
 * @returns {Promise<boolean>}
 */
async function isFollowing(followerId, followingId) {
    const { data, error } = await supabaseClient
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error);
    }
    return !!data;
}

/**
 * إضافة حساب إلى المفضلة
 * @param {string} customerId - معرف المستخدمة
 * @param {string} businessId - معرف الحساب التجاري
 * @returns {Promise<object>}
 */
async function addToFavorites(customerId, businessId) {
    const { data, error } = await supabaseClient
        .from('favorites')
        .insert({ customer_id: customerId, business_id: businessId })
        .select()
        .single();

    if (error) {
        console.error('Error adding to favorites:', error);
        throw error;
    }
    return data;
}

/**
 * إزالة حساب من المفضلة
 * @param {string} customerId - معرف المستخدمة
 * @param {string} businessId - معرف الحساب التجاري
 * @returns {Promise<boolean>}
 */
async function removeFromFavorites(customerId, businessId) {
    const { error } = await supabaseClient
        .from('favorites')
        .delete()
        .eq('customer_id', customerId)
        .eq('business_id', businessId);

    if (error) {
        console.error('Error removing from favorites:', error);
        return false;
    }
    return true;
}

// ========================================
// CRUD OPERATIONS - BOOKINGS
// ========================================

/**
 * إنشاء حجز جديد
 * @param {object} bookingData - بيانات الحجز
 * @returns {Promise<object>}
 */
async function createBooking(bookingData) {
    const { data, error } = await supabaseClient
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

    if (error) {
        console.error('Error creating booking:', error);
        throw error;
    }
    return data;
}

/**
 * جلب حجوزات المستخدمة (كعميلة)
 * @param {string} customerId - معرف المستخدمة
 * @returns {Promise<Array>}
 */
async function getCustomerBookings(customerId) {
    const { data, error } = await supabaseClient
        .from('bookings')
        .select('*, business_profiles(business_name, logo_url)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching customer bookings:', error);
        return [];
    }
    return data;
}

/**
 * جلب حجوزات حساب تجاري (كصاحبة خدمة)
 * @param {string} businessId - معرف الحساب التجاري
 * @returns {Promise<Array>}
 */
async function getBusinessBookings(businessId) {
    const { data, error } = await supabaseClient
        .from('bookings')
        .select('*, profiles(full_name, avatar_url)')
        .eq('business_id', businessId)
        .order('booking_date', { ascending: true });

    if (error) {
        console.error('Error fetching business bookings:', error);
        return [];
    }
    return data;
}

/**
 * تحديث حالة الحجز
 * @param {string} bookingId - معرف الحجز
 * @param {string} status - الحالة الجديدة
 * @returns {Promise<object>}
 */
async function updateBookingStatus(bookingId, status) {
    const { data, error } = await supabaseClient
        .from('bookings')
        .update({ status: status, updated_at: new Date() })
        .eq('id', bookingId)
        .select()
        .single();

    if (error) {
        console.error('Error updating booking status:', error);
        throw error;
    }
    return data;
}

// ========================================
// CRUD OPERATIONS - REVIEWS
// ========================================

/**
 * إنشاء تقييم جديد
 * @param {object} reviewData - بيانات التقييم
 * @returns {Promise<object>}
 */
async function createReview(reviewData) {
    const { data, error } = await supabaseClient
        .from('reviews')
        .insert(reviewData)
        .select()
        .single();

    if (error) {
        console.error('Error creating review:', error);
        throw error;
    }
    return data;
}

/**
 * جلب تقييمات حساب تجاري
 * @param {string} businessId - معرف الحساب التجاري
 * @param {number} limit - عدد التقييمات
 * @returns {Promise<Array>}
 */
async function getReviewsByBusiness(businessId, limit = 50) {
    const { data, error } = await supabaseClient
        .from('reviews')
        .select('*, profiles(full_name, avatar_url)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
    return data;
}

/**
 * الرد على تقييم (لصاحبة الحساب التجاري فقط)
 * @param {string} reviewId - معرف التقييم
 * @param {string} reply - نص الرد
 * @returns {Promise<object>}
 */
async function replyToReview(reviewId, reply) {
    const { data, error } = await supabaseClient
        .from('reviews')
        .update({ reply_from_business: reply, replied_at: new Date() })
        .eq('id', reviewId)
        .select()
        .single();

    if (error) {
        console.error('Error replying to review:', error);
        throw error;
    }
    return data;
}

// ========================================
// STORAGE (رفع الصور والفيديوهات)
// ========================================

/**
 * رفع ملف إلى Supabase Storage
 * @param {string} bucket - اسم الـ bucket (business_images, id_cards, videos)
 * @param {string} path - المسار داخل الـ bucket
 * @param {File} file - الملف المراد رفعه
 * @returns {Promise<string>} الرابط العام للملف
 */
async function uploadFile(bucket, path, file) {
    const { data, error } = await supabaseClient.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        console.error('Error uploading file:', error);
        throw error;
    }

    // جلب الرابط العام
    const { data: publicUrlData } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
}

/**
 * حذف ملف من Supabase Storage
 * @param {string} bucket - اسم الـ bucket
 * @param {string} path - المسار داخل الـ bucket
 * @returns {Promise<boolean>}
 */
async function deleteFile(bucket, path) {
    const { error } = await supabaseClient.storage
        .from(bucket)
        .remove([path]);

    if (error) {
        console.error('Error deleting file:', error);
        return false;
    }
    return true;
}

// تصدير الوظائف للاستخدام في الملفات الأخرى
window.supabaseClient = supabaseClient;
window.lilaAPI = {
    // Realtime
    subscribeToRealtime,
    unsubscribeFromRealtime,
    // Profiles
    getProfileById,
    updateProfile,
    // Business
    getBusinessProfiles,
    getBusinessProfileById,
    createBusinessProfile,
    updateBusinessProfile,
    // Posts
    getPostsByBusiness,
    createPost,
    deletePost,
    // Follows & Favorites
    followBusiness,
    unfollowBusiness,
    isFollowing,
    addToFavorites,
    removeFromFavorites,
    // Bookings
    createBooking,
    getCustomerBookings,
    getBusinessBookings,
    updateBookingStatus,
    // Reviews
    createReview,
    getReviewsByBusiness,
    replyToReview,
    // Storage
    uploadFile,
    deleteFile
};

console.log('[Supabase] Client initialized successfully');

