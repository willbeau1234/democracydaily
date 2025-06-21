  // Generate calendar data first
  const calendarData = generateCalendarData();

  // Group days into weeks (starting from Sunday)
  const groupIntoWeeks = () => {
    const weeks: any[][] = [];
    
    if (calendarData.length === 0) return weeks;
    
    const firstDay = calendarData[0];
    const startDayOfWeek = firstDay.date.getDay();
    
    let currentWeek = new Array(startDayOfWeek).fill(null);
    
    calendarData.forEach((day) => {
      currentWeek.push(day);
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    while (currentWeek.length < 7 && currentWeek.length > 0) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  // Create weeks array
  const weeks = groupIntoWeeks();

  // Helper function to get month labels for the calendar
  const getMonthLabels = () => {
    if (calendarData.length === 0) return [];
    
    const monthLabels: { month: string; weekIndex: number }[] = [];
    let currentMonth = -1;
    
    weeks.forEach((week, index) => {
      const firstDayOfWeek = week.find(day => day !== null);
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.date.getMonth();
        if (month !== currentMonth) {
          monthLabels.push({
            month: firstDayOfWeek.date.toLocaleDateString('en-US', { month: 'short' }),
            weekIndex: index
          });
          currentMonth = month;
        }
      }
    });
    
    return monthLabels;
  };

  // Transpose for GitHub-style display
  const transposeForDisplay = () => {
    const result = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const row = [];
      for (let week = 0; week < weeks.length; week++) {
        row.push(weeks[week] ? weeks[week][dayOfWeek] : null);
      }
      result.push(row);
    }
    return result;
  };

  // Create final data
  const monthLabels = getMonthLabels();
  const displayGrid = transposeForDisplay();
