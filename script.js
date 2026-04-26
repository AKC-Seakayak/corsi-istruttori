import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDYE2PQiqYn5INBInSI5mCr_xhffHR3bQU",
    authDomain: "seatrainer-457de.firebaseapp.com",
    projectId: "seatrainer-457de",
    storageBucket: "seatrainer-457de.firebasestorage.app",
    messagingSenderId: "869282330869",
    appId: "1:869282330869:web:96e8387062402150339904"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentCourseId = null;
let currentCourseLevel = null; // Memorizziamo il livello del corso selezionato
let currentStudentId = null;

// --- LISTE MANOVRE ---
const baseItems = [
    "Pagaiata in avanti /groenlandese", "Pagaiata indietro /groenlandese",
    "Pagaiata in avanti /europea", "Pagaiata indietro /europea",
    "Pagaiata circolare 360°", "Spostamento laterale a un tempo",
    "Spostamento laterale continuo", "Timonata di Poppa",
    "Appoggio basso", "Trasporto kayak", "Imbarco asciutto",
    "Imbarco alla cowboy", "Imbarco bilanciere", "Sbarco con bilanciere",
    "Sbarco cowboy", "Uscita bagnata", "Autosalvataggio Cowboy",
    "Autosalvataggio con paddlefloat", "Rescue T",
    "Inclinazione dello scafo con equilibrio", "Inclinazione dello scafo con perdita di equilibrio"
];

const advancedItems = [
    "Timonata di Prua a dx", "Timonata di Prua a sx",
    "Spostamento laterale con abbrivio dx", "Spostamento laterale con abbrivio sx",
    "Appoggio alto dx", "Appoggio alto sx", "Appoggio alto continuo",
    "Rolling dx", "Rolling sx", "Traino di contatto", "Traino a V o a rombo"
];

// --- GESTIONE VISTE E UI ---
function showView(viewId) {
    const views = ['login-view', 'courses-view', 'course-students-view', 'student-edit-view', 'admin-view'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === viewId) ? 'block' : 'none';
    });
    const header = document.getElementById('main-header');
    if (header) header.style.display = (viewId === 'login-view') ? 'none' : 'block';
}

function showMessage(msg, type = 'success') {
    const div = document.createElement('div');
    div.style.cssText = `position: fixed; bottom: 20px; right: 20px; z-index: 9999; padding: 16px 24px; border-radius: 12px; color: white; font-weight: 600; background: ${type === 'success' ? '#10b981' : '#ef4444'}; box-shadow: 0 10px 15px rgba(0,0,0,0.1); transition: all 0.3s ease;`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// --- LOGICA AUTENTICAZIONE ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('user-display-name').textContent = user.email;
        loadCourses();
    } else {
        showView('login-view');
    }
});

document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch (e) { showMessage("Credenziali non valide", "error"); }
});

document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));

// --- CARICAMENTO CORSI ---
async function loadCourses() {
    showView('courses-view');
    const container = document.getElementById('courses-list');
    container.innerHTML = '<div class="loading">Caricamento corsi...</div>';
    
    try {
        const snap = await getDocs(collection(db, "courses"));
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const course = docSnap.data();
            // Firebase salva il livello (es. "1" o "2"). Se non c'è, assumiamo "1".
            const level = course.level || "1"; 
            
            const card = document.createElement('div');
            card.className = 'course-card';
            card.innerHTML = `
                <h3>${course.name}</h3>
                <span class="badge">${level === "2" ? "Livello 2 (Avanzato)" : "Livello 1 (Base)"}</span>
            `;
            card.onclick = () => loadStudents(docSnap.id, course.name, level);
            container.appendChild(card);
        });
    } catch (e) { showMessage("Errore caricamento database", "error"); }
}

// --- CARICAMENTO STUDENTI ---
async function loadStudents(courseId, courseName, level) {
    currentCourseId = courseId;
    currentCourseLevel = level; // Salviamo il livello per la valutazione
    document.getElementById('current-course-title').textContent = courseName;
    showView('course-students-view');
    
    const container = document.getElementById('students-list');
    container.innerHTML = '<p>Caricamento allievi...</p>';
    
    try {
        const snap = await getDocs(collection(db, "courses", courseId, "students"));
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const s = docSnap.data();
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `<h4>${s.name} ${s.surname}</h4><p>Clicca per valutare</p>`;
            card.onclick = () => openStudentEvaluation(docSnap.id, s);
            container.appendChild(card);
        });
    } catch (e) { showMessage("Errore caricamento studenti", "error"); }
}

// --- VALUTAZIONE (DINAMICA PER LIVELLO) ---
function openStudentEvaluation(studentId, studentData) {
    currentStudentId = studentId;
    document.getElementById('edit-student-name').textContent = `Valutazione: ${studentData.name} ${studentData.surname}`;
    showView('student-edit-view');
    
    const tbody = document.getElementById('evaluation-items-body');
    tbody.innerHTML = '';

    // QUI VIENE DECISO QUALI MANOVRE MOSTRARE
    // Se il livello salvato su Firebase è "2", uniamo le liste.
    let finalItems = [...baseItems];
    if (currentCourseLevel === "2") {
        finalItems = [...baseItems, ...advancedItems];
    }

    const evals = studentData.evaluations || {};

    finalItems.forEach(item => {
        const tr = document.createElement('tr');
        const status = evals[item]?.status || "";
        const note = evals[item]?.note || "";
        tr.innerHTML = `
            <td style="font-weight:500">${item}</td>
            <td>
                <select class="evaluation-select" data-item="${item}">
                    <option value="">-</option>
                    <option value="1" ${status == "1" ? 'selected' : ''}>✅ Superato</option>
                    <option value="0" ${status == "0" ? 'selected' : ''}>❌ No</option>
                </select>
            </td>
            <td><input type="text" class="note-input" data-item="${item}" value="${note}" placeholder="Note..."></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- SALVATAGGIO ---
document.getElementById('save-evaluation-btn')?.addEventListener('click', async () => {
    const evaluations = {};
    document.querySelectorAll('.evaluation-select').forEach(sel => {
        const item = sel.getAttribute('data-item');
        const note = document.querySelector(`.note-input[data-item="${item}"]`).value;
        evaluations[item] = { status: sel.value, note: note };
    });

    try {
        await updateDoc(doc(db, "courses", currentCourseId, "students", currentStudentId), { evaluations });
        showMessage("Valutazione salvata!");
        loadStudents(currentCourseId, document.getElementById('current-course-title').textContent, currentCourseLevel);
    } catch (e) { showMessage("Errore salvataggio", "error"); }
});

// --- NAVIGAZIONE ---
document.getElementById('back-to-courses-btn')?.addEventListener('click', loadCourses);
document.getElementById('back-to-students-btn')?.addEventListener('click', () => loadStudents(currentCourseId, document.getElementById('current-course-title').textContent, currentCourseLevel));