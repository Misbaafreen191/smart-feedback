from flask import Flask, jsonify, request, render_template, redirect, url_for
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from models import db, Feedback, User
from sentiment_analyzer import analyze_sentiment
import os

# -------------------------------------------------------------------
# 🏗️ APP SETUP
# -------------------------------------------------------------------
app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)
bcrypt = Bcrypt(app)

# ✅ Configure SQLite database (unchanged)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# Using pymysql
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://smart_user:admin@localhost/smart_feedback"

# Optional: disable modification tracking (already in your code)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# ✅ Initialize DB
db.init_app(app)
with app.app_context():
    db.create_all()

# -------------------------------------------------------------------
# 🌐 FRONTEND ROUTES
# -------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/register")
def register_page():
    return render_template("register.html")

@app.route("/admin")
def admin_page():
    """Serve the Admin Dashboard HTML."""
    return render_template("admin.html")

# -------------------------------------------------------------------
# 👤 AUTH API
# -------------------------------------------------------------------
@app.route("/api/register", methods=["POST"])
def register_user():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "user")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(name=name, email=email, password=hashed_pw, role=role)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Registration successful!"}), 201
@app.route("/api/admin/users/<int:uid>/delete", methods=["DELETE"])
def delete_user(uid):
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": f"User ID {uid} deleted"}), 200


@app.route("/api/login", methods=["POST"])
def login_user():
    """Handles user/admin login and sends appropriate redirect path."""
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials"}), 401

    # ✅ If admin logs in, tell frontend to redirect to admin.html
    if user.role and user.role.lower() == "admin":
        redirect_target = "admin.html"
        message = "Admin login successful!"
    else:
        redirect_target = "index.html"
        message = "Login successful!"

    return jsonify({
        "message": message,
        "redirect": redirect_target,
        "user": user.to_dict()
    }), 200

# -------------------------------------------------------------------
# 📝 FEEDBACK API
# -------------------------------------------------------------------
@app.route("/api/feedback", methods=["POST"])
def add_feedback():
    data = request.get_json(force=True)
    name = data.get("name", "").strip()
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Feedback message is required"}), 400

    result = analyze_sentiment(message)
    sentiment = result["sentiment"]
    score = result["score"]

    fb = Feedback(name=name or None, message=message, sentiment=sentiment, score=score)
    db.session.add(fb)
    db.session.commit()

    return jsonify({
        "saved": True,
        "sentiment": sentiment,
        "score": score,
        "feedback": fb.to_dict()
    }), 201


@app.route("/api/summary", methods=["GET"])
def get_summary():
    pos = Feedback.query.filter_by(sentiment="Positive").count()
    neg = Feedback.query.filter_by(sentiment="Negative").count()
    neu = Feedback.query.filter_by(sentiment="Neutral").count()
    return jsonify({"positive": pos, "negative": neg, "neutral": neu})


@app.route("/api/feedbacks", methods=["GET"])
def get_feedbacks():
    feedbacks = Feedback.query.order_by(Feedback.timestamp.desc()).limit(10).all()
    return jsonify([f.to_dict() for f in feedbacks])

# -------------------------------------------------------------------
# 👑 ADMIN API
# -------------------------------------------------------------------
@app.route("/api/admin/users", methods=["GET"])
def get_all_users():
    """Return all registered users (for admin dashboard)."""
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200


@app.route("/api/admin/feedbacks", methods=["GET"])
def get_all_feedbacks():
    """Return all feedback entries (for admin dashboard)."""
    feedbacks = Feedback.query.order_by(Feedback.timestamp.desc()).all()
    return jsonify([f.to_dict() for f in feedbacks]), 200


@app.route("/api/admin/feedbacks/<int:fid>/delete", methods=["DELETE"])
def delete_feedback(fid):
    """Allow admin to delete a specific feedback entry."""
    fb = Feedback.query.get(fid)
    if not fb:
        return jsonify({"error": "Feedback not found"}), 404

    db.session.delete(fb)
    db.session.commit()
    return jsonify({"message": f"Feedback ID {fid} deleted"}), 200

# -------------------------------------------------------------------
# 🚀 RUN
# -------------------------------------------------------------------

if __name__ == "__main__":
    with app.app_context():
     db.create_all()  # This will create users & feedback tables in MySQL
     print(" Tables created in MySQL!")
    try:
            print("Testing MySQL connection...")
            users = User.query.all()
            print("Users table exists, entries:", users)
            feedbacks = Feedback.query.all()
            print("Feedback table exists, entries:", feedbacks)
            print(" MySQL connection works!")
    except Exception as e:
            print(" Error connecting to MySQL:", e)

    app.run(debug=True, host="0.0.0.0", port=5000)
