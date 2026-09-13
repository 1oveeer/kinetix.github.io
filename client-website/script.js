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
  if (ctaTgBtn) ctaTgBtn.href = CONFIG.telegramLink || "#";
  if (footerTgChannel) footerTgChannel.href = CONFIG.telegramLink || "#";
  if (footerTgSupport) footerTgSupport.href = CONFIG.telegramManager || CONFIG.telegramLink || "#";
  if (footerDiscord) footerDiscord.href = CONFIG.discordLink || "#";

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

      <button class="btn ${plan.isPopular ? 'btn-primary btn-glow' : 'btn-secondary'} btn-buy" 
        data-plan-id="${plan.id}" 
        data-plan-name="${plan.name}" 
        data-plan-price="${plan.price} ${plan.currency}" 
        data-plan-badge="${plan.badge}">
        ${plan.buttonText || 'Купить'}
      </button>
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

    const name = buyBtn.getAttribute("data-plan-name");
    const price = buyBtn.getAttribute("data-plan-price");
    const badge = buyBtn.getAttribute("data-plan-badge");

    if (modalPlanName) modalPlanName.textContent = name;
    if (modalPlanPrice) modalPlanPrice.textContent = price;
    if (modalPlanBadge) modalPlanBadge.textContent = badge;

    const planId = buyBtn.getAttribute("data-plan-id") || "month";
    const message = encodeURIComponent(`Привет! Хочу купить клиент ${CONFIG.clientName} [Тариф: ${name}, Цена: ${price}]. Как оплатить?`);
    const tgBase = CONFIG.telegramBot || CONFIG.telegramManager || CONFIG.telegramLink || "https://t.me/";
    
    if (modalPayTg) {
      // Если ссылка ведет на бота, открываем deep-link на нужный тариф
      if (CONFIG.telegramBot || tgBase.toLowerCase().includes("bot")) {
        const cleanBase = tgBase.split("?")[0].replace(/\/$/, "");
        modalPayTg.href = `${cleanBase}?start=buy_${planId}`;
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

// 6. Интерактивный ClickGUI Mockup в Hero
function initGuiMockup() {
  const tabs = document.querySelectorAll(".gui-tab");
  const modulesPanel = document.querySelector(".gui-modules-panel");

  const mockupData = {
    combat: [
      { name: "KillAura", mode: "GrimAC Strict / 3.8 Blocks", checked: true },
      { name: "Anti-Velocity", mode: "Horizontal: 0% | Vertical: 100%", checked: true },
      { name: "TriggerBot", mode: "Smart CPS / Weapon Only", checked: true },
      { name: "AutoTotem", mode: "InvSwap Instant / 0 Delay", checked: true },
      { name: "BowAimbot", mode: "Predict / FastCharge", checked: false }
    ],
    movement: [
      { name: "ElytraFly", mode: "Mode: Firework / Speed: 2.4", checked: true },
      { name: "Blink & Teleport", mode: "Packets: 24 / FakeLag", checked: false },
      { name: "Timer Boost", mode: "Speed: 1.15 / Bypass Grim", checked: true },
      { name: "Spider / WallClimb", mode: "Motion bypass Matrix", checked: false }
    ],
    render: [
      { name: "Glow ESP & Box", mode: "Shader Outline / Healthbar", checked: true },
      { name: "Tracers", mode: "Distance: 128 / Dynamic Color", checked: true },
      { name: "TargetHUD", mode: "Modern Cyber / Smooth Bar", checked: true },
      { name: "ItemPhysics", mode: "Realistic 3D items", checked: false }
    ],
    player: [
      { name: "FastEat", mode: "Packets: 14 / No flags", checked: true },
      { name: "AutoArmor", mode: "Best Protection / Auto Sort", checked: true },
      { name: "NoFall", mode: "Packet Cancel / Catch", checked: true },
      { name: "ChestStealer", mode: "Delay: 40ms / Smart sort", checked: false }
    ]
  };

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const tabKey = tab.getAttribute("data-tab");
      const list = mockupData[tabKey] || mockupData.combat;

      if (modulesPanel) {
        modulesPanel.innerHTML = list.map(item => `
          <div class="gui-module-item ${item.checked ? 'active' : ''}">
            <div class="module-info">
              <span class="module-name">${item.name}</span>
              <span class="module-mode">${item.mode}</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${item.checked ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        `).join('');

        attachToggleListeners();
      }
    });
  });

  function attachToggleListeners() {
    const switches = document.querySelectorAll(".gui-module-item input[type='checkbox']");
    switches.forEach(sw => {
      sw.addEventListener("change", (e) => {
        const item = e.target.closest(".gui-module-item");
        if (item) {
          if (e.target.checked) item.classList.add("active");
          else item.classList.remove("active");
        }
      });
    });
  }

  attachToggleListeners();
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
