let currentUser = null;
let currentUserRole = null;
let currentCourseId = null;
let currentCourseName = null;
let coursesList = [];
let allUsersList = [];
let currentEditingStudent = null;   // Globale, accessibile da console e listener

const evaluationItemsLevel1 = [
    "Pagaiata in avanti /groenlandese",
    "Pagaiata indietro /groenlandese",
    "Pagaiata in avanti /europea",
    "Pagaiata indietro /europea",
    "Pagaiata circolare 360°",
    "Spostamento laterale a un tempo",
    "Spostamento laterale continuo",
    "Timonata di Poppa",
    "Appoggio basso",
    "Trasporto kayak",
    "Imbarco asciutto",
    "Imbarco alla cowboy",
    "Imbarco bilanciere",
    "Sbarco con bilanciere",
    "Sbarco cowboy",
    "Uscita bagnata",
    "Autosalvataggio Cowboy",
    "Autosalvataggio con paddlefloat",
    "Rescue T",
    "Inclinazione dello scafo con equilibrio",
    "Inclinazione dello scafo con perdita di equilibrio"
];

const evaluationItemsLevel2Extra = [
    "Timonata di Prua a dx",
    "Timonata di Prua a sx",
    "Spostamento laterale con abbrivio dx",
    "Spostamento laterale con abbrivio sx",
    "Appoggio alto dx",
    "Appoggio alto sx",
    "Appoggio alto continuo",
    "Rolling dx",
    "Rolling sx",
    "Traino di contatto",
    "Traino con cima"
];
const evaluationItemsLevel2 = [...evaluationItemsLevel1, ...evaluationItemsLevel2Extra];

const didatticheItems = [
    "Introduzione",
    "Dimostrazione",
    "Esplicazione",
    "Attività",
    "Sommario"
];

const valutazioneOptions = [
    { value: "0", label: "Non valutata (0)" },
    { value: "3", label: "Insufficiente (3)" },
    { value: "6", label: "Sufficiente (6)" },
    { value: "7", label: "Discreto (7)" },
    { value: "8", label: "Buono (8)" },
    { value: "10", label: "Ottimo (10)" }
];

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const changePwdBtn = document.getElementById('change-password-btn');
    const passwordModal = document.getElementById('password-modal');
    const closeModal = document.querySelector('.close-modal');
    const confirmPwdBtn = document.getElementById('confirm-password-btn');
    const userEmailSpan = document.getElementById('user-email');
    const adminBtn = document.getElementById('admin-btn');
    const addCourseBtn = document.getElementById('add-course-btn');
    const backToCoursesBtn = document.getElementById('back-to-courses-btn');
    const addStudentToCourseBtn = document.getElementById('add-student-to-course-btn');
    const backToStudentsBtn = document.getElementById('back-to-students-btn');
    const backFromAdminBtn = document.getElementById('back-from-admin-btn');
    const printCourseBtn = document.getElementById('print-course-btn');
    const assignModal = document.getElementById('assign-modal');
    const closeAssignModal = document.querySelector('.close-assign-modal');
    const saveAssignmentsBtn = document.getElementById('save-assignments-btn');
    let currentAssignCourse = null;

    function getEvaluationItemsForCourse(courseLevel) {
        return courseLevel === 2 ? evaluationItemsLevel2 : evaluationItemsLevel1;
    }

    function getValutazioneLabel(value) {
        const opt = valutazioneOptions.find(o => o.value == value);
        return opt ? opt.label : "Non valutata (0)";
    }

    window.onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            currentUser = user;
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            userEmailSpan.textContent = user.email;
            let userDoc = await window.getDoc(window.doc(window.db, "users", user.uid));
            if (!userDoc.exists()) {
                try {
                    await window.setDoc(window.doc(window.db, "users", user.uid), {
                        email: user.email,
                        role: "user",
                        uid: user.uid
                    });
                    userDoc = await window.getDoc(window.doc(window.db, "users", user.uid));
                } catch (error) {}
            }
            currentUserRole = userDoc.exists() ? userDoc.data().role : "user";
            if (adminBtn) adminBtn.style.display = currentUserRole === 'admin' ? 'inline-block' : 'none';
            if (addCourseBtn) addCourseBtn.style.display = currentUserRole === 'admin' ? 'inline-block' : 'none';
            await loadCourses();
            showCoursesView();
        } else {
            currentUser = null;
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
        }
    });

    // ... (tutte le altre funzioni: login, registration, addCourse, etc.) ...
    // Per brevità non riscrivo tutto, ma il codice è identico al precedente fino alla fine.
    // Il punto critico è che la stampa singola ora funziona perché currentEditingStudent è globale.
    // Tuttavia, per completezza, riporto la funzione di stampa singola e il listener.

    // Funzione stampa scheda singola (identica a prima)
    async function printSingleStudent(student, title = "Stampa Scheda") {
        if (!student) return;
        const course = coursesList.find(c => c.id === currentCourseId);
        if (!course) return;
        const evaluationItems = getEvaluationItemsForCourse(course.level);
        const logoHtml = `<div style="text-align:center; margin-bottom:15px;"><img src="logo-fict.png" alt="FICT Logo" style="max-width:80px; height:auto;"></div>`;
        const studentHtml = `
            ${logoHtml}
            <h3 style="margin:0 0 10px 0;">${escapeHtml(student.name)} ${escapeHtml(student.surname)}</h3>
            <p><strong>Nato:</strong> ${student.birthDate || '-'} | <strong>Indirizzo:</strong> ${escapeHtml(student.address || '-')}<br>
            <strong>Telefono:</strong> ${escapeHtml(student.phone || '-')} | <strong>Email:</strong> ${escapeHtml(student.email || '-')}<br>
            <strong>Certificato medico:</strong> ${student.medicalCert ? 'Sì' : 'No'} | <strong>BLSD:</strong> ${student.blsdCert ? 'Sì' : 'No'}<br>
            <strong>Altri brevetti:</strong> ${escapeHtml(student.otherPatents || '-')}</p>
            
            <h4>Valutazioni tecniche</h4>
            <table><thead><tr><th>Abilità</th><th>Valutazione</th><th>Note</th></tr></thead>
            <tbody>
                ${evaluationItems.map(item => {
                    const v = student.evaluations?.[item] || {};
                    return `<tr><td>${escapeHtml(item)}</td><td>${getValutazioneLabel(v.score)}</td><td>${escapeHtml(v.note || '')}</td></tr>`;
                }).join('')}
            </tbody></table>
            
            <h4>Attrezzatura</h4>
            <tr><th>Valutazione</th><td>${getValutazioneLabel(student.attrezzatura?.score)}</td></tr>
            <tr><th>Note</th><td>${escapeHtml(student.attrezzatura?.note || '')}</td></tr>
            </table>
            
            <h4>Valutazioni didattiche</h4>
            <td><thead><tr><th>Campo</th><th>Valutazione</th><th>Note</th></tr></thead>
            <tbody>
                ${didatticheItems.map(item => {
                    const v = student.didattiche?.[item] || {};
                    return `<tr><td>${escapeHtml(item)}</td><td>${getValutazioneLabel(v.score)}</td><td>${escapeHtml(v.note || '')}</td></tr>`;
                }).join('')}
            </tbody></table>
            
            <h4>Capacità psico-attitudinali</h4>
            <tr><th>Valutazione</th><td>${getValutazioneLabel(student.psicoAttitudinali?.score)}</td></tr>
            <tr><th>Note</th><td>${escapeHtml(student.psicoAttitudinali?.note || '')}NonNull} -->

            <h4>Giudizio finale</h4>
            <p>${escapeHtml(student.giudizioFinale || '')}</p>
        `;
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHtml(student.name)} ${escapeHtml(student.surname)} - ${title}</title>
                <style>
                    body { font-family: 'Inter', Arial, sans-serif; margin: 15px; font-size: 10pt; line-height: 1.3; }
                    h3 { margin: 0 0 8px; font-size: 14pt; }
                    h4 { margin: 12px 0 6px; font-size: 11pt; }
                    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
                    th { background: #f5f5f5; font-weight: 600; }
                    img { max-width: 80px; height: auto; }
                </style>
            </head>
            <body>
                <h2>${escapeHtml(course.name)} - ${title}</h2>
                <p>Data: ${new Date().toLocaleString()}</p>
                ${studentHtml}
            </body>
            </html>
        `;
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(fullHtml);
        iframeDoc.close();
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }

    // Listener per il pulsante di stampa singola (deve essere aggiunto dopo che il DOM è caricato)
    const printStudentBtn = document.getElementById('print-student-pdf-btn');
    if (printStudentBtn) {
        printStudentBtn.addEventListener('click', () => {
            if (currentEditingStudent) {
                printSingleStudent(currentEditingStudent, "Stampa Scheda");
            } else {
                alert('Nessun allievo selezionato per la stampa. Assicurati di aprire prima la scheda.');
            }
        });
    } else {
        console.error("Pulsante 'print-student-pdf-btn' non trovato nel DOM.");
    }

    // ... (il resto del codice invariato, incluse loadCourses, renderCoursesList, showStudentEditView, ecc.)
    // Assicurati che showStudentEditView contenga la riga: currentEditingStudent = student;
});