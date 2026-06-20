/**
 * ========================================
 * AUTHENTICATION MODULE
 * مشروع ليلى - LILA
 * التسجيل عبر Google Account فقط
 * ========================================
 */

// ========================================
// الحالة العامة
// ========================================
let currentUser = null;
let currentProfile = null;
let authListeners = [];

// ========================================
// الدوال الأساسية للمصادقة
// ========================================

/**
 * تسجيل الدخول عبر Google
 * @returns {Promise<object>} نتيجة عملية التسجيل
 */
async function signInWithGoogle() {
    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('[Auth] Google sign in error:', error);
        showAuthError('حدث خطأ أثناء تسجيل الدخول عبر Google');
        return { success: false, error: error.message };
    }
}

/**
 * تسجيل الخروج
 * @returns {Promise<boolean>}
 */
async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        currentProfile = null;
        notifyAuthListeners();
        
        // إعادة توجيه إلى الصفحة الرئيسية
        window.location.href = '/';
        return true;
    } catch (error) {
        console.error('[Auth] Sign out error:', error);
        return false;
    }
}

/**
 * جلب الجلسة الحالية
 * @returns {Promise<object>} الجلسة والمستخدم
 */
async function getCurrentSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        
        if (session) {
            currentUser = session.user;
            await loadUserProfile(currentUser.id);
        } else {
            currentUser = null;
            currentProfile = null;
        }
        
        notifyAuthListeners();
        return { session, user: currentUser, profile: currentProfile };
    } catch (error) {
        console.error('[Auth] Get session error:', error);
        return { session: null, user: null, profile: null };
    }
}

/**
 * تحميل ملف المستخدم من جدول profiles
 * @param {string} userId - معرف المستخدم
 */
async function loadUserProfile(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // لا يوجد ملف تعريف، نقوم بإنشائه
            await createUserProfile(userId);
            return await loadUserProfile(userId);
        }

        if (error) throw error;

        currentProfile = data;
        
        // التحقق من حظر الحساب
        if (currentProfile.is_banned) {
            console.warn('[Auth] Account is banned:', currentProfile.ban_reason);
            showAuthError(`تم حظر حسابك: ${currentProfile.ban_reason || 'الرجاء التواصل مع الدعم'}`);
            await signOut();
        }
        
        return currentProfile;
    } catch (error) {
        console.error('[Auth] Load profile error:', error);
        return null;
    }
}

/**
 * إنشاء ملف تعريف جديد للمستخدم
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<object>}
 */
async function createUserProfile(userId) {
    try {
        // جلب بيانات المستخدم من auth
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        const newProfile = {
            id: userId,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدمة',
            avatar_url: user.user_metadata?.avatar_url || null,
            user_type: 'customer', // افتراضياً مستخدمة عادية، يمكن ترقيته لاحقاً
            created_at: new Date(),
            updated_at: new Date(),
            is_banned: false
        };
        
        const { data, error } = await supabaseClient
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();
            
        if (error) throw error;
        
        currentProfile = data;
        return data;
    } catch (error) {
        console.error('[Auth] Create profile error:', error);
        throw error;
    }
}

/**
 * التحقق مما إذا كان المستخدم الحالي هو صاحبة حساب تجاري
 * @returns {Promise<boolean>}
 */
async function isBusinessAccount() {
    if (!currentProfile) return false;
    
    if (currentProfile.user_type === 'business') {
        return true;
    }
    
    // تحقق إضافي: هل يوجد سجل في business_profiles؟
    const { data, error } = await supabaseClient
        .from('business_profiles')
        .select('id')
        .eq('id', currentProfile.id)
        .single();
        
    if (error && error.code !== 'PGRST116') {
        console.error('[Auth] Check business account error:', error);
    }
    
    return !!data;
}

/**
 * التحقق مما إذا كان المستخدم الحالي هو أدمن
 * @returns {boolean}
 */
function isAdmin() {
    return currentProfile?.user_type === 'admin';
}

/**
 * الحصول على بيانات الحساب التجاري للمستخدم الحالي (إذا كان تاجرة)
 * @returns {Promise<object|null>}
 */
async function getCurrentBusinessProfile() {
    if (!currentProfile || currentProfile.user_type !== 'business') {
        return null;
    }
    
    const { data, error } = await supabaseClient
        .from('business_profiles')
        .select('*')
        .eq('id', currentProfile.id)
        .single();
        
    if (error) {
        console.error('[Auth] Get business profile error:', error);
        return null;
    }
    
    return data;
}

/**
 * ترقية حساب عادي إلى حساب تجاري (بعد موافقة الأدمن)
 * @param {object} businessData - بيانات الحساب التجاري
 * @returns {Promise<object>}
 */
async function upgradeToBusinessAccount(businessData) {
    if (!currentProfile) {
        throw new Error('يجب تسجيل الدخول أولاً');
    }
    
    // تحديث user_type في profiles
    await updateProfile(currentProfile.id, { user_type: 'business' });
    
    // إنشاء سجل في business_profiles
    const fullBusinessData = {
        id: currentProfile.id,
        ...businessData,
        verification_status: 'pending',
        created_at: new Date()
    };
    
    const newBusiness = await createBusinessProfile(fullBusinessData);
    
    // تحديث currentProfile
    currentProfile.user_type = 'business';
    notifyAuthListeners();
    
    return newBusiness;
}

// ========================================
// التحقق من تفرد حساب Google (حساب واحد فقط)
// ========================================

/**
 * التحقق مما إذا كان حساب Google قد استخدم بالفعل لإنشاء حساب
 * @param {string} email - البريد الإلكتروني من Google
 * @returns {Promise<boolean>}
 */
async function isGoogleAccountAlreadyUsed(email) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
        
    if (error && error.code === 'PGRST116') {
        return false; // لم يُستخدم بعد
    }
    
    return !!data;
}

// ========================================
// نظام الاستماع للتغييرات (للصفحات التي تحتاج تحديث واجهة)
// ========================================

/**
 * إضافة مستمع لتغييرات حالة المصادقة
 * @param {Function} listener - الدالة التي تُستدعى عند تغير المستخدم
 */
function addAuthListener(listener) {
    authListeners.push(listener);
}

/**
 * إزالة مستمع
 * @param {Function} listener - الدالة المراد إزالتها
 */
function removeAuthListener(listener) {
    authListeners = authListeners.filter(l => l !== listener);
}

/**
 * إعلام جميع المستمعين بتغير الحالة
 */
function notifyAuthListeners() {
    authListeners.forEach(listener => {
        try {
            listener(currentUser, currentProfile);
        } catch (e) {
            console.error('[Auth] Listener error:', e);
        }
    });
}

// ========================================
// واجهة المستخدم (UI Helpers)
// ========================================

/**
 * عرض رسالة خطأ للمستخدم
 * @param {string} message - نص الخطأ
 */
function showAuthError(message) {
    showToast(message, 'error');
}

/**
 * تحديث واجهة المستخدم بناءً على حالة المصادقة
 * يمكن استدعاؤها من أي صفحة لعرض/إخفاء عناصر مثل "تسجيل الدخول" و"حسابي"
 */
function updateUIForAuthState() {
    // عناصر تظهر فقط عند تسجيل الدخول
    document.querySelectorAll('.auth-required').forEach(el => {
        el.style.display = currentUser ? 'block' : 'none';
    });
    
    // عناصر تظهر فقط عند عدم تسجيل الدخول
    document.querySelectorAll('.guest-only').forEach(el => {
        el.style.display = currentUser ? 'none' : 'block';
    });
    
    // عناصر خاصة بالحسابات التجارية
    document.querySelectorAll('.business-only').forEach(el => {
        el.style.display = (currentProfile?.user_type === 'business') ? 'block' : 'none';
    });
    
    // عناصر خاصة بالأدمن
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = (currentProfile?.user_type === 'admin') ? 'block' : 'none';
    });
    
    // تحديث اسم المستخدم وصورته في الواجهة (إذا وجدت)
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = currentProfile?.full_name || 'زائرة';
    });
    
    const userAvatarElements = document.querySelectorAll('.user-avatar');
    userAvatarElements.forEach(el => {
        if (currentProfile?.avatar_url) {
            el.src = currentProfile.avatar_url;
        }
    });
}

// ========================================
// الاستماع لتغيرات المصادقة من Supabase
// ========================================

/**
 * تهيئة مستمع تغييرات المصادقة (يُستدعى مرة واحدة عند تحميل التطبيق)
 */
function initAuthListener() {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('[Auth] State changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            await loadUserProfile(currentUser.id);
            notifyAuthListeners();
            updateUIForAuthState();
            
            // إعادة توجيه أو تحديث الصفحة حسب الحاجة
            if (window.location.pathname === '/login.html') {
                window.location.href = '/';
            }
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentProfile = null;
            notifyAuthListeners();
            updateUIForAuthState();
        } else if (event === 'TOKEN_REFRESHED') {
            // تحديث الجلسة
            await getCurrentSession();
        }
    });
}

// ========================================
// التصدير والتهيئة الأولية
// ========================================

// تهيئة المستمع عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    initAuthListener();
    await getCurrentSession();
    updateUIForAuthState();
    window.auth.isReady = true;

// إضافة مستمع عام لتحديث الواجهة عند تغير الحالة
    addAuthListener(() =>
    updateUIForAuthState());
});

// تصدير الوظائف للاستخدام العام
window.auth = {
    signInWithGoogle,
    signOut,
    getCurrentSession,
    getCurrentUser: () => currentUser,
    getCurrentProfile: () => currentProfile,
    isBusinessAccount,
    isAdmin,
    getCurrentBusinessProfile,
    upgradeToBusinessAccount,
    isGoogleAccountAlreadyUsed,
    addAuthListener,
    removeAuthListener,
    updateUIForAuthState
};

console.log('[Auth] Module initialized');