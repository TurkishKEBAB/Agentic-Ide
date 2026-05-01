# Accessibility Plan

Status: Pre-implementation baseline

Accessibility is part of usability evidence, not a cosmetic afterthought.

## Target

MVP target: WCAG 2.2 AA where practical for custom UI outside Monaco. Monaco's built-in accessibility behavior should be
preserved, not overridden.

## Required Checks

| Area                 | Requirement                                                  |
|----------------------|--------------------------------------------------------------|
| Keyboard navigation  | Core flows usable without mouse                              |
| Focus management     | Diff, approval, rollback, and modal flows have visible focus |
| Contrast             | Default theme meets readable contrast for text and controls  |
| Screen reader labels | Icon-only buttons have accessible names                      |
| Motion               | No required information conveyed only through animation      |
| Error messaging      | Safety warnings are text-visible and not color-only          |

## Test Strategy

- Playwright accessibility smoke checks after UI exists
- manual keyboard walkthrough for MVP demo flow
- screen reader spot check for approval and rollback flow
- issue template for accessibility defects if a flow blocks keyboard-only use
