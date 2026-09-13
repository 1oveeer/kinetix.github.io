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

// Пример пользователей для админ-панели
let ADMIN_USERS_LIST = [
  { id: 101, username: "Player1337", plan: "LIFETIME", hwid: "A1B2-C3D4-E5F6", status: "Активен" },
  { id: 102, username: "Steve228", plan: "30 Дней", hwid: "F9E8-D7C6-B5A4", status: "Активен" },
  { id: 103, username: "AlexPro", plan: "7 Дней", hwid: "33A1-77BC-99DF", status: "Активен" },
  { id: 104, username: "GriefMaster", plan: "Истёк", hwid: "None", status: "Не активен" },
  { id: 105, username: "DarkKnight", plan: "1 День", hwid: "88BB-44CC-11AA", status: "Активен" }
];

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  loadUserSession();
  initAuthEvents();
  initDashboardEvents();
  initAdminEvents();
  initCanvasParticles();
});

function loadUserSession() {
  const saved = localStorage.getItem("kinetix_user");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
    } catch(e) {
      currentUser = null;
    }
  }

  // Если сессии ещё нет — по умолчанию запускаем аккаунт создателя
  if (!currentUser) {
    currentUser = JSON.parse(JSON.stringify(DEFAULT_USER));
    saveUserSession();
  }

  // Проверка никнейма на права админа
  checkAdminStatus();
  updateAppView();
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
    if (dashScreen) dashScreen.style.display = "block";
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
  const statSubDays = document.getElementById("statSubDays");
  const statHwidStatus = document.getElementById("statHwidStatus");
  const statConfigsCount = document.getElementById("statConfigsCount");
  const statBalance = document.getElementById("statBalance");

  if (statSubDays) statSubDays.textContent = currentUser.isLifetime ? "Навсегда" : `${currentUser.daysLeft} дн.`;
  if (statHwidStatus) statHwidStatus.textContent = currentUser.hwidLocked ? "Привязан" : "Не привязан";
  if (statConfigsCount) statConfigsCount.textContent = currentUser.configs ? currentUser.configs.length : 0;
  if (statBalance) statBalance.textContent = `${currentUser.balance} ₽`;

  // Баннер подписки
  const subPlanName = document.getElementById("subPlanName");
  const subExpiryText = document.getElementById("subExpiryText");
  const subBadge = document.getElementById("subBadge");

  if (subPlanName) subPlanName.textContent = currentUser.planName || "KINETIX OWNER VIP";
  if (subBadge) {
    if (currentUser.isAdmin) {
      subBadge.textContent = "OWNER / ROOT";
      subBadge.style.background = "#ffd700";
      subBadge.style.color = "#000";
    } else {
      subBadge.textContent = currentUser.isLifetime ? "LIFETIME" : "АКТИВНА";
      subBadge.style.background = "var(--neon-cyan)";
      subBadge.style.color = "#000";
    }
  }
  if (subExpiryText) {
    subExpiryText.textContent = currentUser.isLifetime 
      ? "Бессрочный неограниченный доступ ко всем обновлениям" 
      : `Действует до ${currentUser.expiryDate || '30 дней'}`;
  }

  // HWID
  const hwidDisplay = document.getElementById("hwidDisplay");
  if (hwidDisplay) hwidDisplay.textContent = currentUser.hwid || "Не определен";

  // Реферальная ссылка
  const refLinkInput = document.getElementById("refLinkInput");
  if (refLinkInput) refLinkInput.value = `https://kinetix.lol/?ref=${currentUser.username.toLowerCase()}`;

  const statRefFriends = document.getElementById("statRefFriends");
  const statRefEarned = document.getElementById("statRefEarned");
  if (statRefFriends) statRefFriends.textContent = currentUser.referrals;
  if (statRefEarned) statRefEarned.textContent = `${currentUser.refEarnings} ₽`;

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

  // Активация ключа (с поддержкой секретного ключа ADMIN)
  const activateBtn = document.getElementById("activateKeyBtn");
  const keyInput = document.getElementById("licenseKeyInput");
  if (activateBtn && keyInput) {
    activateBtn.addEventListener("click", () => {
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

      // Проверка ключей из локального хранилища сгенерированных ключей
      let validKeys = JSON.parse(localStorage.getItem("kinetix_generated_keys") || "[]");
      let foundKey = validKeys.find(k => k.key === val && !k.used);

      if (foundKey) {
        foundKey.used = true;
        localStorage.setItem("kinetix_generated_keys", JSON.stringify(validKeys));

        currentUser.isLifetime = foundKey.plan === "LIFETIME";
        currentUser.plan = foundKey.plan;
        currentUser.planName = `KINETIX ${foundKey.plan} VIP`;
        currentUser.role = foundKey.plan === "LIFETIME" ? "PRO LIFETIME" : "VIP USER";
        currentUser.daysLeft = foundKey.plan === "LIFETIME" ? "Навсегда" : 30;
      } else {
        // Любой другой ключ также активирует Lifetime
        currentUser.isLifetime = true;
        currentUser.plan = "LIFETIME";
        currentUser.planName = "KINETIX LIFETIME VIP";
        currentUser.role = "PRO LIFETIME";
        currentUser.daysLeft = "Навсегда";
      }

      saveUserSession();
      renderDashboard();
      keyInput.value = "";
      showToast("Успешно! Лицензия активирована!", "#00ff88");
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
    resetHwidBtn.addEventListener("click", () => {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      currentUser.hwid = `B4F8-79C1-${randomPart}-4D02`;
      currentUser.hwidLocked = true;
      saveUserSession();
      renderDashboard();
      showToast("HWID успешно сброшен и привязан к текущему ПК!", "#00ff88");
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

function initAuthEvents() {
  const tabLogin = document.getElementById("tabLoginBtn");
  const tabRegister = document.getElementById("tabRegisterBtn");
  const formLogin = document.getElementById("loginForm");
  const formRegister = document.getElementById("registerForm");

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener("click", () => {
      tabLogin.classList.add("active");
      tabRegister.classList.remove("active");
      formLogin.style.display = "block";
      formRegister.style.display = "none";
    });

    tabRegister.addEventListener("click", () => {
      tabRegister.classList.add("active");
      tabLogin.classList.remove("active");
      formLogin.style.display = "none";
      formRegister.style.display = "block";
    });
  }

  const demoLoginBtn = document.getElementById("demoLoginBtn");
  if (demoLoginBtn) {
    demoLoginBtn.addEventListener("click", () => {
      currentUser = JSON.parse(JSON.stringify(DEFAULT_USER));
      currentUser.isAdmin = true;
      saveUserSession();
      updateAppView();
      showToast("👑 Вход в режиме Администратора выполнен!", "#ffd700");
    });
  }

  if (formLogin) {
    formLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      const loginUser = document.getElementById("loginUsername").value.trim();
      if (!loginUser) {
        showToast("Введите логин!", "#f43f5e");
        return;
      }

      currentUser = JSON.parse(JSON.stringify(DEFAULT_USER));
      currentUser.username = loginUser;
      currentUser.avatar = `https://minotar.net/avatar/${encodeURIComponent(loginUser)}/128`;
      checkAdminStatus();
      saveUserSession();
      updateAppView();
      showToast(`С возвращением, ${loginUser}!`, "#00ff88");
    });
  }

  if (formRegister) {
    formRegister.addEventListener("submit", (e) => {
      e.preventDefault();
      const regUser = document.getElementById("regUsername").value.trim();
      const regEmail = document.getElementById("regEmail").value.trim();
      const regKey = document.getElementById("regKey").value.trim();

      if (!regUser) {
        showToast("Укажите ваш логин!", "#f43f5e");
        return;
      }

      currentUser = JSON.parse(JSON.stringify(DEFAULT_USER));
      currentUser.username = regUser;
      currentUser.email = regEmail || `${regUser}@gmail.com`;
      currentUser.avatar = `https://minotar.net/avatar/${encodeURIComponent(regUser)}/128`;
      
      if (regKey && (regKey.toUpperCase() === "ADMIN" || regKey.toUpperCase() === "ROOT")) {
        currentUser.isAdmin = true;
        currentUser.role = "👑 OWNER / ADMIN";
      } else if (regKey) {
        currentUser.isLifetime = true;
        currentUser.role = "PRO LIFETIME";
        currentUser.planName = "KINETIX LIFETIME";
      } else {
        currentUser.isLifetime = false;
        currentUser.daysLeft = 3;
        currentUser.role = "TRIAL USER";
        currentUser.planName = "Тестовый доступ (3 дня)";
      }

      checkAdminStatus();
      saveUserSession();
      updateAppView();
      showToast(`Регистрация успешна! Добро пожаловать, ${regUser}!`, "#00ff88");
    });
  }
}

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
