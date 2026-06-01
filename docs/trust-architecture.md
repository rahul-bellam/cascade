# Trust Architecture

## Practice / Assess Data Boundary

Cascade maintains a strict separation between two data domains:

| Domain | Purpose | Data Stored |
|--------|---------|-------------|
| **Practice** | Learning, skill development, personal growth | Lessons, snippets, toolkit, Cascade sessions, refactor sessions, Arena duels, League standings, Personal Failure Profile |
| **Assess** | Hiring evaluations, calibrated scoring | Assessment sessions, reasoning scores, implementation scores, final reports |

### Core Rule

**Practice profiles are never shared with Assess without explicit, revocable opt-in.**

- `share_with_assess` (default: `false`) — when enabled, the user's concern mastery, instinct biases, and recurring chains are visible to assessors for calibration
- `share_calibration_data` (default: `false`) — when enabled, the user's raw signal-layer telemetry is included in the calibration dataset

### Enforcement

The data access layer enforces this boundary:

1. All telemetry ingested via the signal layer carries a `mode` tag (`practice` | `assess`)
2. Profile aggregation in the insight engine filters by mode; Assess-mode queries never see Practice-mode data unless `share_with_assess == true`
3. Data export and delete operations include all profile data across both domains

## Consent Flow

Users control their data through the `/api/v1/user/consent` endpoints:

- `GET /api/v1/user/consent` — view current consent preferences
- `PUT /api/v1/user/consent` — update consent (share with Assess, share calibration data, data retention period)
- `POST /api/v1/user/data/export` — download all personal data
- `DELETE /api/v1/user/data` — delete all personal data

## Data Retention

| Data Type | Retention | Rationale |
|-----------|-----------|-----------|
| Active profiles | Until account deletion | User needs profile to use the product |
| Session history | Configurable (default 365 days) | Needed for Personal Failure Profile and skill tracking |
| Telemetry logs | Configurable (default 365 days) | Needed for bias detection and chain analysis |
| Assess reports | Per client contract (min 2 years) | Legal requirement for hiring decisions |

## Security

- All secrets in environment variables or secrets manager (never in code)
- JWT tokens signed with HS256, 1-hour expiry
- Rate limiting on all public APIs (100 req/min/user)
- TLS 1.3 enforced for all external endpoints in production
