# Manual PDF Testing Guide

## Quick Start

### 1. Start the Application
```bash
npm run electron:dev
```

### 2. Basic PDF Generation Test
1. **Meeting memo loads automatically** in the left panel (output/2023-05-24-meeting-memo.md)
2. **Click the meeting memo** in the file tree to load it into the editor
3. **Click "Generate PDF" button** in the toolbar (document icon)
4. **Expected Results:**
   - Loading spinner appears on button
   - Success toast notification appears
   - View automatically switches to PDF mode
   - PDF displays with 10 pages
   - Metadata panel shows document details

### 3. PDF Viewer Features
- **Zoom Controls**: Use + / - buttons or Ctrl/Cmd +/-
- **Page Navigation**: Use arrow buttons or Page Up/Down keys
- **Rotation**: Click rotate button or press R
- **View Toggle**: Switch between Text/PDF modes
- **Metadata**: Click info icon to see PDF details

### 4. Export PDF
- **Method 1**: Click "Export PDF" button in toolbar
- **Method 2**: Press Ctrl/Cmd+Shift+S
- **Expected**: Save dialog appears with suggested filename

## Testing Other Document Types

### Load Different Documents
1. Navigate to any `.md` file in the output folder
2. Click to load it
3. Generate PDF
4. Each document type has specific formatting:
   - Patent applications: Technical formatting
   - NDAs: Legal clause formatting
   - Cease & Desist: Formal letter format

## Common Issues & Solutions

### If PDF Generation Fails
1. Check console for errors (Ctrl/Cmd+Shift+I)
2. Ensure content is loaded in editor
3. Try refreshing the app (Ctrl/Cmd+R)

### If View Doesn't Switch
1. Check if PDF was generated (look for success toast)
2. Manually click PDF view button
3. Check console for blob URL errors

## Success Indicators
✅ No console errors  
✅ Success toast notification  
✅ PDF displays correctly  
✅ Metadata shows correct information  
✅ Export saves file successfully  

## Keyboard Shortcuts
- **Generate PDF**: No default shortcut (use button)
- **Export PDF**: Ctrl/Cmd+Shift+S
- **Zoom In**: Ctrl/Cmd + Plus
- **Zoom Out**: Ctrl/Cmd + Minus
- **Next Page**: Page Down
- **Previous Page**: Page Up
- **Rotate**: R 