// =====================================
// أداة تتبع الأخطاء + تنفيذ كود JS (للتطوير فقط)
// =====================================
(function () {
    // ---- زر التبديل (أيقونة عائمة) ----
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
    logBox.style = `
        flex: 1; overflow-y: auto; padding: 6px;
        color: #0f0; white-space: pre-wrap; word-break: break-all;
        border-bottom: 1px solid #444;
    `;
    panel.appendChild(logBox);

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

const copyBtn = document.createElement('button');
copyBtn.textContent = 'Copy console';
copyBtn.style = 'flex:1; padding:6px; background:#06c; color:#fff; border:none; border-radius:4px; font-size:13px;';
copyBtn.addEventListener('click', () => {
    const text = logBox.innerText;
    navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✅ Copied';
        setTimeout(() => copyBtn.textContent = 'Copy console', 1000);
    }).catch(() => {
        // fallback: نص قابل للتحديد
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

    clearBtn.addEventListener('click', () => {
        logBox.innerHTML = '';
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

    function addLine(text, color) {
        const line = document.createElement('div');
        line.style.color = color || '#0f0';
        line.style.borderBottom = '1px solid #333';
        line.style.padding = '2px 0';
        line.textContent = text;
        logBox.appendChild(line);
        logBox.scrollTop = logBox.scrollHeight;
    }

    // ---- أخطاء JS العامة ----
    window.onerror = function (msg, url, line, col, err) {
        addLine(`❌ ERROR: ${msg}\n  at ${url}:${line}:${col}`, '#f55');
    };

    // ---- Promise rejections غير المعالجة ----
    window.addEventListener('unhandledrejection', function (e) {
        addLine(`❌ UNHANDLED PROMISE: ${e.reason}`, '#f55');
    });

    // ---- إعادة توجيه console.log/warn/error/info ----
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

    addLine('✅ Debug console loaded', '#0af');
})();
