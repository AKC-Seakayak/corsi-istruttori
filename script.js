// Variabili globali
let currentUser = null;
let currentUserRole = null;
let currentCourseId = null;
let currentCourseName = null;
let coursesList = [];
let allUsersList = []; // per la gestione assegnazioni

// Lista valutazioni (20 item)
const evaluationItems = [
    "Pagaiata in avanti /groenlandese",
    "Pagaiata indietro /groenlandese",
    "Pagaiata in avanti /europea",
    "Pagaiata indietro /europea",
    "Pagaiata circolare 360°",
    "Spostamento laterale a un tempo",
    "Spostamento laterale continuo",
    "Timonata di poppa",
    "Appoggio basso",
    "Trasporto kayak",
    "Imbarco asciutto",
    "Imbarco alla cowboy",
    "Imbarco bilanciere",
    "Sbarco con bilanciere",
    "Sbarco cowboy",
    "Uscita bagnata",
    "Autosalvataggio Cowboy",
    "Autosalvataggio con paddlefloat, Rescue T",
    "Inclinazione dello scafo con equilibrio",
    "Inclinazione dello scafo con perdita di equilibrio"
];

// Inizializzazione
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

    // Modale assegnazioni
    const assignModal = document.getElementById('assign-modal');
    const closeAssignModal = document.querySelector('.close-assign-modal');
    const saveAssignmentsBtn = document.getElementById('save-assignments-btn');
    let currentAssignCourse = null;

    // Stato autenticazione
    window.onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            currentUser = user;
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            userEmailSpan.textContent = user.email;

            // Carica ruolo utente
            const userDoc = await window.getDoc(window.doc(window.db, "users", user.uid));
            if (userDoc.exists()) {
                currentUserRole = userDoc.data().role;
            } else {
                await window.setDoc(window.doc(window.db, "users", user.uid), {
                    email: user.email,
                    role: "user",
                    uid: user.uid
                });
                currentUserRole = "user";
            }

            // Mostra pulsanti admin se necessario
            if (adminBtn) adminBtn.style.display = currentUserRole === 'admin' ? 'inline-block' : 'none';
            if (addCourseBtn) addCourseBtn.style.display = currentUserRole === 'admin' ? 'inline-block' : 'none';

            // Carica corsi (con filtro automatico in base al ruolo)
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

    // Login
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

    // Registrazione
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
            messageDiv.textContent = 'Registrazione riuscita! Ora sei loggato.';
            messageDiv.className = 'message success';
            setTimeout(() => messageDiv.textContent = '', 2000);
        } catch (error) {
            messageDiv.textContent = 'Errore: ' + error.message;
            messageDiv.className = 'message error';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await window.signOut(window.auth);
    });

    // Cambio password (uguale a prima)
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
            msgDiv.textContent = 'La password deve avere almeno 6 caratteri';
            msgDiv.className = 'message error';
            return;
        }
        
        try {
            const user = window.auth.currentUser;
            const credential = window.EmailAuthProvider.credential(user.email, currentPwd);
            await window.reauthenticateWithCredential(user, credential);
            await window.updatePassword(user, newPwd);
            msgDiv.textContent = 'Password cambiata con successo!';
            msgDiv.className = 'message success';
            setTimeout(() => passwordModal.style.display = 'none', 1500);
        } catch (error) {
            msgDiv.textContent = 'Errore: ' + error.message;
            msgDiv.className = 'message error';
        }
    });

    // Creazione corso (solo admin)
    addCourseBtn.addEventListener('click', async () => {
        const courseName = prompt('Nome del corso:');
        if (!courseName) return;
        const description = prompt('Descrizione (opzionale):');
        await window.addDoc(window.collection(window.db, "courses"), {
            name: courseName,
            description: description || '',
            createdAt: new Date().toISOString(),
            createdBy: currentUser.uid,
            assignedUserIds: []   // inizialmente nessun utente assegnato
        });
        await loadCourses();
        showMessage('Corso creato', 'success');
    });

    backToCoursesBtn.addEventListener('click', () => {
        showCoursesView();
        loadCourses();
    });

    addStudentToCourseBtn.addEventListener('click', () => {
        if (!currentCourseId) {
            alert('Nessun corso selezionato');
            return;
        }
        showStudentEditView(null);
    });

    backToStudentsBtn.addEventListener('click', () => {
        if (currentCourseId) {
            showCourseStudents({ id: currentCourseId, name: currentCourseName });
        } else {
            showCoursesView();
        }
    });

    // Admin: gestione utenti (ruoli)
    adminBtn.addEventListener('click', showAdminView);
    backFromAdminBtn.addEventListener('click', () => {
        showCoursesView();
        loadCourses();
    });

    // Gestione modale assegnazioni
    closeAssignModal.addEventListener('click', () => {
        assignModal.style.display = 'none';
    });

    saveAssignmentsBtn.addEventListener('click', async () => {
        if (!currentAssignCourse) return;
        const checkboxes = document.querySelectorAll('#assign-users-list input[type="checkbox"]');
        const selectedUserIds = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        try {
            await window.updateDoc(window.doc(window.db, "courses", currentAssignCourse.id), {
                assignedUserIds: selectedUserIds
            });
            document.getElementById('assign-message').textContent = 'Assegnazioni salvate!';
            document.getElementById('assign-message').className = 'message success';
            setTimeout(() => {
                assignModal.style.display = 'none';
                loadCourses(); // ricarica i corsi
            }, 1000);
        } catch (error) {
            document.getElementById('assign-message').textContent = 'Errore: ' + error.message;
            document.getElementById('assign-message').className = 'message error';
        }
    });

    // ------------------- FUNZIONI PRINCIPALI -------------------

    async function loadCourses() {
        try {
            const querySnapshot = await window.getDocs(window.collection(window.db, "courses"));
            coursesList = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Filtro lato client (per sicurezza, le regole già filtrano)
                if (currentUserRole === 'admin' || (data.assignedUserIds && data.assignedUserIds.includes(currentUser.uid))) {
                    coursesList.push({ id: doc.id, ...data });
                }
            });
            renderCoursesList();
        } catch (error) {
            console.error(error);
            showMessage('Errore caricamento corsi', 'error');
        }
    }

    function renderCoursesList() {
        const grid = document.getElementById('courses-grid');
        if (!grid) return;
        if (coursesList.length === 0) {
            grid.innerHTML = '<div class="card">Nessun corso disponibile.</div>';
            return;
        }
        grid.innerHTML = '';
        coursesList.forEach(course => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `
                <h3>📘 ${escapeHtml(course.name)}</h3>
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

        // Apri corso
        document.querySelectorAll('.view-course').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                const course = coursesList.find(c => c.id === id);
                if (course) showCourseStudents(course);
            });
        });

        if (currentUserRole === 'admin') {
            // Assegna utenti
            document.querySelectorAll('.assign-users').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.getAttribute('data-id');
                    const name = btn.getAttribute('data-name');
                    const course = coursesList.find(c => c.id === id);
                    if (course) await showAssignUsersModal(course);
                });
            });
            // Elimina corso
            document.querySelectorAll('.delete-course').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('Eliminare il corso? Tutti gli allievi associati verranno eliminati.')) {
                        const studentsSnap = await window.getDocs(window.collection(window.db, "students"));
                        const toDelete = [];
                        studentsSnap.forEach(doc => {
                            if (doc.data().courseId === id) toDelete.push(doc.id);
                        });
                        for (const studentId of toDelete) {
                            await window.deleteDoc(window.doc(window.db, "students", studentId));
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
        // Carica tutti gli utenti
        const usersSnap = await window.getDocs(window.collection(window.db, "users"));
        allUsersList = [];
        usersSnap.forEach(doc => allUsersList.push({ id: doc.id, ...doc.data() }));
        
        const container = document.getElementById('assign-users-list');
        container.innerHTML = '';
        allUsersList.forEach(user => {
            const isChecked = course.assignedUserIds && course.assignedUserIds.includes(user.uid);
            const div = document.createElement('div');
            div.style.margin = '8px 0';
            div.innerHTML = `
                <label>
                    <input type="checkbox" value="${user.uid}" ${isChecked ? 'checked' : ''}>
                    ${escapeHtml(user.email)} (${user.role})
                </label>
            `;
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
        
        document.getElementById('course-title').innerHTML = `📘 ${escapeHtml(course.name)}`;
        
        const studentsSnap = await window.getDocs(window.collection(window.db, "students"));
        const courseStudents = [];
        studentsSnap.forEach(doc => {
            const data = doc.data();
            if (data.courseId === course.id) {
                courseStudents.push({ id: doc.id, ...data });
            }
        });
        renderCourseStudents(courseStudents);
    }

    function renderCourseStudents(students) {
        const grid = document.getElementById('students-by-course-grid');
        if (!grid) return;
        if (students.length === 0) {
            grid.innerHTML = '<div class="card">Nessun allievo in questo corso. Clicca su "+ Nuovo Allievo" per aggiungerne uno.</div>';
            return;
        }
        grid.innerHTML = '';
        students.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `
                <h3>${escapeHtml(student.name || '')} ${escapeHtml(student.surname || '')}</h3>
                <p><strong>Nato:</strong> ${student.birthDate || '-'}</p>
                <p><strong>Medico:</strong> ${student.medicalCert ? '✅ Sì' : '❌ No'} | <strong>BLSD:</strong> ${student.blsdCert ? '✅ Sì' : '❌ No'}</p>
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
                if (confirm('Eliminare questo allievo?')) {
                    await window.deleteDoc(window.doc(window.db, "students", id));
                    showMessage('Allievo eliminato', 'success');
                    showCourseStudents({ id: currentCourseId, name: currentCourseName });
                }
            });
        });
    }

    async function showStudentEditView(student) {
        document.getElementById('courses-view').style.display = 'none';
        document.getElementById('course-students-view').style.display = 'none';
        document.getElementById('student-edit-view').style.display = 'block';
        document.getElementById('admin-view').style.display = 'none';
        
        const container = document.getElementById('student-form-container');
        
        let evaluations = {};
        if (student && student.evaluations) {
            evaluations = student.evaluations;
        } else {
            evaluationItems.forEach(item => {
                evaluations[item] = { score: null, note: '' };
            });
        }
        
        const formHTML = `
            <div class="form-section">
                <h2>${student ? 'Modifica Allievo' : 'Nuovo Allievo'}</h2>
                <div class="form-row">
                    <div class="field"><label>Nome *</label><input type="text" id="student-name" value="${escapeHtml(student?.name || '')}" placeholder="Nome"></div>
                    <div class="field"><label>Cognome *</label><input type="text" id="student-surname" value="${escapeHtml(student?.surname || '')}" placeholder="Cognome"></div>
                </div>
                <div class="form-row">
                    <div class="field"><label>Indirizzo</label><input type="text" id="student-address" value="${escapeHtml(student?.address || '')}" placeholder="Via, città, cap"></div>
                    <div class="field"><label>Data di nascita</label><input type="date" id="student-birthdate" value="${student?.birthDate || ''}"></div>
                </div>
                <div class="form-row checkbox-group">
                    <label><input type="checkbox" id="medical-cert" ${student?.medicalCert ? 'checked' : ''}> Certificato medico sportivo</label>
                    <label><input type="checkbox" id="blsd-cert" ${student?.blsdCert ? 'checked' : ''}> Certificato BLSD</label>
                </div>
                <div class="form-row">
                    <div class="field"><label>Altri brevetti sportivi</label><textarea id="other-patents" rows="2" placeholder="Inserisci altri brevetti">${escapeHtml(student?.otherPatents || '')}</textarea></div>
                </div>
                
                <h3>Valutazioni tecniche</h3>
                <div style="overflow-x: auto;">
                    <table class="evaluation-table" id="evaluation-table">
                        <thead>
                            <tr><th>Abilità</th><th>Punteggio (1-10)</th><th>Note (editabile/cancellabile)</th></tr>
                        </thead>
                        <tbody>
                            ${evaluationItems.map(item => `
                                <tr>
                                    <td data-label="Abilità"><strong>${escapeHtml(item)}</strong></td>
                                    <td data-label="Punteggio">
                                        <input type="number" min="1" max="10" step="1" class="score-input" data-item="${escapeHtml(item)}" value="${evaluations[item]?.score || ''}">
                                    </td>
                                    <td data-label="Note">
                                        <div class="note-cell">
                                            <textarea class="note-textarea" data-item="${escapeHtml(item)}" rows="2" placeholder="Note ...">${escapeHtml(evaluations[item]?.note || '')}</textarea>
                                            <button class="delete-note-btn" data-item="${escapeHtml(item)}">🗑 Cancella</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="display: flex; gap: 15px; margin-top: 20px;">
                    <button id="save-student-btn" class="btn primary">💾 Salva Allievo</button>
                    <button id="cancel-edit-btn" class="btn secondary">Annulla</button>
                </div>
            </div>
        `;
        
        container.innerHTML = formHTML;
        
        document.querySelectorAll('.delete-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = btn.getAttribute('data-item');
                const textarea = document.querySelector(`.note-textarea[data-item="${item}"]`);
                if (textarea) textarea.value = '';
            });
        });
        
        document.getElementById('save-student-btn').addEventListener('click', async () => {
            const name = document.getElementById('student-name').value.trim();
            const surname = document.getElementById('student-surname').value.trim();
            if (!name || !surname) {
                alert('Nome e cognome sono obbligatori');
                return;
            }
            const address = document.getElementById('student-address').value;
            const birthDate = document.getElementById('student-birthdate').value;
            const medicalCert = document.getElementById('medical-cert').checked;
            const blsdCert = document.getElementById('blsd-cert').checked;
            const otherPatents = document.getElementById('other-patents').value;
            
            const evaluationsData = {};
            evaluationItems.forEach(item => {
                const scoreInput = document.querySelector(`.score-input[data-item="${item}"]`);
                const noteTextarea = document.querySelector(`.note-textarea[data-item="${item}"]`);
                let score = scoreInput ? parseInt(scoreInput.value) : null;
                if (score && (score < 1 || score > 10)) score = null;
                evaluationsData[item] = {
                    score: score || null,
                    note: noteTextarea ? noteTextarea.value : ''
                };
            });
            
            const studentData = {
                name, surname, address, birthDate, medicalCert, blsdCert, otherPatents,
                evaluations: evaluationsData,
                courseId: currentCourseId,
                updatedAt: new Date().toISOString()
            };
            
            try {
                if (student && student.id) {
                    await window.updateDoc(window.doc(window.db, "students", student.id), studentData);
                    showMessage('Allievo aggiornato', 'success');
                } else {
                    await window.addDoc(window.collection(window.db, "students"), studentData);
                    showMessage('Allievo creato', 'success');
                }
                showCourseStudents({ id: currentCourseId, name: currentCourseName });
            } catch (error) {
                console.error(error);
                alert('Errore: ' + error.message);
            }
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
        
        const usersSnapshot = await window.getDocs(window.collection(window.db, "users"));
        const users = [];
        usersSnapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        
        const container = document.getElementById('users-list');
        container.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `
                <h3>${escapeHtml(user.email)}</h3>
                <p>Ruolo: <strong>${user.role}</strong></p>
                <p>UID: ${user.uid.substring(0,8)}...</p>
                <div class="actions">
                    <button class="btn small change-role" data-uid="${user.uid}" data-role="${user.role}">
                        ${user.role === 'admin' ? '🔻 Retrocedi a User' : '⭐ Promuovi ad Admin'}
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
        
        document.querySelectorAll('.change-role').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = btn.getAttribute('data-uid');
                const currentRole = btn.getAttribute('data-role');
                const newRole = currentRole === 'admin' ? 'user' : 'admin';
                if (confirm(`Cambiare il ruolo di ${uid} in ${newRole}?`)) {
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
        const tempDiv = document.createElement('div');
        tempDiv.className = `message ${type}`;
        tempDiv.textContent = msg;
        tempDiv.style.position = 'fixed';
        tempDiv.style.bottom = '20px';
        tempDiv.style.right = '20px';
        tempDiv.style.zIndex = '1000';
        tempDiv.style.padding = '12px 20px';
        tempDiv.style.borderRadius = '8px';
        tempDiv.style.backgroundColor = type === 'success' ? '#dcfce7' : '#fee2e2';
        tempDiv.style.color = type === 'success' ? '#15803d' : '#b91c1c';
        document.body.appendChild(tempDiv);
        setTimeout(() => tempDiv.remove(), 3000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
});
