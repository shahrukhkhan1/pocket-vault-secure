

# Production Enhancement Plan for SecureVault

## Issues Identified & Solutions

### 1. Document Attachment: View, Remove, Replace
Currently the document form shows download/replace but no preview or remove option.

**Changes:**
- **VaultItemForm.tsx**: Add a "Remove" button next to Replace. Add inline preview for images (render `<img>` from base64 data). For PDFs, show a clickable preview link that opens in a new tab.
- **VaultItemCard.tsx**: Add document type rendering (currently missing — falls through to default). Show file name, size, preview thumbnail for images, and a download button.

### 2. Undo Delete (30-second window)
Instead of permanent deletion, implement soft-delete with an undo toast.

**Changes:**
- **VaultDashboard.tsx**: Remove the AlertDialog confirmation. On delete, stash the deleted item in state, remove it from the list visually, and show a toast with an "Undo" action button. After 30 seconds, persist the deletion. If undo is clicked, restore the item and cancel the timeout.

### 3. Apple/Google-style Smooth UI
Polish the entire app with modern design touches.

**Changes:**
- **index.css**: Add smooth spring transitions, subtle backdrop blurs, refined shadows, micro-animations for cards (scale on hover), smoother gradients, and better typography spacing.
- **VaultItemCard.tsx**: Add hover lift effect, smoother reveal of action buttons, rounded corners, subtle border glow.
- **VaultDashboard.tsx**: Add animated empty states, smoother search input transitions, staggered card entry animations.
- **LoginForm.tsx**: Add subtle floating animation on the logo, smoother form field focus states.

### 4. Backup Import Instructions Before Download
When exporting, show a dialog explaining how to restore on another device.

**Changes:**
- **VaultDashboard.tsx**: Before triggering the download, show a Dialog with clear instructions:
  - "To restore this backup on another device: 1) Install SecureVault, 2) Click Import Backup, 3) Select this file, 4) Enter your master password: [the same one you use now]"
  - Include a "Download Backup" button inside the dialog to proceed.

### 5. Tab Change / Minimize Lock Not Working
**Root cause**: The `useAutoLock` hook's `handleVisibilityChange` only locks if inactive for 30 seconds when tab is hidden. Also, `useEffect` dependencies don't include the handler functions, so stale closures may prevent locking.

**Changes:**
- **useAutoLock.ts**: Fix by using `useCallback` with proper deps, or use refs for the callbacks. Make visibility change lock configurable (lock immediately on tab switch if setting is enabled). Add `lockOnHidden` option. Fix stale closure bugs by reading `isAuthenticated` from a ref.

### 6. Biometric / FaceID / TouchID with Master Password
Current biometric implementation stores password in localStorage (`demo_master_password`) which is insecure and not actually connected.

**Changes:**
- **LoginForm.tsx**: After successful master password login, offer to "Enable Biometric Unlock" if WebAuthn is supported. Store the master password encrypted with a device-bound key via WebAuthn credential.
- **services/webauthn.ts**: Add methods to store and retrieve encrypted master password using platform authenticator.
- **SecureVaultApp.tsx**: Add biometric enrollment flow after first login. Store encrypted master password in IndexedDB keyed to the WebAuthn credential ID.
- **LoginForm.tsx**: Show a fingerprint/face button that triggers WebAuthn authentication, retrieves the encrypted password, and auto-logs in.

### 7. Reload Logs Out — Why?
**Root cause**: `SecureVaultApp.tsx` line 21-25 explicitly clears authentication on mount:
```
useEffect(() => {
    setIsAuthenticated(false);
    setMasterPassword('');
}, []);
```
This is intentional security behavior (master password is never persisted). With biometric unlock (item 6), users can quickly re-authenticate after reload without typing the password.

**Resolution**: Keep this behavior (it's a security feature). Add biometric auto-prompt on reload so the experience feels seamless. Add a brief note in the UI: "Vault locks on reload for security. Use biometric unlock for quick access."

### 8. Smart Backup Import (Merge, Not Override)
**Root cause**: `importVault()` in `indexedDBStorage.ts` line 281 calls `saveVault(validatedItems)` which fully replaces all items.

**Changes:**
- **indexedDBStorage.ts**: Add a `mergeImport` method that loads existing items, compares by ID, and only adds missing items without removing current ones.
- **VaultDashboard.tsx**: When importing, show a dialog asking "Replace all items" or "Merge (add missing items only)". The merge option compares item IDs and timestamps — keeps newer versions, adds missing ones, never removes existing items.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAutoLock.ts` | Fix stale closures, add lock-on-hidden support |
| `src/components/VaultDashboard.tsx` | Undo delete, export instructions dialog, merge import UI |
| `src/components/VaultItemForm.tsx` | Document preview, remove attachment button |
| `src/components/VaultItemCard.tsx` | Document type rendering with preview |
| `src/components/SecureVaultApp.tsx` | Biometric enrollment flow, auto-prompt on reload |
| `src/components/LoginForm.tsx` | Biometric login button, enrollment prompt |
| `src/services/indexedDBStorage.ts` | Add mergeImport method |
| `src/services/webauthn.ts` | Encrypted password storage with WebAuthn |
| `src/index.css` | UI polish — animations, transitions, shadows |

## Implementation Order
1. Fix auto-lock (visibility change bug) — quick win
2. Smart merge import — critical data safety fix
3. Undo delete with toast — UX improvement
4. Document view/remove/replace — feature completion
5. Export instructions dialog — UX improvement
6. Biometric unlock integration — major feature
7. UI polish pass — visual refinement

