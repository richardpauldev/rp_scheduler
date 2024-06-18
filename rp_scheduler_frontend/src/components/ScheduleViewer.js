import React, { useState, useEffect } from "react";

function ScheduleViewer() {
  const [schedule, setSchedule] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(getMonday(new Date()));
  const [editedSchedule, setEditedSchedule] = useState({ details: [], unpaired: [] });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Fetch schedules from the backend
    fetchSchedule();
  }, [currentWeek]);

  const fetchSchedule = async () => {
    const formattedDate = currentWeek.toISOString().split("T")[0];

    try {
      const response = await fetch(`/api/schedule/get?date=${formattedDate}`);
      if(!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}. You may need to login again.`);
      }
      const data = await response.json();
      setSchedule(data);
      setEditedSchedule({ details: data.details, unpaired: data.unpaired });
    } catch (error) {
      console.error("Error fetching schedule: ", error);
    }
  };

  const handleWeekChange = (direction) => {
    setCurrentWeek((prev) => {
      const newWeek = new Date(prev);
      newWeek.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
      return getMonday(newWeek);
    });
  };

  const regenerateSchedule = async () => {
    const formattedDate = currentWeek.toISOString().split("T")[0];
    try {
      const response = await fetch(
        `api/schedule/generate?date=${formattedDate}`,
        { method: "POST" }
      );
      if (!response.ok) {
        throw new Error("Error regenerating schedule");
      }
      fetchSchedule();
    } catch (error) {
      console.error("Error regenerating schedule:", error);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDragStart = (event, agent, pairIndex, agentIndex, isUnpaired = false) => {
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({ agent, pairIndex, agentIndex, isUnpaired })
    );
  };

  // const handleDrop = (event, targetPairIndex, targetAgentIndex) => {
  //   event.preventDefault();

  //   const draggedData = JSON.parse(event.dataTransfer.getData("application/json"));
  //   const { agent: draggedAgent, pairIndex: sourcePairIndex, agentIndex: sourceAgentIndex, isUnpaired } = draggedData;
  //   if (isUnpaired) {
  //     console.log("Dragged Data:", draggedData);
  //     setEditedSchedule((prevSchedule) => {
  //       const newDetails = [...prevSchedule.details];
  //       const newUnpaired = [...prevSchedule.unpaired];

  //       const currentAgentInTarget = newDetails[targetPairIndex][`agent${targetAgentIndex + 1}_name`];

  //       console.log("Current Agent in Target:", currentAgentInTarget);

  //       if (isUnpaired) {
  //           if (currentAgentInTarget === draggedAgent) {
  //               console.log("Agent already in target, no changes made.");
  //               return prevSchedule;
  //           }

  //           newDetails[targetPairIndex][`agent${targetAgentIndex + 1}_name`] = draggedAgent;

  //           // Remove draggedAgent from unpaired list
  //           const updatedUnpaired = newUnpaired.filter(agent => agent.agent_name !== draggedAgent);

  //           // If there was an agent in the target position, add it to the unpaired list
  //           if (currentAgentInTarget && currentAgentInTarget !== draggedAgent) {
  //               updatedUnpaired.push({ agent_name: currentAgentInTarget });
  //           }

  //           console.log("Updated Schedule Details:", newDetails);
  //           console.log("Updated Unpaired List:", updatedUnpaired);


  //           return {
  //               ...prevSchedule,
  //               details: newDetails,
  //               unpaired: updatedUnpaired,
  //           };
  //       }

  //       // If dragging between paired agents or other logic (not provided in original code)
  //       // Handle here accordingly

  //       return prevSchedule;
  //     });

    
  //   } else if (sourcePairIndex !== targetPairIndex || sourceAgentIndex !== targetAgentIndex) {
  //     setEditedSchedule((prevSchedule) => {
  //       console.log("paired edit")
  //       const newDetails = [...prevSchedule.details];
  //       const targetAgent = newDetails[targetPairIndex][`agent${targetAgentIndex + 1}_name`];

  //       if (targetAgent !== draggedAgent) {
  //         newDetails[targetPairIndex][`agent${targetAgentIndex + 1}_name`] = draggedAgent;
  //         if (targetAgent) {
  //           newDetails[sourcePairIndex][`agent${sourceAgentIndex + 1}_name`] = targetAgent;
  //         } else {
  //           newDetails[sourcePairIndex][`agent${sourceAgentIndex + 1}_name`] = "";
  //         }
  //       }

  //       return { ...prevSchedule, details: newDetails };
  //     });
  //   }
  // };

  const handleDrop = (event, targetPairIndex, targetAgentIndex) => {
    event.preventDefault();
    const draggedData = JSON.parse(event.dataTransfer.getData("application/json"));
    const { agent: draggedAgent, pairIndex: sourcePairIndex, agentIndex: sourceAgentIndex, isUnpaired } = draggedData;

    setEditedSchedule((prevSchedule) => {
      const newDetails = [...prevSchedule.details];
      const newUnpaired = [...prevSchedule.unpaired];

      const currentAgentInTarget = newDetails[targetPairIndex][`agent${targetAgentIndex + 1}_name`];

      if (isUnpaired) {
        if (currentAgentInTarget === draggedAgent) {
          return prevSchedule;
        }

        newDetails[targetPairIndex][`agent${targetAgentIndex + 1}_name`] = draggedAgent;
        const updatedUnpaired = newUnpaired.filter(agent => agent.agent_name !== draggedAgent);

        if (currentAgentInTarget && currentAgentInTarget !== draggedAgent) {
          updatedUnpaired.push({ agent_name: currentAgentInTarget });
        }

        return {
          ...prevSchedule,
          details: newDetails,
          unpaired: updatedUnpaired,
        };
      } else if (sourcePairIndex !== targetPairIndex || sourceAgentIndex !== targetAgentIndex) {
        const targetAgent = newDetails[targetPairIndex][`agent${targetAgentIndex + 1}_name`];

        if (targetAgent !== draggedAgent) {
          newDetails[targetPairIndex][`agent${targetAgentIndex + 1}_name`] = draggedAgent;
          if (targetAgent) {
            newDetails[sourcePairIndex][`agent${sourceAgentIndex + 1}_name`] = targetAgent;
          } else {
            newDetails[sourcePairIndex][`agent${sourceAgentIndex + 1}_name`] = "";
          }
        }

        return { ...prevSchedule, details: newDetails };
      }

      return prevSchedule;
    });
  };

  // const [renderCounter, setRenderCounter] = useState(0);

  // useEffect(() => {
  //     console.log("Rendered with renderCounter:", renderCounter);
  // }, [renderCounter]);

  // // Force re-render
  // const forceRender = () => {
  //     setRenderCounter((prev) => prev + 1);
  // };

  const handleDropToUnpaired = (event) => {
    event.preventDefault();
    const draggedData = JSON.parse(event.dataTransfer.getData("application/json"));
    const { agent: draggedAgent, pairIndex: sourcePairIndex, agentIndex: sourceAgentIndex, isUnpaired } = draggedData;

    setEditedSchedule((prevSchedule) => {
      const newUnpaired = [...prevSchedule.unpaired];
      const isAlreadyUnpaired = newUnpaired.some(agent => agent.agent_name === draggedAgent);

      if (isUnpaired || isAlreadyUnpaired) {
        return prevSchedule;
      }

      const newDetails = [...prevSchedule.details];
      newDetails[sourcePairIndex][`agent${sourceAgentIndex + 1}_name`] = "";

      newUnpaired.push({ agent_name: draggedAgent });

      return { ...prevSchedule, details: newDetails, unpaired: newUnpaired };
    });
  };
  

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const renderAgent = (agent, pairIndex, agentIndex, isUnpaired = false) => {
    if (isEditing) {
      if(isUnpaired) {
        console.log("Rendering: ", agent)
      }
      return (
        <div
          draggable
          onDragStart={(event) => handleDragStart(event, agent, pairIndex, agentIndex, isUnpaired)}
          onDrop={(event) => isUnpaired ? handleDropToUnpaired(event) : handleDrop(event, pairIndex, agentIndex)}
          onDragOver={handleDragOver}
          className="draggable agent-cell"
        >
          {agent || <span className="empty-agent">Empty</span>}
        </div>
      );
    }
    return <div className="agent-cell">{agent}</div>;
  };

  const saveSchedule = async () => {
    const formattedDate = currentWeek.toISOString().split("T")[0];
    try {
      const response = await fetch(`/api/schedule/set`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: formattedDate,
          details: editedSchedule.details,
          unpaired: editedSchedule.unpaired
        })
      });
      if (!response.ok) {
        throw new Error("Error saving schedule");
      }
      setIsEditing(false);
      fetchSchedule();
    } catch (error) {
      console.error("Error saving schedule:", error);
    }
  };

  function getMonday(d) {
    d = new Date(d);
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setHours(0, 0, 0, 0);
    return new Date(d.setDate(diff));
  }

  const addEmptyRow = () => {
    console.log("empty log");
    setEditedSchedule((prevSchedule) => ({
      
      ...prevSchedule,
      details: [
        ...prevSchedule.details,
        { agent1_name: "", agent2_name: "" },
      ],
    }));
  };

  useEffect(() => {
      console.log("Edited Schedule updated:", editedSchedule);
  }, [editedSchedule]);


  return (
    <div className={isEditing ? "edit-mode" : ""}>
      <h1>Schedule for Week of {formatDate(currentWeek)}</h1>
      <button onClick={() => handleWeekChange("prev")}>
        &lt; Previous Week
      </button>
      <button onClick={() => handleWeekChange("next")}>Next Week &gt;</button>
      <button onClick={regenerateSchedule}>Regenerate Schedule</button>
      {isEditing ? (
        <>
          <button onClick={saveSchedule}>Save Schedule</button>
          <button onClick={addEmptyRow}>Add Empty Row</button>
        </>
      ) : (
        <button onClick={() => setIsEditing(true)}>Edit Schedule</button>
      )}
      {schedule ? (
        <div>
          <h2>Schedule Details</h2>
          <table>
            <thead>
              <tr>
                <th>Agent 1</th>
                <th>Agent 2</th>
              </tr>
            </thead>
            <tbody>
              {editedSchedule.details.map((meeting, pairIndex) => (
                <tr key={pairIndex}>
                  <td>{renderAgent(meeting.agent1_name, pairIndex, 0)}</td>
                  <td>{renderAgent(meeting.agent2_name, pairIndex, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {editedSchedule.unpaired && editedSchedule.unpaired.length > 0 && (
            <div>
              <h3>Unpaired Agents</h3>
              <ul
                // onDrop={handleDropToUnpaired}
                // onDragOver={handleDragOver}
                className="unpaired-list"
              >
                {editedSchedule.unpaired.map((agent, index) => (
                  <li key={agent.agent_name} className="unpaired-item">
                    {renderAgent(agent.agent_name, null, index, true)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p>Loading schedule. If this doesn't load, you may need to login again. </p>
      )}
    </div>
  );
}

export default ScheduleViewer;
