import os
from getpass import getpass
from datetime import datetime
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from flask import Flask

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure SQLAlchemy
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# User model
class User(db.Model):
    __tablename__ = "users"
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create database tables
def create_database():
    db.create_all()

def register_user(username, password):
    if User.query.filter_by(username=username).first():
        print("Error: Username already exists.")
        return

    hashed_password = generate_password_hash(password)
    new_user = User(username=username, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()
    print("User registered successfully.")

if __name__ == '__main__':
    with app.app_context():
        create_database()
        username = input("Enter username: ")
        password = getpass("Enter password: ")
        register_user(username, password)
