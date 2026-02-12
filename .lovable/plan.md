

## Phone Number Validation for Ghana International Format

Add client-side validation to the registration form's phone field to ensure numbers follow the `233XXXXXXXXX` format (Ghana international format, 12 digits total).

### Changes

**1. `src/pages/EventDetail.tsx`**
- Add a helper function to validate and normalize Ghana phone numbers
- Accept common input formats: `0XXXXXXXXX` (local), `+233XXXXXXXXX`, `233XXXXXXXXX`
- Auto-strip leading `+` or `0` prefix and prepend `233` if needed
- Show inline validation error message below the phone input
- Prevent form submission if phone is invalid
- Update the phone input with a placeholder showing the expected format (e.g., `233XXXXXXXXX`)

### Validation Logic

```text
Input: "0241234567"   -> Normalized: "233241234567" (valid)
Input: "+233241234567" -> Normalized: "233241234567" (valid)
Input: "233241234567"  -> Normalized: "233241234567" (valid)
Input: "1234"          -> Error: "Enter a valid Ghana phone number (233XXXXXXXXX)"
```

### Technical Details

- Add a `normalizeGhanaPhone` function that strips `+` and leading `0`, prepends `233` if needed, and validates the result is exactly 12 digits starting with `233`
- Add a `phoneError` state string to show validation feedback
- Validate on blur and on submit
- Normalize the phone number before sending to the backend (so SMS and payment always receive `233XXXXXXXXX`)
- No new dependencies required

