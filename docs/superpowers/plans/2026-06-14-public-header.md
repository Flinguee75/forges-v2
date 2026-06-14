# Public Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal public navigation with a responsive FORGES header focused on catalogue discovery and account conversion.

**Architecture:** Keep `PublicLayout` and the private navbar unchanged. Update only the `isPublic` rendering branch in `Navbar.jsx`, using responsive text variants and existing React Router links.

**Tech Stack:** React 19, React Router, Tailwind CSS 3, Vitest, Testing Library.

---

### Task 1: Define public header behavior

**Files:**
- Modify: `forges-monorepo/frontend/src/components/layout/__tests__/Navbar.test.jsx`

- [ ] Replace the old public styling assertions with links for `Accueil FORGES`, `Parcourir les formations`, `Connexion`, and `Inscrivez-vous gratuitement`.
- [ ] Assert the catalogue, login, and registration destinations.
- [ ] Assert that no search field or public menu button is rendered.
- [ ] Run the focused navbar test and confirm it fails against the old header.

### Task 2: Implement the responsive public header

**Files:**
- Modify: `forges-monorepo/frontend/src/components/layout/Navbar.jsx`

- [ ] Add a centered, full-width public header container.
- [ ] Render the FORGES logo and wordmark.
- [ ] Add the catalogue discovery link.
- [ ] Render a text login action and outlined registration action.
- [ ] Add responsive short labels for mobile.
- [ ] Add the primary blue bottom border and accessible focus styles.
- [ ] Run the focused navbar tests.

### Task 3: Validate all public surfaces

**Files:**
- Modify if required: `forges-monorepo/frontend/src/components/layout/Navbar.jsx`
- Modify if required: `forges-monorepo/frontend/src/components/layout/__tests__/Navbar.test.jsx`

- [ ] Run navbar and formation detail tests.
- [ ] Run focused lint.
- [ ] Run the production build.
- [ ] Verify the landing, catalogue, and formation detail in desktop and mobile browser viewports.
- [ ] Check browser console errors and run `git diff --check`.
