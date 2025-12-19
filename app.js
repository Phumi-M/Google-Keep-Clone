class Note {
  constructor(id, title, text, status = 'active', color = '#ffffff', isPinned = false, reminder = null) {
    this.id = id;
    this.title = title;
    this.text = text;
    this.status = status; 
    this.color = color; 
    this.isPinned = isPinned;
    this.reminder = reminder;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
}

class App {
  constructor() {

    this.notes = JSON.parse(localStorage.getItem("notes")) || [];
    
    this.notes = this.notes.map(note => {
      if (!note.status) note.status = 'active';
      if (!note.color) note.color = '#ffffff';
      if (note.isPinned === undefined) note.isPinned = false;
      if (note.reminder === undefined) note.reminder = null;
      if (!note.createdAt) note.createdAt = new Date().toISOString();
      if (!note.updatedAt) note.updatedAt = new Date().toISOString();
      return note;
    });
    this.selectedNoteId = "";
    this.miniSidebar = true;
    this.currentView = 'notes'; // 'notes', 'archive', 'trash'
    this.searchQuery = '';
    this.showReminderPicker = false;
    this.reminderPickerNoteId = null;
    this.showCustomReminderPicker = false;

    // Undo/Redo history
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 50;
    this.isUndoRedoOperation = false; // Flag to prevent saving state during undo/redo

    this.$activeForm = document.querySelector(".active-form");
    this.$inactiveForm = document.querySelector(".inactive-form");
    this.$noteTitle = document.querySelector("#note-title");
    this.$noteText = document.querySelector("#note-text");
    this.$notes = document.querySelector(".notes");
    this.$form = document.querySelector("#form");
    this.$modal = document.querySelector(".modal");
    this.$modalForm = document.querySelector("#modal-form");
    this.$modalTitle = document.querySelector("#modal-title");
    this.$modalText = document.querySelector("#modal-text");
    this.$closeModalForm = document.querySelector("#modal-btn");
    this.$sidebar = document.querySelector(".sidebar");
    this.$sidebarActiveItem = document.querySelector(".active-item");
    this.$searchInput = document.querySelector(".search-area input");
    this.$darkModeToggle = document.querySelector(".dark-mode-toggle");

    // Initialize dark mode from localStorage
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    this.applyDarkMode();

    this.addEventListeners();
    // Initialize with current state (don't save on initial load)
    if (this.history.length === 0) {
      const initialState = JSON.parse(JSON.stringify(this.notes));
      this.history.push(initialState);
      this.historyIndex = 0;
    }
    this.displayNotes();
    this.updateUndoRedoButtons();
  }

  addEventListeners() {
    document.body.addEventListener("click", (event) => {
      // Close reminder picker when clicking outside
      if (!event.target.closest(".reminder-picker") && !event.target.closest(".reminder-button")) {
        if (this.showReminderPicker) {
          this.showReminderPicker = false;
          this.reminderPickerNoteId = null;
          this.showCustomReminderPicker = false;
          this.render();
          return;
        }
      }

      // Handle button actions first (before modal opens)
      if (this.handleArchiving(event) || 
          this.handleDeleting(event) || 
          this.handleRestore(event) || 
          this.handleUnarchive(event) ||
          this.handlePinNote(event) ||
          this.handleReminder(event)) {
        return; // Stop processing if a button was clicked
      }
      
      // Then handle other interactions
      this.handleFormClick(event);
      this.closeModal(event);
      this.openModal(event);
    });

    this.$form.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = this.$noteTitle.value;
      const text = this.$noteText.value;
      this.addNote({ title, text });
      this.closeActiveForm();
    });

    this.$modalForm.addEventListener("submit", (event) => {
      event.preventDefault();
    });

    this.$sidebar.addEventListener("mouseover", (event) => {
      this.handleToggleSidebar();
    });
    this.$sidebar.addEventListener("mouseout", (event) => {
      this.handleToggleSidebar();
    });

    this.$sidebar.addEventListener("click", (event) => {
      this.handleSidebarClick(event);
    });

    // Search functionality
    this.$searchInput.addEventListener("input", (event) => {
      this.searchQuery = event.target.value.toLowerCase().trim();
      this.displayNotes();
    });

    // Dark mode toggle()
    if (this.$darkModeToggle) {
      this.$darkModeToggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.toggleDarkMode();
      });
    }

    // Undo/Redo buttons
    document.querySelectorAll('.undo-btn').forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.undo();
      });
    });

    document.querySelectorAll('.redo-btn').forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.redo();
      });
    });

    // Keyboard shortcuts for undo/redo
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
      } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        this.redo();
      }
    });

    // Close color picker when clicking outside (handled in main click handler)
  }

  handleFormClick(event) {
    const isActiveFormClickedOn = this.$activeForm.contains(event.target);
    const isInactiveFormClickedOn = this.$inactiveForm.contains(event.target);
    const title = this.$noteTitle.value;
    const text = this.$noteText.value;

    if (isInactiveFormClickedOn) {
      this.openActiveForm();
    } else if (!isInactiveFormClickedOn && !isActiveFormClickedOn) {
      this.addNote({ title, text });
      this.closeActiveForm();
    }
  }

  openActiveForm() {
    this.$inactiveForm.style.display = "none";
    this.$activeForm.style.display = "block";
    this.$noteText.focus();
  }
  closeActiveForm() {
    this.$inactiveForm.style.display = "block";
    this.$activeForm.style.display = "none";
    this.$noteText.value = "";
    this.$noteTitle.value = "";
  }

  openModal(event) {
    // Don't open modal if clicking on action buttons
    if (event.target.closest(".archive") || 
        event.target.closest(".delete-note") ||
        event.target.closest(".restore-note") ||
        event.target.closest(".unarchive-note") ||
        event.target.closest(".reminder-button") ||
        event.target.closest(".reminder-picker") ||
        event.target.closest(".note-footer")) {
      return;
    }
    
    const $selectedNote = event.target.closest(".note");
    if ($selectedNote) {
      this.selectedNoteId = $selectedNote.id;
      this.$modalTitle.value = $selectedNote.children[1].innerHTML;
      this.$modalText.value = $selectedNote.children[2].innerHTML;
      this.$modal.classList.add("open-modal");
    }
  }
  closeModal(event) {
    const isModalFormClickedOn = this.$modalForm.contains(event.target);
    const isCloseModalBtnClickedOn = this.$closeModalForm.contains(
      event.target
    );
    if (
      (!isModalFormClickedOn || isCloseModalBtnClickedOn) &&
      this.$modal.classList.contains("open-modal")
    ) {
      this.editNote(this.selectedNoteId, {
        title: this.$modalTitle.value,
        text: this.$modalText.value
      });
      this.$modal.classList.remove("open-modal");
    }
  }

  handleArchiving(event) {
    // Check if click is on archive button or its children
    const $archiveButton = event.target.closest(".archive");
    if ($archiveButton) {
      event.preventDefault();
      event.stopPropagation();
      const $selectedNote = $archiveButton.closest(".note");
      if ($selectedNote) {
        this.selectedNoteId = $selectedNote.id;
        this.archiveNote(this.selectedNoteId);
        return true;
      }
    }
    return false;
  }

  handleDeleting(event) {
    // Check if click is on delete button or its children
    const $deleteButton = event.target.closest(".delete-note");
    if ($deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      const $selectedNote = $deleteButton.closest(".note");
      if ($selectedNote) {
        this.selectedNoteId = $selectedNote.id;
        if (this.currentView === 'trash') {
          // Permanently delete from trash
          this.permanentlyDeleteNote(this.selectedNoteId);
        } else {
          // Move to trash
          this.deleteNote(this.selectedNoteId);
        }
        return true;
      }
    }
    return false;
  }

  handleRestore(event) {
    // Check if click is on restore button or its children
    const $restoreButton = event.target.closest(".restore-note");
    if ($restoreButton) {
      event.preventDefault();
      event.stopPropagation();
      const $selectedNote = $restoreButton.closest(".note");
      if ($selectedNote) {
        this.selectedNoteId = $selectedNote.id;
        this.restoreNote(this.selectedNoteId);
        return true;
      }
    }
    return false;
  }

  handleUnarchive(event) {
    // Check if click is on unarchive button or its children
    const $unarchiveButton = event.target.closest(".unarchive-note");
    if ($unarchiveButton) {
      event.preventDefault();
      event.stopPropagation();
      const $selectedNote = $unarchiveButton.closest(".note");
      if ($selectedNote) {
        this.selectedNoteId = $selectedNote.id;
        this.unarchiveNote(this.selectedNoteId);
        return true;
      }
    }
    return false;
  }

  addNote({ title, text }) {
    if (text != "" || title != "") {
      this.saveState();
      const newNote = new Note(cuid(), title, text);
      this.notes = [...this.notes, newNote];
      this.render();
    }
  }

  editNote(id, { title, text }) {
   
    const note = this.notes.find(n => n.id === id);
    if (note && (note.title !== title || note.text !== text)) {
      this.saveState();
      this.notes = this.notes.map((note) => {
        if (note.id == id) {
          note.title = title;
          note.text = text;
          note.updatedAt = new Date().toISOString();
        }
        return note;
      });
      this.render();
    }
  }

  archiveNote(id) {
    this.saveState();
    this.notes = this.notes.map((note) => {
      if (note.id == id) {
        note.status = 'archived';
      }
      return note;
    });
    this.render();
  }

  deleteNote(id) {
    this.saveState();
    this.notes = this.notes.map((note) => {
      if (note.id == id) {
        note.status = 'deleted';
      }
      return note;
    });
    this.render();
  }

  restoreNote(id) {
    this.saveState();
    this.notes = this.notes.map((note) => {
      if (note.id == id) {
        note.status = 'active';
      }
      return note;
    });
    this.render();
  }

  unarchiveNote(id) {
    this.saveState();
    this.notes = this.notes.map((note) => {
      if (note.id == id) {
        note.status = 'active';
      }
      return note;
    });
    this.render();
  }

  permanentlyDeleteNote(id) {
    this.saveState();
    this.notes = this.notes.filter((note) => note.id != id);
    this.render();
  }

  togglePinNote(id) {
    this.saveState();
    this.notes = this.notes.map((note) => {
      if (note.id == id) {
        note.isPinned = !note.isPinned;
        note.updatedAt = new Date().toISOString();
      }
      return note;
    });
    this.render();
  }

  handlePinNote(event) {
    const $pinButton = event.target.closest(".pin-note");
    if ($pinButton) {
      event.preventDefault();
      event.stopPropagation();
      const $selectedNote = $pinButton.closest(".note");
      if ($selectedNote) {
        this.togglePinNote($selectedNote.id);
        return true;
      }
    }
    return false;
  }

  // ============================================
  // Reminders Functionality
  // This feature was developed using Cursor AI coding assistant
  // Provides reminder date/time picker and reminders view in sidebar
  // ============================================
  handleReminder(event) {
    const $reminderButton = event.target.closest(".reminder-button");
    if ($reminderButton) {
      event.preventDefault();
      event.stopPropagation();
      const $selectedNote = $reminderButton.closest(".note");
      if ($selectedNote) {
        this.reminderPickerNoteId = $selectedNote.id;
        this.showReminderPicker = !this.showReminderPicker;
        this.showCustomReminderPicker = false;
        this.render();
        return true;
      }
    }
    
    // Handle reminder date/time selection
    const $reminderOption = event.target.closest(".reminder-option");
    if ($reminderOption && this.reminderPickerNoteId) {
      event.preventDefault();
      event.stopPropagation();
      const action = $reminderOption.dataset.action;
      
      if (action === 'custom') {
        // Show custom date/time picker
        this.showCustomReminderPicker = true;
        this.render();
        return true;
      } else if (action === 'remove') {
        this.removeReminder(this.reminderPickerNoteId);
        this.showReminderPicker = false;
        this.showCustomReminderPicker = false;
        this.reminderPickerNoteId = null;
        return true;
      } else {
       
        const reminderDate = this.getReminderDate(action);
        this.setReminder(this.reminderPickerNoteId, reminderDate);
        this.showReminderPicker = false;
        this.showCustomReminderPicker = false;
        this.reminderPickerNoteId = null;
        return true;
      }
    }

    // Handle custom date/time picker save
    const $saveCustomReminder = event.target.closest(".save-custom-reminder");
    if ($saveCustomReminder && this.reminderPickerNoteId) {
      event.preventDefault();
      event.stopPropagation();
      const dateInput = document.getElementById("custom-reminder-date");
      const timeInput = document.getElementById("custom-reminder-time");
      
      if (dateInput && dateInput.value) {
        // Combine date and time properly
        const dateStr = dateInput.value;
        const timeStr = timeInput && timeInput.value ? timeInput.value : '09:00';
        const [hours, minutes] = timeStr.split(':');
        
        // Create date in local timezone, then convert to ISO
        const date = new Date(dateStr);
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          this.setReminder(this.reminderPickerNoteId, date.toISOString());
          this.showReminderPicker = false;
          this.showCustomReminderPicker = false;
          this.reminderPickerNoteId = null;
          return true;
        }
      }
    }
    
    return false;
  }

  getReminderDate(action) {
    const now = new Date();
    const date = new Date();
    
    switch(action) {
      case 'later-today':
        date.setHours(now.getHours() + 1, 0, 0, 0);
        break;
      case 'tomorrow':
        date.setDate(now.getDate() + 1);
        date.setHours(9, 0, 0, 0);
        break;
      case 'next-week':
        date.setDate(now.getDate() + 7);
        date.setHours(9, 0, 0, 0);
        break;
      default:
        date.setHours(now.getHours() + 1, 0, 0, 0);
    }
    
    return date.toISOString();
  }

  setReminder(id, reminderDate) {
    this.saveState();
    this.notes = this.notes.map((note) => {
      if (note.id == id) {
        note.reminder = reminderDate;
        note.updatedAt = new Date().toISOString();
      }
      return note;
    });
    this.render();
  }

  removeReminder(id) {
    this.saveState();
    this.notes = this.notes.map((note) => {
      if (note.id == id) {
        note.reminder = null;
        note.updatedAt = new Date().toISOString();
      }
      return note;
    });
    this.render();
  }

  handleMouseOverNote(element) {
    const $note = document.querySelector("#" + element.id);
    const $checkNote = $note.querySelector(".check-circle");
    const $noteFooter = $note.querySelector(".note-footer");
    $checkNote.style.visibility = "visible";
    $noteFooter.style.visibility = "visible";
  }
  handleMouseOutNote(element) {
    const $note = document.querySelector("#" + element.id);
    const $checkNote = $note.querySelector(".check-circle");
    const $noteFooter = $note.querySelector(".note-footer");
    $checkNote.style.visibility = "hidden";
    $noteFooter.style.visibility = "hidden";
  }

  handleToggleSidebar() {
    if (this.miniSidebar) {
      this.$sidebar.style.width = "250px";
      this.$sidebar.classList.add("sidebar-hover");
      this.$sidebarActiveItem.classList.add("sidebar-active-item");
      this.miniSidebar = false;
    } else {
      this.$sidebar.style.width = "80px";
      this.$sidebar.classList.remove("sidebar-hover");
      this.$sidebarActiveItem.classList.remove("sidebar-active-item");
      this.miniSidebar = true;
    }
  }

  handleSidebarClick(event) {
    const $sidebarItem = event.target.closest(".sidebar-item");
    if ($sidebarItem) {
      event.stopPropagation();
      const sidebarText = $sidebarItem.querySelector(".sidebar-text");
      if (sidebarText) {
        const view = sidebarText.textContent.trim().toLowerCase();
        
       
        document.querySelectorAll(".sidebar-item").forEach(item => {
          item.classList.remove("active-item");
          const icon = item.querySelector(".material-icons-outlined");
          if (icon) {
            icon.classList.remove("active");
          }
        });

        // Add active class to clicked item
        $sidebarItem.classList.add("active-item");
        const clickedIcon = $sidebarItem.querySelector(".material-icons-outlined");
        if (clickedIcon) {
          clickedIcon.classList.add("active");
        }
        this.$sidebarActiveItem = $sidebarItem;

        // Set current view based on sidebar item
        if (view === "notes") {
          this.currentView = 'notes';
        } else if (view === "reminders") {
          this.currentView = 'reminders';
        } else if (view === "archive") {
          this.currentView = 'archive';
        } else if (view === "trash") {
          this.currentView = 'trash';
        } else {
          return; 
        }

        this.displayNotes();
      }
    }
  }

  saveNotes() {
    localStorage.setItem("notes", JSON.stringify(this.notes));
  }

  render() {
    this.saveNotes();
    this.displayNotes();
  }
  displayNotes() {
    // Filter notes based on current view
    let filteredNotes = [];
    if (this.currentView === 'notes') {
      filteredNotes = this.notes.filter(note => note.status === 'active');
    } else if (this.currentView === 'reminders') {
      // Show notes with reminders (active and archived)
      filteredNotes = this.notes.filter(note => {
        if (!note.reminder) return false;
        if (note.status !== 'active' && note.status !== 'archived') return false;
        // Validate reminder date
        const reminderDate = new Date(note.reminder);
        return !isNaN(reminderDate.getTime());
      });
      // Sort by reminder date (soonest first)
      filteredNotes.sort((a, b) => {
        try {
          const dateA = new Date(a.reminder);
          const dateB = new Date(b.reminder);
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
          return dateA - dateB;
        } catch (e) {
          return 0;
        }
      });
    } else if (this.currentView === 'archive') {
      filteredNotes = this.notes.filter(note => note.status === 'archived');
    } else if (this.currentView === 'trash') {
      filteredNotes = this.notes.filter(note => note.status === 'deleted');
    }

    // Apply search filter
    if (this.searchQuery) {
      filteredNotes = filteredNotes.filter(note => {
        const titleMatch = (note.title || '').toLowerCase().includes(this.searchQuery);
        const textMatch = (note.text || '').toLowerCase().includes(this.searchQuery);
        return titleMatch || textMatch;
      });
    }

    // Sort notes: pinned first, then by updated date (unless reminders view)
    if (this.currentView !== 'reminders') {
      filteredNotes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    }

    if (filteredNotes.length === 0) {
      let emptyMessage = '';
      if (this.searchQuery) {
        emptyMessage = 'No notes found matching your search';
      } else if (this.currentView === 'notes') {
        emptyMessage = 'No notes yet';
      } else if (this.currentView === 'reminders') {
        emptyMessage = 'No reminders yet';
      } else if (this.currentView === 'archive') {
        emptyMessage = 'No archived notes yet';
      } else if (this.currentView === 'trash') {
        emptyMessage = 'No deleted notes yet';
      }
      this.$notes.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
      return;
    }

    this.$notes.innerHTML = filteredNotes
      .map(
        (note) => {
          let footerActions = '';
          
          if (this.currentView === 'notes' || this.currentView === 'reminders') {
            // Regular note view - show pin, reminder, color, archive and delete
            const pinIcon = note.isPinned ? 'push_pin' : 'push_pin';
            const pinColor = note.isPinned ? '#fbbc04' : '';
            const reminderIcon = note.reminder ? 'notifications_active' : 'add_alert';
            const reminderColor = note.reminder ? '#fbbc04' : '';
            footerActions = `
              <div class="tooltip pin-note">
                  <span class="material-icons-outlined hover small-icon" style="color: ${pinColor}">${pinIcon}</span>
                  <span class="tooltip-text">${note.isPinned ? 'Unpin' : 'Pin'}</span>
              </div>
              <div class="tooltip reminder-button" style="position: relative;">
                  <span class="material-icons-outlined hover small-icon" style="color: ${reminderColor}">${reminderIcon}</span>
                  <span class="tooltip-text">${note.reminder ? 'Change reminder' : 'Remind me'}</span>
                  ${this.showReminderPicker && this.reminderPickerNoteId === note.id ? this.getReminderPickerHTML(note.reminder) : ''}
              </div>
              <div class="tooltip archive">
                  <span class="material-icons-outlined hover small-icon">archive</span>
                  <span class="tooltip-text">Archive</span>
              </div>
              <div class="tooltip delete-note">
                  <span class="material-icons-outlined hover small-icon">delete</span>
                  <span class="tooltip-text">Delete</span>
              </div>
            `;
          } else if (this.currentView === 'archive') {
            // Archive view - show unarchive and delete
            footerActions = `
              <div class="tooltip unarchive-note">
                  <span class="material-icons-outlined hover small-icon">unarchive</span>
                  <span class="tooltip-text">Unarchive</span>
              </div>
              <div class="tooltip delete-note">
                  <span class="material-icons-outlined hover small-icon">delete</span>
                  <span class="tooltip-text">Delete</span>
              </div>
            `;
          } else if (this.currentView === 'trash') {
            // Trash view - show restore and permanent delete
            footerActions = `
              <div class="tooltip restore-note">
                  <span class="material-icons-outlined hover small-icon">restore</span>
                  <span class="tooltip-text">Restore</span>
              </div>
              <div class="tooltip delete-note">
                  <span class="material-icons-outlined hover small-icon">delete_forever</span>
                  <span class="tooltip-text">Delete Forever</span>
              </div>
            `;
          }

          // Make footer always visible in archive and trash views
          const footerVisible = (this.currentView === 'archive' || this.currentView === 'trash');
          const footerClass = footerVisible ? 'footer-visible' : '';
          
          // Format timestamp
          const updatedDate = new Date(note.updatedAt);
          const timeAgo = this.getTimeAgo(updatedDate);
          
          // Format reminder date if exists
          let reminderText = '';
          if (note.reminder) {
            try {
              const reminderDate = new Date(note.reminder);
              // Check if date is valid
              if (!isNaN(reminderDate.getTime())) {
                const now = new Date();
                if (reminderDate < now) {
                  reminderText = `<div class="note-reminder overdue">Overdue: ${this.formatReminderDate(note.reminder)}</div>`;
                } else {
                  reminderText = `<div class="note-reminder">Reminder: ${this.formatReminderDate(note.reminder)}</div>`;
                }
              }
            } catch (e) {
              // Invalid reminder date, skip displaying it
              console.warn('Invalid reminder date for note:', note.id, e);
            }
          }
          
          // Handle note background color - use CSS variable for default white in dark mode
          let noteStyle = '';
          if (note.color === '#ffffff' || note.color === 'white' || !note.color) {
            // Use CSS variable for default color so it respects dark mode
            noteStyle = '';
          } else {
            // Use custom color but add opacity in dark mode for better visibility
            const bgColor = this.isDarkMode ? this.adjustColorForDarkMode(note.color) : note.color;
            noteStyle = `style="background-color: ${bgColor};"`;
          }
          
          // Position reminder icon based on pin status
          const reminderIconStyle = note.isPinned ? 'right: 30px;' : 'right: 8px;';
          
          return `
      <div class="note ${note.color === '#ffffff' || note.color === 'white' || !note.color ? 'note-default-color' : ''}" ${noteStyle} onmouseover="app.handleMouseOverNote(this)" onmouseout="app.handleMouseOutNote(this)">
          ${note.isPinned ? '<span class="material-icons pin-icon">push_pin</span>' : ''}
          ${note.reminder ? `<span class="material-icons reminder-icon" style="${reminderIconStyle}">notifications</span>` : ''}
          <span class="material-icons check-circle">check_circle</span>
          <div class="title">${this.escapeHtml(note.title || '')}</div>
          <div class="text">${this.escapeHtml(note.text || '')}</div>
          ${reminderText}
          <div class="note-timestamp">${timeAgo}</div>
          <div class="note-footer ${footerClass}">
              ${footerActions}
          </div>
      </div>
      `;
        }
      )
      .join("");
  }

  getColorPickerHTML() {
    const colors = [
      { name: 'Default', value: '#ffffff' },
      { name: 'Red', value: '#f28b82' },
      { name: 'Orange', value: '#fbbc04' },
      { name: 'Yellow', value: '#fff475' },
      { name: 'Green', value: '#ccff90' },
      { name: 'Teal', value: '#a7ffeb' },
      { name: 'Blue', value: '#cbf0f8' },
      { name: 'Dark Blue', value: '#aecbfa' },
      { name: 'Purple', value: '#d7aefb' },
      { name: 'Pink', value: '#fdcfe8' },
      { name: 'Brown', value: '#e6c9a8' },
      { name: 'Gray', value: '#e8eaed' }
    ];

    return `
      <div class="color-picker">
        ${colors.map(color => `
          <div class="color-option" data-color="${color.value}" style="background-color: ${color.value};" title="${color.name}"></div>
        `).join('')}
      </div>
    `;
  }

  getReminderPickerHTML(currentReminder) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const formatDateForInput = (date) => {
      return date.toISOString().split('T')[0];
    };

    const formatTimeForInput = (date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    let customDateValue = formatDateForInput(tomorrow);
    let customTimeValue = '09:00';
    
    if (currentReminder) {
      try {
        const reminderDate = new Date(currentReminder);
        if (!isNaN(reminderDate.getTime())) {
          customDateValue = formatDateForInput(reminderDate);
          customTimeValue = formatTimeForInput(reminderDate);
        }
      } catch (e) {
        console.warn('Error parsing current reminder:', e);
      }
    }

    return `
      <div class="reminder-picker">
        ${currentReminder ? `
          <div class="reminder-option" data-action="remove" style="cursor: pointer; padding: 8px; border-bottom: 1px solid var(--border-light);">
            <span class="material-icons-outlined" style="font-size: 18px; vertical-align: middle;">close</span>
            <span style="margin-left: 8px;">Remove reminder</span>
          </div>
        ` : ''}
        <div class="reminder-option" data-action="later-today" style="cursor: pointer; padding: 8px;">
          <span style="font-weight: 500;">Later today</span>
          <span style="color: var(--text-secondary); font-size: 0.85rem; float: right;">${this.formatReminderTime(this.getReminderDate('later-today')) || '1 hour'}</span>
        </div>
        <div class="reminder-option" data-action="tomorrow" style="cursor: pointer; padding: 8px;">
          <span style="font-weight: 500;">Tomorrow</span>
          <span style="color: var(--text-secondary); font-size: 0.85rem; float: right;">9:00 AM</span>
        </div>
        <div class="reminder-option" data-action="next-week" style="cursor: pointer; padding: 8px; border-bottom: 1px solid var(--border-light);">
          <span style="font-weight: 500;">Next week</span>
          <span style="color: var(--text-secondary); font-size: 0.85rem; float: right;">9:00 AM</span>
        </div>
        ${this.showCustomReminderPicker ? `
          <div style="padding: 8px;">
            <div style="margin-bottom: 8px;">
              <label style="display: block; margin-bottom: 4px; font-size: 0.85rem; color: var(--text-secondary);">Date</label>
              <input type="date" id="custom-reminder-date" value="${customDateValue}" style="width: 100%; padding: 4px; border: 1px solid var(--border-light); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
            </div>
            <div style="margin-bottom: 8px;">
              <label style="display: block; margin-bottom: 4px; font-size: 0.85rem; color: var(--text-secondary);">Time</label>
              <input type="time" id="custom-reminder-time" value="${customTimeValue}" style="width: 100%; padding: 4px; border: 1px solid var(--border-light); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
            </div>
            <button class="save-custom-reminder" style="width: 100%; padding: 8px; background: var(--bg-secondary); border: none; border-radius: 4px; cursor: pointer; color: var(--text-primary); font-weight: 500;">Save</button>
          </div>
        ` : `
          <div class="reminder-option" data-action="custom" style="cursor: pointer; padding: 8px;">
            <span class="material-icons-outlined" style="font-size: 18px; vertical-align: middle;">schedule</span>
            <span style="margin-left: 8px;">Pick date & time</span>
          </div>
        `}
      </div>
    `;
  }

  formatReminderDate(date) {
    try {
      const reminderDate = new Date(date);
      if (isNaN(reminderDate.getTime())) {
        return 'Invalid date';
      }
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const reminderDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());
      
      if (reminderDay.getTime() === today.getTime()) {
        return `Today ${this.formatReminderTime(date)}`;
      } else if (reminderDay.getTime() === tomorrow.getTime()) {
        return `Tomorrow ${this.formatReminderTime(date)}`;
      } else {
        return reminderDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: reminderDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        }) + ` ${this.formatReminderTime(date)}`;
      }
    } catch (e) {
      console.warn('Error formatting reminder date:', e);
      return 'Invalid date';
    }
  }

  formatReminderTime(date) {
    try {
      const reminderDate = new Date(date);
      if (isNaN(reminderDate.getTime())) {
        return '';
      }
      return reminderDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.warn('Error formatting reminder time:', e);
      return '';
    }
  }

  // This timestamp feature was developed from scratch without the use of Cursor or any other AI tools
  getTimeAgo(date) {
    const noteDate = new Date(date);
    const now = new Date();
    const isToday = noteDate.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === noteDate.toDateString();
    
    if (isToday) {
      // Show time for today (e.g., "2:30 PM")
      return noteDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (isYesterday) {
      // Show "Yesterday" with time
      return `Yesterday ${noteDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (now.getFullYear() === noteDate.getFullYear()) {
      // Show date and time for this year (e.g., "Dec 15, 2:30 PM")
      return noteDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      // Show full date and time for previous years (e.g., "Dec 15, 2023, 2:30 PM")
      return noteDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    this.applyDarkMode();
    localStorage.setItem('darkMode', this.isDarkMode);
  }

  applyDarkMode() {
    if (this.isDarkMode) {
      document.body.classList.add('dark-mode');
      const icon = this.$darkModeToggle?.querySelector('.material-icons-outlined');
      if (icon) {
        icon.textContent = 'light_mode';
      }
      const tooltip = this.$darkModeToggle?.querySelector('.tooltip-text');
      if (tooltip) {
        tooltip.textContent = 'Light Mode';
      }
    } else {
      document.body.classList.remove('dark-mode');
      const icon = this.$darkModeToggle?.querySelector('.material-icons-outlined');
      if (icon) {
        icon.textContent = 'dark_mode';
      }
      const tooltip = this.$darkModeToggle?.querySelector('.tooltip-text');
      if (tooltip) {
        tooltip.textContent = 'Dark Mode';
      }
    }
    // Re-render notes to apply dark mode colors
    this.displayNotes();
  }

  adjustColorForDarkMode(color) {
    // For colored notes in dark mode, slightly darken them for better contrast
    if (!color || color === '#ffffff' || color === 'white') {
      return '';
    }
    
    // Convert hex to RGB
    const hex = color.replace('#', '');
    if (hex.length !== 6) {
      return color; // Return original if invalid hex
    }
    
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Darken by 30% for better visibility in dark mode
    const darkR = Math.max(0, Math.floor(r * 0.7));
    const darkG = Math.max(0, Math.floor(g * 0.7));
    const darkB = Math.max(0, Math.floor(b * 0.7));
    
    return `rgb(${darkR}, ${darkG}, ${darkB})`;
  }

  // ============================================
  // Undo/Redo Functionality
  // This feature was developed using Cursor AI coding assistant
  // Provides history tracking and undo/redo capabilities for all note operations
  // ============================================
  saveState() {
    // Don't save state during undo/redo operations
    if (this.isUndoRedoOperation) {
      return;
    }

    // Remove any future history if we're in the middle of undo/redo
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Create a deep copy of current notes state
    const state = JSON.parse(JSON.stringify(this.notes));
    
    // Add to history
    this.history.push(state);
    this.historyIndex = this.history.length - 1;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }

    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.isUndoRedoOperation = true;
      this.historyIndex--;
      this.notes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.render();
      this.isUndoRedoOperation = false;
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.isUndoRedoOperation = true;
      this.historyIndex++;
      this.notes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.render();
      this.isUndoRedoOperation = false;
    }
  }

  updateUndoRedoButtons() {
    const undoButtons = document.querySelectorAll('.undo-btn');
    const redoButtons = document.querySelectorAll('.redo-btn');
    
    const canUndo = this.historyIndex > 0;
    const canRedo = this.historyIndex < this.history.length - 1;

    undoButtons.forEach(btn => {
      if (canUndo) {
        btn.classList.remove('disabled');
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      } else {
        btn.classList.add('disabled');
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    });

    redoButtons.forEach(btn => {
      if (canRedo) {
        btn.classList.remove('disabled');
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      } else {
        btn.classList.add('disabled');
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    });
  }
}

const app = new App();