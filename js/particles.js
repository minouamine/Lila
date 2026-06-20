/**
 * ========================================
 * PARTICLES BACKGROUND MODULE
 * مشروع ليلى - LILA
 * خلفية ديناميكية من الجسيمات المتحركة
 * ========================================
 */

// ========================================
// التهيئة والمتغيرات العامة
// ========================================

let canvas = null;
let ctx = null;
let particles = [];
let animationId = null;
let isRunning = true;
let particleCount = 120; // العدد الافتراضي للجسيمات
let particleColors = ['#ff8c00', '#c084fc', '#f472b6', '#1e6fff', '#00c87a']; // برتقالي، بنفسجي، وردي، أزرق، أخضر
let mouseX = null;
let mouseY = null;
let mouseRadius = 100; // نصف قطر تأثير الماوس

// تكوين الجسيمات
const config = {
    minSize: 0.5,
    maxSize: 2.5,
    minSpeed: 0.1,
    maxSpeed: 0.5,
    minOpacity: 0.1,
    maxOpacity: 0.6,
    connectionDistance: 120, // المسافة التي يتم عندها رسم خط بين جسيمين
    showConnections: true,    // عرض خطوط الربط بين الجسيمات
    connectionOpacity: 0.15,  // شفافية خطوط الربط
    mouseInteraction: true,   // تفاعل الجسيمات مع حركة الماوس
    mousePushForce: 0.5,      // قوة دفع الجسيمات عند الماوس
    edgeBehavior: 'wrap'      // 'wrap' أو 'bounce' أو 'reset'
};

// ========================================
// فئة الجسيم (Particle)
// ========================================

class Particle {
    constructor(x = null, y = null) {
        this.reset(x, y);
    }
    
    reset(x = null, y = null) {
        this.x = (x !== null) ? x : Math.random() * canvas.width;
        this.y = (y !== null) ? y : Math.random() * canvas.height;
        this.size = Math.random() * (config.maxSize - config.minSize) + config.minSize;
        this.speedX = (Math.random() - 0.5) * (config.maxSpeed - config.minSpeed) + config.minSpeed;
        this.speedY = (Math.random() - 0.5) * (config.maxSpeed - config.minSpeed) + config.minSpeed;
        this.opacity = Math.random() * (config.maxOpacity - config.minOpacity) + config.minOpacity;
        this.color = particleColors[Math.floor(Math.random() * particleColors.length)];
        this.originalOpacity = this.opacity;
    }
    
    update() {
        // تطبيق تأثير الماوس (دفع الجسيمات بعيداً)
        if (config.mouseInteraction && mouseX !== null && mouseY !== null) {
            const dx = this.x - mouseX;
            const dy = this.y - mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < mouseRadius) {
                const force = (1 - distance / mouseRadius) * config.mousePushForce;
                const angle = Math.atan2(dy, dx);
                this.speedX += Math.cos(angle) * force * 0.5;
                this.speedY += Math.sin(angle) * force * 0.5;
                
                // زيادة الشفافية مؤقتاً عند الاقتراب من الماوس
                this.opacity = Math.min(this.originalOpacity * 1.5, 0.9);
            } else {
                this.opacity = this.originalOpacity;
            }
        }
        
        // تحديث الموضع
        this.x += this.speedX;
        this.y += this.speedY;
        
        // التعامل مع حدود الشاشة
        switch (config.edgeBehavior) {
            case 'wrap':
                if (this.x < 0) this.x = canvas.width;
                if (this.x > canvas.width) this.x = 0;
                if (this.y < 0) this.y = canvas.height;
                if (this.y > canvas.height) this.y = 0;
                break;
                
            case 'bounce':
                if (this.x < 0 || this.x > canvas.width) {
                    this.speedX *= -0.9;
                    this.x = Math.min(Math.max(this.x, 0), canvas.width);
                }
                if (this.y < 0 || this.y > canvas.height) {
                    this.speedY *= -0.9;
                    this.y = Math.min(Math.max(this.y, 0), canvas.height);
                }
                break;
                
            case 'reset':
                if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                    this.reset();
                }
                break;
        }
        
        // تحديث الشفافية تلقائياً لخلق تأثير نبض خفيف
        this.opacity = this.originalOpacity + Math.sin(Date.now() * 0.002 * this.size) * 0.05;
        this.opacity = Math.min(Math.max(this.opacity, 0.05), 0.7);
    }
    
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.fill();
        
        // إضافة توهج خفيف للجسيمات الكبيرة
        if (this.size > 1.5) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 1, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity * 0.3;
            ctx.fill();
        }
    }
}

// ========================================
// رسم خطوط الربط بين الجسيمات
// ========================================

function drawConnections() {
    if (!config.showConnections) return;
    
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i];
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < config.connectionDistance) {
                // حساب الشفافية بناءً على المسافة
                const opacity = config.connectionOpacity * (1 - distance / config.connectionDistance);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(255, 140, 0, ${opacity})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
}

// ========================================
// رسم خلفية متدرجة (اختيارية)
// ========================================

function drawGradientBackground() {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(4, 8, 16, 0)');
    gradient.addColorStop(1, 'rgba(255, 140, 0, 0.02)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ========================================
// حلقة الرسم (Animation Loop)
// ========================================

function animate() {
    if (!isRunning) return;
    if (!ctx || !canvas) return;
    
    // مسح الشاشة
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // رسم خلفية متدرجة (شفافة للحفاظ على خلفية CSS)
    drawGradientBackground();
    
    // تحديث ورسم جميع الجسيمات
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
    }
    
    // رسم خطوط الربط
    drawConnections();
    
    // متابعة الحلقة
    animationId = requestAnimationFrame(animate);
}

// ========================================
// تغيير حجم الشاشة (Resize Handler)
// ========================================

function resizeCanvas() {
    if (!canvas) return;
    
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // إعادة توزيع الجسيمات بشكل مناسب مع الحجم الجديد
    if (oldWidth > 0 && oldHeight > 0) {
        const widthRatio = canvas.width / oldWidth;
        const heightRatio = canvas.height / oldHeight;
        
        particles.forEach(p => {
            p.x *= widthRatio;
            p.y *= heightRatio;
        });
    } else {
        // تهيئة جديدة للجسيمات
        initParticles();
    }
}

// ========================================
// تهيئة الجسيمات
// ========================================

function initParticles() {
    if (!canvas) return;
    
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

/**
 * تحديث عدد الجسيمات
 * @param {number} count - العدد الجديد من الجسيمات
 */
function setParticleCount(count) {
    particleCount = Math.min(300, Math.max(20, count));
    initParticles();
}

/**
 * تفعيل/تعطيل عرض خطوط الربط
 * @param {boolean} enabled
 */
function setConnectionsEnabled(enabled) {
    config.showConnections = enabled;
}

/**
 * تفعيل/تعطيل تفاعل الماوس
 * @param {boolean} enabled
 */
function setMouseInteraction(enabled) {
    config.mouseInteraction = enabled;
}

/**
 * تغيير ألوان الجسيمات
 * @param {Array} colors - مصفوفة من الألوان (hex أو rgb)
 */
function setParticleColors(colors) {
    particleColors = colors;
    initParticles();
}

/**
 * إيقاف الحركة مؤقتاً (لتوفير الموارد)
 */
function pauseAnimation() {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

/**
 * استئناف الحركة
 */
function resumeAnimation() {
    if (isRunning) return;
    isRunning = true;
    animate();
}

/**
 * تنظيف وإزالة الخلفية بالكامل
 */
function destroyParticles() {
    pauseAnimation();
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    particles = [];
}

// ========================================
// أحداث الماوس واللمس
// ========================================

function handleMouseMove(e) {
    if (!config.mouseInteraction) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches) {
        // اللمس (للهواتف)
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        // الماوس
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    mouseX = (clientX - rect.left) * scaleX;
    mouseY = (clientY - rect.top) * scaleY;
    
    // حدود الماوس
    mouseX = Math.min(Math.max(mouseX, 0), canvas.width);
    mouseY = Math.min(Math.max(mouseY, 0), canvas.height);
}

function handleMouseLeave() {
    mouseX = null;
    mouseY = null;
}

// ========================================
// الاستماع لتقليل الحركة (من dark-mode.js)
// ========================================

function handleReduceMotion(event) {
    if (event.detail && event.detail.reduce) {
        // تقليل عدد الجسيمات وتقليل السرعة
        setParticleCount(40);
        config.maxSpeed = 0.2;
        config.showConnections = false;
    } else {
        // العودة للوضع الطبيعي
        setParticleCount(120);
        config.maxSpeed = 0.5;
        config.showConnections = true;
    }
}

// ========================================
// التصدير والتهيئة الأولية
// ========================================

/**
 * التهيئة الكاملة لوحدة الجسيمات
 * @param {string} canvasId - معرف عنصر canvas (افتراضي: particleCanvas)
 */
function initParticlesModule(canvasId = 'particleCanvas') {
    canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn('[Particles] Canvas element not found');
        return;
    }
    
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    initParticles();
    
    // إضافة مستمعي الأحداث
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchmove', handleMouseMove);
    canvas.addEventListener('touchend', handleMouseLeave);
    
    // الاستماع لتقليل الحركة من dark-mode.js
    window.addEventListener('reduceParticles', handleReduceMotion);
    
    // بدء الرسم
    resumeAnimation();
    
    console.log('[Particles] Module initialized with', particleCount, 'particles');
}

// التصدير للاستخدام العام
window.particles = {
    init: initParticlesModule,
    setParticleCount,
    setConnectionsEnabled,
    setMouseInteraction,
    setParticleColors,
    pause: pauseAnimation,
    resume: resumeAnimation,
    destroy: destroyParticles,
    getConfig: () => ({ ...config }),
    getParticleCount: () => particles.length
};

// تهيئة تلقائية عند تحميل الصفحة (إذا وجد العنصر)
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('particleCanvas')) {
        initParticlesModule();
    }
});

console.log('[Particles] Module loaded');