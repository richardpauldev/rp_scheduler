import React, { useState, useEffect } from "react";
import CalendarComponent from "./CalendarComponent";

function AgentList() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgent, setNewAgent] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    active_status: false,
    weeklyAvailability: {},
    selectedDates: [],
  });

  const [editingAgent, setEditingAgent] = useState(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = () => {
    fetch("/api/agents/get", {
      method: "GET",
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
      .then((data) => {
        setAgents(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching agents:", error);
        setError(error);
        setLoading(false);
      });
  };

  const handleAddAgent = () => {
    setShowAddAgent(true);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setNewAgent({
      ...newAgent,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleEdit = (agentId) => {
    const agentToEdit = agents.find((agent) => agent.agent_id === agentId);
    if (agentToEdit) {
      setNewAgent({
        first_name: agentToEdit.first_name,
        last_name: agentToEdit.last_name,
        email: agentToEdit.email,
        phone_number: agentToEdit.phone_number,
        active_status: agentToEdit.active_status,
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
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((response) => {
        const { weeklyAvailability, specificDates } = response;
        setNewAgent(prevState => ({
          ...prevState,
          weeklyAvailability,
          specificDates
        }));
      })
      .catch((error) => {
        console.error("Error fetching agents:", error);
        setError(error);
        setLoading(false);
      });
  };

  const createAgent = (agentDetails) => {
    return fetch('/api/agents/create', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentDetails),
      credentials: 'include',
    }).then(response => response.json());
  };

  const updateAgentDetails = (agentId, agentDetails) => {
    return fetch(`/api/agents/update/${agentId}`, {
      method: 'PUT',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentDetails),
      credentials: 'include',
    });
  };

  const updateAgentAvailability = (agentId, availability) => {
    return fetch(`/api/agents/availability/update/${agentId}`, {
      method: 'PUT',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(availability),
      credentials: 'include',
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
      specificDates: newAgent.selectedDates,
    };
    
    try {
      let agentId;
      if(editingAgent) {
        await updateAgentDetails(editingAgent.agent_id, agentDetails);
        agentId = editingAgent.agent_id;
      } else {
        const creationResponse = await createAgent(agentDetails);
        agentId  = creationResponse.agent_id;
      }

      await updateAgentAvailability(agentId, availability);

      setShowAddAgent(false);
      setEditingAgent(null);
      setNewAgent({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        active_status: false,
      });
      loadAgents();
    } catch (error) {
      console.error("Error updating/adding agent:", error)
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

  const handleDayToggle = (day) => {
    setNewAgent(prevState => {
      const updatedDates = prevState.selectedDates.includes(day)
        ? prevState.selectedDates.filter(d => d !== day)
        : [...prevState.selectedDates, day];
      return { ...prevState, selectedDates: updatedDates };
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
                Active Status:
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
              <CalendarComponent selectedDates={newAgent.selectedDates} onDayToggle={handleDayToggle} />
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
