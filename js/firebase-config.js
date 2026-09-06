/**
 * إعدادات وربط Firebase Realtime Database
 * تم توفيرها من قبل مهندس بولس سمير
 */

const firebaseConfig = {
  apiKey: "AIzaSyDvZgP6u7TGQCopxqUhMqmh58KKmGNE6M4",
  authDomain: "bolestest.firebaseapp.com",
  databaseURL: "https://bolestest-default-rtdb.firebaseio.com",
  projectId: "bolestest",
  storageBucket: "bolestest.firebasestorage.app",
  messagingSenderId: "536112616180",
  appId: "1:536112616180:web:62ee559d215db72a9844a1",
  measurementId: "G-3PEQ93VFHR"
};

// تهيئة تطبيق Firebase
let firebaseApp = null;
let firebaseDb = null;
let isFirebaseConnected = false;

try {
  if (typeof firebase !== 'undefined') {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.database();
    
    // فحص حالة الاتصال بالسيرفر
    const connectedRef = firebase.database().ref(".info/connected");
    connectedRef.on("value", (snap) => {
      const statusText = document.getElementById("firebaseStatusText");
      const adminStatus = document.getElementById("adminFirebaseStatus");
      const indicator = document.getElementById("firebaseStatusIndicator");
      
      if (snap.val() === true) {
        isFirebaseConnected = true;
        if (statusText) statusText.textContent = "متصل بالفيربيس";
        if (adminStatus) adminStatus.textContent = "متصل ونشط";
        if (indicator) indicator.title = "متصل بالفيربيس (قاعدة البيانات نشطة ومزامنة)";
      } else {
        isFirebaseConnected = false;
        if (statusText) statusText.textContent = "جاري الاتصال...";
        if (adminStatus) adminStatus.textContent = "غير متصل";
        if (indicator) indicator.title = "جاري الاتصال بالفيربيس...";
      }
    });
    console.log("Firebase initialized successfully with DB:", firebaseConfig.databaseURL);
  } else {
    console.warn("Firebase SDK script not loaded yet.");
  }
} catch (error) {
  console.error("Firebase init error:", error);
}
