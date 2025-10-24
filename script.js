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

// Constants
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
                            const dateParts = data.date.split('-');
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
    if (selectedYear) yearSelect.value = selectedYear;
    if (selectedMonth) monthSelect.value = selectedMonth;
    if (selectedDay) daySelect.value = selectedDay;
}

// Populate date dropdowns based on calendar type
function populateDateSelects(isGregorian) {
    clearSelect(daySelect);
    clearSelect(monthSelect);
    clearSelect(yearSelect);

    if (isGregorian) {
        // Gregorian calendar
        for (let i = 1; i <= 31; i++) addOption(daySelect, i, i);

        gregorianMonths.forEach((month, index) => {
            addOption(monthSelect, index + 1, month);
        });

        const currentYear = new Date().getFullYear();
        for (let i = currentYear + 10; i >= currentYear - 100; i--) {
            addOption(yearSelect, i, i);
        }

        // restore previously selected values if present
        if (selectedYear) yearSelect.value = selectedYear;
        if (selectedMonth) monthSelect.value = selectedMonth;
        if (selectedDay) daySelect.value = selectedDay;
    } else {
        // Ethiopian calendar - populate months & years first, then days (so day-count logic can use selected month/year)
        ethiopianMonths.forEach((month, index) => {
            addOption(monthSelect, index + 1, month);
        });

        const currentECYear = getCurrentECYear();
        for (let i = currentECYear + 10; i >= currentECYear - 100; i--) {
            addOption(yearSelect, i, i);
        }

        // decide which year/month to use to build day list:
        const selYear = selectedYear || currentECYear;
        const selMonth = selectedMonth || 1;

        // set selects so updateEthiopianDayDropdown can reference them if needed
        yearSelect.value = selYear;
        monthSelect.value = selMonth;

        // populate days for the selected year/month and try to preserve selectedDay
        updateEthiopianDayDropdown(selYear, selMonth, selectedDay);

        // ensure selects reflect preserved values
        if (selectedYear) yearSelect.value = selectedYear;
        if (selectedMonth) monthSelect.value = selectedMonth;
    }
}

// Update Ethiopian day dropdown based on month selection
// optional preselect arg to try to keep a previously selected day
function updateEthiopianDayDropdown(year, month, preselectDay) {
    clearSelect(daySelect);

    let maxDays;
    if (month < 13) {
        maxDays = 30;
    } else {
        maxDays = isEthiopianLeapYear(year) ? 6 : 5;
    }

    for (let i = 1; i <= maxDays; i++) {
        addOption(daySelect, i, i);
    }

    // try to preselect a day (from passed value or global selectedDay) if it fits the month
    const tryDay = (typeof preselectDay === 'number' && !isNaN(preselectDay)) ? preselectDay : selectedDay;
    if (tryDay && tryDay <= maxDays) {
        daySelect.value = tryDay;
    } else {
        // if global selectedDay exceeds page, clamp it
        if (selectedDay && selectedDay > maxDays) {
            selectedDay = maxDays;
            daySelect.value = maxDays;
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
    if (isGregorian) {
        generateGregorianCalendar();
    } else {
        generateEthiopianCalendar();
    }
}

// Generate Gregorian calendar
function generateGregorianCalendar() {
    let tableHTML = '<table><tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>';

    const firstDay = new Date(currentViewYear, currentViewMonth - 1, 1);
    const firstDayWeekday = firstDay.getDay();
    const daysInMonth = getDaysInMonth(currentViewYear, currentViewMonth);
    const prevMonthDays = getDaysInPrevMonth(currentViewYear, currentViewMonth);

    let prevDay = prevMonthDays - firstDayWeekday + 1;
    let dayOfMonth = 1;
    let nextMonthDay = 1;

    for (let row = 0; row < 6; row++) {
        tableHTML += '<tr>';
        for (let col = 0; col < 7; col++) {
            let cellClass = '';
            let cellText = '';
            let dayNum = 0;
            let cellMonth = currentViewMonth;
            let cellYear = currentViewYear;

            if (row === 0 && col < firstDayWeekday) {
                // Previous month days
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
                cellText = nextMonthDay;
                dayNum = nextMonthDay;
                cellMonth = getNextMonth(currentViewMonth);
                cellYear = getNextYear(currentViewYear, currentViewMonth);
                cellClass = 'other-month';
                nextMonthDay++;
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
        
        // Stop if we've displayed all days and we're not in the first rows
        if (dayOfMonth > daysInMonth && nextMonthDay > 7 && row >= 3) {
            break;
        }
    }
    tableHTML += '</table>';

    calendarGrid.innerHTML = tableHTML;
    const monthName = gregorianMonths[currentViewMonth - 1];
    monthYearSpan.textContent = `${monthName} ${currentViewYear}`;
}

// Generate Ethiopian calendar
function generateEthiopianCalendar() {
    let tableHTML = '<table><tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>';

    // For Ethiopian calendar, we need to convert to Gregorian to get the weekday
    const firstDayGC = ethiopianToGregorian(1, currentViewMonth, currentViewYear);
    const firstDay = new Date(firstDayGC.year, firstDayGC.month - 1, firstDayGC.day);
    const firstDayWeekday = firstDay.getDay();
    
    const daysInMonth = getDaysInMonth(currentViewYear, currentViewMonth);
    const prevMonthDays = getDaysInPrevMonth(currentViewYear, currentViewMonth);

    let prevDay = prevMonthDays - firstDayWeekday + 1;
    let dayOfMonth = 1;
    let nextMonthDay = 1;

    for (let row = 0; row < 6; row++) {
        tableHTML += '<tr>';
        for (let col = 0; col < 7; col++) {
            let cellClass = '';
            let cellText = '';
            let dayNum = 0;
            let cellMonth = currentViewMonth;
            let cellYear = currentViewYear;

            if (row === 0 && col < firstDayWeekday) {
                // Previous month days
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
                cellText = nextMonthDay;
                dayNum = nextMonthDay;
                cellMonth = getNextMonth(currentViewMonth);
                cellYear = getNextYear(currentViewYear, currentViewMonth);
                cellClass = 'other-month';
                nextMonthDay++;
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
        
        if (dayOfMonth > daysInMonth && nextMonthDay > 7 && row >= 3) {
            break;
        }
    }
    tableHTML += '</table>';

    calendarGrid.innerHTML = tableHTML;
    const monthName = ethiopianMonths[currentViewMonth - 1];
    monthYearSpan.textContent = `${monthName} ${currentViewYear}`;
}

// Calendar utility functions
function getDaysInMonth(year, month) {
    if (isGregorian) {
        return new Date(year, month, 0).getDate();
    } else {
        return month < 13 ? 30 : (isEthiopianLeapYear(year) ? 6 : 5);
    }
}

function getDaysInPrevMonth(year, month) {
    const prevMonth = getPrevMonth(month);
    const prevYear = getPrevYear(year, month);
    return getDaysInMonth(prevYear, prevMonth);
}

function getPrevMonth(month) {
    if (isGregorian) {
        return month === 1 ? 12 : month - 1;
    } else {
        return month === 1 ? 13 : month - 1;
    }
}

function getPrevYear(year, month) {
    if (isGregorian) {
        return month === 1 ? year - 1 : year;
    } else {
        return month === 1 ? year - 1 : year;
    }
}

function getNextMonth(month) {
    if (isGregorian) {
        return month === 12 ? 1 : month + 1;
    } else {
        return month === 13 ? 1 : month + 1;
    }
}

function getNextYear(year, month) {
    if (isGregorian) {
        return month === 12 ? year + 1 : year;
    } else {
        return month === 13 ? year + 1 : year;
    }
}

// Date selection functions
function selectDate(day) {
    selectedDay = day;
    selectedMonth = currentViewMonth;
    selectedYear = currentViewYear;
    setToday();
    generateCalendar();
    updateDateDisplay();
}

function navigateAndSelect(year, month, day) {
    currentViewYear = year;
    currentViewMonth = month;
    selectDate(day);
}

// Navigation handlers
function handlePrevMonth() {
    currentViewMonth = getPrevMonth(currentViewMonth);
    if (currentViewMonth === (isGregorian ? 12 : 13)) {
        currentViewYear = getPrevYear(currentViewYear, currentViewMonth);
    }
    generateCalendar();
}

function handleNextMonth() {
    currentViewMonth = getNextMonth(currentViewMonth);
    if (currentViewMonth === 1) {
        currentViewYear = getNextYear(currentViewYear, currentViewMonth);
    }
    generateCalendar();
}

// Calendar toggle handler
function handleCalendarToggle() {
    const prevIsGregorian = isGregorian;
    isGregorian = !languageToggle.checked;
    
    if (selectedDay && selectedMonth && selectedYear) {
        let convertedDate;
        if (prevIsGregorian && !isGregorian) {
            // GC -> EC
            convertedDate = convertGCtoEC(selectedDay, selectedMonth, selectedYear);
        } else if (!prevIsGregorian && isGregorian) {
            // EC -> GC
            convertedDate = convertECtoGC(selectedDay, selectedMonth, selectedYear);
        }
        
        if (convertedDate) {
            selectedDay = convertedDate.day;
            selectedMonth = convertedDate.month;
            selectedYear = convertedDate.year;
            
            // Special handling for Pagume when switching to GC
            if (isGregorian && selectedMonth === 13) {
                // Convert Pagume to equivalent Gregorian date
                const gcDate = convertECtoGC(selectedDay, selectedMonth, selectedYear);
                selectedDay = gcDate.day;
                selectedMonth = gcDate.month;
                selectedYear = gcDate.year;
            }
        }
    }

    calendarPreferenceInput.value = isGregorian ? 'gregorian' : 'ethiopian';
    populateDateSelects(isGregorian);
    
    // Update current view to match selected date
    if (selectedMonth && selectedYear) {
        currentViewMonth = selectedMonth;
        currentViewYear = selectedYear;
    } else {
        // Set default view based on current calendar
        if (isGregorian) {
            const today = new Date();
            currentViewMonth = today.getMonth() + 1;
            currentViewYear = today.getFullYear();
        } else {
            const ecToday = getCurrentECDate();
            currentViewMonth = ecToday.month;
            currentViewYear = ecToday.year;
        }
    }
    
    setToday();
    generateCalendar();
    updateDateDisplay();
}

// Handle date change from dropdowns
function handleDateChange() {
    selectedDay = parseInt(daySelect.value);
    selectedMonth = parseInt(monthSelect.value);
    selectedYear = parseInt(yearSelect.value);
    
    if (selectedDay && selectedMonth && selectedYear) {
        // Update day dropdown for Ethiopian calendar (especially for Pagume)
        if (!isGregorian) {
            updateEthiopianDayDropdown(selectedYear, selectedMonth);
            // Ensure selected day is valid for the month
            const maxDays = getDaysInMonth(selectedYear, selectedMonth);
            if (selectedDay > maxDays) {
                selectedDay = maxDays;
                daySelect.value = selectedDay;
            }
        }
        
        currentViewMonth = selectedMonth;
        currentViewYear = selectedYear;
        generateCalendar();
    }
    updateDateDisplay();
}

// Ethiopian calendar functions
function getCurrentECYear() {
    const now = new Date();
    const ec = convertGCtoEC(now.getDate(), now.getMonth() + 1, now.getFullYear());
    return ec.year;
}

function getCurrentECDate() {
    const now = new Date();
    return convertGCtoEC(now.getDate(), now.getMonth() + 1, now.getFullYear());
}

function isEthiopianLeapYear(year) {
    return (year % 4) === 3;
}

function isGregorianLeap(year) {
    return (year % 4 === 0) && (year % 100 !== 0 || year % 400 === 0);
}

// Robust conversion functions
function ethiopianToGregorian(ecDay, ecMonth, ecYear) {
    const gYear = ecYear + 7;
    const startDay = isGregorianLeap(gYear + 1) ? 12 : 11;
    const startUtc = Date.UTC(gYear, 8, startDay);
    const daysOffset = (ecMonth - 1) * 30 + (ecDay - 1);
    const targetUtc = startUtc + daysOffset * MS_PER_DAY;
    const d = new Date(targetUtc);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function gregorianToEthiopian(gcDay, gcMonth, gcYear) {
    const dateUtc = Date.UTC(gcYear, gcMonth - 1, gcDay);
    let eYear = gcYear - 7;
    
    function startOfEthiopianYearUtc(year) {
        const gYear = year + 7;
        const startDay = isGregorianLeap(gYear + 1) ? 12 : 11;
        return Date.UTC(gYear, 8, startDay);
    }
    
    let start = startOfEthiopianYearUtc(eYear);
    if (dateUtc < start) {
        eYear -= 1;
        start = startOfEthiopianYearUtc(eYear);
    }
    
    const daysFromStart = Math.floor((dateUtc - start) / MS_PER_DAY);
    const monthIdx0 = Math.floor(daysFromStart / 30);
    const day = (daysFromStart % 30) + 1;
    const month = monthIdx0 + 1;
    
    return { year: eYear, month: month, day: day };
}

// Keep old function names for compatibility
function convertECtoGC(ecDay, ecMonth, ecYear) {
    return ethiopianToGregorian(ecDay, ecMonth, ecYear);
}

function convertGCtoEC(gcDay, gcMonth, gcYear) {
    return gregorianToEthiopian(gcDay, gcMonth, gcYear);
}

// Update display function
function updateDateDisplay() {
    if (selectedDay && selectedMonth && selectedYear) {
        let gc, ec;
        if (isGregorian) {
            gc = { year: selectedYear, month: selectedMonth, day: selectedDay };
            ec = convertGCtoEC(gc.day, gc.month, gc.year);
        } else {
            ec = { year: selectedYear, month: selectedMonth, day: selectedDay };
            gc = convertECtoGC(ec.day, ec.month, ec.year);
        }

        const gcDisplay = `${gregorianMonths[gc.month - 1]} ${gc.day}, ${gc.year}`;
        const ecDisplay = `${ec.day} ${ethiopianMonths[ec.month - 1]} ${ec.year}`;

        if (isGregorian) {
            dateDisplay.textContent = gcDisplay;
            calendarInfo.textContent = `Ethiopian: ${ecDisplay}`;
        } else {
            dateDisplay.textContent = ecDisplay;
            calendarInfo.textContent = `Gregorian: ${gcDisplay}`;
        }

        selectedDateGCInput.value = gcDisplay;
        selectedDateECInput.value = ecDisplay;
        selectedDateInput.value = `${gc.year}-${String(gc.month).padStart(2,'0')}-${String(gc.day).padStart(2,'0')}`;
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
