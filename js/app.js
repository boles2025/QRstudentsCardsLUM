/**
 * تطبيق استعلام أكواد وكارنيهات طلاب جامعة اللوتس بالمنيا
 * إشراف وتصميم: مهندس / بولس سمير - مدير شئون الطلاب
 */

// ذاكرة التخزين المؤقت للطلاب محلياً لتسريع الاستعلام
let cachedStudentsMap = {};
let currentStudentData = null;

// الإعدادات الافتراضية لتقسيم الكود والسهم
let appSettings = {
  splitMode: 'last4',       // last3, last4, last5, delimiter, all
  defaultPrefix: 'LUM-',
  arrowText: 'هذا هو الكود'
};

// تحميل الإعدادات المحفوظة
try {
  const savedSettings = localStorage.getItem('lum_code_settings');
  if (savedSettings) {
    appSettings = { ...appSettings, ...JSON.parse(savedSettings) };
  }
} catch (e) {
  console.warn("Could not load settings from localStorage:", e);
}

/**
 * التبديل لواجهة استعلام الطلاب
 */
window.openStudentTab = function() {
  const userView = document.getElementById("userView");
  const adminView = document.getElementById("adminView");
  const gearBtn = document.getElementById("adminGearBtn");

  if (userView) userView.classList.remove("d-none");
  if (adminView) adminView.classList.add("d-none");

  if (gearBtn) {
    gearBtn.style.color = "#94a3b8";
    gearBtn.style.borderColor = "rgba(56, 189, 248, 0.35)";
    gearBtn.title = "لوحة الإدارة";
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * التبديل للوحة الإدارة ورفع الإكسيل
 */
window.openAdminTab = function() {
  const userView = document.getElementById("userView");
  const adminView = document.getElementById("adminView");
  const gearBtn = document.getElementById("adminGearBtn");

  if (userView) userView.classList.add("d-none");
  if (adminView) adminView.classList.remove("d-none");

  if (gearBtn) {
    gearBtn.style.color = "var(--primary-cyan)";
    gearBtn.style.borderColor = "var(--primary-cyan)";
    gearBtn.title = "الرجوع لاستعلام الطلاب";
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * فتح لوحة الإدارة عند الضغط على رمز الترس بباسورد 8520
 */
window.promptAdminPassword = function() {
  const adminView = document.getElementById("adminView");
  if (adminView && !adminView.classList.contains("d-none")) {
    // إذا كان المود في لوحة الإدارة بالفعل، الرجوع لواجهة الطلاب
    window.openStudentTab();
    return;
  }

  const enteredPin = prompt("🔐 أدخل الرقم السري للوحة الإدارة:");
  if (enteredPin === "8520") {
    window.openAdminTab();
    showToast("لوحة الإدارة", "تم فتح لوحة الإدارة بنجاح", "success");
  } else if (enteredPin !== null) {
    alert("عفواً، الرقم السري غير صحيح!");
  }
};

// التوافق مع الدوال القديمة
window.switchToAdminView = window.openAdminTab;
window.switchToUserView = window.openStudentTab;

// تهيئة عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  initSettingsUI();
  initFirebaseRealtimeSync();
  initEventListeners();
});

/**
 * تهيئة واجهة الإعدادات
 */
function initSettingsUI() {
  const splitSelect = document.getElementById('splitModeSelect');
  const prefixInput = document.getElementById('defaultPrefixInput');
  const arrowInput = document.getElementById('arrowCustomTextInput');
  const arrowBadgeLabel = document.getElementById('arrowBadgeLabel');

  if (splitSelect) splitSelect.value = appSettings.splitMode;
  if (prefixInput) prefixInput.value = appSettings.defaultPrefix;
  if (arrowInput) arrowInput.value = appSettings.arrowText;
  if (arrowBadgeLabel) arrowBadgeLabel.textContent = appSettings.arrowText;

  if (typeof updateSplitSettings === 'function') {
    updateSplitSettings();
  }
}

/**
 * الاستماع للتحديثات المباشرة من قاعدة بيانات Firebase
 */
function initFirebaseRealtimeSync() {
  if (typeof firebaseDb === 'undefined' || !firebaseDb) {
    console.log("Waiting for Firebase DB connection...");
    updateCountBadge(0);
    return;
  }

  try {
    const studentsRef = firebaseDb.ref('students');
    studentsRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        cachedStudentsMap = data;
        const count = Object.keys(data).length;
        updateCountBadge(count);
        if (typeof renderAdminTable === 'function') {
          renderAdminTable(data);
        }
      } else {
        cachedStudentsMap = {};
        updateCountBadge(0);
        if (typeof renderAdminTable === 'function') {
          renderAdminTable({});
        }
      }
    }, (error) => {
      console.warn("Firebase Read Notice:", error.message);
      const badge = document.getElementById("totalStudentsCountBadge");
      if (badge) {
        badge.innerHTML = `<i class="fa-solid fa-cloud text-warning me-1"></i> جاهز للاستعلام`;
      }
    });
  } catch (err) {
    console.warn("Firebase sync init warning:", err);
  }
}

/**
 * تحديث عداد الطلاب في الواجهة
 */
function updateCountBadge(count) {
  const badge = document.getElementById("totalStudentsCountBadge");
  const adminCount = document.getElementById("adminTotalStudentsCount");
  
  if (badge) {
    badge.innerHTML = `<i class="fa-solid fa-users-viewfinder text-cyan me-1"></i> قاعدة البيانات تحتوي على: <strong class="text-white">${count}</strong> طالب`;
  }
  if (adminCount) {
    adminCount.textContent = count;
  }
}

/**
 * تهيئة أزرار التنقل والبحث
 */
function initEventListeners() {
  // تحويل الأرقام العربية إلى إنجليزية تلقائياً أثناء الكتابة
  const idInput = document.getElementById("nationalIdInput");
  if (idInput) {
    idInput.addEventListener("input", function() {
      this.value = normalizeArabicNumbers(this.value).replace(/\D/g, '');
    });
  }
}

/**
 * تحويل الأرقام العربية (٠-٩) إلى أرقام لاتينية (0-9)
 */
function normalizeArabicNumbers(str) {
  if (!str) return '';
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(str).replace(/[٠-٩]/g, d => arabicNumerals.indexOf(d));
}

/**
 * وظيفة استعلام الطالب بالرقم القومي
 */
async function searchStudent() {
  const inputEl = document.getElementById("nationalIdInput");
  const spinner = document.getElementById("searchSpinner");
  const btnText = document.getElementById("searchBtnText");
  const submitBtn = document.getElementById("searchSubmitBtn");
  const resultContainer = document.getElementById("searchResultContainer");
  const noResultContainer = document.getElementById("noResultContainer");

  let nationalId = normalizeArabicNumbers(inputEl.value.trim());

  if (!nationalId || nationalId.length < 5) {
    showToast("تنبيه", "يرجى إدخال رقم قومي صحيح للبحث.", "warning");
    inputEl.focus();
    return;
  }

  // إظهار حالة التحميل
  spinner.classList.remove("d-none");
  btnText.classList.add("d-none");
  submitBtn.disabled = true;
  resultContainer.classList.add("d-none");
  noResultContainer.classList.add("d-none");

  try {
    let student = null;

    // 1. البحث في الذاكرة المؤقتة أولاً للسرعة القصوى
    if (cachedStudentsMap && cachedStudentsMap[nationalId]) {
      student = cachedStudentsMap[nationalId];
    } else {
      // 2. إذا لم يكن بالذاكرة، استعلم مباشرة من Firebase Realtime DB
      if (typeof firebaseDb !== 'undefined' && firebaseDb) {
        const snapshot = await firebaseDb.ref('students/' + nationalId).once('value');
        if (snapshot.exists()) {
          student = snapshot.val();
        }
      }
    }

    if (student) {
      currentStudentData = student;
      displayStudentDetails(student);
      resultContainer.classList.remove("d-none");
      resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      noResultContainer.classList.remove("d-none");
      noResultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch (error) {
    console.error("Search error:", error);
    showToast("خطأ", "حدث خطأ أثناء الاتصال بقاعدة البيانات. حاول مجدداً.", "danger");
  } finally {
    spinner.classList.add("d-none");
    btnText.classList.remove("d-none");
    submitBtn.disabled = false;
  }
}

/**
 * عرض بيانات الطالب في الكارت المخصص
 */
function displayStudentDetails(student) {
  // الحقول الأساسية: الرقم القومي - الاسم - الكود - الكلية - اليوم - المكان
  const nationalIdEl = document.getElementById("resNationalId");
  const nameEl = document.getElementById("resStudentName");
  const codeEl = document.getElementById("resCode");
  const facultyEl = document.getElementById("resFaculty") || document.getElementById("resGrade");
  const dayEl = document.getElementById("resDay");
  const locationEl = document.getElementById("resLocation");

  if (nationalIdEl) nationalIdEl.textContent = student.nationalId || '--';
  if (nameEl) nameEl.textContent = student.name || 'غير مدون';
  if (codeEl) codeEl.textContent = student.code || '--';
  if (facultyEl) facultyEl.textContent = student.faculty || student.grade || 'غير مدون';
  if (dayEl) dayEl.textContent = student.day || 'غير محدد';
  if (locationEl) locationEl.textContent = student.location || 'شؤون الطلاب';

  // معالجة وتقسيم الكود
  const rawCode = String(student.code || '').trim();
  const split = parseStudentCode(rawCode);

  document.getElementById("codeFixedPart").textContent = split.fixedPart || appSettings.defaultPrefix;
  document.getElementById("codeDynamicPart").textContent = split.dynamicPart || '0000';

  // تحديث نص إشارة السهم
  const arrowLabel = document.getElementById("arrowBadgeLabel");
  if (arrowLabel) arrowLabel.textContent = appSettings.arrowText;

  // توليد الباركود
  generateStudentBarcode(rawCode || student.nationalId);
}

/**
 * خوارزمية تقسيم كود الطالب (جزء ثابت + جزء مميز ملون)
 */
function parseStudentCode(code) {
  if (!code) {
    return { fixedPart: appSettings.defaultPrefix, dynamicPart: '0000' };
  }

  const mode = appSettings.splitMode;
  let fixedPart = '';
  let dynamicPart = '';

  if (mode === 'delimiter' && (code.includes('-') || code.includes('/'))) {
    const sep = code.includes('-') ? '-' : '/';
    const parts = code.split(sep);
    dynamicPart = parts.pop();
    fixedPart = parts.join(sep) + sep;
  } else if (mode === 'all') {
    fixedPart = '';
    dynamicPart = code;
  } else {
    // التقسيم بالأرقام (آخر 3 أو 4 أو 5 أرقام)
    let digitsCount = 4;
    if (mode === 'last3') digitsCount = 3;
    if (mode === 'last5') digitsCount = 5;

    if (code.length > digitsCount) {
      dynamicPart = code.slice(-digitsCount);
      fixedPart = code.slice(0, -digitsCount);
    } else {
      dynamicPart = code;
      fixedPart = appSettings.defaultPrefix;
    }
  }

  return { fixedPart, dynamicPart };
}

/**
 * توليد الباركود المباشر عبر مكتبة JsBarcode
 */
function generateStudentBarcode(barcodeVal) {
  try {
    const svgEl = document.getElementById("studentBarcodeSvg");
    if (svgEl && typeof JsBarcode !== 'undefined' && barcodeVal) {
      JsBarcode(svgEl, barcodeVal, {
        format: "CODE128",
        width: 1.8,
        height: 48,
        displayValue: true,
        font: "Cairo",
        fontSize: 13,
        textMargin: 3,
        lineColor: "#0f172a",
        background: "#ffffff"
      });
    }
  } catch (err) {
    console.warn("Barcode rendering fallback:", err);
  }
}

/**
 * إعادة تعيين شاشة البحث
 */
function resetSearch() {
  document.getElementById("nationalIdInput").value = "";
  document.getElementById("searchResultContainer").classList.add("d-none");
  document.getElementById("noResultContainer").classList.add("d-none");
  document.getElementById("nationalIdInput").focus();
}

/**
 * نسخ الكود المميز
 */
function copyStudentCode() {
  const codeVal = document.getElementById("codeDynamicPart").textContent;
  if (codeVal) {
    navigator.clipboard.writeText(codeVal).then(() => {
      showToast("تم النسخ", `تم نسخ الكود: ${codeVal}`, "success");
    });
  }
}

/**
 * نسخ كامل بيانات الطالب
 */
function copyAllDetails() {
  if (!currentStudentData) return;
  const s = currentStudentData;
  const text = `جامعة اللوتس بالمنيا - إشعار كود الطالب
الرقم القومي: ${s.nationalId}
الاسم: ${s.name}
الكود: ${s.code}
الكلية: ${s.faculty || s.grade || ''}
اليوم: ${s.day}
المكان: ${s.location}
إشراف: م/ بولس سمير - مدير شئون الطلاب`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("تم النسخ", "تم نسخ بطاقة الطالب بالكامل إلى الحافظة!", "success");
  });
}

/**
 * إشعار Toast منبثق
 */
function showToast(title, message, type = 'info') {
  const toastEl = document.getElementById("appToast");
  const toastTitle = document.getElementById("toastTitle");
  const toastMessage = document.getElementById("toastMessage");
  const toastIcon = document.getElementById("toastIcon");

  if (!toastEl) return;

  toastTitle.textContent = title;
  toastMessage.textContent = message;

  if (type === 'success') {
    toastIcon.className = "fa-solid fa-circle-check text-success me-2";
  } else if (type === 'danger') {
    toastIcon.className = "fa-solid fa-circle-xmark text-danger me-2";
  } else if (type === 'warning') {
    toastIcon.className = "fa-solid fa-triangle-exclamation text-warning me-2";
  } else {
    toastIcon.className = "fa-solid fa-circle-info text-cyan me-2";
  }

  if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
  } else {
    // بديل فوري إذا لم يكن bootstrap محمل
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3500);
  }
}
