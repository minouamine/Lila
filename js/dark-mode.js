/**
 * ========================================
 * DARK MODULE MODULE
 * مشروع ليلى - LILA
 * الوضع الليلي الكامل (دائم - لا يوجد تبديل)
 * ========================================
 */

/**
 * ملاحظة مهمة:
 * هذا التطبيق يعمل بالوضع الليلي بشكل دائم وكامل.
 * جميع الألوان والخلفيات مصممة خصيصاً للوضع المظلم.
 * لا يوجد زر لتبديل الوضع لأن التطبيق ليلي بالكامل.
 * 
 * هذا الملف موجود للأغراض التالية:
 * 1. ضمان تطبيق الوضع الليلي حتى لو تم تعطيل CSS
 * 2. إضافة تأثيرات إضافية للوضع الليلي (وهج، توهج)
 * 3. دوال مساعدة لعناصر قد تحتاج تعديلات في الوضع المظلم
 * 4. حفظ تفضيلات المستخدم (مثل شدة التوهج)
 */

// ========================================
// الحالة العامة
// ========================================

let darkModeEnabled = true; // دائماً true
let glowIntensity = 1.0; // شدة التوهج (1.0 افتراضياً)
let scanlineEnabled = true; // تأثير خطوط المسح

// ========================================
// الدوال الأساسية
// ========================================

/**
 * تطبيق الوضع الليلي على الصفحة (يُستدعى عند التحميل)
 */
function applyDarkMode() {
    // إضافة class للـ body للتأكيد
    document.body.classList.add('dark-mode');
    document.body.classList.add('dark-theme');
    
    // التأكد من أن الخلفيات الداكنة مطبقة
    const root = document.documentElement;
    root.style.setProperty('--bg-deep', '#040810');
    root.style.setProperty('--bg-mid', '#080f1c');
    root.style.setProperty('--bg-surface', '#0d1628');
    root.style.setProperty('--bg-raised', '#111d35');
    root.style.setProperty('--bg-card', '#0f1a2e');
    root.style.setProperty('--text-primary', '#d8e4f0');
    root.style.setProperty('--text-secondary', '#7a9ab8');
    root.style.setProperty('--accent-orange', '#ef4444');
    
    // تطبيق التوهج
    updateGlowIntensity();
    
    console.log('[DarkMode] Applied dark mode');
}

/**
 * تحديث شدة التوهج (glow) في جميع أنحاء التطبيق
 * @param {number} intensity - الشدة من 0 إلى 1.5
 */
function setGlowIntensity(intensity) {
    glowIntensity = Math.min(1.5, Math.max(0, intensity));
    updateGlowIntensity();
    
    // حفظ التفضيل
    localStorage.setItem('lila_glow_intensity', glowIntensity);
}

/**
 * تحديث قيم التوهج في CSS variables
 */
function updateGlowIntensity() {
    const root = document.documentElement;
    const orangeGlow = `rgba(255, 140, 0, ${0.35 * glowIntensity})`;
    const goldGlow = `rgba(255, 215, 0, ${0.2 * glowIntensity})`;
    
    root.style.setProperty('--glow-orange', orangeGlow);
    root.style.setProperty('--glow-gold', goldGlow);
}

/**
 * تفعيل/تعطيل تأثير خطوط المسح (scanline)
 * @param {boolean} enabled
 */
function setScanlineEnabled(enabled) {
    scanlineEnabled = enabled;
    const scanlineElement = document.querySelector('.scanline-overlay');
    
    if (scanlineElement) {
        scanlineElement.style.display = enabled ? 'block' : 'none';
    }
    
    localStorage.setItem('lila_scanline_enabled', enabled);
}

/**
 * تفعيل/تعطيل تأثير الجسيمات (particles)
 * @param {boolean} enabled
 */
function setParticlesEnabled(enabled) {
    const canvas = document.getElementById('particleCanvas');
    if (canvas) {
        canvas.style.display = enabled ? 'block' : 'none';
    }
    
    localStorage.setItem('lila_particles_enabled', enabled);
}

/**
 * تحميل تفضيلات المستخدم المحفوظة
 */
function loadDarkModePreferences() {
    const savedGlow = localStorage.getItem('lila_glow_intensity');
    if (savedGlow !== null) {
        glowIntensity = parseFloat(savedGlow);
        updateGlowIntensity();
    }
    
    const savedScanline = localStorage.getItem('lila_scanline_enabled');
    if (savedScanline !== null) {
        scanlineEnabled = savedScanline === 'true';
        setScanlineEnabled(scanlineEnabled);
    }
}

// ========================================
// تأثيرات إضافية للوضع الليلي
// ========================================

/**
 * إضافة تأثير توهج حول العنصر عند التمرير (hover)
 * @param {HTMLElement} element - العنصر المراد
 * @param {string} color - لون التوهج (افتراضي: برتقالي)
 */
function addGlowOnHover(element, color = 'var(--accent-orange)') {
    element.addEventListener('mouseenter', () => {
        element.style.transition = 'box-shadow 0.3s ease';
        element.style.boxShadow = `0 0 20px ${color}, 0 0 5px ${color}`;
    });
    
    element.addEventListener('mouseleave', () => {
        element.style.boxShadow = '';
    });
}

/**
 * إضافة تأثير نبض (pulse) لعنصر معين
 * @param {HTMLElement} element - العنصر
 * @param {number} duration - مدة النبض بالثواني
 */
function addPulseEffect(element, duration = 2) {
    element.style.animation = `pulse ${duration}s ease-in-out infinite`;
    
    // إضافة الـ keyframes إذا لم تكن موجودة
    if (!document.querySelector('#pulse-keyframes')) {
        const style = document.createElement('style');
        style.id = 'pulse-keyframes';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; text-shadow: 0 0 10px var(--accent-orange); }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * إضافة تأثير وميض للنجوم الذهبية (للتقييمات الذهبية)
 * @param {HTMLElement} starsContainer - الحاوية التي تحتوي على النجوم
 */
function addGoldStarsGlow(starsContainer) {
    starsContainer.classList.add('gold-stars-glow');
    
    // إضافة الـ CSS إذا لم تكن موجودة
    if (!document.querySelector('#gold-stars-style')) {
        const style = document.createElement('style');
        style.id = 'gold-stars-style';
        style.textContent = `
            .gold-stars-glow .star,
            .gold-stars-glow .rating-star {
                filter: drop-shadow(0 0 5px gold) drop-shadow(0 0 10px #ffd700);
                animation: starTwinkle 1.5s ease-in-out infinite;
            }
            
            @keyframes starTwinkle {
                0%, 100% { filter: drop-shadow(0 0 3px gold) drop-shadow(0 0 6px #ffd700); }
                50% { filter: drop-shadow(0 0 8px gold) drop-shadow(0 0 15px #ffa500); }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * إضافة تأثير وهج للبطاقات عند التحميل
 * @param {HTMLElement} card - عنصر البطاقة
 */
function addCardGlowOnLoad(card) {
    card.style.animation = 'cardGlowReveal 0.6s ease-out';
    
    if (!document.querySelector('#card-glow-style')) {
        const style = document.createElement('style');
        style.id = 'card-glow-style';
        style.textContent = `
            @keyframes cardGlowReveal {
                0% {
                    opacity: 0;
                    transform: translateY(10px);
                    box-shadow: 0 0 0 transparent;
                }
                100% {
                    opacity: 1;
                    transform: translateY(0);
                    box-shadow: 0 0 20px rgba(255, 140, 0, 0.15);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ========================================
// تحسين الأداء للوضع الليلي
// ========================================

/**
 * تقليل حركة الخلفية (للأجهزة منخفضة الموارد)
 * @param {boolean} reduce - تفعيل وضع توفير الموارد
 */
function reduceMotion(reduce = true) {
    const canvas = document.getElementById('particleCanvas');
    const scanline = document.querySelector('.scanline-overlay');
    
    if (reduce) {
        if (canvas) canvas.style.opacity = '0.3';
        if (scanline) scanline.style.animation = 'none';
        
        // تقليل عدد الجسيمات (إذا تم الوصول إلى canvas من الخارج)
        window.dispatchEvent(new CustomEvent('reduceParticles', { detail: { reduce: true } }));
    } else {
        if (canvas) canvas.style.opacity = '0.6';
        if (scanline) scanline.style.animation = 'scanlineScroll 8s linear infinite';
    }
    
    localStorage.setItem('lila_reduce_motion', reduce);
}

/**
 * التحقق من تفضيلات النظام لتقليل الحركة
 */
function checkSystemMotionPreference() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        reduceMotion(true);
    }
    
    // الاستماع لتغيير تفضيلات النظام
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        reduceMotion(e.matches);
    });
}

// ========================================
// دوال مساعدة لإدارة الظلال والإضاءة
// ========================================

/**
 * إضافة ظل داخلي (inner shadow) لعنصر
 * @param {HTMLElement} element
 * @param {string} intensity - شدة الظل (light, medium, strong)
 */
function addInnerGlow(element, intensity = 'medium') {
    const intensities = {
        light: '0 0 5px rgba(255,140,0,0.2) inset',
        medium: '0 0 10px rgba(255,140,0,0.3) inset',
        strong: '0 0 20px rgba(255,140,0,0.5) inset'
    };
    
    element.style.boxShadow = intensities[intensity] || intensities.medium;
}

/**
 * إضافة ظل خارجي لعنصر
 * @param {HTMLElement} element
 * @param {string} intensity
 */
function addOuterGlow(element, intensity = 'medium') {
    const intensities = {
        light: '0 0 10px rgba(255,140,0,0.2)',
        medium: '0 0 20px rgba(255,140,0,0.35)',
        strong: '0 0 35px rgba(255,140,0,0.5)'
    };
    
    element.style.boxShadow = intensities[intensity] || intensities.medium;
}

// ========================================
// التصدير والتهيئة الأولية
// ========================================

/**
 * التهيئة الكاملة لوحدة الوضع الليلي
 */
function initDarkMode() {
    applyDarkMode();
    loadDarkModePreferences();
    checkSystemMotionPreference();
    
    // إضافة تأثيرات تلقائية لبعض العناصر
    document.querySelectorAll('.action-btn').forEach(btn => {
        addOuterGlow(btn, 'light');
    });
    
    document.querySelectorAll('.lang-btn.active, .lang-btn:hover').forEach(btn => {
        addGlowOnHover(btn);
    });
    
    console.log('[DarkMode] Module initialized');
}

// تهيئة الوحدة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initDarkMode);

// تصدير الوظائف للاستخدام العام
window.darkMode = {
    isEnabled: () => darkModeEnabled,
    setGlowIntensity,
    getGlowIntensity: () => glowIntensity,
    setScanlineEnabled,
    isScanlineEnabled: () => scanlineEnabled,
    setParticlesEnabled,
    addGlowOnHover,
    addPulseEffect,
    addGoldStarsGlow,
    addCardGlowOnLoad,
    addInnerGlow,
    addOuterGlow,
    reduceMotion
};

console.log('[DarkMode] Module ready, dark mode always on');