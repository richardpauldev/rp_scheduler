import pandas as pd
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from flask import request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    login_required,
    logout_user,
    current_user,
)
from werkzeug.security import generate_password_hash, check_password_hash
from reportlab.pdfgen import canvas
from functools import wraps
from sqlalchemy import or_, and_
from sqlalchemy.orm import aliased
import calendar
from collections import defaultdict
import heapq
import random

# TODO hide database URI
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}) # Frontend access

app.config["SQLALCHEMY_DATABASE_URI"] = (
    "mysql+pymysql://rp_scheduler_user:xn5TjtpJdxJQiqH9AX@localhost/rp_scheduler_db" # DB location
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

app.secret_key = "thisissupersecret"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = RotatingFileHandler("app.log", maxBytes=10000, backupCount=1)
handler.setLevel(logging.INFO)
logger.addHandler(handler)


class User(db.Model, UserMixin):
    __tablename__ = "users"
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True)
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def get_id(self):
        return self.user_id


def create_database():
    db.create_all()


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def register_user(username, password):
    hashed_password = generate_password_hash(password)
    new_user = User(username=username, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()


@app.route("/api/login", methods=["POST"])
def login():
    logger.info("Received Login Request")

    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        login_user(user)
        return jsonify({"message": "Logged in successfully!"}), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401


@app.route("/api/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"message": "You have been logged out"}), 200


#
#  AGENT STUFF
#
class Agent(db.Model):
    __tablename__ = "agents"
    agent_id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(255))
    last_name = db.Column(db.String(255))
    email = db.Column(db.String(255), unique=True)
    phone_number = db.Column(db.String(255))
    active_status = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


@app.route("/api/agents/create", methods=["POST"])
@login_required
def create_agent():
    try:
        data = request.json
        new_agent = Agent(
            first_name=data["first_name"],
            last_name=data["last_name"],
            email=data["email"],
            phone_number=data["phone_number"],
            active_status=data["active_status"],
        )
        db.session.add(new_agent)
        db.session.flush()
        agent_id = new_agent.agent_id
        db.session.commit()
        return jsonify({"message": "New agent created", "agent_id": agent_id}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating agent {str(e)}")
        return jsonify({"message": "Failed to create agent"}), 500


@app.route("/api/agents/get", methods=["GET"])
@login_required
def get_agents():
    agents = Agent.query
    search = request.args.get("search")
    if search:
        agents = agents.filter(
            (Agent.first_name.like(f"%{search}%"))
            | (Agent.last_name.like(f"%{search}%"))
            | (Agent.email.like(f"%{search}%"))
        )
    agents = agents.all()

    agents_data = []
    for agent in agents:
        agents_data.append(
            {
                "agent_id": agent.agent_id,
                "first_name": agent.first_name,
                "last_name": agent.last_name,
                "email": agent.email,
                "phone_number": agent.phone_number,
                "active_status": agent.active_status
            }
        )
    return jsonify(agents_data)


@app.route("/api/agents/update/<int:agent_id>", methods=["PUT"])
@login_required
def update_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    try:
        data = request.json
        agent.first_name = data.get("first_name", agent.first_name)
        agent.last_name = data.get("last_name", agent.last_name)
        agent.email = data.get("email", agent.email)
        agent.phone_number = data.get("phone_number", agent.phone_number)
        agent.active_status = data.get("active_status", agent.active_status)
        db.session.commit()
        return jsonify({"message": "Agent updated"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating agent: {str(e)}")
        return jsonify({"message": "Failed to update agent"}), 500


@app.route("/api/agents/delete/<int:agent_id>", methods=["DELETE"])
@login_required
def delete_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    try:
        RecurringAvailability.query.filter_by(agent_id=agent_id).delete()
        Availability.query.filter_by(agent_id=agent_id).delete()

        # Identify ScheduleDetails where the agent is a part of a pair
        paired_details = ScheduleDetail.query.filter(
            or_(
                ScheduleDetail.agent1_id == agent_id,
                ScheduleDetail.agent2_id == agent_id,
            ),
            ScheduleDetail.is_paired == True
        ).all()

        # Update ScheduleDetails to unpair and clear the appropriate agent_id
        for detail in paired_details:
            if detail.agent1_id != agent_id:
                # If the deleted agent is agent2, clear agent2 and unpair
                detail.agent2_id = None
            else:
                # If the deleted agent is agent1, move agent2 to agent1, clear agent2, and unpair
                detail.agent1_id = detail.agent2_id
                detail.agent2_id = None
            detail.is_paired = False

        ScheduleDetail.query.filter(
            db.or_(
                db.and_(ScheduleDetail.agent1_id == agent_id, ScheduleDetail.agent2_id == None),
                db.and_(ScheduleDetail.agent2_id == agent_id, ScheduleDetail.agent1_id == None)
            ),
            ScheduleDetail.is_paired == False
        ).delete()

        Blacklist.query.filter(
            or_(Blacklist.agent1_id == agent_id, Blacklist.agent2_id == agent_id)
        ).delete()
        db.session.delete(agent)
        db.session.commit()
        return jsonify({"message": "Agent and related data deleted"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting agent and related data: {str(e)}")
        return jsonify({"message": "Failed to delete agent and related data"}), 500


class RecurringAvailability(db.Model):
    __tablename__ = "recurring_availability"
    id = db.Column(db.Integer, primary_key=True)
    agent_id = db.Column(db.Integer, db.ForeignKey("agents.agent_id"))
    day_of_week = db.Column(db.Integer)
    is_available = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class Availability(db.Model):
    __tablename__ = "availability"
    availability_id = db.Column(db.Integer, primary_key=True)
    agent_id = db.Column(db.Integer, db.ForeignKey("agents.agent_id"))
    date = db.Column(db.Date)
    is_available = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


@app.route("/api/agents/<int:agent_id>/availability", methods=["GET"])
@login_required
def get_agent_availability(agent_id):
    try:
        agent = Agent.query.get_or_404(agent_id)

        weekly_availability = RecurringAvailability.query.filter_by(
            agent_id=agent_id
        ).all()
        weekdays = {
            day: is_available for day, is_available in enumerate(calendar.day_name)
        }
        weekly_data = {
            "weekdays": [
                av.day_of_week for av in weekly_availability if av.is_available
            ]
        }

        specific_dates = Availability.query.filter_by(agent_id=agent_id).all()
        specific_dates_data = defaultdict(list)
        for av in specific_dates:
            year_month_key = f"{av.date.year}-{av.date.month}"
            specific_dates_data[year_month_key].append(av.date.day)

        return jsonify(
            {
                "agent_id": agent.agent_id,
                "weeklyAvailability": weekly_data,
                "specificDates": specific_dates_data,
            }
        )
    except Exception as e:
        logger.exception(f"Error fetching availability for agent {agent_id}: {str(e)}")
        return jsonify({"message": "Failed to fetch availability data"}), 500


@app.route("/api/agents/availability/update/<int:agent_id>", methods=["PUT"])
@login_required
def update_availability(agent_id):
    try:
        data = request.json

        Availability.query.filter_by(agent_id=agent_id).delete()
        RecurringAvailability.query.filter_by(agent_id=agent_id).delete()
        # Update weekly availability
        for day in range(7):
            is_available = day in data["weeklyAvailability"]
            db.session.add(
                RecurringAvailability(
                    agent_id=agent_id, day_of_week=str(day), is_available=is_available
                )
            )

        # Update specific dates availability
        for year_month, days in data["specificDates"].items():
            year, month = map(int, year_month.split("-"))
            for day in days:
                date = datetime(year, month, day).date()

                weekday = date.weekday()
                usual_availability = RecurringAvailability.query.filter_by(
                    agent_id=agent_id, day_of_week=str(weekday)
                ).first()
                is_available = (
                    not usual_availability.is_available if usual_availability else True
                )
                new_availability = Availability(
                    agent_id=agent_id, date=date, is_available=is_available
                )
                db.session.add(new_availability)

        db.session.commit()
        return jsonify({"message": "Availability updated"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating availability for agent {agent_id}: {str(e)}")
        return jsonify({"message": "Failed to update availability"}), 500


class Blacklist(db.Model):
    __tablename__ = "blacklist"
    blacklist_id = db.Column(db.Integer, primary_key=True)
    agent1_id = db.Column(db.Integer, db.ForeignKey("agents.agent_id"))
    agent2_id = db.Column(db.Integer, db.ForeignKey("agents.agent_id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


@app.route("/api/agents/blacklist/get/<int:agent_id>", methods=["GET"])
@login_required
def get_blacklist_for_agent(agent_id):
    try:
        blacklist_entries = Blacklist.query.filter(
            (Blacklist.agent1_id == agent_id) | (Blacklist.agent2_id == agent_id)
        ).all()

        blacklist_ids = []
        for entry in blacklist_entries:
            if entry.agent1_id == agent_id:
                blacklist_ids.append(entry.agent2_id)
            else:
                blacklist_ids.append(entry.agent1_id)

        return jsonify(blacklist_ids), 200
    except Exception as e:
        print(f"Failed to retrieve blacklist for agent {agent_id}: {str(e)}")
        return jsonify({"message": "Failed to retrieve blacklist"}), 500


@app.route("/api/agents/blacklist/update/<int:agent_id>", methods=["PUT"])
@login_required
def update_blacklist(agent_id):
    try:
        data = request.json

        incoming_blacklist_ids = request.json.get("blacklist_ids", [])

        current_blacklist = Blacklist.query.filter(
            or_(Blacklist.agent1_id == agent_id, Blacklist.agent2_id == agent_id)
        ).all()

        current_blacklist_pairs = {
            (entry.agent1_id, entry.agent2_id) for entry in current_blacklist
        }

        incoming_blacklist_pairs = {
            (agent_id, blk_id) if agent_id < blk_id else (blk_id, agent_id)
            for blk_id in incoming_blacklist_ids
        }

        pairs_to_add = incoming_blacklist_pairs - current_blacklist_pairs
        pairs_to_remove = current_blacklist_pairs - incoming_blacklist_pairs

        for agent1, agent2 in pairs_to_add:
            db.session.add(Blacklist(agent1_id=agent1, agent2_id=agent2))

        for agent1, agent2 in pairs_to_remove:
            Blacklist.query.filter(
                or_(
                    and_(Blacklist.agent1_id == agent1, Blacklist.agent2_id == agent2),
                    and_(Blacklist.agent1_id == agent2, Blacklist.agent2_id == agent1),
                )
            ).delete()

        db.session.commit()
        return jsonify({"message": "Blacklist updated"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating blacklist for agent {agent_id}: {str(e)}")
        return jsonify({"message": "Failed to update blacklist"}), 500


#
#   End of Agent Stuff
#


class Schedule(db.Model):
    __tablename__ = "schedules"
    schedule_id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ScheduleDetail(db.Model):
    __tablename__ = "schedule_details"
    schedule_detail_id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey("schedules.schedule_id"))
    agent1_id = db.Column(db.Integer, db.ForeignKey("agents.agent_id"))
    agent2_id = db.Column(db.Integer, db.ForeignKey("agents.agent_id"))
    is_paired = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

def is_agent_available(agent_id, day_name, current_day):
    specific_avail = Availability.query.filter_by(
        agent_id=agent_id, date=current_day
    ).first()
    if specific_avail is not None:
        return specific_avail.is_available

    recurring_avail = RecurringAvailability.query.filter_by(
        agent_id=agent_id, day_of_week=day_name
    ).first()
    if recurring_avail is not None:
        return recurring_avail.is_available

    return False  # Unavailable if both specific and recurring availabilities are None

def create_schedule(monday_date):
    pairing_delta = relativedelta(months=8)

    active_agents = Agent.query.filter_by(active_status=True).all()

    if len(active_agents) % 2 == 1:
        removed_agent = random.choice(active_agents)
        active_agents.remove(removed_agent)

    all_blacklisted_pairs = Blacklist.query.all()
    blacklisted_set = {(bl.agent1_id, bl.agent2_id) for bl in all_blacklisted_pairs}

    past_pairings = (
        db.session.query(ScheduleDetail.agent1_id, ScheduleDetail.agent2_id)
        .join(Schedule)
        .filter(ScheduleDetail.is_paired, Schedule.date > monday_date - pairing_delta, Schedule.date < monday_date + pairing_delta)
        .all()
    )

    past_pairings_set = {(pp.agent1_id, pp.agent2_id) for pp in past_pairings}

    week_availability = defaultdict(lambda: defaultdict(bool))
    for agent in active_agents:
        for day_offset in range(7):
            current_day = monday_date + timedelta(days=day_offset)
            is_available = is_agent_available(agent.agent_id, day_offset, current_day)
            week_availability[agent.agent_id][day_offset] = is_available

    available_pairings = []
    for i, agent1 in enumerate(active_agents):
        for agent2 in active_agents[i + 1 :]:
            if (agent1.agent_id, agent2.agent_id) in blacklisted_set or (agent1.agent_id, agent2.agent_id) in blacklisted_set:
                continue

            if (agent1.agent_id, agent2.agent_id) in past_pairings_set or (agent2.agent_id, agent1.agent_id) in past_pairings_set:
                continue

            if any(week_availability[agent1.agent_id][day_offset] and week_availability[agent2.agent_id][day_offset] for day_offset in range(7)):
                available_pairings.append((agent1, agent2))

    selected_pairings = []
    unpaired_agents = set(agent.agent_id for agent in active_agents)

    agent_to_partners = defaultdict(set)
    for agent1, agent2 in available_pairings:
        agent_to_partners[agent1.agent_id].add(agent2.agent_id)
        agent_to_partners[agent2.agent_id].add(agent1.agent_id)

    pq = [(len(partners), agent_id) for agent_id, partners in agent_to_partners.items()]
    heapq.heapify(pq)

    # If performance is an issue, could add some sort of break once all reasonable connections are made
    while pq and unpaired_agents:
        # Remove the most constrained agent
        constraint, agent_id = heapq.heappop(pq)

        if agent_id not in unpaired_agents or constraint != len(agent_to_partners[agent_id]):
            continue

        for partner_id in list(agent_to_partners[agent_id]):
            if partner_id in unpaired_agents:
                selected_pairings.append((agent_id, partner_id))
                unpaired_agents.remove(agent_id)
                unpaired_agents.remove(partner_id)

                agent_possible_partners = agent_to_partners[agent_id]
                del agent_to_partners[agent_id]
                agent_possible_partners.remove(partner_id)

                partner_possible_partners = agent_to_partners[partner_id]
                del agent_to_partners[partner_id]
                partner_possible_partners.remove(agent_id)

                reprocess = set()
                
                # Iterate through places our partner is paired with
                for other_partner_id in partner_possible_partners:
                    agent_to_partners[other_partner_id].discard(partner_id)
                    reprocess.add(other_partner_id)

                # Iterate through places our partner is paired with
                for other_partner_id in agent_possible_partners:
                    agent_to_partners[other_partner_id].discard(agent_id)
                    reprocess.add(other_partner_id)

                for agent in reprocess:
                    heapq.heappush(pq, (len(agent_to_partners[agent]), agent))

                break

    unpaired_agents_list = list(unpaired_agents)
    if removed_agent is not None:
        unpaired_agents_list.append(removed_agent.agent_id)

    return selected_pairings, unpaired_agents_list


def generate_schedule_func(monday_date):
    # Check if a schedule already exists for this date and delete it if so
    existing_schedule = Schedule.query.filter_by(date=monday_date).first()
    if existing_schedule:
        ScheduleDetail.query.filter_by(
            schedule_id=existing_schedule.schedule_id
        ).delete()
        db.session.delete(existing_schedule)
        db.session.commit()

    agent_pairings, unpaired_agents = create_schedule(monday_date)
    if agent_pairings:
        schedule = Schedule(date=monday_date)
        db.session.add(schedule)
        db.session.commit()

        for agent1_id, agent2_id in agent_pairings:
            schedule_detail = ScheduleDetail(
                schedule_id=schedule.schedule_id,
                agent1_id=agent1_id,
                agent2_id=agent2_id,
                is_paired=True
            )
            db.session.add(schedule_detail)

    if unpaired_agents:
        for agent_id in unpaired_agents:
            schedule_detail = ScheduleDetail(
                schedule_id=schedule.schedule_id,
                agent1_id=agent_id,
                is_paired=False
            )
            db.session.add(schedule_detail)

    db.session.commit()


@app.route("/api/schedule/generate", methods=["POST"])
@login_required
def generate_schedule():
    date_str = request.args.get("date")  # Getting the date from query parameter
    if date_str:
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
    else:
        return jsonify({"error": "Date parameter is required"}), 400

    generate_schedule_func(date)

    return jsonify({"message": "Schedule generated"}), 201


@app.route("/api/schedule/get", methods=["GET"])
@login_required
def get_schedule():
    date_str = request.args.get("date")  # Getting the date from query parameter
    if not date_str:
        return jsonify({"error": "Date parameter is required"}), 400

    try:
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    schedule = Schedule.query.filter_by(date=date).first()

    if not schedule:
        generate_schedule_func(date)
        schedule = Schedule.query.filter_by(date=date).first()

    if not schedule:
        return jsonify({"error": "Regenerated schedule not found"}), 400
    
    Agent1 = aliased(Agent)
    Agent2 = aliased(Agent)

    schedule_details = db.session.query(
        ScheduleDetail,
        Agent1.first_name.label("agent1_first_name"),
        Agent1.last_name.label("agent1_last_name"),
        Agent2.first_name.label("agent2_first_name"),
        Agent2.last_name.label("agent2_last_name")
    ).join(
        Agent1, Agent1.agent_id == ScheduleDetail.agent1_id
    ).join(
        Agent2, Agent2.agent_id == ScheduleDetail.agent2_id
    ).filter(
        ScheduleDetail.is_paired, ScheduleDetail.schedule_id == schedule.schedule_id
    ).all()

    unpaired = db.session.query(
        ScheduleDetail,
        Agent1.first_name.label("agent1_first_name"),
        Agent1.last_name.label("agent1_last_name")
    ).join(
        Agent1, Agent1.agent_id == ScheduleDetail.agent1_id
    ).filter(
        ScheduleDetail.is_paired == False, ScheduleDetail.schedule_id == schedule.schedule_id
    ).all()

    schedule_data = {
        "schedule_id": schedule.schedule_id,
        "date": schedule.date.isoformat(),
        "details": [
            {
                "agent1_name": f"{agent1_first_name} {agent1_last_name}",
                "agent2_name": f"{agent2_first_name} {agent2_last_name}"
            } for _, agent1_first_name, agent1_last_name, agent2_first_name, agent2_last_name in schedule_details        
        ],
        "unpaired": [
            {
                "agent_name": f"{agent1_first_name} {agent1_last_name}",
            } for _, agent1_first_name, agent1_last_name in unpaired 
        ]

    }
    return jsonify(schedule_data)

@app.route("/api/schedule/set", methods=["POST"]) 
@login_required
def set_schedule():
    data = request.json
    if not data or "date" not in data or "details" not in data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        date = datetime.strptime(data["date"], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    
    details = data["details"]
    unpaired = data.get("unpaired", [])
    
    existing_schedule = Schedule.query.filter_by(date=date).first()
    if existing_schedule:
        ScheduleDetail.query.filter_by(schedule_id=existing_schedule.schedule_id).delete()
        db.session.delete(existing_schedule)
        db.session.commit()

    new_schedule = Schedule(date=date)
    db.session.add(new_schedule)
    db.session.commit()

    def get_agent_id_by_name(name):
        first_name, last_name = name.split(" ")
        agent = Agent.query.filter_by(first_name=first_name, last_name=last_name).first()
        return agent.agent_id if agent else None
    
    extra_unpaired = []
    
    for detail in details:
        agent1_name = detail.get("agent1_name")
        agent2_name = detail.get("agent2_name")
        if agent1_name and agent2_name:
            agent1_id = get_agent_id_by_name(agent1_name)
            agent2_id = get_agent_id_by_name(agent2_name)
            if agent1_id and agent2_id:
                new_schedule_detail = ScheduleDetail(
                    schedule_id=new_schedule.schedule_id,
                    agent1_id=agent1_id,
                    agent2_id=agent2_id,
                    is_paired=True
                )
                db.session.add(new_schedule_detail)
        elif agent1_name and not agent2_name:
            extra_unpaired.append(agent1_name)
        elif agent2_name and not agent1_name:
            extra_unpaired.append(agent2_name)
    
    for agent in unpaired:
        print(agent)
        agent_name = agent.get("agent_name")
        print(agent_name)
        if agent_name:
            agent_id = get_agent_id_by_name(agent_name)
            if agent_id:
                new_schedule_detail = ScheduleDetail(
                    schedule_id=new_schedule.schedule_id,
                    agent1_id=agent_id,
                    is_paired=False
                )
                db.session.add(new_schedule_detail)

    for agent in extra_unpaired:
        agent_name = agent
        print(agent_name)
        if agent_name:
            agent_id = get_agent_id_by_name(agent_name)
            if agent_id:
                new_schedule_detail = ScheduleDetail(
                    schedule_id=new_schedule.schedule_id,
                    agent1_id=agent_id,
                    is_paired=False
                )
                db.session.add(new_schedule_detail)

    db.session.commit()

    return jsonify({"message": "Schedule set successfully"}), 200

@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"An error occurred: {str(e)}")
    return jsonify({"message": "An internal error occurred"}), 500


@app.errorhandler(404)
def resource_not_found(e):
    return jsonify({"message": "Resource not found"}), 404


@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({"message": "Internal server error"}), 500


# Remember to use @login_required when necessary
if __name__ == "__main__":
    with app.app_context():
        print("trying to create db")
        create_database()

        # Create a test user
        test_username = "testuser"
        test_password = "Test1234"  # Choose a secure password

        existing_user = User.query.filter_by(username=test_username).first()
        if not existing_user:
            register_user(test_username, test_password)
            print("Test user created.")
        else:
            print("Test user already exists.")

    app.run(debug=True)
