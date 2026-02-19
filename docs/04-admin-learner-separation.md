# 04 - Admin vs Learner Separation

## Recommended approach
Single codebase, separated route groups + dedicated layouts:
- `/app/*` for learners
- `/admin/*` for admin/teacher

## Guards
- unauthenticated -> `/auth`
- teacher/admin routes -> role check in route guard
- admin-only pages -> strict admin check

## Important alignment
Ensure route guards and page-level checks are consistent (no teacher/admin mismatch).

## Benefits
- cleaner navigation
- easier permission management
- safer future scaling
