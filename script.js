const ALLOWED_ROSTER = [
    "Hanin Elnemr",
    "Fahd",
    "Jody",
    "Kirols",
    "Lobna",
    "Malak",
    "Nandy",
    "Noreen",
    "Nour",
    "Reem",
    "Remas",
    "Rokia",
    "Sara",
    "Somia",
    "Tayseer",
    "Yassen",
    "Elzahraa"
];

const FOUNDER_NAME = "Hanin Elnemr";
const FOUNDER_PASSCODE = "727";
const FOUNDER_IMAGE_PATH = "771821083_18039026267815893_8617930397081388043_n.jpg";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const STORAGE_USERS = "khotana_users_db";
const STORAGE_CURRENT_USER = "khotana_current_user";
const STORAGE_QUESTION = "khotana_active_question";
const STORAGE_ANSWERS = "khotana_answers_list";

let usersDatabase = [];
let currentUser = null;
let activeQuestion = null;
let answersList = [];
let tempAvatarData = "";
let tempEditAvatarData = "";

// Real-Time Broadcast Channel for instant multi-tab & multi-device sync
const syncChannel = new BroadcastChannel("khotana_sync_channel");

document.addEventListener("DOMContentLoaded", () => {
    loadDataFromStorage();
    ensureFounderInDB();
    populateRegisterRosterDropdown();
    checkAuthStatus();
    
    // Auto purge answers older than 24 hours every 30 seconds
    setInterval(purgeExpiredAnswers, 30000);

    // Listen for storage events (multi-window sync)
    window.addEventListener("storage", (e) => {
        loadDataFromStorage();
        if (currentUser) renderDashboard();
    });

    syncChannel.onmessage = () => {
        loadDataFromStorage();
        if (currentUser) renderDashboard();
    };
});

function ensureFounderInDB() {
    let founderUser = usersDatabase.find(u => u.isFounder || normalizeName(u.name) === normalizeName(FOUNDER_NAME));
    if (!founderUser) {
        founderUser = {
            id: "founder_1",
            name: FOUNDER_NAME,
            avatar: FOUNDER_IMAGE_PATH,
            committee: "",
            isFounder: true
        };
        usersDatabase.push(founderUser);
        saveUsersToStorage();
    } else {
        // Guarantee founder photo is locked to path
        founderUser.avatar = FOUNDER_IMAGE_PATH;
        founderUser.isFounder = true;
        saveUsersToStorage();
    }
}

function notifySync() {
    syncChannel.postMessage("update");
}

function loadDataFromStorage() {
    const storedUsers = localStorage.getItem(STORAGE_USERS);
    usersDatabase = storedUsers ? JSON.parse(storedUsers) : [];

    const storedUser = localStorage.getItem(STORAGE_CURRENT_USER);
    currentUser = storedUser ? JSON.parse(storedUser) : null;

    // Keep current user avatar updated if founder
    if (currentUser && (currentUser.isFounder || normalizeName(currentUser.name) === normalizeName(FOUNDER_NAME))) {
        currentUser.avatar = FOUNDER_IMAGE_PATH;
        currentUser.isFounder = true;
    }

    const storedQuestion = localStorage.getItem(STORAGE_QUESTION);
    activeQuestion = storedQuestion ? JSON.parse(storedQuestion) : null;

    const storedAnswers = localStorage.getItem(STORAGE_ANSWERS);
    answersList = storedAnswers ? JSON.parse(storedAnswers) : [];

    purgeExpiredAnswers();
}

function saveUsersToStorage() {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(usersDatabase));
    notifySync();
}

function saveCurrentUserToStorage() {
    if (currentUser) {
        localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(currentUser));
    } else {
        localStorage.removeItem(STORAGE_CURRENT_USER);
    }
}

function saveQuestionToStorage() {
    localStorage.setItem(STORAGE_QUESTION, JSON.stringify(activeQuestion));
    notifySync();
}

function saveAnswersToStorage() {
    localStorage.setItem(STORAGE_ANSWERS, JSON.stringify(answersList));
    notifySync();
}

function checkAuthStatus() {
    const authModal = document.getElementById("authModal");
    const mainDashboard = document.getElementById("mainDashboard");

    if (currentUser) {
        authModal.classList.add("hidden");
        mainDashboard.classList.remove("hidden");
        renderDashboard();
    } else {
        authModal.classList.remove("hidden");
        mainDashboard.classList.add("hidden");
        goToAuthStep('init');
    }
}

function goToAuthStep(step) {
    document.getElementById("authStep0").classList.remove("active");
    document.getElementById("authStepLogin").classList.remove("active");
    document.getElementById("authStepRegister").classList.remove("active");

    document.getElementById("loginError").classList.add("hidden");
    document.getElementById("registerError").classList.add("hidden");

    if (step === 'init') {
        document.getElementById("authStep0").classList.add("active");
    } else if (step === 'login') {
        document.getElementById("authStepLogin").classList.add("active");
    } else if (step === 'register') {
        document.getElementById("authStepRegister").classList.add("active");
    }
}

function populateRegisterRosterDropdown() {
    const select = document.getElementById("regNameSelect");
    select.innerHTML = '<option value="" disabled selected>-- اختر اسمك --</option>';

    ALLOWED_ROSTER.forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

function handleRegisterNameChange(selectedName) {
    const isFounder = selectedName.toLowerCase().trim() === FOUNDER_NAME.toLowerCase().trim();
    const isFounderCheckbox = document.getElementById("regIsFounder");
    const committeeGroup = document.getElementById("committeeSelectGroup");
    const previewImg = document.getElementById("regAvatarPreview");
    
    if (isFounder) {
        isFounderCheckbox.checked = true;
        toggleFounderPasscodeGroup(true);
        committeeGroup.classList.add("hidden");
        previewImg.src = FOUNDER_IMAGE_PATH;
        tempAvatarData = FOUNDER_IMAGE_PATH;
    } else {
        isFounderCheckbox.checked = false;
        toggleFounderPasscodeGroup(false);
        committeeGroup.classList.remove("hidden");
        if (!tempAvatarData || tempAvatarData === FOUNDER_IMAGE_PATH) {
            previewImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedName)}&background=2d6a4f&color=fff`;
            tempAvatarData = previewImg.src;
        }
    }
}

function toggleFounderPasscodeGroup(isChecked) {
    const group = document.getElementById("founderPasscodeGroup");
    const committeeGroup = document.getElementById("committeeSelectGroup");
    
    if (isChecked) {
        group.classList.remove("hidden");
        committeeGroup.classList.add("hidden");
    } else {
        group.classList.add("hidden");
        committeeGroup.classList.remove("hidden");
    }
}

function switchAvatarTab(type) {
    const btnFile = document.getElementById("tabBtnFile");
    const btnUrl = document.getElementById("tabBtnUrl");
    const groupFile = document.getElementById("avatarFileInputGroup");
    const groupUrl = document.getElementById("avatarUrlInputGroup");

    if (type === 'file') {
        btnFile.classList.add("active");
        btnUrl.classList.remove("active");
        groupFile.classList.remove("hidden");
        groupUrl.classList.add("hidden");
    } else {
        btnUrl.classList.add("active");
        btnFile.classList.remove("active");
        groupUrl.classList.remove("hidden");
        groupFile.classList.add("hidden");
    }
}

function previewAvatarFromFile(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempAvatarData = e.target.result;
            document.getElementById("regAvatarPreview").src = tempAvatarData;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function previewAvatarFromUrl(url) {
    if (url.trim() !== "") {
        tempAvatarData = url.trim();
        document.getElementById("regAvatarPreview").src = tempAvatarData;
    }
}

function normalizeName(str) {
    return str.toLowerCase().trim().replace(/\s+/g, " ");
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const inputName = document.getElementById("loginNameInput").value;
    const normalizedInput = normalizeName(inputName);
    const errorBox = document.getElementById("loginError");

    const matchedRosterName = ALLOWED_ROSTER.find(name => normalizeName(name) === normalizedInput);

    if (!matchedRosterName) {
        errorBox.classList.remove("hidden");
        return;
    }

    let user = usersDatabase.find(u => normalizeName(u.name) === normalizedInput);

    if (!user) {
        const isFounder = matchedRosterName.toLowerCase() === FOUNDER_NAME.toLowerCase();
        user = {
            id: Date.now().toString(),
            name: matchedRosterName,
            avatar: isFounder ? FOUNDER_IMAGE_PATH : `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedRosterName)}&background=2d6a4f&color=fff`,
            committee: isFounder ? "" : "HR",
            isFounder: isFounder
        };
        usersDatabase.push(user);
        saveUsersToStorage();
    }

    currentUser = user;
    saveCurrentUserToStorage();
    checkAuthStatus();
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    const errorBox = document.getElementById("registerError");
    errorBox.classList.add("hidden");

    const selectedName = document.getElementById("regNameSelect").value;
    const isFounderChecked = document.getElementById("regIsFounder").checked;
    const founderCode = document.getElementById("regFounderCode").value.trim();
    const committee = document.getElementById("regCommittee").value;

    if (!selectedName) {
        showError(errorBox, "برجاء اختيار اسمك من القائمة.");
        return;
    }

    let isFounder = false;
    if (isFounderChecked) {
        if (founderCode !== FOUNDER_PASSCODE) {
            showError(errorBox, "كود التحقق الخاص بالفاوندر غير صحيح!");
            return;
        }
        isFounder = true;
    }

    if (!isFounder && !committee) {
        showError(errorBox, "يرجى تحديد اللجنة التابع لها.");
        return;
    }

    let avatarUrl = isFounder ? FOUNDER_IMAGE_PATH : (tempAvatarData || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedName)}&background=2d6a4f&color=fff`);

    const normalizedInput = normalizeName(selectedName);
    let existingIndex = usersDatabase.findIndex(u => normalizeName(u.name) === normalizedInput);

    const userProfile = {
        id: existingIndex !== -1 ? usersDatabase[existingIndex].id : Date.now().toString(),
        name: selectedName,
        avatar: avatarUrl,
        committee: isFounder ? "" : committee,
        isFounder: isFounder
    };

    if (existingIndex !== -1) {
        usersDatabase[existingIndex] = userProfile;
    } else {
        usersDatabase.push(userProfile);
    }

    saveUsersToStorage();
    currentUser = userProfile;
    saveCurrentUserToStorage();
    checkAuthStatus();
}

function showError(container, msg) {
    container.textContent = msg;
    container.classList.remove("hidden");
}

function renderDashboard() {
    if (!currentUser) return;

    document.getElementById("navUserName").textContent = currentUser.name;
    document.getElementById("navUserAvatar").src = currentUser.isFounder ? FOUNDER_IMAGE_PATH : currentUser.avatar;
    document.getElementById("navUserRole").textContent = currentUser.isFounder ? "مؤسس المبادرة" : `لجنة ${currentUser.committee}`;

    renderFounderSection();
    renderQnASection();
    renderCommittees();
}

function renderFounderSection() {
    const founderPhoto = document.getElementById("founderPhoto");
    const founderName = document.getElementById("founderName");

    founderPhoto.src = FOUNDER_IMAGE_PATH;
    founderName.textContent = FOUNDER_NAME;
}

function renderCommittees() {
    const committees = ["HR", "Operations", "Activities", "Content Writing", "Graphic Design"];

    committees.forEach(comm => {
        const container = document.getElementById(`committeeList-${comm}`);
        container.innerHTML = "";

        const members = usersDatabase.filter(u => !u.isFounder && u.committee === comm);

        if (members.length === 0) {
            container.innerHTML = '<div class="empty-committee">لا يوجد أعضاء حالياً</div>';
        } else {
            members.forEach(member => {
                const item = document.createElement("div");
                item.className = "member-item";
                item.innerHTML = `
                    <img src="${member.avatar}" alt="${member.name}" class="member-avatar">
                    <span class="member-name">${member.name}</span>
                `;
                container.appendChild(item);
            });
        }
    });
}

function purgeExpiredAnswers() {
    const now = Date.now();
    const initialLength = answersList.length;
    
    answersList = answersList.filter(ans => (now - ans.timestamp) < TWENTY_FOUR_HOURS_MS);

    if (answersList.length !== initialLength) {
        saveAnswersToStorage();
        if (currentUser) {
            renderQnASection();
        }
    }
}

function renderQnASection() {
    const founderControl = document.getElementById("founderQControl");
    if (currentUser && currentUser.isFounder) {
        founderControl.classList.remove("hidden");
    } else {
        founderControl.classList.add("hidden");
    }

    const qText = document.getElementById("displayQuestionText");
    const qMeta = document.getElementById("displayQuestionMeta");

    if (activeQuestion) {
        qText.textContent = activeQuestion.text;
        const dateStr = new Date(activeQuestion.timestamp).toLocaleDateString("ar-EG", {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        qMeta.innerHTML = `<i class="fa-solid fa-user"></i> نشر بواسطة الفاوندر - ${dateStr}`;
    } else {
        qText.textContent = "لا يوجد سؤال مطروح حالياً من الفاوندر.";
        qMeta.innerHTML = "";
    }

    const answersGrid = document.getElementById("answersGrid");
    const countBadge = document.getElementById("answersCountBadge");
    answersGrid.innerHTML = "";

    countBadge.textContent = `${answersList.length} إجابة`;

    if (answersList.length === 0) {
        answersGrid.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; grid-column: 1/-1;">لا توجد إجابات بعد. كن أول المشاركين!</p>';
        return;
    }

    const sortedAnswers = [...answersList].sort((a, b) => b.timestamp - a.timestamp);

    sortedAnswers.forEach(ans => {
        const card = document.createElement("div");
        card.className = "answer-card";

        const timeAgo = formatTimeAgo(ans.timestamp);
        const isFounderTag = ans.isFounder ? '<span class="badge-founder-tag">مؤسس</span>' : '';
        const avatarSrc = ans.isFounder ? FOUNDER_IMAGE_PATH : ans.userAvatar;

        card.innerHTML = `
            <div class="answer-user-info">
                <img src="${avatarSrc}" alt="${ans.userName}" class="answer-avatar">
                <div>
                    <span class="answer-user-name">${ans.userName}</span> ${isFounderTag}
                </div>
                <span class="answer-time">${timeAgo}</span>
            </div>
            <div class="answer-content">${escapeHTML(ans.text)}</div>
        `;
        answersGrid.appendChild(card);
    });
}

function handleAnswerSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    const answerInput = document.getElementById("userAnswerText");
    const text = answerInput.value.trim();

    if (!text) return;

    const newAnswer = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.isFounder ? FOUNDER_IMAGE_PATH : currentUser.avatar,
        isFounder: currentUser.isFounder,
        text: text,
        timestamp: Date.now()
    };

    answersList.push(newAnswer);
    saveAnswersToStorage();

    answerInput.value = "";
    renderQnASection();
}

function openPublishQuestionModal() {
    document.getElementById("publishQuestionModal").classList.remove("hidden");
}

function closePublishQuestionModal() {
    document.getElementById("publishQuestionModal").classList.add("hidden");
    document.getElementById("newQuestionInput").value = "";
}

function handlePublishQuestionSubmit(e) {
    e.preventDefault();
    const input = document.getElementById("newQuestionInput");
    const text = input.value.trim();

    if (!text) return;

    activeQuestion = {
        text: text,
        timestamp: Date.now()
    };

    saveQuestionToStorage();
    closePublishQuestionModal();
    renderQnASection();
}

function openEditProfileModal() {
    if (!currentUser) return;

    document.getElementById("editNameInput").value = currentUser.name;
    document.getElementById("editAvatarPreview").src = currentUser.isFounder ? FOUNDER_IMAGE_PATH : currentUser.avatar;
    tempEditAvatarData = currentUser.avatar;

    const isFounderCheck = document.getElementById("editIsFounder");
    const commSelect = document.getElementById("editCommitteeSelect");
    const commGroup = document.getElementById("editCommitteeGroup");

    isFounderCheck.checked = currentUser.isFounder;
    if (currentUser.isFounder) {
        commGroup.classList.add("hidden");
    } else {
        commGroup.classList.remove("hidden");
        commSelect.value = currentUser.committee || "HR";
    }

    document.getElementById("editFounderPasscodeGroup").classList.add("hidden");
    document.getElementById("editFounderCode").value = "";
    document.getElementById("editProfileError").classList.add("hidden");

    document.getElementById("editProfileModal").classList.remove("hidden");
}

function closeEditProfileModal() {
    document.getElementById("editProfileModal").classList.add("hidden");
}

function toggleEditFounderPasscodeGroup(isChecked) {
    const group = document.getElementById("editFounderPasscodeGroup");
    const commGroup = document.getElementById("editCommitteeGroup");

    if (isChecked) {
        group.classList.remove("hidden");
        commGroup.classList.add("hidden");
    } else {
        group.classList.add("hidden");
        commGroup.classList.remove("hidden");
    }
}

function switchEditAvatarTab(type) {
    const btnFile = document.getElementById("editTabBtnFile");
    const btnUrl = document.getElementById("editTabBtnUrl");
    const groupFile = document.getElementById("editAvatarFileInputGroup");
    const groupUrl = document.getElementById("editAvatarUrlInputGroup");

    if (type === 'file') {
        btnFile.classList.add("active");
        btnUrl.classList.remove("active");
        groupFile.classList.remove("hidden");
        groupUrl.classList.add("hidden");
    } else {
        btnUrl.classList.add("active");
        btnFile.classList.remove("active");
        groupUrl.classList.remove("hidden");
        groupFile.classList.add("hidden");
    }
}

function previewEditAvatarFromFile(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempEditAvatarData = e.target.result;
            document.getElementById("editAvatarPreview").src = tempEditAvatarData;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function previewEditAvatarFromUrl(url) {
    if (url.trim() !== "") {
        tempEditAvatarData = url.trim();
        document.getElementById("editAvatarPreview").src = tempEditAvatarData;
    }
}

function handleEditProfileSubmit(e) {
    e.preventDefault();
    const errorBox = document.getElementById("editProfileError");
    errorBox.classList.add("hidden");

    const isFounderChecked = document.getElementById("editIsFounder").checked;
    const founderCode = document.getElementById("editFounderCode").value.trim();
    const selectedCommittee = document.getElementById("editCommitteeSelect").value;

    let isFounder = currentUser.isFounder;

    if (isFounderChecked && !currentUser.isFounder) {
        if (founderCode !== FOUNDER_PASSCODE) {
            showError(errorBox, "كود التحقق الأمني للفاوندر غير صحيح!");
            return;
        }
        isFounder = true;
    } else if (!isFounderChecked) {
        isFounder = false;
    }

    currentUser.avatar = isFounder ? FOUNDER_IMAGE_PATH : (tempEditAvatarData || currentUser.avatar);
    currentUser.isFounder = isFounder;
    currentUser.committee = isFounder ? "" : selectedCommittee;

    const idx = usersDatabase.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
        usersDatabase[idx] = currentUser;
    }

    saveUsersToStorage();
    saveCurrentUserToStorage();

    closeEditProfileModal();
    renderDashboard();
}

function handleLogout() {
    currentUser = null;
    saveCurrentUserToStorage();
    checkAuthStatus();
}

function formatTimeAgo(timestamp) {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return "منذ لحظات";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHours = Math.floor(diffMin / 60);
    return `منذ ${diffHours} ساعة`;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}