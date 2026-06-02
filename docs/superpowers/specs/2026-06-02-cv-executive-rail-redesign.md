# CV Reference Layout Redesign

## Scope

Redesign only the public `/cv` page presentation. Preserve the existing navbar component, routes, admin editing flow, Supabase integration, local fallback data selection, PDF export behavior, and CV download behavior.

## Approved Direction

Use the layout from the user-provided CV reference image:

- Keep the existing dark green navbar unchanged.
- Use a deep navy and charcoal CV canvas with teal and cyan accents.
- Render a full-width horizontal hero card with avatar, name, title, bio, contact details, social icons, and existing CV actions.
- Use a compact left column for Skills, Education, and Certificates.
- Use a wider right column for Experience.
- Render Experience as the dominant timeline section with readable nested cards.
- Collapse cleanly into a single-column mobile layout.

## Components

Refactor the CV presentation into focused React components inside the existing application module:

- `CvProfileHero`
- `CvSkillsSection`
- `CvExperienceSection`
- `CvEducationSection`
- `CvCertificatesSection`

Each component receives existing data through props. Components must not introduce new portfolio copy, placeholder content, or business logic.

## Data Flow

Keep the existing data flow:

1. `CVPage` reads profile, skills, experiences, education, and certificates from the existing context, Supabase services, and fallback selection helpers.
2. `CVPage` normalizes the existing data with the existing helper functions.
3. Presentation components receive normalized values as props and only render them.
4. Empty and loading states continue to use existing components.

## Styling

Add a stylesheet loaded after the existing theme files. Scope all new visual rules under `.cv-premium-page` to avoid changing the navbar or unrelated pages.

Desktop:

- Full-width profile hero followed by a two-column content area.
- Left supporting column contains Skills, Education, and Certificates.
- Experience timeline uses readable cards, accent markers, and subtle hover movement.

Mobile:

- Single-column layout.
- Profile hero stacks avatar, content, meta, and actions.
- Actions remain full-width and touch-friendly.
- Skill groups wrap without overflow.
- Timeline cards preserve readable spacing.

## Interaction

- Keep `Download CV` and `Export PDF`.
- Add CSS-only entry transitions and restrained hover effects.
- Respect `prefers-reduced-motion`.
- Keep print overrides functional.

## Verification

- Run `npm.cmd run build`.
- Verify `/cv` renders through the local Vite server.
- Confirm navbar markup and CSS are untouched.
- Check desktop and mobile layout visually.
- Confirm no new hardcoded CV content was introduced.
