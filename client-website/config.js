// ===================================================
// КОНФИГУРАЦИЯ САЙТА КЛИЕНТА
// Изменяйте данные здесь — они автоматически обновятся на всём сайте!
// ===================================================

const CONFIG = {
  // Основная информация о клиенте
  clientName: "Kinetix",
  clientBadge: "RELEASE v1.2",
  gameVersion: "Minecraft 1.21.11 / Fabric",
  statusText: "UNDETECTED",
  statusColor: "#00ff88", // зеленый
  
  // Социальные сети и контакты
  telegramBot: "https://t.me/kinetixclient_bot", // Ссылка на вашего Telegram бота оплаты
  telegramLink: "https://t.me/kinetix_client", // Ссылка на ваш канал
  telegramManager: "",
  discordLink: "",
  
  // Статистика (отображается на главной)
  stats: {
    users: "2,450+",
    bypasses: "99.9%",
    modules: "120+",
    fpsBoost: "+35%"
  },

  // Тарифы и цены
  pricing: [
    {
      id: "day",
      name: "Дневной тест",
      badge: "Быстрый старт",
      price: "99",
      currency: "₽",
      period: "/ 24 часа",
      features: [
        "Полный доступ ко всем 120+ функциям",
        "Обходы GrimAC, Matrix, Vulcan, Polar",
        "Доступ к Cloud Configs (КФГ профи)",
        "Авто-обновления в течение суток",
        "Базовая техподдержка"
      ],
      isPopular: false,
      buttonText: "Купить на 1 день"
    },
    {
      id: "week",
      name: "Недельный",
      badge: "Оптимально",
      price: "249",
      currency: "₽",
      period: "/ 7 дней",
      features: [
        "Полный доступ ко всем модулям",
        "Все актуальные байпассы и эксплойты",
        "Приватный пул серверов и конфигов",
        "Автоматический лоадер и автообновления",
        "Приоритетная поддержка в Discord"
      ],
      isPopular: false,
      buttonText: "Купить на 7 дней"
    },
    {
      id: "month",
      name: "Месячный",
      badge: "Хит выбора",
      price: "499",
      currency: "₽",
      period: "/ 30 дней",
      features: [
        "Полный доступ без ограничений",
        "Ранний доступ к новым бета-модулям",
        "Кастомные визуальные темы и GUI",
        "Готовые конфигурации под HolyWorld, ReallyWorld, FunTime и др.",
        "Быстрый ответ саппорта 24/7"
      ],
      isPopular: false,
      buttonText: "Купить на 30 дней"
    },
    {
      id: "lifetime",
      name: "LIFETIME",
      badge: "НАВСЕГДА • ВЫГОДНО",
      price: "1 290",
      currency: "₽",
      period: "/ навсегда",
      features: [
        "Пожизненный доступ ко всем версиям",
        "Все будущие обновления и новые байпассы",
        "Эксклюзивная роль в Discord и приватный чат",
        "Личный слот в Cloud Configs",
        "VIP-поддержка от разработчиков"
      ],
      isPopular: true,
      buttonText: "Забрать навсегда"
    }
  ],

  // Модули клиента для витрины
  modules: [
    {
      category: "combat",
      name: "KillAura / AttackAura",
      description: "Умный таргетинг, тонкая настройка CPS, ротации без детектов, авто-блок и свитч оружия."
    },
    {
      category: "combat",
      name: "Velocity / Anti-Knockback",
      description: "Настраиваемое снижение отдачи (0-100%), обход GrimAC и Matrix без флагов."
    },
    {
      category: "combat",
      name: "TriggerBot & HitBoxes",
      description: "Автоматический удар при наведении и расширенные хитбоксы для гарантированных критов."
    },
    {
      category: "movement",
      name: "Blink & ElytraFly",
      description: "Плавные режимы полёта, буст на элитрах и телепортация с фейковыми пакетами."
    },
    {
      category: "movement",
      name: "FastLadder / Spider / Jesus",
      description: "Быстрое передвижение по стенам, воде и лаве со стабильными обходами проверок."
    },
    {
      category: "movement",
      name: "Timer & Speed",
      description: "Гибкий таймер и адаптивный спид под механику различных версий и серверов."
    },
    {
      category: "render",
      name: "ESP & Tracers",
      description: "Обводка игроков, сундуков, руды и мобов, показ брони, хп и используемых предметов."
    },
    {
      category: "render",
      name: "TargetHUD & NameTags",
      description: "Кастомизируемый HUD с информацией о противнике, пинге и анимированными полосками здоровья."
    },
    {
      category: "render",
      name: "Custom ClickGUI & Themes",
      description: "Интуитивный интерфейс с неоновой кастомизацией, анимациями и звуками кликов."
    },
    {
      category: "player",
      name: "AutoTotem & AutoArmor",
      description: "Молниеносный свап тотемов в левую руку и автоматическое надевание лучшей брони."
    },
    {
      category: "player",
      name: "FastEat & AutoPotion",
      description: "Автоматический бафф зельями и ускоренное поглощение еды."
    },
    {
      category: "world",
      name: "Scaffold & FastPlace",
      description: "Идеальное строительство мостов под любыми углами с ротацией и авто-выбором блоков."
    }
  ],

  // Частые вопросы (FAQ)
  faq: [
    {
      question: "Как происходит получение чита после оплаты?",
      answer: "Сразу после подтверждения оплаты вы получаете ключ активации и ссылку на скачивание удобного лоадера в Telegram или Discord. Активация занимает меньше 1 минуты."
    },
    {
      question: "Банят ли за использование клиента?",
      answer: "Наш софт имеет постоянный статус UNDETECTED благодаря регулярным обновлениям байпассов под новейшие версии популярных античитов (GrimAC, Matrix, Vulcan, Polar, Spartan)."
    },
    {
      question: "На каких версиях Minecraft работает клиент?",
      answer: "Клиент разрабатывается под актуальную версию Minecraft 1.21.x (Fabric), а также совместим с популярными серверами (ReallyWorld, HolyWorld, FunTime, SpookyTime и др.)."
    },
    {
      question: "Сильно ли падает FPS при игре с читом?",
      answer: "Нет! Клиент оптимизирован на уровне шейдеров и потоков, поэтому не только не снижает производительность, но и в большинстве случаев даёт прирост FPS за счет встроенных оптимизаций."
    },
    {
      question: "Какие способы оплаты доступны?",
      answer: "Мы принимаем любые российские и зарубежные карты, СБП (Система быстрых платежей), ЮMoney, криптовалюту (USDT, TON, BTC), а также оплату через Telegram-бота и менеджера."
    }
  ]
};
