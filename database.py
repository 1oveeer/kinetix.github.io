# -*- coding: utf-8 -*-
"""
KINETIX CLIENT — Production Database Module
High-performance SQLite with WAL mode, PBKDF2-HMAC-SHA256 salted hashing,
license key generation, HWID tracking, ban management, and audit logs.
"""

import sqlite3
import os
import sys
import hashlib
import hmac
import secrets
import random
import string
from datetime import datetime, timedelta

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "kinetix.db")
BOT_DB_PATH = os.path.join(os.path.dirname(DB_DIR), "client-bot", "shop.db")
BACKUP_DIR = os.path.join(DB_DIR, "backups")

# ===================================================
# СОЕДИНЕНИЕ И НАСТРОЙКИ SQLite (PRODUCTION WAL)
# ===================================================

def get_connection():
    """
    Возвращает высокопроизводительное соединение SQLite с включённым WAL-режимом,
    быстрым синхронным режимом, поддержкой внешних ключей и расширенным таймаутом.
    """
    conn = sqlite3.connect(DB_PATH, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    # Высокопроизводительные прагмы
    cur.execute("PRAGMA journal_mode = WAL;")
    cur.execute("PRAGMA synchronous = NORMAL;")
    cur.execute("PRAGMA busy_timeout = 15000;")
    cur.execute("PRAGMA foreign_keys = ON;")
    cur.execute("PRAGMA temp_store = MEMORY;")
    cur.execute("PRAGMA cache_size = -64000;")  # 64 MB памяти под кэш страниц
    return conn

# ===================================================
# КРИПТОГРАФИЯ И ХЕШИРОВАНИЕ ПАРОЛЕЙ (PBKDF2 + СОЛЬ)
# ===================================================

def make_password_hash(password: str, salt: str = None) -> tuple:
    """
    Генерирует криптографически стойкий хеш PBKDF2-HMAC-SHA256 (100 000 итераций) с солью.
    """
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    hash_str = f"pbkdf2:sha256:100000${salt}${key.hex()}"
    return hash_str, salt

def hash_password(password: str) -> str:
    """
    Совместимая функция для получения строкового хеша нового пользователя.
    """
    h_str, _ = make_password_hash(password)
    return h_str

def verify_password(plain_password: str, stored_hash: str, salt: str = "", plain_stored: str = "") -> bool:
    """
    Безопасная сверка паролей с защитой от тайминг-атак.
    Поддерживает современный PBKDF2, а также бесшовный переход со старых sha256 и plain.
    """
    if not stored_hash and not plain_stored:
        return False

    # 1. Проверка современного формата PBKDF2
    if stored_hash and stored_hash.startswith("pbkdf2:sha256:"):
        try:
            parts = stored_hash.split("$")
            if len(parts) == 3:
                s_salt = parts[1]
                expected_hash = parts[2]
                calc = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), s_salt.encode("utf-8"), 100000).hex()
                return hmac.compare_digest(calc, expected_hash)
        except Exception:
            pass

    # 2. Обратная совместимость с SHA256
    try:
        legacy_sha = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        if stored_hash and hmac.compare_digest(legacy_sha, stored_hash):
            return True
    except Exception:
        pass

    # 3. Обратная совместимость с plain_password
    try:
        if plain_stored and hmac.compare_digest(plain_stored, plain_password):
            return True
    except Exception:
        pass

    return False

# ===================================================
# ИНИЦИАЛИЗАЦИЯ И МИГРАЦИЯ БАЗЫ ДАННЫХ
# ===================================================

def init_db():
    """
    Инициализирует таблицы базы данных, выполняет безопасную миграцию
    существующих колонок и настраивает индексы для молниеносного поиска.
    """
    conn = get_connection()
    cur = conn.cursor()

    # Таблица пользователей
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            password_salt TEXT,
            plain_password TEXT,
            email TEXT,
            role TEXT DEFAULT 'Пользователь',
            plan TEXT DEFAULT 'FREE',
            plan_name TEXT DEFAULT 'Подписка не активирована',
            is_lifetime INTEGER DEFAULT 0,
            expires_at TEXT,
            hwid TEXT,
            hwid_locked INTEGER DEFAULT 0,
            is_banned INTEGER DEFAULT 0,
            ban_reason TEXT,
            ban_expires_at TEXT,
            balance REAL DEFAULT 0,
            referrals INTEGER DEFAULT 0,
            ref_earnings REAL DEFAULT 0,
            avatar TEXT DEFAULT 'https://minotar.net/avatar/steve/128',
            last_login TIMESTAMP,
            last_ip TEXT,
            login_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Миграция колонок users (если база уже существовала ранее)
    cur.execute("PRAGMA table_info(users)")
    existing_cols = [r["name"] for r in cur.fetchall()]
    
    col_definitions = [
        ("password_salt", "TEXT"),
        ("is_banned", "INTEGER DEFAULT 0"),
        ("ban_reason", "TEXT"),
        ("ban_expires_at", "TEXT"),
        ("last_login", "TIMESTAMP"),
        ("last_ip", "TEXT"),
        ("login_count", "INTEGER DEFAULT 0"),
    ]
    for col_name, col_type in col_definitions:
        if col_name not in existing_cols:
            try:
                cur.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"[!] Migration notice: column {col_name} on users: {e}")

    # Таблица лицензионных ключей
    cur.execute("""
        CREATE TABLE IF NOT EXISTS license_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            plan TEXT NOT NULL,
            duration_days INTEGER DEFAULT 30,
            is_used INTEGER DEFAULT 0,
            used_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP
        )
    """)

    # Таблица облачных конфигов
    cur.execute("""
        CREATE TABLE IF NOT EXISTS configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            server TEXT NOT NULL,
            author TEXT NOT NULL,
            code TEXT NOT NULL,
            downloads INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Таблица аудита и логов действий (Activity Logs)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip TEXT,
            hwid TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Таблица истории смен HWID (защита от мультиаккаунтов и передачи чита)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS hwid_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            old_hwid TEXT,
            new_hwid TEXT,
            ip TEXT,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Индексы для ускорения запросов
    cur.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_keys_key ON license_keys(key);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_keys_used ON license_keys(is_used);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_logs_user ON activity_logs(username);")

    conn.commit()

    create_default_users(conn)
    create_default_keys(conn)
    import_from_bot(conn)

    conn.close()

def log_activity(username: str, action: str, details: str = "", ip: str = "", hwid: str = "", user_id: int = None):
    """
    Записывает аудит-событие в журнал безопасности.
    """
    try:
        conn = get_connection()
        cur = conn.cursor()
        if user_id is None and username:
            cur.execute("SELECT id FROM users WHERE username = ?", (username,))
            u = cur.fetchone()
            if u:
                user_id = u["id"]
        cur.execute("""
            INSERT INTO activity_logs (user_id, username, action, details, ip, hwid)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, username, action, details, ip, hwid))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[!] Failed to write activity log: {e}")

# ===================================================
# ДЕФОЛТНЫЕ ПОЛЬЗОВАТЕЛИ И КЛЮЧИ
# ===================================================

def create_default_users(conn):
    cur = conn.cursor()

    # 1. btw1o (Владелец / Создатель чита)
    cur.execute("SELECT id FROM users WHERE username = 'btw1o'")
    if not cur.fetchone():
        h_hash, h_salt = make_password_hash("admin")
        cur.execute("""
            INSERT INTO users (
                username, password_hash, password_salt, email, role,
                plan, plan_name, is_lifetime, expires_at, hwid,
                hwid_locked, balance, referrals, ref_earnings, avatar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "btw1o",
            h_hash,
            h_salt,
            "btw1o@kinetix.lol",
            "👑 Создатель / Владелец",
            "LIFETIME",
            "KINETIX OWNER VIP",
            1,
            "9999-12-31 23:59:59",
            "B4F8-79C1-D8E2-4D02",
            1,
            14500.0,
            18,
            5400.0,
            "https://minotar.net/avatar/btw1o/128"
        ))

    # 2. admin (Администратор)
    cur.execute("SELECT id FROM users WHERE username = 'admin'")
    if not cur.fetchone():
        h_hash, h_salt = make_password_hash("1337")
        cur.execute("""
            INSERT INTO users (
                username, password_hash, password_salt, email, role,
                plan, plan_name, is_lifetime, expires_at, hwid,
                hwid_locked, balance, referrals, ref_earnings, avatar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "Admin",
            h_hash,
            h_salt,
            "admin@kinetix.lol",
            "Администратор",
            "LIFETIME",
            "KINETIX ADMIN",
            1,
            "9999-12-31 23:59:59",
            "",
            0,
            5000.0,
            5,
            1200.0,
            "https://minotar.net/avatar/admin/128"
        ))

    # 3. 4234234 (PRO LIFETIME)
    cur.execute("SELECT id FROM users WHERE username = '4234234'")
    if not cur.fetchone():
        h_hash, h_salt = make_password_hash("1234")
        cur.execute("""
            INSERT INTO users (
                username, password_hash, password_salt, email, role,
                plan, plan_name, is_lifetime, expires_at, hwid,
                hwid_locked, balance, referrals, ref_earnings, avatar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "4234234",
            h_hash,
            h_salt,
            "4234234@kinetix.lol",
            "PRO LIFETIME",
            "LIFETIME",
            "KINETIX LIFETIME",
            1,
            "9999-12-31 23:59:59",
            "HWID-KNTX-4262",
            1,
            150.0,
            0,
            0.0,
            "https://minotar.net/avatar/steve/128"
        ))

    conn.commit()

def create_default_keys(conn):
    cur = conn.cursor()
    keys = [
        ("KINETIX-LIFE-OWNER-2026", "LIFETIME", 36500),
        ("KINETIX-PRO-30D-A8F2", "30 DAYS", 30),
        ("KINETIX-PRO-30D-B4C9", "30 DAYS", 30),
        ("KINETIX-PRO-7D-X1Y2", "7 DAYS", 7),
    ]
    for k, plan, days in keys:
        cur.execute("SELECT id FROM license_keys WHERE key = ?", (k,))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO license_keys (key, plan, duration_days, is_used)
                VALUES (?, ?, ?, 0)
            """, (k, plan, days))
    conn.commit()

def import_from_bot(conn):
    if not os.path.isfile(BOT_DB_PATH):
        return
    try:
        bot_conn = sqlite3.connect(BOT_DB_PATH)
        bot_conn.row_factory = sqlite3.Row
        b_cur = bot_conn.cursor()
        b_cur.execute("SELECT key, plan, is_used, used_by, used_at FROM license_keys")
        rows = b_cur.fetchall()
        cur = conn.cursor()
        for r in rows:
            cur.execute("SELECT id FROM license_keys WHERE key = ?", (r["key"],))
            if not cur.fetchone():
                days = 36500 if "life" in str(r["plan"]).lower() else 30
                cur.execute("""
                    INSERT INTO license_keys (key, plan, duration_days, is_used, used_by, used_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (r["key"], r["plan"], days, r["is_used"], str(r["used_by"] or ""), r["used_at"]))
        conn.commit()
        bot_conn.close()
    except Exception as e:
        print(f"[!] Sync with bot shop.db: {e}")

# ===================================================
# API ФУНКЦИИ АВТОРИЗАЦИИ И РЕГИСТРАЦИИ
# ===================================================

def authenticate(login: str, password: str, hwid: str = "", ip: str = "") -> tuple:
    """
    Авторизует пользователя, проверяет статус бана, валидирует пароль
    (с автоматическим апгрейдом старых хешей), проверяет привязку HWID
    и возвращает полную информацию о профиле.
    """
    login = str(login).strip()
    password = str(password).strip()

    if not login or not password:
        return False, "Заполните имя пользователя и пароль.", None

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (login,))
    user = cur.fetchone()

    if not user:
        conn.close()
        log_activity(login, "LOGIN_FAILED", "User not found", ip, hwid)
        return False, "Пользователь с таким именем не найден.", None

    # Проверка на бан
    if user["is_banned"]:
        conn.close()
        reason = user["ban_reason"] or "Нарушение правил проекта"
        log_activity(user["username"], "LOGIN_BLOCKED_BANNED", f"Reason: {reason}", ip, hwid, user["id"])
        return False, f"Ваш аккаунт заблокирован! Причина: {reason}", None

    # Сверка пароля
    stored_hash = user["password_hash"] or ""
    stored_salt = user["password_salt"] or ""
    stored_plain = user["plain_password"] or ""

    valid_pass = verify_password(password, stored_hash, stored_salt, stored_plain)

    # Привилегированный вход для владельца
    if user["username"].lower() == "btw1o" and password in ["admin", "1337"]:
        valid_pass = True

    if not valid_pass:
        conn.close()
        log_activity(user["username"], "LOGIN_FAILED", "Invalid password", ip, hwid, user["id"])
        return False, "Неверный пароль.", None

    # Автоматический прозрачный апгрейд пароля до PBKDF2 при успешном входе
    if not stored_hash.startswith("pbkdf2:sha256:") or stored_plain:
        new_hash, new_salt = make_password_hash(password)
        cur.execute("""
            UPDATE users 
            SET password_hash = ?, password_salt = ?, plain_password = NULL 
            WHERE id = ?
        """, (new_hash, new_salt, user["id"]))
        conn.commit()

    # Привязка и проверка HWID
    user_hwid = user["hwid"] or ""
    if hwid:
        if not user_hwid:
            # Первая привязка устройства
            cur.execute("UPDATE users SET hwid = ?, hwid_locked = 1 WHERE id = ?", (hwid, user["id"]))
            conn.commit()
            user_hwid = hwid
            cur.execute("""
                INSERT INTO hwid_history (username, old_hwid, new_hwid, ip, reason)
                VALUES (?, '', ?, ?, 'Initial HWID binding')
            """, (user["username"], hwid, ip))
            conn.commit()
        elif user_hwid != hwid and user["hwid_locked"] and user["username"].lower() != "btw1o":
            conn.close()
            log_activity(user["username"], "LOGIN_BLOCKED_HWID", f"Expected: {user_hwid}, got: {hwid}", ip, hwid, user["id"])
            return False, f"HWID не совпадает! Аккаунт привязан к другому ПК ({user_hwid}). Сбросьте HWID на сайте.", None

    # Обновляем время входа и счетчик
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute("""
        UPDATE users 
        SET last_login = ?, last_ip = ?, login_count = login_count + 1 
        WHERE id = ?
    """, (now_str, ip or "", user["id"]))
    conn.commit()

    # Расчет статуса подписки
    is_lifetime = bool(user["is_lifetime"] or user["username"].lower() == "btw1o")
    expires = user["expires_at"] or ""
    days_left = 0
    is_active = False

    if is_lifetime:
        is_active = True
        days_left = 99999
    elif expires:
        try:
            exp_dt = datetime.strptime(expires, "%Y-%m-%d %H:%M:%S")
            if datetime.now() <= exp_dt:
                is_active = True
                delta = exp_dt - datetime.now()
                days_left = max(1, delta.days + (1 if delta.seconds > 0 else 0))
            else:
                is_active = False
                days_left = 0
        except Exception:
            is_active = False
            days_left = 0

    user_dict = dict(user)
    user_dict.pop("password_hash", None)
    user_dict.pop("password_salt", None)
    user_dict.pop("plain_password", None)

    user_dict["hwid"] = user_hwid
    user_dict["hwid_locked"] = 1 if user_hwid else 0
    user_dict["is_active"] = is_active
    user_dict["is_lifetime"] = 1 if is_lifetime else 0
    user_dict["isLifetime"] = is_lifetime
    user_dict["days_left"] = days_left
    user_dict["daysLeft"] = "Навсегда" if is_lifetime else (f"{days_left} дн." if is_active else "0 дн.")
    user_dict["sub_status"] = "active" if is_active else "inactive"
    user_dict["sub_tier"] = ("LIFETIME" if is_lifetime else (user_dict.get("plan_name") or "KINETIX PREMIUM")) if is_active else "Не активирована"
    user_dict["sub_expires"] = "Бессрочно" if is_lifetime else (expires if is_active else "—")
    user_dict["planName"] = ("KINETIX OWNER VIP" if is_lifetime else (user_dict.get("plan_name") or "KINETIX PREMIUM")) if is_active else "Подписка не активирована"
    user_dict["plan_name"] = user_dict["planName"]
    user_dict["expiryDate"] = user_dict["sub_expires"]

    conn.close()
    log_activity(user["username"], "LOGIN_SUCCESS", f"Sub: {user_dict['sub_status']}", ip, hwid, user["id"])
    return True, "Авторизация успешна.", user_dict

def register(username: str, password: str, email: str = "", hwid: str = "", ip: str = "") -> tuple:
    """
    Регистрирует нового пользователя с надежным PBKDF2 хешированием.
    Новый аккаунт создается со статусом 'Подписка не активирована'.
    """
    username = str(username).strip()
    password = str(password).strip()

    if len(username) < 3:
        return False, "Имя пользователя должно содержать не менее 3 символов.", None
    if len(password) < 4:
        return False, "Пароль должен содержать не менее 4 символов.", None

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cur.fetchone():
        conn.close()
        return False, "Пользователь с таким именем уже существует.", None

    p_hash, p_salt = make_password_hash(password)
    avatar = f"https://minotar.net/avatar/{username}/128"

    cur.execute("""
        INSERT INTO users (
            username, password_hash, password_salt, plain_password, email, role,
            plan, plan_name, is_lifetime, expires_at, hwid,
            hwid_locked, balance, avatar, last_ip
        ) VALUES (?, ?, ?, NULL, ?, 'Пользователь', 'FREE', 'Подписка не активирована', 0, NULL, ?, ?, 0, ?, ?)
    """, (
        username,
        p_hash,
        p_salt,
        email or f"{username}@kinetix.lol",
        hwid or "",
        1 if hwid else 0,
        avatar,
        ip or ""
    ))
    conn.commit()
    user_id = cur.lastrowid

    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    new_user = dict(cur.fetchone())
    new_user.pop("password_hash", None)
    new_user.pop("password_salt", None)
    new_user.pop("plain_password", None)

    new_user["is_active"] = False
    new_user["is_lifetime"] = 0
    new_user["isLifetime"] = False
    new_user["days_left"] = 0
    new_user["daysLeft"] = "0 дн."
    new_user["sub_status"] = "inactive"
    new_user["sub_tier"] = "Не активирована"
    new_user["sub_expires"] = "—"
    new_user["planName"] = "Подписка не активирована"
    new_user["plan_name"] = "Подписка не активирована"
    new_user["expiryDate"] = "—"

    conn.close()
    log_activity(username, "REGISTER", "New user registration", ip, hwid, user_id)
    return True, "Регистрация успешна!", new_user

# ===================================================
# УПРАВЛЕНИЕ КЛЮЧАМИ И ПОДПИСКАМИ
# ===================================================

def activate_license_key(username: str, key_str: str, ip: str = "") -> tuple:
    """
    Активирует ключ, безопасно продлевает или открывает доступ к читу.
    """
    key_str = str(key_str).strip().upper()
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return False, "Пользователь не найден."

    cur.execute("SELECT * FROM license_keys WHERE key = ?", (key_str,))
    key_row = cur.fetchone()
    if not key_row:
        conn.close()
        return False, "Лицензионный ключ не существует."

    if key_row["is_used"]:
        conn.close()
        return False, f"Этот ключ уже был активирован ({key_row['used_at']})."

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    days = key_row["duration_days"] or 30
    plan = key_row["plan"]

    is_lifetime = 1 if (days >= 3650 or "life" in str(plan).lower()) else 0

    if is_lifetime:
        new_expires = "9999-12-31 23:59:59"
        plan_name = "KINETIX LIFETIME"
        role = "Пользователь (LIFETIME)" if "ADMIN" not in user["role"].upper() else user["role"]
    else:
        curr_exp = user["expires_at"]
        start_date = datetime.now()
        if curr_exp:
            try:
                parsed = datetime.strptime(curr_exp, "%Y-%m-%d %H:%M:%S")
                if parsed > start_date:
                    start_date = parsed
            except Exception:
                pass
        new_expires = (start_date + timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
        plan_name = f"KINETIX {days} ДНЕЙ"
        role = "Пользователь (VIP)" if "ADMIN" not in user["role"].upper() else user["role"]

    cur.execute("""
        UPDATE license_keys 
        SET is_used = 1, used_by = ?, used_at = ? 
        WHERE id = ?
    """, (username, now_str, key_row["id"]))

    cur.execute("""
        UPDATE users 
        SET plan = ?, plan_name = ?, is_lifetime = ?, expires_at = ?, role = ?
        WHERE id = ?
    """, (plan, plan_name, is_lifetime, new_expires, role, user["id"]))

    conn.commit()
    conn.close()

    log_activity(username, "KEY_ACTIVATED", f"Key: {key_str}, Plan: {plan_name}, Exp: {new_expires}", ip, user["hwid"], user["id"])
    return True, f"Ключ на {plan_name} успешно активирован до {new_expires}!"

def create_key(plan: str = "30 DAYS", days: int = 30, prefix: str = "KINETIX") -> dict:
    """
    Генерирует и сохраняет новый уникальный лицензионный ключ.
    """
    tag = "LIFE" if ("life" in plan.lower() or days >= 3650) else f"{days}D"
    rand1 = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    rand2 = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    key_str = f"{prefix}-{tag}-{rand1}-{rand2}"

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO license_keys (key, plan, duration_days, is_used) VALUES (?, ?, ?, 0)", (key_str, plan, days))
    conn.commit()
    conn.close()
    return {"success": True, "key": key_str, "plan": plan, "duration_days": days}

def generate_batch_keys(plan: str = "30 DAYS", count: int = 10, days: int = 30, prefix: str = "KINETIX") -> list:
    """
    Генерирует пачку ключей в одной транзакции (для продажи или выдачи).
    """
    tag = "LIFE" if ("life" in plan.lower() or days >= 3650) else f"{days}D"
    conn = get_connection()
    cur = conn.cursor()
    generated = []
    for _ in range(count):
        r1 = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        r2 = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        k = f"{prefix}-{tag}-{r1}-{r2}"
        cur.execute("INSERT OR IGNORE INTO license_keys (key, plan, duration_days, is_used) VALUES (?, ?, ?, 0)", (k, plan, days))
        generated.append(k)
    conn.commit()
    conn.close()
    return generated

# ===================================================
# УПРАВЛЕНИЕ HWID И БАНАМИ
# ===================================================

def reset_hwid(username: str, new_hwid: str = "", ip: str = "", reason: str = "Сброс пользователем", charge_fee: bool = True, fee_amount: float = 150.0) -> tuple:
    """
    Сбрасывает привязку к устройству с записью в журнал истории HWID.
    При charge_fee=True проверяет баланс и списывает fee_amount (150 ₽).
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, hwid, balance, role FROM users WHERE username = ?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return False, "Пользователь не найден."

    current_balance = float(user["balance"] or 0)
    old_hwid = user["hwid"] or ""

    if charge_fee:
        if current_balance < fee_amount:
            conn.close()
            return False, f"Недостаточно средств на балансе! Стоимость сброса HWID составляет {fee_amount:.0f} ₽. Ваш баланс: {current_balance:.0f} ₽. Пополните баланс."

        new_balance = current_balance - fee_amount
        cur.execute("UPDATE users SET hwid = ?, hwid_locked = ?, balance = ? WHERE id = ?", (
            new_hwid or "",
            1 if new_hwid else 0,
            new_balance,
            user["id"]
        ))
        reset_reason = f"Платный сброс HWID ({fee_amount:.0f} ₽)"
    else:
        new_balance = current_balance
        cur.execute("UPDATE users SET hwid = ?, hwid_locked = ? WHERE id = ?", (
            new_hwid or "",
            1 if new_hwid else 0,
            user["id"]
        ))
        reset_reason = reason

    cur.execute("""
        INSERT INTO hwid_history (username, old_hwid, new_hwid, ip, reason)
        VALUES (?, ?, ?, ?, ?)
    """, (username, old_hwid, new_hwid, ip, reset_reason))
    conn.commit()
    conn.close()

    log_activity(username, "HWID_RESET", f"{reset_reason}. Old: {old_hwid}, New: {new_hwid or 'Cleared'}, Balance: {new_balance:.0f} ₽", ip, new_hwid, user["id"])
    msg = f"HWID успешно сброшен! С вашего баланса списано {fee_amount:.0f} ₽. Текущий баланс: {new_balance:.0f} ₽." if charge_fee else "HWID успешно сброшен."
    return True, msg

def add_user_balance(username: str, amount: float, reason: str = "Пополнение баланса", ip: str = "") -> tuple:
    """
    Пополняет баланс пользователя на указанную сумму.
    """
    if amount <= 0:
        return False, "Сумма пополнения должна быть больше 0 ₽."

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, balance FROM users WHERE username = ?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return False, "Пользователь не найден."

    current_balance = float(user["balance"] or 0)
    new_balance = current_balance + float(amount)
    cur.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user["id"]))
    conn.commit()
    conn.close()

    log_activity(username, "BALANCE_TOPUP", f"Пополнение на +{amount:.0f} ₽. Баланс: {new_balance:.0f} ₽ ({reason})", ip, "", user["id"])
    return True, f"Баланс пользователя {username} успешно пополнен на {amount:.0f} ₽! Новый баланс: {new_balance:.0f} ₽."

def ban_user(username: str, reason: str = "Нарушение правил проекта", days: int = None) -> tuple:
    """
    Блокирует доступ пользователя к читу и сайту.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username = ?", (username,))
    u = cur.fetchone()
    if not u:
        conn.close()
        return False, "Пользователь не найден."

    ban_exp = None
    if days:
        ban_exp = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")

    cur.execute("""
        UPDATE users 
        SET is_banned = 1, ban_reason = ?, ban_expires_at = ? 
        WHERE id = ?
    """, (reason, ban_exp, u["id"]))
    conn.commit()
    conn.close()

    log_activity(username, "BAN", f"Reason: {reason}, Expires: {ban_exp}", user_id=u["id"])
    return True, f"Пользователь {username} успешно заблокирован."

def unban_user(username: str) -> tuple:
    """
    Разблокирует пользователя.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username = ?", (username,))
    u = cur.fetchone()
    if not u:
        conn.close()
        return False, "Пользователь не найден."

    cur.execute("""
        UPDATE users 
        SET is_banned = 0, ban_reason = NULL, ban_expires_at = NULL 
        WHERE id = ?
    """, (u["id"],))
    conn.commit()
    conn.close()

    log_activity(username, "UNBAN", "User unbanned", user_id=u["id"])
    return True, f"Пользователь {username} успешно разблокирован."

# ===================================================
# ПРОФИЛЬ И СТАТИСТИКА
# ===================================================

def get_user_profile(username: str) -> dict:
    """
    Возвращает расширенные данные профиля пользователя.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return None

    res = dict(user)
    res.pop("password_hash", None)
    res.pop("password_salt", None)
    res.pop("plain_password", None)

    is_lifetime = bool(res.get("is_lifetime") or res.get("username", "").lower() == "btw1o")
    expires = res.get("expires_at") or ""
    is_active = False
    days_left = 0

    if is_lifetime:
        is_active = True
        days_left = 99999
    elif expires:
        try:
            exp_dt = datetime.strptime(expires, "%Y-%m-%d %H:%M:%S")
            if datetime.now() <= exp_dt:
                is_active = True
                delta = exp_dt - datetime.now()
                days_left = max(1, delta.days + (1 if delta.seconds > 0 else 0))
        except Exception:
            is_active = False
            days_left = 0

    res["is_active"] = is_active
    res["is_lifetime"] = 1 if is_lifetime else 0
    res["isLifetime"] = is_lifetime
    res["days_left"] = days_left
    res["daysLeft"] = "Навсегда" if is_lifetime else (f"{days_left} дн." if is_active else "0 дн.")
    res["sub_status"] = "active" if is_active else "inactive"
    res["sub_tier"] = ("LIFETIME" if is_lifetime else (res.get("plan_name") or "KINETIX PREMIUM")) if is_active else "Не активирована"
    res["sub_expires"] = "Бессрочно" if is_lifetime else (expires if is_active else "—")
    res["planName"] = ("KINETIX OWNER VIP" if is_lifetime else (res.get("plan_name") or "KINETIX PREMIUM")) if is_active else "Подписка не активирована"
    res["plan_name"] = res["planName"]
    res["expiryDate"] = res["sub_expires"]

    cur.execute("SELECT id, name, server, author, downloads, code FROM configs WHERE user_id = ? ORDER BY id DESC", (res["id"],))
    res["configs"] = [dict(r) for r in cur.fetchall()]

    conn.close()
    return res

def list_all_users() -> list:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, username, email, role, plan, plan_name, is_lifetime, expires_at, hwid, balance, is_banned, last_login 
        FROM users 
        ORDER BY id ASC
    """)
    users = [dict(r) for r in cur.fetchall()]
    conn.close()
    return users

def get_database_stats() -> dict:
    """
    Возвращает ключевые метрики проекта для панели управления.
    """
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM users")
    total_users = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM users WHERE is_banned = 1")
    banned_users = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM users WHERE is_lifetime = 1 OR expires_at > datetime('now')")
    active_subs = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM license_keys")
    total_keys = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM license_keys WHERE is_used = 0")
    unused_keys = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM license_keys WHERE is_used = 1")
    used_keys = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM configs")
    total_configs = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM activity_logs")
    total_logs = cur.fetchone()[0]

    conn.close()
    return {
        "total_users": total_users,
        "banned_users": banned_users,
        "active_subs": active_subs,
        "total_keys": total_keys,
        "unused_keys": unused_keys,
        "used_keys": used_keys,
        "total_configs": total_configs,
        "total_logs": total_logs
    }

def backup_database(dest_folder: str = None) -> str:
    """
    Создает атомарный безопасный онлайн-бэкап базы данных без блокировки читателей и писателей.
    """
    target_dir = dest_folder or BACKUP_DIR
    os.makedirs(target_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(target_dir, f"kinetix_backup_{ts}.db")

    src = get_connection()
    dst = sqlite3.connect(backup_file)
    with dst:
        src.backup(dst, pages=100)
    dst.close()
    src.close()
    return backup_file

# Совместимые шлюзы для веб-сервера
def authenticate_user(login, password, hwid=""):
    ok, msg, u = authenticate(login, password, hwid)
    if ok:
        return {"success": True, "message": msg, "user": u}
    return {"success": False, "error": msg}

def activate_key(username, key_str):
    ok, msg = activate_license_key(username, key_str)
    if ok:
        prof = get_user_profile(username)
        return {
            "success": True,
            "message": msg,
            "plan": prof.get("plan_name", prof.get("plan")),
            "expires": prof.get("expires_at", "Активна")
        }
    return {"success": False, "error": msg}

# Автоматический запуск инициализации при импорте
init_db()

# ===================================================
# CLI УТИЛИТА АДМИНИСТРАТОРА (КОНСОЛЬ УПРАВЛЕНИЯ)
# ===================================================

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Kinetix Client — Production Database CLI")
    parser.add_argument("--stats", action="store_true", help="Показать общую статистику проекта")
    parser.add_argument("--list-users", action="store_true", help="Показать список всех пользователей")
    parser.add_argument("--gen-keys", type=int, default=0, help="Количество генерируемых ключей")
    parser.add_argument("--plan", type=str, default="30 DAYS", help="Тариф для генерации (30 DAYS, LIFETIME и т.д.)")
    parser.add_argument("--days", type=int, default=30, help="Длительность тарифа в днях")
    parser.add_argument("--ban", type=str, help="Забанить пользователя по логину")
    parser.add_argument("--reason", type=str, default="Нарушение правил", help="Причина бана")
    parser.add_argument("--unban", type=str, help="Разбанить пользователя по логину")
    parser.add_argument("--reset-hwid", type=str, help="Сбросить HWID пользователю")
    parser.add_argument("--add-balance", nargs=2, metavar=("USERNAME", "AMOUNT"), help="Пополнить баланс пользователю: --add-balance username 150")
    parser.add_argument("--backup", action="store_true", help="Создать резервную копию базы данных")

    args = parser.parse_args()

    if args.stats:
        stats = get_database_stats()
        print("\n=== KINETIX CLIENT DATABASE STATS ===")
        for k, v in stats.items():
            print(f"  {k:20s}: {v}")
        print("=====================================\n")

    elif args.list_users:
        users = list_all_users()
        print(f"\nTotal users: {len(users)}")
        print(f"{'ID':<4} {'Username':<16} {'Plan':<18} {'Expires':<20} {'HWID':<22} {'Banned':<6}")
        print("-" * 90)
        for u in users:
            banned = "YES" if u.get("is_banned") else "NO"
            print(f"{u['id']:<4} {u['username']:<16} {str(u['plan_name'] or u['plan']):<18} {str(u['expires_at'] or '—'):<20} {str(u['hwid'] or '—'):<22} {banned:<6}")
        print("")

    elif args.gen_keys > 0:
        keys = generate_batch_keys(plan=args.plan, count=args.gen_keys, days=args.days)
        print(f"\n[+] Успешно сгенерировано {len(keys)} ключей ({args.plan}, {args.days} дн.):")
        for k in keys:
            print(f"  {k}")
        print("")

    elif args.ban:
        ok, msg = ban_user(args.ban, args.reason)
        print(f"[{'+' if ok else '!'}] {msg}")

    elif args.unban:
        ok, msg = unban_user(args.unban)
        print(f"[{'+' if ok else '!'}] {msg}")

    elif args.reset_hwid:
        ok, msg = reset_hwid(args.reset_hwid, charge_fee=False)
        print(f"[{'+' if ok else '!'}] {msg}")

    elif args.add_balance:
        uname = args.add_balance[0]
        try:
            amt = float(args.add_balance[1])
            ok, msg = add_user_balance(uname, amt, reason="Админ-пополнение через CLI")
            print(f"[{'+' if ok else '!'}] {msg}")
        except ValueError:
            print("[!] Ошибка: сумма должна быть числом!")

    elif args.backup:
        path = backup_database()
        print(f"[+] Бэкап успешно сохранен: {path}")

    else:
        stats = get_database_stats()
        print(f"[Kinetix DB] Online | Users: {stats['total_users']} | Active Subs: {stats['active_subs']} | Keys Available: {stats['unused_keys']}")
