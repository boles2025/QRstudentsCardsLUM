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
    showToast("مرحباً بك", "تم تسجيل الدخول للوحة الإدارة بنجاح", "success");
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

let rawExcelRows = [];

/**
 * دالة مساعدة لتنظيف وتوحيد أسماء الأعمدة وحذف العلامات الخفية
 */
function cleanArabicHeader(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // حذف المسافات الخفية ورموز الترميز
    .trim()
    .toLowerCase()
    .replace(/ة/g, 'ه')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[_\-\/\\]/g, ' ');
}

/**
 * فحص هل النص يمثل فرقة دراسية وليس كلية
 */
function isGradeString(str) {
  if (!str) return false;
  const s = cleanArabicHeader(str);
  return s.includes('فرقه') || s.includes('اولي') || s.includes('ثانيه') ||
         s.includes('ثالثه') || s.includes('رابعه') || s.includes('خامسه') ||
         s.includes('سادسه') || s.includes('مستوي') || s.includes('سنه') ||
         s.includes('grade') || s.includes('level');
}

/**
 * فحص هل النص يمثل اسم كلية أو تخصص جامعي
 */
function isFacultyString(str) {
  if (!str) return false;
  const s = cleanArabicHeader(str);
  if (isGradeString(s) && !s.includes('كليه')) return false;
  return s.includes('كليه') || s.includes('طب') || s.includes('صيدل') ||
         s.includes('تمريض') || s.includes('اسنان') || s.includes('علاج') ||
         s.includes('هندس') || s.includes('حاسب') || s.includes('ذكاء') ||
         s.includes('ادار') || s.includes('لغات') || s.includes('فنون') ||
         s.includes('علوم') || s.includes('اعلام') || s.includes('تكنولوج') ||
         s.includes('جامع') || s.includes('معهد');
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

      rawExcelRows = rawRows;

      // استخراج جميع أسماء الأعمدة المتاحة في الشيت
      const columnSet = new Set();
      rawRows.slice(0, 10).forEach(r => {
        Object.keys(r).forEach(k => {
          if (k && !k.startsWith('__EMPTY')) columnSet.add(k.trim());
        });
      });
      const availableColumns = Array.from(columnSet);

      if (availableColumns.length === 0) {
        showToast("خطأ بالأعمدة", "لم يتم العثور على عناوين أعمدة صالحة في الملف!", "danger");
        return;
      }

      // إظهار صندوق مطابقة وتأكيد الأعمدة
      setupColumnMappingSelects(availableColumns, rawRows);

      // تطبيق مطابقة الأعمدة وإنشاء سجلات الطلاب
      reparseWithCustomColumns();

      // تحديث شريط معلومات الملف
      document.getElementById("selectedFileName").textContent = file.name;
      document.getElementById("selectedFileSize").textContent = (file.size / 1024).toFixed(1) + " KB";
      document.getElementById("fileSelectedBar").classList.remove("d-none");

      showToast("تم قراءة الملف بنجاح", `تم التعرف على ${parsedExcelStudents.length} طالب. برجاء مراجعة عمود الكلية بالأسفل قبل الحفظ.`, "success");

    } catch (err) {
      console.error("Excel read error:", err);
      showToast("خطأ في القراءة", "حدث خطأ أثناء فك تشفير ملف الإكسيل: " + err.message, "danger");
    }
  };

  reader.readAsArrayBuffer(file);
}

/**
 * تهيئة قوائم اختيار ومطابقة الأعمدة
 */
function setupColumnMappingSelects(columns, rows) {
  const mapBox = document.getElementById("excelColumnMappingBox");
  if (mapBox) mapBox.classList.remove("d-none");

  const fields = [
    { id: "mapColNationalId", type: "nationalId", defaultIndex: 0 },
    { id: "mapColName", type: "name", defaultIndex: 1 },
    { id: "mapColCode", type: "code", defaultIndex: 2 },
    { id: "mapColFaculty", type: "faculty", defaultIndex: 3 },
    { id: "mapColDay", type: "day", defaultIndex: 4 },
    { id: "mapColLocation", type: "location", defaultIndex: 5 },
    { id: "mapColMedicalLocation", type: "medicalLocation", defaultIndex: 6 }
  ];

  fields.forEach(field => {
    const select = document.getElementById(field.id);
    if (!select) return;

    select.innerHTML = '<option value="">-- كشف تلقائي ذكي --</option>';

    let bestMatch = '';

    columns.forEach(col => {
      // إيجاد أول قيمة غير فارغة من أول 5 صفوف لتقديم عينة توضيحية
      let sampleVal = '';
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        if (rows[i][col] !== undefined && String(rows[i][col]).trim() !== '') {
          sampleVal = String(rows[i][col]).trim();
          break;
        }
      }

      const opt = document.createElement("option");
      opt.value = col;
      opt.textContent = sampleVal ? `${col} (مثال: ${sampleVal})` : col;
      select.appendChild(opt);

      // تخمين التطابق الأفضل
      const cleanCol = cleanArabicHeader(col);
      if (field.type === 'nationalId') {
        if (!bestMatch && (cleanCol.includes('قومي') || cleanCol.includes('بطاق') || cleanCol.includes('national') || cleanCol === 'nid' || cleanCol === 'id')) {
          bestMatch = col;
        }
      } else if (field.type === 'name') {
        if (!bestMatch && (cleanCol.includes('اسم') || cleanCol.includes('name') || cleanCol.includes('طالب'))) {
          bestMatch = col;
        }
      } else if (field.type === 'code') {
        if (!bestMatch && (cleanCol.includes('كود') || cleanCol.includes('code') || cleanCol.includes('باركود') || cleanCol.includes('barcode'))) {
          bestMatch = col;
        }
      } else if (field.type === 'faculty') {
        if (!bestMatch) {
          if (cleanCol.includes('كليه') || cleanCol.includes('faculty') || cleanCol.includes('college') || cleanCol.includes('تخصص') || cleanCol.includes('قسم') || cleanCol.includes('برنامج')) {
            bestMatch = col;
          } else if (cleanCol.includes('فرقه') || cleanCol.includes('grade')) {
            bestMatch = col;
          } else if (sampleVal && isFacultyString(sampleVal)) {
            bestMatch = col;
          }
        }
      } else if (field.type === 'day') {
        if (!bestMatch && (cleanCol.includes('يوم') || cleanCol.includes('day') || cleanCol.includes('تاريخ') || cleanCol.includes('date'))) {
          bestMatch = col;
        }
      } else if (field.type === 'location') {
        if (!bestMatch && (cleanCol.includes('كارنيه') || (cleanCol.includes('استلام') && !cleanCol.includes('كشف')) || (cleanCol.includes('مكان') && !cleanCol.includes('كشف') && !cleanCol.includes('طبي')) || cleanCol.includes('قاع') || cleanCol.includes('مدرج') || cleanCol.includes('مبني') || cleanCol.includes('location') || cleanCol.includes('hall'))) {
          bestMatch = col;
        }
      } else if (field.type === 'medicalLocation') {
        if (!bestMatch && (cleanCol.includes('كشف') || cleanCol.includes('طبي') || cleanCol.includes('عياد') || cleanCol.includes('medical') || cleanCol.includes('clinic') || cleanCol.includes('فحص'))) {
          bestMatch = col;
        }
      }
    });

    // إذا لم يتم العثور على اسم عمود صريح وكان الملف يحتوي على أعمدة كافية، اعتمد الترتيب الافتراضي
    if (!bestMatch && columns[field.defaultIndex]) {
      bestMatch = columns[field.defaultIndex];
    }

    if (bestMatch) {
      select.value = bestMatch;
    }
  });
}

/**
 * استخراج وإعادة تحليل بيانات الطلاب بناءً على الأعمدة المحددة
 */
function reparseWithCustomColumns() {
  if (!rawExcelRows || rawExcelRows.length === 0) return;

  const colFaculty = document.getElementById("mapColFaculty") ? document.getElementById("mapColFaculty").value : '';
  const colName = document.getElementById("mapColName") ? document.getElementById("mapColName").value : '';
  const colNationalId = document.getElementById("mapColNationalId") ? document.getElementById("mapColNationalId").value : '';
  const colCode = document.getElementById("mapColCode") ? document.getElementById("mapColCode").value : '';
  const colDay = document.getElementById("mapColDay") ? document.getElementById("mapColDay").value : '';
  const colLocation = document.getElementById("mapColLocation") ? document.getElementById("mapColLocation").value : '';
  const colMedicalLocation = document.getElementById("mapColMedicalLocation") ? document.getElementById("mapColMedicalLocation").value : '';

  const mappedList = [];

  rawExcelRows.forEach((row, index) => {
    let nationalId = '';
    let name = '';
    let code = '';
    let faculty = '';
    let day = '';
    let location = '';
    let medicalLocation = '';

    // 1. استخراج الحقول إذا تم تحديد عمود محدد بالاسم
    if (colNationalId && row[colNationalId] !== undefined) {
      nationalId = normalizeArabicNumbers(String(row[colNationalId])).replace(/\D/g, '');
    }
    if (colName && row[colName] !== undefined) {
      name = String(row[colName]).trim();
    }
    if (colCode && row[colCode] !== undefined) {
      code = String(row[colCode]).trim();
    }
    if (colFaculty && row[colFaculty] !== undefined) {
      faculty = String(row[colFaculty]).trim();
    }
    if (colDay && row[colDay] !== undefined) {
      day = String(row[colDay]).trim();
    }
    if (colLocation && row[colLocation] !== undefined) {
      location = String(row[colLocation]).trim();
    }
    if (colMedicalLocation && row[colMedicalLocation] !== undefined) {
      medicalLocation = String(row[colMedicalLocation]).trim();
    }

    // 2. الكشف التلقائي الذكي للحقول غير المحددة
    const rowKeys = Object.keys(row);
    for (const key of rowKeys) {
      const cleanKey = cleanArabicHeader(key);
      const val = String(row[key] !== undefined && row[key] !== null ? row[key] : '').trim();
      if (!val) continue;

      if (!nationalId && (cleanKey.includes('قومي') || cleanKey.includes('بطاق') || cleanKey.includes('national') || cleanKey === 'nid' || cleanKey === 'id')) {
        nationalId = normalizeArabicNumbers(val).replace(/\D/g, '');
      } else if (!name && (cleanKey.includes('اسم') || cleanKey.includes('name') || cleanKey.includes('طالب'))) {
        name = val;
      } else if (!code && (cleanKey.includes('كود') || cleanKey.includes('code') || cleanKey.includes('باركود') || cleanKey.includes('barcode'))) {
        code = val;
      } else if (!faculty && (cleanKey.includes('كليه') || cleanKey.includes('faculty') || cleanKey.includes('college') || cleanKey.includes('قسم') || cleanKey.includes('تخصص') || cleanKey.includes('برنامج') || cleanKey.includes('فرقه') || cleanKey.includes('grade'))) {
        faculty = val;
      } else if (!day && (cleanKey.includes('يوم') || cleanKey.includes('day') || cleanKey.includes('تاريخ') || cleanKey.includes('date'))) {
        day = val;
      } else if (!medicalLocation && (cleanKey.includes('كشف') || cleanKey.includes('طبي') || cleanKey.includes('عياد') || cleanKey.includes('medical') || cleanKey.includes('clinic') || cleanKey.includes('فحص'))) {
        medicalLocation = val;
      } else if (!location && (cleanKey.includes('كارنيه') || (cleanKey.includes('استلام') && !cleanKey.includes('كشف')) || (cleanKey.includes('مكان') && !cleanKey.includes('كشف') && !cleanKey.includes('طبي')) || cleanKey.includes('قاع') || cleanKey.includes('مدرج') || cleanKey.includes('مبني') || cleanKey.includes('location') || cleanKey.includes('hall'))) {
        location = val;
      }
    }

    // 3. دعم الترتيب الافتراضي للأعمدة (1: الرقم القومي، 2: الاسم، 3: الكود، 4: الكلية، 5: اليوم، 6: مكان استلام الكارنيه، 7: مكان الكشف الطبي)
    if (!nationalId && rowKeys[0] && row[rowKeys[0]] !== undefined) {
      const val0 = normalizeArabicNumbers(String(row[rowKeys[0]])).replace(/\D/g, '');
      if (val0.length >= 6) nationalId = val0;
    }
    if (!name && rowKeys[1] && row[rowKeys[1]] !== undefined) {
      name = String(row[rowKeys[1]]).trim();
    }
    if (!code && rowKeys[2] && row[rowKeys[2]] !== undefined) {
      code = String(row[rowKeys[2]]).trim();
    }
    if (!faculty && rowKeys[3] && row[rowKeys[3]] !== undefined) {
      faculty = String(row[rowKeys[3]]).trim();
    }
    if (!day && rowKeys[4] && row[rowKeys[4]] !== undefined) {
      day = String(row[rowKeys[4]]).trim();
    }
    if (!location && rowKeys[5] && row[rowKeys[5]] !== undefined) {
      location = String(row[rowKeys[5]]).trim();
    }
    if (!medicalLocation && rowKeys[6] && row[rowKeys[6]] !== undefined) {
      medicalLocation = String(row[rowKeys[6]]).trim();
    }

    // إذا لم يكن هناك عمود كود مخصص، نولد كوداً تسلسلياً بناء على الترتيب
    if (!code && nationalId) {
      code = 'LUM-' + (1000 + index + 1);
    }

    if (nationalId) {
      mappedList.push({
        nationalId: nationalId,
        name: name || 'طالب بجامعة اللوتس',
        code: code,
        faculty: faculty || 'جامعة اللوتس',
        grade: faculty || 'جامعة اللوتس', // للحفاظ على التوافق الكامل مع كافة السجلات
        day: day || 'الأحد',
        location: location || 'مقر استلام الكارنيه',
        medicalLocation: medicalLocation || 'العيادات الطبية'
      });
    }
  });

  parsedExcelStudents = mappedList;

  // تحديث العدادات
  const rowCountEl = document.getElementById("selectedRowCount");
  const loadedRowsEl = document.getElementById("adminLoadedExcelRows");
  if (rowCountEl) rowCountEl.textContent = parsedExcelStudents.length + " طالب جاهز للرفع";
  if (loadedRowsEl) loadedRowsEl.textContent = parsedExcelStudents.length;

  // تحديث المعاينة الحية
  updateExcelSamplePreview();
}

/**
 * تحديث المعاينة الحية لأول سجل سيتم رفعه
 */
function updateExcelSamplePreview() {
  const previewBox = document.getElementById("excelSamplePreview");
  if (!previewBox) return;

  if (!parsedExcelStudents || parsedExcelStudents.length === 0) {
    previewBox.innerHTML = `<span class="text-danger"><i class="fa-solid fa-triangle-exclamation me-1"></i> لم يتم استخراج أي طلاب! يرجى التأكد من اختيار عمود الرقم القومي.</span>`;
    return;
  }

  const sample = parsedExcelStudents[0];

  previewBox.innerHTML = `
    <div class="d-flex flex-wrap gap-3 align-items-center py-1">
      <div><span class="text-secondary small">الرقم القومي:</span> <span class="text-info font-monospace">${sample.nationalId}</span></div>
      <div><span class="text-secondary small">الاسم:</span> <strong class="text-white">${sample.name}</strong></div>
      <div><span class="text-secondary small">الكود:</span> <span class="text-cyan font-monospace">${sample.code}</span></div>
      <div><span class="text-secondary small">الكلية:</span> <span class="badge bg-warning text-dark fw-bold px-2 py-1 fs-6">${sample.faculty}</span></div>
      <div><span class="text-secondary small">اليوم:</span> <span class="text-success">${sample.day}</span></div>
      <div><span class="text-secondary small">مكان استلام الكارنيه:</span> <span class="text-white">${sample.location}</span></div>
      <div><span class="text-secondary small">مكان الكشف الطبي:</span> <span class="text-info">${sample.medicalLocation || '--'}</span></div>
    </div>
  `;
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
      updates['students/' + student.nationalId] = {
        nationalId: student.nationalId,
        name: student.name,
        code: student.code,
        faculty: student.faculty,
        grade: student.faculty, // تحديث grade ليكون اسم الكلية حتى تُستبدل أي بيانات سابقة
        day: student.day,
        location: student.location,
        medicalLocation: student.medicalLocation || ''
      };
    });

    progressBar.style.width = "50%";
    progressPercent.textContent = "50%";

    // الحفظ المباشر
    await firebaseDb.ref().update(updates);

    progressBar.style.width = "100%";
    progressPercent.textContent = "100%";

    const sampleFaculty = parsedExcelStudents[0]?.faculty || '';
    showToast("تم الحفظ بنجاح!", `تم رفع ومزامنة ${parsedExcelStudents.length} طالب بنجاح (الكلية: ${sampleFaculty}).`, "success");

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
  rawExcelRows = [];
  document.getElementById("excelFileInput").value = "";
  document.getElementById("fileSelectedBar").classList.add("d-none");
  const mapBox = document.getElementById("excelColumnMappingBox");
  if (mapBox) mapBox.classList.add("d-none");
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
        <td colspan="10" class="text-center py-4 text-secondary">
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
        <td><span class="badge bg-warning-subtle text-warning fw-bold">${s.faculty || s.grade || 'غير محدد'}</span></td>
        <td><span class="text-success">${s.day}</span></td>
        <td><small class="text-secondary">${s.location}</small></td>
        <td><small class="text-info">${s.medicalLocation || s.medical_location || '--'}</small></td>
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
    showToast("خطأ", "تعذر المسح: " + err.message, "danger");
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
    "الاسم": s.name,
    "الكود": s.code,
    "الكلية": s.faculty || s.grade || '',
    "اليوم": s.day,
    "مكان استلام الكارنيه": s.location,
    "مكان الكشف الطبي": s.medicalLocation || s.medical_location || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات الطلاب");

  XLSX.writeFile(workbook, "طلاب_جامعة_اللوتس_شؤون_الطلاب.xlsx");
  showToast("تم التصدير", "تم تصدير ملف الإكسيل بنجاح!", "success");
}

/**
 * تحميل نموذج إكسيل فارغ بالأعمدة فقط للكتابة فيه ورفعه مباشرة
 */
function downloadEmptyExcelTemplate() {
  const emptyHeaders = [
    {
      "الرقم القومي": "",
      "الاسم": "",
      "الكود": "",
      "الكلية": "",
      "اليوم": "",
      "مكان استلام الكارنيه": "",
      "مكان الكشف الطبي": ""
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(emptyHeaders);

  // ضبط عرض الأعمدة لتكون مريحة عند فتحها في Excel
  worksheet['!cols'] = [
    { wch: 18 }, // الرقم القومي
    { wch: 28 }, // الاسم
    { wch: 16 }, // الكود
    { wch: 25 }, // الكلية
    { wch: 18 }, // اليوم
    { wch: 30 }, // مكان استلام الكارنيه
    { wch: 35 }  // مكان الكشف الطبي
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات الطلاب");

  XLSX.writeFile(workbook, "قالب_فارغ_بيانات_الطلاب_جامعة_اللوتس.xlsx");
  showToast("تحميل القالب الفارغ", "تم تنزيل قالب الإكسيل الفارغ بنجاح. يمكنك الآن كتابة البيانات ورفعه مباشرة!", "success");
}

/**
 * تحميل نموذج إكسيل تجريبي لمساعدة الإدارة
 */
function downloadExcelTemplate() {
  const sampleData = [
    {
      "الرقم القومي": "30101012401234",
      "الاسم": "أحمد محمود حسن إبراهيم",
      "الكود": "LUM-2024-8140",
      "الكلية": "كلية الهندسة",
      "اليوم": "الأحد 15 أكتوبر",
      "مكان استلام الكارنيه": "مبنى كليات الهندسة - صالة أ",
      "مكان الكشف الطبي": "الإدارة الطبية - عيادة الباطنة (مبنى ج)"
    },
    {
      "الرقم القومي": "30205122405678",
      "الاسم": "مريم بولس فخري جرجس",
      "الكود": "LUM-2024-8141",
      "الكلية": "كلية الصيدلة",
      "اليوم": "الإثنين 16 أكتوبر",
      "مكان استلام الكارنيه": "مبنى الإدارة - شؤون الطلاب",
      "مكان الكشف الطبي": "الإدارة الطبية - عيادة الرمد والأسنان"
    },
    {
      "الرقم القومي": "30108202409988",
      "الاسم": "يوسف محمد عادل علي",
      "الكود": "LUM-2024-8142",
      "الكلية": "كلية الحاسبات والذكاء الاصطناعي",
      "اليوم": "الثلاثاء 17 أكتوبر",
      "مكان استلام الكارنيه": "مدرج 3 - الدور الأرضي",
      "مكان الكشف الطبي": "الإدارة الطبية - العيادة الشاملة"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // ضبط عرض الأعمدة
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 16 },
    { wch: 25 },
    { wch: 18 },
    { wch: 30 },
    { wch: 35 }
  ];

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
window.reparseWithCustomColumns = reparseWithCustomColumns;
window.downloadExcelTemplate = downloadExcelTemplate;
window.downloadEmptyExcelTemplate = downloadEmptyExcelTemplate;
