import React, { useState, useEffect, useCallback } from "react";
import CalendarComponent from "./CalendarComponent";

function AgentList() {
  // State hooks for managing agents, loading status, errors, and modal visibility
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddAgent, setShowAddAgent] = useState(false);

  const [blacklist, setBlacklist] = useState([]);

  // State for managing agent search
  const [agentSearch, setAgentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // State for managing new and editing agent details
  const [newAgent, setNewAgent] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    active_status: true,
    weeklyAvailability: {},
    exceptionDays: [],
  });
  const [editingAgent, setEditingAgent] = useState(null);

  const handleResponse = (response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  const handleError = (error) => {
    console.error("Error:", error);
    setError(error);
    setLoading(false);
  };

  // Function to fetch agent list from API
  const loadAgents = useCallback(() => {
    fetch("/api/agents/get", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then(handleResponse)
      .then((data) => {
        setAgents(data);
        setLoading(false);
      })
      .catch(handleError);
  }, []);

    // Effect hook to load agents on component mount
    useEffect(() => {
      loadAgents();
    }, [loadAgents]);

  const handleAddAgent = () => {
    setShowAddAgent(true);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setNewAgent((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (agentId) => {
    const agentToEdit = agents.find((agent) => agent.agent_id === agentId);
    if (agentToEdit) {
      // Prepare Agent for editing
      setEditingAgent(agentToEdit);
      setNewAgent({
        ...agentToEdit,
        weeklyAvailability: {},
        exceptionDays: [],
      });
      fetchAgentAvailability(agentId);
      fetchBlacklistForAgent(agentId);
      setShowAddAgent(true); // Reuse the same form for editing
    }
  };

  const fetchAgentAvailability = (agentId) => {
    fetch(`/api/agents/${agentId}/availability`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then(handleResponse)
      .then((response) => {
        const { weeklyAvailability, specificDates } = response;
        setNewAgent((prevState) => ({
          ...prevState,
          weeklyAvailability,
          specificDates,
        }));
      })
      .catch(handleError);
  };

  const createAgent = (agentDetails) => {
    return fetch("/api/agents/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentDetails),
      credentials: "include",
    }).then((response) => response.json());
  };

  const updateAgentDetails = (agentId, agentDetails) => {
    return fetch(`/api/agents/update/${agentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentDetails),
      credentials: "include",
    });
  };

  const updateAgentAvailability = (agentId, availability) => {
    return fetch(`/api/agents/availability/update/${agentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(availability),
      credentials: "include",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const agentDetails = {
      first_name: newAgent.first_name,
      last_name: newAgent.last_name,
      email: newAgent.email,
      phone_number: newAgent.phone_number,
      active_status: newAgent.active_status,
    };

    const availability = {
      weeklyAvailability: newAgent.weeklyAvailability,
      specificDates: Object.fromEntries( //Because, for some god forsaken reason, JSON doesn't do sets
        Object.entries(newAgent.exceptionDays).map(([yearMonth, days]) => [yearMonth,  Array.from(days)])
      ),
    };

    try {
      let agentId;
      if (editingAgent) {
        await updateAgentDetails(editingAgent.agent_id, agentDetails);
        agentId = editingAgent.agent_id;
      } else {
        const creationResponse = await createAgent(agentDetails);
        agentId = creationResponse.agent_id;
      }

      await updateAgentAvailability(agentId, availability);
      await updateBlacklist(agentId);

      closeModal();
      loadAgents();
    } catch (error) {
      console.error("Error updating/adding agent:", error);
    }
  };

  const closeModal = () => {
    setShowAddAgent(false);
    setEditingAgent(null);
    setNewAgent({
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      active_status: true,
    }); // Reset the form fields
    setAgentSearch('');
    setBlacklist([]);
  };

  useEffect(() => {
    // Fetch agents for the blacklist dropdown based on the search query
    if (agentSearch.length > 0) {
      fetch(`/api/agents/get?search=${encodeURIComponent(agentSearch)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      .then(handleResponse)
      .then((data) => {
        const currentAgentId = editingAgent ? editingAgent.agent_id : null;
        const filteredAgents = data.filter(agent =>
          !blacklist.some(blacklistedAgent => blacklistedAgent.agent_id === agent.agent_id) && 
          agent.agent_id !== currentAgentId
        );
        setSearchResults(filteredAgents)})
      .catch(handleError);
    }
  }, [agentSearch, blacklist, editingAgent]);

// Some blacklist and delete methods...

  const handleDayToggle = useCallback((selectedDays, selectedWeekdays) => {
    const weekdaysArray = Array.from(selectedWeekdays);

    setNewAgent((prevState) => ({
      ...prevState,
      exceptionDays: selectedDays,
      weeklyAvailability: { weekdays: weekdaysArray },
    }));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Agents</h1>
      <button onClick={handleAddAgent}>Add Agent</button>
      {showAddAgent && (
        <div className="modal" style={{ display: "block" }}>
          <div className="modal-content">
            <span className="close-button" onClick={closeModal}>
              &times;
            </span>
            <h2>{editingAgent ? "Update Agent" : "Add Agent"}</h2>
            <form onSubmit={handleSubmit}>
              <div>
                {blacklist.map((agent) => (
                  <div key={agent.agent_id}>
                    <button type="button" onClick={() => handleBlacklistRemove(agent.agent_id)}>
                      Remove
                    </button>
                    {agent.first_name} {agent.last_name}
                  </div>
                ))}
              </div>
              <div>
                <CalendarComponent
                  weeklyAvailability={newAgent.weeklyAvailability}
                  exceptionDays={newAgent.exceptionDays}
                  onDayToggle={handleDayToggle}
                />
              </div>
              <button type="submit">
                {editingAgent ? "Update" : "Create"} Agent
              </button>
              {editingAgent && (
                <button
                  type="button"
                  onClick={() => handleDelete(editingAgent.agent_id)}
                >
                  Delete Agent
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentList;

// CalendarCompenent.js:

import React, { useState, useEffect } from "react";
import "../CalendarComponent.css";

function CalendarComponent({ weeklyAvailability, exceptedDays: intialExceptedDays, onDayToggle }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [exceptedDays, setExceptedDays] = useState({});
  const [selectedWeekdays, setSelectedWeekdays] = useState(new Set());
  const [disableTransition, setDisableTransition] = useState(false);

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const startDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;

  const toggleDay = (day) => {
    setExceptedDays((prev) => {
      const monthData = new Set(prev[monthKey]);
      if (monthData.has(day)) {
        monthData.delete(day);
      } else {
        monthData.add(day);
      }
      return {
        ...prev,
        [monthKey]: monthData
      };
    });
    onDayToggle(exceptedDays, selectedWeekdays);
  };

  const toggleWeekday = (weekday) => {
    setSelectedWeekdays(prev => {
      const newWeekdays = new Set(prev);
      if (newWeekdays.has(weekday)) {
        newWeekdays.delete(weekday);
      } else {
        newWeekdays.add(weekday);
      }
      return newWeekdays;
    });
    onDayToggle(exceptedDays, selectedWeekdays);
  }

  const isDaySelected = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (exceptedDays[monthKey]?.has(day)) {
      return !selectedWeekdays.has(date.getDay());
    }
    return selectedWeekdays.has(date.getDay());
  }

  const renderDays = () => {
    const days = [];
    console.log("render ", selectedWeekdays)
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={`header-${i}`} className={`calendar-header ${selectedWeekdays.has(i) ? "selected" : ""}`} onClick={() => toggleWeekday(i)}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}
        </div>
      );
    }
    for (let i = 0; i < startDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(
        <div
          key={i}
          className={`calendar-day ${isDaySelected(i) ? "selected" : ""} ${disableTransition ? "no-transition" : ""}`}
          onClick={() => toggleDay(i)}
        >
          {i}
        </div>
      );
    }
    return days;
  };

  const nextMonth = (event) => {
    setDisableTransition(true);
    event.stopPropagation();
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );

    setTimeout(() => {
      setDisableTransition(false);
    }, 50);
  };

  const prevMonth = (event) => {
    setDisableTransition(true);
    event.stopPropagation();
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );

    setTimeout(() => {
      setDisableTransition(false);
    }, 50);
  };

  useEffect(() => {
    const initWeekdays = weeklyAvailability && weeklyAvailability.weekdays
    ? new Set(weeklyAvailability.weekdays.map(day => parseInt(day, 10)))
    : new Set();
    setSelectedWeekdays(initWeekdays);
    console.log("got", weeklyAvailability)
    console.log("setting", selectedWeekdays)
  
    const initExceptedDays = intialExceptedDays ? Object.keys(intialExceptedDays).reduce((acc, monthKey) => {
      acc[monthKey] = new Set(intialExceptedDays[monthKey]);
      return acc;
    }, {}) : {};
    setExceptedDays(initExceptedDays);
   // onDayToggle(exceptedDays, selectedWeekdays);
  }, []);

  return (
    <div className="calendar-container">
      <div className="calendar-nav">
        <button type="button" onClick={prevMonth}>&lt;</button>
        <span className="calendar-month">
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
          {currentMonth.getFullYear()}
        </span>
        <button type="button" onClick={nextMonth}>&gt;</button>
      </div>
      <div className="calendar-grid">{renderDays()}</div>
    </div>
  );
}

export default CalendarComponent;
