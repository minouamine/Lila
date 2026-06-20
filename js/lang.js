/**
 * ========================================
 * LANGUAGE & TRANSLATION MODULE
 * مشروع ليلى - LILA
 * اللغات: العربية (RTL) والفرنسية (LTR)
 * ========================================
 */

// قاموس الترجمة الكامل
const translations = {
    ar: {
        // عام
        app_name: 'ليلى',
        app_subtitle: 'دليل صالونات وخدمات النساء في الجزائر',
        search_placeholder: 'ابحث عن صالون، حلاقة، فستان، ولاية...',
        
        // الأزرار الرئيسية
        btn_salons: 'صالونات وحلاقات',
        btn_products: 'منتجات تجميل وعطور',
        btn_rentals: 'تأجير قفاطين وفساتين',
        btn_home_services: 'خدمات منزلية',
        btn_my_account: 'حسابي',
        btn_emergency: 'طوارئ نسائية',
        btn_developer: 'التواصل مع المطورة',
        
        // المصادقة
        login_google: 'تسجيل الدخول عبر Google',
        logout: 'تسجيل الخروج',
        my_profile: 'ملفي الشخصي',
        my_bookings: 'حجوزاتي',
        my_favorites: 'المفضلة',
        my_following: 'المتابعة',
        
        // الحساب التجاري
        create_business_account: 'إنشاء حساب تجاري',
        upgrade_to_business: 'ترقية إلى حساب تجاري',
        business_dashboard: 'لوحة التحكم',
        pending_verification: 'قيد المراجعة',
        account_approved: 'تم قبول الحساب',
        account_rejected: 'تم رفض الحساب',
        subscription_silver: 'فضي',
        subscription_gold: 'ذهبي',
        subscription_platinum: 'بلاتيني',
        
        // الحجوزات
        book_now: 'احجزي الآن',
        booking_date: 'تاريخ الحجز',
        booking_time: 'وقت الحجز',
        service_type: 'نوع الخدمة',
        emergency_booking: 'طلب طوارئ',
        emergency_fee: 'رسوم إضافية للطوارئ',
        booking_confirmed: 'تم تأكيد الحجز',
        booking_cancelled: 'تم إلغاء الحجز',
        booking_completed: 'اكتمل الحجز',
        
        // التقييمات
        rate_experience: 'قيمي تجربتك',
        rating_quality: 'جودة العمل',
        rating_price: 'السعر',
        rating_manners: 'المعاملة',
        rating_overall: 'التقييم العام',
        submit_review: 'إرسال التقييم',
        review_reply: 'رد صاحبة الحساب',
        gold_rating: 'تقييم ذهبي',
        green_rating: 'تقييم جيد',
        red_rating: 'تقييم منخفض',
        new_business_badge: 'حساب جديد',
        
        // البحث والفلاتر
        search_results: 'نتائج البحث',
        filter_by: 'تصفية حسب',
        filter_wilaya: 'الولاية',
        filter_service: 'نوع الخدمة',
        filter_price: 'السعر',
        filter_rating: 'التقييم',
        filter_online: 'متاحة الآن',
        map_view: 'عرض الخريطة',
        list_view: 'عرض القائمة',
        nearest: 'الأقرب إليك',
        highest_rated: 'الأعلى تقييماً',
        
        // المتابعة والمفضلة
        follow: 'متابعة',
        unfollow: 'إلغاء المتابعة',
        following_count: 'متابِع',
        add_to_favorites: 'أضيفي إلى المفضلة',
        remove_from_favorites: 'إزالة من المفضلة',
        favorites: 'المفضلة',
        
        // المنشورات والقصص
        posts: 'المنشورات',
        stories: 'القصص',
        new_post: 'منشور جديد',
        post_content: 'محتوى المنشور',
        add_photos: 'إضافة صور',
        story_expires_in: 'تنتهي القصة بعد',
        
        // الإشعارات
        notifications: 'الإشعارات',
        no_notifications: 'لا توجد إشعارات',
        review_reminder: 'ذكّريني بتقييم تجربتي',
        
        // الأخطاء والرسائل
        error_general: 'حدث خطأ، يرجى المحاولة مرة أخرى',
        error_network: 'خطأ في الاتصال بالإنترنت',
        error_unauthorized: 'يرجى تسجيل الدخول أولاً',
        error_booking_limit: 'وصل الحساب إلى الحد اليومي للحجوزات',
        error_already_reviewed: 'لقد قيمت هذا الحساب بالفعل',
        error_already_following: 'أنت تتابعين هذا الحساب بالفعل',
        success_booking: 'تم إرسال طلب الحجز بنجاح',
        success_review: 'شكراً لتقييمك',
        success_follow: 'تمت المتابعة',
        success_unfollow: 'تم إلغاء المتابعة',
        
        // أيام الأسبوع
        saturday: 'السبت',
        sunday: 'الأحد',
        monday: 'الاثنين',
        tuesday: 'الثلاثاء',
        wednesday: 'الأربعاء',
        thursday: 'الخميس',
        friday: 'الجمعة',
        
        // الطوارئ
        emergency_title: 'طوارئ نسائية',
        emergency_desc: 'خدمة عاجلة خلال ساعتين',
        emergency_request: 'طلب خدمة طارئة',
        
        // الأدمن
        admin_panel: 'لوحة تحكم الأدمن',
        pending_businesses: 'حسابات قيد المراجعة',
        active_businesses: 'حسابات نشطة',
        reported_businesses: 'حسابات مُبلَّغ عنها',
        payment_requests: 'طلبات الدفع',
        verify_id_card: 'التحقق من بطاقة الهوية',
        approve_account: 'قبول الحساب',
        reject_account: 'رفض الحساب',
        ban_account: 'حظر الحساب',
        unban_account: 'رفع الحظر',
        
        // المطور
        developer_name: 'فريق ليلى',
        developer_title: 'تطوير تطبيقات | الجزائر',
        contact_email: 'البريد الإلكتروني',
        contact_telegram: 'تيليغرام',
        close: 'إغلاق',
        
        // أخطاء Supabase
        error_supabase_connection: 'خطأ في الاتصال بقاعدة البيانات',
        error_duplicate: 'هذا الحساب موجود بالفعل',
        error_permission: 'ليس لديك صلاحية للقيام بهذا الإجراء'
    },
    
    fr: {
        // Général
        app_name: 'Lila',
        app_subtitle: 'Guide des salons et services féminins en Algérie',
        search_placeholder: 'Rechercher un salon, coiffure, robe, wilaya...',
        
        // Boutons principaux
        btn_salons: 'Salons & Coiffure',
        btn_products: 'Produits beauté & parfums',
        btn_rentals: 'Location kaftans & robes',
        btn_home_services: 'Services à domicile',
        btn_my_account: 'Mon compte',
        btn_emergency: 'Urgence féminine',
        btn_developer: 'Contacter la développeuse',
        
        // Authentification
        login_google: 'Connexion avec Google',
        logout: 'Déconnexion',
        my_profile: 'Mon profil',
        my_bookings: 'Mes réservations',
        my_favorites: 'Favoris',
        my_following: 'Abonnements',
        
        // Compte professionnel
        create_business_account: 'Créer un compte professionnel',
        upgrade_to_business: 'Passer en compte professionnel',
        business_dashboard: 'Tableau de bord',
        pending_verification: 'En attente de vérification',
        account_approved: 'Compte approuvé',
        account_rejected: 'Compte rejeté',
        subscription_silver: 'Argent',
        subscription_gold: 'Or',
        subscription_platinum: 'Platine',
        
        // Réservations
        book_now: 'Réserver maintenant',
        booking_date: 'Date de réservation',
        booking_time: 'Heure de réservation',
        service_type: 'Type de service',
        emergency_booking: "Demande d'urgence",
        emergency_fee: "Frais d'urgence supplémentaires",
        booking_confirmed: 'Réservation confirmée',
        booking_cancelled: 'Réservation annulée',
        booking_completed: 'Réservation terminée',
        
        // Évaluations
        rate_experience: 'Évaluez votre expérience',
        rating_quality: 'Qualité du travail',
        rating_price: 'Prix',
        rating_manners: 'Relation client',
        rating_overall: 'Évaluation générale',
        submit_review: "Envoyer l'évaluation",
        review_reply: 'Réponse de la professionnelle',
        gold_rating: 'Évaluation en or',
        green_rating: 'Bonne évaluation',
        red_rating: 'Évaluation faible',
        new_business_badge: 'Nouveau compte',
        
        // Recherche et filtres
        search_results: 'Résultats de recherche',
        filter_by: 'Filtrer par',
        filter_wilaya: 'Wilaya',
        filter_service: 'Type de service',
        filter_price: 'Prix',
        filter_rating: 'Évaluation',
        filter_online: 'Disponible maintenant',
        map_view: 'Vue carte',
        list_view: 'Vue liste',
        nearest: 'Le plus proche',
        highest_rated: 'Le mieux noté',
        
        // Abonnements et favoris
        follow: 'Suivre',
        unfollow: 'Ne plus suivre',
        following_count: 'abonné(s)',
        add_to_favorites: 'Ajouter aux favoris',
        remove_from_favorites: 'Retirer des favoris',
        favorites: 'Favoris',
        
        // Publications et stories
        posts: 'Publications',
        stories: 'Stories',
        new_post: 'Nouvelle publication',
        post_content: 'Contenu de la publication',
        add_photos: 'Ajouter des photos',
        story_expires_in: 'La story expire dans',
        
        // Notifications
        notifications: 'Notifications',
        no_notifications: 'Aucune notification',
        review_reminder: "Rappelez-moi d'évaluer mon expérience",
        
        // Erreurs et messages
        error_general: 'Une erreur est survenue, veuillez réessayer',
        error_network: 'Erreur de connexion Internet',
        error_unauthorized: 'Veuillez vous connecter d\'abord',
        error_booking_limit: 'Le compte a atteint la limite quotidienne de réservations',
        error_already_reviewed: 'Vous avez déjà évalué ce compte',
        error_already_following: 'Vous suivez déjà ce compte',
        success_booking: 'Demande de réservation envoyée avec succès',
        success_review: 'Merci pour votre évaluation',
        success_follow: 'Abonnement réussi',
        success_unfollow: 'Désabonnement réussi',
        
        // Jours de la semaine
        saturday: 'Samedi',
        sunday: 'Dimanche',
        monday: 'Lundi',
        tuesday: 'Mardi',
        wednesday: 'Mercredi',
        thursday: 'Jeudi',
        friday: 'Vendredi',
        
        // Urgence
        emergency_title: 'Urgence féminine',
        emergency_desc: 'Service urgent sous 2 heures',
        emergency_request: 'Demander un service urgent',
        
        // Admin
        admin_panel: "Panneau d'administration",
        pending_businesses: 'Comptes en attente',
        active_businesses: 'Comptes actifs',
        reported_businesses: 'Comptes signalés',
        payment_requests: 'Demandes de paiement',
        verify_id_card: "Vérifier la carte d'identité",
        approve_account: 'Approuver le compte',
        reject_account: 'Rejeter le compte',
        ban_account: 'Bannir le compte',
        unban_account: 'Levée du bannissement',
        
        // Développeur
        developer_name: 'Équipe Lila',
        developer_title: 'Développement d\'applications | Algérie',
        contact_email: 'E-mail',
        contact_telegram: 'Telegram',
        close: 'Fermer',
        
        // Erreurs Supabase
        error_supabase_connection: 'Erreur de connexion à la base de données',
        error_duplicate: 'Ce compte existe déjà',
        error_permission: 'Vous n\'avez pas la permission'
    }
};

// الحالة العامة
let currentLang = 'ar';
let langListeners = [];

// الحصول على النص المترجم
function t(key, params = {}) {
    let text = translations[currentLang]?.[key] || translations['ar'][key] || key;
    Object.keys(params).forEach(param => {
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
    });
    return text;
}

// تغيير اللغة
function setLanguage(lang, saveToStorage = true) {
    if (lang !== 'ar' && lang !== 'fr') return;
    
    currentLang = lang;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    
    if (saveToStorage) localStorage.setItem('lila_lang', lang);
    
    updateAllTranslations();
    notifyLangListeners();
}

// تحديث جميع العناصر القابلة للترجمة
function updateAllTranslations() {
    // تحديث النص الداخلي
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
    });
    
    // تحديث placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) el.placeholder = t(key);
    });
    
    // تحديث أزرار اللغة النشطة
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const lang = btn.getAttribute('data-lang');
        if (lang === currentLang) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

// تحميل اللغة المحفوظة
function loadSavedLanguage() {
    const savedLang = localStorage.getItem('lila_lang');
    if (savedLang === 'ar' || savedLang === 'fr') {
        setLanguage(savedLang, false);
    } else {
        const browserLang = navigator.language || navigator.userLanguage;
        setLanguage(browserLang?.startsWith('fr') ? 'fr' : 'ar', true);
    }
}

// نظام المستمعين
function addLangListener(listener) { langListeners.push(listener); }
function removeLangListener(listener) { langListeners = langListeners.filter(l => l !== listener); }
function notifyLangListeners() { langListeners.forEach(l => { try { l(currentLang); } catch(e) {} }); }

// تهيئة أزرار اللغة
function initLanguageButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.removeEventListener('click', onLangButtonClick);
        btn.addEventListener('click', onLangButtonClick);
    });
}

function onLangButtonClick(e) {
    const lang = e.currentTarget.getAttribute('data-lang');
    if (lang) setLanguage(lang);
}

// التصدير
window.lang = { t, setLanguage, getCurrentLang: () => currentLang, addLangListener, removeLangListener, updateAllTranslations, loadSavedLanguage, initLanguageButtons };

// تهيئة تلقائية
document.addEventListener('DOMContentLoaded', () => {
    loadSavedLanguage();
    initLanguageButtons();
    
    // مراقبة الإضافات الديناميكية
    const observer = new MutationObserver(() => updateAllTranslations());
    observer.observe(document.body, { childList: true, subtree: true });
});

console.log('[Lang] Module initialized');