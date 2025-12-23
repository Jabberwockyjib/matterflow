QA Fix Request - REJECTED

Date: 2025-12-23
Session: 3

## Critical Issue: TypeScript Errors

File: src/lib/data/actions.ts

### Error 1 (Line 42)
metadata type: Record<string,unknown> not assignable to Json
Fix: Cast to Json type

### Error 2 (Line 68)
owner_id required but nullable value passed
Fix: Use session user id as fallback

### Error 3 (Line 107)
stage is string|null but Update expects string|undefined
Fix: Convert null to undefined

## Verification: npx tsc --noEmit
