// Calendar data
const gregorianMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const ethiopianMonths = [
    "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
    "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"
];

// Global variables
let isGregorian = true;
let currentViewYear, currentViewMonth, selectedDay, selectedMonth, selectedYear;

// DOM elements
const languageToggle = document.getElementById('languageToggle');
const daySelect = document.getElementById('daySelect');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const dateDisplay = document.getElementById('dateDisplay');
const calendarInfo = document.getElementById('calendarInfo');
const selectedDateInput = document.getElementById('selectedDate');
const selectedDateGCInput = document.getElementById('selectedDateGC');
const selectedDateECInput = document.getElementById('selectedDateEC');
const calendarPreferenceInput = document.getElementById('calendarPreference');

// Navigation elements
const prevYearBtn = document.getElementById('prevYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const nextYearBtn = document.getElementById('nextYear');
const monthYearSpan = document.getElementById('monthYear');
const calendarGrid = document.getElementById('calendarGrid');

// Initialize the plugin
function init() {
    const today = new Date();
    selectedDay = today.getDate();
    selectedMonth = today.getMonth() + 1;
    selectedYear = today.getFullYear();
    currentViewMonth = selectedMonth;
    currentViewYear = selectedYear;
    isGregorian = true;

    calendarPreferenceInput.value = 'gregorian';

    populateDateSelects(true);
    setToday();
    generateCalendar();
    updateDateDisplay();

    // Add event listeners
    languageToggle.addEventListener('change', handleCalendarToggle);
    daySelect.addEventListener('change', handleDateChange);
    monthSelect.addEventListener('change', handleDateChange);
    yearSelect.addEventListener('change', handleDateChange);
    prevYearBtn.addEventListener('click', () => { currentViewYear--; generateCalendar(); });
    nextYearBtn.addEventListener('click', () => { currentViewYear++; generateCalendar(); });
    prevMonthBtn.addEventListener('click', handlePrevMonth);
    nextMonthBtn.addEventListener('click', handleNextMonth);

    // SurveyCTO plugin initialization
    if (typeof SurveyCTO !== 'undefined') {
        SurveyCTO.Designer.registerFieldPlugin(
            'amharic_date_toggle',
            'Amharic Date Toggle - EC/GC Converter',
            function(currentValue) {
                if (currentValue) {
                    try {
                        const data = JSON.parse(currentValue);
                        if (data.date) {
                            const dateParts = data.date.split('/');
                            if (dateParts.length === 3) {
                                selectedYear = parseInt(dateParts[0]);
                                selectedMonth = parseInt(dateParts[1]);
                                selectedDay = parseInt(dateParts[2]);
                                yearSelect.value = selectedYear;
                                monthSelect.value = selectedMonth;
                                daySelect.value = selectedDay;
                            }
                        }
                        if (data.calendar) {
                            isGregorian = data.calendar === 'gregorian';
                            languageToggle.checked = !isGregorian;
                            calendarPreferenceInput.value = data.calendar;
                            populateDateSelects(isGregorian);
                        }
                        if (selectedMonth && selectedYear) {
                            currentViewMonth = selectedMonth;
                            currentViewYear = selectedYear;
                        }
                        generateCalendar();
                        updateDateDisplay();
                    } catch (e) {
                        console.error('Error parsing saved data:', e);
                    }
                }
            },
            function() {
                if (selectedDay && selectedMonth && selectedYear) {
                    const dateString = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
                    const calendar = isGregorian ? 'gregorian' : 'ethiopian';

                    return JSON.stringify({
                        date: dateString,
                        calendar: calendar,
                        display: dateDisplay.textContent,
                        gc_date: selectedDateGCInput.value,
                        ec_date: selectedDateECInput.value
                    });
                }
                return '';
            }
        );
    }
}

// Set today's date in dropdowns
function setToday() {
    daySelect.value = selectedDay;
    monthSelect.value = selectedMonth;
    yearSelect.value = selectedYear;
}

// Populate date dropdowns based on calendar type
function populateDateSelects(isGregorian) {
    // Clear existing options except the first one
    clearSelect(daySelect);
    clearSelect(monthSelect);
    clearSelect(yearSelect);

    if (isGregorian) {
        // Gregorian calendar (GC)
        // Days (1-31)
        for (let i = 1; i <= 31; i++) {
            addOption(daySelect, i, i);
        }

        // Months
        gregorianMonths.forEach((month, index) => {
            addOption(monthSelect, index + 1, month);
        });

        // Years (current year - 100 to current year + 10)
        const currentYear = new Date().getFullYear();
        for (let i = currentYear + 10; i >= currentYear - 100; i--) {
            addOption(yearSelect, i, i);
        }
    } else {
        // Ethiopian calendar (EC)
        // Days (1-30)
        for (let i = 1; i <= 30; i++) {
            addOption(daySelect, i, i);
        }

        // Months (13 months in Ethiopian calendar)
        ethiopianMonths.forEach((month, index) => {
            addOption(monthSelect, index + 1, month);
        });

        // Years (current EC year - 100 to current EC year + 10)
        const currentECYear = getCurrentECYear();
        for (let i = currentECYear + 10; i >= currentECYear - 100; i--) {
            addOption(yearSelect, i, i);
        }
    }
}

// Helper function to clear select options
function clearSelect(selectElement) {
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
}

// Helper function to add option to select
function addOption(selectElement, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    selectElement.appendChild(option);
}

// Generate calendar grid with adjacent months
function generateCalendar() {
    let tableHTML = '<table><tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>';

    // Get first day of month weekday (0=Sun)
    let firstDayWeekday = getFirstDayOfMonth(currentViewYear, currentViewMonth);

    // Days in current month
    let daysInMonth = getDaysInMonth(currentViewYear, currentViewMonth);

    // Days in previous month
    let prevMonthDays = getDaysInPrevMonth(currentViewYear, currentViewMonth);

    // Start day counter for prev month
    let prevDay = prevMonthDays - (firstDayWeekday - 1);

    // Fill the grid
    let dayOfMonth = 1;

    for (let row = 0; row < 6; row++) {
        tableHTML += '<tr>';
        for (let col = 0; col < 7; col++) {
            let cellClass = '';
            let cellText = '';
            let dayNum = 0;
            let cellMonth = currentViewMonth;
            let cellYear = currentViewYear;

            if (col < firstDayWeekday && dayOfMonth === 1) {
                // Prev month days
                cellText = prevDay;
                dayNum = prevDay;
                cellMonth = getPrevMonth(currentViewMonth);
                cellYear = getPrevYear(currentViewYear, currentViewMonth);
                cellClass = 'other-month';
                prevDay++;
            } else if (dayOfMonth <= daysInMonth) {
                // Current month days
                cellText = dayOfMonth;
                dayNum = dayOfMonth;
                cellClass = '';
                dayOfMonth++;
            } else {
                // Next month days
                cellText = dayOfMonth - daysInMonth;
                dayNum = cellText;
                cellMonth = getNextMonth(currentViewMonth);
                cellYear = getNextYear(currentViewYear, currentViewMonth);
                cellClass = 'other-month';
                // IMPORTANT: increment dayOfMonth so subsequent next-month cells keep increasing
                dayOfMonth++;
            }

            const isSelected = selectedDay === dayNum && selectedMonth === cellMonth && selectedYear === cellYear;
            if (isSelected) {
                cellClass += ' selected';
            }

            const onclick = cellClass.includes('other-month') ?
                `navigateAndSelect(${cellYear}, ${cellMonth}, ${dayNum})` :
                `selectDate(${dayNum})`;

            tableHTML += `<td class="${cellClass}" onclick="${onclick}">${cellText}</td>`;
        }
        tableHTML += '</tr>';
    }
    tableHTML += '</table>';

    calendarGrid.innerHTML = tableHTML;

    // Update header
    const monthName = isGregorian ? gregorianMonths[currentViewMonth - 1] : ethiopianMonths[currentViewMonth - 1];
    monthYearSpan.textContent = `${monthName} ${currentViewYear}`;
}

// Get first day of month (0=Sun)
function getFirstDayOfMonth(year, month) {
    if (isGregorian) {
        const date = new Date(year, month - 1, 1);
        return date.getDay();
    } else {
        const gcFirst = convertECtoGC(1, month, year);
        const date = new Date(gcFirst.year, gcFirst.month - 1, gcFirst.day);
        return date.getDay();
    }
}

// Get days in month
function getDaysInMonth(year, month) {
    if (isGregorian) {
        return new Date(year, month, 0).getDate();
    } else {
        if (month < 13) {
            return 30;
        } else {
            return isEthiopianLeapYear(year) ? 6 : 5;
        }
    }
}

// Get days in previous month
function getDaysInPrevMonth(year, month) {
    const prevMonth = getPrevMonth(month);
    const prevYear = getPrevYear(year, month);
    return getDaysInMonth(prevYear, prevMonth);
}

// Get previous month
function getPrevMonth(month) {
    return month === 1 ? 13 : month - 1;
}

// Get previous year
function getPrevYear(year, month) {
    return month === 1 ? year - 1 : year;
}

// Get next month
function getNextMonth(month) {
    return month === 13 ? 1 : month + 1;
}

// Get next year
function getNextYear(year, month) {
    return month === 13 ? year + 1 : year;
}

// Select date in current view
function selectDate(day) {
    selectedDay = day;
    selectedMonth = currentViewMonth;
    selectedYear = currentViewYear;
    setToday();
    generateCalendar();
    updateDateDisplay();
}

// Navigate to another month/year and select date
function navigateAndSelect(year, month, day) {
    currentViewYear = year;
    currentViewMonth = month;
    selectDate(day);
}

// Handle previous month
function handlePrevMonth() {
    if (currentViewMonth === 1) {
        currentViewMonth = 12;
        currentViewYear--;
    } else {
        currentViewMonth--;
    }
    generateCalendar();
}

// Handle next month
function handleNextMonth() {
    if (currentViewMonth === 12) {
        currentViewMonth = 1;
        currentViewYear++;
    } else {
        currentViewMonth++;
    }
    generateCalendar();
}

// Handle calendar toggle
function handleCalendarToggle() {
    if (selectedDay && selectedMonth && selectedYear) {
        let convertedDate;
        if (isGregorian) {
            // Switching to EC, convert GC to EC
            convertedDate = convertGCtoEC(selectedDay, selectedMonth, selectedYear);
        } else {
            // Switching to GC, convert EC to GC
            convertedDate = convertECtoGC(selectedDay, selectedMonth, selectedYear);
        }
        if (convertedDate) {
            selectedDay = convertedDate.day;
            selectedMonth = convertedDate.month;
            selectedYear = convertedDate.year;
        }
    }
    isGregorian = !languageToggle.checked;
    calendarPreferenceInput.value = isGregorian ? 'gregorian' : 'ethiopian';

    populateDateSelects(isGregorian);
    setToday();

    if (selectedMonth && selectedYear) {
        currentViewMonth = selectedMonth;
        currentViewYear = selectedYear;
    }
    generateCalendar();
    updateDateDisplay();
}

// Handle date change from dropdowns
function handleDateChange() {
    selectedDay = parseInt(daySelect.value);
    selectedMonth = parseInt(monthSelect.value);
    selectedYear = parseInt(yearSelect.value);
    if (selectedDay && selectedMonth && selectedYear) {
        currentViewMonth = selectedMonth;
        currentViewYear = selectedYear;
        generateCalendar();
    }
    updateDateDisplay();
}

// Get current Ethiopian calendar year
function getCurrentECYear() {
    const now = new Date();
    const ecDate = convertGCtoEC(now.getDate(), now.getMonth() + 1, now.getFullYear());
    return ecDate.year;
}

// Ethiopian leap year check
function isEthiopianLeapYear(year) {
    return year % 4 === 0;
}

// Convert Gregorian to Ethiopian Calendar
function convertGCtoEC(gcDay, gcMonth, gcYear) {
    let ethiopianStart = new Date(gcYear, 8, 11); // September 11
    let inputDate = new Date(gcYear, gcMonth - 1, gcDay);

    let diffTime = inputDate - ethiopianStart;
    let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return convertGCtoEC(gcDay, gcMonth, gcYear - 1);
    }

    let ecYear = gcYear - 8;
    if (diffDays >= 0) {
        ecYear = gcYear - 7;
    }

    let ecMonth = Math.floor(diffDays / 30) + 1;
    let ecDay = (diffDays % 30) + 1;

    // Handle Pagume rollover
    if (ecMonth === 13) {
        const maxPagume = isEthiopianLeapYear(ecYear) ? 6 : 5;
        if (ecDay > maxPagume) {
            ecDay = 1;
            ecMonth = 1;
            ecYear += 1;
        }
    }

    return {
        day: ecDay,
        month: ecMonth,
        year: ecYear
    };
}

// Convert Ethiopian to Gregorian Calendar
function convertECtoGC(ecDay, ecMonth, ecYear) {
    let totalDays = (ecMonth - 1) * 30 + (ecDay - 1);

    const gcYear = ecYear + 7;
    const ethiopianNewYear = new Date(gcYear, 8, 11); // September 11

    const gcDate = new Date(ethiopianNewYear);
    gcDate.setDate(ethiopianNewYear.getDate() + totalDays);

    return {
        day: gcDate.getDate(),
        month: gcDate.getMonth() + 1,
        year: gcDate.getFullYear()
    };
}

// Update date display based on selected values and calendar
function updateDateDisplay() {
    if (selectedDay && selectedMonth && selectedYear) {
        let displayText;
        let convertedDate;
        let infoText;

        if (isGregorian) {
            // Display Gregorian date and convert to Ethiopian
            const gcDate = `${gregorianMonths[selectedMonth - 1]} ${selectedDay}, ${selectedYear}`;
            convertedDate = convertGCtoEC(selectedDay, selectedMonth, selectedYear);

            if (convertedDate) {
                const ecDate = `${convertedDate.day} ${ethiopianMonths[convertedDate.month - 1]} ${convertedDate.year}`;
                displayText = gcDate;
                infoText = `Ethiopian: ${ecDate}`;

                // Store both dates
                selectedDateGCInput.value = gcDate;
                selectedDateECInput.value = ecDate;
            }
        } else {
            // Display Ethiopian date and convert to Gregorian
            const ecDate = `${selectedDay} ${ethiopianMonths[selectedMonth - 1]} ${selectedYear}`;
            convertedDate = convertECtoGC(selectedDay, selectedMonth, selectedYear);

            if (convertedDate) {
                const gcDate = `${gregorianMonths[convertedDate.month - 1]} ${convertedDate.day}, ${convertedDate.year}`;
                displayText = ecDate;
                infoText = `Gregorian: ${gcDate}`;

                // Store both dates
                selectedDateGCInput.value = gcDate;
                selectedDateECInput.value = ecDate;
            }
        }

        dateDisplay.textContent = displayText;
        calendarInfo.textContent = infoText;

        // Store date in ISO format for SurveyCTO
        const isoDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
        selectedDateInput.value = isoDate;
    } else {
        dateDisplay.textContent = 'Select a date';
        calendarInfo.textContent = 'Select a date to see conversion';
        selectedDateInput.value = '';
        selectedDateGCInput.value = '';
        selectedDateECInput.value = '';
    }
}

// Initialize the plugin when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
