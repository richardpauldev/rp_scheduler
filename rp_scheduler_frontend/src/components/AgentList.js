import React, { useState, useEffect } from 'react';

function AgentList() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/agents/get', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
        })
        .then(response => {
            if(!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            setAgents(data);
            setLoading(false);
        })
        .catch(error => {
            console.error('Error fetching agents:', error);
            setError(error);
            setLoading(false);
        });
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>

    return (
        <div>
            <h1>Agents</h1>
            <ul>
                {agents.map(agent => (
                    <li key={agent.agent_id}>
                        {agent.first_name} {agent.last_name} - {agent.email}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default AgentList;