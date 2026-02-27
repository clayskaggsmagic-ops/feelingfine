# ⚠️ CRITICAL NOTES - READ BEFORE EVERY CODING SESSION ⚠️

## 🚨 MANDATORY: USE LATEST VERSIONS OF EVERYTHING 🚨

**YOUR TRAINING DATA IS OUTDATED.** Before writing ANY code:

1. **SEARCH ONLINE** for the latest documentation
2. **VERIFY** package versions on npm/PyPI
3. **USE** the newest APIs and techniques
4. **NEVER** assume your knowledge is current

---

## 1. SEARCH BEFORE INSTALLING DEPENDENCIES
- Training data is OUTDATED
- Before adding ANY package:
  - Search npm DIRECTLY for current version
  - Read the latest documentation
  - Check for breaking changes
  - YOU SHOULD HAVE THE LATEST VERSIONS OF ALL DEPENDENCIES
- Search online for documentation also to make sure you are using best/new way

## 2. SINGLE SOURCE OF TRUTH
- ONE backend handles ALL business logic
- Frontend is a thin display layer
- All state flows through the API
- NEVER duplicate logic between frontend and backend
- If copying code, refactor into shared modules

## 3. KEEP IT SIMPLE
- Prefer fewer files with clear responsibilities
- Avoid premature abstraction
- Every file should have an obvious purpose
- If you can't explain a file in one sentence, split it

## 4. DEBUGGING IS PARAMOUNT
- Comprehensive logging at every decision point
- Structured logs on the backend
- Error boundaries with clear messages, not silent failures

## 5. TESTING IS MANDATORY
- Unit tests for critical backend logic
- Integration tests for API endpoints
- Test error handling paths
- Test frontend displays correct data

## 6. NO AI-LOOKING DESIGN
- **NO** emojis in the UI (use proper icons instead)
- **NO** clutter — white space is luxury

