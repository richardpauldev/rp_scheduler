import React, { useState, useEffect } from "react";
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
    active_status: false,
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

  // Effect hook to load agents on component mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Function to fetch agent list from API
  const loadAgents = () => {
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
  };

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
      specificDates: newAgent.exceptionDays,
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
      active_status: false,
    }); // Reset the form fields
  };

  const handleDelete = (agentId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this agent?"
    );
    if (confirmDelete) {
      fetch(`/api/agents/delete/${agentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(() => {
          // Filter out the deleted agent from the agents list
          const updatedAgents = agents.filter(
            (agent) => agent.agent_id !== agentId
          );
          setAgents(updatedAgents);
        })
        .catch((error) => {
          console.error("Error deleting agent:", error);
        });
    }
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

  const handleBlacklistSelect = (selectedAgent) => {
    setBlacklist((prevBlacklist) => [...prevBlacklist, selectedAgent]);
  };

  const handleBlacklistRemove = (agentId) => {
    setBlacklist((prevBlacklist) => prevBlacklist.filter(agent => agent.agent_id !== agentId));
  };

  const handleDayToggle = (selectedDays, selectedWeekdays) => {
    setNewAgent((prevState) => {
      //TODO
      return { ...prevState, exceptionDays: [] };
    });
  };

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
              <input
                type="text"
                name="first_name"
                placeholder="First Name"
                onChange={handleFormChange}
                value={newAgent.first_name}
                required
              />
              <input
                type="text"
                name="last_name"
                placeholder="Last Name"
                onChange={handleFormChange}
                value={newAgent.last_name}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                onChange={handleFormChange}
                value={newAgent.email}
                required
              />
              <input
                type="text"
                name="phone_number"
                placeholder="Phone Number"
                onChange={handleFormChange}
                value={newAgent.phone_number}
              />
              <label>
                Currently Active:
                <input
                  type="checkbox"
                  name="active_status"
                  checked={newAgent.active_status}
                  onChange={handleFormChange}
                />
              </label>
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
              <div>
                <CalendarComponent
                  exceptionDays={newAgent.exceptionDays}
                  onDayToggle={handleDayToggle}
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Search Agents"
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                />
                {searchResults.map((agent) => (
                  <div key={agent.agent_id}>
                    <button onClick={() => handleBlacklistSelect(agent)}>
                      Add to Blacklist
                    </button>
                    {agent.first_name} {agent.last_name}
                  </div>
                ))}
              </div>
              <div>
                <h3>Blacklisted Agents:</h3>
                {blacklist.map((agent) => (
                  <div key={agent.agent_id}>
                    <button onClick={() => handleBlacklistRemove(agent.agent_id)}>
                      Remove
                    </button>
                    {agent.first_name} {agent.last_name}
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Phone Number</th>
            <th>Active Status</th>
            <th>Update</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.agent_id}>
              <td>{agent.first_name}</td>
              <td>{agent.last_name}</td>
              <td>{agent.email}</td>
              <td>{agent.phone_number}</td>
              <td>{agent.active_status ? "Active" : "Inactive"}</td>
              <td>
                <button onClick={() => handleEdit(agent.agent_id)}>
                  Update
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AgentList;
