// ===================================================
// KINETIX CLIENT — DASHBOARD & ADMIN LOGIC
// ===================================================

const ADMIN_USERNAMES = ["btw1o", "admin", "owner", "administrator", "kinetix"];

const DEFAULT_USER = {
  id: 84920,
  username: "btw1o",
  email: "btw1o@kinetix.lol",
  role: "👑 OWNER / ADMIN",
  plan: "LIFETIME",
  planName: "KINETIX OWNER VIP",
  isLifetime: true,
  isAdmin: true,
  expiryDate: null,
  daysLeft: "Навсегда",
  hwid: "B4F8-79C1-D8E2-4D02",
  hwidLocked: true,
  hwidResetCooldown: 0,
  balance: 14500,
  referrals: 18,
  refEarnings: 5400,
  avatar: "https://minotar.net/avatar/steve/128",
  configs: [
    { id: "cfg_1", name: "ReallyWorld HvH / Rage", server: "ReallyWorld", author: "Dev Team", downloads: 1420, code: "RW-RAGE-2026" },
    { id: "cfg_2", name: "HolyWorld Legit / Bypass", server: "HolyWorld", author: "Kinetix", downloads: 890, code: "HW-LEGIT-121" },
    { id: "cfg_3", name: "FunTime Farm and AutoTotem", server: "FunTime", author: "ProUser", downloads: 654, code: "FT-FARM-99" }
  ]
};

const USER_4234234 = {
  id: 4234234,
  username: "4234234",
  email: "4234234@kinetix.lol",
  role: "PRO LIFETIME",
  plan: "LIFETIME",
  planName: "KINETIX LIFETIME",
  isLifetime: true,
  is_lifetime: 1,
  is_active: true,
  isAdmin: false,
  expiryDate: null,
  daysLeft: "Навсегда",
  hwid: "HWID-KNTX-4262",
  hwidLocked: true,
  hwidResetCooldown: 0,
  balance: 150,
  referrals: 0,
  refEarnings: 0,
  avatar: "https://minotar.net/avatar/steve/128",
  configs: [
    { id: "cfg_1", name: "ReallyWorld HvH / Rage", server: "ReallyWorld", author: "Dev Team", downloads: 1420, code: "RW-RAGE-2026" }
  ]
};

// Пример пользователей для админ-панели
let ADMIN_USERS_LIST = [
  { id: 101, username: "Player1337", plan: "LIFETIME", hwid: "A1B2-C3D4-E5F6", status: "Активен" },
  { id: 102, username: "Steve228", plan: "30 Дней", hwid: "F9E8-D7C6-B5A4", status: "Активен" },
  { id: 103, username: "AlexPro", plan: "7 Дней", hwid: "33A1-77BC-99DF", status: "Активен" },
  { id: 104, username: "GriefMaster", plan: "Истёк", hwid: "None", status: "Не активен" },
  { id: 105, username: "DarkKnight", plan: "1 День", hwid: "88BB-44CC-11AA", status: "Активен" }
];

let currentUser = null;

function hasActiveSubscription(user) {
  if (!user) return false;
  const uname = (user.username || "").toLowerCase();
  if (ADMIN_USERNAMES.includes(uname)) return true;
  if (user.isAdmin) return true;
  if (user.isLifetime || user.is_lifetime) return true;
  if (user.is_active === false || user.sub_status === "inactive") return false;
  if (user.is_active === true || user.sub_status === "active") {
    const exp = user.expires_at || user.expiryDate || user.sub_expires;
    if (exp && exp !== "Бессрочно" && exp !== "Навсегда" && exp !== "—") {
      try {
        const d = new Date(exp);
        if (!isNaN(d.getTime()) && d < new Date()) return false;
      } catch(e) {}
    }
    return true;
  }
  if (user.days_left && Number(user.days_left) > 0) return true;
  if (user.daysLeft && parseInt(user.daysLeft, 10) > 0) return true;
  return false;
}

function initApp() {
  loadUserSession();
  initAuthEvents();
  initDashboardEvents();
  initAdminEvents();
  initCanvasParticles();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

function loadUserSession() {
  const saved = localStorage.getItem("kinetix_user");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
    } catch(e) {
      currentUser = null;
    }
  }

  // Проверка никнейма на права админа
  checkAdminStatus();
  updateAppView();
  checkUrlActionParams();
}

function checkUrlActionParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get("action");
  const plan = urlParams.get("plan");

  if (!currentUser && (action === "register" || action === "buy")) {
    const tabRegisterBtn = document.getElementById("tabRegisterBtn");
    const tabLoginBtn = document.getElementById("tabLoginBtn");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const authNotice = document.getElementById("authNotice");

    if (tabRegisterBtn && registerForm) {
      tabRegisterBtn.classList.add("active");
      if (tabLoginBtn) tabLoginBtn.classList.remove("active");
      if (loginForm) loginForm.style.display = "none";
      registerForm.style.display = "block";
    }

    if (authNotice) {
      authNotice.style.display = "flex";
      authNotice.innerHTML = `
        <div class="notice-icon-box">🔒</div>
        <div class="notice-content">
          <div class="notice-title">Для покупки тарифа ${plan ? `<span class="notice-plan-highlight">«${plan}»</span>` : ''} требуется регистрация</div>
          <div class="notice-desc">
            Создайте аккаунт, чтобы лицензионный ключ и привязка оборудования (HWID) закрепились за вашим профилем.
          </div>
        </div>
      `;
    }
  } else if (currentUser && plan) {
    setTimeout(handlePostAuthPlan, 100);
  }
}

function handlePostAuthPlan() {
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get("plan");
  if (plan) {
    const licenseTabBtn = document.querySelector('[data-tab="license"]');
    if (licenseTabBtn) {
      licenseTabBtn.click();
      showToast(`Вы авторизованы! Оформите тариф «${plan}» в разделе лицензий`, "#00f0ff");
    }
  }
}

function checkAdminStatus() {
  if (!currentUser) return;
  if (ADMIN_USERNAMES.includes(currentUser.username.toLowerCase())) {
    currentUser.isAdmin = true;
    if (!currentUser.role.includes("ADMIN") && !currentUser.role.includes("OWNER")) {
      currentUser.role = "👑 OWNER / ADMIN";
    }
  }
}

// Фоновое обновление профиля с сервера API
async function refreshUserProfile() {
  if (!currentUser || !currentUser.username) return;
  try {
    const res = await fetch(`/api/user/profile?username=${encodeURIComponent(currentUser.username)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        const adminFlag = currentUser.isAdmin;
        currentUser = Object.assign({}, currentUser, data.user);
        if (adminFlag) currentUser.isAdmin = true;
        checkAdminStatus();
        saveUserSession();
        renderDashboard();
      }
    }
  } catch (err) {
    // Сервер офлайн - используем кэш сессии
  }
}

// Глобальные функции быстрого входа
window.loginAs4234234 = function() {
  currentUser = JSON.parse(JSON.stringify(USER_4234234));
  checkAdminStatus();
  saveUserSession();
  updateAppView();
  showToast("Вход выполнен как 4234234 (PRO LIFETIME)!", "#00ff88");
};

window.loginAsBtw1o = function() {
  currentUser = JSON.parse(JSON.stringify(DEFAULT_USER));
  checkAdminStatus();
  saveUserSession();
  updateAppView();
  showToast("Вход выполнен как btw1o (Владелец)!", "#ffd700");
};

function initAuthEvents() {
  const tabLoginBtn = document.getElementById("tabLoginBtn");
  const tabRegisterBtn = document.getElementById("tabRegisterBtn");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const linkToRegister = document.getElementById("linkToRegister");
  const linkToLogin = document.getElementById("linkToLogin");

  const quickLogin4234234 = document.getElementById("quickLogin4234234");
  const quickLoginBtw1o = document.getElementById("quickLoginBtw1o");
  if (quickLogin4234234) quickLogin4234234.addEventListener("click", window.loginAs4234234);
  if (quickLoginBtw1o) quickLoginBtw1o.addEventListener("click", window.loginAsBtw1o);

  if (linkToRegister && tabRegisterBtn) {
    linkToRegister.addEventListener("click", () => tabRegisterBtn.click());
  }
  if (linkToLogin && tabLoginBtn) {
    linkToLogin.addEventListener("click", () => tabLoginBtn.click());
  }

  if (tabLoginBtn && tabRegisterBtn && loginForm && registerForm) {
    tabLoginBtn.addEventListener("click", () => {
      tabLoginBtn.classList.add("active");
      tabRegisterBtn.classList.remove("active");
      loginForm.style.display = "block";
      registerForm.style.display = "none";
    });

    tabRegisterBtn.addEventListener("click", () => {
      tabRegisterBtn.classList.add("active");
      tabLoginBtn.classList.remove("active");
      loginForm.style.display = "none";
      registerForm.style.display = "block";
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById("loginUsername");
      const passwordInput = document.getElementById("loginPassword");
      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value.trim() : "";

      if (!username) {
        showToast("Пожалуйста, введите ваш никнейм!", "#f43f5e");
        highlightLoginError(usernameInput, null);
        return;
      }

      // 1. Быстрый вход для профиля 4234234 (PRO LIFETIME)
      if (username === "4234234") {
        currentUser = JSON.parse(JSON.stringify(USER_4234234));
        checkAdminStatus();
        saveUserSession();
        updateAppView();
        showToast("Добро пожаловать в Kinetix, 4234234!", "#00ff88");
        return;
      }

      // 2. Вход создателя btw1o (OWNER / ADMIN)
      if (username.toLowerCase() === "btw1o") {
        currentUser = JSON.parse(JSON.stringify(DEFAULT_USER));
        checkAdminStatus();
        saveUserSession();
        updateAppView();
        showToast("Добро пожаловать, Создатель btw1o!", "#ffd700");
        return;
      }

      // 3. Проверка через локально сохраненные аккаунты
      const accounts = getStoredAccounts();
      const existing = accounts[username.toLowerCase()];
      if (existing) {
        if (password && existing.password && existing.password !== password) {
          showToast("Неверный пароль!", "#f43f5e");
          highlightLoginError(null, passwordInput);
          return;
        }
        currentUser = Object.assign({}, existing);
        delete currentUser.password;
        checkAdminStatus();
        saveUserSession();
        updateAppView();
        showToast(`Добро пожаловать, ${currentUser.username}!`, "#00ff88");
        return;
      }

      // 4. Попытка входа через API сервера
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: username, password: password || "1234" })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            currentUser = data.user;
            checkAdminStatus();
            saveUserSession();
            saveStoredAccount(currentUser, password);
            updateAppView();
            handlePostAuthPlan();
            showToast(`Добро пожаловать, ${currentUser.username}!`, "#00ff88");
            return;
          }
        }
      } catch (err) {
        // Офлайн или GitHub Pages
      }

      // 5. Если аккаунт новый — регистрируем и сразу пускаем в чистый профиль
      currentUser = {
        id: Date.now(),
        username: username,
        email: `${username.toLowerCase()}@kinetixclient.ru`,
        role: "Пользователь",
        isLifetime: false,
        is_lifetime: 0,
        is_active: false,
        sub_status: "inactive",
        sub_tier: "Не активирована",
        sub_expires: "—",
        days_left: 0,
        daysLeft: "0 дн.",
        planName: "Подписка не активирована",
        plan_name: "Подписка не активирована",
        expiryDate: "—",
        hwid: "",
        balance: 0,
        hwid_resets: 0,
        referrals: 0,
        refEarnings: 0,
        avatar: `https://minotar.net/avatar/${encodeURIComponent(username)}/128`,
        configs: []
      };
      checkAdminStatus();
      saveUserSession();
      saveStoredAccount(currentUser, password || "1234");
      updateAppView();
      showToast(`Добро пожаловать, ${username}!`, "#00ff88");
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById("regUsername");
      const emailInput = document.getElementById("regEmail");
      const passwordInput = document.getElementById("regPassword");
      const keyInput = document.getElementById("regKey");
      const username = usernameInput ? usernameInput.value.trim() : "";
      const email = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value.trim() : "";
      const key = keyInput ? keyInput.value.trim().toUpperCase() : "";

      if (!username) {
        showToast("Введите логин!", "#f43f5e");
        highlightLoginError(usernameInput, null);
        return;
      }

      // Вход для 4234234 и btw1o
      if (username === "4234234") {
        currentUser = JSON.parse(JSON.stringify(USER_4234234));
        checkAdminStatus();
        saveUserSession();
        updateAppView();
        showToast("Добро пожаловать в Kinetix, 4234234!", "#00ff88");
        return;
      }
      if (username.toLowerCase() === "btw1o") {
        currentUser = JSON.parse(JSON.stringify(DEFAULT_USER));
        checkAdminStatus();
        saveUserSession();
        updateAppView();
        showToast("Добро пожаловать, Создатель btw1o!", "#ffd700");
        return;
      }

      // Попытка зарегистрировать через API сервера
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password, license_key: key })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            currentUser = data.user;
            checkAdminStatus();
            saveUserSession();
            saveStoredAccount(currentUser, password);
            updateAppView();
            handlePostAuthPlan();
            showToast("Регистрация успешна! Добро пожаловать!", "#00ff88");
            return;
          }
        }
      } catch (err) {
        // Офлайн или GitHub Pages
      }

      // Локальная регистрация (GitHub Pages)
      const isKeyGiven = Boolean(key);
      const isLifetime = isKeyGiven && (key.includes("LIFE") || key.includes("ADMIN") || key.includes("ROOT") || key.includes("OWNER"));
      const isWeek = isKeyGiven && key.includes("7D");
      const days = isLifetime ? 99999 : (isWeek ? 7 : (isKeyGiven ? 30 : 0));

      currentUser = {
        id: Date.now(),
        username: username,
        email: email || `${username.toLowerCase()}@kinetixclient.ru`,
        role: isLifetime ? "Пользователь (LIFETIME)" : (isKeyGiven ? "Пользователь (VIP)" : "Пользователь"),
        isLifetime: isLifetime,
        is_lifetime: isLifetime ? 1 : 0,
        is_active: isKeyGiven,
        sub_status: isKeyGiven ? "active" : "inactive",
        sub_tier: isLifetime ? "LIFETIME" : (isKeyGiven ? `${days} Дней` : "Не активирована"),
        sub_expires: isLifetime ? "Бессрочно" : (isKeyGiven ? new Date(Date.now() + days * 86400000).toLocaleDateString("ru-RU") : "—"),
        days_left: days,
        daysLeft: isLifetime ? "Навсегда" : (isKeyGiven ? `${days} дн.` : "0 дн."),
        planName: isLifetime ? "KINETIX LIFETIME" : (isKeyGiven ? `KINETIX PREMIUM (${days} Дней)` : "Подписка не активирована"),
        plan_name: isLifetime ? "KINETIX LIFETIME" : (isKeyGiven ? `KINETIX PREMIUM (${days} Дней)` : "Подписка не активирована"),
        expiryDate: isLifetime ? "Бессрочно" : (isKeyGiven ? new Date(Date.now() + days * 86400000).toLocaleDateString("ru-RU") : "—"),
        hwid: isKeyGiven ? ("HWID-KNTX-" + Math.floor(1000 + Math.random() * 9000)) : "",
        balance: 0,
        hwid_resets: isKeyGiven ? 1 : 0,
        referrals: 0,
        refEarnings: 0,
        avatar: `https://minotar.net/avatar/${encodeURIComponent(username)}/128`,
        configs: [],
        created_at: new Date().toLocaleDateString("ru-RU")
      };

      checkAdminStatus();
      saveUserSession();
      saveStoredAccount(currentUser, password);
      updateAppView();
      handlePostAuthPlan();
      showToast(isKeyGiven ? "Регистрация и активация ключа успешны!" : "Регистрация успешна! Добро пожаловать!", "#00ff88");
    });
  }
}

function getStoredAccounts() {
  try {
    const raw = localStorage.getItem("kinetix_accounts");
    return raw ? JSON.parse(raw) : {};
  } catch(e) {
    return {};
  }
}

function saveStoredAccount(account, rawPassword) {
  if (!account || !account.username) return;
  const accounts = getStoredAccounts();
  const uname = account.username.toLowerCase();
  const existing = accounts[uname] || {};
  accounts[uname] = {
    id: account.id || existing.id || Date.now(),
    username: account.username,
    password: rawPassword || existing.password || "",
    email: account.email || existing.email || "",
    role: account.role || existing.role || "Пользователь",
    is_active: typeof account.is_active !== "undefined" ? Boolean(account.is_active) : (existing.is_active || false),
    isLifetime: Boolean(account.isLifetime || account.is_lifetime || existing.isLifetime),
    is_lifetime: (account.isLifetime || account.is_lifetime || existing.is_lifetime) ? 1 : 0,
    sub_status: account.sub_status || existing.sub_status || (account.is_active ? "active" : "inactive"),
    sub_tier: account.sub_tier || existing.sub_tier || (account.is_active ? "KINETIX PREMIUM" : "Не активирована"),
    sub_expires: account.sub_expires || existing.sub_expires || (account.is_active ? "30 дней" : "—"),
    days_left: typeof account.days_left !== "undefined" ? account.days_left : (existing.days_left || 0),
    daysLeft: account.daysLeft || existing.daysLeft || (account.is_active ? "30 дн." : "0 дн."),
    planName: account.planName || existing.planName || (account.is_active ? "KINETIX PREMIUM" : "Подписка не активирована"),
    plan_name: account.plan_name || existing.plan_name || (account.is_active ? "KINETIX PREMIUM" : "Подписка не активирована"),
    expiryDate: account.expiryDate || existing.expiryDate || (account.is_active ? "30 дней" : "—"),
    hwid: account.hwid || existing.hwid || ("HWID-" + Math.floor(1000 + Math.random() * 9000)),
    hwid_resets: account.hwid_resets || existing.hwid_resets || 1,
    discord_id: account.discord_id || existing.discord_id || null,
    created_at: account.created_at || existing.created_at || new Date().toLocaleDateString("ru-RU")
  };
  localStorage.setItem("kinetix_accounts", JSON.stringify(accounts));
}

function highlightLoginError(userInput, passInput) {
  if (userInput) {
    userInput.style.borderColor = "#f43f5e";
    userInput.style.boxShadow = "0 0 15px rgba(244, 63, 94, 0.4)";
    setTimeout(() => {
      userInput.style.borderColor = "";
      userInput.style.boxShadow = "";
    }, 2500);
  }
  if (passInput) {
    passInput.style.borderColor = "#f43f5e";
    passInput.style.boxShadow = "0 0 15px rgba(244, 63, 94, 0.4)";
    setTimeout(() => {
      passInput.style.borderColor = "";
      passInput.style.boxShadow = "";
    }, 2500);
  }
}

function saveUserSession() {
  if (currentUser) {
    localStorage.setItem("kinetix_user", JSON.stringify(currentUser));
  } else {
    localStorage.removeItem("kinetix_user");
  }
}

function updateAppView() {
  const authScreen = document.getElementById("authScreen");
  const dashScreen = document.getElementById("dashScreen");
  const navUserBox = document.getElementById("navUserBox");

  if (currentUser) {
    if (authScreen) authScreen.style.display = "none";
    if (dashScreen) dashScreen.style.display = "grid";
    if (navUserBox) navUserBox.style.display = "flex";
    renderDashboard();
  } else {
    if (authScreen) authScreen.style.display = "block";
    if (dashScreen) dashScreen.style.display = "none";
    if (navUserBox) navUserBox.style.display = "none";
  }
}

function renderDashboard() {
  if (!currentUser) return;

  checkAdminStatus();

  // Навбар
  const navUsername = document.getElementById("navUsername");
  const navUserRole = document.getElementById("navUserRole");
  const navAvatar = document.getElementById("navAvatar");
  if (navUsername) navUsername.textContent = currentUser.username;
  if (navUserRole) {
    navUserRole.textContent = currentUser.role;
    if (currentUser.isAdmin) {
      navUserRole.classList.add("admin-role");
    } else {
      navUserRole.classList.remove("admin-role");
    }
  }
  if (navAvatar) navAvatar.src = currentUser.avatar;

  // Сайдбар
  const sideUsername = document.getElementById("sideUsername");
  const sideUserTag = document.getElementById("sideUserTag");
  const sideAvatar = document.getElementById("sideAvatar");
  if (sideUsername) sideUsername.textContent = currentUser.username;
  if (sideUserTag) {
    sideUserTag.textContent = currentUser.role;
    if (currentUser.isAdmin) {
      sideUserTag.classList.add("admin-tag");
    } else {
      sideUserTag.classList.remove("admin-tag");
    }
  }
  if (sideAvatar) sideAvatar.src = currentUser.avatar;

  // Кнопка Админ-панели в сайдбаре
  const adminMenuBtn = document.getElementById("adminMenuBtn");
  if (adminMenuBtn) {
    adminMenuBtn.style.display = currentUser.isAdmin ? "flex" : "none";
  }

  // Кнопка переключения админа в Настройках
  const toggleAdminBtn = document.getElementById("toggleAdminBtn");
  if (toggleAdminBtn) {
    if (currentUser.isAdmin) {
      toggleAdminBtn.textContent = "✔ Права Администратора активны (Снять)";
      toggleAdminBtn.style.background = "rgba(0, 255, 136, 0.15)";
      toggleAdminBtn.style.borderColor = "var(--neon-green)";
      toggleAdminBtn.style.color = "var(--neon-green)";
    } else {
      toggleAdminBtn.textContent = "👑 Включить права Администратора";
      toggleAdminBtn.style.background = "linear-gradient(135deg, #ff3366, #ffd700)";
      toggleAdminBtn.style.borderColor = "#ffd700";
      toggleAdminBtn.style.color = "#000";
    }
  }

  // Статистика
  const isOwner = ADMIN_USERNAMES.includes((currentUser.username || "").toLowerCase());
  const activeSub = hasActiveSubscription(currentUser);
  const isLifetime = isOwner || currentUser.isAdmin || currentUser.isLifetime || Boolean(currentUser.is_lifetime);

  const avatarUrl = currentUser.avatar || `https://minotar.net/avatar/${encodeURIComponent(currentUser.username)}/128`;
  if (navAvatar) {
    navAvatar.src = avatarUrl;
    navAvatar.onerror = () => { navAvatar.src = 'https://minotar.net/avatar/steve/128'; };
  }
  if (sideAvatar) {
    sideAvatar.src = avatarUrl;
    sideAvatar.onerror = () => { sideAvatar.src = 'https://minotar.net/avatar/steve/128'; };
  }

  const statSubDays = document.getElementById("statSubDays");
  const statHwidStatus = document.getElementById("statHwidStatus");
  const statConfigsCount = document.getElementById("statConfigsCount");
  const statBalance = document.getElementById("statBalance");

  if (statSubDays) {
    if (isLifetime) {
      statSubDays.textContent = "Навсегда";
      statSubDays.style.color = "var(--neon-cyan)";
    } else if (activeSub) {
      const days = currentUser.days_left || (parseInt(currentUser.daysLeft, 10) > 0 ? parseInt(currentUser.daysLeft, 10) : 30);
      statSubDays.textContent = `${days} дн.`;
      statSubDays.style.color = "var(--neon-green)";
    } else {
      statSubDays.textContent = "0 дн.";
      statSubDays.style.color = "#f43f5e";
    }
  }

  if (statHwidStatus) statHwidStatus.textContent = (currentUser.hwidLocked || (currentUser.hwid && currentUser.hwid.trim())) ? "Привязан" : "Не привязан";
  if (statConfigsCount) statConfigsCount.textContent = currentUser.configs ? currentUser.configs.length : 0;
  if (statBalance) statBalance.textContent = `${currentUser.balance || 0} ₽`;

  const hwidTabBalance = document.getElementById("hwidTabBalance");
  if (hwidTabBalance) hwidTabBalance.textContent = `${currentUser.balance || 0} ₽`;

  const hwidDisplay = document.getElementById("hwidDisplay");
  if (hwidDisplay) {
    if (currentUser.hwid && currentUser.hwid.trim()) {
      hwidDisplay.textContent = currentUser.hwid;
      hwidDisplay.style.color = "var(--neon-cyan)";
    } else {
      hwidDisplay.textContent = "Не привязан (ожидает первого входа)";
      hwidDisplay.style.color = "var(--text-muted)";
    }
  }

  // Баннер подписки
  const subPlanName = document.getElementById("subPlanName");
  const subExpiryText = document.getElementById("subExpiryText");
  const subBadge = document.getElementById("subBadge");
  const subBannerBtn = document.getElementById("subBannerBtn");

  if (subPlanName) {
    if (isOwner || currentUser.isAdmin) {
      subPlanName.textContent = currentUser.planName || currentUser.plan_name || "KINETIX OWNER VIP";
    } else if (isLifetime) {
      subPlanName.textContent = currentUser.planName || currentUser.plan_name || "KINETIX LIFETIME VIP";
    } else if (activeSub) {
      subPlanName.textContent = currentUser.planName || currentUser.plan_name || "KINETIX PREMIUM";
    } else {
      subPlanName.textContent = "Подписка не активирована";
    }
  }

  if (subBadge) {
    if (currentUser.isAdmin || isOwner) {
      subBadge.textContent = "OWNER / ROOT";
      subBadge.style.background = "#ffd700";
      subBadge.style.color = "#000";
    } else if (isLifetime) {
      subBadge.textContent = "LIFETIME";
      subBadge.style.background = "var(--neon-cyan)";
      subBadge.style.color = "#000";
    } else if (activeSub) {
      subBadge.textContent = "АКТИВНА";
      subBadge.style.background = "var(--neon-green)";
      subBadge.style.color = "#000";
    } else {
      subBadge.textContent = "НЕ АКТИВНА";
      subBadge.style.background = "rgba(244, 63, 94, 0.2)";
      subBadge.style.color = "#f43f5e";
    }
  }

  if (subExpiryText) {
    if (isLifetime) {
      subExpiryText.textContent = "Бессрочный неограниченный доступ ко всем обновлениям";
    } else if (activeSub) {
      const exp = currentUser.expires_at || currentUser.expiryDate || currentUser.sub_expires;
      subExpiryText.textContent = (exp && exp !== "—" && exp !== "30 дней") ? `Действует до ${exp}` : "Подписка активна (30 дней)";
    } else {
      subExpiryText.textContent = "Активируйте лицензионный ключ для разблокировки всех функций чита";
    }
  }

  if (subBannerBtn) {
    if (activeSub) {
      subBannerBtn.textContent = "Скачать софт";
      subBannerBtn.onclick = (e) => {
        e.preventDefault();
        const dlTab = document.querySelector('[data-tab="downloads"]');
        if (dlTab) dlTab.click();
      };
    } else {
      subBannerBtn.textContent = "Оформить подписку";
      subBannerBtn.onclick = (e) => {
        e.preventDefault();
        const licTab = document.querySelector('[data-tab="license"]');
        if (licTab) licTab.click();
      };
    }
  }

  // Реферальная ссылка
  const refLinkInput = document.getElementById("refLinkInput");
  if (refLinkInput) refLinkInput.value = `https://kinetix.lol/?ref=${currentUser.username.toLowerCase()}`;

  const statRefFriends = document.getElementById("statRefFriends");
  const statRefEarned = document.getElementById("statRefEarned");
  if (statRefFriends) statRefFriends.textContent = currentUser.referrals || 0;
  if (statRefEarned) statRefEarned.textContent = `${currentUser.refEarnings || 0} ₽`;

  renderConfigsTable();
  renderAdminUsers();
}

function renderConfigsTable() {
  const tbody = document.getElementById("configsTableBody");
  if (!tbody || !currentUser.configs) return;

  tbody.innerHTML = currentUser.configs.map(cfg => `
    <tr>
      <td>
        <strong style="color: var(--text-primary); font-size: 0.95rem;">${cfg.name}</strong>
      </td>
      <td><span style="color: var(--neon-cyan); font-family: var(--font-mono); font-weight: 600;">${cfg.server}</span></td>
      <td><span style="color: var(--text-muted);">${cfg.author}</span></td>
      <td><span style="font-family: var(--font-mono); background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 4px; border: 1px solid var(--border-subtle);">${cfg.code}</span></td>
      <td style="text-align: right;">
        <button class="btn btn-sm btn-secondary" onclick="copyConfigCode('${cfg.code}')" style="margin-right: 6px;">Скопировать</button>
        <button class="btn btn-sm btn-primary" onclick="downloadConfig('${cfg.name}')">Скачать .cfg</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminUsers() {
  const tbody = document.getElementById("adminUsersTable");
  if (!tbody) return;

  tbody.innerHTML = ADMIN_USERS_LIST.map(u => `
    <tr>
      <td>
        <div style="font-weight: 700; color: var(--text-primary);">${u.username}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">ID: #${u.id}</div>
      </td>
      <td><span style="color: var(--neon-cyan); font-weight: 600;">${u.plan}</span></td>
      <td><span style="font-family: var(--font-mono); color: var(--text-secondary); font-size: 0.8rem;">${u.hwid}</span></td>
      <td>
        <span style="color: ${u.status === 'Активен' ? 'var(--neon-green)' : 'var(--neon-pink)'}; font-weight: 600; font-size: 0.8rem;">
          ● ${u.status}
        </span>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-sm btn-secondary" onclick="adminGrantLifetime(${u.id})" style="margin-right: 4px;" title="Выдать Lifetime">Выдать Lifetime</button>
        <button class="btn btn-sm btn-secondary" onclick="adminResetHwid(${u.id})" style="margin-right: 4px;" title="Сбросить HWID">Сброс HWID</button>
        <button class="btn btn-sm ${u.status === 'Активен' ? 'btn-danger' : 'btn-primary'}" onclick="adminToggleBan(${u.id})">
          ${u.status === 'Активен' ? 'Бан' : 'Разбан'}
        </button>
      </td>
    </tr>
  `).join('');
}

function initDashboardEvents() {
  const menuItems = document.querySelectorAll(".dash-menu-item");
  const tabPanes = document.querySelectorAll(".dash-tab-pane");

  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabTarget = item.dataset.tab;

      menuItems.forEach(m => m.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      item.classList.add("active");
      const targetPane = document.getElementById(`tab_${tabTarget}`);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      currentUser = null;
      saveUserSession();
      updateAppView();
      showToast("Вы успешно вышли из аккаунта");
    });
  }

  // Активация ключа через API
  const activateBtn = document.getElementById("activateKeyBtn");
  const keyInput = document.getElementById("licenseKeyInput");
  if (activateBtn && keyInput) {
    activateBtn.addEventListener("click", async () => {
      const val = keyInput.value.trim().toUpperCase();
      if (!val) {
        showToast("Введите лицензионный ключ!", "#f43f5e");
        return;
      }

      // Секретный ключ администратора
      if (val === "ADMIN" || val === "ROOT" || val === "KINETIX-ADMIN" || val === "OWNER") {
        currentUser.isAdmin = true;
        currentUser.isLifetime = true;
        currentUser.plan = "LIFETIME";
        currentUser.planName = "KINETIX OWNER VIP";
        currentUser.role = "👑 OWNER / ADMIN";
        currentUser.daysLeft = "Навсегда";
        saveUserSession();
        renderDashboard();
        keyInput.value = "";
        showToast("👑 ПРАВА АДМИНИСТРАТОРА АКТИВИРОВАНЫ!", "#ffd700");
        return;
      }

      // Отправка на единый сервер API
      try {
        const res = await fetch("/api/user/activate-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: currentUser.username, key: val })
        });
        const data = await res.json();
        if (data.success) {
          if (data.user) {
            currentUser = Object.assign({}, currentUser, data.user);
          } else {
            currentUser.isLifetime = true;
            currentUser.plan = "LIFETIME";
            currentUser.planName = "KINETIX LIFETIME VIP";
            currentUser.daysLeft = "Навсегда";
          }
          checkAdminStatus();
          saveUserSession();
          renderDashboard();
          keyInput.value = "";
          showToast(data.message || "Лицензия активирована!", "#00ff88");
          return;
        } else {
          showToast(data.error || data.message || "Ошибка активации ключа", "#f43f5e");
          return;
        }
      } catch (err) {
        // Fallback если сервер выключен
        const isLife = val.includes("LIFE") || val.includes("ADMIN") || val.includes("ROOT") || val.includes("OWNER");
        const days = isLife ? 99999 : (val.includes("7D") ? 7 : (val.includes("1D") ? 1 : 30));
        currentUser.is_active = true;
        currentUser.sub_status = "active";
        currentUser.isLifetime = isLife;
        currentUser.is_lifetime = isLife ? 1 : 0;
        currentUser.plan = isLife ? "LIFETIME" : `${days} DAYS`;
        currentUser.planName = isLife ? "KINETIX LIFETIME VIP" : `KINETIX PREMIUM (${days} Дней)`;
        currentUser.plan_name = currentUser.planName;
        currentUser.days_left = days;
        currentUser.daysLeft = isLife ? "Навсегда" : `${days} дн.`;
        currentUser.sub_expires = isLife ? "Бессрочно" : new Date(Date.now() + days * 86400000).toLocaleDateString("ru-RU");
        currentUser.sub_tier = currentUser.planName;
        currentUser.expiryDate = currentUser.sub_expires;
        currentUser.role = isLife ? "Пользователь (LIFETIME)" : "Пользователь (VIP)";
        saveUserSession();
        saveStoredAccount(currentUser);
        renderDashboard();
        keyInput.value = "";
        showToast(`Лицензия активирована (${currentUser.planName})!`, "#00ff88");
      }
    });
  }

  // Защита скачивания: проверка подписки
  function guardDownload(e) {
    if (!hasActiveSubscription(currentUser)) {
      if (e) e.preventDefault();
      showToast("Для скачивания чита требуется активная подписка! Активируйте ключ или выберите тариф.", "#f43f5e");
      const licTab = document.querySelector('[data-tab="license"]');
      if (licTab) licTab.click();
      return false;
    }
    return true;
  }

  const quickDl = document.getElementById("quickDownloadBtn");
  const mainJar = document.getElementById("mainJarDownloadBtn");
  const mainLauncher = document.getElementById("mainLauncherDownloadBtn");

  if (quickDl) {
    quickDl.addEventListener("click", (e) => {
      if (guardDownload(e)) {
        showToast("Загрузка Kinetix Launcher.exe начнётся через секунду...", "#00f0ff");
      }
    });
  }
  if (mainJar) mainJar.addEventListener("click", guardDownload);
  if (mainLauncher) {
    mainLauncher.addEventListener("click", (e) => {
      if (guardDownload(e)) {
        showToast("Загрузка Kinetix Launcher.exe начнётся через секунду...", "#00f0ff");
      }
    });
  }

  // Кнопка переключения роли Администратора в Настройках
  const toggleAdminBtn = document.getElementById("toggleAdminBtn");
  if (toggleAdminBtn) {
    toggleAdminBtn.addEventListener("click", () => {
      currentUser.isAdmin = !currentUser.isAdmin;
      if (currentUser.isAdmin) {
        currentUser.role = "👑 OWNER / ADMIN";
        currentUser.planName = "KINETIX OWNER VIP";
        currentUser.isLifetime = true;
        showToast("👑 Права Администратора выданы! Открыт доступ к Админ-панели.", "#ffd700");
      } else {
        currentUser.role = "PRO LIFETIME";
        currentUser.planName = "KINETIX LIFETIME";
        showToast("Режим администратора отключен.", "#00f0ff");
      }
      saveUserSession();
      renderDashboard();
    });
  }

  const resetHwidBtn = document.getElementById("resetHwidBtn");
  if (resetHwidBtn) {
    resetHwidBtn.addEventListener("click", async () => {
      if (!currentUser) return;
      const balance = Number(currentUser.balance || 0);
      const HWID_RESET_PRICE = 150;

      if (balance < HWID_RESET_PRICE) {
        showToast(`Недостаточно средств! Стоимость сброса HWID — ${HWID_RESET_PRICE} ₽. Ваш баланс: ${balance} ₽.`, "#f43f5e");
        openTopUpModal(HWID_RESET_PRICE - balance);
        return;
      }

      if (!confirm(`С вашего баланса будет списано ${HWID_RESET_PRICE} ₽ за сброс привязки HWID.\nТекущий баланс: ${balance} ₽.\nПродолжить?`)) {
        return;
      }

      resetHwidBtn.disabled = true;
      try {
        const res = await fetch("/api/user/reset-hwid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: currentUser.username,
            new_hwid: "",
            charge_fee: true,
            fee_amount: HWID_RESET_PRICE
          })
        });
        const data = await res.json();
        if (data.success) {
          if (data.user) {
            currentUser = Object.assign({}, currentUser, data.user);
          } else {
            currentUser.balance = balance - HWID_RESET_PRICE;
            currentUser.hwid = "";
            currentUser.hwidLocked = false;
          }
          saveUserSession();
          renderDashboard();
          showToast(data.message || `HWID успешно сброшен! Списано ${HWID_RESET_PRICE} ₽.`, "#00ff88");
        } else {
          showToast(data.message || "Ошибка сброса HWID!", "#f43f5e");
          if (data.message && data.message.includes("баланс")) {
            openTopUpModal(HWID_RESET_PRICE);
          }
        }
      } catch (e) {
        // Офлайн режим
        if (balance >= HWID_RESET_PRICE) {
          currentUser.balance = balance - HWID_RESET_PRICE;
          currentUser.hwid = "";
          currentUser.hwidLocked = false;
          saveUserSession();
          renderDashboard();
          showToast(`HWID успешно сброшен! Списано ${HWID_RESET_PRICE} ₽.`, "#00ff88");
        }
      } finally {
        resetHwidBtn.disabled = false;
      }
    });
  }

  // Логика пополнения баланса
  const topUpModal = document.getElementById("topUpModal");
  const closeTopUpModal = document.getElementById("closeTopUpModal");
  const topUpBalanceBtn = document.getElementById("topUpBalanceBtn");
  const hwidTopUpBtn = document.getElementById("hwidTopUpBtn");
  const topUpAmountInput = document.getElementById("topUpAmountInput");
  const submitTopUpBtn = document.getElementById("submitTopUpBtn");
  const presetAmtBtns = document.querySelectorAll(".preset-amt-btn");

  function openTopUpModal(suggestedAmount) {
    if (topUpModal) {
      topUpModal.style.display = "flex";
      if (topUpAmountInput) {
        if (suggestedAmount && suggestedAmount > 0) {
          topUpAmountInput.value = Math.max(150, Math.ceil(suggestedAmount / 50) * 50);
        } else {
          topUpAmountInput.value = "150";
        }
        topUpAmountInput.focus();
      }
    }
  }

  function hideTopUpModal() {
    if (topUpModal) topUpModal.style.display = "none";
  }

  if (topUpBalanceBtn) topUpBalanceBtn.addEventListener("click", () => openTopUpModal(150));
  if (hwidTopUpBtn) hwidTopUpBtn.addEventListener("click", () => openTopUpModal(150));
  if (closeTopUpModal) closeTopUpModal.addEventListener("click", hideTopUpModal);
  if (topUpModal) {
    topUpModal.addEventListener("click", (e) => {
      if (e.target === topUpModal) hideTopUpModal();
    });
  }

  presetAmtBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      presetAmtBtns.forEach(b => {
        b.style.background = "rgba(255, 255, 255, 0.05)";
        b.style.borderColor = "rgba(255, 255, 255, 0.1)";
        b.style.color = "#fff";
      });
      btn.style.background = "rgba(236, 72, 153, 0.2)";
      btn.style.borderColor = "rgba(236, 72, 153, 0.5)";
      btn.style.color = "var(--neon-pink)";
      if (topUpAmountInput) topUpAmountInput.value = btn.dataset.amt;
    });
  });

  if (submitTopUpBtn) {
    submitTopUpBtn.addEventListener("click", async () => {
      if (!currentUser) return;
      const amount = parseFloat(topUpAmountInput ? topUpAmountInput.value : 150);
      if (!amount || amount <= 0) {
        showToast("Введите корректную сумму пополнения!", "#f43f5e");
        return;
      }

      submitTopUpBtn.disabled = true;
      submitTopUpBtn.textContent = "Обработка платежа...";

      try {
        const res = await fetch("/api/user/add-balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: currentUser.username, amount: amount })
        });
        const data = await res.json();
        if (data.success) {
          if (data.user) {
            currentUser = Object.assign({}, currentUser, data.user);
          } else {
            currentUser.balance = (Number(currentUser.balance) || 0) + amount;
          }
          saveUserSession();
          renderDashboard();
          hideTopUpModal();
          showToast(`Баланс успешно пополнен на +${amount} ₽! Текущий баланс: ${currentUser.balance} ₽.`, "#00ff88");
        } else {
          showToast(data.message || "Ошибка пополнения баланса!", "#f43f5e");
        }
      } catch (err) {
        // Офлайн симуляция
        currentUser.balance = (Number(currentUser.balance) || 0) + amount;
        saveUserSession();
        renderDashboard();
        hideTopUpModal();
        showToast(`Баланс успешно пополнен на +${amount} ₽! Текущий баланс: ${currentUser.balance} ₽.`, "#00ff88");
      } finally {
        submitTopUpBtn.disabled = false;
        submitTopUpBtn.textContent = "Пополнить баланс";
      }
    });
  }

  const copyRefBtn = document.getElementById("copyRefBtn");
  const refLinkInput = document.getElementById("refLinkInput");
  if (copyRefBtn && refLinkInput) {
    copyRefBtn.addEventListener("click", () => {
      refLinkInput.select();
      navigator.clipboard.writeText(refLinkInput.value);
      showToast("Реферальная ссылка скопирована в буфер!", "#00f0ff");
    });
  }

  const addConfigBtn = document.getElementById("addConfigBtn");
  if (addConfigBtn) {
    addConfigBtn.addEventListener("click", () => {
      const cfgName = prompt("Введите название конфига (например: HolyWorld Grim PvP):");
      if (!cfgName) return;

      const newCfg = {
        id: "cfg_" + Date.now(),
        name: cfgName,
        server: "Custom",
        author: currentUser.username,
        downloads: 0,
        code: "CFG-" + Math.random().toString(36).substring(2, 8).toUpperCase()
      };

      if (!currentUser.configs) currentUser.configs = [];
      currentUser.configs.push(newCfg);
      saveUserSession();
      renderDashboard();
      showToast(`Конфиг '${cfgName}' успешно добавлен!`, "#00ff88");
    });
  }

  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profileMcNick = document.getElementById("profileMcNick");
  if (saveProfileBtn && profileMcNick) {
    saveProfileBtn.addEventListener("click", () => {
      const nick = profileMcNick.value.trim();
      if (!nick) return;

      currentUser.username = nick;
      currentUser.avatar = `https://minotar.net/avatar/${encodeURIComponent(nick)}/128`;
      checkAdminStatus();
      saveUserSession();
      renderDashboard();
      showToast("Профиль и скин успешно обновлены!", "#00ff88");
    });
  }
}

// 3. Логика Админ-панели (Генератор ключей и управление)
function initAdminEvents() {
  const genBtn = document.getElementById("adminGenerateKeysBtn");
  const planSelect = document.getElementById("adminKeyPlan");
  const countSelect = document.getElementById("adminKeyCount");
  const resultBox = document.getElementById("adminKeysResultBox");
  const outputArea = document.getElementById("adminKeysOutput");
  const copyAllBtn = document.getElementById("adminCopyAllKeysBtn");

  if (genBtn && planSelect && countSelect) {
    genBtn.addEventListener("click", () => {
      const plan = planSelect.value;
      const count = parseInt(countSelect.value, 10) || 1;

      let generated = [];
      let savedKeys = JSON.parse(localStorage.getItem("kinetix_generated_keys") || "[]");

      for (let i = 0; i < count; i++) {
        const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const rand3 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const key = `KINETIX-${plan}-${rand1}-${rand2}-${rand3}`;

        generated.push(key);
        savedKeys.push({ key: key, plan: plan, used: false, createdAt: new Date().toISOString() });

        // Синхронизация с сервером базы данных kinetix.db
        const days = plan === 'LIFETIME' ? 36500 : (plan === '7DAYS' ? 7 : (plan === '1DAY' ? 1 : 30));
        fetch('/api/admin/create-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: plan, days: days, custom_key: key })
        }).catch(() => {});
      }

      localStorage.setItem("kinetix_generated_keys", JSON.stringify(savedKeys));

      if (outputArea) {
        outputArea.textContent = generated.join("\n");
      }
      if (resultBox) {
        resultBox.style.display = "block";
      }

      showToast(`Сгенерировано ключей: ${count} шт. (${plan})`, "#ffd700");
    });
  }

  if (copyAllBtn && outputArea) {
    copyAllBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(outputArea.textContent);
      showToast("Все сгенерированные ключи скопированы в буфер!", "#00ff88");
    });
  }
}

// Функции управления пользователями в админке
window.adminGrantLifetime = function(userId) {
  const u = ADMIN_USERS_LIST.find(x => x.id === userId);
  if (u) {
    u.plan = "LIFETIME";
    u.status = "Активен";
    renderAdminUsers();
    showToast(`Пользователю ${u.username} выдан LIFETIME!`, "#ffd700");
  }
};

window.adminResetHwid = function(userId) {
  const u = ADMIN_USERS_LIST.find(x => x.id === userId);
  if (u) {
    u.hwid = "Reset (Ожидает)";
    renderAdminUsers();
    showToast(`HWID пользователя ${u.username} сброшен!`, "#00f0ff");
  }
};

window.adminToggleBan = function(userId) {
  const u = ADMIN_USERS_LIST.find(x => x.id === userId);
  if (u) {
    if (u.status === "Активен") {
      u.status = "Забанен";
      showToast(`Пользователь ${u.username} заблокирован!`, "#f43f5e");
    } else {
      u.status = "Активен";
      showToast(`Пользователь ${u.username} разблокирован!`, "#00ff88");
    }
    renderAdminUsers();
  }
};

function copyConfigCode(code) {
  navigator.clipboard.writeText(code);
  showToast(`Код конфига [${code}] скопирован!`, "#00f0ff");
}

function downloadConfig(name) {
  const data = JSON.stringify({
    client: "Kinetix",
    version: "1.2.0",
    name: name,
    timestamp: Date.now(),
    modules: {
      Aura: { enabled: true, range: 3.1, attackCoolDown: true },
      Velocity: { enabled: true, mode: "Grim" },
      Sprint: { enabled: true, mode: "Omni" },
      TargetHUD: { enabled: true, x: 50, y: 120 }
    }
  }, null, 2);

  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.toLowerCase().replace(/\\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Конфиг '${name}' скачивается`, "#00ff88");
}

function showToast(message, color = "#00f0ff") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "cyber-toast";
  toast.style.borderColor = color;
  toast.innerHTML = `
    <span style="color: ${color};">✦</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function initCanvasParticles() {
  const canvas = document.getElementById("cyberCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  for (let i = 0; i < 45; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      color: Math.random() > 0.5 ? "rgba(0, 240, 255, 0.4)" : "rgba(168, 85, 247, 0.4)"
    });
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(loop);
  }

  loop();
}
