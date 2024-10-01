Agent Pairing Scheduler for Nancy Peterson RP Group (J Barrett and Company)

Introduction

    This is a full-stack React - Flask - MySQL developed by me for the Nancy Peterson Roleplay group. 
    It is built to allow any user to view, modify, and add new agents in the system. These agents are then 
    automatically paired with other agents to form a 'schedule'. Pairings are constructed so that no agents
    that have been paired together during the last 6 months are paired again, and ensuring agents share at
    least one day where they are both available.

Features

    Deck COnfiguration Reading: Parses a JSON file to obtain deck information.
    Image Downloading: Automatically downloads card images from specified URLs.
    PDF Generation: Arranges images in a grid layout and generates a PDF file.
    Customizable Layour: Supports adjustments in margins, card sizes, and page layout.

Requirements

  - **Python 3.x**: [Install Python](https://www.python.org/downloads/)
  - **Node.js & npm**: [Install Node.js](https://nodejs.org/en/download/)
  - **MySQL**: [Install MySQL](https://dev.mysql.com/downloads/installer/)
  - **Git**: [Install Git](https://git-scm.com/)

Installation

  1. Clone the Repository

    git clone https://github.com/richardpauldev/rp_scheduler.git
    cd rp_scheduler
    

  2. Backend Setup

    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt

  Create a mysql database to manage:
  
    CREATE DATABASE your_database_name;
    
  Create a .env with the following contents
  
    FLASK_APP=app
    FLASK_ENV=development
    SECRET_KEY=your_secret_key
    DATABASE_URL=mysql+pymysql://username:password@localhost/your_database_name

  Start the Flask backend
  
    flask run

  3. Frontend Setup

    cd rp_scheduler_frontend
    npm install
    npm start

  The frontend will now be available at port 3000, with the backend on port 5000. 


For more information or queries, please contact me at:

    Email: richardpauldev@gmail.com
    LinkedIn: Richard Paul
