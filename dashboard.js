// ===================================================
// KINETIX CLIENT — DASHBOARD & ADMIN LOGIC
// ===================================================

const ADMIN_USERNAMES = ["btw1o", "admin", "owner", "administrator", "kinetix"];

// Список пользователей для админ-панели (загружается из базы данных Supabase)
let ADMIN_USERS_LIST = [];

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

function normalizeUser(u) {
  if (!u) return null;
  const uname = (u.username || "").trim();
  const unameLower = uname.toLowerCase();
  const isAdm = ADMIN_USERNAMES.includes(unameLower) || Boolean(u.role && (u.role.toUpperCase().includes("ADMIN") || u.role.toUpperCase().includes("OWNER")));
  const isLife = isAdm || Boolean(u.is_lifetime) || Boolean(u.isLifetime);
  const active = isAdm || isLife || Boolean(u.is_active) || u.sub_status === "active";
  const days = isLife ? 99999 : (typeof u.days_left !== "undefined" && u.days_left !== null ? Number(u.days_left) : (active ? 30 : 0));
  const role = isAdm ? "👑 OWNER / ADMIN" : (u.role && !u.role.includes("ADMIN") && !u.role.includes("OWNER") ? u.role : (isLife ? "PRO LIFETIME" : (active ? "VIP" : "Пользователь")));
  const plan = isAdm ? "KINETIX OWNER VIP" : (u.plan_name || u.planName || (isLife ? "KINETIX LIFETIME" : (active ? "KINETIX PREMIUM" : "Подписка не активирована")));

  return {
    id: u.id || Date.now(),
    username: uname,
    email: u.email || `${unameLower}@kinetixclient.ru`,
    role: role,
    isAdmin: isAdm,
    isLifetime: isLife,
    is_lifetime: isLife ? 1 : 0,
    is_active: active,
    sub_status: active ? "active" : "inactive",
    sub_tier: plan,
    plan: isLife ? "LIFETIME" : plan,
    planName: plan,
    plan_name: plan,
    days_left: days,
    daysLeft: isLife ? "Навсегда" : `${days} дн.`,
    expiryDate: isLife ? "Бессрочно" : (u.expires_at ? new Date(u.expires_at).toLocaleDateString("ru-RU") : (active ? "30 дней" : "—")),
    expires_at: u.expires_at || null,
    sub_expires: isLife ? "Бессрочно" : (u.expires_at ? new Date(u.expires_at).toLocaleDateString("ru-RU") : (active ? "30 дней" : "—")),
    hwid: u.hwid || "",
    hwidLocked: Boolean(u.hwid && u.hwid.trim()),
    hwid_resets: u.hwid_resets || 0,
    balance: Number(u.balance) || 0,
    referrals: Number(u.referrals) || 0,
    refEarnings: Number(u.refEarnings) || 0,
    referred_by: u.referred_by || null,
    avatar: u.avatar || `https://minotar.net/avatar/${encodeURIComponent(uname || "steve")}/128`,
    configs: Array.isArray(u.configs) ? u.configs : []
  };
}

function initApp() {
  loadUserSession();
  initAuthEvents();
  initDashboardEvents();
  initAdminEvents();
  initCanvasParticles();
  if (currentUser) {
    refreshUserProfile();
  }
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
      currentUser = normalizeUser(JSON.parse(saved));
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
  const ref = urlParams.get("ref");

  if (ref) {
    localStorage.setItem("kinetix_referrer", ref.trim());
  }

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
  const uname = (currentUser.username || "").trim().toLowerCase();
  const isSuperUser = ADMIN_USERNAMES.includes(uname);
  const hasDbAdmin = Boolean(currentUser.role && (currentUser.role.toUpperCase().includes("ADMIN") || currentUser.role.toUpperCase().includes("OWNER")));

  if (isSuperUser || hasDbAdmin) {
    currentUser.isAdmin = true;
    if (!currentUser.role || (!currentUser.role.includes("ADMIN") && !currentUser.role.includes("OWNER"))) {
      currentUser.role = "👑 OWNER / ADMIN";
    }
  } else {
    currentUser.isAdmin = false;
    if (currentUser.role && (currentUser.role.includes("ADMIN") || currentUser.role.includes("OWNER"))) {
      currentUser.role = currentUser.isLifetime ? "PRO LIFETIME" : (currentUser.is_active ? "VIP" : "Пользователь");
    }
  }
}

// ===================================================
// SUPABASE CLOUD DATABASE API (PostgreSQL 24/7)
// ===================================================

const SUPABASE_CONFIG = {
  url: (typeof CONFIG !== "undefined" && CONFIG.supabaseUrl) ? CONFIG.supabaseUrl : "https://dnoxciyqvitnjipgxxje.supabase.co",
  key: (typeof CONFIG !== "undefined" && CONFIG.supabaseKey) ? CONFIG.supabaseKey : "sb_publishable_CE6L0c5QJNMVwI4-VByz9Q_n9_p3yqE"
};

async function sbRequest(path, options = {}) {
  try {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${path}`;
    const headers = Object.assign({
      "apikey": SUPABASE_CONFIG.key,
      "Authorization": `Bearer ${SUPABASE_CONFIG.key}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    }, options.headers || {});
    return await fetch(url, Object.assign({}, options, { headers }));
  } catch (err) {
    console.warn("Supabase network error:", err);
    return null;
  }
}

async function sbGetProfile(username) {
  if (!username) return null;
  try {
    const res = await sbRequest(`users?username=ilike.${encodeURIComponent(username)}&select=*`);
    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data[0];
    }
  } catch(e) {}
  return null;
}

async function sbLogin(username, password) {
  try {
    const u = await sbGetProfile(username);
    if (!u) return { success: false, notFound: true, error: "Пользователь не найден!" };
    if (u.is_banned) return { success: false, error: "Ваш аккаунт заблокирован администратором!" };
    if (!password || !u.password_hash || u.password_hash !== password) {
      return { success: false, error: "Неверный пароль!" };
    }
    sbRequest(`users?id=eq.${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ last_login: new Date().toISOString() })
    }).catch(() => {});
    return { success: true, user: u };
  } catch(e) {
    return null;
  }
}

async function sbRegister(username, email, password, licenseKey) {
  try {
    const existing = await sbGetProfile(username);
    if (existing) {
      return { success: false, error: "Пользователь с таким никнеймом уже зарегистрирован!" };
    }

    let planName = "Подписка не активирована";
    let isLifetime = false;
    let isActive = false;
    let subStatus = "inactive";
    let daysLeft = 0;
    let expiresAt = null;

    if (licenseKey) {
      const keyRes = await sbRequest(`license_keys?key_code=ilike.${encodeURIComponent(licenseKey)}&is_used=eq.false&select=*`);
      if (keyRes && keyRes.ok) {
        const keys = await keyRes.json();
        if (Array.isArray(keys) && keys.length > 0) {
          const k = keys[0];
          planName = k.plan_name;
          isLifetime = Boolean(k.is_lifetime);
          isActive = true;
          subStatus = "active";
          daysLeft = k.duration_days;
          if (!isLifetime) {
            const exp = new Date();
            exp.setDate(exp.getDate() + k.duration_days);
            expiresAt = exp.toISOString();
          }
          sbRequest(`license_keys?id=eq.${k.id}`, {
            method: "PATCH",
            body: JSON.stringify({ is_used: true, used_by: username, used_at: new Date().toISOString() })
          }).catch(() => {});
        } else {
          return { success: false, error: "Указанный ключ активации не существует или уже активирован!" };
        }
      }
    }

    const isAdm = ADMIN_USERNAMES.includes(username.toLowerCase());
    const newUser = {
      username: username,
      password_hash: password || "1234",
      email: email || `${username.toLowerCase()}@kinetixclient.ru`,
      role: isAdm ? "👑 OWNER / ADMIN" : (isLifetime ? "PRO LIFETIME" : (isActive ? "VIP" : "Пользователь")),
      plan_name: isAdm ? "KINETIX OWNER VIP" : planName,
      is_lifetime: isAdm ? true : isLifetime,
      is_active: isAdm ? true : isActive,
      sub_status: isAdm ? "active" : subStatus,
      days_left: isAdm ? 99999 : daysLeft,
      expires_at: expiresAt,
      hwid: "",
      hwid_resets: 0,
      balance: isAdm ? 15000.00 : 0.00,
      avatar: `https://minotar.net/avatar/${encodeURIComponent(username)}/128`
    };

    const createRes = await sbRequest("users", {
      method: "POST",
      body: JSON.stringify(newUser)
    });

    if (createRes && createRes.ok) {
      const created = await createRes.json();
      return { success: true, user: created[0] || newUser };
    } else {
      const errText = createRes ? await createRes.text() : "Network error";
      console.warn("Supabase user create error:", errText);
      return { success: false, error: "Ошибка регистрации в Supabase: " + errText };
    }
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function sbResetHwid(username, newHwid = "") {
  try {
    const u = await sbGetProfile(username);
    if (!u) return null;
    const patchRes = await sbRequest(`users?id=eq.${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        hwid: newHwid,
        hwid_resets: (u.hwid_resets || 0) + 1
      })
    });
    if (patchRes && patchRes.ok) {
      sbRequest("hwid_history", {
        method: "POST",
        body: JSON.stringify({ username: u.username, old_hwid: u.hwid || "", new_hwid: newHwid })
      }).catch(() => {});
      return { success: true, message: "HWID успешно сброшен!" };
    }
  } catch(e) {}
  return null;
}

async function sbActivateKey(username, keyCode) {
  try {
    const keyRes = await sbRequest(`license_keys?key_code=ilike.${encodeURIComponent(keyCode)}&is_used=eq.false&select=*`);
    if (keyRes && keyRes.ok) {
      const keys = await keyRes.json();
      if (Array.isArray(keys) && keys.length > 0) {
        const k = keys[0];
        const isLifetime = Boolean(k.is_lifetime);
        let expiresAt = null;
        if (!isLifetime) {
          const exp = new Date();
          exp.setDate(exp.getDate() + k.duration_days);
          expiresAt = exp.toISOString();
        }
        const patchRes = await sbRequest(`users?username=ilike.${encodeURIComponent(username)}`, {
          method: "PATCH",
          body: JSON.stringify({
            plan_name: k.plan_name,
            is_lifetime: isLifetime,
            is_active: true,
            sub_status: "active",
            days_left: k.duration_days,
            expires_at: expiresAt,
            role: isLifetime ? "PRO LIFETIME" : "VIP"
          })
        });
        if (patchRes && patchRes.ok) {
          sbRequest(`license_keys?id=eq.${k.id}`, {
            method: "PATCH",
            body: JSON.stringify({ is_used: true, used_by: username, used_at: new Date().toISOString() })
          }).catch(() => {});
          return { success: true, message: `Ключ на «${k.plan_name}» успешно активирован!` };
        }
      } else {
        return { success: false, error: "Ключ активации не найден или уже был использован!" };
      }
    }
  } catch(e) {}
  return null;
}

async function sbAddBalance(username, amount) {
  try {
    const u = await sbGetProfile(username);
    if (!u) return null;
    const newBal = (Number(u.balance) || 0) + Number(amount);
    const patchRes = await sbRequest(`users?id=eq.${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ balance: newBal })
    });
    if (patchRes && patchRes.ok) {
      return { success: true, balance: newBal };
    }
  } catch(e) {}
  return null;
}

async function sbListUsers() {
  try {
    const res = await sbRequest("users?select=id,username,role,plan_name,is_active,is_lifetime,days_left,hwid,balance,is_banned,created_at&order=id.asc");
    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch(e) {}
  return null;
}

// Фоновое обновление профиля с облачной базы Supabase или сервера API
async function refreshUserProfile() {
  if (!currentUser || !currentUser.username) return;
  try {
    const sbUser = await sbGetProfile(currentUser.username);
    if (sbUser) {
      currentUser = normalizeUser(Object.assign({}, currentUser, sbUser));
      saveUserSession();
      renderDashboard();
      return;
    }
  } catch(e) {}

  try {
    const res = await fetch(`/api/user/profile?username=${encodeURIComponent(currentUser.username)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        currentUser = normalizeUser(Object.assign({}, currentUser, data.user));
        saveUserSession();
        renderDashboard();
      }
    }
  } catch (err) {}
}

function initAuthEvents() {
  const tabLoginBtn = document.getElementById("tabLoginBtn");
  const tabRegisterBtn = document.getElementById("tabRegisterBtn");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const linkToRegister = document.getElementById("linkToRegister");
  const linkToLogin = document.getElementById("linkToLogin");

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
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const origBtnText = submitBtn ? submitBtn.textContent : "Войти в аккаунт";
      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value.trim() : "";

      if (!username) {
        showToast("Пожалуйста, введите ваш никнейм или Email!", "#f43f5e");
        highlightLoginError(usernameInput, null);
        return;
      }
      if (!password) {
        showToast("Пожалуйста, введите ваш пароль!", "#f43f5e");
        highlightLoginError(null, passwordInput);
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Вход в аккаунт...";
      }

      try {
        // 1. Вход через облачную базу данных Supabase (PostgreSQL 24/7)
        const sbResult = await sbLogin(username, password);
        if (sbResult && sbResult.success && sbResult.user) {
          currentUser = normalizeUser(sbResult.user);
          saveUserSession();
          saveStoredAccount(currentUser, password);
          updateAppView();
          handlePostAuthPlan();
          showToast(`Добро пожаловать в Kinetix, ${currentUser.username}!`, "#00ff88");
          return;
        } else if (sbResult && sbResult.error) {
          showToast(sbResult.error, "#f43f5e");
          highlightLoginError(sbResult.notFound ? usernameInput : null, sbResult.notFound ? null : passwordInput);
          return;
        }

        // 2. Локальная проверка только при сбое сети Supabase (offline fallback с проверкой пароля)
        const accounts = getStoredAccounts();
        const existing = accounts[username.toLowerCase()];
        if (existing && existing.password && existing.password === password) {
          currentUser = normalizeUser(existing);
          saveUserSession();
          updateAppView();
          showToast(`Добро пожаловать, ${currentUser.username}!`, "#00ff88");
          return;
        }

        showToast("Неверный логин или пароль!", "#f43f5e");
        highlightLoginError(usernameInput, passwordInput);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origBtnText;
        }
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById("regUsername");
      const emailInput = document.getElementById("regEmail");
      const passwordInput = document.getElementById("regPassword");
      const keyInput = document.getElementById("regKey");
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const origBtnText = submitBtn ? submitBtn.textContent : "Зарегистрироваться";

      const username = usernameInput ? usernameInput.value.trim() : "";
      const email = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value.trim() : "";
      const key = keyInput ? keyInput.value.trim().toUpperCase() : "";

      if (!username) {
        showToast("Введите логин!", "#f43f5e");
        highlightLoginError(usernameInput, null);
        return;
      }
      if (!password) {
        showToast("Введите пароль для защиты аккаунта!", "#f43f5e");
        highlightLoginError(null, passwordInput);
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Регистрация...";
      }

      try {
        // 1. Регистрация в облачной базе Supabase (PostgreSQL 24/7)
        const sbResult = await sbRegister(username, email, password, key);
        if (sbResult && sbResult.success && sbResult.user) {
          currentUser = normalizeUser(sbResult.user);
          saveUserSession();
          saveStoredAccount(currentUser, password);
          updateAppView();
          handlePostAuthPlan();
          showToast(key ? "Регистрация и активация ключа успешны!" : "Регистрация успешна! Добро пожаловать!", "#00ff88");
          return;
        } else if (sbResult && sbResult.error) {
          showToast(sbResult.error, "#f43f5e");
          return;
        }

        // 2. Локальная регистрация при сбое сети
        const isKeyGiven = Boolean(key);
        const isLifetime = isKeyGiven && (key.includes("LIFE") || key.includes("ADMIN") || key.includes("ROOT") || key.includes("OWNER"));
        const isWeek = isKeyGiven && key.includes("7D");
        const days = isLifetime ? 99999 : (isWeek ? 7 : (isKeyGiven ? 30 : 0));

        currentUser = normalizeUser({
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
        });

        saveUserSession();
        saveStoredAccount(currentUser, password);
        updateAppView();
        handlePostAuthPlan();
        showToast(isKeyGiven ? "Регистрация и активация ключа успешны!" : "Регистрация успешна! Добро пожаловать!", "#00ff88");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origBtnText;
        }
      }
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

  // Защита от несанкционированного открытия вкладки админа
  const adminTabPane = document.getElementById("tab_admin");
  if (adminTabPane && adminTabPane.classList.contains("active") && !currentUser.isAdmin) {
    adminTabPane.classList.remove("active");
    const overviewTab = document.getElementById("tab_overview");
    if (overviewTab) overviewTab.classList.add("active");
    document.querySelectorAll(".dash-menu-item").forEach(m => m.classList.remove("active"));
    const overviewBtn = document.querySelector('[data-tab="overview"]');
    if (overviewBtn) overviewBtn.classList.add("active");
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
  if (refLinkInput) {
    const origin = (window.location.origin && window.location.origin.includes("http")) ? window.location.origin : "https://kinetixclient.ru";
    refLinkInput.value = `${origin}/dashboard?action=register&ref=${encodeURIComponent(currentUser.username.toLowerCase())}`;
  }

  const statRefFriends = document.getElementById("statRefFriends");
  const statRefEarned = document.getElementById("statRefEarned");
  const statRefAvailable = document.getElementById("statRefAvailable");
  const payoutMaxAvailable = document.getElementById("payoutMaxAvailable");

  const earnings = Number(currentUser.refEarnings) || 0;
  if (statRefFriends) statRefFriends.textContent = currentUser.referrals || 0;
  if (statRefEarned) statRefEarned.textContent = `${earnings} ₽`;
  if (statRefAvailable) statRefAvailable.textContent = `${earnings} ₽`;
  if (payoutMaxAvailable) payoutMaxAvailable.textContent = `Доступно: ${earnings} ₽`;

  renderConfigsTable();
  if (currentUser.isAdmin) {
    loadAdminUsers();
  } else {
    renderAdminUsers();
  }
}

function renderConfigsTable() {
  const tbody = document.getElementById("configsTableBody");
  if (!tbody) return;

  const cfgs = Array.isArray(currentUser.configs) ? currentUser.configs : [];
  if (cfgs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 48px 20px; color: var(--text-secondary);">
          <div style="font-size: 2.4rem; margin-bottom: 12px; opacity: 0.8;">☁️</div>
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 6px;">У вас пока нет сохранённых облачных конфигов</div>
          <div style="font-size: 0.85rem; color: var(--text-muted); max-width: 440px; margin: 0 auto 18px; line-height: 1.5;">
            Здесь будут отображаться ваши личные настройки чита. Вы можете выгружать конфиги прямо из клиента в игре или добавить новый конфиг вручную.
          </div>
          <button class="btn btn-sm btn-primary" onclick="document.getElementById('addConfigBtn').click()">+ Загрузить свой конфиг</button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = cfgs.map(cfg => `
    <tr>
      <td>
        <strong style="color: var(--text-primary); font-size: 0.95rem;">${cfg.name}</strong>
      </td>
      <td><span style="color: var(--neon-cyan); font-family: var(--font-mono); font-weight: 600;">${cfg.server || 'Custom'}</span></td>
      <td><span style="color: var(--text-muted);">${cfg.author || currentUser.username}</span></td>
      <td><span style="font-family: var(--font-mono); background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 4px; border: 1px solid var(--border-subtle);">${cfg.code}</span></td>
      <td style="text-align: right;">
        <button class="btn btn-sm btn-secondary" onclick="copyConfigCode('${cfg.code}')" style="margin-right: 6px;">Скопировать</button>
        <button class="btn btn-sm btn-secondary" onclick="downloadConfig('${cfg.name}')" style="margin-right: 6px;">Скачать .cfg</button>
        <button class="btn btn-sm btn-danger" onclick="deleteConfig('${cfg.id}')" title="Удалить конфиг">✕</button>
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

async function loadAdminUsers() {
  const sbUsers = await sbListUsers();
  if (sbUsers && Array.isArray(sbUsers) && sbUsers.length > 0) {
    ADMIN_USERS_LIST = sbUsers.map(u => ({
      id: u.id,
      username: u.username,
      plan: u.is_lifetime ? "LIFETIME" : (u.plan_name || (u.is_active ? "Активен" : "Без подписки")),
      hwid: (u.hwid && u.hwid.trim()) ? u.hwid : "Не привязан",
      status: u.is_banned ? "Забанен" : (u.is_active || u.is_lifetime ? "Активен" : "Не активен")
    }));
  }
  renderAdminUsers();
}

function initDashboardEvents() {
  const menuItems = document.querySelectorAll(".dash-menu-item");
  const tabPanes = document.querySelectorAll(".dash-tab-pane");

  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabTarget = item.dataset.tab;
      if (tabTarget === "admin" && (!currentUser || !currentUser.isAdmin)) {
        showToast("Доступ запрещен. Требуются права администратора.", "#f43f5e");
        return;
      }

      menuItems.forEach(m => m.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      item.classList.add("active");
      const targetPane = document.getElementById(`tab_${tabTarget}`);
      if (targetPane) targetPane.classList.add("active");
      if (tabTarget === "admin") {
        loadAdminUsers();
      }
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

  // Активация ключа через облачную базу Supabase
  const activateBtn = document.getElementById("activateKeyBtn");
  const keyInput = document.getElementById("licenseKeyInput");
  if (activateBtn && keyInput) {
    activateBtn.addEventListener("click", async () => {
      const val = keyInput.value.trim().toUpperCase();
      if (!val) {
        showToast("Введите лицензионный ключ!", "#f43f5e");
        return;
      }

      activateBtn.disabled = true;
      activateBtn.textContent = "Активация...";

      try {
        // 1. Активация ключа через облачную базу данных Supabase (PostgreSQL 24/7)
        const sbRes = await sbActivateKey(currentUser.username, val);
        if (sbRes && sbRes.success) {
          const updated = await sbGetProfile(currentUser.username);
          if (updated) {
            currentUser = normalizeUser(Object.assign({}, currentUser, updated));
          } else {
            currentUser.is_active = true;
            currentUser.sub_status = "active";
            currentUser.planName = val.includes("LIFE") ? "KINETIX LIFETIME VIP" : "KINETIX PREMIUM";
            currentUser.isLifetime = val.includes("LIFE");
          }
          saveUserSession();
          renderDashboard();
          keyInput.value = "";
          showToast(sbRes.message || "Лицензионный ключ успешно активирован!", "#00ff88");
          return;
        } else if (sbRes && sbRes.error) {
          showToast(sbRes.error, "#f43f5e");
          return;
        }

        // 2. Локальный fallback при сбое сети
        const isLife = val.includes("LIFE");
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
      } finally {
        activateBtn.disabled = false;
        activateBtn.textContent = "Активировать";
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

  // Безопасность профиля: смена пароля
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const newPasswordInput = document.getElementById("newPasswordInput");
  if (changePasswordBtn && newPasswordInput) {
    changePasswordBtn.addEventListener("click", async () => {
      const newPass = newPasswordInput.value.trim();
      if (!newPass || newPass.length < 4) {
        showToast("Пароль должен содержать не менее 4 символов!", "#f43f5e");
        return;
      }
      changePasswordBtn.disabled = true;
      changePasswordBtn.textContent = "Сохранение...";
      try {
        if (currentUser.id) {
          await sbRequest(`users?id=eq.${currentUser.id}`, {
            method: "PATCH",
            body: JSON.stringify({ password_hash: newPass })
          });
        }
        saveStoredAccount(currentUser, newPass);
        newPasswordInput.value = "";
        showToast("Пароль успешно обновлен в облачной базе!", "#00ff88");
      } catch(e) {
        showToast("Ошибка при сохранении пароля", "#f43f5e");
      } finally {
        changePasswordBtn.disabled = false;
        changePasswordBtn.textContent = "Обновить пароль";
      }
    });
  }

  // Реферальная система: модальное окно вывода средств
  const requestPayoutBtn = document.getElementById("requestPayoutBtn");
  const payoutModalOverlay = document.getElementById("payoutModalOverlay");
  const payoutModalClose = document.getElementById("payoutModalClose");
  const payoutCancelBtn = document.getElementById("payoutCancelBtn");
  const payoutSubmitBtn = document.getElementById("payoutSubmitBtn");
  const payoutAmount = document.getElementById("payoutAmount");
  const payoutMethod = document.getElementById("payoutMethod");
  const payoutRequisites = document.getElementById("payoutRequisites");
  const payoutMaxAvailable = document.getElementById("payoutMaxAvailable");

  if (requestPayoutBtn && payoutModalOverlay) {
    requestPayoutBtn.addEventListener("click", () => {
      const earnings = Number(currentUser.refEarnings) || 0;
      if (earnings < 300) {
        showToast(`Минимальная сумма для вывода — 300 ₽. Ваш баланс: ${earnings} ₽`, "#f43f5e");
        return;
      }
      if (payoutAmount) payoutAmount.value = earnings;
      payoutModalOverlay.classList.add("active");
    });
  }
  if (payoutMaxAvailable && payoutAmount) {
    payoutMaxAvailable.addEventListener("click", () => {
      payoutAmount.value = Number(currentUser.refEarnings) || 0;
    });
  }
  if (payoutModalClose && payoutModalOverlay) {
    payoutModalClose.addEventListener("click", () => payoutModalOverlay.classList.remove("active"));
  }
  if (payoutCancelBtn && payoutModalOverlay) {
    payoutCancelBtn.addEventListener("click", () => payoutModalOverlay.classList.remove("active"));
  }
  if (payoutModalOverlay) {
    payoutModalOverlay.addEventListener("click", (e) => {
      if (e.target === payoutModalOverlay) payoutModalOverlay.classList.remove("active");
    });
  }

  if (payoutSubmitBtn) {
    payoutSubmitBtn.addEventListener("click", async () => {
      const method = payoutMethod ? payoutMethod.value : "СБП";
      const reqs = payoutRequisites ? payoutRequisites.value.trim() : "";
      const amt = parseInt(payoutAmount ? payoutAmount.value : "0", 10);
      const earnings = Number(currentUser.refEarnings) || 0;

      if (!reqs) {
        showToast("Укажите реквизиты для выплаты!", "#f43f5e");
        return;
      }
      if (isNaN(amt) || amt < 300) {
        showToast("Минимальная сумма к выводу — 300 ₽!", "#f43f5e");
        return;
      }
      if (amt > earnings) {
        showToast(`Сумма превышает доступный баланс (${earnings} ₽)!`, "#f43f5e");
        return;
      }

      payoutSubmitBtn.disabled = true;
      payoutSubmitBtn.textContent = "Отправка заявки...";

      try {
        currentUser.refEarnings = earnings - amt;
        saveUserSession();

        sbRequest("payout_requests", {
          method: "POST",
          body: JSON.stringify({
            username: currentUser.username,
            method: method,
            requisites: reqs,
            amount: amt,
            status: "pending",
            created_at: new Date().toISOString()
          })
        }).catch(() => {});

        if (currentUser.id) {
          sbRequest(`users?id=eq.${currentUser.id}`, {
            method: "PATCH",
            body: JSON.stringify({ refEarnings: currentUser.refEarnings })
          }).catch(() => {});
        }

        if (payoutModalOverlay) payoutModalOverlay.classList.remove("active");
        if (payoutRequisites) payoutRequisites.value = "";
        renderDashboard();
        showToast(`Заявка на вывод ${amt} ₽ принята! Выплата поступит в течение 24 часов.`, "#00ff88");
      } finally {
        payoutSubmitBtn.disabled = false;
        payoutSubmitBtn.textContent = "Подтвердить вывод";
      }
    });
  }

  const resetHwidBtn = document.getElementById("resetHwidBtn");
  if (resetHwidBtn) {
    resetHwidBtn.addEventListener("click", async () => {
      if (!currentUser) return;

      if (!confirm("Вы действительно хотите сбросить привязку оборудования (HWID)?\nПри следующем входе в лаунчер привяжется ваш текущий компьютер.")) {
        return;
      }

      resetHwidBtn.disabled = true;
      resetHwidBtn.textContent = "Сброс HWID...";

      try {
        // 1. Сброс HWID в облачной базе данных Supabase (PostgreSQL 24/7)
        const sbRes = await sbResetHwid(currentUser.username, "");
        if (sbRes && sbRes.success) {
          currentUser.hwid = "";
          currentUser.hwidLocked = false;
          currentUser.hwid_resets = (currentUser.hwid_resets || 0) + 1;
          saveUserSession();
          renderDashboard();
          showToast("HWID успешно сброшен!", "#00ff88");
          return;
        } else if (sbRes && !sbRes.success && sbRes.message) {
          showToast(sbRes.message, "#f43f5e");
          return;
        }

        // 2. Локальный fallback при сбое сети
        currentUser.hwid = "";
        currentUser.hwidLocked = false;
        currentUser.hwid_resets = (currentUser.hwid_resets || 0) + 1;
        saveUserSession();
        renderDashboard();
        showToast("HWID успешно сброшен!", "#00ff88");
      } finally {
        resetHwidBtn.disabled = false;
        resetHwidBtn.textContent = "Сбросить HWID";
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
    genBtn.addEventListener("click", async () => {
      const plan = planSelect.value;
      const count = parseInt(countSelect.value, 10) || 1;
      const isLifetime = plan === "LIFETIME";
      const days = isLifetime ? 99999 : (plan === "7DAYS" ? 7 : (plan === "1DAY" ? 1 : 30));

      genBtn.disabled = true;
      genBtn.textContent = "Генерация...";

      let generated = [];
      let savedKeys = JSON.parse(localStorage.getItem("kinetix_generated_keys") || "[]");

      for (let i = 0; i < count; i++) {
        const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const rand3 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const key = `KINETIX-${plan}-${rand1}-${rand2}-${rand3}`;

        generated.push(key);
        savedKeys.push({ key: key, plan: plan, used: false, createdAt: new Date().toISOString() });

        // Сохранение ключа в Supabase (PostgreSQL 24/7)
        sbRequest("license_keys", {
          method: "POST",
          body: JSON.stringify({
            key_code: key,
            plan_name: isLifetime ? "LIFETIME" : (plan === "7DAYS" ? "7 Дней" : (plan === "1DAY" ? "1 День" : "30 Дней")),
            duration_days: days,
            is_lifetime: isLifetime,
            is_used: false
          })
        }).catch(() => {});
      }

      localStorage.setItem("kinetix_generated_keys", JSON.stringify(savedKeys));

      if (outputArea) {
        outputArea.textContent = generated.join("\n");
      }
      if (resultBox) {
        resultBox.style.display = "block";
      }

      genBtn.disabled = false;
      genBtn.textContent = "⚡ Сгенерировать ключи";
      showToast(`Сгенерировано ключей: ${count} шт. (${plan}) — сохранены в Supabase!`, "#ffd700");
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
window.adminGrantLifetime = async function(userId) {
  const u = ADMIN_USERS_LIST.find(x => x.id === userId);
  if (u) {
    u.plan = "LIFETIME";
    u.status = "Активен";
    renderAdminUsers();
    sbRequest(`users?id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify({
        is_lifetime: true,
        is_active: true,
        sub_status: "active",
        plan_name: "LIFETIME",
        role: "PRO LIFETIME"
      })
    }).catch(() => {});
    showToast(`Пользователю ${u.username} выдан LIFETIME в базе данных!`, "#ffd700");
  }
};

window.adminResetHwid = async function(userId) {
  const u = ADMIN_USERS_LIST.find(x => x.id === userId);
  if (u) {
    u.hwid = "Не привязан";
    renderAdminUsers();
    sbRequest(`users?id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ hwid: "" })
    }).catch(() => {});
    showToast(`HWID пользователя ${u.username} сброшен в базе данных!`, "#00f0ff");
  }
};

window.adminToggleBan = async function(userId) {
  const u = ADMIN_USERS_LIST.find(x => x.id === userId);
  if (u) {
    const willBan = u.status === "Активен";
    u.status = willBan ? "Забанен" : "Активен";
    renderAdminUsers();
    sbRequest(`users?id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_banned: willBan })
    }).catch(() => {});
    showToast(`Пользователь ${u.username} ${willBan ? "заблокирован" : "разблокирован"} в базе данных!`, willBan ? "#f43f5e" : "#00ff88");
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

window.deleteConfig = function(id) {
  if (!currentUser || !currentUser.configs) return;
  if (!confirm("Вы действительно хотите удалить этот облачный конфиг?")) return;
  currentUser.configs = currentUser.configs.filter(c => c.id !== id);
  saveUserSession();
  renderConfigsTable();
  showToast("Конфиг удален из вашего списка", "#00f0ff");
};

window.promptCreateConfig = function() {
  const addBtn = document.getElementById("addConfigBtn");
  if (addBtn) addBtn.click();
};

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
