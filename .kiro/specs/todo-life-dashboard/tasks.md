# To-Do List Life Dashboard - Quick Implementation (15-20 Min)

## Overview
Minimal viable dashboard with time display, tasks, timer, and quick links. No tests or advanced features—just core functionality.

**Implementation Language**: Vanilla JavaScript (HTML/CSS/JS)  
**Target**: Browser with Local Storage API  
**No dependencies** - pure HTML/CSS/JS

---

## Tasks

- [x] 1. Create index.html with full dashboard layout
  - Single-page with header (time/greeting), timer section, todo list, quick links
  - Basic semantic HTML with data-theme attribute for theme toggle
  - All form inputs with proper labels
  - _Effort: 5 min | Priority: Critical_

- [x] 2. Create src/styles.css with complete styling
  - Light/dark theme using CSS variables
  - Mobile-responsive grid layout
  - Buttons, inputs, task items styled and ready
  - _Effort: 5 min | Priority: Critical_

- [x] 3. Create src/app.js with core functionality
  - Time display update every minute (formatTime, formatDate)
  - Greeting based on hour: 5-11 "Morning", 12-17 "Afternoon", 18-21 "Evening", 22-4 "Night"
  - To-Do: Add, complete toggle, delete with validation (no empty, case-insensitive duplicates)
  - Quick Links: Add with URL validation (http/https), delete, open in new tab
  - Timer: 25min default, start/stop/reset buttons, countdown display
  - Local Storage: Save/load tasks, links, preferences
  - Theme toggle: Light/dark mode persistence
  - _Effort: 8 min | Priority: Critical_

- [x] 4. Connect HTML to app.js and test
  - Wire all event listeners in DOM
  - Verify time updates, tasks persist, timer counts down
  - Test theme toggle and all CRUD operations
  - _Effort: 2 min | Priority: Critical_

---

## Files to Create

```
.
├── index.html              (Complete dashboard)
├── src/
│   ├── styles.css          (All styling, light/dark themes)
│   └── app.js              (All business logic)
└── .gitignore
```

---

## Acceptance Criteria

✓ Time and date display update every minute  
✓ Correct greeting based on hour (4 time periods)  
✓ Add/edit/delete tasks (no empty, no case-insensitive duplicates)  
✓ Mark tasks complete with visual feedback (strikethrough)  
✓ Sort tasks by completion/date/alphabetical  
✓ Add/edit/delete quick links with URL validation  
✓ Quick links open in new tab  
✓ 25-minute timer with start/stop/reset  
✓ Light/dark theme toggle  
✓ All data persists in Local Storage  
✓ Responsive layout on mobile/tablet/desktop  
✓ No external dependencies or build step needed  

---

## Notes

- Skip all property-based testing (optional only)
- Skip all advanced features (custom timer duration, animations, notifications)
- Skip GitHub Pages setup for now (optional only)
- Focus on working, functional code that covers all core requirements
- Use inline JavaScript (no module splitting needed)
