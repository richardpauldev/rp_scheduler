import React, { useState, useEffect } from "react";
import '../CalendarComponent.css';

function CalendarComponent({ onDayToggle }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDays, setSelectedDays] = useState({});

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const startDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    useEffect(() => {
        setSelectedDays({});
    }, [currentMonth]);

    const toggleDay = (day) => {
        setSelectedDays(prev => ({
            ...prev,
            [day]: !prev[day]
        }));
        
        const updateSelectedDays = { ...selectedDays, [day]: !selectedDays[day] };
        const selectedDaysArray = Object.keys(updateSelectedDays).filter(d => updateSelectedDays[d]).map(Number);
        onDayToggle(selectedDaysArray);
    }

    const renderDays = () => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(<div key={`header-${i}`} className="calendar-header">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</div>)
        }
        for (let i = 0; i < startDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(
                <div key={i} className={`calendar-day ${selectedDays[i] ? 'selected' : ''}`} onClick={() => toggleDay(i)}>
                    {i}
                </div>
            );
        }
        return days;
    }

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    return (
        <div className="calendar-container">
            <div className="calendar-nav">
                <button onClick={prevMonth}>&lt;</button>
                <span className="calendar-month">
                    {currentMonth.toLocaleString('default', { month: 'long' })} {currentMonth.getFullYear()}
                </span>
                <button onClick={nextMonth}>&gt;</button>
            </div>
            <div className="calendar-grid">
                {renderDays()}
            </div>
        </div>
    );
}

export default CalendarComponent;
