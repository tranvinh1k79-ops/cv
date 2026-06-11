# CV PDF And Project Demo Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CV PDF export follow the provided bright A4 sample while adding editable birth date and App/Web demo images for projects.

**Architecture:** Keep the existing dark `/cv` screen UI unchanged and add a print-only CV document rendered from the same profile, skills, education, experience, and project data. Extend project/profile normalization and admin editors with optional fields so existing saved content remains compatible.

**Tech Stack:** React, React Router, Vite, CSS print media, existing file-backed/Supabase content JSON.

---

### Task 1: Extend Data Shape

**Files:**
- Modify: `src/App.jsx`

- [ ] Add `birth_date`, `website_url`, and demo image fields to normalization helpers.
- [ ] Preserve camelCase aliases for imported/Supabase data.
- [ ] Keep all new fields optional.

### Task 2: Update Admin Editors

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

- [ ] Add profile fields for birth date and website URL.
- [ ] Add project fields and uploads for App demo image and Web demo image.
- [ ] Add small previews in the Project CMS after image selection.

### Task 3: Render Project Demo Images

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

- [ ] Add a project detail demo section.
- [ ] Render App/Web demo cards only when their image URL exists.
- [ ] Keep existing thumbnail, cover, demo URL, and GitHub behavior.

### Task 4: Add Print-Only CV Template

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/cv-premium.css`

- [ ] Add a print-only CV document component using the provided PDF sample structure.
- [ ] Hide the current dark CV screen during print.
- [ ] Render bright A4 pages with dark header, section labels, compact skills table, experience list, and projects list.

### Task 5: Verify

**Files:**
- No source files.

- [ ] Run `npm.cmd run build`.
- [ ] Confirm `/cv`, `/projects`, and a project detail route return 200.
- [ ] Export a sample PDF and inspect page count/text.
- [ ] Capture a print-media screenshot for visual review.
