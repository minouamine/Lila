/**
 * voice-orders.js
 * - زر ميكروفون عائم
 * - نافذة محادثة صغيرة (messenger style)
 * - إدخال يدوي + صوتي
 * - معالجة الأوامر المحددة في voice-commands.js
 */

(function () {

    // ─── تحميل الأوامر من الملف المنفصل ──────────────────────
    // ملاحظة: يجب تحميل voice-commands.js قبل هذا الملف في HTML

    // ─── الدوال المساعدة للأوامر ──────────────────────────────

    // دالة تبديل الثيم
    window.toggleTheme = function(mode) {
        const link = document.getElementById('theme-style');
        if (!link) {
            // إذا لم يوجد عنصر style، نضيفه
            const newLink = document.createElement('link');
            newLink.id = 'theme-style';
            newLink.rel = 'stylesheet';
            newLink.href = mode === 'dark' ? '/css/main.css' : '/css/light-mode.css';
            document.head.appendChild(newLink);
        } else {
            link.href = mode === 'dark' ? '/css/main.css' : '/css/light-mode.css';
        }
        
        // حفظ التفضيل في localStorage
        localStorage.setItem('theme', mode);
        addMsg(`🌓 Mode ${mode === 'dark' ? 'nuit' : 'jour'} activé`, 'success');
    };

    // دالة البحث
    window.performSearch = function(query) {
        if (!query) {
            addMsg('❌ Veuillez préciser ce que vous voulez rechercher', 'error');
            return;
        }
        
        // البحث عن خانة البحث في الصفحة الحالية
        const searchInput = document.querySelector('input[type="search"], input.search, #search-input, .search-input');
        
        if (searchInput) {
            searchInput.value = query;
            searchInput.focus();
            
            // محاولة تشغيل حدث البحث إذا كان موجوداً
            const event = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(event);
            
            // محاولة الضغط على زر البحث إذا وجد
            const searchBtn = document.querySelector('button[type="submit"], .search-btn, #search-btn');
            if (searchBtn) {
                setTimeout(() => searchBtn.click(), 300);
            }
            
            addMsg(`🔍 Recherche : "${query}"`, 'success');
        } else {
            // إذا لم توجد خانة بحث، نفتح محرك بحث أو نعرض رسالة
            addMsg(`⚠️ Aucune barre de recherche trouvée sur cette page`, 'error');
            console.warn('[VoiceOrders] ❌ Champ de recherche introuvable');
            
            // بديل: إعادة توجيه إلى صفحة البحث مع المعامل
            // window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
        }
    };

    // دالة الخروج
    window.performLogout = function() {
        // حذف بيانات الجلسة
        localStorage.removeItem('user');
        sessionStorage.clear();
        
        // حذف الكوكيز إذا وجدت
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        addMsg('👋 Déconnexion en cours...', 'success');
        
        // إعادة توجيه إلى صفحة تسجيل الدخول بعد ثانية
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
    };

    // ─── normalisation texte ────────────────────────────────────
    function normalize(t) {
        return t.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, '').trim();
    }

    function matchCommand(text) {
        const n = normalize(text);
        
        // محاولة العثور على أمر مطابق
        for (const cmd of VOICE_COMMANDS) {
            for (const p of cmd.patterns) {
                if (n.includes(normalize(p))) {
                    // استخراج البارامتر إن وجد (بعد الكلمة المفتاحية)
                    const param = extractParameter(text, p);
                    return { command: cmd, param: param };
                }
            }
        }
        return null;
    }

    // استخراج البارامتر من النص (مثلاً: "rechercher coiffeur" → "coiffeur")
    function extractParameter(fullText, matchedPattern) {
        const normalizedFull = normalize(fullText);
        const normalizedPattern = normalize(matchedPattern);
        
        // إزالة الكلمة المفتاحية من النص
        let remaining = normalizedFull.replace(normalizedPattern, '').trim();
        
        // إذا بقي شيء، فهو البارامتر
        if (remaining.length > 0) {
            return remaining;
        }
        return null;
    }

    // ─── حالة التطبيق ────────────────────────────────────────────
    let recognition = null;
    let isListening = false;

    // ─── injection CSS ──────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #vo-fab {
            position: fixed; bottom: 24px; left: 24px; z-index: 9999;
            width: 52px; height: 52px; border-radius: 50%;
            background: #7c3aed; color: #fff; font-size: 22px;
            border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(124,58,237,.5);
            display: flex; align-items: center; justify-content: center;
            transition: background .2s;
        }
        #vo-fab.listening { background: #dc2626; animation: vo-pulse 1s infinite; }
        @keyframes vo-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.5)} 50%{box-shadow:0 0 0 10px rgba(220,38,38,0)} }

        #vo-panel {
            position: fixed; bottom: 86px; left: 24px; z-index: 9998;
            width: 320px; max-width: 90vw; background: #1e1e2e; border-radius: 18px;
            box-shadow: 0 8px 32px rgba(0,0,0,.45);
            font-family: system-ui, sans-serif; font-size: 14px;
            overflow: hidden; display: none; flex-direction: column;
            max-height: 500px;
        }
        #vo-panel.open { display: flex; }

        #vo-header {
            background: #7c3aed; color: #fff; padding: 10px 14px;
            display: flex; justify-content: space-between; align-items: center;
            font-weight: 600; font-size: 13px;
            flex-shrink: 0;
        }
        #vo-close-btn {
            background: none; border: none; color: #fff;
            font-size: 16px; cursor: pointer; line-height: 1;
        }

        #vo-messages {
            flex: 1; padding: 12px; overflow-y: auto;
            max-height: 250px; display: flex; flex-direction: column; gap: 8px;
        }

        .vo-msg {
            max-width: 85%; padding: 8px 12px; border-radius: 16px;
            line-height: 1.4; word-break: break-word;
        }
        .vo-msg.bot {
            background: #2d2d44; color: #e2e2f0;
            border-bottom-left-radius: 4px; align-self: flex-start;
        }
        .vo-msg.user {
            background: #7c3aed; color: #fff;
            border-bottom-right-radius: 4px; align-self: flex-end;
        }
        .vo-msg.success { background: #16a34a; color: #fff; align-self: flex-start; border-bottom-left-radius: 4px; }
        .vo-msg.error   { background: #991b1b; color: #fff; align-self: flex-start; border-bottom-left-radius: 4px; }

        #vo-input-row {
            display: flex; gap: 6px; padding: 10px 12px;
            border-top: 1px solid #2d2d44; align-items: center;
            flex-shrink: 0;
        }
        #vo-text-input {
            flex: 1; background: #2d2d44; border: none; border-radius: 20px;
            padding: 8px 12px; color: #e2e2f0; font-size: 13px; outline: none;
        }
        #vo-text-input::placeholder { color: #6b6b8a; }
        #vo-send-btn {
            background: #7c3aed; border: none; color: #fff;
            border-radius: 50%; width: 34px; height: 34px;
            cursor: pointer; font-size: 16px; display: flex;
            align-items: center; justify-content: center;
        }
        #vo-mic-btn {
            background: none; border: none; color: #a78bfa;
            font-size: 18px; cursor: pointer; padding: 4px;
        }
        #vo-mic-btn.listening { color: #dc2626; }
    `;
    document.head.appendChild(style);

    // ─── HTML ───────────────────────────────────────────────────
    const wrap = document.createElement('div');
    wrap.innerHTML = `
        <button id="vo-fab" title="Commandes vocales">🎙️</button>

        <div id="vo-panel">
            <div id="vo-header">
                <span>🎙️ Layla — Commandes</span>
                <button id="vo-close-btn">✕</button>
            </div>
            <div id="vo-messages"></div>
            <div id="vo-input-row">
                <input id="vo-text-input" placeholder="Tapez une commande…" autocomplete="off">
                <button id="vo-send-btn" title="Envoyer">➤</button>
                <button id="vo-mic-btn" title="Microphone">🎤</button>
            </div>
        </div>
    `;
    document.body.appendChild(wrap);

    const fab      = document.getElementById('vo-fab');
    const panel    = document.getElementById('vo-panel');
    const closeBtn = document.getElementById('vo-close-btn');
    const messages = document.getElementById('vo-messages');
    const textInput= document.getElementById('vo-text-input');
    const sendBtn  = document.getElementById('vo-send-btn');
    const micBtn   = document.getElementById('vo-mic-btn');

    // ─── messages ───────────────────────────────────────────────
    function addMsg(text, type = 'bot') {
        const el = document.createElement('div');
        el.className = `vo-msg ${type}`;
        el.textContent = text;
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
    }

    // ─── traitement commande ─────────────────────────────────────
    function processText(text) {
        addMsg(text, 'user');
        console.log(`%c[VoiceOrders] 🎤 Reçu : "${text}"`, 'color:#38bdf8;font-style:italic');

        const result = matchCommand(text);
        if (result) {
            const cmd = result.command;
            const param = result.param;
            
            console.log(`%c[VoiceOrders] ✅ Commande : ${cmd.label} ${param ? '→ param: "'+param+'"' : ''}`, 'color:#4ade80;font-weight:bold');
            addMsg(`✅ Commande reconnue : ${cmd.label}`, 'success');
            
            setTimeout(() => {
                console.log(`%c[VoiceOrders] 🚀 Exécution…`, 'color:#4ade80');
                if (param) {
                    cmd.action(param);
                } else {
                    cmd.action();
                }
            }, 600);
        } else {
            console.warn(`[VoiceOrders] ❌ Aucune commande pour : "${text}"`);
            addMsg('❌ Commande non reconnue. Essayez : "ouvrir mon compte"', 'error');
        }
    }

    // ─── envoi manuel ────────────────────────────────────────────
    function sendText() {
        const t = textInput.value.trim();
        if (!t) return;
        textInput.value = '';
        processText(t);
    }

    sendBtn.addEventListener('click', sendText);
    textInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendText(); });

    // ─── toggle panel ─────────────────────────────────────────────
    fab.addEventListener('click', () => {
        panel.classList.toggle('open');
        if (panel.classList.contains('open') && messages.children.length === 0) {
            addMsg('Bonjour ! Dites ou tapez une commande. Ex : "ouvrir mon compte"');
            addMsg('💡 Commandes disponibles :', 'bot');
            VOICE_COMMANDS.forEach(cmd => {
                addMsg(`• ${cmd.patterns[0]}`, 'bot');
            });
        }
    });
    closeBtn.addEventListener('click', () => panel.classList.remove('open'));

    // ─── microphone ──────────────────────────────────────────────
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        micBtn.title = 'Navigateur non compatible';
        micBtn.style.opacity = '0.3';
        micBtn.disabled = true;
        console.warn('[VoiceOrders] ❌ SpeechRecognition non supporté');
    } else {
        recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
            fab.classList.add('listening');
            fab.textContent = '🔴';
            console.log('%c[VoiceOrders] 🎙️ Écoute…', 'color:#a78bfa;font-weight:bold');
            addMsg('🎙️ Je vous écoute…');
        };

        recognition.onresult = (e) => {
            const text = e.results[0][0].transcript;
            console.log(`%c[VoiceOrders] 🗣️ Entendu : "${text}"`, 'color:#38bdf8;font-style:italic');
            processText(text);
        };

        recognition.onerror = (e) => {
            console.error(`[VoiceOrders] ❌ Erreur micro : ${e.error}`);
            if (e.error !== 'no-speech') {
                addMsg(`⚠️ Erreur micro : ${e.error}`, 'error');
            }
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove('listening');
            fab.classList.remove('listening');
            fab.textContent = '🎙️';
            console.log('[VoiceOrders] ⏹️ Fin d\'écoute');
        };

        micBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                panel.classList.add('open');
                try {
                    recognition.start();
                } catch (e) {
                    console.error('[VoiceOrders] Erreur démarrage micro:', e);
                }
            }
        });
    }

    // ─── تحميل الثيم المحفوظ ──────────────────────────────────
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        // تطبيق الثيم المحفوظ عند التحميل
        const link = document.getElementById('theme-style');
        if (link) {
            link.href = savedTheme === 'dark' ? '/css/main.css' : '/css/light-mode.css';
        }
    }

    console.log('%c[VoiceOrders] ✅ Chargé — ' + VOICE_COMMANDS.length + ' commandes disponibles', 'color:#a78bfa;font-weight:bold');

})();