

# SecureVault - Feature Enhancement Implementation Plan

## Context
SecureVault is an offline-first, zero-knowledge encrypted vault for passwords, notes, banking details, and documents. The previously approved feature plan (favorites/tags, clipboard auto-clear, password age tracker, TOTP authenticator, breach monitoring, secure sharing, emergency access) will now be implemented in phases.

## Phase 1: Favorites, Tags & Organization (Quick Wins)

**What**: Add favorite toggle (star) and custom tags to all vault items. Favorites pin to top. Filter by tag.

- `src/services/indexedDBStorage.ts` -- Add `favorite: boolean` and `tags: string[]` fields to `VaultItem` interface
- `src/components/VaultItemCard.tsx` -- Add star icon toggle, display tag badges
- `src/components/VaultItemForm.tsx` -- Add favorite checkbox, tag input with chips
- `src/components/VaultDashboard.tsx` -- Add "Favorites" filter, tag filter chips, sort favorites to top

## Phase 2: Secure Clipboard Auto-Clear

**What**: After copying any sensitive data, show a countdown toast and auto-clear clipboard after 30 seconds.

- `src/services/clipboardManager.ts` -- New service: `secureCopy(text, label)` that writes to clipboard, starts timer, clears after 30s
- Update all `copyToClipboard` calls in `VaultItemCard.tsx` to use the new service

## Phase 3: Password Age Tracker & Reminders

**What**: Track when each password was last changed. Show green/yellow/red age indicator. Add "Needs rotation" filter.

- `src/services/indexedDBStorage.ts` -- Add `passwordChangedAt: string` field to VaultItem
- `src/components/VaultItemCard.tsx` -- Show age badge (green <30d, yellow <90d, red >90d) on password items
- `src/components/VaultDashboard.tsx` -- Add "Needs Rotation" quick filter

## Phase 4: Built-in TOTP Authenticator

**What**: Store TOTP secrets alongside passwords and display live 6-digit codes with countdown.

- `src/services/totp.ts` -- New: RFC 6238 TOTP generation using Web Crypto API (HMAC-SHA1), no external deps
- `src/components/TOTPDisplay.tsx` -- New: Live rotating code with circular countdown timer
- `src/components/VaultItemForm.tsx` -- Add "TOTP Secret" field for password items
- `src/components/VaultItemCard.tsx` -- Show live TOTP code with copy button when secret exists

## Phase 5: Breach Monitoring (HaveIBeenPwned)

**What**: Check saved emails/passwords against known breaches using k-anonymity (only first 5 chars of SHA-1 hash sent).

- `src/services/breachCheck.ts` -- New: HIBP API client using k-anonymity model (privacy-safe, no full hash leaves device)
- `src/components/BreachMonitor.tsx` -- New: Scan results UI with per-item breach status badges
- `src/components/VaultItemCard.tsx` -- Add breach status indicator (shield icon: green/red)
- `src/components/VaultDashboard.tsx` -- Add "Security Scan" button in toolbar

## Phase 6: Secure One-Time Sharing

**What**: Generate encrypted, self-destructing links for sharing individual items. Uses URL fragment (never sent to server) for the key.

- `src/services/secureShare.ts` -- New: Encrypt item data, encode as base64 in URL fragment. Recipient decrypts client-side. Time-limited via embedded expiry timestamp.
- `src/components/SecureShare.tsx` -- New: Share dialog with expiry options (1h, 24h, 7d), optional PIN, copy link button
- `src/components/VaultItemCard.tsx` -- Add "Share" action button

## Phase 7: Emergency Access

**What**: Generate a recovery kit (encrypted export + instructions PDF) that a trusted person can use with a separate emergency password.

- `src/components/EmergencyAccess.tsx` -- New: UI to set emergency password, generate encrypted emergency export
- `src/components/VaultDashboard.tsx` -- Add "Emergency Kit" option in settings menu

---

## Technical Notes

- All features remain offline-first -- no server required
- TOTP uses Web Crypto API HMAC-SHA1 (no npm deps)
- Breach check is the only feature requiring network (HIBP API), gracefully degrades offline
- Secure sharing encodes everything in URL fragment -- no backend needed
- All new data fields are backward-compatible (optional, with defaults)

## Implementation Order
1. Favorites & Tags
2. Clipboard Auto-Clear
3. Password Age Tracker
4. TOTP Authenticator
5. Breach Monitoring
6. Secure One-Time Sharing
7. Emergency Access

