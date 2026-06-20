// ============================================================
// LILA - أبراج اليوم (JavaScript) - نسخة مع الحفاظ على الاستخراج الأصلي
// ============================================================

(async function() {
  // ========== 1. بيانات الأبراج الأساسية ==========
  const zodiacSigns = [
    { id: "aries",     name: "الحمل",     nameEn: "Aries",     image: "https://cdn-icons-png.flaticon.com/512/2897/2897562.png" },
    { id: "taurus",    name: "الثور",     nameEn: "Taurus",    image: "https://cdn-icons-png.flaticon.com/512/2897/2897563.png" },
    { id: "gemini",    name: "الجوزاء",   nameEn: "Gemini",    image: "https://cdn-icons-png.flaticon.com/512/2897/2897564.png" },
    { id: "cancer",    name: "السرطان",   nameEn: "Cancer",    image: "https://cdn-icons-png.flaticon.com/512/2897/2897565.png" },
    { id: "leo",       name: "الأسد",     nameEn: "Leo",       image: "https://cdn-icons-png.flaticon.com/512/2897/2897566.png" },
    { id: "virgo",     name: "العذراء",   nameEn: "Virgo",     image: "https://cdn-icons-png.flaticon.com/512/2897/2897567.png" },
    { id: "libra",     name: "الميزان",   nameEn: "Libra",     image: "https://cdn-icons-png.flaticon.com/512/2897/2897568.png" },
    { id: "scorpio",   name: "العقرب",    nameEn: "Scorpio",   image: "https://cdn-icons-png.flaticon.com/512/2897/2897569.png" },
    { id: "sagittarius", name: "القوس",   nameEn: "Sagittarius", image: "https://cdn-icons-png.flaticon.com/512/2897/2897570.png" },
    { id: "capricorn", name: "الجدي",     nameEn: "Capricorn", image: "https://cdn-icons-png.flaticon.com/512/2897/2897571.png" },
    { id: "aquarius",  name: "الدلو",     nameEn: "Aquarius",  image: "https://cdn-icons-png.flaticon.com/512/2897/2897572.png" },
    { id: "pisces",    name: "الحوت",     nameEn: "Pisces",    image: "https://cdn-icons-png.flaticon.com/512/2897/2897573.png" }
  ];

  // ========== 2. إعدادات الجلب ==========
  const PROXY = "https://corsproxy.io/?url=";
  const YOUm7_SECTION_URL = "https://www.youm7.com/Section/حظك-اليوم/330/1";
  
  let cachedLinks = null;
  let lastFetchTime = 0;
  const CACHE_DURATION = 6 * 60 * 60 * 1000;

  // ========== 3. جلب روابط اليوم (نفس الطريقة التي نجحت) ==========
  async function fetchTodayLinks() {
    const now = Date.now();
    if (cachedLinks && (now - lastFetchTime) < CACHE_DURATION) {
      return cachedLinks;
    }
    
    const res = await fetch(PROXY + encodeURIComponent(YOUm7_SECTION_URL));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    
    const allLinks = [...doc.querySelectorAll("a[href]")];
    const zodiacLinks = allLinks.filter(a => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent || "";
      return href.startsWith("/story/") && text.includes("برج");
    }).slice(0, 12);
    
    const linksWithSigns = zodiacLinks.map(link => {
      const fullUrl = "https://m.youm7.com" + link.getAttribute("href");
      const linkText = link.textContent.trim();
      let signName = "";
      for (const sign of zodiacSigns) {
        if (linkText.includes(sign.name)) {
          signName = sign.name;
          break;
        }
      }
      return { url: fullUrl, text: linkText, signName };
    });
    
    cachedLinks = linksWithSigns;
    lastFetchTime = now;
    return cachedLinks;
  }

  async function getSignUrl(signName) {
    const links = await fetchTodayLinks();
    const matchedLink = links.find(link => link.signName === signName);
    if (matchedLink) return matchedLink.url;
    
    const flexibleMatch = links.find(link => link.text.includes(signName));
    if (flexibleMatch) return flexibleMatch.url;
    
    throw new Error(`لم يتم العثور على رابط لبرج ${signName}`);
  }

  // ========== 4. دالة الجلب من Proxy ==========
  async function fetchHoroscopePage(url) {
    const res = await fetch(PROXY + encodeURIComponent(url), {
      headers: { "X-Requested-With": "XMLHttpRequest" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  // ========== 5. دالة الاستخراج الأصلية (من الكود الأول الذي أعطيتني إياه) ==========
  // هذه هي نفس الدالة التي كانت تعمل بشكل كامل ولم تفسد شيئًا
  function extractYoum7Horoscope(doc, signName) {
    // البحث عن جميع عناصر h2.coloredquoute
    const allH2 = [...doc.querySelectorAll("h2.coloredquoute")];
    
    // البحث عن الـ h2 الذي يحتوي على "برج [الاسم] في حظك اليوم"
    const startH2 = allH2.find(h => h.textContent.includes(`برج ${signName} في حظك اليوم`));
    
    // البحث عن نهاية المقطع (h2 الذي يحتوي على "برج الحمل وتوقعات علماء الفلك" أو ما شابه)
    const endH2 = allH2.find(h => h.textContent.includes("برج الحمل وتوقعات علماء الفلك") || 
                                   h.textContent.includes("توقعات علماء الفلك"));
    
    if (!startH2) {
      // محاولة بديلة: البحث عن أي h2 يحتوي على اسم البرج
      const altStart = allH2.find(h => h.textContent.includes(signName));
      if (!altStart) return null;
      
      let result = [];
      let el = altStart.nextElementSibling;
      while (el && el !== endH2) {
        if (el.tagName === "P") result.push(el.textContent.trim());
        if (el.tagName === "H2") result.push("【 " + el.textContent.trim() + " 】");
        el = el.nextElementSibling;
      }
      if (endH2) result.push("【 " + endH2.textContent.trim() + " 】\n" + endH2.nextElementSibling?.textContent?.trim());
      return result.filter(Boolean).join("\n\n").replace(/اليوم السابع/g, "SOUK NSA") || null;
    }
    
    // الاستخراج الكامل كما في الكود الأصلي
    let result = [];
    let el = startH2.nextElementSibling;
    
    while (el && el !== endH2) {
      if (el.tagName === "P") result.push(el.textContent.trim());
      if (el.tagName === "H2") result.push("【 " + el.textContent.trim() + " 】");
      el = el.nextElementSibling;
    }
    
    if (endH2) {
      result.push("【 " + endH2.textContent.trim() + " 】");
      if (endH2.nextElementSibling?.tagName === "P") {
        result.push(endH2.nextElementSibling.textContent.trim());
      }
    }
    
    if (result.length === 0) return null;
    
    // استبدال "اليوم السابع" بـ "SOUK NSA" كما في الطلب الأصلي
    return result.filter(Boolean).join("\n\n").replace(/اليوم السابع/g, "SOUK NSA");
  }

  // ========== 6. دالة جلب التوقعات ==========
  async function fetchHoroscopeForSign(sign) {
    const url = await getSignUrl(sign.name);
    console.log(`جلب توقعات ${sign.name} من: ${url}`);
    const doc = await fetchHoroscopePage(url);
    const extracted = extractYoum7Horoscope(doc, sign.name);
    if (!extracted) throw new Error(`لم يتم العثور على محتوى حظ البرج (${sign.name})`);
    return extracted;
  }

  // ========== 7. باقي الكود (واجهة المستخدم، بدون تغيير) ==========
  const gridContainer = document.getElementById("zodiacGrid");
  const displayDiv = document.getElementById("horoscopeDisplay");

  function createRipple(event, element) {
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const ripple = document.createElement("span");
    ripple.className = "ripple-effect";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    element.style.position = "relative";
    element.style.overflow = "hidden";
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }

  async function loadHoroscope(sign) {
    displayDiv.innerHTML = `
      <div class="horoscope-result-card">
        <div class="horoscope-header">
          <span class="horoscope-title">✨ برج ${sign.name} ✨</span>
          <span class="horoscope-source-badge">جاري البحث...</span>
        </div>
        <div class="loading-state">🔮 جاري جلب التوقعات من SOUK NSA...</div>
      </div>
    `;
    
    try {
      const horoscopeText = await fetchHoroscopeForSign(sign);
      displayDiv.innerHTML = `
        <div class="horoscope-result-card">
          <div class="horoscope-header">
            <span class="horoscope-title">🌟 برج ${sign.name} - حظك اليوم 🌟</span>
            <button class="refresh-horoscope" id="refreshHoroscopeBtn">🔄 تحديث التوقعات</button>
          </div>
          <div class="horoscope-content">
            ${horoscopeText.replace(/\n/g, '<br>')}
          </div>
        </div>
      `;
      const refreshBtn = document.getElementById("refreshHoroscopeBtn");
      if (refreshBtn) refreshBtn.addEventListener("click", () => loadHoroscope(sign));
    } catch (err) {
      displayDiv.innerHTML = `
        <div class="horoscope-result-card">
          <div class="horoscope-header">
            <span class="horoscope-title">⚠️ برج ${sign.name}</span>
          </div>
          <div class="error-state">
            🚫 ${err.message}<br>
            <button class="refresh-horoscope" id="retryFetchBtn" style="margin-top:12px;">📡 إعادة المحاولة</button>
          </div>
        </div>
      `;
      const retry = document.getElementById("retryFetchBtn");
      if (retry) retry.addEventListener("click", () => loadHoroscope(sign));
    }
  }

  function renderButtons() {
    gridContainer.innerHTML = "";
    zodiacSigns.forEach((sign, idx) => {
      const btn = document.createElement("button");
      btn.className = "action-btn";
      btn.style.setProperty("--btn-accent", `hsl(${20 + idx * 25}, 80%, 55%)`);
      
      const img = document.createElement("img");
      img.src = sign.image;
      img.alt = sign.name;
      img.className = "btn-icon-img";
      img.onerror = () => img.src = "https://cdn-icons-png.flaticon.com/512/272/272401.png";
      
      const textSpan = document.createElement("div");
      textSpan.className = "btn-text";
      textSpan.innerText = sign.name;
      
      const glowSpan = document.createElement("div");
      glowSpan.className = "btn-glow";
      
      btn.appendChild(img);
      btn.appendChild(textSpan);
      btn.appendChild(glowSpan);
      
      btn.addEventListener("click", (e) => {
        createRipple(e, btn);
        loadHoroscope(sign);
      });
      
      gridContainer.appendChild(btn);
    });
  }

  function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    
    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();
    
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 1,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.2 + 0.1,
        color: Math.random() > 0.7 ? `rgba(255,140,0,${Math.random() * 0.6})` : `rgba(30,111,255,${Math.random() * 0.4})`
      });
    }
    
    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  renderButtons();
  initParticles();
  
  setTimeout(async () => {
    try {
      await fetchTodayLinks();
      loadHoroscope(zodiacSigns[0]);
    } catch (err) {
      loadHoroscope(zodiacSigns[0]);
    }
  }, 100);
  
  const modal = document.getElementById('devModal');
  const devBtn = document.getElementById('devContactBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  if (devBtn && modal && closeBtn) {
    devBtn.onclick = () => modal.classList.add('show');
    closeBtn.onclick = () => modal.classList.remove('show');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('show'); };
  }
  
  let musicOn = false;
  const musicBtn = document.getElementById('musicToggleBtn');
  if (musicBtn) {
    musicBtn.onclick = () => {
      musicOn = !musicOn;
      musicBtn.textContent = musicOn ? "🔊" : "🔇";
    };
  }
  
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.onclick = function() {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.documentElement.setAttribute('dir', this.dataset.lang === 'fr' ? 'ltr' : 'rtl');
    };
  });
})();