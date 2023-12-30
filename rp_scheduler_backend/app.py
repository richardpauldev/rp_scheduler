from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://rp_scheduler_user:FL6#$YuB$!i5@^md3G@localhost/rp_scheduler_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Agent(db.Model):
    __tablename__ = 'agents'
    agent_id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(255))
    last_name = db.Column(db.String(255))
    email = db.Column(db.String(255), unique=True)
    phone_number = db.Column(db.String(255))
    active_status = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Availability(db.Model):
    __tablename__ = 'availability'
    availability_id = db.Column(db.Integer, primary_key=True)
    agent_id = db.Column(db.Integer, db.ForeignKey('agents.agent_id'))
    date = db.Column(db.Date)
    is_available = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Schedule(db.Model):
    __tablename__ = 'schedules'
    schedule_id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ScheduleDetail(db.Model):
    __tablename__ = 'schedule_details'
    schedule_detail_id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedules.schedule_id'))
    agent1_id = db.Column(db.Integer, db.ForeignKey('agents.agent_id'))
    agent2_id = db.Column(db.Integer, db.ForeignKey('agents.agent_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PairingHistory(db.Model):
    __tablename__ = 'pairing_history'
    history_id = db.Column(db.Integer, primary_key=True)
    agent1_id = db.Column(db.Integer, db.ForeignKey('agents.agent_id'))
    agent2_id = db.Column(db.Integer, db.ForeignKey('agents.agent_id'))
    paired_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True)
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Blacklist(db.Model):
    __tablename__ = 'blacklist'
    blacklist_id = db.Column(db.Integer, primary_key=True)
    agent1_id = db.Column(db.Integer, db.ForeignKey('agents.agent_id'))
    agent2_id = db.Column(db.Integer, db.ForeignKey('agents.agent_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

if __name__ == '__main__':
    db.create_all()
    app.run(debug=True)