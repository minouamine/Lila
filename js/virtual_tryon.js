// ========================================================================
// js/virtual_tryon.js
// التجربة الافتراضية الموحّدة: تسريحات الشعر + الملابس + العمليات التجميلية
// يعتمد على: js/api_keys.js (يجب تحميله قبل هذا الملف، يوفر window.SUPABASE_CONFIG)
// ========================================================================
//
// عناصر HTML المطلوبة (IDs) ليعمل هذا الملف بشكل صحيح:
//   - vto-upload-btn          : زر صغير لفتح اختيار الصورة
//   - vto-file-input          : <input type="file"> مخفي
//   - vto-upload-area         : (اختياري) عنصر يدعم السحب والإفلات
//   - vto-preview-container   : حاوية معاينة الصورة المرفوعة
//   - vto-preview-img         : <img> لمعاينة الصورة المضغوطة
//   - أزرار التبويبات: class="vto-tab" + attribute data-tab="hair|clothes|cosmetic"
//   - vto-section-hair / vto-section-clothes / vto-section-cosmetic : حاويات الأقسام
//   - vto-gallery-hair / vto-gallery-clothes / vto-gallery-cosmetic : حاويات السحب الأفقي
//   - vto-btn-run             : زر التشغيل
//   - vto-status              : نص الحالة
//   - vto-step-log            : نص تتبع الخطوة الحالية
//   - vto-result-container    : حاوية النتيجة
//   - vto-result-img          : <img> الصورة الناتجة من Mistral (بدون تعديل)
//   - vto-download-btn        : زر/أيقونة تحميل الصورة الناتجة
//   - vto-before-after-img    : <img> صورة قبل/بعد المُركّبة محلياً
//   - vto-before-after-error  : نص الخطأ في حال فشل إنشاء صورة قبل/بعد
//
// ========================================================================

(function () {
    "use strict";

    console.log("[VTO] بدء تحميل virtual_tryon.js");

    document.addEventListener("DOMContentLoaded", function () {
        initVirtualTryOn();
    });

    function initVirtualTryOn() {
        console.log("[VTO] بدء تهيئة الصفحة...");

        if (!window.SUPABASE_CONFIG) {
            console.error("[VTO] خطأ فادح: window.SUPABASE_CONFIG غير موجود. تأكد من تحميل js/api_keys.js قبل هذا الملف.");
            return;
        }

        const SUPA = window.SUPABASE_CONFIG; // { url, key, bucket }

        // ====================================================================
        // عناصر DOM
        // ====================================================================
        const uploadBtn = document.getElementById("vto-upload-btn");
        const fileInput = document.getElementById("vto-file-input");
        const uploadArea = document.getElementById("vto-upload-area");
        const previewContainer = document.getElementById("vto-preview-container");
        const previewImg = document.getElementById("vto-preview-img");

        const tabButtons = document.querySelectorAll(".vto-tab");
        const sections = {
            hair: document.getElementById("vto-section-hair"),
            clothes: document.getElementById("vto-section-clothes"),
            cosmetic: document.getElementById("vto-section-cosmetic")
        };
        const galleries = {
            hair: document.getElementById("vto-gallery-hair"),
            clothes: document.getElementById("vto-gallery-clothes"),
            cosmetic: document.getElementById("vto-gallery-cosmetic")
        };

        const btnRun = document.getElementById("vto-btn-run");
        const statusEl = document.getElementById("vto-status");
        const stepLog = document.getElementById("vto-step-log");

        const resultContainer = document.getElementById("vto-result-container");
        const resultImg = document.getElementById("vto-result-img");
        const downloadBtn = document.getElementById("vto-download-btn");
        const beforeAfterImg = document.getElementById("vto-before-after-img");
        const beforeAfterError = document.getElementById("vto-before-after-error");

        // ====================================================================
        // الحالة (State)
        // ====================================================================
        let currentTab = "hair";
        let selectedUserFile = null;
        let compressedUserBlob = null;
        let uploadedUserImageUrl = null; // تخزين مؤقت لتفادي رفع الصورة أكثر من مرة
        let selectedItem = null;

        // ====================================================================
        // بناء روابط الصور العامة من Supabase Storage
        // ====================================================================
        function buildPublicUrl(folder, filename) {
            return SUPA.url + "/storage/v1/object/public/" + SUPA.bucket + "/" + folder + "/" + filename;
        }

        // ====================================================================
        // قوائم العناصر
        // أضف هنا كل صورة جديدة ترفعها إلى bucket: mistal-ai-images
        // ====================================================================

        // تسريحات الشعر -> مجلد hairstyles/
        const hairFiles = [
             { id: 1, file: "coupe-01.jpg", nameAr: "شعر طويل مجعد بني", nameFr: "Cheveux longs bouclés bruns" }
        ];

        // الملابس -> مجلد clothes/
        const clothesFiles = [
             { id: 1, file: "karakou-algerien.jpg", nameAr: " كراكو عاصمي", nameFr: "karakou algérois" }
        ];

        const hairList = hairFiles.map(function (item) {
            return Object.assign({}, item, { imageUrl: buildPublicUrl("hairstyles", item.file) });
        });

        const clothesList = clothesFiles.map(function (item) {
            return Object.assign({}, item, { imageUrl: buildPublicUrl("clothes", item.file) });
        });

        // عمليات التجميل: قائمة ثابتة، لا تحتاج صوراً من Supabase
        const cosmeticList = [
            { id: "nose", nameAr: "تجميل الأنف", nameFr: "Rhinoplastie", icon: "👃" },
            { id: "cheeks", nameAr: "ملء الخدود", nameFr: "Comblement des joues", icon: "😊" },
            { id: "lips", nameAr: "تكبير الشفاه", nameFr: "Augmentation des lèvres", icon: "💋" }
        ];

        // تعليمات الـ Agent الخاصة بكل قسم (واضحة وصريحة كما طُلب)
        const AGENT_INSTRUCTIONS = {
        hair: "أنت مساعد ذكاء اصطناعي متخصص حصرياً في تعديل تسريحات الشعر داخل صور شخصية واقعية. مهمتك: فحص تسريحة الشعر في صورة المرجع وتطبيقها بدقة على صورة المستخدمة. لا تغيّر ملامح الوجه، لون البشرة، تعبير الوجه، الملابس، أو الخلفية إطلاقاً. المخرج المطلوب هو صورة واحدة فردية كاملة للشخص بعد التعديل فقط، بدون أي تقسيم، بدون مقارنة، بدون صورتين جنباً لجنب، بدون خط فاصل.",
            clothes: "أنت مساعد ذكاء اصطناعي متخصص حصرياً في تبديل الملابس داخل صور شخصية واقعية (Virtual Try-On). مهمتك الوحيدة: أخذ قطعة الملابس من الصورة المرجعية ودمجها على جسد الشخص في الصورة الأصلية، مع الحفاظ الكامل والدقيق على الوجه، الشعر، لون البشرة، قوام الجسم، والخلفية كما هي بدون أي تغيير. استخدم أداة توليد الصور لإنشاء صورة واحدة فقط تمثل النتيجة النهائية بجودة واقعية عالية.المخرج المطلوب هو صورة واحدة فردية كاملة للشخص بعد التعديل فقط، بدون أي تقسيم، بدون مقارنة، بدون صورتين جنباً لجنب، بدون خط فاصل.",
            cosmetic: "أنت مساعد ذكاء اصطناعي متخصص في إنشاء معاينة بصرية واقعية وغير مبالغ فيها لنتائج إجراء تجميلي خفيف، لغرض المعاينة فقط قبل اتخاذ القرار. حافظ بدقة كاملة على باقي ملامح الوجه، لون البشرة، الشعر، الملابس، والخلفية دون أي تغيير. استخدم أداة توليد الصور لإنشاء صورة واحدة فقط تمثل النتيجة النهائية بشكل طبيعي ومقنع."
        };

        // ====================================================================
        // دوال الواجهة المساعدة (حالة/خطوة)
        // ====================================================================
        function setStatus(message, isError) {
            if (!statusEl) return;
            statusEl.innerHTML = message || "";
            statusEl.style.color = isError ? "#f87171" : "#4ade80";
            if (message) console.log("[VTO][Status]", message.replace(/<[^>]+>/g, ""));
        }

        function setStep(message) {
            if (!stepLog) return;
            stepLog.innerHTML = message || "";
            if (message) console.log("[VTO][Step]", message);
        }

        // ====================================================================
        // عرض المعارض الأفقية
        // ====================================================================
        function renderGallery(container, list, category) {
            if (!container) {
                console.warn("[VTO] لم يتم العثور على حاوية معرض القسم:", category);
                return;
            }
            container.innerHTML = "";

            list.forEach(function (item) {
                const card = document.createElement("div");
                card.className = "vto-card";
                card.setAttribute("data-id", String(item.id));

                if (category === "cosmetic") {
                    card.innerHTML =
                        '<div class="vto-card-icon">' + item.icon + '</div>' +
                        '<div class="vto-card-name">' + item.nameAr + '</div>';
                } else {
                    const fallback = "https://placehold.co/120x120/ef4444/white?text=" + encodeURIComponent(item.nameAr.substring(0, 3));
                    card.innerHTML =
                        '<img src="' + item.imageUrl + '" class="vto-card-img" alt="' + item.nameAr + '" onerror="this.src=\'' + fallback + '\'">' +
                        '<div class="vto-card-name">' + item.nameAr + '</div>';
                }

                card.addEventListener("click", function () {
                    const siblings = container.querySelectorAll(".vto-card");
                    siblings.forEach(function (s) { s.classList.remove("selected"); });
                    card.classList.add("selected");
                    selectedItem = item;
                    console.log("[VTO] تم اختيار عنصر في قسم \"" + category + "\":", item.nameAr, item);
                });

                container.appendChild(card);
            });

            console.log("[VTO] تم عرض", list.length, "عنصر في معرض:", category);
        }

        // ====================================================================
        // التبديل بين التبويبات
        // ====================================================================
        function switchTab(tabName) {
            console.log("[VTO] التبديل إلى القسم:", tabName);
            currentTab = tabName;
            selectedItem = null;

            tabButtons.forEach(function (btn) {
                btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
            });

            Object.keys(sections).forEach(function (key) {
                if (sections[key]) sections[key].style.display = (key === tabName) ? "block" : "none";
            });

            hideResult();
            setStatus("", false);
            setStep("");
        }

        tabButtons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                const tabName = btn.getAttribute("data-tab");
                if (tabName) switchTab(tabName);
            });
        });

        // ====================================================================
        // رفع/ضغط صورة المستخدم
        // ====================================================================
        function compressImage(file) {
            console.log("[VTO][Compress] بدء ضغط الصورة، الحجم الأصلي:", file.size, "بايت");
            return new Promise(function (resolve, reject) {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement("canvas");
                    let w = img.width;
                    let h = img.height;
                    const maxSize = 1024;

                    if (w > maxSize) {
                        h = Math.round((h * maxSize) / w);
                        w = maxSize;
                    }
                    if (h > maxSize) {
                        w = Math.round((w * maxSize) / h);
                        h = maxSize;
                    }

                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, w, h);

                    canvas.toBlob(function (blob) {
                        if (!blob) {
                            console.error("[VTO][Compress] فشل تحويل الصورة إلى Blob");
                            reject(new Error("فشل في معالجة الصورة"));
                            return;
                        }
                        console.log("[VTO][Compress] تم الضغط بنجاح. الحجم الجديد:", blob.size, "بايت");
                        resolve(blob);
                    }, "image/jpeg", 0.85);
                };
                img.onerror = function (e) {
                    console.error("[VTO][Compress] فشل تحميل الصورة للضغط:", e);
                    reject(new Error("فشل تحميل الصورة المختارة"));
                };
                img.src = URL.createObjectURL(file);
            });
        }

        async function uploadToSupabase(blob, prefix) {
            console.log("[VTO][Upload] بدء رفع الصورة إلى Supabase Storage...");
            const fileName = "uploads/" + prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000000) + ".jpg";
            const uploadUrl = SUPA.url + "/storage/v1/object/" + SUPA.bucket + "/" + fileName;

            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + SUPA.key,
                    "apikey": SUPA.key,
                    "Content-Type": "image/jpeg"
                },
                body: blob
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("[VTO][Upload] فشل الرفع:", errorText);
                throw new Error("فشل رفع صورتك إلى الخادم");
            }

            const publicUrl = SUPA.url + "/storage/v1/object/public/" + SUPA.bucket + "/" + fileName;
            console.log("[VTO][Upload] تم الرفع بنجاح:", publicUrl);
            return publicUrl;
        }

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener("click", function () {
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener("change", async function (e) {
                const file = e.target.files[0];
                if (!file || !file.type.startsWith("image/")) {
                    console.warn("[VTO] ملف غير صالح:", file);
                    setStatus("⚠️ يرجى اختيار صورة صالحة (JPG, PNG, WEBP)", true);
                    return;
                }

                console.log("[VTO] تم اختيار صورة جديدة:", file.name, "-", file.size, "بايت");
                selectedUserFile = file;
                uploadedUserImageUrl = null; // صورة جديدة => إلغاء أي رابط رفع سابق

                try {
                    setStatus('<span class="spinner"></span> جاري ضغط الصورة...', false);
                    compressedUserBlob = await compressImage(file);

                    const previewUrl = URL.createObjectURL(compressedUserBlob);
                    if (previewImg) previewImg.src = previewUrl;
                    if (previewContainer) previewContainer.style.display = "block";

                    setStatus("", false);
                    console.log("[VTO] الصورة جاهزة للاستخدام بعد الضغط");
                } catch (err) {
                    console.error("[VTO] فشل ضغط الصورة:", err);
                    setStatus("❌ فشل في معالجة الصورة، حاول صورة أخرى", true);
                }
            });
        }

        if (uploadArea) {
            uploadArea.addEventListener("dragover", function (e) {
                e.preventDefault();
                uploadArea.classList.add("dragging");
            });
            uploadArea.addEventListener("dragleave", function (e) {
                e.preventDefault();
                uploadArea.classList.remove("dragging");
            });
            uploadArea.addEventListener("drop", function (e) {
                e.preventDefault();
                uploadArea.classList.remove("dragging");
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith("image/") && fileInput) {
                    fileInput.files = e.dataTransfer.files;
                    fileInput.dispatchEvent(new Event("change"));
                }
            });
        }

        // ====================================================================
        // مفاتيح Mistral: جلب من Supabase + اختيار عشوائي + التبديل عند تجاوز الحد
        // ====================================================================
        async function getMistralApiKeys() {
            console.log("[VTO][Keys] جلب مفاتيح Mistral من قاعدة البيانات...");
            const endpoint = SUPA.url + "/rest/v1/mistral_api_keys?select=api_key&is_active=eq.true";

            const response = await fetch(endpoint, {
                headers: {
                    "apikey": SUPA.key,
                    "Authorization": "Bearer " + SUPA.key
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("[VTO][Keys] فشل جلب المفاتيح:", errText);
                throw new Error("فشل الاتصال بقاعدة بيانات مفاتيح Mistral");
            }

            const rows = await response.json();
            const keys = rows.map(function (r) { return r.api_key; }).filter(Boolean);
            console.log("[VTO][Keys] تم جلب", keys.length, "مفتاح نشط من القاعدة");
            return keys;
        }

        function shuffleArray(arr) {
            const a = arr.slice();
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = a[i];
                a[i] = a[j];
                a[j] = tmp;
            }
            return a;
        }

        async function createMistralAgent(apiKey, instructions) {
            const response = await fetch("https://api.mistral.ai/v1/agents", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                },
                body: JSON.stringify({
                    model: "mistral-medium-latest",
                    name: "Lila Virtual TryOn AI",
                    instructions: instructions,
                    tools: [{ type: "image_generation" }]
                })
            });

            const data = await response.json().catch(function () { return {}; });

            if (!response.ok || !data.id) {
                const error = new Error("فشل إنشاء Agent: " + JSON.stringify(data));
                error.status = response.status;
                error.body = data;
                throw error;
            }

            return data;
        }

        async function sendMistralConversation(apiKey, agentId, prompt) {
            const response = await fetch("https://api.mistral.ai/v1/conversations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                },
                body: JSON.stringify({
                    agent_id: agentId,
                    stream: false,
                    inputs: prompt
                })
            });

            const data = await response.json().catch(function () { return {}; });

            if (!response.ok) {
                const error = new Error("فشل المعالجة: " + JSON.stringify(data));
                error.status = response.status;
                error.body = data;
                throw error;
            }

            return data;
        }

        function isQuotaError(err) {
            if (!err) return false;
            if (err.status === 429) return true;
            const text = ((err.message || "") + " " + JSON.stringify(err.body || {})).toLowerCase();
            const keywords = ["limit", "quota", "rate limit", "too many requests", "exceeded", "capacity", "max images", "maximum"];
            return keywords.some(function (k) { return text.indexOf(k) !== -1; });
        }

        async function runMistralWithRotation(prompt, agentInstructions) {
            console.log("[VTO][Mistral] بدء العملية مع نظام تبديل المفاتيح");
            const keys = await getMistralApiKeys();

            if (!keys.length) {
                throw new Error("لا توجد مفاتيح Mistral متاحة حالياً في قاعدة البيانات");
            }

            const order = shuffleArray(keys);
            let lastError = null;

            for (let i = 0; i < order.length; i++) {
                const apiKey = order[i];
                const label = "مفتاح #" + (i + 1) + "/" + order.length;

                try {
                    console.log("[VTO][Mistral]", label, "- إنشاء Agent...");
                    const agent = await createMistralAgent(apiKey, agentInstructions);
                    console.log("[VTO][Mistral]", label, "- Agent جاهز:", agent.id);

                    console.log("[VTO][Mistral]", label, "- إرسال طلب توليد الصورة...");
                    const result = await sendMistralConversation(apiKey, agent.id, prompt);
                    console.log("[VTO][Mistral]", label, "- نجح الطلب ✅");

                    return result;
                } catch (err) {
                    lastError = err;
                    if (isQuotaError(err)) {
                        console.warn("[VTO][Mistral]", label, "- تم تجاوز الحد الأقصى، التبديل للمفتاح التالي...", err.message);
                        continue;
                    } else {
                        console.error("[VTO][Mistral]", label, "- خطأ غير متعلق بالحد الأقصى، توقف:", err);
                        throw err;
                    }
                }
            }

            console.error("[VTO][Mistral] فشلت جميع المفاتيح المتاحة:", lastError);
            throw new Error("تم تجاوز الحد الأقصى لجميع مفاتيح Mistral المتاحة حالياً. حاول لاحقاً.");
        }

        // ====================================================================
        // استخراج رابط الصورة من رد Mistral
        // ====================================================================
        function extractImageUrl(conversationData) {
            console.log("[VTO][Extract] استخراج رابط الصورة من الرد...");
            const outputs = conversationData.outputs || [];

            for (const output of outputs) {
                if (output.type === "tool.execution" && output.info && output.info.result) {
                    try {
                        const parsed = JSON.parse(output.info.result);
                        if (parsed.url) {
                            console.log("[VTO][Extract] تم العثور على الصورة عبر tool.execution:", parsed.url);
                            return parsed.url;
                        }
                    } catch (e) {
                        console.warn("[VTO][Extract] خطأ في تحليل نتيجة tool.execution:", e);
                    }
                }
            }

            for (const output of outputs) {
                if (output.type === "message" && output.content) {
                    const content = output.content;
                    const urlMatch = content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
                    if (urlMatch) {
                        console.log("[VTO][Extract] تم العثور على رابط داخل النص:", urlMatch[0]);
                        return urlMatch[0];
                    }
                }
            }

            console.warn("[VTO][Extract] لم يتم العثور على أي رابط صورة في الرد");
            return null;
        }

        // ====================================================================
        // برومبتات صريحة وواضحة لكل قسم
        // ====================================================================
        function buildHairPrompt(userImageUrl, item) {
    return "لديك صورتان:\n\n" +
        "الصورة الأولى (صورة المستخدمة): " + userImageUrl + "\n" +
        "هذه صورة امرأة حقيقية. افحص شعرها بدقة: لاحظ طوله، شكله، كثافته، وطريقة تصفيفه الحالية.\n\n" +
        "الصورة الثانية (التسريحة المرجعية): " + item.imageUrl + "\n" +
        "هذه أيضاً صورة امرأة. افحص تسريحة شعرها بدقة: لاحظ القصة، الطول، الشكل، الحجم، وطريقة التصفيف.\n\n" +
        "المطلوب بدقة:\n" +
        "طبّق نفس تسريحة الشعر الموجودة في الصورة الثانية على المرأة في الصورة الأولى بالضبط، بحيث تبدو النتيجة طبيعية وواقعية.\n\n" +
        "القيود الصارمة التي يجب احترامها بالكامل:\n" +
        "- لا تغيّر ملامح الوجه إطلاقاً (العينان، الأنف، الفم، شكل الوجه)\n" +
        "- لا تغيّر لون البشرة أو نعومتها\n" +
        "- لا تغيّر تعبير الوجه\n" +
        "- لا تغيّر الملابس\n" +
        "- لا تغيّر الخلفية\n" +
        "- لا تغيّر أي شيء في الصورة سوى تسريحة الشعر فقط\n\n" +
        "استخدم أداة توليد الصور لإنشاء صورة واحدة فقط تمثل النتيجة النهائية بجودة واقعية عالية، بدون أي تقسيم، بدون مقارنة، بدون صورتين جنباً لجنب، بدون خط فاصل.";
}

        function buildClothesPrompt(userImageUrl, item) {
            return "لديك صورتان:\n" +
                "1) صورة شخص حقيقي: " + userImageUrl + "\n" +
                "2) صورة قطعة ملابس بعنوان \"" + item.nameAr + "\": " + item.imageUrl + "\n" +
                "المطلوب بدقة: بدّل ملابس الشخص في الصورة الأولى بحيث يرتدي قطعة الملابس من الصورة الثانية بالضبط.\n" +
                "حافظ تماماً على نفس الوجه، الشعر، لون البشرة، قوام الجسم، والخلفية كما هي بدون أي تغيير.\n" +
                "غيّر فقط الملابس. أنشئ صورة واحدة واقعية وعالية الجودة للنتيجة النهائية.";
        }

        function buildCosmeticPrompt(userImageUrl, item) {
            const details = {
                nose: "إجراء تجميل أنف خفيف وطبيعي: تنسيق وتنحيف بسيط وواقعي لشكل الأنف دون أي مبالغة.",
                cheeks: "إجراء حقن ملء خدود خفيف وطبيعي: إضافة امتلاء ونعومة بسيطة وواقعية للخدين دون أي مبالغة.",
                lips: "إجراء تكبير شفاه خفيف وطبيعي: زيادة بسيطة وواقعية في حجم الشفتين دون أي مبالغة."
            };
            const instruction = details[item.id] || item.nameAr;

            return "لديك صورة شخص حقيقية على هذا الرابط: " + userImageUrl + ".\n" +
                "المطلوب بدقة: " + instruction + "\n" +
                "حافظ تماماً على باقي ملامح الوجه، لون البشرة، الشعر، الملابس، والخلفية كما هي بدون أي تغيير.\n" +
                "أنشئ صورة واحدة واقعية وعالية الجودة تُظهر النتيجة بشكل طبيعي ومقنع، بهدف المعاينة فقط.";
        }

        // ====================================================================
        // إنشاء صورة "قبل/بعد" محلياً (Canvas) - مستقلة تماماً عن Mistral
        // ====================================================================
        function drawImageCover(ctx, img, x, y, w, h) {
            const imgRatio = img.naturalWidth / img.naturalHeight;
            const boxRatio = w / h;
            let sx, sy, sw, sh;

            if (imgRatio > boxRatio) {
                sh = img.naturalHeight;
                sw = sh * boxRatio;
                sx = (img.naturalWidth - sw) / 2;
                sy = 0;
            } else {
                sw = img.naturalWidth;
                sh = sw / boxRatio;
                sx = 0;
                sy = (img.naturalHeight - sh) / 2;
            }

            ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        }

        function drawLabel(ctx, text, centerX, y) {
            ctx.save();
            ctx.font = "bold 22px Cairo, Arial, sans-serif";
            ctx.textAlign = "center";
            const textWidth = ctx.measureText(text).width;

            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(centerX - textWidth / 2 - 14, y - 26, textWidth + 28, 38);

            ctx.fillStyle = "#ffffff";
            ctx.fillText(text, centerX, y);
            ctx.restore();
        }

        function generateBeforeAfterImage(beforeSrc, afterSrc) {
            console.log("[VTO][BeforeAfter] بدء إنشاء صورة قبل/بعد...");

            return new Promise(function (resolve, reject) {
                try {
                    const beforeImg = new Image();
                    const afterImg = new Image();
                    beforeImg.crossOrigin = "anonymous";
                    afterImg.crossOrigin = "anonymous";

                    let loadedCount = 0;
                    let hasFailed = false;

                    function onAnyLoaded() {
                        loadedCount++;
                        if (loadedCount === 2 && !hasFailed) {
                            try {
                                const targetHeight = 600;
                                const beforeRatio = beforeImg.naturalWidth / beforeImg.naturalHeight;
                                const afterRatio = afterImg.naturalWidth / afterImg.naturalHeight;
                                const avgRatio = Math.min((beforeRatio + afterRatio) / 2, 1.2);
                                const halfWidth = Math.round(targetHeight * avgRatio);

                                const canvas = document.createElement("canvas");
                                canvas.width = halfWidth * 2;
                                canvas.height = targetHeight;
                                const ctx = canvas.getContext("2d");

                                drawImageCover(ctx, beforeImg, 0, 0, halfWidth, targetHeight);
                                drawImageCover(ctx, afterImg, halfWidth, 0, halfWidth, targetHeight);

                                ctx.fillStyle = "#ffffff";
                                ctx.fillRect(halfWidth - 2, 0, 4, targetHeight);

                                drawLabel(ctx, "AVANT", halfWidth / 2, targetHeight - 30);
                                drawLabel(ctx, "APRÈS", halfWidth + halfWidth / 2, targetHeight - 30);

                                const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
                                console.log("[VTO][BeforeAfter] تم إنشاء صورة قبل/بعد بنجاح ✅");
                                resolve(dataUrl);
                            } catch (drawErr) {
                                console.error("[VTO][BeforeAfter] فشل الرسم على Canvas (احتمال مشكلة CORS):", drawErr);
                                reject(drawErr);
                            }
                        }
                    }

                    beforeImg.onload = onAnyLoaded;
                    afterImg.onload = onAnyLoaded;

                    beforeImg.onerror = function (e) {
                        hasFailed = true;
                        console.error("[VTO][BeforeAfter] فشل تحميل صورة \"قبل\":", e);
                        reject(new Error("فشل تحميل الصورة الأصلية"));
                    };
                    afterImg.onerror = function (e) {
                        hasFailed = true;
                        console.error("[VTO][BeforeAfter] فشل تحميل صورة \"بعد\":", e);
                        reject(new Error("فشل تحميل صورة النتيجة"));
                    };

                    beforeImg.src = beforeSrc;
                    afterImg.src = afterSrc;
                } catch (e) {
                    console.error("[VTO][BeforeAfter] خطأ غير متوقع:", e);
                    reject(e);
                }
            });
        }

        // ====================================================================
        // تحميل الصورة الناتجة
        // ====================================================================
        async function downloadResultImage(url) {
            console.log("[VTO][Download] بدء تحميل الصورة الناتجة:", url);
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("فشل جلب الصورة للتحميل");
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                const a = document.createElement("a");
                a.href = blobUrl;
                a.download = "lila-virtual-tryon-" + Date.now() + ".jpg";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);

                console.log("[VTO][Download] تم التحميل بنجاح ✅");
            } catch (err) {
                console.error("[VTO][Download] فشل التحميل المباشر (احتمال CORS)، فتح الصورة في تبويب جديد:", err);
                window.open(url, "_blank");
            }
        }

        // ====================================================================
        // عرض/إخفاء النتائج
        // ====================================================================
        function showResult(url) {
            if (resultImg) {
                resultImg.src = url;
                resultImg.style.display = "block";
            }
            if (resultContainer) resultContainer.style.display = "block";
            if (downloadBtn) {
                downloadBtn.style.display = "inline-flex";
                downloadBtn.onclick = function () { downloadResultImage(url); };
            }
        }

        function hideResult() {
            if (resultContainer) resultContainer.style.display = "none";
            if (resultImg) {
                resultImg.style.display = "none";
                resultImg.src = "";
            }
            if (downloadBtn) downloadBtn.style.display = "none";
            if (beforeAfterImg) {
                beforeAfterImg.style.display = "none";
                beforeAfterImg.src = "";
            }
            if (beforeAfterError) beforeAfterError.style.display = "none";
        }

        function showBeforeAfter(dataUrl) {
            if (beforeAfterImg) {
                beforeAfterImg.src = dataUrl;
                beforeAfterImg.style.display = "block";
            }
            if (beforeAfterError) beforeAfterError.style.display = "none";
        }

        function showBeforeAfterError() {
            if (beforeAfterImg) beforeAfterImg.style.display = "none";
            if (beforeAfterError) {
                beforeAfterError.textContent = "فشل انشاء صورة قبل وبعد";
                beforeAfterError.style.display = "block";
            }
        }

        // ====================================================================
        // التشغيل الرئيسي
        // ====================================================================
        if (btnRun) {
            btnRun.addEventListener("click", async function () {
                console.log("[VTO] ===== بدء عملية جديدة - القسم الحالي:", currentTab, "=====");

                if (!compressedUserBlob || !selectedUserFile) {
                    setStatus("⚠️ يرجى رفع صورتك الشخصية أولاً", true);
                    return;
                }
                if (!selectedItem) {
                    setStatus("⚠️ يرجى اختيار عنصر من القائمة أولاً", true);
                    return;
                }

                btnRun.disabled = true;
                hideResult();

                try {
                    setStatus('<span class="spinner"></span> جاري المعالجة...', false);

                    let userImageUrl;
                    if (uploadedUserImageUrl) {
                        console.log("[VTO] استخدام رابط الصورة المرفوعة مسبقاً:", uploadedUserImageUrl);
                        userImageUrl = uploadedUserImageUrl;
                    } else {
                        setStep("☁️ رفع صورتك إلى الخادم...");
                        userImageUrl = await uploadToSupabase(compressedUserBlob, "user");
                        uploadedUserImageUrl = userImageUrl;
                    }

                    let prompt, agentInstructions;
                    if (currentTab === "hair") {
                        setStep("💇 تجهيز طلب تغيير التسريحة...");
                        prompt = buildHairPrompt(userImageUrl, selectedItem);
                        agentInstructions = AGENT_INSTRUCTIONS.hair;
                    } else if (currentTab === "clothes") {
                        setStep("👗 تجهيز طلب تبديل الملابس...");
                        prompt = buildClothesPrompt(userImageUrl, selectedItem);
                        agentInstructions = AGENT_INSTRUCTIONS.clothes;
                    } else {
                        setStep("💉 تجهيز طلب العملية التجميلية...");
                        prompt = buildCosmeticPrompt(userImageUrl, selectedItem);
                        agentInstructions = AGENT_INSTRUCTIONS.cosmetic;
                    }

                    console.log("[VTO] البرومبت المُرسل إلى Mistral:\n", prompt);

                    setStep("🤖 إرسال الطلب إلى LILA AI...");
                    const result = await runMistralWithRotation(prompt, agentInstructions);

                    setStep("📸 استخراج الصورة الناتجة...");
                    const resultImageUrl = extractImageUrl(result);

                    if (!resultImageUrl) {
                        console.error("[VTO] لم يتم العثور على صورة في رد Mistral:", result);
                        setStatus("⚠️ لم يتم الحصول على نتيجة، حاول مرة أخرى", true);
                        setStep("");
                        return;
                    }

                    console.log("[VTO] رابط الصورة الناتجة من Mistral:", resultImageUrl);
                    showResult(resultImageUrl);
                    setStatus("✅ تمت العملية بنجاح!", false);
                    setStep("🖼️ إنشاء صورة قبل/بعد...");

                    try {
                        const beforeSrc = URL.createObjectURL(compressedUserBlob);
                        const composedUrl = await generateBeforeAfterImage(beforeSrc, resultImageUrl);
                        showBeforeAfter(composedUrl);
                    } catch (baErr) {
                        console.error("[VTO] فشل إنشاء صورة قبل/بعد:", baErr);
                        showBeforeAfterError();
                    }

                    setStep("");
                } catch (error) {
                    console.error("[VTO] خطأ في العملية الرئيسية:", error);
                    setStatus("❌ " + error.message, true);
                    setStep("");
                } finally {
                    btnRun.disabled = false;
                    console.log("[VTO] ===== انتهت العملية =====");
                }
            });
        }

        // ====================================================================
        // التهيئة الأولية
        // ====================================================================
        renderGallery(galleries.hair, hairList, "hair");
        renderGallery(galleries.clothes, clothesList, "clothes");
        renderGallery(galleries.cosmetic, cosmeticList, "cosmetic");
        switchTab("hair");

        console.log("[VTO] التهيئة اكتملت بنجاح ✅");
    }
})();