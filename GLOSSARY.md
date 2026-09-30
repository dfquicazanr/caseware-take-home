# Engagement UI Kit

A shared Angular component kit that several Caseware product teams assemble engagement review screens from, plus a workbench app that demonstrates it.

## Language

**Kit**:
Everything under `src/lib/`, consumed by other teams only through `public-api.ts`.
_Avoid_: library, design system (when meaning the code)

**Workbench**:
The app under `src/app/`; a consumer of the kit, not part of it.
_Avoid_: demo, playground

**Consumer team**:
A product team whose screens depend on the kit and who absorb its breaking changes.
_Avoid_: client (collides with the engagement's client)

**Engagement**:
A piece of client work, such as one client's statutory audit for one year.

**Reviewer**:
A person who can be assigned to review an engagement's pending changes.
_Avoid_: approver, assignee

**Reviewer picker**:
The workbench's use of `cw-select` to choose an engagement's reviewer. The kit component itself is never called this.
