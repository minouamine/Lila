// js/banner-controller.js
// نظام البانر المتعدد مع توقيت دوران (تحميل مرة واحدة فقط)

// ========================================
// تعريف الدوال العامة أولاً (قبل أي شيء)
// ========================================

window.openSurveyModal = function() {
  console.log('🔍 محاولة فتح المودال');
  const modal = document.getElementById('surveyModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    console.log('✅ تم فتح المودال');
  } else {
    console.warn('⚠️ العنصر #surveyModal غير موجود في الصفحة');
  }
};

window.closeSurveyModal = function() {
  console.log('🔍 محاولة إغلاق المودال');
  const modal = document.getElementById('surveyModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    console.log('✅ تم إغلاق المودال');
  }
};

// إغلاق عند الضغط خارج المودال
document.addEventListener('click', function(e) {
  const modal = document.getElementById('surveyModal');
  if (modal && e.target === modal) {
    window.closeSurveyModal();
  }
});

// ========================================
// المتغيرات العامة
// ========================================

let banners = [];
let currentIndex = 0;
let timer = null;
const header = document.getElementById('dynamicHeader');

// حفظ المحتوى الافتراضي كنسخة احتياطية
const defaultContent = header ? header.innerHTML : '';

// التحقق إذا تم التحميل مسبقاً
if (!window.bannersLoaded) {
  window.bannersLoaded = true;
  window.bannersData = null;
  window.bannersInitialized = false;
}

// ========================================
// جلب البانرات عند تحميل الصفحة (مرة واحدة فقط)
// ========================================

(async function loadBanners() {
  if (window.bannersInitialized) {
    console.log('ℹ️ البانرات محملة مسبقاً، استمرار في العرض');
    return;
  }
  
  console.log('🔄 جاري تحميل البانرات من قاعدة البيانات...');
  
  try {
    const { data, error } = await window.supabaseClient
      .from('banners')
      .select('id, content_html, modal_html, duration_seconds')
      .eq('is_active', true)
      .order('priority', { ascending: true });
    
    if (error) {
      console.error('❌ خطأ في جلب البانرات:', error.message);
      window.bannersLoaded = false;
      return;
    }
    
    if (data && data.length > 0) {
      window.bannersData = data;
      banners = data;
      
      console.log(`✅ تم تحميل ${banners.length} بانر (مرة واحدة)`);
      banners.forEach((b, i) => {
        console.log(`   📄 بانر ${i+1}: مدة ${b.duration_seconds} ثانية`);
      });
      
      window.bannersInitialized = true;
      startRotation();
    } else {
      console.log('ℹ️ لا يوجد بانرات نشطة، يظهر المحتوى الافتراضي');
      showDefault();
    }
    
  } catch (err) {
    console.error('💥 خطأ غير متوقع:', err.message);
    window.bannersLoaded = false;
  }
})();

// ========================================
// دوال التحكم في البانر
// ========================================

function startRotation() {
  if (window.bannersData && window.bannersData.length > 0) {
    banners = window.bannersData;
  }
  
  if (banners.length === 0) return;
  
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  showBanner(currentIndex);
  
  timer = setInterval(() => {
    currentIndex = (currentIndex + 1) % banners.length;
    showBanner(currentIndex);
  }, banners[currentIndex].duration_seconds * 1000);
}

function showBanner(index) {
  if (!header) return;
  
  const banner = window.bannersData ? window.bannersData[index] : banners[index];
  
  if (banner) {
    header.innerHTML = DOMPurify.sanitize(banner.content_html);
    
    header.style.direction = 'rtl';
    header.style.textAlign = 'right';
    header.style.height = '80px';
    header.style.minHeight = '80px';
    header.style.maxHeight = '80px';
    header.style.overflow = 'hidden';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'center';
    
    // ربط أزرار data-action في البانر
    header.querySelectorAll('button[data-action]').forEach(button => {
      const action = button.getAttribute('data-action');
      if (action && typeof window[action] === 'function') {
        button.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          window[action]();
        });
      }
    });
    
    // ربط أزرار النص في البانر
    header.querySelectorAll('button:not([data-action])').forEach(button => {
      const text = button.textContent.trim();
      if (text.includes('شاركي') || text.includes('اطلب') || text.includes('انضمي')) {
        button.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          window.openSurveyModal();
        });
      }
    });
    
    // حقن المودال مرة واحدة فقط
    const dynamicModals = document.getElementById('dynamicModals');
    if (dynamicModals) {
      const isAlreadyInjected = !!dynamicModals.querySelector('#surveyModal');
      
      if (!isAlreadyInjected) {
        if (banner.modal_html) {
          dynamicModals.innerHTML = banner.modal_html;
          dynamicModals.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            newScript.textContent = oldScript.textContent;
            oldScript.remove();
            document.body.appendChild(newScript);
          });
          dynamicModals.querySelectorAll('button[data-action]').forEach(button => {
            const action = button.getAttribute('data-action');
            if (action && typeof window[action] === 'function') {
              button.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                window[action]();
              });
            }
          });
        } else {
          dynamicModals.innerHTML = '';
        }
      }
    }
    
    console.log(`🔄 عرض البانر ${index+1} (مدة ${banner.duration_seconds} ثانية)`);
  }
}

function showDefault() {
  if (header) {
    header.innerHTML = defaultContent;
    header.style.direction = '';
    header.style.textAlign = '';
    header.style.height = '';
    header.style.minHeight = '';
    header.style.maxHeight = '';
    header.style.overflow = '';
    header.style.display = '';
    header.style.alignItems = '';
    header.style.justifyContent = '';
  }
  
  const dynamicModals = document.getElementById('dynamicModals');
  if (dynamicModals) {
    dynamicModals.innerHTML = '';
  }
}

function stopRotation() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// ========================================
// تصدير الدوال للاستخدام الخارجي
// ========================================

window.bannerController = {
  stopRotation: stopRotation,
  startRotation: startRotation,
  refreshBanners: function() {
    window.bannersLoaded = false;
    window.bannersInitialized = false;
    window.bannersData = null;
    location.reload();
  }
};

console.log('✅ Banner controller initialized successfully');