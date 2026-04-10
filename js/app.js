/**
 * SaaS Schedule Creator - App Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    const STORAGE_KEY = 'saas_schedulizer_events';
    let events = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    // Migrate old events to have new properties if missing
    events = events.map(e => ({
        ...e,
        completed: e.completed || false,
        focusMins: e.focusMins || 0
    }));

    // Make events global for analytics and export
    window._events = events;

    let tempSubtasks = [];

    // Set init pomodoro placeholder
    const initSetting = JSON.parse(localStorage.getItem('saas_schedulizer_settings'));
    const pLen = initSetting ? (initSetting.pomoLength || 25) : 25;
    const estInput = document.getElementById('event-est');
    if (estInput) estInput.placeholder = pLen;

    // --- Theme Toggling ---
    const themeBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    if (themeBtn) {
        // Initial state logic: default to Light if no preference
        const savedTheme = localStorage.getItem('saas_theme') || 'light';
        htmlEl.setAttribute('data-theme', savedTheme);
        themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';

        themeBtn.addEventListener('click', () => {
            if (htmlEl.getAttribute('data-theme') === 'dark') {
                htmlEl.setAttribute('data-theme', 'light');
                localStorage.setItem('saas_theme', 'light');
                themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                htmlEl.setAttribute('data-theme', 'dark');
                localStorage.setItem('saas_theme', 'dark');
                themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
            }
        });
    }

    // --- Mobile Drawer Logic ---
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const openBtn = document.getElementById('mobile-nav-toggle');
    const closeBtn = document.getElementById('btn-close-drawer');

    function toggleDrawer(isOpen) {
        if (isOpen) {
            drawer.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (openBtn) openBtn.addEventListener('click', () => toggleDrawer(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleDrawer(false));
    if (overlay) overlay.addEventListener('click', () => toggleDrawer(false));

    // --- Background Switcher Logic ---
    const bgSelect = document.getElementById('bg-style-select');
    const bgSelectMobile = document.getElementById('bg-style-select-mobile');

    function updateBackground(selected) {
        const bgClass = `bg-${selected}`;
        document.body.className = `bg-base ${bgClass}`;
        localStorage.setItem('saas_aurora_bg', bgClass);
        if (bgSelect) bgSelect.value = selected;
        if (bgSelectMobile) bgSelectMobile.value = selected;
    }

    if (bgSelect) {
        bgSelect.addEventListener('change', (e) => updateBackground(e.target.value));
    }
    if (bgSelectMobile) {
        bgSelectMobile.addEventListener('change', (e) => updateBackground(e.target.value));
    }

    // Load saved BG on boot
    const savedBg = localStorage.getItem('saas_aurora_bg') || 'bg-calm';
    updateBackground(savedBg.replace('bg-', ''));



    // --- Core SPA Routing ---
    const navItems = document.querySelectorAll('.app-nav .nav-item');
    const sections = document.querySelectorAll('.app-section');

    function navigateTo(targetId, fromHomeBtn = false) {
        const hero = document.getElementById('home-hero');
        const sections = document.querySelectorAll('.app-section');
        const navItems = document.querySelectorAll('.app-nav .nav-item, .drawer-nav-item');


        sections.forEach(sec => sec.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        // Toggle Hero visibility: only visible on 'Home' or when explicitly viewing calendar from landing
        if (targetId === 'section-calendar' && fromHomeBtn) {
            if (hero) hero.classList.remove('hidden');
        } else if (targetId !== 'section-calendar') {
            if (hero) hero.classList.add('hidden');
        } else {
            // When going to "Calendar Hub", we might want to hide the landing hero for focus
            if (hero) hero.classList.add('hidden');
        }

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.target === targetId) {
                // If it's the home button, check if we're actually on home
                if (item.id === 'nav-home-btn' && fromHomeBtn) item.classList.add('active');
                else if (item.id !== 'nav-home-btn' && !fromHomeBtn) item.classList.add('active');
            }
        });

        // Trigger updates if specific sections are opened
        if (targetId === 'section-analytics' && window.updateAnalytics) {
            window.updateAnalytics();
        }

        // Home screen date/grid update
        if (hero && !hero.classList.contains('hidden')) {
            renderHomePreview();
        }
    }

    const allNavButtons = document.querySelectorAll('.app-nav .nav-item, .drawer-nav-item');
    allNavButtons.forEach(item => {
        item.addEventListener('click', () => {
            const isHome = item.id === 'nav-home-btn';
            navigateTo(item.dataset.target, isHome);

            // Close mobile drawer if active
            toggleDrawer(false);


            // On mobile, close sidebar (simulate by scrolling up)
            if (window.innerWidth < 768 || isHome) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            // Update page title
            const titleEl = document.getElementById('page-title');
            if (titleEl) {
                if (item.dataset.target === 'section-calendar') titleEl.textContent = isHome ? 'Home' : 'Dashboard';
                if (item.dataset.target === 'section-analytics') titleEl.textContent = 'Analytics';
                if (item.dataset.target === 'section-settings') titleEl.textContent = 'Settings';
            }
        });
    });


    // --- Toast & Notifications ---
    window.showToast = function (title, message, iconStr = 'fa-bell', colorClass = 'bg-primary') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerHTML = `
            <div class="toast-icon ${colorClass} text-white">
                <i class="fas ${iconStr}"></i>
            </div>
            <div class="toast-content flex-1">
                <h4>${title}</h4>
                <p>${message}</p>
                <button class="toast-btn" onclick="stopRingtone()">
                    <i class="fas fa-volume-mute"></i> Stop Audio
                </button>
            </div>
            <button class="toast-close btn" onclick="this.parentElement.remove(); stopRingtone();">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        playRingtone();
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 15000);
    };

    // --- Audio Sync Engine ---
    const ringtone = document.getElementById('reminder-ringtone');
    const syncBtn = document.getElementById('btn-sync-audio');
    let audioUnlocked = false;

    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            if (ringtone) {
                ringtone.play().then(() => {
                    ringtone.pause();
                    ringtone.currentTime = 0;
                    audioUnlocked = true;
                    window.showToast('Audio Linked', 'Alerts are armed for this session.', 'fa-link', 'bg-emerald');
                    if (Notification.permission !== 'granted') Notification.requestPermission();
                    syncBtn.textContent = 'LINKED';
                    syncBtn.classList.add('bg-emerald');
                    syncBtn.style.color = 'white';
                }).catch(e => console.error("Audio block:", e));
            }
        });
    }

    function playRingtone() {
        if (ringtone && audioUnlocked) ringtone.play().catch(() => { });
    }

    window.stopRingtone = function () {
        if (ringtone) {
            ringtone.pause();
            ringtone.currentTime = 0;
        }
    };

    setInterval(() => {
        const _now = new Date();
        let updated = false;

        events.forEach(ev => {
            if (!ev.notified && !ev.completed && ev.start && ev.start !== "All Day") {
                const evDate = new Date(`${ev.date}T${ev.start}:00`);
                if (!isNaN(evDate)) {
                    const diffMins = Math.floor((evDate - _now) / 60000);
                    const target = parseInt(ev.reminder) || 10;

                    if (diffMins >= 0 && diffMins <= target) {
                        window.showToast(`Upcoming: ${ev.title}`, `Starts in ${diffMins} minutes.`, 'fa-clock', 'bg-rose');
                        ev.notified = true;
                        updated = true;
                        if (Notification.permission === 'granted') {
                            new Notification(`Schedulizer: ${ev.title}`, { body: `Starts in ${diffMins} mins.` });
                        }
                    }
                }
            }
        });
        if (updated) saveEvents();
    }, 60000);

    function saveEvents() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
        window._events = events;
        if (window.updateAnalytics) window.updateAnalytics();
    }

    // Export globally for settings module
    window.saveEvents = saveEvents;

    // --- Authentication ---
    const authBtn = document.getElementById('auth-btn-header');
    const authStatus = document.getElementById('auth-status-text');
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');

    function updateAuthUI() {
        const user = localStorage.getItem('saas_user');
        if (user && authStatus) {
            authStatus.textContent = `Hi, ${user}`;
            authStatus.classList.add('text-primary');
        } else if (authStatus) {
            authStatus.textContent = 'Sign In';
            authStatus.classList.remove('text-primary');
        }
    }
    updateAuthUI();

    if (authBtn) {
        authBtn.addEventListener('click', () => {
            const user = localStorage.getItem('saas_user');
            if (user) {
                if (confirm(`Log out of ${user}'s workspace?`)) {
                    localStorage.removeItem('saas_user');
                    updateAuthUI();
                }
            } else {
                authModal.classList.remove('hidden');
                setTimeout(() => authModal.classList.add('show'), 10);
            }
        });
    }

    if (document.getElementById('auth-modal-close')) {
        document.getElementById('auth-modal-close').addEventListener('click', () => {
            authModal.classList.remove('show');
            setTimeout(() => authModal.classList.add('hidden'), 300);
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('auth-name').value;
            localStorage.setItem('saas_user', name);
            updateAuthUI();
            authModal.classList.remove('show');
            setTimeout(() => authModal.classList.add('hidden'), 300);
            window.showToast('Workspace Ready', `Welcome, ${name}! Your configurations are locked in.`, 'fa-rocket', 'bg-purple');
        });
    }

    // --- Mobile Nav Toggle ---
    const mobileToggle = document.getElementById('mobile-nav-toggle');
    const headerNav = document.querySelector('.header-app-nav');

    if (mobileToggle && headerNav) {
        mobileToggle.addEventListener('click', () => {
            headerNav.classList.toggle('show');
            mobileToggle.querySelector('i').classList.toggle('fa-bars');
            mobileToggle.querySelector('i').classList.toggle('fa-times');
        });

        // Close nav when clicking a link
        headerNav.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                headerNav.classList.remove('show');
                mobileToggle.querySelector('i').classList.add('fa-bars');
                mobileToggle.querySelector('i').classList.remove('fa-times');
            });
        });
    }

    // --- Add Task Modal Logic ---
    const createTaskModal = document.getElementById('create-task-modal');
    const btnOpenAdd = document.getElementById('btn-open-add-task');
    const fabAdd = document.getElementById('fab-add-task');
    const btnCloseAdd = document.getElementById('btn-close-create-task');

    function openAddTaskModal(prefillDate = null) {
        if (createTaskModal) {
            createTaskModal.classList.add('show');
            if (prefillDate) {
                document.getElementById('event-date').value = prefillDate;
            } else {
                document.getElementById('event-date').valueAsDate = new Date();
            }
            document.getElementById('event-title').focus();
        }
    }
    window.openAddTaskModal = openAddTaskModal; // Export for grid clicks

    function closeAddTaskModal() {
        if (createTaskModal) {
            createTaskModal.classList.remove('show');
            form.reset();
            editingEventId = null;
            btnSubmit.innerHTML = 'Add to Calendar';
            btnCancel.classList.add('hidden');
        }
    }

    if (btnOpenAdd) btnOpenAdd.addEventListener('click', () => openAddTaskModal());
    if (fabAdd) fabAdd.addEventListener('click', () => openAddTaskModal());
    if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddTaskModal);

    const btnHomeAdd = document.getElementById('btn-home-add-task');
    if (btnHomeAdd) btnHomeAdd.addEventListener('click', () => openAddTaskModal());

    // Close on outside click
    if (createTaskModal) {
        createTaskModal.addEventListener('click', (e) => {
            if (e.target === createTaskModal) closeAddTaskModal();
        });
    }

    // --- Home Screen & Sidebar Logic ---
    function renderHomePreview() {
        const homeDateEl = document.getElementById('home-today-date');
        const homeGrid = document.getElementById('home-calendar-grid');
        const sideDateEl = document.getElementById('sidebar-today-date');
        const sideGrid = document.getElementById('sidebar-today-list');

        const _today = new Date();
        const dateStrLong = _today.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

        if (homeDateEl) homeDateEl.textContent = dateStrLong;
        if (sideDateEl) sideDateEl.textContent = dateStrLong;

        const dStr = `${_today.getFullYear()}-${String(_today.getMonth() + 1).padStart(2, '0')}-${String(_today.getDate()).padStart(2, '0')}`;
        let todaysEvts = events.filter(e => e.date === dStr);
        todaysEvts.sort((a, b) => (a.start === "All Day" ? "00:00" : a.start).localeCompare(b.start === "All Day" ? "00:00" : b.start));

        const populate = (container) => {
            if (!container) return;
            container.innerHTML = '';
            if (todaysEvts.length === 0) {
                container.innerHTML = `<div class="empty-state-small"><i class="fas fa-calendar-check"></i><p>Clear day!</p></div>`;
                return;
            }
            todaysEvts.forEach(ev => {
                const item = document.createElement('div');
                item.className = `home-preview-item ${ev.color} ${ev.completed ? 'completed' : ''}`;
                item.innerHTML = `
                    <div class="p-time">${ev.start === "All Day" ? "All Day" : formatTime(ev.start)}</div>
                    <div class="p-title">${ev.title}</div>
                `;
                item.onclick = () => openTaskModal(ev);
                container.appendChild(item);
            });
        };

        populate(homeGrid);
        populate(sideGrid);
    }


    // Call after save and initial load
    renderHomePreview();


    // --- Calendar Main Logic ---
    const now = new Date();
    let currentView = 'monthly';
    let currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    let editingEventId = null;

    const monthPicker = document.getElementById('calendar-month-picker');
    if (monthPicker) monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (document.getElementById('event-date')) document.getElementById('event-date').valueAsDate = now;

    const viewTabs = document.querySelectorAll('.view-tab');
    viewTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            viewTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentView = tab.getAttribute('data-view');
            renderCalendar();
        });
    });

    monthPicker.addEventListener('change', (e) => {
        const [y, m] = e.target.value.split('-');
        if (y && m) {
            currentDate = new Date(parseInt(y), parseInt(m) - 1, 1);
            renderCalendar();
        }
    });

    let selectedColor = 'bg-slate';
    document.querySelectorAll('.color-choice').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.color-choice').forEach(c => c.classList.remove('selected'));
            b.classList.add('selected');
            selectedColor = b.getAttribute('data-color');
        });
    });

    const btnSubmit = document.getElementById('btn-submit-event');
    const btnCancel = document.getElementById('btn-cancel-edit');
    const form = document.getElementById('event-form');

    // Subtask Logic for Entry
    const subtaskInp = document.getElementById('event-subtask-input');
    const bAddSub = document.getElementById('btn-add-subtask');
    const subList = document.getElementById('event-subtasks-list');

    function renderTempSubtasks() {
        subList.innerHTML = '';
        tempSubtasks.forEach((s, i) => {
            const div = document.createElement('div');
            div.className = 'subtask-item';
            div.innerHTML = `
                <span>${s.text}</span>
                <button type="button" class="btn-remove-subtask" onclick="removeTempSubtask(${i})"><i class="fas fa-trash"></i></button>
            `;
            subList.appendChild(div);
        });
    }

    window.removeTempSubtask = (idx) => {
        tempSubtasks.splice(idx, 1);
        renderTempSubtasks();
    };

    bAddSub.addEventListener('click', () => {
        const val = subtaskInp.value.trim();
        if (val) {
            tempSubtasks.push({ text: val, done: false });
            subtaskInp.value = '';
            renderTempSubtasks();
        }
    });

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            editingEventId = null;
            btnSubmit.innerHTML = 'Add to Calendar';
            btnCancel.classList.add('hidden');
            document.getElementById('event-recurring').disabled = false;
            form.reset();
            document.getElementById('event-date').valueAsDate = new Date();
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const base = {
            title: document.getElementById('event-title').value,
            date: document.getElementById('event-date').value,
            start: document.getElementById('event-start').value || "All Day",
            end: document.getElementById('event-end').value || "",
            priority: document.getElementById('event-priority').value,
            reminder: document.getElementById('event-reminder').value,
            estTime: parseInt(document.getElementById('event-est').value) || (JSON.parse(localStorage.getItem('saas_schedulizer_settings'))?.pomoLength || 25),
            details: document.getElementById('event-details').value,
            color: selectedColor,
            notified: false,
            completed: false, // newly added tasks are not complete
            focusMins: 0,
            subtasks: [...tempSubtasks]
        };

        if (editingEventId) {
            const idx = events.findIndex(x => x.id === editingEventId);
            if (idx > -1) {
                base.completed = events[idx].completed; // preserve completion status
                base.focusMins = events[idx].focusMins;
                events[idx] = { ...events[idx], ...base };
            }
            editingEventId = null;
            btnSubmit.innerHTML = 'Add to Calendar';
            btnCancel.classList.add('hidden');
            document.getElementById('event-recurring').disabled = false;
            window.showToast('Event Linked', 'Task successfully updated in workspace.', 'fa-check', 'bg-emerald');
        } else {
            // --- Recurrence Handling ---
            const recPattern = document.getElementById('event-recurring').value; // 'none', 'daily', 'weekly', 'monthly', 'yearly', 'biweekly', 'custom'
            let generatedEvents = [];
            const baseDate = new Date(base.date + 'T12:00:00');
            // Helper to format date string
            const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            if (recPattern === 'none' || recPattern === 'daily' || recPattern === 'weekly' || recPattern === 'monthly') {
                // Existing simple patterns
                let occ = recPattern === 'daily' ? 30 : (recPattern === 'weekly' ? 12 : (recPattern === 'monthly' ? 12 : 1));
                for (let i = 0; i < occ; i++) {
                    let d = new Date(baseDate);
                    if (recPattern === 'daily') d.setDate(d.getDate() + i);
                    if (recPattern === 'weekly') d.setDate(d.getDate() + (i * 7));
                    if (recPattern === 'monthly') d.setMonth(d.getMonth() + i);
                    generatedEvents.push({ ...base, id: Date.now() + '-' + i, date: fmtDate(d) });
                }
            } else if (recPattern === 'yearly') {
                const years = parseInt(document.getElementById('recurrence-count').value) || 5;
                for (let i = 0; i < years; i++) {
                    let d = new Date(baseDate);
                    d.setFullYear(d.getFullYear() + i);
                    generatedEvents.push({ ...base, id: Date.now() + '-y' + i, date: fmtDate(d) });
                }
            } else if (recPattern === 'biweekly') {
                const occ = parseInt(document.getElementById('recurrence-count').value) || 10;
                for (let i = 0; i < occ; i++) {
                    let d = new Date(baseDate);
                    d.setDate(d.getDate() + (i * 14));
                    generatedEvents.push({ ...base, id: Date.now() + '-b' + i, date: fmtDate(d) });
                }
            } else if (recPattern === 'custom') {
                const interval = parseInt(document.getElementById('recurrence-interval').value) || 1; // days
                const occ = parseInt(document.getElementById('recurrence-count').value) || 5;
                for (let i = 0; i < occ; i++) {
                    let d = new Date(baseDate);
                    d.setDate(d.getDate() + (i * interval));
                    generatedEvents.push({ ...base, id: Date.now() + '-c' + i, date: fmtDate(d) });
                }
            }

            // Conflict detection before adding
            const conflicts = [];
            generatedEvents.forEach(ev => {
                const clash = events.find(e => e.date === ev.date && e.start === ev.start && e.title === ev.title);
                if (clash) conflicts.push(ev);
            });
            if (conflicts.length > 0) {
                // Show conflict toast (existing toast function)
                window.showToast('Conflict Detected', `${conflicts.length} events overlap with existing ones. Overwrite?`, 'fa-exclamation-triangle', 'bg-rose');
                // For simplicity, we skip adding conflicted events. Users can edit manually.
                generatedEvents = generatedEvents.filter(ev => !conflicts.includes(ev));
            }

            // Add generated events to the main list
            events = events.concat(generatedEvents);
            window.showToast('Deployed', `Added ${generatedEvents.length} events to the planner.`, 'fa-layer-group', 'bg-primary');
            window.showToast('Deployed', `Added ${occ} events to the planner.`, 'fa-layer-group', 'bg-primary');
        }

        saveEvents();
        form.reset();
        tempSubtasks = [];
        renderTempSubtasks();
        document.getElementById('event-date').valueAsDate = new Date();
        closeAddTaskModal(); // Close modal after submission
        renderCalendar();
        renderHomePreview();
    });



    document.getElementById('btn-clear-all').addEventListener('click', () => {
        if (confirm("Purge entire workspace schedule?")) {
            events = [];
            saveEvents();
            renderCalendar();
            window.showToast('Purged', 'Entire calendar and analytics data cleared.', 'fa-trash-alt', 'bg-rose');
        }
    });

    // --- Render Logic ---
    const calContainer = document.getElementById('calendar-grid-container');
    const calTitle = document.getElementById('calendar-title');

    function formatTime(str) {
        if (!str || str === "All Day") return "";
        let [h, m] = str.split(':');
        h = parseInt(h);
        const ampm = h >= 12 ? 'pm' : 'am';
        h = h % 12 || 12;
        return `${h}:${m}${ampm}`;
    }

    window.globalRenderCalendar = renderCalendar; // export to attach refresh across modules

    function renderCalendar() {
        calContainer.innerHTML = '';
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const mName = currentDate.toLocaleString('default', { month: 'long' });

        if (currentView === 'monthly') {
            calTitle.textContent = `${mName} ${y}`;
            renderMonthly(y, m);
        } else if (currentView === 'weekly') {
            calTitle.textContent = `Week View: ${mName} ${y}`;
            renderWeekly(y, m);
        } else {
            const tDate = new Date(document.getElementById('event-date').value || now);
            calTitle.textContent = tDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            renderDaily(tDate);
        }

        window._currentView = currentView;
        window._currentDate = currentDate;
    }

    function renderMonthly(year, month) {
        const dInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const grid = document.createElement('div');
        grid.className = 'cal-grid-month';

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(d => {
            const th = document.createElement('div');
            th.className = 'cal-header-cell';
            th.textContent = d;
            grid.appendChild(th);
        });

        for (let i = 0; i < firstDay; i++) {
            grid.appendChild(createEmptyCell());
        }

        for (let d = 1; d <= dInMonth; d++) {
            const cell = document.createElement('div');
            cell.className = 'cal-day-cell text-sm';

            const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
            cell.innerHTML = `
                <div class="day-number ${isToday ? 'today' : ''}">${d}</div>
                <div class="events-list"></div>
            `;

            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            cell.onclick = (e) => {
                if (e.target === cell || e.target.classList.contains('day-number') || e.target.classList.contains('events-list')) {
                    openAddTaskModal(dStr);
                }
            };

            const eList = cell.querySelector('.events-list');
            let dayEvths = events.filter(e => e.date === dStr);
            dayEvths.sort((a, b) => (a.start === "All Day" ? "00:00" : a.start).localeCompare(b.start === "All Day" ? "00:00" : b.start));

            dayEvths.forEach(ev => {
                const pl = document.createElement('div');
                pl.className = `event-pill ${ev.color} ${ev.completed ? 'task-completed-pill' : ''}`;
                const tStr = formatTime(ev.start);
                pl.innerHTML = tStr ? `<span class="e-time">${tStr}</span>${ev.title}` : ev.title;
                pl.onclick = (e) => {
                    e.stopPropagation();
                    openTaskModal(ev);
                };
                eList.appendChild(pl);
            });
            grid.appendChild(cell);
        }

        const rem = (firstDay + dInMonth) % 7;
        if (rem > 0) {
            for (let i = 0; i < (7 - rem); i++) {
                grid.appendChild(createEmptyCell());
            }
        }
        calContainer.appendChild(grid);
    }

    function createEmptyCell() {
        const bl = document.createElement('div');
        bl.className = 'cal-day-cell dimmed';
        return bl;
    }

    function renderWeekly(year, month) {

        let scTime = new Date(year, month, 1);
        const day = scTime.getDay();
        const diff = scTime.getDate() - day + (day === 0 ? -6 : 1);
        scTime = new Date(scTime.setDate(diff));

        const grid = document.createElement('div');
        grid.className = 'cal-grid-week';

        for (let i = 0; i < 7; i++) {
            let curD = new Date(scTime);
            curD.setDate(scTime.getDate() + i);
            const dStr = `${curD.getFullYear()}-${String(curD.getMonth() + 1).padStart(2, '0')}-${String(curD.getDate()).padStart(2, '0')}`;
            const isToday = curD.toDateString() === now.toDateString();

            const col = document.createElement('div');
            col.className = 'week-col';
            col.innerHTML = `
                <div class="week-header ${isToday ? 'today' : ''}">
                    <div class="week-day">${curD.toLocaleString('default', { weekday: 'short' })}</div>
                    <div class="week-date">${curD.getDate()}</div>
                </div>
                <div class="week-events"></div>
            `;

            col.onclick = (e) => {
                if (e.target.closest('.week-event')) return;
                openAddTaskModal(dStr);
            };


            const weList = col.querySelector('.week-events');
            let weEvts = events.filter(e => e.date === dStr);
            weEvts.sort((a, b) => (a.start === "All Day" ? "00:00" : a.start).localeCompare(b.start === "All Day" ? "00:00" : b.start));

            weEvts.forEach(ev => {
                const ed = document.createElement('div');
                ed.className = `week-event ${ev.color} ${ev.completed ? 'task-completed-pill' : ''}`;
                const tStr = [formatTime(ev.start), formatTime(ev.end)].filter(Boolean).join(' - ');
                ed.innerHTML = `
                    <span class="we-time">${tStr || "All Day"}</span>
                    <span class="we-title">${ev.title}</span>
                `;
                ed.onclick = () => openTaskModal(ev);
                weList.appendChild(ed);
            });
            grid.appendChild(col);
        }
        calContainer.appendChild(grid);
    }

    function renderDaily(tDate) {
        const dStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}-${String(tDate.getDate()).padStart(2, '0')}`;
        let dEvs = events.filter(e => e.date === dStr);
        const isToday = tDate.toDateString() === now.toDateString();

        if (isToday) {
            dEvs.push({
                isMarker: true,
                start: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                title: 'Current Segment'
            });
        }

        dEvs.sort((a, b) => (a.start === "All Day" ? "00:00" : a.start).localeCompare(b.start === "All Day" ? "00:00" : b.start));

        const cont = document.createElement('div');
        cont.className = 'daily-container';

        if (dEvs.length === 0 || (dEvs.length === 1 && dEvs[0].isMarker)) {
            cont.innerHTML = `<div class="empty-state"><i class="fas fa-mug-hot"></i><p>No operational tasks for this bracket.</p></div>`;
            calContainer.appendChild(cont);
            return;
        }

        const tl = document.createElement('div');
        tl.className = 'timeline';

        dEvs.forEach(ev => {
            const tm = document.createElement('div');
            if (ev.isMarker) {
                tm.className = 'current-time-marker';
                tm.innerHTML = `<div class="current-time-badge"><i class="fas fa-satellite-dish"></i> Live &bull; ${formatTime(ev.start)}</div>`;
                tl.appendChild(tm);
                return;
            }

            tm.className = `timeline-item ${ev.completed ? 'task-completed' : ''}`;
            tm.onclick = () => openTaskModal(ev);

            const timeStr = ev.start === "All Day" ? "All Day" : [formatTime(ev.start), formatTime(ev.end)].filter(Boolean).join(' - ');

            tm.innerHTML = `
                <div class="timeline-dot ${ev.color}"></div>
                <div class="timeline-content">
                    <div class="tl-time">${timeStr}</div>
                    <div class="tl-title">${ev.title}</div>
                </div>
            `;
            tl.appendChild(tm);
        });

        cont.appendChild(tl);
        calContainer.appendChild(cont);
    }

    renderCalendar();

    // --- Modals ---
    const tmModal = document.getElementById('task-modal');
    const tmTitle = document.getElementById('tm-title');
    const tmCol = document.getElementById('tm-color');
    const tmDate = document.getElementById('tm-date');
    const tmTime = document.getElementById('tm-time');
    const tmRem = document.getElementById('tm-reminder');
    const tmDet = document.getElementById('tm-details');
    const tmPrio = document.getElementById('tm-priority');
    const tmStatus = document.getElementById('tm-status');
    const btnToggleComplete = document.getElementById('btn-toggle-complete');

    let openTask = null;

    window.openTaskModal = function (ev) {
        openTask = ev;
        tmTitle.textContent = ev.title;
        tmCol.className = `task-icon ${ev.color}`;

        const dobj = new Date(ev.date + 'T00:00:00');
        tmDate.textContent = dobj.toDateString();
        tmTime.textContent = ev.start === "All Day" ? "All Day" : [formatTime(ev.start), formatTime(ev.end)].filter(Boolean).join(' - ') || 'N/A';
        tmRem.textContent = (ev.reminder && ev.reminder !== 'none') ? `${ev.reminder} mins before` : 'No alert set';
        tmDet.textContent = ev.details || 'No extended notes provided.';

        tmPrio.textContent = `${ev.priority} Priority`;
        if (ev.priority === 'high') { tmPrio.style.background = 'var(--c-danger-light)'; tmPrio.style.color = 'var(--c-danger)'; }
        else if (ev.priority === 'low') { tmPrio.style.background = 'var(--c-primary-light)'; tmPrio.style.color = 'var(--c-primary)'; }
        else { tmPrio.style.background = 'var(--c-warning-light)'; tmPrio.style.color = 'var(--c-warning)'; }

        if (ev.completed) {
            tmStatus.classList.remove('hidden');
            tmTitle.parentElement.parentElement.classList.add('task-completed');
            btnToggleComplete.innerHTML = '<i class="fas fa-undo"></i> Revert';
            btnToggleComplete.classList.replace('btn-success', 'btn-outline');
        } else {
            tmStatus.classList.add('hidden');
            tmTitle.parentElement.parentElement.classList.remove('task-completed');
            btnToggleComplete.innerHTML = '<i class="fas fa-check"></i> Mark Done';
            btnToggleComplete.classList.replace('btn-outline', 'btn-success');
        }

        tmModal.classList.remove('hidden');
        renderModalSubtasks();
        setTimeout(() => tmModal.classList.add('show'), 10);
    };

    function renderModalSubtasks() {
        const subCont = document.getElementById('tm-subtasks-list');
        subCont.innerHTML = '';
        if (!openTask || !openTask.subtasks || openTask.subtasks.length === 0) {
            subCont.innerHTML = '<p style="color:var(--c-text-muted); font-size:0.9rem;">No action items defined.</p>';
            return;
        }

        openTask.subtasks.forEach((s, i) => {
            const item = document.createElement('div');
            item.className = `subtask-item ${s.done ? 'done' : ''}`;
            item.innerHTML = `
                <i class="subtask-check ${s.done ? 'fas fa-check-square' : 'far fa-square'}" onclick="toggleSubtask(${i})"></i>
                <span>${s.text}</span>
            `;
            subCont.appendChild(item);
        });
    }

    window.toggleSubtask = (idx) => {
        if (!openTask) return;
        const evIdx = events.findIndex(e => e.id === openTask.id);
        if (evIdx > -1) {
            events[evIdx].subtasks[idx].done = !events[evIdx].subtasks[idx].done;
            openTask = events[evIdx];
            saveEvents();
            renderModalSubtasks();
        }
    };

    function closeTaskModal() {
        tmModal.classList.remove('show');
        setTimeout(() => tmModal.classList.add('hidden'), 300);
        openTask = null;
    }

    document.getElementById('task-modal-close').addEventListener('click', closeTaskModal);

    btnToggleComplete.addEventListener('click', () => {
        if (openTask) {
            const idx = events.findIndex(e => e.id === openTask.id);
            if (idx > -1) {
                events[idx].completed = !events[idx].completed;
                saveEvents();
                renderCalendar();
                closeTaskModal();
                const statusStr = events[idx].completed ? "Completed" : "Reverted";
                window.showToast('Task Updated', `Task marked as ${statusStr}.`, 'fa-check-circle', 'bg-emerald');
            }
        }
    });

    document.getElementById('btn-delete-event').addEventListener('click', () => {
        if (openTask) {
            events = events.filter(e => e.id !== openTask.id);
            saveEvents();
            renderCalendar();
            closeTaskModal();
            window.showToast('Archived', 'Task removed from workspace.', 'fa-archive', 'bg-rose');
        }
    });

    document.getElementById('btn-edit-event').addEventListener('click', () => {
        if (openTask) {
            document.getElementById('event-title').value = openTask.title;
            document.getElementById('event-date').value = openTask.date;
            document.getElementById('event-start').value = openTask.start !== "All Day" ? openTask.start : "";
            document.getElementById('event-end').value = openTask.end;
            document.getElementById('event-priority').value = openTask.priority || "medium";
            document.getElementById('event-reminder').value = openTask.reminder || "none";
            document.getElementById('event-est').value = openTask.estTime || "";
            document.getElementById('event-details').value = openTask.details || "";

            selectedColor = openTask.color;
            document.querySelectorAll('.color-choice').forEach(b => {
                b.classList.remove('selected');
                if (b.getAttribute('data-color') === selectedColor) b.classList.add('selected');
            });

            editingEventId = openTask.id;
            btnSubmit.innerHTML = '<i class="fas fa-save"></i> Update Task';
            btnCancel.classList.remove('hidden');
            document.getElementById('event-recurring').value = 'none';
            document.getElementById('event-recurring').disabled = true;

            closeTaskModal();
        }
    });

    // --- Pomodoro ---
    let focInt = null;
    let focTimeLeft = 25 * 60;
    let focPaused = false;
    let focElapsedSec = 0;

    const focOv = document.getElementById('focus-overlay');
    const focDisp = document.getElementById('focus-timer-display');
    const focStat = document.getElementById('focus-timer-status');
    const focTogBtn = document.getElementById('focus-toggle-btn');
    const focTogTxt = document.getElementById('focus-toggle-text');

    document.getElementById('btn-start-focus').addEventListener('click', () => {
        if (!openTask) return;
        document.getElementById('focus-task-title').textContent = openTask.title;
        closeTaskModal();
        focOv.classList.remove('hidden');
        setTimeout(() => focOv.classList.add('show'), 10);

        const pomoSetting = JSON.parse(localStorage.getItem('saas_schedulizer_settings'))?.pomoLength || 25;
        const est = parseInt(openTask.estTime) || pomoSetting;
        focTimeLeft = est * 60;
        focElapsedSec = 0;
        focPaused = false;

        focTogTxt.textContent = "Pause";
        focTogBtn.firstElementChild.className = "fas fa-pause";
        updateFocDisp();

        clearInterval(focInt);
        focInt = setInterval(() => {
            if (!focPaused && focTimeLeft > 0) {
                focTimeLeft--;
                focElapsedSec++;
                updateFocDisp();
            } else if (focTimeLeft <= 0) {
                finishFocus();
            }
        }, 1000);
    });

    function updateFocDisp() {
        const m = String(Math.floor(focTimeLeft / 60)).padStart(2, '0');
        const s = String(focTimeLeft % 60).padStart(2, '0');
        focDisp.textContent = `${m}:${s}`;
        focStat.textContent = `${m} mins remaining block`;
    }

    focTogBtn.addEventListener('click', () => {
        focPaused = !focPaused;
        if (focPaused) {
            focTogTxt.textContent = "Resume";
            focTogBtn.firstElementChild.className = "fas fa-play";
            focStat.textContent = "Focus Paused";
        } else {
            focTogTxt.textContent = "Pause";
            focTogBtn.firstElementChild.className = "fas fa-pause";
            updateFocDisp();
        }
    });

    document.getElementById('focus-stop-btn').addEventListener('click', finishFocus);
    document.getElementById('focus-close-btn').addEventListener('click', () => {
        clearInterval(focInt);
        closeFocus();
    });

    function finishFocus() {
        clearInterval(focInt);

        if (openTask && focElapsedSec > 0) {
            const idx = events.findIndex(e => e.id === openTask.id);
            if (idx > -1) {
                // Focus time measured in minutes
                const mElapsed = Math.ceil(focElapsedSec / 60);
                events[idx].focusMins = (events[idx].focusMins || 0) + mElapsed;
                saveEvents();
            }
        }

        window.showToast('Deep Work Concluded', 'Session metrics recorded successfully.', 'fa-brain', 'bg-indigo');
        closeFocus();
    }

    function closeFocus() {
        focOv.classList.remove('show');
        setTimeout(() => focOv.classList.add('hidden'), 500);
    }
});
