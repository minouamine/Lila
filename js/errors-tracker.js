// =====================================
// أداة تتبع الأخطاء + تنفيذ كود JS (للتطوير فقط)
// =====================================
(function () {
    // ---- عداد السجلات ----
    let logCounter = 0;

    // ---- دالة addLine (تُعرّف فوراً في البداية) ----
    function addLine(text, color, isImportant = false) {
        // نفحص نوع الرسالة قبل عرضها
        const isGeneralError = text.includes('[General Error]');
        const isUIError = text.includes('[UI Error]');
        const isConsoleError = text.includes('[ERROR]') && !text.includes('[LOG]') && !text.includes('[WARN]') && !text.includes('[INFO]');
        
        // إذا لم يكن أي من هذه الأنواع، نتجاوز الرسالة
        if (!isGeneralError && !isUIError && !isConsoleError) {
            return;
        }
        
        // نبحث عن اللوحة، إذا لم توجد بعد، نخزن الرسائل مؤقتاً
        const logBox = document.getElementById('__logBox__');
        if (!logBox) {
            // اللوحة لم تنشأ بعد، نخزن الرسالة في مصفوفة مؤقتة
            if (!window.__pendingLogs) window.__pendingLogs = [];
            window.__pendingLogs.push({ text, color, isImportant });
            return;
        }
        
        // اللوحة موجودة، نعرض الرسالة
        logCounter++;
        const line = document.createElement('div');
        line.style.color = color || '#0f0';
        line.style.borderBottom = '1px solid #333';
        line.style.padding = '2px 0';
        if (isImportant) {
            line.style.background = 'rgba(255,0,0,0.1)';
            line.style.fontWeight = 'bold';
        }
        line.textContent = `#${logCounter} ${text}`;
        logBox.appendChild(line);
        logBox.scrollTop = logBox.scrollHeight;
    }

    // ---- قائمة كلمات الأخطاء ----
    const ERROR_KEYWORDS = [
        'خطأ', 'فشل', 'تعذر', 'غير موجود', 'لم يتم العثور',
        'غير صحيح', 'لا يعمل', 'مشكلة', 'حدث خطأ',
        'غير متاح', 'من فضلك حاول مرة أخرى', 'يوجد مشكلة',
        'لاتوجد', 'لايوجد', 'عذرا', 'نأسف', 'غير متوفر', 'غير مسموح',
        'erreur', 'échec', 'introuvable', 'non trouvé',
        'incorrect', 'ne fonctionne pas', 'problème',
        'indisponible', 'veuillez réessayer', 'une erreur',
        'error', 'fail', 'not found', 'not available',
        'something went wrong', '404', '500', 'timeout',
        '⚠️', '🚫', '❌'
    ];

    const EXCLUDE_KEYWORDS = [
        'console', 'debug', 'log', 'test', 'example',
        'خطأ في التجميع', 'هذا مثال', 'للاختبار فقط'
    ];

    const reportedErrors = new Set();

    function containsExactWord(text, keyword) {
        if (!text || !keyword) return false;
        const textLower = text.toLowerCase();
        const keywordLower = keyword.toLowerCase();
        if (keyword.includes(' ')) {
            return textLower.includes(keywordLower);
        }
        const regex = new RegExp(
            '(?:^|[\\s\\u0600-\\u06FF\\u200C\\u200D\\s\\p{P}\\p{S}])' + 
            keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 
            '(?:$|[\\s\\u0600-\\u06FF\\u200C\\u200D\\s\\p{P}\\p{S}])',
            'ui'
        );
        return regex.test(textLower);
    }

    function containsErrorKeyword(text) {
        if (!text || text.length < 2) return false;
        for (const exclude of EXCLUDE_KEYWORDS) {
            if (containsExactWord(text, exclude)) return false;
        }
        for (const keyword of ERROR_KEYWORDS) {
            if (containsExactWord(text, keyword)) return true;
        }
        return false;
    }

    // =============================================
    //  اعتراض الأخطاء العامة (قبل إنشاء اللوحة)
    // =============================================

    const originalOnError = window.onerror;
    window.onerror = function (msg, url, line, col, err) {
        if (originalOnError) {
            originalOnError(msg, url, line, col, err);
        }
        const errorMsg = `[General Error] ${msg} (at ${url || 'unknown'}:${line || '?'}:${col || '?'})`;
        const key = `general|${msg}|${url}|${line}`;
        if (!reportedErrors.has(key)) {
            reportedErrors.add(key);
            addLine(`❌ ${errorMsg}`, '#f55', true);
        }
    };

    window.addEventListener('unhandledrejection', function (e) {
        const errorMsg = `[General Error] Unhandled Promise Rejection: ${e.reason}`;
        const key = `unhandled|${e.reason}`;
        if (!reportedErrors.has(key)) {
            reportedErrors.add(key);
            addLine(`❌ ${errorMsg}`, '#f55', true);
        }
    });

    // =============================================
    //  إنشاء اللوحة وعناصرها
    // =============================================

    // ---- زر التبديل ----
    const toggleBtn = document.createElement('div');
    toggleBtn.id = '__debug_toggle__';
    toggleBtn.textContent = '🐞';
    toggleBtn.style = `
        position: fixed; bottom: 10px; left: 10px;
        width: 40px; height: 40px; border-radius: 50%;
        background: #222; color: #0f0;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; z-index: 1000000;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        cursor: pointer; user-select: none;
        transition: all 0.3s;
    `;
    document.documentElement.appendChild(toggleBtn);

    // ---- اللوحة الرئيسية ----
    const panel = document.createElement('div');
    panel.id = '__debug_panel__';
    panel.style = `
        position: fixed; bottom: 0; left: 0; right: 0;
        height: 45vh; background: rgba(0,0,0,0.92);
        z-index: 999999; display: none;
        flex-direction: column;
        font-family: monospace; font-size: 11px;
        direction: ltr; text-align: left;
    `;
    document.documentElement.appendChild(panel);

    // ---- منطقة السجلات ----
    const logBox = document.createElement('div');
    logBox.id = '__logBox__';
    logBox.style = `
        flex: 1; overflow-y: auto; padding: 6px;
        color: #0f0; white-space: pre-wrap; word-break: break-all;
        border-bottom: 1px solid #444;
    `;
    panel.appendChild(logBox);

    // ---- عرض الرسائل المعلقة (التي حدثت قبل إنشاء اللوحة) ----
    if (window.__pendingLogs) {
        const pending = window.__pendingLogs;
        window.__pendingLogs = null;
        pending.forEach(log => {
            addLine(log.text, log.color, log.isImportant);
        });
    }

    // ---- منطقة تنفيذ الكود ----
    const execArea = document.createElement('div');
    execArea.style = `
        display: flex; flex-direction: column;
        padding: 6px; background: #111; gap: 4px;
    `;
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'اكتب أو الصق كود JS هنا...';
    textarea.style = `
        width: 100%; height: 60px; background: #000; color: #0af;
        border: 1px solid #444; font-family: monospace; font-size: 12px;
        padding: 4px; box-sizing: border-box; resize: vertical;
    `;
    const btnRow = document.createElement('div');
    btnRow.style = 'display:flex; gap:6px;';

    const runBtn = document.createElement('button');
    runBtn.textContent = 'Execute ▶';
    runBtn.style = 'flex:1; padding:6px; background:#0a5; color:#fff; border:none; border-radius:4px; font-size:13px;';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear logs';
    clearBtn.style = 'flex:1; padding:6px; background:#555; color:#fff; border:none; border-radius:4px; font-size:13px;';
    clearBtn.addEventListener('click', () => {
        logBox.innerHTML = '';
        reportedErrors.clear();
    });

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy console';
    copyBtn.style = 'flex:1; padding:6px; background:#06c; color:#fff; border:none; border-radius:4px; font-size:13px;';
    copyBtn.addEventListener('click', () => {
        const text = logBox.innerText;
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = '✅ Copied';
            setTimeout(() => copyBtn.textContent = 'Copy console', 1000);
        }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style = 'position:fixed; top:0; left:0; width:100%; height:50%; z-index:1000001;';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            copyBtn.textContent = '✅ Copied';
            setTimeout(() => copyBtn.textContent = 'Copy console', 1000);
        });
    });

    btnRow.appendChild(runBtn);
    btnRow.appendChild(clearBtn);
    btnRow.appendChild(copyBtn);
    execArea.appendChild(textarea);
    execArea.appendChild(btnRow);
    panel.appendChild(execArea);

    // ---- منطق التبديل ----
    let isOpen = false;
    toggleBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        panel.style.display = isOpen ? 'flex' : 'none';
        toggleBtn.style.background = isOpen ? '#0a5' : '#222';
    });

    // ---- تنفيذ الكود ----
    runBtn.addEventListener('click', async () => {
        const code = textarea.value;
        if (!code.trim()) return;
        addLine('▶ ' + code, '#ff0');
        try {
            const result = await (async () => {
                return eval(`(async () => { ${code} })()`);
            })();
            if (result !== undefined) {
                addLine('= ' + safeStringify(result), '#0af');
            } else {
                addLine('✅ تم التنفيذ', '#0af');
            }
        } catch (err) {
            addLine('❌ ' + (err && err.message ? err.message : String(err)), '#f55');
        }
    });

    function safeStringify(val) {
        try {
            return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
        } catch (e) {
            return String(val);
        }
    }

    // =============================================
    //  فحص واجهة المستخدم
    // =============================================

    const EXCLUDE_TAGS = ['script', 'style', 'noscript', 'template', 'iframe'];

    function scanPageForErrors() {
        const allElements = document.querySelectorAll('*');
        const foundErrors = [];

        allElements.forEach(el => {
            if (EXCLUDE_TAGS.includes(el.tagName.toLowerCase())) return;
            if (el.closest('#__debug_panel__')) return;
            if (el.id === '__debug_panel__' || el.id === '__logBox__' || el.id === '__debug_toggle__') {
                return;
            }

            let text = '';
            if (el.childNodes.length === 0) {
                text = el.textContent || '';
            } else {
                for (const child of el.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        text += child.textContent || '';
                    }
                }
            }
            
            text = text.trim();
            if (text.length < 2) return;
            
            if (containsErrorKeyword(text)) {
                let location = '';
                if (el.id) location += `#${el.id}`;
                if (el.className && typeof el.className === 'string') {
                    const classes = el.className.split(' ').filter(c => c && !c.startsWith('__')).join('.');
                    if (classes) location += (location ? '.' : '') + classes;
                }
                if (!location) location = el.tagName.toLowerCase();
                
                const rect = el.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && 
                                 window.getComputedStyle(el).display !== 'none' &&
                                 window.getComputedStyle(el).visibility !== 'hidden';
                
                const errorKey = `ui|${text.substring(0, 50)}|${location}`;
                
                foundErrors.push({
                    key: errorKey,
                    element: el,
                    text: text.substring(0, 200),
                    location: location,
                    isVisible: isVisible,
                    tag: el.tagName.toLowerCase()
                });
            }
        });

        const uniqueErrors = [];
        const seenTexts = new Set();
        foundErrors.forEach(err => {
            if (!seenTexts.has(err.key)) {
                seenTexts.add(err.key);
                uniqueErrors.push(err);
            }
        });

        return uniqueErrors;
    }

    function reportUIErrors() {
        const errors = scanPageForErrors();
        if (errors.length === 0) return;

        errors.forEach(err => {
            if (reportedErrors.has(err.key)) {
                return;
            }
            
            reportedErrors.add(err.key);
            
            const visibility = err.isVisible ? '' : ' [hidden]';
            const errorMsg = `[UI Error] "${err.text}" (${err.location})${visibility}`;
            const color = err.isVisible ? '#fa0' : '#886';
            addLine(`⚠️ ${errorMsg}`, color, !err.isVisible);
        });
    }

    // =============================================
    //  تشغيل الفحص التلقائي
    // =============================================

    let scanInterval = null;
    let isScanning = false;

    function startUIScanning() {
        setTimeout(reportUIErrors, 100);
        setTimeout(reportUIErrors, 500);
        setTimeout(reportUIErrors, 1000);
        setTimeout(reportUIErrors, 3000);
        setTimeout(reportUIErrors, 5000);
        setTimeout(reportUIErrors, 10000);

        if (scanInterval) clearInterval(scanInterval);
        scanInterval = setInterval(reportUIErrors, 3000);
    }

    // ---- مراقبة التغييرات في DOM ----
    let uiScanTimeout = null;

    const observer = new MutationObserver(function(mutations) {
        for (const mutation of mutations) {
            if (mutation.target.closest && mutation.target.closest('#__debug_panel__')) {
                return;
            }
            if (mutation.target.id === '__debug_panel__' || 
                mutation.target.id === '__logBox__' ||
                mutation.target.id === '__debug_toggle__') {
                return;
            }
        }

        let hasTextChange = false;
        for (const mutation of mutations) {
            if (mutation.target.closest && mutation.target.closest('#__debug_panel__')) {
                continue;
            }
            
            if (mutation.type === 'characterData') {
                hasTextChange = true;
                break;
            }
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.TEXT_NODE || 
                        (node.nodeType === Node.ELEMENT_NODE && 
                         node.textContent && 
                         node.textContent.length > 0 &&
                         !node.closest('#__debug_panel__'))) {
                        hasTextChange = true;
                        break;
                    }
                }
            }
            if (hasTextChange) break;
        }

        if (hasTextChange && !isScanning) {
            isScanning = true;
            clearTimeout(uiScanTimeout);
            uiScanTimeout = setTimeout(() => {
                reportUIErrors();
                isScanning = false;
            }, 300);
        }
    });

    // ---- مراقبة تغيير الصفحة (SPA) ----
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            reportedErrors.clear();
            setTimeout(reportUIErrors, 500);
            setTimeout(reportUIErrors, 2000);
        }
    }, 500);

    // ---- بدء التشغيل ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            startUIScanning();
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: false
            });
        });
    } else {
        startUIScanning();
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: false
        });
    }

    // =============================================
    //  إعادة توجيه console.log
    // =============================================
    ['log', 'warn', 'error', 'info'].forEach(function (level) {
        const orig = console[level];
        const colors = { log: '#0f0', warn: '#fa0', error: '#f55', info: '#0af' };
        console[level] = function (...args) {
            orig.apply(console, args);
            const text = args.map(a => {
                try {
                    return typeof a === 'object' ? JSON.stringify(a) : String(a);
                } catch (e) {
                    return String(a);
                }
            }).join(' ');
            addLine(`[${level.toUpperCase()}] ${text}`, colors[level]);
        };
    });

    // تم حذف أسطر الترحيب
})();