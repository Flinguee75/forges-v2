# Formation Detail Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the public formation detail page around conversion-focused anchor sections and a persistent enrollment card.

**Architecture:** Keep the existing API calls and routing. Add small formatting helpers and section metadata inside `FormationDetailPage.jsx`, render only sections backed by data, and use `IntersectionObserver` to update the active anchor without introducing a dependency.

**Tech Stack:** React 19, React Router, Tailwind CSS 3, Vitest, Testing Library.

---

### Task 1: Specify conditional sections and course rendering

**Files:**
- Modify: `forges-monorepo/frontend/src/pages/public/__tests__/FormationDetailPage.test.jsx`

- [ ] Add tests asserting that `A propos`, `Resultats`, and `Cours` anchors render when their sections have data.
- [ ] Add a test asserting that `Temoignages` is absent.
- [ ] Add a test asserting that syllabus lines render as numbered course items.
- [ ] Add a test asserting that `Resultats` and `Cours` anchors disappear when objectives, syllabus, and sessions are absent.
- [ ] Run `npm test -- --run src/pages/public/__tests__/FormationDetailPage.test.jsx` and confirm the new tests fail for missing anchor behavior.

### Task 2: Implement anchor sections and course content

**Files:**
- Modify: `forges-monorepo/frontend/src/pages/public/FormationDetailPage.jsx`

- [ ] Extend formation normalization with `programme_syllabus`, `programme`, partner name, and language data.
- [ ] Build the visible section list from available objectives, syllabus, and sessions.
- [ ] Add the sticky, horizontally scrollable anchor navigation.
- [ ] Add smooth anchor scrolling with reduced-motion support.
- [ ] Track the active section using `IntersectionObserver`, with `A propos` as the initial section.
- [ ] Reorganize description, prerequisites, certification, objectives, syllabus, and sessions under semantic anchored sections.
- [ ] Run the focused test file and confirm it passes.

### Task 3: Strengthen enrollment information and mobile conversion

**Files:**
- Modify: `forges-monorepo/frontend/src/pages/public/__tests__/FormationDetailPage.test.jsx`
- Modify: `forges-monorepo/frontend/src/pages/public/FormationDetailPage.jsx`

- [ ] Add failing tests for next-session start, registration deadline, remaining places, and the enrollment CTA.
- [ ] Derive the next open session from the session list.
- [ ] Display its dates and `places_restantes`, falling back to capacity only when remaining places are unavailable.
- [ ] Preserve the current authentication and role redirects.
- [ ] Add a mobile fixed action bar only when enrollment is possible.
- [ ] Add bottom spacing so the mobile action does not cover content.
- [ ] Run the focused test file and confirm it passes.

### Task 4: Validate the finished page

**Files:**
- Modify if required by validation: `forges-monorepo/frontend/src/pages/public/FormationDetailPage.jsx`
- Modify if required by validation: `forges-monorepo/frontend/src/pages/public/__tests__/FormationDetailPage.test.jsx`

- [ ] Run `npm test -- --run src/pages/public/__tests__/FormationDetailPage.test.jsx`.
- [ ] Run `npm run lint -- --no-warn-ignored src/pages/public/FormationDetailPage.jsx src/pages/public/__tests__/FormationDetailPage.test.jsx`.
- [ ] Run `npm run build`.
- [ ] Open the local page in the in-app browser and verify desktop layout.
- [ ] Verify mobile anchor scrolling, content order, and fixed CTA.
- [ ] Run `git diff --check` and review the final diff.
