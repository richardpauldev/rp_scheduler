import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

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
      const data = await response.json();
      setSchedule(data);
      setEditedSchedule({ details: data.details, unpaired: data.unpaired });
    } catch (error) {
      console.error("Error fetching schedule:", error);
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
        `/api/schedule/generate?date=${formattedDate}`,
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

  const handleDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const { source, destination } = result;

    if (source.droppableId === destination.droppableId) {
      const items = reorder(
        source.droppableId === "details" ? editedSchedule.details : editedSchedule.unpaired,
        source.index,
        destination.index
      );

      if (source.droppableId === "details") {
        setEditedSchedule({ ...editedSchedule, details: items });
      } else {
        setEditedSchedule({ ...editedSchedule, unpaired: items });
      }
    } else {
      const result = move(
        source.droppableId === "details" ? editedSchedule.details : editedSchedule.unpaired,
        destination.droppableId === "details" ? editedSchedule.details : editedSchedule.unpaired,
        source,
        destination
      );

      setEditedSchedule({ details: result.details, unpaired: result.unpaired });
    }
  };

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  };

  const move = (source, destination, droppableSource, droppableDestination) => {
    const sourceClone = Array.from(source);
    const destClone = Array.from(destination);
    const [removed] = sourceClone.splice(droppableSource.index, 1);

    destClone.splice(droppableDestination.index, 0, removed);

    const result = {};
    result[droppableSource.droppableId] = sourceClone;
    result[droppableDestination.droppableId] = destClone;

    return result;
  }

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
    var day = d.getDay(),
      diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  return (
    <div>
      <h1>Schedule for Week of {formatDate(currentWeek)}</h1>
      <button onClick={() => handleWeekChange("prev")}>
        &lt; Previous Week
      </button>
      <button onClick={() => handleWeekChange("next")}>Next Week &gt;</button>
      <button onClick={regenerateSchedule}>Regenerate Schedule</button>
      {isEditing ? (
        <button onClick={saveSchedule}>Save Schedule</button>
      ) : (
        <button onClick={() => setIsEditing(true)}>Edit Schedule</button>
      )}
      {schedule ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div>
            <h2>Schedule Details</h2>
            <Droppable droppableId="details">
              {(provided) => (
                <table {...provided.droppableProps} ref={provided.innerRef}>
                  <thead>
                    <tr>
                      <th>Agent 1</th>
                      <th>Agent 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedSchedule.details.map((meeting, index) => (
                      <React.Fragment key={`details=${index}`}>
                        <Draggable key={`details-agent1-${index}`} draggableId={`details-agent1-${index}`} index={index}>
                          {(provided) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <td>{meeting.agent1_name}</td>
                            </tr>
                          )}
                        </Draggable>
                        <Draggable key={`details-agent2-${index}`} draggableId={`details-agent2-${index}`} index={index}>
                          {(provided) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <td>{meeting.agent2_name}</td>
                            </tr>
                          )}
                        </Draggable>
                      </React.Fragment>
                    ))}
                    {provided.placeholder}
                  </tbody>
              </table>
              )}
            </Droppable>
            {editedSchedule.unpaired && editedSchedule.unpaired.length > 0 && (
              <Droppable droppableId="unpaired">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    <h3>Unpaired Agents</h3>
                    <ul>
                      {editedSchedule.unpaired.map((agent, index) => (
                        <Draggable key={`unpaired-${index}`} draggableId={`unpaired-${index}`} index={index}>
                          {(provided) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              {agent.agent_name}
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  </div>
                )}
              </Droppable>
            )}
          </div>
        </DragDropContext>
      ) : (
        <p>Loading schedule...</p>
      )}
    </div>
  );
}

export default ScheduleViewer;
