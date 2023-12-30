from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://rp_scheduler_user:FL6#$YuB$!i5@^md3G@localhost/rp_scheduler_db'
db = SQLAlchemy(app)

@app.route('/')
def home():
    return "Hello, Flask!"

if __name__ == '__main__':
    app.run(debug=True)