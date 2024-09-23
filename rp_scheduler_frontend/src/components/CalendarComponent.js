import React, { useState, useEffect } from "react";
import "../CalendarComponent.css";

function CalendarComponent({ agentId, onDayToggle }) {
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
        [monthKey]: monthData,
      };
    });
  };

  const toggleWeekday = (weekday) => {
    setSelectedWeekdays((prev) => {
      const newWeekdays = new Set(prev);
      if (newWeekdays.has(weekday)) {
        newWeekdays.delete(weekday);
      } else {
        newWeekdays.add(weekday);
      }
      return newWeekdays;
    });
  };

  const isDaySelected = (day) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );

    if (exceptedDays[monthKey]?.has(day)) {
      return !selectedWeekdays.has(date.getDay());
    }
    return selectedWeekdays.has(date.getDay());
  };

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div
          key={`header-${i}`}
          className={`calendar-header ${
            selectedWeekdays.has(i) ? "selected" : ""
          }`}
          onClick={() => toggleWeekday(i)}
        >
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
          className={`calendar-day ${isDaySelected(i) ? "selected" : ""} ${
            disableTransition ? "no-transition" : ""
          }`}
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
    onDayToggle(exceptedDays, selectedWeekdays);
  }, [exceptedDays, selectedWeekdays]);

  // When AgentID changes
  useEffect(() => {
    const fetchAgentAvailability = async (agentId) => {
      try {
        const response = await fetch(`/api/agents/${agentId}/availability`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        const data = await response.json();

        console.log("data", data);
        const initWeekdays =
          data.weeklyAvailability && data.weeklyAvailability.weekdays
            ? new Set(
                data.weeklyAvailability.weekdays.map((day) => parseInt(day, 10))
              )
            : new Set();
        setSelectedWeekdays(initWeekdays);

        const initExceptedDays = data.specificDates
          ? Object.keys(data.specificDates).reduce((acc, monthKey) => {
              acc[monthKey] = new Set(data.specificDates[monthKey]);
              return acc;
            }, {})
          : {};
        console.log("got excepted", data.intialExceptedDays)
        console.log("init Excepted", initExceptedDays);
        setExceptedDays(initExceptedDays);
      } catch (error) {
        console.error("Failed to fetch availability:", error);
      }
    };

    if (agentId >= 0) {
      fetchAgentAvailability(agentId);
    } else {
      setSelectedWeekdays(new Set([1,2,3,4,5]));
    }
  }, [agentId]);

  return (
    <div className="calendar-container">
      <div className="calendar-nav">
        <button type="button" onClick={prevMonth}>
          &lt;
        </button>
        <span className="calendar-month">
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
          {currentMonth.getFullYear()}
        </span>
        <button type="button" onClick={nextMonth}>
          &gt;
        </button>
      </div>
      <div className="calendar-grid">{renderDays()}</div>
    </div>
  );
}

export default CalendarComponent;
