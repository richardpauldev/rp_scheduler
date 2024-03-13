import "./App.css";
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Login from "./components/Login";
import NotFound from "./components/NotFound";
import AgentList from "./components/AgentList";
import ScheduleViewer from "./components/ScheduleViewer";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
  }, []);

  const handleLogin = (status) => {
    setIsLoggedIn(status);
    localStorage.setItem("isLoggedIn", status.toString());
  };

  return (
    <Router>
      <div>
        <header>
          <div className="container">
            <h1>Scheduling App</h1>
            {isLoggedIn && (
              <nav>
                <ul>
                  <li>
                    <Link to="/">Home</Link>
                  </li>
                  <li>
                    <Link to="/agents">Agents</Link>
                  </li>
                  <li>
                    <Link to="/schedules">Schedules</Link>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </header>
        <div className="container main">
          <Routes>
            <Route path="/" element={<Login onLogin={handleLogin}/>} />
            <Route path="/agents" element={<AgentList />} />
            <Route path="/schedules" element={<ScheduleViewer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        
        <footer>
          <div className="container">
            <p>&copy; 2024 Scheduling App. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
