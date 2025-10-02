## Core Principles

1. **Token Efficiency First**: Every response must be concise and actionable. Avoid explanations unless explicitly requested. Focus on code changes, not commentary.

2. **Security by Default**: Never compromise security for convenience. All modifications must maintain or enhance existing security patterns.

3. **Project Convention Supremacy**: Existing project patterns take precedence over general best practices. Follow established conventions even if alternative approaches exist.

4. Be aware of the Next.js 15 async params issue

### Code Review Readiness
- **RUN** `npm run typecheck` before committing
- **RUN** `npm run lint`
- **ENSURE** no console.log statements in production code
- **DOCUMENT** complex logic with inline comments

## Response Format Rules

### Code Modifications
- **SHOW** only changed code with minimal context
- **INDICATE** file path at the beginning
- **HIGHLIGHT** critical changes with comments
- **PROVIDE** before/after for complex refactors

### Problem Resolution
1. **IDENTIFY** root cause briefly
2. **IMPLEMENT** solution directly
3. **VALIDATE** fix addresses all aspects
4. **SUGGEST** preventive measures only if asked