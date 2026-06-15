# DigiEmu Secure v0.7 Secure Studio Profile

This document defines the reference user interface for DigiEmu Secure, establishing standard screens, user flows, and interaction patterns for both minimal and enterprise deployments.

## Purpose

The Secure Studio profile provides:

- A reference UI implementation blueprint
- Consistent user experience across deployments
- Clear separation between MVP and enterprise features
- Integration patterns with CLI and API backends
- Vendor-neutral design specifications

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SECURE STUDIO ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     PRESENTATION LAYER                              │   │
│  │                                                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Dashboard│ │  Verify  │ │   Sign   │ │ Bundle   │ │ Reports  │  │   │
│  │  │          │ │          │ │          │ │ Explorer │ │          │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  │                                                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                          │   │
│  │  │  Issuer  │ │ Settings │ │  Help    │                          │   │
│  │  │ Registry │ │          │ │          │                          │   │
│  │  └──────────┘ └──────────┘ └──────────┘                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     APPLICATION LAYER                               │   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  Evidence   │  │ Verification│  │    Audit    │                  │   │
│  │  │   Manager   │  │   Engine    │  │   Logger    │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      SERVICE LAYER                                  │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  DigiEmu Secure API (v0.6 API Profile)                      │   │   │
│  │  │  - POST /sign                                               │   │   │
│  │  │  - POST /verify                                             │   │   │
│  │  │  - POST /bundle/create                                      │   │   │
│  │  │  - POST /bundle/verify                                      │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  DigiEmu Secure CLI (v0.6 CLI Profile)                      │   │   │
│  │  │  - secure sign                                              │   │   │
│  │  │  - secure verify                                            │   │   │
│  │  │  - secure bundle                                            │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Screen Definitions

### Screen 1: Dashboard

**Purpose:** High-level overview of verification activity and system status.

**MVP Version:**

```
┌─────────────────────────────────────────────────────────────────┐
│  DigiEmu Secure Studio              [Settings] [Help] [Logout] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RECENT ACTIVITY                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  Today                                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ✅ 3 evidence items verified                                ││
│  │  🔒 2 evidence items signed                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  QUICK ACTIONS                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │    [Verify]     │  │     [Sign]      │                     │
│  │   Evidence      │  │   Evidence      │                     │
│  └─────────────────┘  └─────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Enterprise Version:**

Adds:
- Statistics cards (total verifications, success rate, active issuers)
- Chart of verification activity over time
- Alert panel for failed verifications
- Organization selector (multi-tenant)

**User Actions:**

| Action | Trigger | Result |
|--------|---------|--------|
| Verify Evidence | Click [Verify] | Navigate to Verify screen |
| Sign Evidence | Click [Sign] | Navigate to Sign screen |
| View Settings | Click [Settings] | Open settings panel |
| View Help | Click [Help] | Open help documentation |

### Screen 2: Verify Evidence

**Purpose:** Upload and verify evidence authenticity.

**MVP Version:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                    Verify Evidence        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: SELECT EVIDENCE                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │         [Drag and drop evidence file here]                  ││
│  │                                                             ││
│  │                   or                                        ││
│  │                                                             ││
│  │              [Browse Files]                                 ││
│  │                                                             ││
│  │  Supported: .json, .zip, .bundle                           ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  STEP 2: VERIFY                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Receipt ID: [________________]  [Or use uploaded file]       ││
│  │                                                             ││
│  │  [Verify Evidence]                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Verification Result:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                        Verification Result             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │           ✅ VERIFICATION SUCCESSFUL                        ││
│  │                                                             ││
│  │  This evidence is authentic and has not been modified.      ││
│  │                                                             ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                             ││
│  │  Signed by: GazaCare Field Operations                        ││
│  │  Date: January 15, 2026 at 14:32 UTC                       ││
│  │  Receipt ID: RCPT-2026-0847-001-A7F3                        ││
│  │                                                             ││
│  │  Verified: Just now                                         ││
│  │                                                             ││
│  │  [View Details] [Download Report] [Add to Records]        ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Enterprise Version:**

Adds:
- Batch upload (multiple files)
- Registry selector (if multiple registries)
- Trust score display from TBN
- Verification queue for large batches

**User Actions:**

| Action | Trigger | Result |
|--------|---------|--------|
| Upload File | Drag/drop or browse | File staged for verification |
| Enter Receipt ID | Type in field | Alternative to file upload |
| Verify | Click [Verify Evidence] | Verification process starts |
| View Details | Click [View Details] | Expand technical details |
| Download Report | Click [Download Report] | PDF/JSON report download |
| Add to Records | Click [Add to Records] | Save to audit trail |

### Screen 3: Sign Evidence

**Purpose:** Create cryptographically protected evidence.

**MVP Version:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                     Sign Evidence          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: SELECT EVIDENCE                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │         [Drag and drop evidence file here]                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  STEP 2: CONFIGURE                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Sign as:  [Your Organization ▼]                            ││
│  │                                                             ││
│  │  Evidence type: [Triage Report ▼]                           ││
│  │                                                             ││
│  │  Description: [Optional description of this evidence        ]││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  STEP 3: PROTECT                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Ready to protect: "Patient Triage Report"                  ││
│  │                                                             ││
│  │  This will create a cryptographically signed receipt.       ││
│  │                                                             ││
│  │  [Protect Evidence]                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Success Result:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                        Evidence Protected              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │              ✅ EVIDENCE PROTECTED                          ││
│  │                                                             ││
│  │  Your evidence is now cryptographically secured.          ││
│  │                                                             ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                             ││
│  │  Receipt ID: RCPT-2026-0847-001-A7F3                        ││
│  │                                                             ││
│  │  ⚠️  Save this ID - you will need it to verify this         ││
│  │      evidence in the future.                                  ││
│  │                                                             ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                             ││
│  │  [Download Receipt] [Email Copy] [Create Bundle]            ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Enterprise Version:**

Adds:
- Key selection (if multiple keys)
- Retention policy selector
- Custom metadata fields
- Workflow integration (send to next step)

**User Actions:**

| Action | Trigger | Result |
|--------|---------|--------|
| Upload Evidence | Drag/drop | File staged |
| Select Organization | Dropdown | Issuer set |
| Enter Description | Type | Metadata added |
| Protect Evidence | Click button | Signing process |
| Download Receipt | Click button | Receipt file download |
| Email Copy | Click button | Email dialog |
| Create Bundle | Click button | Navigate to Bundle Explorer |

### Screen 4: Bundle Explorer

**Purpose:** Create and manage evidence bundles.

**MVP Version:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                    Bundle Explorer         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CREATE NEW BUNDLE                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  Select evidence to include:                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ☑ Patient Triage Report (Jan 15, 2026)                   ││
│  │    Receipt: RCPT-2026-0847-001-A7F3                        ││
│  │                                                             ││
│  │  ☑ Vitals Log (Jan 15, 2026)                                ││
│  │    Receipt: RCPT-2026-0847-002-B3E1                        ││
│  │                                                             ││
│  │  ☐ Discharge Summary (Jan 16, 2026) - Not verified         ││
│  │                                                             ││
│  │  [+ Add More Evidence]                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Bundle Name: [Patient Case 0847 - January 2026              ]│
│                                                                 │
│  [Create Bundle]                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Bundle Created:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                       Evidence Bundle Created          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │           ✅ EVIDENCE PACKAGE CREATED                       ││
│  │                                                             ││
│  │  Bundle ID: BNDL-2026-0847-001-A7F3-9X2M                    ││
│  │                                                             ││
│  │  Contains:                                                  ││
│  │  • 2 evidence items                                         ││
│  │  • Cryptographic signatures                                 ││
│  │  • Verification reports                                     ││
│  │                                                             ││
│  │  This package is ready for sharing with auditors.           ││
│  │                                                             ││
│  │  [Download Bundle] [Share Securely] [Add to Archive]        ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Enterprise Version:**

Adds:
- Bundle templates (predefined sets)
- Bulk import from search
- Retention policy per bundle
- Sharing permissions

### Screen 5: Verification Reports

**Purpose:** Review verification history and audit trails.

**MVP Version:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                   Verification Reports      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [All Time ▼]  [All Results ▼]        [Export Report]         │
│                                                                 │
│  JANUARY 2026                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Jan 15  14:35                                  ✅ Success   ││
│  │  Patient Triage Report                                       ││
│  │  Issuer: GazaCare Field Operations                           ││
│  │  [View Details]                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Jan 15  16:20                                  ✅ Success   ││
│  │  Treatment Decision                                          ││
│  │  Issuer: GazaCare Field Operations                           ││
│  │  [View Details]                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Jan 14  09:15                                  ❌ Failed   ││
│  │  Vitals Log                                                  ││
│  │  Issuer: External System                                     ││
│  │  [View Details]  [Report Issue]                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Report Detail:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                        Verification Details            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ VERIFICATION SUCCESSFUL                                     │
│                                                                 │
│  Evidence: Patient Triage Report                                │
│  Receipt ID: RCPT-2026-0847-001-A7F3                           │
│                                                                 │
│  VERIFICATION CHECKS                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ✓ Bundle structure valid                                       │
│  ✓ Version supported                                            │
│  ✓ Evidence properly formatted                                  │
│  ✓ Hash fingerprint verified                                    │
│  ✓ Issuer identified: GazaCare Field Operations                 │
│  ✓ Signing key valid                                            │
│  ✓ Signature authentic                                          │
│                                                                 │
│  Verified at: Jan 15, 2026 14:35 UTC                            │
│  By: Internal Audit System                                      │
│                                                                 │
│  [Download Full Report] [Print]                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Enterprise Version:**

Adds:
- Date range selector with calendar
- Advanced filters (by issuer, by result, by user)
- Statistics summary (success rate, trends)
- Bulk export capabilities

### Screen 6: Issuer Registry Viewer

**Purpose:** Browse and inspect registered issuers.

**MVP Version:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                   Issuer Registry          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Search issuers...                                         ] │
│                                                                 │
│  REGISTERED ISSUERS                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  GazaCare Field Operations                                   ││
│  │  ID: org:gazacare:field-ops:triage-system                    ││
│  │  Status: ✅ Active                                           ││
│  │  Keys: 1 active                                              ││
│  │  [View Details]                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Example Healthcare Division                                 ││
│  │  ID: org:example:division:service                             ││
│  │  Status: ✅ Active                                           ││
│  │  Keys: 2 active, 1 expired                                   ││
│  │  [View Details]                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Issuer Detail:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                        Issuer Details                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  GazaCare Field Operations                                      │
│  ID: org:gazacare:field-ops:triage-system                       │
│                                                                 │
│  STATUS                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ✅ Active and verified                                         │
│                                                                 │
│  SIGNING KEYS                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  signing-key-2026-q1                                       ││
│  │  Algorithm: Ed25519                                          ││
│  │  Status: Active                                              ││
│  │  Valid: Jan 1, 2026 → Jun 30, 2026                         ││
│  │  [View Public Key]                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  EVIDENCE SIGNED                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  1,247 receipts in last 30 days                                │
│                                                                 │
│  [View All Evidence]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Enterprise Version:**

Adds:
- Key rotation history
- Trust score from TBN
- Revocation records
- Issuer management (add/edit for admins)

## UI Flow Diagrams

### Primary Flow: Verify Evidence

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Dashboard│────▶│  Verify  │────▶│ Upload/  │────▶│ Verify   │
│          │     │  Screen  │     │ Enter ID │     │  Action  │
└─────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              │                        │                        │
                              ▼                        ▼                        ▼
                         ┌─────────┐            ┌─────────┐            ┌─────────┐
                         │ Success │            │  Fail   │            │Incomplete│
                         │ Result  │            │ Result  │            │  Result  │
                         └────┬────┘            └────┬────┘            └────┬────┘
                              │                        │                        │
                              ▼                        ▼                        ▼
                         ┌─────────┐            ┌─────────┐            ┌─────────┐
                         │Download │            │ Report  │            │ Retry   │
                         │ Report  │            │  Issue  │            │ Option  │
                         └─────────┘            └─────────┘            └─────────┘
```

### Primary Flow: Sign Evidence

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Dashboard│────▶│   Sign   │────▶│  Upload  │────▶│ Configure│────▶│ Protect  │
│          │     │  Screen  │     │  File    │     │  Options │     │  Action  │
└─────────┘     └──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                                        │
                                                                        ▼
                                                                   ┌─────────┐
                                                                   │ Success │
                                                                   │  Result │
                                                                   └────┬────┘
                                                                        │
                                                                        ▼
                                                                   ┌─────────┐
                                                                   │ Download│
                                                                   │ Receipt │
                                                                   └─────────┘
```

## MVP vs Enterprise Feature Matrix

| Feature | MVP | Enterprise | Notes |
|---------|-----|------------|-------|
| **Dashboard** | | | |
| Recent activity | ✅ | ✅ | Basic list |
| Statistics cards | ❌ | ✅ | Counts, rates |
| Activity charts | ❌ | ✅ | Time-series |
| Alert panel | ❌ | ✅ | Failed verifications |
| Multi-tenant selector | ❌ | ✅ | Organization switch |
| **Verify** | | | |
| Single file upload | ✅ | ✅ | Drag/drop |
| Batch upload | ❌ | ✅ | Multiple files |
| Receipt ID entry | ✅ | ✅ | Alternative input |
| Registry selector | ❌ | ✅ | Multiple registries |
| Trust score display | ❌ | ✅ | TBN integration |
| **Sign** | | | |
| Single evidence | ✅ | ✅ | One at a time |
| Organization selector | ✅ | ✅ | Dropdown |
| Key selector | ❌ | ✅ | If multiple keys |
| Retention policy | ❌ | ✅ | Policy dropdown |
| Custom metadata | ❌ | ✅ | Configurable fields |
| **Bundle** | | | |
| Manual selection | ✅ | ✅ | Checkbox list |
| Bundle templates | ❌ | ✅ | Predefined sets |
| Bulk search/add | ❌ | ✅ | Search and add |
| Sharing permissions | ❌ | ✅ | Access control |
| **Reports** | | | |
| Simple list | ✅ | ✅ | Filtered list |
| Date filter | ✅ | ✅ | Dropdown |
| Advanced filters | ❌ | ✅ | Multi-criteria |
| Statistics | ❌ | ✅ | Aggregations |
| Bulk export | ❌ | ✅ | Multiple formats |
| **Registry** | | | |
| View issuers | ✅ | ✅ | Read-only list |
| View keys | ✅ | ✅ | Basic info |
| Key rotation history | ❌ | ✅ | Timeline view |
| Trust scores | ❌ | ✅ | TBN display |
| Manage issuers | ❌ | ✅ | Admin only |

## Relationship to CLI and API

### Secure Studio → CLI

| UI Action | CLI Command |
|-----------|-------------|
| Verify single file | `secure verify <file>` |
| Sign evidence | `secure sign <file> --issuer <id> --key-id <key>` |
| Create bundle | `secure bundle create --evidence <files>` |
| Validate registry | `secure registry validate <file>` |

**Pattern:** UI provides form → CLI executes → UI displays result

### Secure Studio → API

| UI Screen | API Endpoints |
|-----------|---------------|
| Dashboard | `GET /stats`, `GET /activity` |
| Verify | `POST /verify`, `POST /bundle/verify` |
| Sign | `POST /sign`, `POST /bundle/create` |
| Bundle Explorer | `POST /bundle/create` |
| Reports | `GET /verifications`, `GET /reports/{id}` |
| Registry | `GET /issuer/{id}`, `GET /trust-anchor/{id}` |

**Pattern:** UI makes HTTP requests → API processes → UI renders response

## Implementation Guidelines

### Frontend Technology

| Concern | Recommendation | Rationale |
|---------|-----------------|-----------|
| Framework | React/Vue/Svelte | Component-based, accessible |
| State Management | Context API / Pinia | Sufficient for scope |
| Styling | Tailwind CSS / CSS Modules | Maintainable, accessible |
| Icons | Lucide / Heroicons | Clean, accessible |
| Charts | Recharts / Chart.js | For enterprise stats |

### Backend Integration

| Pattern | Implementation |
|---------|----------------|
| API Client | Fetch/Axios with interceptors |
| Error Handling | Global error boundary + toast notifications |
| Loading States | Skeleton screens + progress indicators |
| Caching | SWR/React Query for registry data |

### Accessibility Requirements

| Standard | Implementation |
|----------|----------------|
| WCAG 2.1 | Level AA compliance |
| Keyboard Navigation | Full tab navigation |
| Screen Reader | ARIA labels, live regions |
| Color Contrast | 4.5:1 minimum |
| Focus Indicators | Visible focus states |

## Summary

| Aspect | MVP | Enterprise |
|--------|-----|------------|
| **Screens** | 6 core | 6 core + admin |
| **Features** | Essential | Full-featured |
| **Integration** | CLI or API | API preferred |
| **Target Users** | Individual | Organization |
| **Deployment** | Local/Single | Cloud/Multi-tenant |

Secure Studio provides an intuitive interface for DigiEmu Secure, making cryptographic evidence protection accessible to users regardless of technical expertise.
