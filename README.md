# Ethiopian Date Picker SurveyCTO Field Plug-in

A high-quality field plug-in for SurveyCTO that provides an intuitive date picker supporting both Gregorian (GC) and Ethiopian (EC) calendars with automatic conversion between them.

## Features

- **Dual Calendar Support**: Toggle between Gregorian and Ethiopian calendars
- **Interactive Calendar Grid**: Visual calendar for easy date selection
- **Dropdown Selectors**: Month, day, and year dropdowns for precise input
- **Automatic Conversion**: Seamless conversion between GC and EC dates
- **Responsive Design**: Works on various screen sizes including mobile devices
- **Accessibility**: Keyboard navigation and screen reader support
- **SurveyCTO Integration**: Full integration with SurveyCTO's field plug-in system

## Installation

1. Download the plug-in files:
   - `template.html`
   - `style.css`
   - `script.js`
   - `manifest.json`

2. Upload the files to your SurveyCTO server or include them in your form's media files.

3. In your SurveyCTO form, add a text field and set its appearance to use this plug-in.

## Usage

1. The plug-in defaults to Gregorian calendar.
2. Use the toggle switch to switch between Gregorian (GC) and Ethiopian (EC) calendars.
3. Select dates using the dropdown selectors or by clicking on the calendar grid.
4. The selected date is automatically converted and displayed in both calendars.
5. Data is stored in JSON format including both calendar representations.

## Data Storage

The plug-in stores data in the following JSON format:

```json
{
    "date": "2024-01-15",
    "calendar": "gregorian",
    "display": "January 15, 2024",
    "gc_date": "January 15, 2024",
    "ec_date": "5 ጥር 2016"
}
```

## Supported Field Types

- `text`

## Requirements

- SurveyCTO platform
- Modern web browser with JavaScript enabled

## Customization

The plug-in can be customized by modifying the CSS in `style.css` to match your survey's theme.

## License

This plug-in is provided as-is for use with SurveyCTO.

## Author

Dagem Feleke
