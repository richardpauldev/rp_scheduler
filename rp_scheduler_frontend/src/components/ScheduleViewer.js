import React, { useState, useEffect } from "react";

function ScheduleViewer() {
  const [schedule, setSchedule] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(getMonday(new Date()));

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
    const formattedDate = currentWeek.toISOString().split('T')[0];
    try {
      const response = await fetch(`api/schedule/generate?date=${formattedDate}`, {method: 'POST'});
      if (!response.ok) {
        throw new Error('Error regenerating schedule');
      }
      fetchSchedule();
    } catch (error) {
      console.error('Error regenerating schedule:', error)
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
      {
        schedule ? (
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
                {schedule.details.map((meeting, index) =>
                (
                  <tr key={index}>
                    <td>{meeting.agent1_id}</td>
                    <td>{meeting.agent2_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Loading schedule...</p>
        )
      }
    </div>
  );
}

export default ScheduleViewer;
