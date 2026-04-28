let currentUser = null;
let currentUserRole = null;
let currentCourseId = null;
let currentCourseName = null;
let coursesList = [];
let allUsersList = [];
let currentEditingStudent = null;

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
            // === AGGIUNTA STAMPA SINGOLA ALLIEVO ===
    async function printSingleStudent(student) {
        if (!student) return;
        const course = coursesList.find(c => c.id === currentCourseId);
        if (!course) return;
        const evaluationItems = getEvaluationItemsForCourse(course.level);
        const logoHtml = `<div style="text-align:center; margin-bottom:15px;"><img src="logo-fict.png" style="max-width:80px;"></div>`;
        const studentHtml = `
            ${logoHtml}
            <h3>${escapeHtml(student.name)} ${escapeHtml(student.surname)}</h3>
            <p><strong>Nato:</strong> ${student.birthDate || '-'}<br>
            <strong>Indirizzo:</strong> ${escapeHtml(student.address || '-')}<br>
            <strong>Telefono:</strong> ${escapeHtml(student.phone || '-')}<br>
            <strong>Email:</strong> ${escapeHtml(student.email || '-')}<br>
            <strong>Certificato medico:</strong> ${student.medicalCert ? 'Sì' : 'No'} | <strong>BLSD:</strong> ${student.blsdCert ? 'Sì' : 'No'}<br>
            <strong>Altri brevetti:</strong> ${escapeHtml(student.otherPatents || '-')}</p>
            
            <h4>Valutazioni tecniche</h4>
            <table border="1" cellpadding="4" style="border-collapse:collapse; width:100%; margin-bottom:15px;">
                <thead><tr><th>Abilità</th><th>Valutazione</th><th>Note</th></tr></thead>
                <tbody>
                    ${evaluationItems.map(item => {
                        const v = student.evaluations?.[item] || {};
                        return `<tr><td>${escapeHtml(item)}</td><td>${getValutazioneLabel(v.score)}</td><td>${escapeHtml(v.note || '')}</td></tr>`;
                    }).join('')}
                </tbody>
            </table>
            
            <h4>Attrezzatura</h4>
            <table border="1" cellpadding="4" style="width:100%;">
                <tr><th>Valutazione</th><td>${getValutazioneLabel(student.attrezzatura?.score)}</td></tr>
                <tr><th>Note</th><td>${escapeHtml(student.attrezzatura?.note || '')}</td></tr>
            </table>
            
            <h4>Valutazioni didattiche</h4>
            <table border="1" cellpadding="4" style="width:100%;">
                <thead><tr><th>Campo</th><th>Valutazione</th><th>Note</th></tr></thead>
                <tbody>
                    ${didatticheItems.map(item => {
                        const v = student.didattiche?.[item] || {};
                        return `<tr><td>${escapeHtml(item)}</td><td>${getValutazioneLabel(v.score)}</td><td>${escapeHtml(v.note || '')}</td></tr>`;
                    }).join('')}
                </tbody>
            </table>
            
            <h4>Capacità psico-attitudinali</h4>
            <table border="1" cellpadding="4" style="width:100%;">
                <tr><th>Valutazione</th><td>${getValutazioneLabel(student.psicoAttitudinali?.score)}</td></tr>
                <tr><th>Note</th><td>${escapeHtml(student.psicoAttitudinali?.note || '')}</td></tr>
            </table>
            
            <h4>Giudizio finale</h4>
            <p>${escapeHtml(student.giudizioFinale || '')}</p>
        `;
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHtml(student.name)} ${escapeHtml(student.surname)} - Scheda</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h3, h4 { margin: 10px 0; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
                    th, td { border: 1px solid #aaa; padding: 6px; text-align: left; vertical-align: top; }
                    th { background: #f0f0f0; }
                </style>
            </head>
            <body>
                <h2>${escapeHtml(course.name)} - Scheda Allievo</h2>
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

    // Listener per il pulsante di stampa (ID: print-student-btn)
    const printBtn = document.getElementById('print-student-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (window.currentEditingStudent) {
                printSingleStudent(window.currentEditingStudent);
            } else {
                alert('Nessun allievo selezionato. Apri la scheda prima di stampare.');
            }
        });
    }

    // Assicurati che showStudentEditView imposti window.currentEditingStudent
    // Se non esiste, aggiungi questa riga all'inizio della funzione showStudentEditView:
    // window.currentEditingStudent = student;
    });

    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const messageDiv = document.getElementById('auth-message');
        try {
            await window.signInWithEmailAndPassword(window.auth, email, password);
            messageDiv.textContent = 'Accesso riuscito!';
            messageDiv.className = 'message success';
            setTimeout(() => messageDiv.textContent = '', 2000);
        } catch (error) {
            messageDiv.textContent = 'Errore: ' + error.message;
            messageDiv.className = 'message error';
        }
    });

    registerBtn.addEventListener('click', async () => {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const messageDiv = document.getElementById('auth-message');
        try {
            const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
            await window.setDoc(window.doc(window.db, "users", userCredential.user.uid), {
                email: email,
                role: "user",
                uid: userCredential.user.uid
            });
            messageDiv.textContent = 'Registrazione riuscita!';
            messageDiv.className = 'message success';
        } catch (error) {
            messageDiv.textContent = 'Errore: ' + error.message;
            messageDiv.className = 'message error';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await window.signOut(window.auth);
    });

    changePwdBtn.addEventListener('click', () => {
        passwordModal.style.display = 'flex';
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        document.getElementById('password-message').textContent = '';
    });

    closeModal.addEventListener('click', () => {
        passwordModal.style.display = 'none';
    });

    confirmPwdBtn.addEventListener('click', async () => {
        const currentPwd = document.getElementById('current-password').value;
        const newPwd = document.getElementById('new-password').value;
        const confirmPwd = document.getElementById('confirm-password').value;
        const msgDiv = document.getElementById('password-message');
        if (newPwd !== confirmPwd) {
            msgDiv.textContent = 'Le nuove password non coincidono';
            msgDiv.className = 'message error';
            return;
        }
        if (newPwd.length < 6) {
            msgDiv.textContent = 'Minimo 6 caratteri';
            msgDiv.className = 'message error';
            return;
        }
        try {
            const user = window.auth.currentUser;
            const credential = window.EmailAuthProvider.credential(user.email, currentPwd);
            await window.reauthenticateWithCredential(user, credential);
            await window.updatePassword(user, newPwd);
            msgDiv.textContent = 'Password cambiata!';
            msgDiv.className = 'message success';
            setTimeout(() => passwordModal.style.display = 'none', 1500);
        } catch (error) {
            msgDiv.textContent = 'Errore: ' + error.message;
            msgDiv.className = 'message error';
        }
    });

    addCourseBtn.addEventListener('click', async () => {
        const courseName = prompt('Nome del corso:');
        if (!courseName) return;
        let level = prompt('Livello (1 = Base, 2 = Avanzato):', '1');
        while (level !== '1' && level !== '2') {
            level = prompt('1 = Base, 2 = Avanzato:', '1');
            if (level === null) return;
        }
        const description = prompt('Descrizione (opzionale):');
        await window.addDoc(window.collection(window.db, "courses"), {
            name: courseName,
            description: description || '',
            level: parseInt(level),
            createdAt: new Date().toISOString(),
            createdBy: currentUser.uid,
            assignedUserIds: []
        });
        await loadCourses();
        showMessage('Corso creato', 'success');
    });

    backToCoursesBtn.addEventListener('click', () => {
        showCoursesView();
        loadCourses();
    });

    addStudentToCourseBtn.addEventListener('click', () => {
        if (!currentCourseId) return alert('Nessun corso selezionato');
        showStudentEditView(null);
    });

    backToStudentsBtn.addEventListener('click', () => {
        if (currentCourseId) showCourseStudents({ id: currentCourseId, name: currentCourseName });
        else showCoursesView();
    });

    adminBtn.addEventListener('click', showAdminView);
    backFromAdminBtn.addEventListener('click', () => {
        showCoursesView();
        loadCourses();
    });

    closeAssignModal.addEventListener('click', () => {
        assignModal.style.display = 'none';
    });

    saveAssignmentsBtn.addEventListener('click', async () => {
        if (!currentAssignCourse) return;
        const checkboxes = document.querySelectorAll('#assign-users-list input[type="checkbox"]');
        const selectedUserIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        try {
            await window.updateDoc(window.doc(window.db, "courses", currentAssignCourse.id), {
                assignedUserIds: selectedUserIds
            });
            document.getElementById('assign-message').textContent = 'Assegnazioni salvate!';
            document.getElementById('assign-message').className = 'message success';
            setTimeout(() => {
                assignModal.style.display = 'none';
                loadCourses();
            }, 1000);
        } catch (error) {
            document.getElementById('assign-message').textContent = 'Errore: ' + error.message;
            document.getElementById('assign-message').className = 'message error';
        }
    });

    // Stampa corso
    async function printCourse(opt_title = "Stampa Corso") {
        if (!currentCourseId) return;
        const course = coursesList.find(c => c.id === currentCourseId);
        if (!course) return;
        const studentsSnap = await window.getDocs(window.collection(window.db, "students"));
        const courseStudents = [];
        studentsSnap.forEach(doc => {
            if (doc.data().courseId === currentCourseId) courseStudents.push({ id: doc.id, ...doc.data() });
        });
        const evaluationItems = getEvaluationItemsForCourse(course.level);
        const logoHtml = `<div style="text-align:center; margin-bottom:15px;"><img src="logo-fict.png" alt="FICT Logo" style="max-width:80px; height:auto;"></div>`;
        let studentsHtml = '';
        for (let i = 0; i < courseStudents.length; i++) {
            const s = courseStudents[i];
            const pageBreak = i === 0 ? '' : 'page-break-before: always;';
            studentsHtml += `
                <div style="${pageBreak}">
                    ${logoHtml}
                    <h3 style="margin:0 0 10px 0;">${escapeHtml(s.name)} ${escapeHtml(s.surname)}</h3>
                    <p><strong>Nato:</strong> ${s.birthDate || '-'} | <strong>Indirizzo:</strong> ${escapeHtml(s.address || '-')}<br>
                    <strong>Telefono:</strong> ${escapeHtml(s.phone || '-')} | <strong>Email:</strong> ${escapeHtml(s.email || '-')}<br>
                    <strong>Certificato medico:</strong> ${s.medicalCert ? 'Sì' : 'No'} | <strong>BLSD:</strong> ${s.blsdCert ? 'Sì' : 'No'}<br>
                    <strong>Altri brevetti:</strong> ${escapeHtml(s.otherPatents || '-')}</p>
                    
                    <h4>Valutazioni tecniche</h4>
                    <table>
                        <thead><tr><th>Abilità</th><th>Valutazione</th><th>Note</th></tr></thead>
                        <tbody>
                            ${evaluationItems.map(item => {
                                const v = s.evaluations?.[item] || {};
                                return `<tr><td>${escapeHtml(item)}</td><td>${getValutazioneLabel(v.score)}</td><td>${escapeHtml(v.note || '')}</td></tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    
                    <h4>Attrezzatura</h4>
                    <table><tr><th>Valutazione</th><td>${getValutazioneLabel(s.attrezzatura?.score)}</td></tr>
                    <tr><th>Note</th><td>${escapeHtml(s.attrezzatura?.note || '')}</td></tr></table>
                    
                    <h4>Valutazioni didattiche</h4>
                    <table><thead><tr><th>Campo</th><th>Valutazione</th><th>Note</th></tr></thead>
                    <tbody>
                        ${didatticheItems.map(item => {
                            const v = s.didattiche?.[item] || {};
                            return `<tr><td>${escapeHtml(item)}</td><td>${getValutazioneLabel(v.score)}</td><td>${escapeHtml(v.note || '')}</td></tr>`;
                        }).join('')}
                    </tbody></table>
                    
                    <h4>Capacità psico-attitudinali</h4>
                    <table><tr><th>Valutazione</th><td>${getValutazioneLabel(s.psicoAttitudinali?.score)}</td></tr>
                    <tr><th>Note</th><td>${escapeHtml(s.psicoAttitudinali?.note || '')}</td></tr></table>
                    
                    <h4>Giudizio finale</h4>
                    <p>${escapeHtml(s.giudizioFinale || '')}</p>
                </div>
            `;
        }
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHtml(course.name)} - ${opt_title}</title>
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
                <h2>${escapeHtml(course.name)} - ${opt_title}</h2>
                <p>Data: ${new Date().toLocaleString()} | Livello: ${course.level === 1 ? 'Base' : 'Avanzato'}</p>
                ${studentsHtml}
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
    printCourseBtn.addEventListener('click', () => printCourse("Stampa Corso"));

    // Stampa scheda singola
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
            <table><tr><th>Valutazione</th><td>${getValutazioneLabel(student.attrezzatura?.score)}</td></tr>
            <tr><th>Note</th><td>${escapeHtml(student.attrezzatura?.note || '')}</td></tr></table>
            
            <h4>Valutazioni didattiche</h4>
            <table><thead><tr><th>Campo</th><th>Valutazione</th><th>Note</th></tr></thead>
            <tbody>
                ${didatticheItems.map(item => {
                    const v = student.didattiche?.[item] || {};
                    return `<tr><td>${escapeHtml(item)}</td><td>${getValutazioneLabel(v.score)}</td><td>${escapeHtml(v.note || '')}</td></tr>`;
                }).join('')}
            </tbody></table>
            
            <h4>Capacità psico-attitudinali</h4>
            <table><tr><th>Valutazione</th><td>${getValutazioneLabel(student.psicoAttitudinali?.score)}</td></tr>
            <tr><th>Note</th><td>${escapeHtml(student.psicoAttitudinali?.note || '')}</td></tr></table>
            
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

    const printStudentBtn = document.getElementById('print-student-pdf-btn');
    if (printStudentBtn) {
        printStudentBtn.addEventListener('click', () => {
            if (currentEditingStudent) {
                printSingleStudent(currentEditingStudent, "Stampa Scheda");
            } else {
                alert('Nessuna scheda aperta');
            }
        });
    }

    // ===================== FUNZIONI PRINCIPALI =====================
    async function loadCourses() {
        try {
            const querySnapshot = await window.getDocs(window.collection(window.db, "courses"));
            coursesList = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.level) data.level = 1;
                if (!data.assignedUserIds) data.assignedUserIds = [];
                coursesList.push({ id: doc.id, ...data });
            });
            renderCoursesList();
        } catch (error) {
            showMessage("Errore caricamento corsi", "error");
        }
    }

    function renderCoursesList() {
        const grid = document.getElementById('courses-grid');
        if (!grid) return;
        let visible = coursesList;
        if (currentUserRole !== 'admin') {
            visible = coursesList.filter(c => c.assignedUserIds?.includes(currentUser.uid));
        }
        if (visible.length === 0) {
            grid.innerHTML = '<div class="card">Nessun corso disponibile.</div>';
            return;
        }
        grid.innerHTML = '';
        visible.forEach(course => {
            const levelLabel = course.level === 1 ? 'Base' : 'Avanzato';
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `
                <h3>📘 ${escapeHtml(course.name)} <span style="font-size:0.8rem;">(${levelLabel})</span></h3>
                <p>${escapeHtml(course.description || '')}</p>
                <div class="actions">
                    <button class="btn small view-course" data-id="${course.id}">Apri Corso</button>
                    ${currentUserRole === 'admin' ? `
                        <button class="btn small secondary assign-users" data-id="${course.id}" data-name="${escapeHtml(course.name)}">👥 Assegna Utenti</button>
                        <button class="btn small danger delete-course" data-id="${course.id}">Elimina</button>
                    ` : ''}
                </div>
            `;
            grid.appendChild(card);
        });
        document.querySelectorAll('.view-course').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                const course = visible.find(c => c.id === id);
                if (course) showCourseStudents(course);
            });
        });
        if (currentUserRole === 'admin') {
            document.querySelectorAll('.assign-users').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.getAttribute('data-id');
                    const course = visible.find(c => c.id === id);
                    if (course) await showAssignUsersModal(course);
                });
            });
            document.querySelectorAll('.delete-course').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('Eliminare corso e tutti gli allievi?')) {
                        const studentsSnap = await window.getDocs(window.collection(window.db, "students"));
                        for (const docSnap of studentsSnap.docs) {
                            if (docSnap.data().courseId === id) await window.deleteDoc(window.doc(window.db, "students", docSnap.id));
                        }
                        await window.deleteDoc(window.doc(window.db, "courses", id));
                        await loadCourses();
                        showMessage('Corso eliminato', 'success');
                    }
                });
            });
        }
    }

    async function showAssignUsersModal(course) {
        currentAssignCourse = course;
        const usersSnap = await window.getDocs(window.collection(window.db, "users"));
        const container = document.getElementById('assign-users-list');
        container.innerHTML = '';
        usersSnap.forEach(userDoc => {
            const user = userDoc.data();
            const isChecked = course.assignedUserIds?.includes(user.uid);
            const div = document.createElement('div');
            div.style.margin = '8px 0';
            div.innerHTML = `<label><input type="checkbox" value="${user.uid}" ${isChecked ? 'checked' : ''}> ${escapeHtml(user.email)} (${user.role})</label>`;
            container.appendChild(div);
        });
        document.getElementById('assign-course-name').textContent = course.name;
        document.getElementById('assign-message').textContent = '';
        assignModal.style.display = 'flex';
    }

    async function showCourseStudents(course) {
        currentCourseId = course.id;
        currentCourseName = course.name;
        document.getElementById('courses-view').style.display = 'none';
        document.getElementById('course-students-view').style.display = 'block';
        document.getElementById('student-edit-view').style.display = 'none';
        document.getElementById('admin-view').style.display = 'none';
        document.getElementById('course-title').innerHTML = `📘 ${escapeHtml(course.name)} (${course.level === 1 ? 'Base' : 'Avanzato'})`;
        const studentsSnap = await window.getDocs(window.collection(window.db, "students"));
        const courseStudents = [];
        studentsSnap.forEach(doc => {
            if (doc.data().courseId === course.id) courseStudents.push({ id: doc.id, ...doc.data() });
        });
        renderCourseStudents(courseStudents);
    }

    function renderCourseStudents(students) {
        const grid = document.getElementById('students-by-course-grid');
        if (!grid) return;
        if (students.length === 0) {
            grid.innerHTML = '<div class="card">Nessun allievo. Clicca "+ Nuovo Allievo".</div>';
            return;
        }
        grid.innerHTML = '';
        students.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `
                <h3>${escapeHtml(student.name)} ${escapeHtml(student.surname)}</h3>
                <p><strong>Nato:</strong> ${student.birthDate || '-'}</p>
                <p><strong>Medico:</strong> ${student.medicalCert ? 'Certificato medico' : 'No'} | <strong>BLSD:</strong> ${student.blsdCert ? 'Certificato BLSD' : 'No'}</p>
                <div class="actions">
                    <button class="btn small edit-student-course" data-id="${student.id}">Modifica Valutazioni</button>
                    <button class="btn small danger delete-student-course" data-id="${student.id}">Elimina</button>
                </div>
            `;
            grid.appendChild(card);
        });
        document.querySelectorAll('.edit-student-course').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.getAttribute('data-id');
                const student = students.find(s => s.id === id);
                if (student) showStudentEditView(student);
            });
        });
        document.querySelectorAll('.delete-student-course').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.getAttribute('data-id');
                if (confirm('Eliminare allievo?')) {
                    await window.deleteDoc(window.doc(window.db, "students", id));
                    showMessage('Allievo eliminato', 'success');
                    showCourseStudents({ id: currentCourseId, name: currentCourseName });
                }
            });
        });
    }

    async function showStudentEditView(student) {
        currentEditingStudent = student;
        document.getElementById('courses-view').style.display = 'none';
        document.getElementById('course-students-view').style.display = 'none';
        document.getElementById('student-edit-view').style.display = 'block';
        document.getElementById('admin-view').style.display = 'none';
        const container = document.getElementById('student-form-container');
        const course = coursesList.find(c => c.id === currentCourseId);
        const evaluationItems = getEvaluationItemsForCourse(course?.level || 1);

        let evaluations = {};
        if (student?.evaluations) evaluations = student.evaluations;
        else evaluationItems.forEach(item => evaluations[item] = { score: "0", note: '' });

        let didattiche = {};
        if (student?.didattiche) didattiche = student.didattiche;
        else didatticheItems.forEach(item => didattiche[item] = { score: "0", note: '' });

        const attrezzatura = student?.attrezzatura || { score: "0", note: '' };
        const psicoAttitudinali = student?.psicoAttitudinali || { score: "0", note: '' };
        const giudizioFinale = student?.giudizioFinale || '';

        function makeSelect(currentValue) {
            return valutazioneOptions.map(opt => `<option value="${opt.value}" ${currentValue == opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('');
        }

        // Righe tabella tecnica
        let techRows = '';
        for (const item of evaluationItems) {
            const val = evaluations[item]?.score || "0";
            const note = evaluations[item]?.note || '';
            const safeItem = escapeHtml(item);
            techRows += `
                <tr>
                    <td><strong>${safeItem}</strong></td>
                    <td><select class="evaluation-select" data-type="tech" data-item="${safeItem}">${makeSelect(val)}</select></td>
                    <td><div class="note-cell"><textarea class="note-textarea" data-type="tech" data-item="${safeItem}" rows="2">${escapeHtml(note)}</textarea><button class="delete-note-btn" data-type="tech" data-item="${safeItem}">🗑 Cancella</button></div></td>
                </tr>
            `;
        }

        // Righe tabella didattica
        let didatRows = '';
        for (const item of didatticheItems) {
            const val = didattiche[item]?.score || "0";
            const note = didattiche[item]?.note || '';
            const safeItem = escapeHtml(item);
            didatRows += `
                <tr>
                    <td><strong>${safeItem}</strong></td>
                    <td><select class="evaluation-select" data-type="didat" data-item="${safeItem}">${makeSelect(val)}</select></td>
                    <td><div class="note-cell"><textarea class="note-textarea" data-type="didat" data-item="${safeItem}" rows="2">${escapeHtml(note)}</textarea><button class="delete-note-btn" data-type="didat" data-item="${safeItem}">🗑 Cancella</button></div></td>
                </tr>
            `;
        }

        const formHTML = `
            <div class="form-section">
                <h2>${student ? 'Modifica Allievo' : 'Nuovo Allievo'} - Livello ${course?.level === 2 ? '2 (Avanzato)' : '1 (Base)'}</h2>
                <div class="form-row">
                    <div class="field"><label>Nome *</label><input type="text" id="student-name" value="${escapeHtml(student?.name || '')}"></div>
                    <div class="field"><label>Cognome *</label><input type="text" id="student-surname" value="${escapeHtml(student?.surname || '')}"></div>
                </div>
                <div class="form-row">
                    <div class="field"><label>Indirizzo</label><input type="text" id="student-address" value="${escapeHtml(student?.address || '')}"></div>
                    <div class="field"><label>Data nascita</label><input type="date" id="student-birthdate" value="${student?.birthDate || ''}"></div>
                </div>
                <div class="form-row">
                    <div class="field"><label>Telefono</label><input type="tel" id="student-phone" value="${escapeHtml(student?.phone || '')}"></div>
                    <div class="field"><label>Email</label><input type="email" id="student-email" value="${escapeHtml(student?.email || '')}"></div>
                </div>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="medical-cert" ${student?.medicalCert ? 'checked' : ''}> Certificato medico sportivo</label>
                    <label><input type="checkbox" id="blsd-cert" ${student?.blsdCert ? 'checked' : ''}> Certificato BLSD</label>
                </div>
                <div class="form-row"><div class="field"><label>Altri brevetti</label><textarea id="other-patents" rows="2">${escapeHtml(student?.otherPatents || '')}</textarea></div></div>
                
                <!-- ACCORDION 1: Valutazioni tecniche -->
                <div class="accordion-section" id="accordion-tech">
                    <div class="accordion-header">Valutazioni tecniche</div>
                    <div class="accordion-content"><div style="overflow-x:auto;"><table class="evaluation-table"><tbody>${techRows}</tbody></table></div></div>
                </div>
                
                <!-- ACCORDION 2: Attrezzatura -->
                <div class="accordion-section" id="accordion-attrezzatura">
                    <div class="accordion-header">Attrezzatura</div>
                    <div class="accordion-content">
                        <div class="single-evaluation">
                            <select id="attrezzatura-select" class="evaluation-select" style="width:100%; margin-bottom:12px;">${makeSelect(attrezzatura.score)}</select>
                            <div class="note-cell"><textarea id="attrezzatura-note" rows="2" style="flex:1">${escapeHtml(attrezzatura.note)}</textarea><button id="delete-attrezzatura-note" class="delete-note-btn">🗑 Cancella</button></div>
                        </div>
                    </div>
                </div>
                
                <!-- ACCORDION 3: Valutazioni didattiche -->
                <div class="accordion-section" id="accordion-didat">
                    <div class="accordion-header">Valutazioni didattiche</div>
                    <div class="accordion-content"><div style="overflow-x:auto;"><table class="evaluation-table"><tbody>${didatRows}</tbody></table></div></div>
                </div>
                
                <!-- ACCORDION 4: Capacità psico-attitudinali -->
                <div class="accordion-section" id="accordion-psico">
                    <div class="accordion-header">Capacità psico-attitudinali</div>
                    <div class="accordion-content">
                        <div class="single-evaluation">
                            <select id="psico-select" class="evaluation-select" style="width:100%; margin-bottom:12px;">${makeSelect(psicoAttitudinali.score)}</select>
                            <div class="note-cell"><textarea id="psico-note" rows="2" style="flex:1">${escapeHtml(psicoAttitudinali.note)}</textarea><button id="delete-psico-note" class="delete-note-btn">🗑 Cancella</button></div>
                        </div>
                    </div>
                </div>
                
                <!-- ACCORDION 5: Giudizio finale -->
                <div class="accordion-section" id="accordion-giudizio">
                    <div class="accordion-header">Giudizio finale sintetico</div>
                    <div class="accordion-content">
                        <div class="giudizio-finale">
                            <textarea id="giudizio-finale" rows="3" style="width:100%">${escapeHtml(giudizioFinale)}</textarea>
                        </div>
                    </div>
                </div>
                
                <div style="display:flex; gap:15px; margin-top:20px;">
                    <button id="save-student-btn" class="btn primary">💾 Salva Allievo</button>
                    <button id="cancel-edit-btn" class="btn secondary">Annulla</button>
                </div>
            </div>
        `;
        container.innerHTML = formHTML;

        // Inizializza accordion (uno alla volta)
        const accordions = document.querySelectorAll('.accordion-section');
        accordions.forEach(section => {
            const header = section.querySelector('.accordion-header');
            const content = section.querySelector('.accordion-content');
            header.addEventListener('click', () => {
                const isOpen = content.classList.contains('open');
                accordions.forEach(acc => {
                    acc.querySelector('.accordion-content').classList.remove('open');
                    acc.querySelector('.accordion-header').classList.remove('open');
                });
                if (!isOpen) {
                    content.classList.add('open');
                    header.classList.add('open');
                }
            });
        });

        // Gestione cancellazione note
        document.querySelectorAll('.delete-note-btn[data-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = btn.getAttribute('data-type');
                const item = btn.getAttribute('data-item');
                if (type === 'tech') {
                    const ta = document.querySelector(`.note-textarea[data-type="tech"][data-item="${item}"]`);
                    if (ta) ta.value = '';
                } else if (type === 'didat') {
                    const ta = document.querySelector(`.note-textarea[data-type="didat"][data-item="${item}"]`);
                    if (ta) ta.value = '';
                }
            });
        });
        document.getElementById('delete-attrezzatura-note')?.addEventListener('click', () => {
            document.getElementById('attrezzatura-note').value = '';
        });
        document.getElementById('delete-psico-note')?.addEventListener('click', () => {
            document.getElementById('psico-note').value = '';
        });

        // Salvataggio
        document.getElementById('save-student-btn').addEventListener('click', async () => {
            const name = document.getElementById('student-name').value.trim();
            const surname = document.getElementById('student-surname').value.trim();
            if (!name || !surname) return alert('Nome e cognome obbligatori');
            const address = document.getElementById('student-address').value;
            const birthDate = document.getElementById('student-birthdate').value;
            const phone = document.getElementById('student-phone').value;
            const email = document.getElementById('student-email').value;
            const medicalCert = document.getElementById('medical-cert').checked;
            const blsdCert = document.getElementById('blsd-cert').checked;
            const otherPatents = document.getElementById('other-patents').value;

            const evaluationsData = {};
            for (const item of evaluationItems) {
                const select = document.querySelector(`.evaluation-select[data-type="tech"][data-item="${escapeHtml(item)}"]`);
                const note = document.querySelector(`.note-textarea[data-type="tech"][data-item="${escapeHtml(item)}"]`)?.value || '';
                evaluationsData[item] = { score: select ? select.value : "0", note };
            }

            const didatticheData = {};
            for (const item of didatticheItems) {
                const select = document.querySelector(`.evaluation-select[data-type="didat"][data-item="${escapeHtml(item)}"]`);
                const note = document.querySelector(`.note-textarea[data-type="didat"][data-item="${escapeHtml(item)}"]`)?.value || '';
                didatticheData[item] = { score: select ? select.value : "0", note };
            }

            const attrezzaturaData = {
                score: document.getElementById('attrezzatura-select').value,
                note: document.getElementById('attrezzatura-note').value
            };
            const psicoData = {
                score: document.getElementById('psico-select').value,
                note: document.getElementById('psico-note').value
            };
            const giudizioFinale = document.getElementById('giudizio-finale').value;

            const studentData = {
                name, surname, address, birthDate, phone, email, medicalCert, blsdCert, otherPatents,
                evaluations: evaluationsData,
                didattiche: didatticheData,
                attrezzatura: attrezzaturaData,
                psicoAttitudinali: psicoData,
                giudizioFinale,
                courseId: currentCourseId,
                updatedAt: new Date().toISOString()
            };
            try {
                if (student?.id) await window.updateDoc(window.doc(window.db, "students", student.id), studentData);
                else await window.addDoc(window.collection(window.db, "students"), studentData);
                showMessage('Salvato!', 'success');
                showCourseStudents({ id: currentCourseId, name: currentCourseName });
            } catch (err) { alert('Errore: '+err.message); }
        });
        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            showCourseStudents({ id: currentCourseId, name: currentCourseName });
        });
    }

    async function showAdminView() {
        document.getElementById('courses-view').style.display = 'none';
        document.getElementById('course-students-view').style.display = 'none';
        document.getElementById('student-edit-view').style.display = 'none';
        document.getElementById('admin-view').style.display = 'block';
        const usersSnap = await window.getDocs(window.collection(window.db, "users"));
        const users = [];
        usersSnap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        const container = document.getElementById('users-list');
        container.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `<h3>${escapeHtml(user.email)}</h3><p>Ruolo: <strong>${user.role}</strong></p><div class="actions"><button class="btn small change-role" data-uid="${user.uid}" data-role="${user.role}">${user.role === 'admin' ? 'Retrocedi' : 'Promuovi'}</button></div>`;
            container.appendChild(card);
        });
        document.querySelectorAll('.change-role').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = btn.getAttribute('data-uid');
                const newRole = btn.getAttribute('data-role') === 'admin' ? 'user' : 'admin';
                if (confirm(`Cambiare ruolo?`)) {
                    await window.updateDoc(window.doc(window.db, "users", uid), { role: newRole });
                    showMessage('Ruolo aggiornato', 'success');
                    showAdminView();
                }
            });
        });
    }

    function showCoursesView() {
        document.getElementById('courses-view').style.display = 'block';
        document.getElementById('course-students-view').style.display = 'none';
        document.getElementById('student-edit-view').style.display = 'none';
        document.getElementById('admin-view').style.display = 'none';
    }

    function showMessage(msg, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = msg;
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.zIndex = '1000';
        div.style.padding = '12px 20px';
        div.style.borderRadius = '8px';
        div.style.background = type === 'success' ? '#dcfce7' : '#fee2e2';
        div.style.color = type === 'success' ? '#15803d' : '#b91c1c';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
});
