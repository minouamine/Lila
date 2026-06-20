/**
 * ========================================
 * UTILITIES MODULE
 * مشروع ليلى - LILA
 * دوال مساعدة عامة (فلترة، تنسيق، تحقق، أمان)
 * ========================================
 */

// ========================================
// فلترة النصوص ومنع XSS والكلمات البذيئة
// ========================================

// قائمة الكلمات البذيئة (سيتم تحميلها من ملف JSON لاحقاً)
let badWordsList = {
    ar: ['كس', 'عاهر', 'زاني', 'زنا', 'لوطي', 'سحاق', 'متناك', 'منيوك', 'كلب', 'خنزير', 'قحبة', 'شرموطة'],
    fr: ['merde', 'putain', 'salope', 'connard', 'enculé', 'bite', 'nique', 'fuck', 'shit', 'bitch', 'whore']
};

/**
 * تحميل قائمة الكلمات البذيئة من ملف JSON
 * @returns {Promise<void>}
 */
async function loadBadWords() {
    try {
        const response = await fetch('assets/data/badwords.json');
        if (response.ok) {
            const data = await response.json();
            if (data.ar) badWordsList.ar = data.ar;
            if (data.fr) badWordsList.fr = data.fr;
            console.log('[Utils] Bad words loaded');
        }
    } catch (error) {
        console.warn('[Utils] Could not load badwords.json, using default list');
    }
}

/**
 * فلترة النص من الكلمات البذيئة
 * @param {string} text - النص المراد فلترته
 * @param {string} lang - اللغة ('ar' أو 'fr')
 * @param {string} replacement - نص الاستبدال (افتراضي: '***')
 * @returns {string} النص بعد الفلترة
 */
function filterProfanity(text, lang = 'ar', replacement = '***') {
    if (!text) return text;
    
    let filteredText = text;
    const badWords = badWordsList[lang] || badWordsList.ar;
    
    for (const word of badWords) {
        const regex = new RegExp(word, 'gi');
        filteredText = filteredText.replace(regex, replacement);
    }
    
    return filteredText;
}

/**
 * التحقق من وجود كلمات بذيئة في النص
 * @param {string} text - النص المراد فحصه
 * @param {string} lang - اللغة
 * @returns {boolean} true إذا وجدت كلمات بذيئة
 */
function containsProfanity(text, lang = 'ar') {
    if (!text) return false;
    
    const badWords = badWordsList[lang] || badWordsList.ar;
    for (const word of badWords) {
        if (text.toLowerCase().includes(word.toLowerCase())) {
            return true;
        }
    }
    return false;
}

/**
 * منع XSS: تنقية النص من أكواد HTML الضارة
 * @param {string} text - النص المراد تنقيته
 * @returns {string} النص الآمن
 */
function sanitizeHTML(text) {
    if (!text) return text;
    return DOMPurify.sanitize(text);
}

/**
 * تنقية النص بشكل كامل (XSS + كلمات بذيئة)
 * @param {string} text - النص
 * @param {string} lang - اللغة
 * @returns {string}
 */
function sanitizeText(text, lang = 'ar') {
    let cleaned = sanitizeHTML(text);
    cleaned = filterProfanity(cleaned, lang);
    return cleaned.trim();
}

// ========================================
// تنسيق البيانات
// ========================================

/**
 * تنسيق السعر بالدينار الجزائري
 * @param {number} price - السعر
 * @returns {string} السعر المنسق (مثال: 2,500 دج)
 */
function formatPrice(price) {
    if (price === undefined || price === null) return 'غير محدد';
    return price.toLocaleString() + ' دج';
}

/**
 * تنسيق رقم الهاتف الجزائري
 * @param {string} phone - رقم الهاتف
 * @returns {string} الرقم المنسق (05 55 12 34 56)
 */
function formatPhoneNumber(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
}

/**
 * حساب التقييم العام من التقييمات الفرعية
 * @param {number} quality - تقييم الجودة (1-5)
 * @param {number} price - تقييم السعر (1-5)
 * @param {number} manners - تقييم المعاملة (1-5)
 * @returns {number} المتوسط الحسابي (مقرب لأقرب نصف)
 */
function calculateOverallRating(quality, price, manners) {
    const average = (quality + price + manners) / 3;
    return Math.round(average * 2) / 2; // تقريب لأقرب 0.5
}

/**
 * تحديد لون التقييم بناءً على القيمة
 * @param {number} rating - التقييم (0-5)
 * @param {number} count - عدد التقييمات (للذهب)
 * @returns {string} 'gold', 'green', 'red'
 */
function getRatingColor(rating, count = 0) {
    if (rating >= 4.7 && count >= 50) return 'gold';
    if (rating >= 4.0) return 'green';
    return 'red';
}

/**
 * تنسيق الوقت النسبي (منذ متى)
 * @param {Date|string} date - التاريخ
 * @returns {string} نص مثل "منذ 5 دقائق"
 */
function timeAgo(date, lang = 'ar') {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
        return lang === 'ar' ? `منذ ${interval} سنة` : `il y a ${interval} an${interval > 1 ? 's' : ''}`;
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return lang === 'ar' ? `منذ ${interval} شهر` : `il y a ${interval} mois`;
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return lang === 'ar' ? `منذ ${interval} يوم` : `il y a ${interval} jour${interval > 1 ? 's' : ''}`;
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return lang === 'ar' ? `منذ ${interval} ساعة` : `il y a ${interval} heure${interval > 1 ? 's' : ''}`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return lang === 'ar' ? `منذ ${interval} دقيقة` : `il y a ${interval} minute${interval > 1 ? 's' : ''}`;
    }
    
    return lang === 'ar' ? 'الآن' : 'maintenant';
}

// ========================================
// بصمة الجهاز (Device Fingerprint)
// ========================================

/**
 * جمع بصمة الجهاز لمنع التقييمات المتكررة
 * @returns {object} بصمة الجهاز
 */
async function getDeviceFingerprint() {
    const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenWidth: screen.width,
        screenHeight: screen.height,
        screenColorDepth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: navigator.deviceMemory || 0,
        touchSupport: 'ontouchstart' in window,
        // Canvas Fingerprint (اختياري)
        canvasFingerprint: await getCanvasFingerprint()
    };
    
    return fingerprint;
}

/**
 * إنشاء بصمة عبر Canvas
 * @returns {string} بصمة canvas
 */
async function getCanvasFingerprint() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 100, 50);
    ctx.fillStyle = '#fff';
    ctx.fillText('Lila', 10, 20);
    ctx.strokeStyle = '#ff8c00';
    ctx.strokeRect(5, 5, 190, 40);
    
    return canvas.toDataURL();
}

/**
 * إنشاء معرف فريد للجهاز (يُخزن في localStorage)
 * @returns {string} معرف الجهاز
 */
function getDeviceId() {
    let deviceId = localStorage.getItem('lila_device_id');
    if (!deviceId) {
        deviceId = generateUUID();
        localStorage.setItem('lila_device_id', deviceId);
    }
    return deviceId;
}

/**
 * توليد UUID بسيط
 * @returns {string}
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ========================================
// التحقق من صحة المدخلات
// ========================================

/**
 * التحقق من صحة البريد الإلكتروني
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return regex.test(email);
}

/**
 * التحقق من صحة رقم الهاتف الجزائري
 * @param {string} phone
 * @returns {boolean}
 */
function isValidAlgerianPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const regex = /^(05|06|07)\d{8}$/;
    return regex.test(cleaned);
}

/**
 * التحقق من صحة اسم المستخدم (حروف وأرقام وشرطات سفلية فقط)
 * @param {string} username
 * @returns {boolean}
 */
function isValidUsername(username) {
    const regex = /^[a-zA-Z0-9_\u0600-\u06FF]{3,30}$/;
    return regex.test(username);
}

/**
 * التحقق من صحة الرابط (URL)
 * @param {string} url
 * @returns {boolean}
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// ========================================
// دوال مساعدة للتخزين المحلي (localStorage)
// ========================================

/**
 * حفظ بيانات في localStorage مع صلاحية (TTL)
 * @param {string} key - المفتاح
 * @param {any} value - القيمة
 * @param {number} ttlSeconds - مدة الصلاحية بالثواني (0 = لا تنتهي)
 */
function setWithExpiry(key, value, ttlSeconds = 0) {
    const item = {
        value: value,
        expiry: ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : null
    };
    localStorage.setItem(key, JSON.stringify(item));
}

/**
 * قراءة بيانات من localStorage مع التحقق من الصلاحية
 * @param {string} key
 * @returns {any|null}
 */
function getWithExpiry(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    try {
        const item = JSON.parse(itemStr);
        if (item.expiry && Date.now() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    } catch {
        return null;
    }
}

// ========================================
// دوال مساعدة للحسابات الجغرافية (Haversine)
// ========================================

/**
 * حساب المسافة بين نقطتين باستخدام Haversine formula
 * @param {number} lat1 - خط عرض النقطة الأولى
 * @param {number} lon1 - خط طول النقطة الأولى
 * @param {number} lat2 - خط عرض النقطة الثانية
 * @param {number} lon2 - خط طول النقطة الثانية
 * @returns {number} المسافة بالكيلومترات
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // نصف قطر الأرض بالكيلومترات
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * تحويل الدرجات إلى راديان
 * @param {number} deg
 * @returns {number}
 */
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * التحقق مما إذا كانت نقطة تقع ضمن نطاق معين
 * @param {number} lat1, lon1 - مركز النطاق
 * @param {number} lat2, lon2 - النقطة المراد فحصها
 * @param {number} rangeKm - النطاق بالكيلومترات
 * @returns {boolean}
 */
function isWithinRange(lat1, lon1, lat2, lon2, rangeKm) {
    return calculateDistance(lat1, lon1, lat2, lon2) <= rangeKm;
}

// ========================================
// دوال مساعدة للـ DOM
// ========================================

/**
 * عرض رسالة منبثقة (Toast)
 * @param {string} message - النص
 * @param {string} type - النوع: 'success', 'error', 'info', 'warning'
 * @param {number} duration - المدة بالمللي ثانية
 */
function showToast(message, type = 'info', duration = 3000) {
    // إزالة أي toast موجود
    const existingToast = document.querySelector('.lila-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `lila-toast lila-toast-${type}`;
    toast.textContent = message;
    
    // إضافة الأنماط
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#00c87a' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f87171' : '#1e6fff'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        animation: toastSlideIn 0.3s ease;
        font-family: var(--font-arabic, sans-serif);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// إضافة أنيميشن للـ toast
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes toastSlideIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastSlideOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
`;
document.head.appendChild(toastStyle);

/**
 * عرض رسالة خطأ داخل عنصر معين
 * @param {HTMLElement} element - العنصر الذي سيظهر فيه الخطأ
 * @param {string} message - نص الخطأ
 */
function showFieldError(element, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #ef4444;
        font-size: 12px;
        margin-top: 5px;
    `;
    
    // إزالة أي خطأ سابق
    const oldError = element.parentNode.querySelector('.field-error');
    if (oldError) oldError.remove();
    
    element.parentNode.appendChild(errorDiv);
    element.style.borderColor = '#ef4444';
    
    setTimeout(() => {
        errorDiv.remove();
        element.style.borderColor = '';
    }, 5000);
}

/**
 * إظهار مؤشر تحميل (Loading Spinner)
 * @param {HTMLElement} element - العنصر الذي سيظهر فيه المؤشر
 * @returns {Function} دالة لإخفاء المؤشر
 */
function showLoading(element) {
    const originalContent = element.innerHTML;
    const loader = document.createElement('span');
    loader.className = 'loading-spinner';
    loader.innerHTML = '⏳';
    loader.style.cssText = `
        display: inline-block;
        animation: spin 1s linear infinite;
        margin-left: 8px;
    `;
    
    element.disabled = true;
    element.appendChild(loader);
    
    return () => {
        element.innerHTML = originalContent;
        element.disabled = false;
    };
}

// إضافة أنيميشن للـ spinner
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(spinnerStyle);

// ========================================
// التصدير والتهيئة
// ========================================

// تحميل الكلمات البذيئة عند التهيئة
loadBadWords();

// تصدير الوظائف
window.utils = {
    // فلترة
    filterProfanity,
    containsProfanity,
    sanitizeHTML,
    sanitizeText,
    loadBadWords,
    
    // تنسيق
    formatPrice,
    formatPhoneNumber,
    calculateOverallRating,
    getRatingColor,
    timeAgo,
    
    // بصمة الجهاز
    getDeviceFingerprint,
    getDeviceId,
    generateUUID,
    
    // تحقق
    isValidEmail,
    isValidAlgerianPhone,
    isValidUsername,
    isValidUrl,
    
    // تخزين
    setWithExpiry,
    getWithExpiry,
    
    // جغرافيا
    calculateDistance,
    isWithinRange,
    
    // DOM
    showToast,
    showFieldError,
    showLoading
};

console.log('[Utils] Module initialized');