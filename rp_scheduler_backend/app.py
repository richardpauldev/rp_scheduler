import pandas as pd
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from flask import request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from reportlab.pdfgen import canvas
from io import BytesIO

# TODO input validation
# TODO Error handling of db transactions
# TODO hide database URI

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://rp_scheduler_user:xn5TjtpJdxJQiqH9AX@localhost/rp_scheduler_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

app.secret_key = 'thisissupersecret'

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=1)
handler.setLevel(logging.INFO)
logger.addHandler(handler)

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

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True)
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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

class Blacklist(db.Model):
    __tablename__ = 'blacklist'
    blacklist_id = db.Column(db.Integer, primary_key=True)
    agent1_id = db.Column(db.Integer, db.ForeignKey('agents.agent_id'))
    agent2_id = db.Column(db.Integer, db.ForeignKey('agents.agent_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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

@app.route('/api/login', methods=['POST'])
def login():
    logger.info("Received Login Request")

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400
    
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        login_user(user)
        return jsonify({'message': 'Logged in successfully!'}), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/logout')
@login_required
def logout():
    logout_user()
    return 'You have been logged out!'

@app.route('/api/agents/create', methods=['POST'])
@login_required
def create_agent():
    try:
        data = request.json
        new_agent = Agent(
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=data['email'],
            phone_number=data['phone_number'],
            active_status=data['active_status']
        )
        db.session.add(new_agent)
        db.session.commit()
        return jsonify({'message': 'New agent created'}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating agent {str(e)}")
        return jsonify({'message': 'Failed to create agent'}), 500 

@app.route('/api/agents/get', methods=['GET'])
@login_required
def get_agents():
    agents = Agent.query
    search = request.args.get('search')
    if search:
        agents = agents.filter((Agent.first_name.like(f'%{search}%')) | 
                               (Agent.last_name.like(f'%{search}%')) |
                               (Agent.email.like(f'%{search}%')))
    agents = agents.all()
    return jsonify([{'agent_id': agent.agent_id, 'first_name': agent.first_name, 'last_name': agent.last_name, 'email': agent.email, 'phone_number': agent.phone_number, 'active_status': agent.active_status} for agent in agents])


@app.route('/api/agents/update/<int:agent_id>', methods=['PUT'])
@login_required
def update_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    try:
        data = request.json
        agent.first_name = data.get('first_name', agent.first_name)
        agent.last_name = data.get('last_name', agent.last_name)
        agent.email = data.get('email', agent.email)
        agent.phone_number = data.get('phone_number', agent.phone_number)
        agent.active_status = data.get('active_status', agent.active_status)
        db.session.commit()
        return jsonify({'message': 'Agent updated'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating agent: {str(e)}")
        return jsonify({'message': 'Failed to update agent'}), 500
    

@app.route('/api/agents/delete/<int:agent_id>', methods=['DELETE'])
@login_required
def delete_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    try:
        db.session.delete(agent)
        db.session.commit()
        return jsonify({'message': 'Agent deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting agent: {str(e)}")
        return jsonify({'message': 'Failed to delete agent'}), 500

@app.route('/api/schedule/generate', methods=['POST'])
@login_required
def generate_schedule():
    #TODO create_schedule method
    def create_schedule():
        pass

    create_schedule()
    return jsonify({'message': 'Schedule generated'}), 201

@app.route('/api/schedule/get', methods=['GET'])
@login_required
def get_schedule():
    schedules = Schedule.query.all()
    schedule_data = []
    for schedule in schedules:
        schedule_details = ScheduleDetail.query.filter_by(schedule_id=schedule.schedule_id).all()
        schedule_data.append({
            'schedule_id': schedule.schedule_id,
            'date': schedule.date,
            'details': [{'agent1_id': detail.agent1_id, 'agent2_id': detail.agent2_id} for detail in schedule_details]
        })
    return jsonify(schedule_data)

@app.route('/api/schedule/update/<int:schedule_id>', methods=['PUT'])
@login_required
def update_schedule(schedule_id):
    schedule = Schedule.query.get_or_404(schedule_id)
    data = request.json
    # TODO Update schedule logic here. This could involve updating individual schedule details.
    # Be sure to handle potential conflicts or issues arising from schedule changes.
    db.session.commit()
    return jsonify({'message': 'Schedule updated'})

@app.route('/api/availability/set', methods=['POST'])
@login_required
def set_availability():
    data = request.json
    agent_id = data['agent_id']
    date = data['date']
    is_available = data['is_available']

    availability = Availability.query.filter_by(agent_id=agent_id, date=date).first()

    if availability:
        #Update existing record
        availability.is_available = is_available
    else:
        #Create new availability record
        new_availability = Availability(agent_id=agent_id, date=date, is_available=is_available)
        db.session.add(new_availability)

    db.session.commit()
    return jsonify({'message': 'Availability updated'})

@app.route('/api/availability/get', methods=['GET'])
@login_required
def get_availability():
    agent_id = request.args.get('agent_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = Availability.query

    if agent_id:
        query = query.filter_by(agent_id=agent_id)

    if start_date and end_date:
        query = query.filter(Availability.date.between(start_date, end_date))

    availabilities = query.all()
    availability_data = [{'agent_id': availability.agent_id, 'date': availability.date, 'is_available': availability.is_available} for availability in availabilities]

    return jsonify(availability_data)

@app.route('/api/data/import', methods=['POST'])
@login_required
def import_data():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        df = pd.read_excel(file)
        #TODO logic to process DataFrame and import data into database
        return jsonify({'message': 'Data imported successfully'}), 201

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'xlsx', 'xls'}

@app.route('/api/data/export', methods=['GET'])
@login_required
def export_data():
    format_type = request.args.get('format', 'pdf')
    schedule_id = request.args.get('schedule_id')

    if format_type == 'pdf':
        return export_schedule_pdf(schedule_id)
    elif format_type == 'excel':
        return export_schedule_excel(schedule_id)
    else:
        return jsonify({'message': 'Invalid format specified'}), 400
    
def export_schedule_pdf(schedule_id):
    #TODO
    pass

def export_schedule_excel(schedule_id):
    #TODO
    pass

@app.route('/api/history/record', methods=['POST'])
@login_required
def record_pairing():
    data = request.json
    new_pairing = PairingHistory(
        agent1_id=data['agent1_id'],
        agent2_id=data['agent2_id'],
        paired_date=data['paired_date']
    )
    db.session.add(new_pairing)
    db.session.commit()
    return jsonify({'message': 'Pairing recorded successfully'}), 201

@app.route('/api/history/get', methods=['GET'])
@login_required
def get_history():
    agent_id = request.args.get('agent_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = PairingHistory.query

    if agent_id:
        query = query.filter((PairingHistory.agent1_id == agent_id) | (PairingHistory.agent2_id == agent_id))

    if start_date and end_date:
        query = query.filter(PairingHistory.paired_date.between(start_date, end_date))

    history = query.all()
    history_data = [{'agent1_id': pairing.agent1_id, 'agent2_id': pairing.agent2_id, 'paired_date': pairing.paired_date} for pairing in history]

    return jsonify(history_data)

@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"An error occurred: {str(e)}")
    return jsonify({'message': 'An internal error occurred'}), 500

@app.errorhandler(404)
def resource_not_found(e):
    return jsonify({'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({'message': 'Internal server error'}), 500

# Remember to use @login_required when necessary
if __name__ == '__main__':
    with app.app_context():
        print("trying to create db")
        create_database()

        # Create a test user
        test_username = 'testuser'
        test_password = 'Test1234'  # Choose a secure password

        existing_user = User.query.filter_by(username=test_username).first()
        if not existing_user:
            register_user(test_username, test_password)
            print("Test user created.")
        else:
            print("Test user already exists.")

    app.run(debug=True)
