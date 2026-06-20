/**
 * voice-commands.js
 * تعريف جميع الأوامر الصوتية والنصية
 * كل أمر يحتوي على:
 * - patterns: مصفوفة من الكلمات المفتاحية
 * - label: وصف مختصر للأمر
 * - action: الدالة التي ستُنفذ
 */

const VOICE_COMMANDS = [
  // ─── أمر فتح صفحة الحساب ──────────────────────────────
  {
    patterns: [
      'ouvrir mon compte', 'ouvri mon compte',
      'accéder à mon compte', 'acceder a mon compte',
      'accède à mon compte', 'accede a mon compte',
      'allez à mon compte', 'aller à mon compte',
      'mon compte', 'compte personnel'
    ],
    label: 'Ouvrir mon compte',
    action: () => {
      window.location.href = '/pages/my-account.html';
    }
  },
  
  // ─── أمر فتح صفحة الصالونات ──────────────────────────────
  {
    patterns: [
      'ouvrir la page des salons', 'ouvri la page des salons',
      'accéder aux salons', 'acceder aux salons',
      'allez aux salons', 'aller aux salons',
      'les salons', 'page des salons',
      'salons de coiffure', 'liste des salons'
    ],
    label: 'Ouvrir la page des salons',
    action: () => {
      window.location.href = '/pages/saloons.html';
    }
  },
  
  // ─── أمر الذهاب إلى الصفحة الرئيسية ──────────────────────
  {
    patterns: [
      'aller à la page d accueil', 'aller a la page d accueil',
      'retourner à l accueil', 'retourner a l accueil',
      'page principale', 'accueil',
      'retour à la maison', 'retour a la maison',
      'home', 'index'
    ],
    label: 'Aller à la page d\'accueil',
    action: () => {
      window.location.href = '/index.html';
    }
  },
  
  // ─── أمر التبديل بين الوضع النهاري والليلي ──────────────
  {
    patterns: [
      'activer le mode nuit', 'activer mode nuit',
      'passer en mode nuit', 'mode nuit',
      'activer le mode sombre', 'mode sombre',
      'thème sombre', 'nuit'
    ],
    label: 'Activer le mode nuit',
    action: () => {
      toggleTheme('dark');
    }
  },
  {
    patterns: [
      'activer le mode jour', 'activer mode jour',
      'passer en mode jour', 'mode jour',
      'activer le mode clair', 'mode clair',
      'thème clair', 'jour', 'lumière'
    ],
    label: 'Activer le mode jour',
    action: () => {
      toggleTheme('light');
    }
  },
  
  // ─── أمر البحث في خانة البحث ──────────────────────────────
  {
    patterns: [
      'rechercher', 'chercher',
      'effectuer une recherche', 'faire une recherche',
      'recherche', 'cherche'
    ],
    label: 'Rechercher',
    action: (param) => {
      performSearch(param);
    }
  },
  
  // ─── أمر الخروج من التطبيق ──────────────────────────────
  {
    patterns: [
      'quitter l application', 'quitter',
      'fermer l application', 'fermer',
      'sortir de l application', 'sortir',
      'déconnexion', 'deconnexion',
      'log out', 'logout'
    ],
    label: 'Quitter l\'application',
    action: () => {
      performLogout();
    }
  }
];