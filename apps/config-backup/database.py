"""SQLite database manager for backup metadata"""
import sqlite3
import os
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

# Database path in app directory
DB_PATH = os.path.join(os.path.dirname(__file__), 'config_backup.db')


def get_connection():
    """Get database connection with row factory"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database schema"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sito TEXT NOT NULL,
            nome_sito TEXT,
            ip TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            filename TEXT NOT NULL,
            hash_config TEXT NOT NULL,
            config_size INTEGER,
            connection_method TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create indexes for common queries
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_backups_sito ON backups(sito)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_backups_ip ON backups(ip)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_backups_timestamp ON backups(timestamp DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_backups_hash ON backups(hash_config)')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS auth_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            refresh_jti TEXT NOT NULL UNIQUE,
            expires_at INTEGER NOT NULL,
            revoked INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_auth_sessions_jti ON auth_sessions(refresh_jti)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(username)')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS revoked_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_jti TEXT NOT NULL UNIQUE,
            token_type TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti ON revoked_tokens(token_jti)')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
            username TEXT,
            role TEXT,
            action TEXT NOT NULL,
            resource TEXT,
            outcome TEXT NOT NULL,
            ip_address TEXT,
            details_json TEXT
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(event_ts DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(username)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)')

    conn.commit()
    conn.close()
    logger.info("Database initialized")


def insert_backup(sito, nome_sito, ip, filename, hash_config, config_size, connection_method):
    """
    Insert new backup record.

    Returns:
        int: ID of inserted record
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO backups (sito, nome_sito, ip, filename, hash_config, config_size, connection_method)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (sito, nome_sito, ip, filename, hash_config, config_size, connection_method))

    backup_id = cursor.lastrowid
    conn.commit()
    conn.close()

    logger.info(f"Inserted backup record: id={backup_id}, sito={sito}, ip={ip}")
    return backup_id


def get_backup_by_id(backup_id):
    """Get backup record by ID"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM backups WHERE id = ?', (backup_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def get_latest_backup(sito=None, ip=None):
    """
    Get most recent backup for a site or IP.

    Args:
        sito: Site ID (optional)
        ip: IP address (optional)

    Returns:
        dict: Backup record or None
    """
    conn = get_connection()
    cursor = conn.cursor()

    if sito:
        cursor.execute('''
            SELECT * FROM backups
            WHERE sito = ?
            ORDER BY timestamp DESC
            LIMIT 1
        ''', (sito,))
    elif ip:
        cursor.execute('''
            SELECT * FROM backups
            WHERE ip = ?
            ORDER BY timestamp DESC
            LIMIT 1
        ''', (ip,))
    else:
        return None

    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def get_previous_backup(sito=None, ip=None, exclude_id=None):
    """
    Get the backup before the most recent one.

    Args:
        sito: Site ID (optional)
        ip: IP address (optional)
        exclude_id: ID to exclude (usually current backup)

    Returns:
        dict: Previous backup record or None
    """
    conn = get_connection()
    cursor = conn.cursor()

    if sito:
        if exclude_id:
            cursor.execute('''
                SELECT * FROM backups
                WHERE sito = ? AND id != ?
                ORDER BY timestamp DESC
                LIMIT 1
            ''', (sito, exclude_id))
        else:
            cursor.execute('''
                SELECT * FROM backups
                WHERE sito = ?
                ORDER BY timestamp DESC
                LIMIT 1 OFFSET 1
            ''', (sito,))
    elif ip:
        if exclude_id:
            cursor.execute('''
                SELECT * FROM backups
                WHERE ip = ? AND id != ?
                ORDER BY timestamp DESC
                LIMIT 1
            ''', (ip, exclude_id))
        else:
            cursor.execute('''
                SELECT * FROM backups
                WHERE ip = ?
                ORDER BY timestamp DESC
                LIMIT 1 OFFSET 1
            ''', (ip,))
    else:
        return None

    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def get_backups_list(sito=None, ip=None, limit=50, offset=0):
    """
    Get list of backups with optional filtering.

    Returns:
        list[dict]: List of backup records
    """
    conn = get_connection()
    cursor = conn.cursor()

    if sito:
        cursor.execute('''
            SELECT * FROM backups
            WHERE sito = ?
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        ''', (sito, limit, offset))
    elif ip:
        cursor.execute('''
            SELECT * FROM backups
            WHERE ip = ?
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        ''', (ip, limit, offset))
    else:
        cursor.execute('''
            SELECT * FROM backups
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        ''', (limit, offset))

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_backups_count(sito=None, ip=None):
    """Get total count of backups"""
    conn = get_connection()
    cursor = conn.cursor()

    if sito:
        cursor.execute('SELECT COUNT(*) as count FROM backups WHERE sito = ?', (sito,))
    elif ip:
        cursor.execute('SELECT COUNT(*) as count FROM backups WHERE ip = ?', (ip,))
    else:
        cursor.execute('SELECT COUNT(*) as count FROM backups')

    row = cursor.fetchone()
    conn.close()

    return row['count'] if row else 0


def check_config_exists(hash_config, sito=None, ip=None):
    """
    Check if a configuration with same hash already exists.

    Returns:
        dict: Existing backup record if found, None otherwise
    """
    conn = get_connection()
    cursor = conn.cursor()

    if sito:
        cursor.execute('''
            SELECT * FROM backups
            WHERE hash_config = ? AND sito = ?
            ORDER BY timestamp DESC
            LIMIT 1
        ''', (hash_config, sito))
    elif ip:
        cursor.execute('''
            SELECT * FROM backups
            WHERE hash_config = ? AND ip = ?
            ORDER BY timestamp DESC
            LIMIT 1
        ''', (hash_config, ip))
    else:
        cursor.execute('''
            SELECT * FROM backups
            WHERE hash_config = ?
            ORDER BY timestamp DESC
            LIMIT 1
        ''', (hash_config,))

    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def delete_backup(backup_id):
    """Delete backup record by ID"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('DELETE FROM backups WHERE id = ?', (backup_id,))
    deleted = cursor.rowcount

    conn.commit()
    conn.close()

    return deleted > 0


def get_user_by_username(username):
    """Get user by username."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, username, password_hash, role, is_active, created_at, updated_at FROM users WHERE username = ?',
        (username,),
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def create_user(username, password_hash, role):
    """Create a user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO users (username, password_hash, role, is_active) VALUES (?, ?, ?, 1)',
        (username, password_hash, role),
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id


def count_users():
    """Return number of users."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) AS count FROM users')
    row = cursor.fetchone()
    conn.close()
    return int(row['count']) if row else 0


def create_auth_session(username, refresh_jti, expires_at):
    """Create refresh session row."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO auth_sessions (username, refresh_jti, expires_at, revoked) VALUES (?, ?, ?, 0)',
        (username, refresh_jti, int(expires_at)),
    )
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return session_id


def get_auth_session(refresh_jti):
    """Get refresh session by jti."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, username, refresh_jti, expires_at, revoked, created_at FROM auth_sessions WHERE refresh_jti = ?',
        (refresh_jti,),
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def revoke_auth_session(refresh_jti):
    """Revoke refresh session."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE auth_sessions SET revoked = 1 WHERE refresh_jti = ?',
        (refresh_jti,),
    )
    updated = cursor.rowcount
    conn.commit()
    conn.close()
    return updated > 0


def revoke_all_sessions_for_user(username):
    """Revoke all refresh sessions for a user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE auth_sessions SET revoked = 1 WHERE username = ?',
        (username,),
    )
    updated = cursor.rowcount
    conn.commit()
    conn.close()
    return updated


def add_revoked_token(token_jti, token_type, expires_at):
    """Store revoked access/refresh token jti."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT OR IGNORE INTO revoked_tokens (token_jti, token_type, expires_at) VALUES (?, ?, ?)',
        (token_jti, token_type, int(expires_at)),
    )
    conn.commit()
    conn.close()


def is_token_revoked(token_jti):
    """Check whether token jti is revoked."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT 1 FROM revoked_tokens WHERE token_jti = ? LIMIT 1',
        (token_jti,),
    )
    row = cursor.fetchone()
    conn.close()
    return row is not None


def purge_expired_auth_rows(now_ts=None):
    """Purge expired sessions/revocations to keep DB small."""
    now_ts = int(now_ts or datetime.utcnow().timestamp())
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM auth_sessions WHERE expires_at < ?', (now_ts,))
    cursor.execute('DELETE FROM revoked_tokens WHERE expires_at < ?', (now_ts,))
    conn.commit()
    conn.close()


def add_audit_log(action, outcome, username=None, role=None, resource=None, ip_address=None, details=None):
    """Insert audit event."""
    conn = get_connection()
    cursor = conn.cursor()
    details_json = json.dumps(details or {}, ensure_ascii=True)
    cursor.execute(
        '''
        INSERT INTO audit_logs (username, role, action, resource, outcome, ip_address, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''',
        (username, role, action, resource, outcome, ip_address, details_json),
    )
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id


def get_audit_logs(limit=100, offset=0, username=None, action=None):
    """Get paginated audit logs."""
    conn = get_connection()
    cursor = conn.cursor()
    params = []
    where = []
    if username:
        where.append('username = ?')
        params.append(username)
    if action:
        where.append('action = ?')
        params.append(action)
    where_clause = f"WHERE {' AND '.join(where)}" if where else ''
    query = f'''
        SELECT id, event_ts, username, role, action, resource, outcome, ip_address, details_json
        FROM audit_logs
        {where_clause}
        ORDER BY event_ts DESC
        LIMIT ? OFFSET ?
    '''
    params.extend([limit, offset])
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()
    result = []
    for row in rows:
        item = dict(row)
        try:
            item['details'] = json.loads(item.pop('details_json') or '{}')
        except Exception:
            item['details'] = {}
        result.append(item)
    return result
