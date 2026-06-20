/**
 * ========================================
 * ADMIN MODULE
 * مشروع ليلى - LILA
 * لوحة تحكم الأدمن (قبول الحسابات، إدارة المستخدمين، طلبات الدفع)
 * ========================================
 */

// ========================================
// الحالة العامة
// ========================================

let currentAdmin = null;
let pendingBusinesses = [];
let activeBusinesses = [];
let paymentRequests = [];
let reportsList = [];
let warningReviews = [];

// ========================================
// التحقق من صلاحيات الأدمن
// ========================================

/**
 * التحقق مما إذا كان المستخدم الحالي أدمن
 * @returns {Promise<boolean>}
 */
async function isAdminUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return false;
    
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();
    
    if (error || !data) return false;
    return data.user_type === 'admin';
}

/**
 * التحقق من صلاحية الأدمن وإعادة التوجيه إذا لم يكن أدمن
 * @returns {Promise<boolean>}
 */
async function requireAdmin() {
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// ========================================
// جلب البيانات للوحة التحكم
// ========================================

/**
 * جلب الحسابات التجارية قيد المراجعة
 * @returns {Promise<Array>}
 */
async function fetchPendingBusinesses() {
    const { data, error } = await supabaseClient
        .from('business_profiles')
        .select('*, profiles!inner(email, full_name, avatar_url)')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('[Admin] Error fetching pending businesses:', error);
        return [];
    }
    
    pendingBusinesses = data;
    return data;
}

/**
 * جلب الحسابات التجارية النشطة
 * @returns {Promise<Array>}
 */
async function fetchActiveBusinesses() {
    const { data, error } = await supabaseClient
        .from('business_profiles')
        .select('*, profiles!inner(email, full_name, avatar_url, is_banned)')
        .eq('verification_status', 'approved')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('[Admin] Error fetching active businesses:', error);
        return [];
    }
    
    activeBusinesses = data;
    return data;
}

/**
 * جلب طلبات الدفع
 * @returns {Promise<Array>}
 */
async function fetchPaymentRequests() {
    const { data, error } = await supabaseClient
        .from('payment_requests')
        .select('*, business_profiles(business_name, username, logo_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('[Admin] Error fetching payment requests:', error);
        return [];
    }
    
    paymentRequests = data;
    return data;
}

/**
 * جلب الإبلاغات
 * @returns {Promise<Array>}
 */
async function fetchReports() {
    const { data, error } = await supabaseClient
        .from('reports')
        .select('*, profiles(full_name, avatar_url), business_profiles(business_name, username)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('[Admin] Error fetching reports:', error);
        return [];
    }
    
    reportsList = data;
    return data;
}

/**
 * جلب طلبات مراجعة التحذيرات (للذهبي والبلاتيني)
 * @returns {Promise<Array>}
 */
async function fetchWarningReviews() {
    // طلبات مراجعة التحذيرات يمكن تخزينها في جدول منفصل
    // هنا نفترض جدول warning_review_requests
    const { data, error } = await supabaseClient
        .from('warning_review_requests')
        .select('*, business_profiles(business_name, username, subscription_tier)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    
    if (error && error.code !== '42P01') {
        console.error('[Admin] Error fetching warning reviews:', error);
    }
    
    warningReviews = data || [];
    return warningReviews;
}

/**
 * جلب الإحصائيات العامة
 * @returns {Promise<object>}
 */
async function fetchAdminStats() {
    // عدد المستخدمين العاديين
    const { count: customersCount } = await supabaseClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'customer');
    
    // عدد الحسابات التجارية
    const { count: businessesCount } = await supabaseClient
        .from('business_profiles')
        .select('*', { count: 'exact', head: true });
    
    // عدد التقييمات
    const { count: reviewsCount } = await supabaseClient
        .from('reviews')
        .select('*', { count: 'exact', head: true });
    
    // عدد الإبلاغات المعلقة
    const { count: pendingReportsCount } = await supabaseClient
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
    
    return {
        customers: customersCount || 0,
        businesses: businessesCount || 0,
        reviews: reviewsCount || 0,
        pendingReports: pendingReportsCount || 0
    };
}

// ========================================
// إدارة الحسابات التجارية
// ========================================

/**
 * قبول حساب تجاري
 * @param {string} businessId - معرف الحساب
 * @returns {Promise<boolean>}
 */
async function approveBusiness(businessId) {
    try {
        // تحديث حالة التحقق
        const { error } = await supabaseClient
            .from('business_profiles')
            .update({ 
                verification_status: 'approved',
                updated_at: new Date()
            })
            .eq('id', businessId);
        
        if (error) throw error;
        
        // حذف صور الهوية بعد القبول (تشفير server-side يتم تلقائياً)
        await deleteIdCards(businessId);
        
        // تسجيل في logs
        console.log(`[Admin] Business ${businessId} approved`);
        
        // إرسال إشعار لصاحبة الحساب
        await sendNotification(businessId, 'تم قبول حسابك التجاري بنجاح');
        
        return true;
    } catch (error) {
        console.error('[Admin] Error approving business:', error);
        return false;
    }
}

/**
 * رفض حساب تجاري
 * @param {string} businessId - معرف الحساب
 * @param {string} reason - سبب الرفض
 * @returns {Promise<boolean>}
 */
async function rejectBusiness(businessId, reason) {
    try {
        const { error } = await supabaseClient
            .from('business_profiles')
            .update({ 
                verification_status: 'rejected',
                verification_rejected_reason: reason,
                updated_at: new Date()
            })
            .eq('id', businessId);
        
        if (error) throw error;
        
        // حذف صور الهوية
        await deleteIdCards(businessId);
        
        // إرسال إشعار بالرفض مع السبب
        await sendNotification(businessId, `تم رفض حسابك: ${reason}`);
        
        return true;
    } catch (error) {
        console.error('[Admin] Error rejecting business:', error);
        return false;
    }
}

/**
 * حذف صور الهوية بعد المعالجة
 * @param {string} businessId
 */
async function deleteIdCards(businessId) {
    try {
        const { data } = await supabaseClient
            .from('business_profiles')
            .select('id_front_url, id_back_url')
            .eq('id', businessId)
            .single();
        
        if (data) {
            if (data.id_front_url) {
                const path = data.id_front_url.split('/').pop();
                await supabaseClient.storage.from('id_cards').remove([path]);
            }
            if (data.id_back_url) {
                const path = data.id_back_url.split('/').pop();
                await supabaseClient.storage.from('id_cards').remove([path]);
            }
        }
        
        // تسجيل وقت الحذف في logs
        console.log(`[Admin] ID cards deleted for ${businessId} at ${new Date().toISOString()}`);
    } catch (error) {
        console.error('[Admin] Error deleting ID cards:', error);
    }
}

/**
 * حظر حساب تجاري
 * @param {string} businessId
 * @param {string} reason
 * @returns {Promise<boolean>}
 */
async function banBusiness(businessId, reason) {
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ 
                is_banned: true, 
                ban_reason: reason,
                updated_at: new Date()
            })
            .eq('id', businessId);
        
        if (error) throw error;
        
        await sendNotification(businessId, `تم حظر حسابك: ${reason}`);
        return true;
    } catch (error) {
        console.error('[Admin] Error banning business:', error);
        return false;
    }
}

/**
 * رفع الحظر عن حساب تجاري
 * @param {string} businessId
 * @returns {Promise<boolean>}
 */
async function unbanBusiness(businessId) {
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ 
                is_banned: false, 
                ban_reason: null,
                updated_at: new Date()
            })
            .eq('id', businessId);
        
        if (error) throw error;
        
        await sendNotification(businessId, 'تم رفع الحظر عن حسابك');
        return true;
    } catch (error) {
        console.error('[Admin] Error unbanning business:', error);
        return false;
    }
}

/**
 * حذف حساب تجاري نهائياً
 * @param {string} businessId
 * @returns {Promise<boolean>}
 */
async function deleteBusiness(businessId) {
    try {
        // حذف من business_profiles (cascade ستحذف كل شيء)
        const { error } = await supabaseClient
            .from('business_profiles')
            .delete()
            .eq('id', businessId);
        
        if (error) throw error;
        
        // حذف الملف الشخصي
        await supabaseClient
            .from('profiles')
            .delete()
            .eq('id', businessId);
        
        return true;
    } catch (error) {
        console.error('[Admin] Error deleting business:', error);
        return false;
    }
}

// ========================================
// إدارة طلبات الدفع
// ========================================

/**
 * قبول طلب دفع وترقية الحساب
 * @param {string} paymentId - معرف طلب الدفع
 * @param {string} businessId - معرف الحساب التجاري
 * @param {string} tier - الاشتراك المطلوب (gold/platinum)
 * @returns {Promise<boolean>}
 */
async function approvePayment(paymentId, businessId, tier) {
    try {
        // حساب تاريخ انتهاء الاشتراك
        const months = tier === 'gold' ? 3 : 6;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + months);
        
        // تحديث الاشتراك في business_profiles
        const { error: updateError } = await supabaseClient
            .from('business_profiles')
            .update({
                subscription_tier: tier,
                subscription_expires_at: expiresAt.toISOString(),
                updated_at: new Date()
            })
            .eq('id', businessId);
        
        if (updateError) throw updateError;
        
        // تحديث حالة طلب الدفع
        const { error: paymentError } = await supabaseClient
            .from('payment_requests')
            .update({
                status: 'approved',
                processed_at: new Date()
            })
            .eq('id', paymentId);
        
        if (paymentError) throw paymentError;
        
        // إرسال إشعار
        const tierName = tier === 'gold' ? 'ذهبي' : 'بلاتيني';
        await sendNotification(businessId, `تم ترقية حسابك إلى الاشتراك ${tierName} لمدة ${months} أشهر`);
        
        return true;
    } catch (error) {
        console.error('[Admin] Error approving payment:', error);
        return false;
    }
}

/**
 * رفض طلب دفع
 * @param {string} paymentId
 * @param {string} reason
 * @returns {Promise<boolean>}
 */
async function rejectPayment(paymentId, businessId, reason) {
    try {
        const { error } = await supabaseClient
            .from('payment_requests')
            .update({
                status: 'rejected',
                admin_notes: reason,
                processed_at: new Date()
            })
            .eq('id', paymentId);
        
        if (error) throw error;
        
        await sendNotification(businessId, `تم رفض طلب الترقية: ${reason}`);
        return true;
    } catch (error) {
        console.error('[Admin] Error rejecting payment:', error);
        return false;
    }
}

// ========================================
// إدارة الإبلاغات والتحذيرات
// ========================================

/**
 * معالجة إبلاغ (تجاهل أو تحذير)
 * @param {string} reportId
 * @param {string} businessId
 * @param {string} action - 'dismiss' أو 'warn'
 * @returns {Promise<boolean>}
 */
async function processReport(reportId, businessId, action) {
    try {
        // تحديث حالة الإبلاغ
        await supabaseClient
            .from('reports')
            .update({
                status: 'reviewed',
                updated_at: new Date()
            })
            .eq('id', reportId);
        
        if (action === 'warn') {
            // إضافة تحذير للحساب
            await supabaseClient
                .from('warnings')
                .insert({
                    business_id: businessId,
                    reason: 'تم الإبلاغ عن الحساب من قبل المستخدمين',
                    is_automatic: false,
                    created_at: new Date()
                });
            
            // التحقق من عدد التحذيرات
            const { count } = await supabaseClient
                .from('warnings')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId);
            
            if (count >= 3) {
                await sendNotification(businessId, 'تم تسجيل 3 تحذيرات ضد حسابك، سيتم مراجعته');
            } else {
                await sendNotification(businessId, `تم تسجيل تحذير ضد حسابك (${count}/3)`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('[Admin] Error processing report:', error);
        return false;
    }
}

/**
 * قبول طلب مراجعة تحذير (إزالة التحذير)
 * @param {string} requestId
 * @param {string} businessId
 * @param {string} warningId
 * @returns {Promise<boolean>}
 */
async function approveWarningReview(requestId, businessId, warningId) {
    try {
        // حذف التحذير
        await supabaseClient
            .from('warnings')
            .delete()
            .eq('id', warningId);
        
        // تحديث حالة الطلب
        await supabaseClient
            .from('warning_review_requests')
            .update({ status: 'approved', processed_at: new Date() })
            .eq('id', requestId);
        
        await sendNotification(businessId, 'تم قبول طلب مراجعة التحذير وتم إزالته');
        return true;
    } catch (error) {
        console.error('[Admin] Error approving warning review:', error);
        return false;
    }
}

/**
 * رفض طلب مراجعة تحذير
 * @param {string} requestId
 * @param {string} businessId
 * @param {string} reason
 * @returns {Promise<boolean>}
 */
async function rejectWarningReview(requestId, businessId, reason) {
    try {
        await supabaseClient
            .from('warning_review_requests')
            .update({ 
                status: 'rejected', 
                admin_notes: reason,
                processed_at: new Date() 
            })
            .eq('id', requestId);
        
        await sendNotification(businessId, `تم رفض طلب مراجعة التحذير: ${reason}`);
        return true;
    } catch (error) {
        console.error('[Admin] Error rejecting warning review:', error);
        return false;
    }
}

// ========================================
// إرسال الإشعارات
// ========================================

/**
 * إرسال إشعار لمستخدم
 * @param {string} userId
 * @param {string} message
 * @param {string} type
 */
async function sendNotification(userId, message, type = 'system') {
    try {
        // تخزين الإشعار في قاعدة البيانات
        await supabaseClient
            .from('notifications')
            .insert({
                user_id: userId,
                message: message,
                type: type,
                read: false,
                created_at: new Date()
            });
        
        // إرسال إشعار عبر البريد الإلكتروني (اختياري)
        // يمكن تفعيل إرسال إيميل عبر Edge Function
    } catch (error) {
        console.error('[Admin] Error sending notification:', error);
    }
}

// ========================================
// دوال مساعدة للواجهة
// ========================================

/**
 * عرض صور الهوية في مودال
 * @param {string} frontUrl
 * @param {string} backUrl
 */
function showIdCardsModal(frontUrl, backUrl) {
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        gap: 20px;
    `;
    
    modal.innerHTML = `
        <button id="closeIdModal" style="position:absolute;top:20px;right:20px;background:#ef4444;border:none;color:white;padding:10px20px;border-radius:8px;cursor:pointer;">إغلاق</button>
        <div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;">
            <div>
                <h3 style="color:white;text-align:center;">الوجه</h3>
                <img src="${frontUrl}" style="max-width:300px;max-height:400px;border-radius:10px;">
            </div>
            <div>
                <h3 style="color:white;text-align:center;">الظهر</h3>
                <img src="${backUrl}" style="max-width:300px;max-height:400px;border-radius:10px;">
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeIdModal').onclick = () => modal.remove();
}

/**
 * تحديث واجهة لوحة التحكم
 * @param {HTMLElement} container
 */
async function renderAdminDashboard(container) {
    if (!container) return;
    
    const stats = await fetchAdminStats();
    const pending = await fetchPendingBusinesses();
    const payments = await fetchPaymentRequests();
    const reports = await fetchReports();
    
    container.innerHTML = `
        <div class="admin-stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.customers}</div>
                <div class="stat-label">مستخدمات عاديات</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.businesses}</div>
                <div class="stat-label">حسابات تجارية</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.reviews}</div>
                <div class="stat-label">تقييمات</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.pendingReports}</div>
                <div class="stat-label">إبلاغات معلقة</div>
            </div>
        </div>
        
        <div class="admin-section">
            <h2>📋 حسابات قيد المراجعة (${pending.length})</h2>
            <div class="pending-list">
                ${pending.map(b => renderPendingBusinessCard(b)).join('')}
            </div>
        </div>
        
        <div class="admin-section">
            <h2>💰 طلبات الدفع (${payments.length})</h2>
            <div class="payments-list">
                ${payments.map(p => renderPaymentRequestCard(p)).join('')}
            </div>
        </div>
        
        <div class="admin-section">
            <h2>⚠️ الإبلاغات (${reports.length})</h2>
            <div class="reports-list">
                ${reports.map(r => renderReportCard(r)).join('')}
            </div>
        </div>
    `;
}

function renderPendingBusinessCard(business) {
    return `
        <div class="admin-card" data-id="${business.id}">
            <div class="card-header">
                <img src="${business.profiles.avatar_url || '/assets/images/default-avatar.png'}" class="card-avatar">
                <div class="card-info">
                    <h3>${business.business_name}</h3>
                    <p>@${business.username}</p>
                    <p>${business.profiles.email}</p>
                </div>
            </div>
            <div class="card-details">
                <p><strong>التخصصات:</strong> ${business.services?.join(', ') || 'غير محدد'}</p>
                <p><strong>الولاية:</strong> ${business.wilaya_name}</p>
                <p><strong>تاريخ التسجيل:</strong> ${new Date(business.created_at).toLocaleDateString()}</p>
            </div>
            <div class="card-actions">
                <button class="btn-view-id" data-front="${business.id_front_url}" data-back="${business.id_back_url}">📄 عرض الهوية</button>
                <button class="btn-approve" data-id="${business.id}">✅ قبول</button>
                <button class="btn-reject" data-id="${business.id}">❌ رفض</button>
            </div>
        </div>
    `;
}

function renderPaymentRequestCard(payment) {
    return `
        <div class="admin-card" data-id="${payment.id}">
            <div class="card-header">
                <div class="card-info">
                    <h3>${payment.business_profiles?.business_name || 'غير معروف'}</h3>
                    <p>@${payment.business_profiles?.username || ''}</p>
                </div>
                <div class="card-badge">${payment.requested_tier === 'gold' ? '🥇 ذهبي' : '💎 بلاتيني'}</div>
            </div>
            <div class="card-details">
                <p><strong>المبلغ:</strong> ${payment.amount} دج</p>
                <p><strong>تاريخ الطلب:</strong> ${new Date(payment.created_at).toLocaleDateString()}</p>
            </div>
            <div class="card-actions">
                <a href="${payment.transfer_receipt_url}" target="_blank" class="btn-view-receipt">🧾 عرض الوصل</a>
                <button class="btn-payment-approve" data-id="${payment.id}" data-business="${payment.business_id}" data-tier="${payment.requested_tier}">💰 قبول الدفع</button>
                <button class="btn-payment-reject" data-id="${payment.id}" data-business="${payment.business_id}">🚫 رفض</button>
            </div>
        </div>
    `;
}

function renderReportCard(report) {
    return `
        <div class="admin-card" data-id="${report.id}">
            <div class="card-header">
                <div class="card-info">
                    <h3>${report.business_profiles?.business_name || 'غير معروف'}</h3>
                    <p>مُبلَّغ من: ${report.profiles?.full_name || 'مستخدمة'}</p>
                </div>
            </div>
            <div class="card-details">
                <p><strong>السبب:</strong> ${report.reason}</p>
                <p><strong>التاريخ:</strong> ${new Date(report.created_at).toLocaleDateString()}</p>
            </div>
            <div class="card-actions">
                <button class="btn-report-dismiss" data-id="${report.id}" data-business="${report.target_business_id}">📌 تجاهل</button>
                <button class="btn-report-warn" data-id="${report.id}" data-business="${report.target_business_id}">⚠️ تحذير</button>
            </div>
        </div>
    `;
}

// ========================================
// التصدير والتهيئة
// ========================================

window.admin = {
    isAdminUser,
    requireAdmin,
    fetchPendingBusinesses,
    fetchActiveBusinesses,
    fetchPaymentRequests,
    fetchReports,
    fetchWarningReviews,
    fetchAdminStats,
    approveBusiness,
    rejectBusiness,
    banBusiness,
    unbanBusiness,
    deleteBusiness,
    approvePayment,
    rejectPayment,
    processReport,
    approveWarningReview,
    rejectWarningReview,
    renderAdminDashboard,
    showIdCardsModal
};

console.log('[Admin] Module initialized');