# Customization Guide - Querify UI

## 🎨 Easy Theme Customization

All colors are defined as CSS variables in the root selector. To change the theme, modify the values in [static/style.css](static/style.css) at the top:

### Current Theme (Indigo/Purple)

```css
:root {
  --primary-color: #6366f1;      /* Main action buttons */
  --primary-dark: #4f46e5;        /* Hover state */
  --primary-light: #818cf8;       /* Text/icons on primary */
  --secondary-color: #a855f7;     /* Gradients, accents */
  --accent-color: #06b6d4;        /* Highlights, borders */
  
  --bg-primary: #0f172a;          /* Darkest background */
  --bg-secondary: #1e293b;        /* Cards, modals */
  --bg-tertiary: #334155;         /* Input, buttons */
  --bg-quaternary: #475569;       /* Hover backgrounds */
  
  --text-primary: #f1f5f9;        /* Main text */
  --text-secondary: #cbd5e1;      /* Secondary text */
  --text-tertiary: #94a3b8;       /* Placeholder, hints */
  
  --border-color: #334155;        /* Default borders */
  --border-light: #475569;        /* Hover borders */
}
```

---

## 🎨 Theme Presets

### Theme 1: Ocean Blue (Cool)
```css
:root {
  --primary-color: #0ea5e9;       /* Sky Blue */
  --primary-dark: #0284c7;        /* Dark Sky */
  --primary-light: #7dd3fc;       /* Light Sky */
  --secondary-color: #06b6d4;     /* Cyan */
  --accent-color: #10b981;        /* Emerald */
}
```

### Theme 2: Forest Green (Nature)
```css
:root {
  --primary-color: #10b981;       /* Emerald */
  --primary-dark: #059669;        /* Dark Emerald */
  --primary-light: #6ee7b7;       /* Light Emerald */
  --secondary-color: #34d399;     /* Green */
  --accent-color: #14b8a6;        /* Teal */
}
```

### Theme 3: Sunset Orange (Warm)
```css
:root {
  --primary-color: #f97316;       /* Orange */
  --primary-dark: #ea580c;        /* Dark Orange */
  --primary-light: #fed7aa;       /* Light Orange */
  --secondary-color: #ef4444;     /* Red */
  --accent-color: #fbbf24;        /* Amber */
}
```

### Theme 4: Rose Pink (Modern)
```css
:root {
  --primary-color: #ec4899;       /* Pink */
  --primary-dark: #db2777;        /* Dark Pink */
  --primary-light: #fbcfe8;       /* Light Pink */
  --secondary-color: #f43f5e;     /* Rose */
  --accent-color: #06b6d4;        /* Cyan */
}
```

---

## 🔧 Customization Examples

### Change Primary Color Only
```css
:root {
  --primary-color: #3b82f6;       /* Blue */
  --primary-dark: #1d4ed8;        /* Darker Blue */
  --primary-light: #93c5fd;       /* Lighter Blue */
}
```

### Adjust Background Darkness
```css
:root {
  /* Make darker */
  --bg-primary: #050f1e;          /* Darker navy */
  --bg-secondary: #0f1c2e;        /* Darker slate */
  
  /* OR make lighter */
  --bg-primary: #1a2a3a;          /* Lighter navy */
  --bg-secondary: #2a3a4a;        /* Lighter slate */
}
```

### Modify Text Colors for Better Contrast
```css
:root {
  --text-primary: #ffffff;        /* Pure white */
  --text-secondary: #e5e7eb;      /* Near white */
  --text-tertiary: #d1d5db;       /* Light gray */
}
```

### Change Accent/Highlight Color
```css
:root {
  --accent-color: #8b5cf6;        /* Purple accent */
}
```

---

## 🎯 Elements Using Each Variable

### Primary Color (Main Actions)
- Send button
- Profile button
- Document hover borders
- Input focus borders
- Modal headers
- Toggle animations

### Secondary Color (Gradients)
- Button gradients
- Logo gradient
- Text gradients
- Border gradients

### Accent Color (Highlights)
- Highlights in text
- Success indicators
- Emphasis borders
- Icon colors

### Background Colors
- **bg-primary**: Main page background
- **bg-secondary**: Cards, modals, sidebar
- **bg-tertiary**: Input fields, hover states
- **bg-quaternary**: Deep hover states, scrollbar

### Text Colors
- **text-primary**: Main heading and body text
- **text-secondary**: Secondary information
- **text-tertiary**: Placeholders and disabled text

---

## 💻 Advanced Customization

### Adjust Blur Effect (Glass-morphism)
```css
:root {
  --glass-blur: blur(20px);       /* More blur (softer) */
  --glass-blur: blur(5px);        /* Less blur (sharper) */
}
```

### Modify Shadow System
```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);     /* Softer */
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.2);    /* Stronger */
}
```

### Change Border Styles
```css
/* Replace specific border-radius values */
border-radius: 16px;   /* More rounded */
border-radius: 4px;    /* More angular */

/* Or modify by changing individual components:
   Sidebars: 12px
   Modals: 12px
   Buttons: 8px
   Cards: 8px
   Inputs: 8px
*/
```

### Animation Speed
```css
/* Find animation definitions and modify duration */
animation: pageLoad 0.3s ease-out;   /* Faster */
animation: pageLoad 1s ease-out;     /* Slower */
```

---

## 📝 Common Customizations

### 1. Make Sidebar Narrower
```css
.sidebar {
  width: 240px;  /* Was 280px */
}

/* Adjust on mobile */
@media (max-width: 768px) {
  .sidebar {
    width: 70%;  /* Was 80% */
  }
}
```

### 2. Reduce Animation Speed
```css
/* Find all animation durations and reduce them */
animation: pageLoad 0.3s ease-out;   /* Was 0.5s */
transition: all 0.2s ease;           /* Was 0.3s */
```

### 3. Make Messages Wider
```css
.msg-bubble {
  max-width: 75%;  /* Was 65% */
}

@media (max-width: 768px) {
  .msg-bubble {
    max-width: 90%;  /* Was 85% */
  }
}
```

### 4. Increase Spacing/Padding
```css
.chat-box {
  padding: 32px;   /* Was 24px */
}

.input-section {
  padding: 20px 32px;  /* Was 16px 24px */
}
```

### 5. Change Font Family
```css
* {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  /* Or: "Roboto", "Poppins", "Open Sans", etc. */
}
```

---

## 🎯 Preset Quick Copy

### Copy & paste these into your `:root` selector to instantly change themes:

```css
/* Dark Purple (Current) */
--primary-color: #6366f1;
--primary-dark: #4f46e5;
--secondary-color: #a855f7;
--accent-color: #06b6d4;

/* Light Mode (Invert) */
--primary-color: #4f46e5;
--primary-dark: #6366f1;
--secondary-color: #7c3aed;
--accent-color: #0891b2;
--bg-primary: #f8fafc;
--bg-secondary: #f1f5f9;
--bg-tertiary: #e2e8f0;
--bg-quaternary: #cbd5e1;
--text-primary: #0f172a;
--text-secondary: #334155;
--text-tertiary: #64748b;
```

---

## 🔍 Finding Elements to Customize

### In Browser DevTools (F12):
1. Right-click element → "Inspect"
2. Find the CSS class name
3. Search for it in `static/style.css`
4. Modify and save
5. Refresh browser to see changes

### Key Classes to Search:
- `.chat-box` - Chat area
- `.sidebar` - Document sidebar
- `.header` - Top header
- `.input-section` - Bottom input
- `.msg` - Chat messages
- `.modal-content` - Pop-up modals
- `.send-btn` - Send button
- `.profile-btn` - Profile button

---

## ✅ Testing Your Changes

1. Save changes to `static/style.css`
2. Hard refresh browser: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
3. Clear browser cache if needed
4. Test on different screen sizes
5. Check responsiveness on mobile

---

## 💾 Backup Your Changes

Always keep a backup of your modified CSS:
```bash
cp static/style.css static/style.css.backup
```

---

## 🆘 Troubleshooting

### Colors not changing?
- Make sure you're editing `:root` at the top of CSS
- Hard refresh browser (Ctrl+Shift+R)
- Check for browser cache

### Layout broken?
- Restore from backup
- Check for syntax errors (missing semicolons, brackets)
- Validate CSS at jigsaw.w3.org/css-validator/

### Changes not showing?
- Verify file saved properly
- Check file permissions
- Restart Flask server if using cache

---

## 📚 Additional Resources

- **Color Inspiration**: https://www.tailwindcss.com/docs/customization/colors
- **CSS Variables Guide**: https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- **Gradient Generator**: https://www.css-gradient.com/
- **Animation Timing**: https://cubic-bezier.com/

---

**Customization Guide v1.0**
**Created**: January 4, 2026
**Last Updated**: January 4, 2026

Happy customizing! 🎨✨
