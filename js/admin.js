/**
 * لوحة إدارة شؤون الطلاب ورفع ملفات الإكسيل
 * تصميم: مهندس / بولس سمير
 */

let parsedExcelStudents = [];
let adminAuthenticated = false;
const ADMIN_DEFAULT_PIN = "8520";

document.addEventListener("DOMContentLoaded", () => {
  initExcelDropZone();
});

/**
 * التحقق من الرقم السري للإدارة
 */
function verifyAdminPin() {
  const pinInput = document.getElementById("adminPinInput");
  const errorMsg = document.getElementById("pinErrorMsg");
  const enteredPin = pinInput.value.trim();

  if (enteredPin === ADMIN_DEFAULT_PIN || enteredPin === "admin123" || enteredPin === "boles") {
    adminAuthenticated = true;
    errorMsg.classList.add("d-none");
    pinInput.value = "";
    
    // إغلاق المودال
    const modalEl = document.getElementById("adminLoginModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    // التبديل لشاشة الإدارة
    switchToAdminView();
    showToast("مرحباً بك", "تم تسجيل الدخول للوحة إدارة شؤون الطلاب بنجاح", "success");
  } else {
    errorMsg.classList.remove("d-none");
    pinInput.focus();
    pinInput.select();
  }
}

/**
 * التبديل لواجهة الإدارة
 */
function switchToAdminView() {
  if (typeof window.openAdminTab === 'function') {
    window.openAdminTab();
  } else {
    document.getElementById("userView").classList.add("d-none");
    document.getElementById("adminView").classList.remove("d-none");
  }
}

/**
 * التبديل لواجهة الطلاب
 */
function switchToUserView() {
  if (typeof window.openStudentTab === 'function') {
    window.openStudentTab();
  } else {
    document.getElementById("adminView").classList.add("d-none");
    document.getElementById("userView").classList.remove("d-none");
  }
}

/**
 * تسجيل الخروج من الإدارة
 */
function adminLogout() {
  adminAuthenticated = false;
  switchToUserView();
  showToast("تسجيل خروج", "تم الرجوع لواجهة الطلاب.", "info");
}

/**
 * تهيئة منطقة السحب والإفلات لملفات الإكسيل
 */
function initExcelDropZone() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("excelFileInput");

  if (!dropZone || !fileInput) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      handleSelectedExcelFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedExcelFile(e.target.files[0]);
    }
  });
}

/**
 * قراءة ومعالجة ملف الإكسيل بواسطة SheetJS
 */
function handleSelectedExcelFile(file) {
  if (!file) return;

  const validExtensions = ['.xlsx', '.xls', '.csv'];
  const fileName = file.name.toLowerCase();
  const isValid = validExtensions.some(ext => fileName.endsWith(ext));

  if (!isValid) {
    showToast("صيغة غير مدعومة", "برجاء اختيار ملف Excel صالح بصيغة (.xlsx أو .xls أو .csv)", "warning");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // قراءة أول ورقة عمل
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // تحويل الشيت إلى مصفوفة كائنات JSON
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rawRows || rawRows.length === 0) {
        showToast("ملف فارغ", "ملف الإكسيل المحدد لا يحتوي على بيانات!", "warning");
        return;
      }

      // مطابقة الأعمدة الذكية
      parsedExcelStudents = mapExcelRowsToStudents(rawRows);

      if (parsedExcelStudents.length === 0) {
        showToast("خطأ بالأعمدة", "لم يتم العثور على عمود الرقم القومي في ملف الإكسيل!", "danger");
        return;
      }

      // تحديث شريط معلومات الملف
      document.getElementById("selectedFileName").textContent = file.name;
      document.getElementById("selectedFileSize").textContent = (file.size / 1024).toFixed(1) + " KB";
      document.getElementById("selectedRowCount").textContent = parsedExcelStudents.length + " طالب جاهز للرفع";
      document.getElementById("fileSelectedBar").classList.remove("d-none");
      document.getElementById("adminLoadedExcelRows").textContent = parsedExcelStudents.length;

      showToast("تم تحليل الملف", `تم قراءة ${parsedExcelStudents.length} سجل طالب بنجاح. اضغط حفظ ومزامنة بالفيربيس.`, "success");

    } catch (err) {
      console.error("Excel read error:", err);
      showToast("خطأ في القراءة", "حدث خطأ أثناء فك تشفير ملف الإكسيل: " + err.message, "danger");
    }
  };

  reader.readAsArrayBuffer(file);
}

/**
 * مطابقة أسماء أعمدة الإكسيل مع بنية بيانات النظام
 */
function mapExcelRowsToStudents(rows) {
  const mappedList = [];

  rows.forEach((row, index) => {
    let nationalId = '';
    let name = '';
    let code = '';
    let grade = '';
    let day = '';
    let location = '';

    // البحث في المفاتيح بغض النظر عن المسافات وحالة الأحرف
    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase().replace(/_/g, ' ');
      const val = String(row[key] || '').trim();

      // الرقم القومي
      if (cleanKey.includes('رقم قومي') || cleanKey.includes('الرقم القومي') || cleanKey.includes('بطاقة') || cleanKey.includes('national') || cleanKey === 'nid' || cleanKey === 'id') {
        nationalId = normalizeArabicNumbers(val).replace(/\D/g, '');
      }
      // اسم الطالب
      else if (cleanKey.includes('اسم') || cleanKey.includes('الاسم') || cleanKey.includes('name') || cleanKey.includes('طالب')) {
        name = val;
      }
      // الكود
      else if (cleanKey.includes('كود') || cleanKey.includes('الكود') || cleanKey.includes('code') || cleanKey.includes('باركود') || cleanKey.includes('barcode')) {
        code = val;
      }
      // الكلية / الفرقة الدراسية
      else if (cleanKey.includes('كلية') || cleanKey.includes('الكلية') || cleanKey.includes('faculty') || cleanKey.includes('college') || cleanKey.includes('فرقة') || cleanKey.includes('الفرقة') || cleanKey.includes('grade') || cleanKey.includes('level') || cleanKey.includes('مستوى') || cleanKey.includes('سنة')) {
        grade = val;
      }
      // اليوم
      else if (cleanKey.includes('يوم') || cleanKey.includes('اليوم') || cleanKey.includes('تاريخ') || cleanKey.includes('التاريخ') || cleanKey.includes('day') || cleanKey.includes('date')) {
        day = val;
      }
      // المكان
      else if (cleanKey.includes('مكان') || cleanKey.includes('المكان') || cleanKey.includes('قاعة') || cleanKey.includes('مدرج') || cleanKey.includes('location') || cleanKey.includes('hall') || cleanKey.includes('place')) {
        location = val;
      }
    }

    // إذا لم يكن هناك عمود كود مخصص، نولد كوداً تسلسلياً بناء على الترتيب أو الرقم
    if (!code && nationalId) {
      code = 'LUM-' + (1000 + index + 1);
    }

    if (nationalId) {
      mappedList.push({
        nationalId: nationalId,
        name: name || 'طالب بجامعة اللوتس',
        code: code,
        grade: grade || 'كلية الحاسبات والذكاء الاصطناعي',
        day: day || 'الأحد',
        location: location || 'إدارة شؤون الطلاب - مبنى أ'
      });
    }
  });

  return mappedList;
}

/**
 * رفع وحفظ البيانات في Firebase Realtime Database
 */
async function uploadParsedDataToFirebase() {
  if (!parsedExcelStudents || parsedExcelStudents.length === 0) {
    showToast("تنبيه", "لا توجد بيانات طلاب لرفعها!", "warning");
    return;
  }

  if (!firebaseDb) {
    showToast("خطأ", "الاتصال بقاعدة بيانات الفيربيس غير متوفر حالياً!", "danger");
    return;
  }

  const uploadBtn = document.getElementById("uploadToFirebaseBtn");
  const progressWrapper = document.getElementById("uploadProgressWrapper");
  const progressBar = document.getElementById("uploadProgressBar");
  const progressPercent = document.getElementById("uploadProgressPercent");

  uploadBtn.disabled = true;
  progressWrapper.classList.remove("d-none");
  progressBar.style.width = "10%";
  progressPercent.textContent = "10%";

  try {
    // تجهيز كائن التحديث الجماعي السريع (Atomic Multi-location Update)
    const updates = {};
    parsedExcelStudents.forEach(student => {
      updates['students/' + student.nationalId] = student;
    });

    progressBar.style.width = "50%";
    progressPercent.textContent = "50%";

    // الحفظ المباشر
    await firebaseDb.ref().update(updates);

    progressBar.style.width = "100%";
    progressPercent.textContent = "100%";

    showToast("تم الحفظ بنجاح!", `تم رفع ومزامنة ${parsedExcelStudents.length} طالب في الفيربيس بنجاح.`, "success");

    setTimeout(() => {
      progressWrapper.classList.add("d-none");
      clearSelectedExcel();
    }, 1500);

  } catch (error) {
    console.error("Firebase upload error:", error);
    showToast("خطأ في الرفع", "تعذر الحفظ في الفيربيس: " + error.message, "danger");
    progressWrapper.classList.add("d-none");
  } finally {
    uploadBtn.disabled = false;
  }
}

/**
 * إلغاء الملف المحدد
 */
function clearSelectedExcel() {
  parsedExcelStudents = [];
  document.getElementById("excelFileInput").value = "";
  document.getElementById("fileSelectedBar").classList.add("d-none");
  document.getElementById("adminLoadedExcelRows").textContent = "0";
}

/**
 * عرض سجلات الطلاب في جدول الإدارة
 */
function renderAdminTable(dataObj) {
  const tbody = document.getElementById("studentsTableBody");
  const subtitle = document.getElementById("tableSubtitle");
  if (!tbody) return;

  const studentsList = Object.values(dataObj || {});

  if (subtitle) {
    subtitle.textContent = `إجمالي المسجلين: ${studentsList.length} طالب`;
  }

  if (studentsList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-secondary">
          <i class="fa-solid fa-inbox fs-3 d-block mb-2 text-muted"></i>
          لا توجد بيانات حالياً في الفيربيس. قم برفع ملف إكسيل لبدء ملء السجلات.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  studentsList.forEach((s, idx) => {
    const split = parseStudentCode(s.code);
    html += `
      <tr>
        <td>${idx + 1}</td>
        <td><span class="font-monospace text-info">${s.nationalId}</span></td>
        <td class="fw-bold text-white">${s.name}</td>
        <td><span class="font-monospace text-secondary">${s.code}</span></td>
        <td>
          <span class="badge bg-primary-subtle text-cyan border border-info font-monospace fw-bold me-1">${split.dynamicPart}</span>
          <span class="badge bg-dark border border-secondary text-secondary font-monospace">${split.fixedPart}</span>
        </td>
        <td><span class="badge bg-secondary-subtle text-warning">${s.grade}</span></td>
        <td><span class="text-success">${s.day}</span></td>
        <td><small class="text-secondary">${s.location}</small></td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteSingleStudent('${s.nationalId}')" title="حذف هذا الطالب">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/**
 * تصفية وبحث جدول الإدارة
 */
function filterAdminTable() {
  const query = document.getElementById("adminTableSearchInput").value.trim().toLowerCase();
  const rows = document.querySelectorAll("#studentsTableBody tr");

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (text.includes(query)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

/**
 * حذف طالب محدد
 */
async function deleteSingleStudent(nationalId) {
  if (!confirm(`هل أنت متأكد من رغبتك في حذف الطالب ذو الرقم القومي: ${nationalId}؟`)) {
    return;
  }

  try {
    if (firebaseDb) {
      await firebaseDb.ref('students/' + nationalId).remove();
      showToast("تم الحذف", "تم حذف سجل الطالب بنجاح.", "success");
    }
  } catch (err) {
    showToast("خطأ", "تعذر حذف الطالب: " + err.message, "danger");
  }
}

/**
 * مسح كافة السجلات من قاعدة البيانات
 */
async function confirmClearAllDatabase() {
  const entered = prompt("تحذير أمني: هل أنت متأكد من مسح جميع بيانات الطلاب من الفيربيس؟\nللتأكيد اكتب: نعم");
  if (entered !== "نعم") return;

  try {
    if (firebaseDb) {
      await firebaseDb.ref('students').remove();
      showToast("تم المسح", "تم إفراغ قاعدة بيانات الطلاب بالكامل.", "info");
    }
  } catch (err) {
    showToast("خطأ", "تعذر مسح البيانات: " + err.message, "danger");
  }
}

/**
 * تصدير جدول الطلاب الحالي إلى ملف Excel
 */
function exportCurrentTableToExcel() {
  const studentsList = Object.values(cachedStudentsMap || {});
  if (studentsList.length === 0) {
    showToast("تنبيه", "لا توجد سجلات لتصديرها!", "warning");
    return;
  }

  const exportData = studentsList.map((s, idx) => ({
    "م": idx + 1,
    "الرقم القومي": s.nationalId,
    "اسم الطالب": s.name,
    "كود الطالب": s.code,
    "الكلية": s.grade || s.faculty || '',
    "اليوم": s.day,
    "المكان": s.location
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات الطلاب");

  XLSX.writeFile(workbook, "طلاب_جامعة_اللوتس_شؤون_الطلاب.xlsx");
  showToast("تم التصدير", "تم تصدير ملف الإكسيل بنجاح!", "success");
}

/**
 * تحميل نموذج إكسيل تجريبي لمساعدة الإدارة
 */
function downloadExcelTemplate() {
  const sampleData = [
    {
      "الرقم القومي": "30101012401234",
      "اسم الطالب": "أحمد محمود حسن إبراهيم",
      "كود الطالب": "LUM-2024-8140",
      "الكلية": "كلية الهندسة",
      "اليوم": "الأحد 15 أكتوبر",
      "المكان": "مبنى كليات الهندسة - صالة أ"
    },
    {
      "الرقم القومي": "30205122405678",
      "اسم الطالب": "مريم بولس فخري جرجس",
      "كود الطالب": "LUM-2024-8141",
      "الكلية": "كلية الصيدلة",
      "اليوم": "الإثنين 16 أكتوبر",
      "المكان": "مبنى الإدارة - شؤون الطلاب"
    },
    {
      "الرقم القومي": "30108202409988",
      "اسم الطالب": "يوسف محمد عادل علي",
      "كود الطالب": "LUM-2024-8142",
      "الكلية": "كلية الحاسبات والذكاء الاصطناعي",
      "اليوم": "الثلاثاء 17 أكتوبر",
      "المكان": "مدرج 3 - الدور الأرضي"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "نموذج_الطلاب");

  XLSX.writeFile(workbook, "نموذج_تجريبي_طلاب_اللوتس.xlsx");
  showToast("تحميل النموذج", "تم تنزيل نموذج الإكسيل التجريبي بنجاح.", "info");
}

/**
 * تحديث إعدادات تقسيم الكود وحفظها محلياً
 */
function updateSplitSettings() {
  const splitSelect = document.getElementById('splitModeSelect');
  const prefixInput = document.getElementById('defaultPrefixInput');
  const arrowInput = document.getElementById('arrowCustomTextInput');

  if (splitSelect) appSettings.splitMode = splitSelect.value;
  if (prefixInput) appSettings.defaultPrefix = prefixInput.value || 'LUM-';
  if (arrowInput) appSettings.arrowText = arrowInput.value || 'هذا هو الكود';

  // حفظ في التخزين المحلي
  try {
    localStorage.setItem('lum_code_settings', JSON.stringify(appSettings));
  } catch (e) {}

  // تحديث المعاينة الحية
  const sampleTestCode = "LUM-2024-8542";
  const split = parseStudentCode(sampleTestCode);

  const previewFixed = document.getElementById("previewFixedPart");
  const previewDynamic = document.getElementById("previewDynamicPart");
  const adminSplitPreview = document.getElementById("adminSplitDigitsPreview");
  const arrowBadgeLabel = document.getElementById("arrowBadgeLabel");

  if (previewFixed) previewFixed.textContent = split.fixedPart || appSettings.defaultPrefix;
  if (previewDynamic) previewDynamic.textContent = split.dynamicPart || '8542';
  if (arrowBadgeLabel) arrowBadgeLabel.textContent = appSettings.arrowText;

  if (adminSplitPreview) {
    if (appSettings.splitMode === 'last3') adminSplitPreview.textContent = "3";
    else if (appSettings.splitMode === 'last4') adminSplitPreview.textContent = "4";
    else if (appSettings.splitMode === 'last5') adminSplitPreview.textContent = "5";
    else if (appSettings.splitMode === 'delimiter') adminSplitPreview.textContent = "فاصل";
    else adminSplitPreview.textContent = "الكل";
  }

  // إعادة تصيير جدول الطلاب إذا كان مفتوحاً لتطبيق التقسيم الجديد
  if (cachedStudentsMap && Object.keys(cachedStudentsMap).length > 0) {
    renderAdminTable(cachedStudentsMap);
  }
}

// تصدير الدوال للكائن العام window
window.updateSplitSettings = updateSplitSettings;
window.renderAdminTable = renderAdminTable;

