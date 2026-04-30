# Workbook Settings Block Example

## Block Format

| `workbook-settings` | | | |
|---|---|---|---|
| `Instructions` | | | |
| `Label` | `Key` | `Placeholder` | `Type` |

- **Instructions row** — Single merged cell at the top; renders as a full-width paragraph
- **Properties**
  - **Label** — Display name shown to user. Leave blank to hide the field.
  - **Key** — Storage key and placeholder name (used as `{key}` in page content)
  - **Placeholder** — Default text shown for inputs, or a function expression for computed fields (starts with `@`)
  - **Type** — Optional field type. Available types:
    - `text` (default) — stores value as-is
    - `relative-path('/prefix')` — strips the given prefix before storing; display/edit restores it. Example: `relative-path('/content')` stores `2026/08/mysite` while showing `/content/2026/08/mysite` to the user

---

## Sample block configuration in a workbook page

Add this block to your page content to collect workbook settings:

### Basic example with input and computed fields

| `workbook-settings` | | | |
|---|---|---|---|
| `Enter Content Root and click Save.` | | | |
| `Content Root` | `contentRoot` | `/content/2026/08/rapidebear12345` | `relative-path('/content')` |
| `Site Name` | `siteName` | `@split({contentRoot}, '/').last` | |

- **Properties**
  - **Content Root** — Label shown to user, key is `contentRoot`, user provides the path
    - `relative-path('/content')` type strips `/content` before storing so `{contentRoot}` resolves to the path without it
  - **Site Name** — Label shown, key is `siteName`, automatically computed from contentRoot by splitting on `/` and taking the last segment
    - If contentRoot is `2026/08/rapidebear12345`, siteName becomes `rapidebear12345`
    - If contentRoot is invalid or can't be split, siteName gracefully returns empty string

In this example, if user inputs `/content/2026/08/rapidebear12345`, the following keys with be available:

| | |
|---|---|
| `{contentRoot}` | `2026/08/rapidebear12345` |
| `{siteName}` | `rapidebear12345` |

---

### Multi-setting example with hidden fields

| `workbook-settings` | | | |
|---|---|---|---|
| `Configure your lab environment settings below.` | | | |
| `Content Root` | `contentRoot` | `/content/2026/08/rapidebear12345` | `relative-path('/content')` |
| `Site Name` | `siteName` | `@split({contentRoot}, '/').last` | |
| `API Endpoint` | `apiEndpoint` | `https://api.adobelabs.dev` | |
| `Repository` | `repository` | `https://github.com/adobe/summit-labs` | |
| `Tenant ID` | `tenantId` | `my-lab-tenant` | |
| | `internalConfig` | `@concat({tenantId}, '-config')` | |

**Notes:**
- `internalConfig` has no label, so it's hidden (not displayed to users). Its value is still computed and available as `{internalConfig}` placeholder.
- If you omit a label for any field, it becomes a hidden internal field

When saved, provides placeholders:
- `{contentRoot}` → `2026/08/rapidebear12345` (user input, with trimmed `/content`)
- `{siteName}` → `rapidebear12345` (computed)
- `{apiEndpoint}` → `https://api.adobelabs.dev` (user input)
- `{repository}` → `https://github.com/adobe/summit-labs` (user input)
- `{tenantId}` → `my-lab-tenant` (user input)
- `{internalConfig}` → `my-lab-tenant-config` (computed, internal)

---

## Field Types

### Input Fields
Regular rows where the content is not a function expression starting with `@`. User sees an input field:
- User enters value
- Value is persisted to localStorage with key `workbook-setting-{key}`
- Value becomes available as a placeholder `{key}`
- Read-only display after save; click Edit to modify
- The optional `Type` column can change how the value is stored and displayed
  - `relative-path('/prefix')` stores the value without the given prefix, while still showing the full prefixed value in the UI
  - Example: entering `/content/2026/08/example` with `relative-path('/content')` displays `/content/2026/08/example` in the workbook but exposes `{contentRoot}` as `2026/08/example`

Examples (modern format):
- `Content Root | contentRoot | /content/2026/08/example | relative-path('/content')`
- `API Endpoint | apiEndpoint | https://api.example.com`
- `Repository | repository | https://github.com/example/repo`

### Computed Fields
Rows where the content starts with `@` followed by a function expression. No input field shown; value is auto-calculated:
- Expression can reference input field values using `{fieldName}` syntax
- Result is computed when inputs are saved
- Computed value is persisted and available as a placeholder
- Gracefully returns empty string on error
- Display as read-only (cannot be edited directly)

Examples (modern format):
- `Site Name | siteName | @split({contentRoot}, '/').last`
- `First Segment | firstSegment | @split({contentRoot}, '/').first`
- `| internalKey | @concat({apiEndpoint}, '/config')` ← Hidden computed field (no label)

---

## Available Functions

### `split(value, delimiter)`
Splits a string by delimiter and returns an object:
- `.first` — first segment
- `.last` — last segment (for extracting site name from paths)
- `.all` — array of all segments

**Example:** `@split({contentRoot}, '/').last`

More functions can be added to the `FUNCTIONS` registry in `scripts/workbook-settings.js`.

---

## UI Behavior

### Saved state (read-only)
- Fields display as plain text (no input styling)
- **Edit** button visible (only if settings exist)
- **Reset** button visible (only if settings exist)

### Edit state
- Input fields become interactive
- **Save** button applies changes, recomputes fields, and reloads page
- **Cancel** button reverts unsaved changes without saving

### Fresh form (no saved settings)
- Automatically starts in edit mode
- Input fields ready for entry
- **Save** and **Cancel** buttons visible
