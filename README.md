# Google Keep Clone

A fully functional Google Keep clone built with JavaScript, HTML, and CSS. This application replicates the core features of Google Keep, including note management, reminders, archiving, and more.

### Features

### Core Functionality
- **Add Notes**: Create new notes with title and text
- **Edit Notes**: Click on any note to edit its content
- **Delete Notes**: Move notes to trash (soft delete)
- **View All Notes**: Browse all active notes in the main view

### Note Management
- **Archive/Unarchive**: Archive notes to keep them organized without deleting
- **Trash/Restore**: Delete notes to trash and restore them if needed
- **Permanent Delete**: Permanently delete notes from trash
- **Pin Notes**: Pin important notes to the top of the list

### Visual Customization
- **Color Picker**: Change note background colors from a palette of options
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### Advanced Features
- **Search**: Search through notes by title or content
- **Reminders**: Set date/time reminders for notes with:
  - Quick options (Later today, Tomorrow, Next week)
  - Custom date and time picker
  - Reminders view in sidebar showing all notes with reminders
 
- **Undo/Redo**: Full undo/redo functionality for all note operations
  

- **Timestamps**: Display real dates and times (Today, Yesterday, This year, Previous years)

### Sidebar Navigation
- **Notes**: View all active notes
- **Reminders**: View all notes with reminders
- **Archive**: View archived notes
- **Trash**: View deleted notes

## 🛠️ Technologies Used

- **HTML5**: Structure and semantic markup
- **CSS3**: Styling with CSS variables for theming
- **JavaScript (ES6+)**: 
  - Classes and object-oriented programming
  - Local Storage API for data persistence
  - Event delegation for dynamic elements
  - Date manipulation and formatting

### External Libraries
- **Material Icons**: Google Material Icons for UI elements
- **CUID**: For generating unique note IDs

##  File Structure

```
google-keep-clone/
├── index.html      # Main HTML structure
├── style.css       # All styling and theming
├── app.js          # Application logic and functionality
└── README.md       # This file
```

## 🚦 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools or dependencies required!

### Installation

1. Clone or download this repository
2. Open `index.html` in your web browser
3. That's it! Start creating notes

### Usage

1. **Creating a Note**:
   - Click on "Take a note..." in the main form
   - Enter a title (optional) and text
   - Click "Close" or press Enter to save

2. **Editing a Note**:
   - Click on any note to open it in the modal
   - Make your changes
   - Click "Close" to save

3. **Archiving a Note**:
   - Hover over a note and click the archive icon
   - View archived notes in the sidebar

4. **Deleting a Note**:
   - Hover over a note and click the delete icon
   - View deleted notes in the Trash section
   - Permanently delete from Trash view

5. **Setting Reminders**:
   - Click the reminder icon on any note
   - Choose a quick option or select "Pick date & time" for custom
   - View all reminders in the Reminders sidebar section


6. **Pinning Notes**:
   - Click the pin icon to pin/unpin notes
   - Pinned notes appear at the top

7. **Searching**:
   - Use the search bar in the navigation
   - Search by title or content

8. **Dark Mode**:
   - Click the dark mode toggle in the settings area
   - Preference is saved automatically


##  Features in Detail

### Undo/Redo System
- Tracks all note operations (add, edit, delete, archive, color change, pin, reminder, etc.)


### Reminder System
- ISO date/time storage for timezone handling
- Smart date formatting (Today, Tomorrow, or full date)
- Overdue reminders are visually distinguished
- Custom date/time picker with validation
- Reminders view sorted by date (soonest first)

### Timestamp Display
- Context-aware formatting:
  - "Today" for today's notes
  - "Yesterday" for yesterday's notes
  - Date format for this year's notes
  - Full date with year for older notes
- Real-time updates

### Dark Mode
- CSS variable-based theming
- Smooth transitions


## Notes

- This project was built as a learning exercise and portfolio piece
- The timestamp feature was developed from scratch without the use of AI tools
- The undo/redo feature was developed using Cursor AI coding assistant
- The reminders feature was developed using Cursor AI coding assistant
- The dark mode feature was developed using Cursor AI coding assistant

## License

This project is open source and available for educational purposes.

##  Development

This project uses vanilla JavaScript with no build process. Simply edit the files and refresh your browser to see changes.

### Code Style
- JavaScript features
- Object-oriented design with classes
- Event delegation for dynamic elements
- CSS variables for theming
- Semantic HTML5

---


