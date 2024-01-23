import "./App.css";
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Login from "./components/Login";
import NotFound from "./components/NotFound";
import Dashboard from "./components/Dashboard";
import AgentList from "./components/AgentList";

function App() {
  return (
    <Router>
      <div>
        <header>
          <div className="container">
            <h1>Scheduling App</h1>
            <nav>
              <ul>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/dashboard">Dashboard</Link>
                </li>
                <li>
                  <Link to="/agents">Agents</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <div className="container main">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agents" element={<AgentList />} />
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
