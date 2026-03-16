ChatGPT-based Virtual Tutor System

UI Design System

This document defines the UI design rules for the ChatGPT-based Virtual Tutor System.
All frontend components, pages, and layouts must follow the rules defined in this file.

---

1. Design Philosophy

The interface must follow a modern glassmorphism dashboard style inspired by modern productivity dashboards.

Key characteristics:

• Soft gradient backgrounds
• Glass-like translucent cards
• Large rounded corners
• Clean spacing and minimal clutter
• Sidebar navigation layout
• Light, calm color palette
• Smooth and subtle animations

The interface should feel modern, minimal, and productivity-focused.

---

2. Color System

Background Gradient

The main page background should use a soft gradient.

Example gradient:

"linear-gradient(135deg, #E9D5FF, #BFDBFE)"

Alternative gradients allowed:

"#FDE68A → #FBCFE8"
"#E0F2FE → #EDE9FE"
"#FFE4E6 → #E0E7FF"

The background should always feel soft and blurred.

---

Glass Card Background

Cards must use a translucent glass style.

background: rgba(255,255,255,0.65)
backdrop-filter: blur(16px)
border: 1px solid rgba(255,255,255,0.4)

---

Text Colors

Primary text:

"#111827"

Secondary text:

"#6B7280"

Muted labels:

"#9CA3AF"

---

Accent Colors

These colors are used for charts, highlights, and interactive elements.

Primary accent: #6366F1
Secondary accent: #8B5CF6
Success: #22C55E
Warning: #F59E0B
Error: #EF4444

---

3. Typography

Primary font:

"Inter"

Fallback fonts:

"system-ui, sans-serif"

Font weights:

Regular: 400
Medium: 500
SemiBold: 600
Bold: 700

Font sizes:

Page title: 32px
Section title: 20px
Card title: 16px
Body text: 14px
Small text: 12px

---

4. Layout System

The application follows a dashboard layout structure.

Sidebar | Main Content

Sidebar width:

"260px"

Main content padding:

"32px"

Card spacing:

"24px"

Border radius:

"16px"

Large cards may use:

"20px radius"

---

5. Sidebar Navigation

The sidebar contains primary navigation.

Example menu:

Dashboard
Subjects
Modules
Progress
Settings
Logout

Design rules:

• Icon + label format
• Hover highlight effect
• Active item highlighted
• Glass style background

Example active item style:

background: rgba(255,255,255,0.5)

---

6. Cards

Cards are the primary UI element used throughout the interface.

Card style:

background: rgba(255,255,255,0.65)
backdrop-filter: blur(16px)
border-radius: 16px
padding: 24px
box-shadow: 0 8px 24px rgba(0,0,0,0.08)

Cards may display:

• Subject information
• Module lists
• Learning progress
• AI tutor suggestions
• Statistics

---

7. Dashboard Layout

The dashboard contains three main parts:

Top Bar
Sidebar
Main Dashboard Area

---

Top Bar

Top bar includes:

User avatar
User name
Notifications
Logout menu

---

Dashboard Sections

The dashboard may include the following sections.

Welcome Card

Example:

Hi <Student Name>, Ready to Learn?

---

Subject Cards

Each subject card displays:

Subject Name
Progress Percentage
Continue Learning Button

---

Progress Section

Displays learning statistics such as:

Completed modules
Learning progress
AI tutor recommendations

---

8. Tables

Tables should be clean and minimal.

Table style rules:

border-radius: 16px
row hover highlight
soft separators

Example uses:

• student progress tables
• module lists
• topic lists

---

9. Buttons

Primary button style:

background: #6366F1
color: white
padding: 10px 16px
border-radius: 10px

Hover state:

background: #4F46E5

Secondary button style:

background: rgba(255,255,255,0.5)
border: 1px solid rgba(255,255,255,0.4)

---

10. Inputs

Input fields must follow the glass design style.

background: rgba(255,255,255,0.6)
border-radius: 10px
border: 1px solid rgba(255,255,255,0.4)
padding: 10px 12px

Focus state:

border: 1px solid #6366F1

---

11. Profile Avatar

If the user does not upload a profile image:

Display avatar using the first letter of the user’s name.

Example:

"M"

Avatar style:

Circular shape
Gradient background
White text
Centered letter

---

12. Animations

Animations must be subtle.

Example hover animation:

transform: scale(1.02)

Transition speed:

0.2s ease

---

13. Icons

Use minimal modern icons.

Recommended libraries:

Lucide Icons

or

Heroicons

Standard icon sizes:

20px
24px

---

14. Responsiveness

Responsive breakpoints:

Mobile: <640px
Tablet: <1024px
Desktop: >1024px

On mobile screens:

• Sidebar collapses into a menu
• Cards stack vertically

---

15. UI Tone

The interface must feel:

• Modern
• Calm
• Minimal
• Clean
• AI-assisted

Avoid:

• overly bright colors
• cluttered layouts
• sharp edges
• excessive animations

---

End of Design System