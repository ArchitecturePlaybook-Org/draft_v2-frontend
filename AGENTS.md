<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Git Branching Strategy Rule

- **Consolidated Bug Fix Branch**: Always use a single consolidated `bugfix` branch created from `develop` for bug fixes instead of creating separate branches for individual bug tickets.
- **Commit Message Issue IDs**: Always mention the target Issue ID in the commit message (e.g. `fix(scope): description (#ID)`).
