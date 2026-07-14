"""
AI Quiz App - Backend v6
Roles: teacher, student
Features: role-based auth, email verification, AI question generation,
          quiz creation/assignment, class analytics, admin panel
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os, sqlite3, random, hashlib, re, time, json
import smtplib
from email.mime.text      import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
try:
    from google import genai as _genai   # google-genai
    from google.genai import types as _genai_types
    _gemini_available = True
except ImportError:
    _gemini_available = False

load_dotenv()

app = Flask(__name__)
CORS(app)
DB_FILE = "quiz.db"

# ══════════════════════════════════════════════════════════
#  ⚙️  GMAIL CONFIG — set GMAIL_USER / GMAIL_APP_PASS in .env
# ══════════════════════════════════════════════════════════
GMAIL_USER     = os.environ.get("GMAIL_USER", "")
GMAIL_APP_PASS = os.environ.get("GMAIL_APP_PASS", "")

# ══════════════════════════════════════════════════════════
#  ⚙️  GEMINI CONFIG — for AI question generation (free tier)
# ══════════════════════════════════════════════════════════
#
#  HOW TO GET A GEMINI API KEY (free):
#  1. Go to https://aistudio.google.com/apikey
#  2. Click "Create API key"
#  3. Copy the key
#  4. Put it in .env as GEMINI_API_KEY=...
#
#  NOTE: Requires the google-generativeai package:
#        pip install google-generativeai
#
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "your-gemini-key-here")
_gemini_client = None
if _gemini_available and not GEMINI_API_KEY.startswith("your-gemini"):
    _gemini_client = _genai.Client(api_key=GEMINI_API_KEY)
# ══════════════════════════════════════════════════════════

# ── DATABASE ──────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db(); c = conn.cursor()

    # users — role: 'student' | 'teacher' | 'admin'
    # email_verified: 1 = verified   suspended: 1 = suspended by admin
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        username       TEXT    UNIQUE NOT NULL,
        email          TEXT    UNIQUE NOT NULL,
        password       TEXT    NOT NULL,
        role           TEXT    NOT NULL DEFAULT 'student'
                              CHECK(role IN ('student','teacher','admin')),
        email_verified INTEGER NOT NULL DEFAULT 0,
        suspended      INTEGER NOT NULL DEFAULT 0,
        grade          TEXT    NOT NULL DEFAULT '',
        class_name     TEXT    NOT NULL DEFAULT '',
        roll_number    TEXT    NOT NULL DEFAULT '',
        batch          TEXT    NOT NULL DEFAULT '',
        degree         TEXT    NOT NULL DEFAULT '',
        section        TEXT    NOT NULL DEFAULT '',
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP)""")

    # Migration: add suspended column if upgrading from an older DB
    try:
        c.execute("ALTER TABLE users ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0")
    except Exception:
        pass  # column already exists — that's fine

    # email verification codes
    c.execute("""CREATE TABLE IF NOT EXISTS email_verifications (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        email      TEXT    NOT NULL,
        code       TEXT    NOT NULL,
        expires_at INTEGER NOT NULL,
        used       INTEGER NOT NULL DEFAULT 0)""")

    # topics — created by teachers
    c.execute("""CREATE TABLE IF NOT EXISTS topics (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT    UNIQUE NOT NULL,
        description TEXT,
        created_by  INTEGER NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id))""")

    # questions — can be AI-generated or manually created
    c.execute("""CREATE TABLE IF NOT EXISTS questions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id     INTEGER NOT NULL,
        question     TEXT    NOT NULL,
        option_a     TEXT    NOT NULL,
        option_b     TEXT    NOT NULL,
        option_c     TEXT    NOT NULL,
        option_d     TEXT    NOT NULL,
        answer       TEXT    NOT NULL,
        difficulty   TEXT    NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
        ai_generated INTEGER NOT NULL DEFAULT 0,
        approved     INTEGER NOT NULL DEFAULT 1,
        created_by   INTEGER,
        FOREIGN KEY (topic_id)   REFERENCES topics(id),
        FOREIGN KEY (created_by) REFERENCES users(id))""")

    # quizzes — published by teachers
    c.execute("""CREATE TABLE IF NOT EXISTS quizzes (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        title        TEXT    NOT NULL,
        topic_id     INTEGER NOT NULL,
        difficulty   TEXT    NOT NULL DEFAULT 'easy',
        time_limit   INTEGER NOT NULL DEFAULT 20,
        question_ids TEXT    NOT NULL DEFAULT '[]',
        created_by   INTEGER NOT NULL,
        published    INTEGER NOT NULL DEFAULT 0,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id)   REFERENCES topics(id),
        FOREIGN KEY (created_by) REFERENCES users(id))""")

    # quiz assignments — teacher assigns quiz to student(s)
    c.execute("""CREATE TABLE IF NOT EXISTS assignments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id     INTEGER NOT NULL,
        student_id  INTEGER NOT NULL,
        assigned_by INTEGER NOT NULL,
        due_date    TEXT,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(quiz_id, student_id),
        FOREIGN KEY (quiz_id)     REFERENCES quizzes(id),
        FOREIGN KEY (student_id)  REFERENCES users(id),
        FOREIGN KEY (assigned_by) REFERENCES users(id))""")

    # quiz attempts — student's quiz results
    c.execute("""CREATE TABLE IF NOT EXISTS quiz_attempts (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id          INTEGER NOT NULL,
        student_id       INTEGER NOT NULL,
        score            INTEGER NOT NULL,
        total            INTEGER NOT NULL,
        score_percentage REAL    NOT NULL DEFAULT 0,
        answers_json     TEXT    NOT NULL DEFAULT '[]',
        taken_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id)    REFERENCES quizzes(id),
        FOREIGN KEY (student_id) REFERENCES users(id))""")

    # password reset tokens
    c.execute("""CREATE TABLE IF NOT EXISTS password_resets (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        email      TEXT    NOT NULL,
        token      TEXT    NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        used       INTEGER NOT NULL DEFAULT 0)""")

    conn.commit()

    # ── Migrate existing databases: add new columns if they don't exist ──
    for col, definition in [
        ("grade",       "TEXT NOT NULL DEFAULT ''"),
        ("class_name",  "TEXT NOT NULL DEFAULT ''"),
        ("roll_number", "TEXT NOT NULL DEFAULT ''"),
        ("batch",       "TEXT NOT NULL DEFAULT ''"),
        ("degree",      "TEXT NOT NULL DEFAULT ''"),
        ("section",     "TEXT NOT NULL DEFAULT ''"),
    ]:
        try:
            c.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")
            conn.commit()
            print(f"✅ Migration: added '{col}' column to users")
        except Exception:
            pass  # Column already exists — that's fine

    # ⚠️ ORDER MATTERS: admin must exist before topics (topics.created_by FK refs users.id)
    _seed_admin(c)
    conn.commit()        # commit admin row so its id=1 is visible to the next insert

    # Migration: fix any old admin account that was incorrectly saved as 'teacher'
    c.execute("UPDATE users SET role='admin' WHERE username='admin' AND role='teacher'")
    conn.commit()
    _seed_topics(c)
    conn.commit()
    conn.close()
    print("✅ Database ready.")

def _seed_topics(c):
    topics = [
        ("Computer Science", "Programming, algorithms, data structures", 1),
        ("Science",          "Physics, chemistry, biology",              1),
        ("Math",             "Algebra, calculus, geometry",              1),
        ("Machine Learning", "AI, neural networks, data science",        1),
    ]
    for name, desc, uid in topics:
        c.execute("INSERT OR IGNORE INTO topics (name, description, created_by) VALUES (?,?,?)", (name, desc, uid))

def _seed_admin(c):
    """Creates a default admin/teacher account."""
    exists = c.execute("SELECT id FROM users WHERE username='admin'").fetchone()
    if not exists:
        c.execute("""INSERT INTO users (username, email, password, role, email_verified)
                     VALUES ('admin','admin@quizapp.com',?,  'admin', 1)""",
                  (hash_password("admin123"),))
        print("✅ Default teacher account: admin / admin123")

def seed_questions():
    """Seed sample questions linked to topic IDs."""
    conn = get_db(); c = conn.cursor()
    if c.execute("SELECT COUNT(*) FROM questions").fetchone()[0] > 0:
        conn.close(); return

    # Get topic IDs
    tids = {r["name"]: r["id"] for r in c.execute("SELECT id,name FROM topics").fetchall()}

    questions = [
        # Computer Science
        (tids.get("Computer Science",1),"What does CPU stand for?","Central Processing Unit","Computer Personal Unit","Central Power Unit","Control Process Unit","Central Processing Unit","easy",0,1,1),
        (tids.get("Computer Science",1),"What does HTML stand for?","HyperText Markup Language","High Text Making Language","HyperText Making Language","None of these","HyperText Markup Language","medium",0,1,1),
        (tids.get("Computer Science",1),"Which data structure works on LIFO principle?","Queue","Array","Stack","Linked List","Stack","medium",0,1,1),
        (tids.get("Computer Science",1),"What is the time complexity of binary search?","O(n)","O(log n)","O(n²)","O(1)","O(log n)","hard",0,1,1),
        (tids.get("Computer Science",1),"What does CSS stand for?","Computer Style Sheets","Cascading Style Sheets","Creative Style Syntax","Colorful Style Sheets","Cascading Style Sheets","easy",0,1,1),
        (tids.get("Computer Science",1),"Which language runs in a web browser?","Python","Java","JavaScript","C++","JavaScript","easy",0,1,1),
        # Science
        (tids.get("Science",2),"Which planet is closest to the Sun?","Venus","Earth","Mercury","Mars","Mercury","easy",0,1,1),
        (tids.get("Science",2),"What is the chemical symbol for Gold?","Go","Gd","Au","Ag","Au","easy",0,1,1),
        (tids.get("Science",2),"What is the powerhouse of the cell?","Nucleus","Ribosome","Mitochondria","Golgi body","Mitochondria","easy",0,1,1),
        (tids.get("Science",2),"What is Newton's second law of motion?","F = ma","E = mc²","v = u + at","P = mv","F = ma","medium",0,1,1),
        (tids.get("Science",2),"What is the atomic number of Carbon?","4","6","8","12","6","medium",0,1,1),
        (tids.get("Science",2),"Which planet has the most moons?","Jupiter","Saturn","Uranus","Neptune","Saturn","hard",0,1,1),
        # Math
        (tids.get("Math",3),"What is 5 × 6?","28","30","32","35","30","easy",0,1,1),
        (tids.get("Math",3),"What is √144?","11","12","13","14","12","easy",0,1,1),
        (tids.get("Math",3),"What is the value of π approximately?","3.14","2.71","1.61","1.41","3.14","easy",0,1,1),
        (tids.get("Math",3),"If x² = 49, what is x?","6","7","8","9","7","medium",0,1,1),
        (tids.get("Math",3),"What is the derivative of x²?","x","2x","x²","2","2x","hard",0,1,1),
        (tids.get("Math",3),"What is 15% of 200?","25","30","35","40","30","medium",0,1,1),
        # Machine Learning
        (tids.get("Machine Learning",4),"What does 'supervised learning' mean?","Learning without data","Learning from labeled data","Learning by rewards","Learning by clustering","Learning from labeled data","easy",0,1,1),
        (tids.get("Machine Learning",4),"Which algorithm is used for classification?","Linear Regression","Logistic Regression","K-Means","PCA","Logistic Regression","medium",0,1,1),
        (tids.get("Machine Learning",4),"What does CNN stand for?","Convolutional Neural Network","Computed Numerical Network","Central Node Network","Clustered Neural Node","Convolutional Neural Network","medium",0,1,1),
        (tids.get("Machine Learning",4),"What does 'gradient descent' do?","Increases model complexity","Minimizes the loss function","Splits data into batches","Normalizes features","Minimizes the loss function","hard",0,1,1),
    ]
    c.executemany("""INSERT INTO questions
        (topic_id,question,option_a,option_b,option_c,option_d,answer,difficulty,ai_generated,approved,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)""", questions)
    conn.commit(); conn.close()
    print(f"✅ Seeded {len(questions)} questions.")

# ── HELPERS ───────────────────────────────────────────────

def hash_password(p): return hashlib.sha256(p.encode()).hexdigest()
def is_valid_email(e): return bool(re.match(r"^[^@]+@[^@]+\.[^@]+$", e))
def get_difficulty(pct):
    return "hard" if pct>=75 else "medium" if pct>=40 else "easy"

def require_role(*roles):
    """Checks X-User-Id and X-User-Role headers — simple auth guard."""
    uid  = request.headers.get("X-User-Id")
    role = request.headers.get("X-User-Role")
    if not uid or not role:
        return None, jsonify({"error":"Not authenticated"}), 401
    if role not in roles:
        return None, jsonify({"error":"Access denied"}), 403
    return int(uid), None, None

# ── EMAIL ─────────────────────────────────────────────────

def _send_email(to_email, subject, plain, html):
    """Low-level email sender. Returns (True, None) or (False, error_string)."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"AI Quiz App <{GMAIL_USER}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(plain, "plain"))
        msg.attach(MIMEText(html,  "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(GMAIL_USER, GMAIL_APP_PASS)
            s.sendmail(GMAIL_USER, to_email, msg.as_string())
        print(f"✅ Email sent to {to_email}: {subject}")
        return True, None
    except smtplib.SMTPAuthenticationError:
        err = "Gmail auth failed. Check GMAIL_USER/GMAIL_APP_PASS."
        print(f"❌ {err}"); return False, err
    except Exception as e:
        print(f"❌ Email error: {e}"); return False, str(e)

def send_verification_email(to_email, code, username, role):
    role_label = "Teacher" if role == "teacher" else "Student"
    plain = f"Hi {username},\n\nYour {role_label} account verification code is: {code}\n\nExpires in 15 minutes.\n\n— AI Quiz App"
    html = f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:40px 20px;" align="center">
<table width="520" cellspacing="0" cellpadding="0" style="background:#1a1d2e;border-radius:20px;overflow:hidden;border:1px solid #2a2d3e;max-width:520px;width:100%;">
<tr><td style="background:linear-gradient(135deg,{'#6c63ff' if role=='teacher' else '#ff6584'},{'#ff6584' if role=='teacher' else '#fbbf24'});padding:36px 32px;text-align:center;">
<div style="font-size:48px;margin-bottom:10px;">{'👩‍🏫' if role=='teacher' else '🎓'}</div>
<h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">AI Quiz App</h1>
<p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">{role_label} Account Verification</p>
</td></tr>
<tr><td style="padding:32px;">
<p style="color:#e8e8f0;font-size:16px;margin:0 0 8px;">Hi <strong>{username}</strong>,</p>
<p style="color:#8888aa;font-size:14px;line-height:1.7;margin:0 0 24px;">Enter this code to verify your {role_label.lower()} account. Valid for <strong style="color:#e8e8f0;">15 minutes</strong>.</p>
<div style="background:#0f1117;border:2px dashed #6c63ff;border-radius:14px;padding:24px;text-align:center;">
<p style="color:#8888aa;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px;">Verification Code</p>
<p style="color:#6c63ff;font-size:42px;font-weight:900;letter-spacing:12px;margin:0;font-family:monospace;">{code}</p>
<p style="color:#8888aa;font-size:12px;margin:10px 0 0;">⏱ Expires in 15 minutes</p>
</div>
</td></tr>
<tr><td style="background:#0f1117;padding:18px 32px;border-top:1px solid #2a2d3e;text-align:center;">
<p style="color:#555577;font-size:12px;margin:0;">Automated message — do not reply.</p>
</td></tr></table></td></tr></table></body></html>"""
    return _send_email(to_email, f"✅ Verify your AI Quiz {role_label} account", plain, html)

def send_reset_email(to_email, code, username):
    plain = f"Hi {username},\n\nYour password reset code is: {code}\n\nExpires in 15 minutes.\n\n— AI Quiz App"
    html = f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:40px 20px;" align="center">
<table width="520" cellspacing="0" cellpadding="0" style="background:#1a1d2e;border-radius:20px;overflow:hidden;border:1px solid #2a2d3e;max-width:520px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#6c63ff,#ff6584);padding:36px 32px;text-align:center;">
<div style="font-size:48px;margin-bottom:10px;">🔑</div>
<h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">Password Reset</h1>
</td></tr>
<tr><td style="padding:32px;">
<p style="color:#e8e8f0;font-size:16px;margin:0 0 8px;">Hi <strong>{username}</strong>,</p>
<p style="color:#8888aa;font-size:14px;line-height:1.7;margin:0 0 24px;">Your reset code expires in <strong style="color:#e8e8f0;">15 minutes</strong>.</p>
<div style="background:#0f1117;border:2px dashed #6c63ff;border-radius:14px;padding:24px;text-align:center;">
<p style="color:#8888aa;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px;">Reset Code</p>
<p style="color:#6c63ff;font-size:42px;font-weight:900;letter-spacing:12px;margin:0;font-family:monospace;">{code}</p>
</div></td></tr>
<tr><td style="background:#0f1117;padding:18px 32px;border-top:1px solid #2a2d3e;text-align:center;">
<p style="color:#555577;font-size:12px;margin:0;">Automated message — do not reply.</p>
</td></tr></table></td></tr></table></body></html>"""
    return _send_email(to_email, "🔑 AI Quiz App Password Reset Code", plain, html)

# ══════════════════════════════════════════════════════════
#  AUTH ROUTES
# ══════════════════════════════════════════════════════════

@app.route("/api/register", methods=["POST"])
def register():
    """
    Register as student or teacher.
    Sends a verification code to the email.
    role must be 'student' or 'teacher'.
    """
    d = request.get_json()
    username    = d.get("username","").strip()
    email       = d.get("email","").strip().lower()
    password    = d.get("password","").strip()
    role        = d.get("role","student").strip()
    roll_number = d.get("roll_number","").strip().upper()
    batch       = d.get("batch","").strip()
    degree      = d.get("degree","").strip()
    section     = d.get("section","").strip().upper()

    if not username or not email or not password:
        return jsonify({"error":"All fields are required"}), 400
    if role != "student":
        return jsonify({"error":"Only students can self-register. Teacher accounts are created by Admin."}), 400
    if not roll_number or not batch or not degree or not section:
        return jsonify({"error":"Roll number, batch, degree, and section are required"}), 400
    if not re.match(r'^\d[Kk]\d{2}_[A-Za-z]+_\d+$', roll_number):
        return jsonify({"error":"Roll number must be in format like 2K22_BSCS_442"}), 400
    valid_batches = ["2K22","2K23","2K24","2K25"]
    if batch not in valid_batches:
        return jsonify({"error":f"Batch must be one of: {', '.join(valid_batches)}"}), 400
    valid_degrees = ["Computer Science","Software Engineering"]
    if degree not in valid_degrees:
        return jsonify({"error":f"Degree must be one of: {', '.join(valid_degrees)}"}), 400
    if len(password) < 6:
        return jsonify({"error":"Password must be at least 6 characters"}), 400
    if not re.search(r"[A-Z]", password):
        return jsonify({"error":"Password must contain at least one uppercase letter (A-Z)"}), 400
    if not re.search(r"[a-z]", password):
        return jsonify({"error":"Password must contain at least one lowercase letter (a-z)"}), 400
    if not is_valid_email(email):
        return jsonify({"error":"Please enter a valid email address"}), 400

    conn = get_db()
    try:
        if conn.execute("SELECT id FROM users WHERE roll_number=? AND roll_number!=''", (roll_number,)).fetchone():
            return jsonify({"error":"Roll number already registered."}), 409
        conn.execute(
            "INSERT INTO users (username,email,password,role,email_verified,roll_number,batch,degree,section) VALUES (?,?,?,?,0,?,?,?,?)",
            (username, email, hash_password(password), role, roll_number, batch, degree, section)
        )
        conn.commit()

        # Generate and send email verification code
        code       = str(random.randint(100000, 999999))
        expires_at = int(time.time()) + 900
        conn.execute("DELETE FROM email_verifications WHERE email=?", (email,))
        conn.execute("INSERT INTO email_verifications (email,code,expires_at) VALUES (?,?,?)",
                     (email, code, expires_at))
        conn.commit()

        sent, err = send_verification_email(email, code, username, role)
        if not sent:
            print(f"⚠️ Verification email failed for {email}: {err}")
            # Don't block registration — just warn
            return jsonify({
                "message": f"Account created! Email verification failed ({err}). Contact admin.",
                "email_sent": False,
                "role": role
            }), 201

        return jsonify({
            "message": f"Account created! Check your email for the verification code.",
            "email_sent": True,
            "role": role
        }), 201

    except sqlite3.IntegrityError as e:
        msg = "Username already taken." if "username" in str(e) else "Email already registered."
        return jsonify({"error": msg}), 409
    finally:
        conn.close()


@app.route("/api/verify-email", methods=["POST"])
def verify_email():
    """Confirms the 6-digit code sent to email after registration."""
    d     = request.get_json()
    email = d.get("email","").strip().lower()
    code  = d.get("code","").strip()

    conn   = get_db()
    record = conn.execute(
        "SELECT id,expires_at,used FROM email_verifications WHERE email=? AND code=?",
        (email, code)
    ).fetchone()

    if not record:
        conn.close(); return jsonify({"error":"Invalid code."}), 400
    if record["used"]:
        conn.close(); return jsonify({"error":"Code already used."}), 400
    if int(time.time()) > record["expires_at"]:
        conn.close(); return jsonify({"error":"Code expired. Please register again."}), 400

    conn.execute("UPDATE users SET email_verified=1 WHERE email=?", (email,))
    conn.execute("UPDATE email_verifications SET used=1 WHERE id=?", (record["id"],))
    conn.commit()

    user = conn.execute(
        "SELECT id,username,email,role FROM users WHERE email=?", (email,)
    ).fetchone()
    conn.close()

    return jsonify({
        "message": "Email verified! You can now log in.",
        "user": {"id":user["id"],"username":user["username"],"email":user["email"],"role":user["role"]}
    })


@app.route("/api/login", methods=["POST"])
def login():
    """Login with username/email + password. Returns role so frontend can route correctly."""
    d        = request.get_json()
    login_id = d.get("login","").strip()
    password = d.get("password","").strip()
    role     = d.get("role","")        # optional: 'student' or 'teacher'

    if not login_id or not password:
        return jsonify({"error":"Please fill in all fields"}), 400

    conn = get_db()
    if is_valid_email(login_id):
        user = conn.execute(
            "SELECT id,username,email,role,email_verified,suspended FROM users WHERE email=? AND password=?",
            (login_id.lower(), hash_password(password))
        ).fetchone()
    else:
        user = conn.execute(
            "SELECT id,username,email,role,email_verified,suspended FROM users WHERE username=? AND password=?",
            (login_id, hash_password(password))
        ).fetchone()
    conn.close()

    if not user:
        return jsonify({"error":"Wrong credentials."}), 401
    if user["email_verified"] == 0:
        return jsonify({"error":"Please verify your email before logging in.","needs_verification":True,"email":user["email"]}), 403
    if user["suspended"]:
        return jsonify({"error":"Your account has been suspended. Please contact the administrator."}), 403
    # Admin portal: only admin accounts allowed
    if role == "admin" and user["role"] != "admin":
        return jsonify({"error":"This account is not an admin account."}), 403
    # Student/teacher portal: enforce role, but always let admin through
    if role and role != "admin" and user["role"] != role and user["role"] != "admin":
        return jsonify({"error":f"This account is registered as a {user[chr(39)+'role'+chr(39)]}, not a {role}."}), 403

    return jsonify({
        "message": f"Welcome back, {user['username']}!",
        "user": {"id":user["id"],"username":user["username"],"email":user["email"],"role":user["role"]}
    })


@app.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    d     = request.get_json()
    email = d.get("email","").strip().lower()
    if not email or not is_valid_email(email):
        return jsonify({"error":"Please enter a valid email"}), 400
    conn = get_db()
    user = conn.execute("SELECT id,username FROM users WHERE email=?", (email,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"message":"If this email is registered, a reset code has been sent."})
    conn.execute("DELETE FROM password_resets WHERE email=?", (email,))
    token      = str(random.randint(100000,999999))
    expires_at = int(time.time()) + 900
    conn.execute("INSERT INTO password_resets (email,token,expires_at) VALUES (?,?,?)", (email,token,expires_at))
    conn.commit(); conn.close()
    sent, err = send_reset_email(email, token, user["username"])
    if sent:
        return jsonify({"message":"Reset code sent to your inbox."})
    return jsonify({"error":f"Could not send email. {err}"}), 500


@app.route("/api/reset-password", methods=["POST"])
def reset_password():
    d  = request.get_json()
    email = d.get("email","").strip().lower()
    token = d.get("token","").strip()
    np    = d.get("new_password","").strip()
    if not email or not token or not np: return jsonify({"error":"All fields required"}), 400
    if len(np) < 6: return jsonify({"error":"Password must be at least 6 characters"}), 400
    if not re.search(r"[A-Z]", np): return jsonify({"error":"Password must contain at least one uppercase letter"}), 400
    if not re.search(r"[a-z]", np): return jsonify({"error":"Password must contain at least one lowercase letter"}), 400
    conn = get_db()
    rec  = conn.execute("SELECT id,expires_at,used FROM password_resets WHERE email=? AND token=?",
                        (email,token)).fetchone()
    if not rec:          conn.close(); return jsonify({"error":"Invalid code."}), 400
    if rec["used"]:      conn.close(); return jsonify({"error":"Code already used."}), 400
    if int(time.time()) > rec["expires_at"]:
        conn.close(); return jsonify({"error":"Code expired."}), 400
    conn.execute("UPDATE users SET password=? WHERE email=?", (hash_password(np), email))
    conn.execute("UPDATE password_resets SET used=1 WHERE id=?", (rec["id"],))
    conn.commit(); conn.close()
    return jsonify({"message":"Password reset! You can now log in."})


# ══════════════════════════════════════════════════════════
#  TEACHER ROUTES
# ══════════════════════════════════════════════════════════

@app.route("/api/teacher/topics", methods=["GET"])
def teacher_get_topics():
    uid  = request.headers.get("X-User-Id")
    role = request.headers.get("X-User-Role")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    rows = conn.execute("""
        SELECT t.id, t.name, t.description, t.created_at,
               COUNT(q.id) AS question_count
        FROM topics t
        LEFT JOIN questions q ON q.topic_id = t.id AND q.approved = 1
        GROUP BY t.id ORDER BY t.name
    """).fetchall()
    conn.close()
    return jsonify({"topics": [dict(r) for r in rows]})


@app.route("/api/teacher/topics", methods=["POST"])
def teacher_create_topic():
    role = request.headers.get("X-User-Role")
    uid  = request.headers.get("X-User-Id")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    d    = request.get_json()
    name = d.get("name","").strip()
    desc = d.get("description","").strip()
    if not name: return jsonify({"error":"Topic name required"}), 400
    conn = get_db()
    try:
        conn.execute("INSERT INTO topics (name,description,created_by) VALUES (?,?,?)", (name,desc,int(uid)))
        conn.commit()
        topic = conn.execute("SELECT * FROM topics WHERE name=?", (name,)).fetchone()
        conn.close()
        return jsonify({"message":f"Topic '{name}' created.", "topic":dict(topic)}), 201
    except sqlite3.IntegrityError:
        conn.close(); return jsonify({"error":"Topic name already exists."}), 409


@app.route("/api/teacher/generate-questions", methods=["POST"])
def generate_questions():
    """
    AI Question Generation.
    Creates questions using template patterns + randomization.
    In a real production app you'd call OpenAI/Claude API here.
    """
    role = request.headers.get("X-User-Role")
    uid  = request.headers.get("X-User-Id")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403

    d          = request.get_json()
    topic_id   = d.get("topic_id")
    difficulty = d.get("difficulty","medium")
    count      = max(5, min(int(d.get("count", 20)), 50))  # min 5, max 50 per generation

    if not topic_id: return jsonify({"error":"topic_id required"}), 400

    conn  = get_db()
    topic = conn.execute("SELECT name FROM topics WHERE id=?", (topic_id,)).fetchone()
    if not topic: conn.close(); return jsonify({"error":"Topic not found"}), 404
    topic_name = topic["name"]

    # ── Try real Gemini generation first ──────────────────
    generated = []

    if _gemini_available and not GEMINI_API_KEY.startswith("your-gemini"):
        try:
            prompt = f"""Generate exactly {count} multiple-choice quiz questions about "{topic_name}".
Difficulty level: {difficulty}.

Return ONLY a valid JSON array with no extra text. Each item must have:
- "question": the question text (string)
- "options": array of exactly 4 answer choices (strings)
- "answer": the correct answer (must exactly match one of the options)

Example format:
[
  {{
    "question": "What does HTML stand for?",
    "options": ["HyperText Markup Language","High Text Making Language","HyperText Making Language","None of these"],
    "answer": "HyperText Markup Language"
  }}
]

Rules:
- Questions must be clear and educational
- All 4 options must be plausible (no obviously wrong answers)
- Only one option should be correct
- Match difficulty: easy=basic facts, medium=applied knowledge, hard=deep understanding
- Do NOT include any explanation, only the JSON array"""

            response = _gemini_client.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=prompt,
                config=_genai_types.GenerateContentConfig(
                    system_instruction="You are an expert quiz question creator. Return only valid JSON arrays.",
                    temperature=0.8,
                    max_output_tokens=2000
                )
            )

            raw = response.text.strip()
            # Strip markdown code blocks if present
            if raw.startswith("```"):
                raw = re.sub(r"^```[a-z]*\n?", "", raw)
                raw = re.sub(r"\n?```$", "", raw).strip()

            items = json.loads(raw)

            for item in items[:count]:
                opts = item.get("options", [])
                random.shuffle(opts)
                while len(opts) < 4:
                    opts.append("None of the above")
                generated.append({
                    "topic_id": topic_id,
                    "question": item["question"],
                    "option_a": opts[0], "option_b": opts[1],
                    "option_c": opts[2], "option_d": opts[3],
                    "answer":   item["answer"],
                    "difficulty": difficulty,
                    "ai_generated": 1, "approved": 0, "created_by": int(uid)
                })

            print(f"✅ Gemini generated {len(generated)} questions for '{topic_name}'")

        except json.JSONDecodeError as e:
            print(f"⚠️ Gemini returned invalid JSON: {e}. Falling back to templates.")
            generated = []
        except Exception as e:
            print(f"⚠️ Gemini error: {e}. Falling back to templates.")
            generated = []

    # ── Fallback: built-in templates (used when Gemini key not set) ──
    if not generated:
        print("ℹ️  Using template generation (set GEMINI_API_KEY for real AI)")
        templates = {
            "Computer Science": [
                {"q":"What does OOP stand for?","options":["Object Oriented Programming","Open Operational Process","Output Optimization Protocol","Object Operation Pattern"],"answer":"Object Oriented Programming"},
                {"q":"Which HTTP method is used to retrieve data?","options":["POST","PUT","GET","DELETE"],"answer":"GET"},
                {"q":"What is a primary key in a database?","options":["A key used for encryption","A unique identifier for each record","A foreign reference","An index key"],"answer":"A unique identifier for each record"},
                {"q":"Which sorting algorithm has best average time complexity?","options":["Bubble Sort O(n²)","Quick Sort O(n log n)","Insertion Sort O(n²)","Selection Sort O(n²)"],"answer":"Quick Sort O(n log n)"},
                {"q":"What is a REST API?","options":["A database system","An architectural style for web services","A programming language","A type of server"],"answer":"An architectural style for web services"},
            ],
            "Science": [
                {"q":"What state of matter has definite volume but no definite shape?","options":["Solid","Liquid","Gas","Plasma"],"answer":"Liquid"},
                {"q":"What is the unit of electrical resistance?","options":["Ampere","Volt","Ohm","Watt"],"answer":"Ohm"},
                {"q":"Which force keeps planets in orbit?","options":["Electromagnetic","Nuclear","Gravitational","Magnetic"],"answer":"Gravitational"},
                {"q":"What is the chemical formula of water?","options":["HO","H2O","H3O","OH2"],"answer":"H2O"},
                {"q":"What type of energy does a moving object have?","options":["Potential","Thermal","Kinetic","Chemical"],"answer":"Kinetic"},
            ],
            "Math": [
                {"q":"What is the formula for the area of a circle?","options":["2πr","πr²","πd","2πr²"],"answer":"πr²"},
                {"q":"What is the Pythagorean theorem?","options":["a+b=c","a²+b²=c²","a×b=c²","a²-b²=c"],"answer":"a²+b²=c²"},
                {"q":"What is the value of 0! (zero factorial)?","options":["0","1","Undefined","∞"],"answer":"1"},
                {"q":"What type of number is √2?","options":["Integer","Rational","Irrational","Complex"],"answer":"Irrational"},
                {"q":"What is the slope formula?","options":["(y2+y1)/(x2+x1)","(y2-y1)/(x2-x1)","(x2-x1)/(y2-y1)","y=mx+b"],"answer":"(y2-y1)/(x2-x1)"},
            ],
            "Machine Learning": [
                {"q":"What is 'feature engineering' in ML?","options":["Building neural networks","Creating/transforming input variables","Selecting a model","Evaluating accuracy"],"answer":"Creating/transforming input variables"},
                {"q":"Which metric measures accuracy on unseen data?","options":["Training accuracy","Test accuracy","Loss value","Gradient"],"answer":"Test accuracy"},
                {"q":"What is a 'hyperparameter'?","options":["A parameter learned from data","A setting configured before training","The output of a model","A type of layer"],"answer":"A setting configured before training"},
                {"q":"What does 'epoch' mean in deep learning?","options":["One layer of the network","One full pass through training data","A type of activation","A loss function"],"answer":"One full pass through training data"},
                {"q":"What is transfer learning?","options":["Training from scratch","Reusing a pre-trained model on a new task","Combining two models","Removing layers from a model"],"answer":"Reusing a pre-trained model on a new task"},
            ],
        }
        pool = templates.get(topic_name, templates["Computer Science"])
        samp = random.sample(pool, min(count, len(pool)))
        for t in samp:
            opts = t["options"].copy(); random.shuffle(opts)
            while len(opts) < 4: opts.append("None of the above")
            generated.append({
                "topic_id": topic_id, "question": t["q"],
                "option_a": opts[0], "option_b": opts[1],
                "option_c": opts[2], "option_d": opts[3],
                "answer": t["answer"], "difficulty": difficulty,
                "ai_generated": 1, "approved": 0, "created_by": int(uid)
            })

    conn = get_db()
    inserted = []
    for g in generated:
        cur = conn.execute("""INSERT INTO questions
            (topic_id,question,option_a,option_b,option_c,option_d,answer,difficulty,ai_generated,approved,created_by)
            VALUES (:topic_id,:question,:option_a,:option_b,:option_c,:option_d,:answer,:difficulty,:ai_generated,:approved,:created_by)""", g)
        g["id"] = cur.lastrowid
        inserted.append(g)
    conn.commit(); conn.close()

    return jsonify({
        "message":    f"Generated {len(inserted)} questions for review.",
        "questions":  inserted,
        "needs_review": True
    })


@app.route("/api/teacher/questions/<int:topic_id>", methods=["GET"])
def teacher_get_questions(topic_id):
    role = request.headers.get("X-User-Role")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    rows = conn.execute("""
        SELECT q.*, t.name AS topic_name
        FROM questions q JOIN topics t ON t.id = q.topic_id
        WHERE q.topic_id = ?
        ORDER BY q.approved ASC, q.id DESC
    """, (topic_id,)).fetchall()
    conn.close()
    return jsonify({"questions":[dict(r) for r in rows]})


@app.route("/api/teacher/questions/<int:qid>", methods=["PUT"])
def teacher_update_question(qid):
    role = request.headers.get("X-User-Role")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    d = request.get_json()
    conn = get_db()
    conn.execute("""UPDATE questions SET
        question=?, option_a=?, option_b=?, option_c=?, option_d=?,
        answer=?, difficulty=?, approved=?
        WHERE id=?""",
        (d.get("question"),d.get("option_a"),d.get("option_b"),d.get("option_c"),d.get("option_d"),
         d.get("answer"),d.get("difficulty"),d.get("approved",1),qid))
    conn.commit(); conn.close()
    return jsonify({"message":"Question updated."})


@app.route("/api/teacher/questions/<int:qid>/approve", methods=["POST"])
def teacher_approve_question(qid):
    role = request.headers.get("X-User-Role")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    conn.execute("UPDATE questions SET approved=1 WHERE id=?", (qid,))
    conn.commit(); conn.close()
    return jsonify({"message":"Question approved."})


@app.route("/api/teacher/questions/<int:qid>", methods=["DELETE"])
def teacher_delete_question(qid):
    role = request.headers.get("X-User-Role")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    conn.execute("DELETE FROM questions WHERE id=?", (qid,))
    conn.commit(); conn.close()
    return jsonify({"message":"Question deleted."})


@app.route("/api/teacher/quizzes", methods=["POST"])
def teacher_create_quiz():
    role = request.headers.get("X-User-Role")
    uid  = request.headers.get("X-User-Id")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    d = request.get_json()
    title        = d.get("title","").strip()
    topic_id     = d.get("topic_id")
    difficulty   = d.get("difficulty","easy")
    time_limit   = d.get("time_limit", 20)
    question_ids = d.get("question_ids", [])
    if not title or not topic_id: return jsonify({"error":"title and topic_id required"}), 400
    conn = get_db()
    cur  = conn.execute("""INSERT INTO quizzes (title,topic_id,difficulty,time_limit,question_ids,created_by,published)
        VALUES (?,?,?,?,?,?,0)""",
        (title, topic_id, difficulty, time_limit, json.dumps(question_ids), int(uid)))
    quiz_id = cur.lastrowid; conn.commit(); conn.close()
    return jsonify({"message":f"Quiz '{title}' created.","quiz_id":quiz_id}), 201


@app.route("/api/teacher/quizzes", methods=["GET"])
def teacher_get_quizzes():
    role = request.headers.get("X-User-Role")
    uid  = request.headers.get("X-User-Id")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    rows = conn.execute("""
        SELECT qz.*, t.name AS topic_name,
               COUNT(DISTINCT a.id) AS assigned_count,
               COUNT(DISTINCT qa.id) AS attempt_count
        FROM quizzes qz
        JOIN topics t ON t.id = qz.topic_id
        LEFT JOIN assignments a ON a.quiz_id = qz.id
        LEFT JOIN quiz_attempts qa ON qa.quiz_id = qz.id
        WHERE qz.created_by = ?
        GROUP BY qz.id ORDER BY qz.created_at DESC
    """, (int(uid),)).fetchall()
    conn.close()
    return jsonify({"quizzes":[dict(r) for r in rows]})


@app.route("/api/teacher/quizzes/<int:qid>/publish", methods=["POST"])
def teacher_publish_quiz(qid):
    role = request.headers.get("X-User-Role")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    conn.execute("UPDATE quizzes SET published=1 WHERE id=?", (qid,))
    conn.commit(); conn.close()
    return jsonify({"message":"Quiz published."})


@app.route("/api/teacher/students", methods=["GET"])
def teacher_get_students():
    role = request.headers.get("X-User-Role")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    rows = conn.execute("""
        SELECT u.id, u.username, u.email, u.grade, u.class_name,
               u.roll_number, u.batch, u.degree, u.section, u.created_at,
               COUNT(qa.id) AS quizzes_taken,
               ROUND(AVG(qa.score_percentage),1) AS avg_score
        FROM users u
        LEFT JOIN quiz_attempts qa ON qa.student_id = u.id
        WHERE u.role = 'student'
        GROUP BY u.id ORDER BY u.section, u.batch, u.username
    """).fetchall()
    conn.close()
    return jsonify({"students":[dict(r) for r in rows]})


@app.route("/api/teacher/students/<int:sid>/update", methods=["PUT"])
def teacher_update_student(sid):
    """Let teacher assign grade/class to a student."""
    role = request.headers.get("X-User-Role")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    d          = request.get_json()
    grade      = d.get("grade","").strip()
    class_name = d.get("class_name","").strip()
    conn = get_db()
    conn.execute("UPDATE users SET grade=?, class_name=? WHERE id=? AND role='student'",
                 (grade, class_name, sid))
    conn.commit(); conn.close()
    return jsonify({"message":"Student updated."})


@app.route("/api/teacher/students/<int:sid>", methods=["DELETE"])
def teacher_delete_student(sid):
    """Let teacher permanently delete a student and their quiz data."""
    role = request.headers.get("X-User-Role")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    student = conn.execute("SELECT id, username FROM users WHERE id=? AND role='student'", (sid,)).fetchone()
    if not student:
        conn.close()
        return jsonify({"error":"Student not found."}), 404
    conn.execute("DELETE FROM quiz_attempts        WHERE student_id=?", (sid,))
    conn.execute("DELETE FROM assignments          WHERE student_id=?", (sid,))
    conn.execute("DELETE FROM password_resets      WHERE email=(SELECT email FROM users WHERE id=?)", (sid,))
    conn.execute("DELETE FROM email_verifications  WHERE email=(SELECT email FROM users WHERE id=?)", (sid,))
    conn.execute("DELETE FROM users                WHERE id=?", (sid,))
    conn.commit(); conn.close()
    return jsonify({"message": f"Student '{student['username']}' deleted."})


@app.route("/api/teacher/assign", methods=["POST"])
def teacher_assign_quiz():
    role = request.headers.get("X-User-Role")
    uid  = request.headers.get("X-User-Id")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403
    d           = request.get_json()
    quiz_id     = d.get("quiz_id")
    student_ids = d.get("student_ids", [])
    due_date    = d.get("due_date")
    if not quiz_id or not student_ids:
        return jsonify({"error":"quiz_id and student_ids required"}), 400
    conn    = get_db()
    assigned = 0
    for sid in student_ids:
        try:
            conn.execute(
                "INSERT OR IGNORE INTO assignments (quiz_id,student_id,assigned_by,due_date) VALUES (?,?,?,?)",
                (quiz_id, sid, int(uid), due_date)
            )
            assigned += 1
        except: pass
    conn.commit(); conn.close()
    return jsonify({"message":f"Quiz assigned to {assigned} student(s)."})


@app.route("/api/teacher/analytics", methods=["GET"])
def teacher_analytics():
    """Class-wide analytics: per-quiz and per-student performance."""
    role = request.headers.get("X-User-Role")
    uid  = request.headers.get("X-User-Id")
    if role not in ("teacher","admin"): return jsonify({"error":"Access denied"}), 403

    conn = get_db()

    # Per-quiz stats
    quiz_stats = conn.execute("""
        SELECT qz.title, qz.id AS quiz_id,
               COUNT(DISTINCT qa.student_id)        AS students_attempted,
               COUNT(DISTINCT a.student_id)          AS students_assigned,
               ROUND(AVG(qa.score_percentage),1)     AS avg_score,
               MAX(qa.score_percentage)              AS highest_score,
               MIN(qa.score_percentage)              AS lowest_score
        FROM quizzes qz
        LEFT JOIN assignments a  ON a.quiz_id  = qz.id
        LEFT JOIN quiz_attempts qa ON qa.quiz_id = qz.id
        WHERE qz.created_by = ?
        GROUP BY qz.id ORDER BY qz.created_at DESC
    """, (int(uid),)).fetchall()

    # Per-student stats (for this teacher's quizzes)
    student_stats = conn.execute("""
        SELECT u.username, u.email,
               COUNT(DISTINCT qa.id)              AS attempts,
               ROUND(AVG(qa.score_percentage),1)  AS avg_score,
               MAX(qa.score_percentage)           AS best_score
        FROM users u
        JOIN quiz_attempts qa ON qa.student_id = u.id
        JOIN quizzes qz       ON qz.id = qa.quiz_id
        WHERE qz.created_by = ? AND u.role = 'student'
        GROUP BY u.id ORDER BY avg_score DESC
    """, (int(uid),)).fetchall()

    # Overall class stats
    overview = conn.execute("""
        SELECT COUNT(DISTINCT u.id)              AS total_students,
               COUNT(DISTINCT qz.id)             AS total_quizzes,
               COUNT(DISTINCT qa.id)             AS total_attempts,
               ROUND(AVG(qa.score_percentage),1) AS class_avg
        FROM quizzes qz
        LEFT JOIN quiz_attempts qa ON qa.quiz_id = qz.id
        LEFT JOIN users u          ON u.id = qa.student_id
        WHERE qz.created_by = ?
    """, (int(uid),)).fetchone()

    conn.close()
    return jsonify({
        "overview":      dict(overview),
        "quiz_stats":    [dict(r) for r in quiz_stats],
        "student_stats": [dict(r) for r in student_stats],
    })


# ══════════════════════════════════════════════════════════
#  STUDENT ROUTES
# ══════════════════════════════════════════════════════════

@app.route("/api/student/assignments", methods=["GET"])
def student_get_assignments():
    """Returns quizzes assigned to this student."""
    uid  = request.headers.get("X-User-Id")
    role = request.headers.get("X-User-Role")
    if role not in ("student",): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    rows = conn.execute("""
        SELECT a.id AS assignment_id, a.due_date, a.assigned_at,
               qz.id AS quiz_id, qz.title, qz.difficulty, qz.time_limit,
               t.name AS topic,
               u.username AS assigned_by_name,
               qa.score_percentage AS my_score,
               qa.taken_at
        FROM assignments a
        JOIN quizzes qz ON qz.id = a.quiz_id
        JOIN topics  t  ON t.id  = qz.topic_id
        JOIN users   u  ON u.id  = a.assigned_by
        LEFT JOIN quiz_attempts qa ON qa.quiz_id = a.quiz_id AND qa.student_id = a.student_id
        WHERE a.student_id = ? AND qz.published = 1
        ORDER BY a.assigned_at DESC
    """, (int(uid),)).fetchall()
    conn.close()
    return jsonify({"assignments":[dict(r) for r in rows]})


@app.route("/api/student/quiz/<int:quiz_id>/questions", methods=["GET"])
def student_get_quiz_questions(quiz_id):
    uid  = request.headers.get("X-User-Id")
    role = request.headers.get("X-User-Role")
    if role not in ("student",): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    quiz = conn.execute("SELECT * FROM quizzes WHERE id=? AND published=1", (quiz_id,)).fetchone()
    if not quiz: conn.close(); return jsonify({"error":"Quiz not found"}), 404

    qids = json.loads(quiz["question_ids"])
    if qids:
        # Use specifically selected questions
        placeholders = ",".join("?" * len(qids))
        rows = conn.execute(
            f"SELECT id,question,option_a,option_b,option_c,option_d,difficulty FROM questions WHERE id IN ({placeholders}) AND approved=1",
            qids
        ).fetchall()
    else:
        # Fall back to questions from this topic
        rows = conn.execute("""
            SELECT id,question,option_a,option_b,option_c,option_d,difficulty
            FROM questions WHERE topic_id=? AND approved=1
            ORDER BY RANDOM() LIMIT 5
        """, (quiz["topic_id"],)).fetchall()
    conn.close()

    questions = [{
        "id":r["id"],"question":r["question"],
        "options":[r["option_a"],r["option_b"],r["option_c"],r["option_d"]],
        "difficulty":r["difficulty"]
    } for r in rows]

    return jsonify({
        "quiz":      {"id":quiz["id"],"title":quiz["title"],"time_limit":quiz["time_limit"],"difficulty":quiz["difficulty"]},
        "questions": questions
    })


@app.route("/api/student/quiz/<int:quiz_id>/submit", methods=["POST"])
def student_submit_quiz(quiz_id):
    uid  = request.headers.get("X-User-Id")
    role = request.headers.get("X-User-Role")
    if role not in ("student",): return jsonify({"error":"Access denied"}), 403

    d       = request.get_json()
    answers = d.get("answers", [])

    conn = get_db()
    correct  = 0
    feedback = []

    for ans in answers:
        row = conn.execute("SELECT question,answer FROM questions WHERE id=?", (ans.get("id"),)).fetchone()
        if row:
            ok = (ans.get("selected") == row["answer"])
            if ok: correct += 1
            feedback.append({"question":row["question"],"your_answer":ans.get("selected"),"correct_answer":row["answer"],"is_correct":ok})

    total     = len(answers)
    score_pct = round((correct/total)*100,1) if total > 0 else 0

    conn.execute("""INSERT INTO quiz_attempts (quiz_id,student_id,score,total,score_percentage,answers_json)
        VALUES (?,?,?,?,?,?)""",
        (quiz_id, int(uid), correct, total, score_pct, json.dumps(feedback)))
    conn.commit(); conn.close()

    if score_pct>=80:   msg="🏆 Excellent!"
    elif score_pct>=50: msg="👍 Good job! Keep practicing."
    else:               msg="💪 Review the material and try again!"

    return jsonify({"correct":correct,"total":total,"score_percentage":score_pct,"message":msg,"feedback":feedback})


@app.route("/api/student/profile/<int:uid>", methods=["GET"])
def student_profile(uid):
    role = request.headers.get("X-User-Role")
    if role not in ("student",): return jsonify({"error":"Access denied"}), 403
    conn = get_db()
    user = conn.execute("SELECT username,email,created_at FROM users WHERE id=?", (uid,)).fetchone()
    if not user: conn.close(); return jsonify({"error":"Not found"}), 404
    s = conn.execute("""SELECT COUNT(*) AS total, ROUND(AVG(score_percentage),1) AS avg,
        MAX(score_percentage) AS best FROM quiz_attempts WHERE student_id=?""", (uid,)).fetchone()
    history = conn.execute("""
        SELECT qz.title, qa.score, qa.total, qa.score_percentage, qa.taken_at
        FROM quiz_attempts qa JOIN quizzes qz ON qz.id = qa.quiz_id
        WHERE qa.student_id=? ORDER BY qa.taken_at DESC LIMIT 10
    """, (uid,)).fetchall()
    conn.close()
    return jsonify({
        "user":    {"username":user["username"],"email":user["email"],"joined":user["created_at"]},
        "stats":   {"total_quizzes":s["total"] or 0,"avg_score":s["avg"] or 0,"best_score":s["best"] or 0},
        "history": [dict(h) for h in history]
    })


# ══════════════════════════════════════════════════════════
#  SHARED / LEADERBOARD
# ══════════════════════════════════════════════════════════

@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    quiz_id = request.args.get("quiz_id", type=int)
    conn    = get_db()
    if quiz_id:
        rows = conn.execute("""
            SELECT u.username, qa.score_percentage AS avg_score, qa.score, qa.total, qa.taken_at
            FROM quiz_attempts qa JOIN users u ON u.id=qa.student_id
            WHERE qa.quiz_id=?
            ORDER BY qa.score_percentage DESC LIMIT 10
        """, (quiz_id,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT u.username, ROUND(AVG(qa.score_percentage),1) AS avg_score, COUNT(qa.id) AS quizzes
            FROM quiz_attempts qa JOIN users u ON u.id=qa.student_id
            WHERE u.role='student'
            GROUP BY qa.student_id ORDER BY avg_score DESC LIMIT 10
        """).fetchall()
    conn.close()
    return jsonify({"leaderboard":[dict(r) for r in rows]})


# ══════════════════════════════════════════════════════════
#  STUDENT PRACTICE — AI generated on-demand quiz
# ══════════════════════════════════════════════════════════

@app.route("/api/student/practice/topics", methods=["GET"])
def practice_topics():
    """Returns all available topics for the practice selector."""
    conn = get_db()
    rows = conn.execute("SELECT id, name, description FROM topics ORDER BY name").fetchall()
    conn.close()
    return jsonify({"topics": [dict(r) for r in rows]})


@app.route("/api/student/practice/generate", methods=["POST"])
def practice_generate():
    """
    Generates a fresh practice quiz using OpenAI on-demand.
    The questions are NOT saved to the database — they are returned
    directly so the student can practice immediately.

    Expects JSON:
    {
      "topic":      "Math",
      "difficulty": "medium",
      "count":      10        (5–20)
    }
    """
    uid  = request.headers.get("X-User-Id")
    role = request.headers.get("X-User-Role")
    if role not in ("student",):
        return jsonify({"error": "Access denied"}), 403

    d          = request.get_json()
    topic_name = d.get("topic", "").strip()
    difficulty = d.get("difficulty", "medium")
    count      = max(5, min(int(d.get("count", 10)), 20))

    if not topic_name:
        return jsonify({"error": "Please select a topic"}), 400
    if difficulty not in ("easy", "medium", "hard"):
        return jsonify({"error": "Difficulty must be easy, medium, or hard"}), 400

    questions = []

    # ── Try Gemini first ───────────────────────────────────
    if _gemini_available and not GEMINI_API_KEY.startswith("your-gemini"):
        try:
            prompt = f"""Generate exactly {count} multiple-choice practice questions about "{topic_name}".
Difficulty: {difficulty} (easy=basic facts, medium=applied knowledge, hard=deep understanding).

Return ONLY a valid JSON array. Each item must have:
- "question": clear question text
- "options": exactly 4 answer choices (strings)
- "answer": the correct answer (must exactly match one option)

Rules:
- All 4 options must be plausible
- Only one option is correct
- No explanations, only the JSON array"""

            response = _gemini_client.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=prompt,
                config=_genai_types.GenerateContentConfig(
                    system_instruction="You are an expert quiz creator. Return only valid JSON arrays, no markdown.",
                    temperature=0.85,
                    max_output_tokens=3000
                )
            )

            raw = response.text.strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```[a-z]*\n?", "", raw)
                raw = re.sub(r"\n?```$", "", raw).strip()

            items = json.loads(raw)
            for i, item in enumerate(items[:count]):
                opts = item.get("options", [])
                random.shuffle(opts)
                while len(opts) < 4:
                    opts.append("None of the above")
                questions.append({
                    "id":       f"practice_{i}",   # temporary id (not in DB)
                    "question": item["question"],
                    "options":  opts[:4],
                    "answer":   item["answer"],
                    "difficulty": difficulty,
                    "topic":    topic_name
                })
            print(f"✅ Gemini generated {len(questions)} practice questions for '{topic_name}'")

        except Exception as e:
            print(f"⚠️ Gemini error: {e}. Using fallback templates.")
            questions = []

    # ── Fallback: use approved questions from DB ──────────
    if not questions:
        print("ℹ️  Gemini unavailable — serving practice from DB questions")
        conn = get_db()
        rows = conn.execute("""
            SELECT q.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d,
                   q.answer, q.difficulty, t.name AS topic
            FROM questions q
            JOIN topics t ON t.id = q.topic_id
            WHERE t.name = ? AND q.difficulty = ? AND q.approved = 1
            ORDER BY RANDOM()
            LIMIT ?
        """, (topic_name, difficulty, count)).fetchall()

        # If not enough at that difficulty, grab any difficulty
        if len(rows) < 3:
            rows = conn.execute("""
                SELECT q.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d,
                       q.answer, q.difficulty, t.name AS topic
                FROM questions q
                JOIN topics t ON t.id = q.topic_id
                WHERE t.name = ? AND q.approved = 1
                ORDER BY RANDOM()
                LIMIT ?
            """, (topic_name, count)).fetchall()
        conn.close()

        for r in rows:
            opts = [r["option_a"], r["option_b"], r["option_c"], r["option_d"]]
            random.shuffle(opts)
            questions.append({
                "id":       f"practice_{r['id']}",
                "question": r["question"],
                "options":  opts,
                "answer":   r["answer"],
                "difficulty": r["difficulty"],
                "topic":    r["topic"]
            })

    if not questions:
        return jsonify({"error": f"No questions available for '{topic_name}' at {difficulty} difficulty. Ask your teacher to add some!"}), 404

    return jsonify({
        "topic":      topic_name,
        "difficulty": difficulty,
        "count":      len(questions),
        "questions":  questions,
        "ai_generated": _gemini_available and not GEMINI_API_KEY.startswith("your-gemini")
    })


# ══════════════════════════════════════════════════════════
#  ADMIN ROUTES  (role = 'admin' only)
# ══════════════════════════════════════════════════════════

def require_admin():
    """Returns (uid, None) if admin, else (None, error_response)."""
    role = request.headers.get("X-User-Role","")
    uid  = request.headers.get("X-User-Id","")
    if role != "admin":
        return None, (jsonify({"error":"Admin access only"}), 403)
    return uid, None


@app.route("/api/admin/overview", methods=["GET"])
def admin_overview():
    """Platform-wide stats card counts."""
    _, err = require_admin()
    if err: return err
    conn = get_db()
    stats = {
        "total_users":    conn.execute("SELECT COUNT(*) FROM users").fetchone()[0],
        "total_students": conn.execute("SELECT COUNT(*) FROM users WHERE role='student'").fetchone()[0],
        "total_teachers": conn.execute("SELECT COUNT(*) FROM users WHERE role='teacher'").fetchone()[0],
        "total_quizzes":  conn.execute("SELECT COUNT(*) FROM quizzes").fetchone()[0],
        "total_published":conn.execute("SELECT COUNT(*) FROM quizzes WHERE published=1").fetchone()[0],
        "total_attempts": conn.execute("SELECT COUNT(*) FROM quiz_attempts").fetchone()[0],
        "total_topics":   conn.execute("SELECT COUNT(*) FROM topics").fetchone()[0],
        "total_questions":conn.execute("SELECT COUNT(*) FROM questions WHERE approved=1").fetchone()[0],
        "suspended_users":conn.execute("SELECT COUNT(*) FROM users WHERE suspended=1").fetchone()[0],
        # New registrations in last 7 days
        "new_this_week":  conn.execute(
            "SELECT COUNT(*) FROM users WHERE created_at >= datetime('now','-7 days')"
        ).fetchone()[0],
    }
    conn.close()
    return jsonify(stats)


@app.route("/api/admin/users", methods=["GET"])
def admin_get_users():
    """
    All users with full details.
    Optional query params: role=student|teacher|admin, search=text
    """
    _, err = require_admin()
    if err: return err

    role_filter = request.args.get("role","")
    search      = request.args.get("search","").strip().lower()

    conn  = get_db()
    query = """
        SELECT u.id, u.username, u.email, u.role, u.email_verified,
               u.suspended, u.grade, u.class_name, u.created_at,
               COUNT(DISTINCT qa.id) AS quiz_attempts,
               ROUND(AVG(qa.score_percentage),1) AS avg_score
        FROM users u
        LEFT JOIN quiz_attempts qa ON qa.student_id = u.id
        WHERE 1=1
    """
    params = []
    if role_filter:
        query += " AND u.role = ?"
        params.append(role_filter)
    if search:
        query += " AND (LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ?)"
        params += [f"%{search}%", f"%{search}%"]

    query += " GROUP BY u.id ORDER BY u.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify({"users": [dict(r) for r in rows]})


@app.route("/api/admin/users/<int:uid>/suspend", methods=["POST"])
def admin_suspend_user(uid):
    """Toggle suspend on/off for a user."""
    _, err = require_admin()
    if err: return err
    conn    = get_db()
    current = conn.execute("SELECT suspended, role FROM users WHERE id=?", (uid,)).fetchone()
    if not current:
        conn.close(); return jsonify({"error":"User not found"}), 404
    if current["role"] == "admin":
        conn.close(); return jsonify({"error":"Cannot suspend another admin"}), 400
    new_val = 0 if current["suspended"] else 1
    conn.execute("UPDATE users SET suspended=? WHERE id=?", (new_val, uid))
    conn.commit(); conn.close()
    action = "suspended" if new_val else "unsuspended"
    return jsonify({"message": f"User {action}.", "suspended": new_val})


@app.route("/api/admin/users/<int:uid>", methods=["DELETE"])
def admin_delete_user(uid):
    """Permanently delete a user and all their data."""
    _, err = require_admin()
    if err: return err
    conn = get_db()
    user = conn.execute("SELECT role, username FROM users WHERE id=?", (uid,)).fetchone()
    if not user:
        conn.close(); return jsonify({"error":"User not found"}), 404
    if user["role"] == "admin":
        conn.close(); return jsonify({"error":"Cannot delete an admin account"}), 400
    # Cascade delete: attempts, assignments, password resets, verifications
    conn.execute("DELETE FROM quiz_attempts      WHERE student_id=?",  (uid,))
    conn.execute("DELETE FROM assignments        WHERE student_id=? OR assigned_by=?", (uid, uid))
    conn.execute("DELETE FROM password_resets    WHERE email=(SELECT email FROM users WHERE id=?)", (uid,))
    conn.execute("DELETE FROM email_verifications WHERE email=(SELECT email FROM users WHERE id=?)", (uid,))
    conn.execute("DELETE FROM users              WHERE id=?", (uid,))
    conn.commit(); conn.close()
    return jsonify({"message": f"User '{user['username']}' deleted permanently."})


@app.route("/api/admin/quizzes", methods=["GET"])
def admin_get_quizzes():
    """All quizzes across all teachers — read-only view."""
    _, err = require_admin()
    if err: return err
    conn = get_db()
    rows = conn.execute("""
        SELECT qz.id, qz.title, qz.difficulty, qz.published, qz.created_at,
               t.name  AS topic_name,
               u.username AS teacher_name,
               COUNT(DISTINCT a.id)  AS assigned_count,
               COUNT(DISTINCT qa.id) AS attempt_count,
               ROUND(AVG(qa.score_percentage),1) AS avg_score
        FROM quizzes qz
        JOIN topics t  ON t.id  = qz.topic_id
        JOIN users  u  ON u.id  = qz.created_by
        LEFT JOIN assignments  a  ON a.quiz_id  = qz.id
        LEFT JOIN quiz_attempts qa ON qa.quiz_id = qz.id
        GROUP BY qz.id
        ORDER BY qz.created_at DESC
    """).fetchall()
    conn.close()
    return jsonify({"quizzes": [dict(r) for r in rows]})


@app.route("/api/admin/teachers", methods=["GET"])
def admin_get_teachers():
    """List all teacher accounts with their activity stats."""
    _, err = require_admin()
    if err: return err
    conn = get_db()
    rows = conn.execute("""
        SELECT u.id, u.username, u.email, u.suspended, u.created_at,
               COUNT(DISTINCT qz.id) AS quizzes_created,
               COUNT(DISTINCT t.id)  AS topics_created
        FROM users u
        LEFT JOIN quizzes qz ON qz.created_by = u.id
        LEFT JOIN topics  t  ON t.created_by  = u.id
        WHERE u.role = 'teacher'
        GROUP BY u.id ORDER BY u.created_at DESC
    """).fetchall()
    conn.close()
    return jsonify({"teachers": [dict(r) for r in rows]})


@app.route("/api/admin/teachers", methods=["POST"])
def admin_create_teacher():
    """Admin creates a teacher account directly — no email verification required."""
    _, err = require_admin()
    if err: return err

    d        = request.get_json()
    username = d.get("username", "").strip()
    email    = d.get("email",    "").strip().lower()
    password = d.get("password", "").strip()

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400
    if not is_valid_email(email):
        return jsonify({"error": "Please enter a valid email address"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if not re.search(r"[A-Z]", password):
        return jsonify({"error": "Password must contain at least one uppercase letter (A-Z)"}), 400
    if not re.search(r"[a-z]", password):
        return jsonify({"error": "Password must contain at least one lowercase letter (a-z)"}), 400

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (username, email, password, role, email_verified) VALUES (?,?,?,?,1)",
            (username, email, hash_password(password), "teacher")
        )
        conn.commit()
        teacher = conn.execute(
            "SELECT id, username, email, suspended, created_at FROM users WHERE email=?", (email,)
        ).fetchone()
        conn.close()
        return jsonify({
            "message": f"Teacher account '{username}' created successfully.",
            "teacher": dict(teacher)
        }), 201
    except sqlite3.IntegrityError as e:
        conn.close()
        msg = "Username already taken." if "username" in str(e) else "Email already registered."
        return jsonify({"error": msg}), 409


@app.route("/api/admin/activity", methods=["GET"])
def admin_activity():
    """Recent platform activity — last 20 quiz attempts."""
    _, err = require_admin()
    if err: return err
    conn = get_db()
    rows = conn.execute("""
        SELECT qa.score_percentage, qa.taken_at,
               u.username  AS student_name,
               qz.title    AS quiz_title,
               t.name      AS topic_name
        FROM quiz_attempts qa
        JOIN users  u  ON u.id  = qa.student_id
        JOIN quizzes qz ON qz.id = qa.quiz_id
        JOIN topics t  ON t.id  = qz.topic_id
        ORDER BY qa.taken_at DESC
        LIMIT 20
    """).fetchall()
    conn.close()
    return jsonify({"activity": [dict(r) for r in rows]})


if __name__ == "__main__":
    init_db()
    seed_questions()
    print("✅ Backend v6 running on http://localhost:5000")
    app.run(debug=True, port=5000)