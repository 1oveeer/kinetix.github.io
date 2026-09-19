// ===================================================
// CYBER CLIENT SCRIPT
// ===================================================

document.addEventListener("DOMContentLoaded", () => {
  initFromConfig();
  initCanvasParticles();
  initGuiMockup();
  initModulesFilter();
  initPricingModal();
  initFaqAccordion();
  initMobileMenu();
});

// 1. Инициализация контента из config.js
function initFromConfig() {
  if (typeof CONFIG === "undefined") return;

  // Тексты и шапка
  const logoText = document.getElementById("logoText");
  const logoBadge = document.getElementById("logoBadge");
  const navStatus = document.getElementById("navStatus");
  const heroClientName = document.getElementById("heroClientName");
  const heroGameVersion = document.getElementById("heroGameVersion");
  const footerClientName = document.getElementById("footerClientName");
  const footerLogoText = document.getElementById("footerLogoText");

  if (logoText) logoText.textContent = CONFIG.clientName;
  if (footerLogoText) footerLogoText.textContent = CONFIG.clientName;
  if (heroClientName) heroClientName.textContent = CONFIG.clientName;
  if (footerClientName) footerClientName.textContent = CONFIG.clientName;
  if (logoBadge) logoBadge.textContent = CONFIG.clientBadge || "v2.4";
  if (navStatus) navStatus.textContent = CONFIG.statusText || "UNDETECTED";
  if (heroGameVersion) heroGameVersion.textContent = CONFIG.gameVersion || "Minecraft 1.21.x";

  // Ссылки
  const navTelegram = document.getElementById("navTelegram");
  const heroDiscord = document.getElementById("heroDiscord");
  const ctaTgBtn = document.getElementById("ctaTgBtn");
  const footerTgChannel = document.getElementById("footerTgChannel");
  const footerTgSupport = document.getElementById("footerTgSupport");
  const footerDiscord = document.getElementById("footerDiscord");

  if (navTelegram) navTelegram.href = CONFIG.telegramLink || "#";
  if (heroDiscord) heroDiscord.href = CONFIG.discordLink || "#";
  if (ctaTgBtn) ctaTgBtn.href = CONFIG.telegramBot || "https://t.me/kinetixclient_bot";
  if (footerTgChannel) footerTgChannel.href = CONFIG.telegramLink || "#";
  if (footerTgSupport) footerTgSupport.href = CONFIG.telegramManager || CONFIG.telegramLink || "#";
  if (footerDiscord) footerDiscord.href = CONFIG.discordLink || "#";

  // Проверка сессии в шапке сайта
  const savedUser = localStorage.getItem("kinetix_user");
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      if (user && user.username) {
        const navDashText = document.getElementById("navDashText");
        const navDashBtn = document.getElementById("navDashBtn");
        if (navDashText) navDashText.textContent = user.username;
        if (navDashBtn) navDashBtn.classList.add("btn-glow");
      }
    } catch(e) {}
  }

  // Статистика
  const statUsers = document.getElementById("statUsers");
  const statBypasses = document.getElementById("statBypasses");
  const statModules = document.getElementById("statModules");
  const statFps = document.getElementById("statFps");

  if (statUsers && CONFIG.stats.users) statUsers.textContent = CONFIG.stats.users;
  if (statBypasses && CONFIG.stats.bypasses) statBypasses.textContent = CONFIG.stats.bypasses;
  if (statModules && CONFIG.stats.modules) statModules.textContent = CONFIG.stats.modules;
  if (statFps && CONFIG.stats.fpsBoost) statFps.textContent = CONFIG.stats.fpsBoost;

  // Генерация карточек тарифов
  renderPricingCards();

  // Генерация карточек модулей
  renderModules("all");

  // Генерация FAQ
  renderFaq();
}

// 2. Рендеринг карточек тарифов
function renderPricingCards() {
  const grid = document.getElementById("pricingGrid");
  if (!grid || !CONFIG.pricing) return;

  grid.innerHTML = CONFIG.pricing.map(plan => `
    <div class="pricing-card ${plan.isPopular ? 'popular' : ''}">
      ${plan.isPopular ? `<div class="popular-ribbon">${plan.badge || 'ХИТ ПРОДАЖ'}</div>` : ''}
      
      <div class="plan-header">
        <h3 class="plan-name">${plan.name}</h3>
        <span class="plan-badge">${plan.badge}</span>
      </div>

      <div class="plan-price-box">
        <span class="plan-price">${plan.price}</span>
        <span class="plan-currency">${plan.currency}</span>
        <span class="plan-period">${plan.period}</span>
      </div>

      <ul class="plan-features">
        ${plan.features.map(f => `
          <li>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>${f}</span>
          </li>
        `).join('')}
      </ul>

      <a href="${plan.paymentUrl || '#'}" target="_blank" rel="noopener noreferrer" class="btn ${plan.isPopular ? 'btn-primary btn-glow' : 'btn-secondary'} btn-buy" 
        data-plan-id="${plan.id}" 
        data-plan-name="${plan.name}" 
        data-plan-price="${plan.price} ${plan.currency}" 
        data-plan-badge="${plan.badge}">
        ${plan.buttonText || 'Купить'}
      </a>
    </div>
  `).join('');
}

// 3. Рендеринг модулей
function renderModules(filterCategory = "all") {
  const grid = document.getElementById("modulesGrid");
  if (!grid || !CONFIG.modules) return;

  const filtered = filterCategory === "all" 
    ? CONFIG.modules 
    : CONFIG.modules.filter(m => m.category.toLowerCase() === filterCategory.toLowerCase());

  grid.innerHTML = filtered.map(mod => `
    <div class="mod-card" data-category="${mod.category}">
      <div class="mod-header">
        <h4 class="mod-name">${mod.name}</h4>
        <span class="mod-cat-badge">${mod.category}</span>
      </div>
      <p class="mod-desc">${mod.description}</p>
    </div>
  `).join('');
}

// Фильтр модулей
function initModulesFilter() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const category = btn.getAttribute("data-category");
      renderModules(category);
    });
  });
}

// 4. FAQ Аккордеон
function renderFaq() {
  const faqList = document.getElementById("faqList");
  if (!faqList || !CONFIG.faq) return;

  faqList.innerHTML = CONFIG.faq.map((item, idx) => `
    <div class="faq-item ${idx === 0 ? 'active' : ''}">
      <button class="faq-question">
        <span>${item.question}</span>
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-answer">
        <p>${item.answer}</p>
      </div>
    </div>
  `).join('');
}

function initFaqAccordion() {
  const faqList = document.getElementById("faqList");
  if (!faqList) return;

  faqList.addEventListener("click", (e) => {
    const btn = e.target.closest(".faq-question");
    if (!btn) return;
    const item = btn.parentElement;
    const isActive = item.classList.contains("active");

    // Закрываем остальные
    document.querySelectorAll(".faq-item").forEach(i => i.classList.remove("active"));

    // Переключаем текущий
    if (!isActive) {
      item.classList.add("active");
    }
  });
}

// 5. Модальное окно оформления покупки
function initPricingModal() {
  const modal = document.getElementById("purchaseModal");
  const closeBtn = document.getElementById("modalClose");
  const modalPlanName = document.getElementById("modalPlanName");
  const modalPlanPrice = document.getElementById("modalPlanPrice");
  const modalPlanBadge = document.getElementById("modalPlanBadge");
  const modalPayTg = document.getElementById("modalPayTg");
  const modalPayDs = document.getElementById("modalPayDs");

  if (!modal) return;

  document.addEventListener("click", (e) => {
    const buyBtn = e.target.closest(".btn-buy");
    if (!buyBtn) return;

    const href = buyBtn.getAttribute("href");
    if (href && href !== "#") {
      // Прямой переход по ссылке оплаты Lava.top
      return;
    }

    const name = buyBtn.getAttribute("data-plan-name");
    const price = buyBtn.getAttribute("data-plan-price");
    const badge = buyBtn.getAttribute("data-plan-badge");

    // 1. Проверяем, авторизован ли пользователь
    const savedUser = localStorage.getItem("kinetix_user");
    let user = null;
    if (savedUser) {
      try {
        user = JSON.parse(savedUser);
      } catch (err) {}
    }

    // Если не зарегистрирован / не вошел -> сначала требуем регистрацию
    if (!user) {
      e.preventDefault();
      window.location.href = `dashboard.html?action=register&plan=${encodeURIComponent(name || '')}&price=${encodeURIComponent(price || '')}`;
      return;
    }

    // Если авторизован -> открываем модалку с подтверждением покупки
    if (modalPlanName) modalPlanName.textContent = name;
    if (modalPlanPrice) modalPlanPrice.textContent = price;
    if (modalPlanBadge) modalPlanBadge.textContent = badge;

    const modalUserName = document.getElementById("modalUserName");
    if (modalUserName) {
      modalUserName.textContent = user.username;
    }

    const planId = buyBtn.getAttribute("data-plan-id") || "month";
    const message = encodeURIComponent(`Привет! Мой аккаунт: ${user.username}. Хочу купить клиент ${CONFIG.clientName} [Тариф: ${name}, Цена: ${price}]. Как оплатить?`);
    const tgBase = CONFIG.telegramBot || CONFIG.telegramManager || CONFIG.telegramLink || "https://t.me/";
    
    if (modalPayTg) {
      // Если ссылка ведет на бота, открываем deep-link на нужный тариф с никнеймом
      if (CONFIG.telegramBot || tgBase.toLowerCase().includes("bot")) {
        const cleanBase = tgBase.split("?")[0].replace(/\/$/, "");
        modalPayTg.href = `${cleanBase}?start=buy_${planId}_${encodeURIComponent(user.username)}`;
      } else {
        modalPayTg.href = tgBase.includes("?") ? `${tgBase}&text=${message}` : `${tgBase}?text=${message}`;
      }
    }

    if (modalPayDs) {
      modalPayDs.href = CONFIG.discordLink || "#";
    }

    modal.classList.add("active");
  });

  const closeModal = () => modal.classList.remove("active");

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeModal();
    }
  });
}

// 6. Актуальная презентация меню чита Kinetix (ClickGUI, HUD Screenshot, 3D Menu)
function initGuiMockup() {
  // 1. Переключение вкладок режимов (ClickGUI, Скриншот, Главное меню)
  const modeBtns = document.querySelectorAll(".preview-mode-btn");
  const views = {
    clickgui: document.getElementById("viewClickGui"),
    screenshot: document.getElementById("viewScreenshot"),
    mainmenu: document.getElementById("viewMainMenu")
  };

  modeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      modeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.getAttribute("data-view");

      Object.keys(views).forEach(k => {
        if (views[k]) {
          if (k === target) {
            views[k].style.display = "block";
            views[k].classList.add("active");
          } else {
            views[k].style.display = "none";
            views[k].classList.remove("active");
          }
        }
      });
    });
  });

  // 2. Выбор тем оформления в шапке ClickGUI (Theme Bar)
  const themeDots = document.querySelectorAll(".theme-dot");
  themeDots.forEach(dot => {
    dot.addEventListener("click", () => {
      themeDots.forEach(d => d.classList.remove("active"));
      dot.classList.add("active");
      const color = dot.getAttribute("data-color");
      const glow = dot.getAttribute("data-glow");
      if (color) {
        document.documentElement.style.setProperty("--gui-theme", color);
        document.documentElement.style.setProperty("--gui-theme-glow", glow || `${color}66`);
      }
    });
  });

// 3. Актуальная база ВСЕХ модулей Kinetix Client из исходного кода
  const actualModules = {
    combat: [
      { name: "AntiBot", mode: "Спасает от банов, определяя серверных ботов", checked: false },
      { name: "Aura", mode: "Атакует противников рядом с игроком", checked: true },
      { name: "AutoApple", mode: "Съедает золотое яблоко при здоровье ниже указанного", checked: true },
      { name: "AutoArmor", mode: "Автоматически надевает лучшую броню из инвентаря", checked: true },
      { name: "AutoExplosion", mode: "Ставит кристалл Энда на размещенный обсидиан", checked: false },
      { name: "AutoPotion", mode: "Бросает полезные взрывные зелья под игрока", checked: false },
      { name: "AutoSwap", mode: "Чередует выбранные предметы во второй руке", checked: false },
      { name: "AutoTotem", mode: "Берет тотем во вторую руку при необходимости", checked: true },
      { name: "BowSpammer", mode: "Спаммит выстрелами вблизи с лука", checked: false },
      { name: "HitBox", mode: "Увеличивает границы нанесения урона по противнику", checked: true },
      { name: "HitSound", mode: "Проигрывает звук при ударе по противнику", checked: false },
      { name: "MakeBoost", mode: "Импульсный буст скорости при получении урона", checked: false },
      { name: "NoFriendDamage", mode: "Отменяет урон по клиентским друзьям", checked: false },
      { name: "NoInteract", mode: "Отключает взаимодействие с интерактивными блоками", checked: false },
      { name: "ShiftTap", mode: "Присаживается после удара", checked: false },
      { name: "SyncTps", mode: "Синхронизирует удары на клиенте и сервере, помогая при серверных лагах", checked: false },
      { name: "TapeMouse", mode: "Бьет с учетом кулдауна оружия", checked: false },
      { name: "TriggerBot", mode: "Бьет противника при наведении", checked: true },
      { name: "Velocity", mode: "Убирает отдачу при получении урона", checked: true }
    ],
    movement: [
      { name: "AirStuck", mode: "Вызывает зависание игрока в воздухе", checked: false },
      { name: "Blink", mode: "При включении — зависание, при выключении — телепорт на новое место.", checked: false },
      { name: "ElytraBooster", mode: "Ускоряет полет игрока на элитре", checked: true },
      { name: "ElytraBounce", mode: "Делает распрыжку на элитре", checked: false },
      { name: "ElytraMotion", mode: "Плавный контроль высоты и вектора полета на элитре", checked: false },
      { name: "GrimGlide", mode: "Обход парения GrimAC на элитрах без флагов", checked: false },
      { name: "InventoryMove", mode: "Позволяет ходить в гуи и инвентаре", checked: true },
      { name: "NoJumpDelay", mode: "Спаммит прыжками в низком пространстве", checked: false },
      { name: "NoSlow", mode: "Убирает замедление от использования предметов", checked: true },
      { name: "NoWeb", mode: "Не дает зайти игроку в паутину", checked: false },
      { name: "Parkour", mode: "Прыгает на конце блока", checked: false },
      { name: "SafeWalk", mode: "Приседает на краю блоков, спасая от падения", checked: false },
      { name: "Speed", mode: "Ускоряет перемещение игрока", checked: false },
      { name: "Sprint", mode: "Активирует режим бега", checked: true },
      { name: "Strafe", mode: "Ускоряет изменение вектора движения игрока", checked: true },
      { name: "TargetStrafe", mode: "Преследует противника", checked: true },
      { name: "AutoTP", mode: "Автоматическая телепортация по заданным координатам", checked: false },
      { name: "DefaultTP", mode: "Мгновенный телепорт на домашнюю точку или спавн", checked: false }
    ],
    render: [
      { name: "Arrows", mode: "Рисует стрелки вокруг прицела направленные на противников", checked: true },
      { name: "BetterWorld", mode: "Изменяет отображение мира", checked: false },
      { name: "BlockEsp", mode: "Подсветка блоков", checked: false },
      { name: "BlockOutline", mode: "Изменяет очертание выбранного блока", checked: false },
      { name: "BlockOverlay", mode: "Неоновое подсвечивание и контур целевого блока", checked: false },
      { name: "ChinaHat", mode: "Добавляет игроку шляпу на голове", checked: true },
      { name: "Crosshair", mode: "Изменяет прицел в игре", checked: false },
      { name: "CustomModel", mode: "Изменяет прицел в игре", checked: false },
      { name: "GlyphLines", mode: "Добавляет в мир бегущие линии", checked: false },
      { name: "Gui", mode: "Показывает меню чита", checked: false },
      { name: "HitEffect", mode: "Добавляет анимацию попаданию по противнику", checked: false },
      { name: "HpAlert", mode: "Уведомляет о падении здоровья игрока ниже заданного значения", checked: false },
      { name: "Interface", mode: "Показывает худ чита", checked: true },
      { name: "ItemEsp", mode: "Показывает предметы на земле", checked: false },
      { name: "ItemPhysics", mode: "Добавляет предметам на земле физику", checked: false },
      { name: "JumpCircle", mode: "Рисует под игроком круг при прыжке и приземлении", checked: false },
      { name: "KillEffect", mode: "Добавляет анимацию гибели противника", checked: false },
      { name: "Particles", mode: "Добавляет в мир частицы появляющиеся после выбранных действий", checked: false },
      { name: "Esp", mode: "Показывает информацию о противниках в мире", checked: true },
      { name: "Prediction", mode: "Показывает траекторию и место падения летящим предметам", checked: true },
      { name: "SeeInvisible", mode: "Показывает противников в невидимости", checked: false },
      { name: "ShaderHand", mode: "Изменяет отображение руки от первого лица", checked: false },
      { name: "SmoothCamera", mode: "Добавляет камере от первого лица плавность движения", checked: false },
      { name: "SwingAnimation", mode: "Изменяет положение рук и их анимацию", checked: false },
      { name: "Wings", mode: "Добавляет игроку крылья за спиной", checked: false }
    ],
    player: [
      { name: "AntiAfk", mode: "Авто-действия для защиты от AFK-кика с сервера", checked: false },
      { name: "AutoRespawn", mode: "Моментальное возрождение после гибели игрока", checked: true },
      { name: "FastBreak", mode: "Убирает задержку при ломании блоков", checked: true },
      { name: "FastUse", mode: "Ускоренное использование выбранных предметов", checked: true },
      { name: "FreeCam", mode: "Свободный полет камеры отдельно от игрока", checked: true },
      { name: "GodMode", mode: "Пакетный режим бессмертия при десинхронизации", checked: false },
      { name: "ItemScroller", mode: "Быстрое перемещение предметов в инвентаре скроллом", checked: false },
      { name: "ItemSwapFix", mode: "Отменяет принудительный возврат предметов сервером", checked: false },
      { name: "NameProtect", mode: "Скрывает реальный ник игрока на экране", checked: false },
      { name: "NoEntityTrace", mode: "Взаимодействие с блоками сквозь сущностей и игроков", checked: false },
      { name: "NoPush", mode: "Убирает отталкивание от игроков, мобов и блоков", checked: false },
      { name: "Nuker", mode: "Быстрое автоматическое ломание блоков вокруг", checked: false },
      { name: "OpenWall", mode: "Взаимодействие с сундуками и блоками сквозь стены", checked: false },
      { name: "PearlBlockThrow", mode: "Бросок жемчуга Края сквозь прозрачные блоки", checked: false }
    ],
    world: [
      { name: "AHHelper", mode: "Помощник авто-покупки предметов на аукционе", checked: false },
      { name: "AutoDuel", mode: "Отправляет выбранные дуэли случайным противникам", checked: false },
      { name: "AutoFish", mode: "Автоматическая рыбалка с авто-подсечкой", checked: false },
      { name: "AutoLeave", mode: "Выходит с сервера при появлении противника рядом с игроком", checked: false },
      { name: "AutoTool", mode: "Берет в руку нужный инструмент при ломании блока", checked: true },
      { name: "AutoTpAccept", mode: "Принимает запросы на телепортацию", checked: false },
      { name: "BetterChat", mode: "Запоминает историю чата и убирает повторные сообщения", checked: false },
      { name: "ChestStealer", mode: "Забирает все предметы с сундука", checked: true },
      { name: "ClanUpgrader", mode: "Автоматически прокачивает уровень клана", checked: false },
      { name: "ClickFriend", mode: "Добавляет наведенного игрока в клиентские друзья по нажатию кнопки", checked: true },
      { name: "ClickPearl", mode: "Бросает эндер жемчуг по нажатию кнопки", checked: false },
      { name: "ClientSound", mode: "Проигрывает звук при переключении функции", checked: false },
      { name: "CordDropper", mode: "Отправляет координаты в чат по нажатию кнопки", checked: false },
      { name: "ElytraFix", mode: "Свап сломанной элитры на целую из хотбара", checked: false },
      { name: "ElytraSwap", mode: "Чередует элитру с нагрудником по нажатию кнопки", checked: true },
      { name: "FakePlayer", mode: "Создает противника, видного только игроку", checked: false },
      { name: "LockSlot", mode: "Не позволяет выбрасывать вещи из выбранных слотов хотбара", checked: false },
      { name: "NoDelay", mode: "Убирает задержку кликов и использования предметов", checked: false },
      { name: "NoItemBreak", mode: "Убирает предмет из руки до его поломки", checked: false },
      { name: "NoRender", mode: "Убирает отрисовку выбранных объектов", checked: false },
      { name: "NoRotation", mode: "Отменяет поворот камеры сервером", checked: false },
      { name: "ReallyWorldHelper", mode: "Не дает написать в чат запрещенные слова", checked: true },
      { name: "RotateTeacher", mode: "Records mouse & trains GRU rotation", checked: false },
      { name: "RpSpoof", mode: "Убирает необходимость установки серверного ресурс-пака", checked: false },
      { name: "WebTrap", mode: "Ставит паутину под противника, останавливая его", checked: true }
    ],
    configs: [
      { name: "ReallyWorld Rage", mode: "Агрессивный конфиг для ReallyWorld • Aura + Velocity + WebTrap", checked: true },
      { name: "HolyWorld Legit", mode: "Легитный конфиг под HolyWorld • Обход GrimAC и Matrix", checked: false },
      { name: "FunTime Anarchy", mode: "Конфиг для FunTime • Анархия, AutoTotem и ElytraBoost", checked: false },
      { name: "Spooky Anarchy", mode: "Специальный PvP-пресет для анархических серверов Spooky", checked: false },
      { name: "PVP Master Cloud", mode: "Универсальный пресет для дуэлей и клановых войн", checked: false }
    ]
  };

  const catNames = {
    all: "Все функции",
    combat: "Combat",
    movement: "Movement",
    render: "Render",
    player: "Player",
    world: "World & Util",
    configs: "Configs"
  };

  let activeCategory = "combat";
  const catBtns = document.querySelectorAll(".cat-btn");
  const modulesGrid = document.getElementById("clickguiModulesGrid");
  const activeCatTitle = document.getElementById("guiActiveCatTitle");
  const searchInput = document.getElementById("guiSearchInput");

  function renderGuiModules(filterText = "") {
    if (!modulesGrid) return;
    let list = [];
    if (activeCategory === "all") {
      Object.keys(actualModules).forEach(cat => {
        list.push(...actualModules[cat]);
      });
    } else {
      list = actualModules[activeCategory] || actualModules.combat;
    }

    if (filterText) {
      const q = filterText.toLowerCase();
      let all = [];
      Object.keys(actualModules).forEach(cat => {
        all.push(...actualModules[cat]);
      });
      list = all.filter(m => m.name.toLowerCase().includes(q) || m.mode.toLowerCase().includes(q));
    }

    if (list.length === 0) {
      modulesGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.85rem;">Модули не найдены</div>`;
      return;
    }

    modulesGrid.innerHTML = list.map((item, idx) => `
      <div class="clickgui-card ${item.checked ? 'active' : ''}" data-idx="${idx}">
        <div class="card-top-row">
          <div class="card-title-group">
            <span class="card-name">${item.name}</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" ${item.checked ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        <div class="card-desc">${item.mode}</div>
      </div>
    `).join('');

    const switches = modulesGrid.querySelectorAll("input[type='checkbox']");
    switches.forEach(sw => {
      sw.addEventListener("change", (e) => {
        const card = e.target.closest(".clickgui-card");
        if (card) {
          if (e.target.checked) card.classList.add("active");
          else card.classList.remove("active");
        }
      });
    });
  }

  catBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      catBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.getAttribute("data-category") || "combat";
      if (activeCatTitle) {
        activeCatTitle.textContent = catNames[activeCategory] || "Combat";
      }
      if (searchInput) searchInput.value = "";
      renderGuiModules();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      renderGuiModules(query);
    });
  }

  renderGuiModules();
}

// 7. Мобильное меню
function initMobileMenu() {
  const burgerBtn = document.getElementById("burgerBtn");
  const navLinks = document.getElementById("navLinks");

  if (!burgerBtn || !navLinks) return;

  burgerBtn.addEventListener("click", () => {
    const isOpened = navLinks.style.display === "flex";
    if (isOpened) {
      navLinks.style.display = "";
    } else {
      navLinks.style.display = "flex";
      navLinks.style.flexDirection = "column";
      navLinks.style.position = "absolute";
      navLinks.style.top = "100%";
      navLinks.style.left = "0";
      navLinks.style.width = "100%";
      navLinks.style.background = "#0c0f17";
      navLinks.style.padding = "20px";
      navLinks.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
    }
  });

  navLinks.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        navLinks.style.display = "";
      }
    });
  });
}

// 8. Анимированный холст с частицами (Canvas Cyber Particles)
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

  const particleCount = Math.min(Math.floor(window.innerWidth / 18), 75);
  const particles = [];

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.7;
      this.vy = (Math.random() - 0.5) * 0.7;
      this.radius = Math.random() * 2 + 1;
      this.color = Math.random() > 0.4 ? "rgba(0, 240, 255," : "rgba(168, 85, 247,";
      this.alpha = Math.random() * 0.6 + 0.2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${this.color} ${this.alpha})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#00f0ff";
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Отрисовка линий между близкими точками
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          const lineAlpha = (1 - dist / 130) * 0.22;
          ctx.strokeStyle = `rgba(0, 240, 255, ${lineAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(animate);
  }

  animate();
}
