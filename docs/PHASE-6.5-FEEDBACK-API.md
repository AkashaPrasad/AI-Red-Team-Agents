# Phase 6.5 — Feedback API Design

> **Status**: COMPLETE  
> **Module**: Results Module (Feedback sub-domain)  
> **Route file**: `backend/app/api/v1/feedback.py`  
> **Schema file**: `backend/app/api/schemas/feedback.py`  
> **Auth**: All endpoints require JWT. Feedback is scoped through experiments — users can only submit feedback for test cases belonging to experiments within their organization's projects.

---

## 1. Endpoints

| # | Method | Path | Summary | Auth | Notes |
|---|--------|------|---------|------|-------|
| 1 | `POST` | `/api/v1/experiments/{experiment_id}/logs/{test_case_id}/feedback` | Submit or update feedback | JWT (member+) | Upsert — one per (test_case, user) |
| 2 | `DELETE` | `/api/v1/experiments/{experiment_id}/logs/{test_case_id}/feedback` | Remove own feedback | JWT (member+) | Only deletes own |
| 3 | `GET` | `/api/v1/experiments/{experiment_id}/feedback-summary` | Feedback coverage stats | JWT (member+) | Aggregate counts |

---

## 2. Request Schemas

### 2.1 `FeedbackSubmit` — `POST .../feedback`

```python
class FeedbackSubmit(BaseModel):
    vote: str                          # Literal["up", "down"]
    correction: str | None = None      # Literal["pass", "low", "medium", "high"] | None
    comment: str | None = None         # Max 150 chars
```

**Validation rules:**

| Field | Rule |
|-------|------|
| `vote` | Required, must be `"up"` or `"down"` |
| `correction` | Optional. Only allowed when `vote == "down"`. Must be one of `"pass"`, `"low"`, `"medium"`, `"high"`. Represents the user's corrected verdict/severity. |
| `comment` | Optional, max 150 chars. Stripped of leading/trailing whitespace. |

**Cross-field constraints:**
- If `vote == "up"` and `correction` is provided → 400 `CORRECTION_NOT_ALLOWED` (thumbs-up means you agree with the verdict — no correction needed)
- If `vote == "down"` and `correction` is `null` → accepted (user disagrees but doesn't specify the correction)

---

## 3. Response Schemas

### 3.1 `FeedbackResponse` — returned by POST

```python
class FeedbackResponse(BaseModel):
    id: UUID
    test_case_id: UUID
    user_id: UUID
    vote: str
    correction: str | None
    comment: str | None
    created_at: datetime
    updated_at: datetime
```

### 3.2 `FeedbackSummaryResponse` — returned by GET .../feedback-summary

```python
class FeedbackSummaryResponse(BaseModel):
    experiment_id: UUID
    total_test_cases: int              # Total test cases in the experiment
    total_with_feedback: int           # Test cases with at least one feedback entry
    coverage_percentage: float         # 0.0–100.0
    representative_total: int          # Test cases marked as representative
    representative_with_feedback: int  # Representatives with at least one feedback
    representative_coverage: float     # 0.0–100.0
    vote_breakdown: VoteBreakdown
    my_feedback_count: int             # Current user's feedback count
```

### 3.3 `VoteBreakdown`

```python
class VoteBreakdown(BaseModel):
    thumbs_up: int
    thumbs_down: int
    corrections: CorrectionBreakdown
```

### 3.4 `CorrectionBreakdown`

```python
class CorrectionBreakdown(BaseModel):
    to_pass: int                       # Corrections changing verdict to pass
    to_low: int                        # Corrections changing severity to low
    to_medium: int                     # Corrections changing severity to medium
    to_high: int                       # Corrections changing severity to high
```

---

## 4. Error Responses

| Endpoint | Status | Code | Condition |
|----------|--------|------|-----------|
| `POST .../feedback` | 404 | `EXPERIMENT_NOT_FOUND` | Experiment doesn't exist or user lacks org access |
| `POST .../feedback` | 404 | `TEST_CASE_NOT_FOUND` | Test case doesn't exist or doesn't belong to this experiment |
| `POST .../feedback` | 400 | `EXPERIMENT_NOT_COMPLETED` | Experiment status is not `"completed"` (feedback only on finished experiments) |
| `POST .../feedback` | 400 | `CORRECTION_NOT_ALLOWED` | `vote == "up"` with a `correction` value |
| `POST .../feedback` | 422 | (Pydantic) | Schema validation failure |
| `DELETE .../feedback` | 404 | `EXPERIMENT_NOT_FOUND` | Experiment doesn't exist or user lacks org access |
| `DELETE .../feedback` | 404 | `TEST_CASE_NOT_FOUND` | Test case doesn't exist or doesn't belong to this experiment |
| `DELETE .../feedback` | 404 | `FEEDBACK_NOT_FOUND` | Current user has no feedback on this test case |
| `GET .../feedback-summary` | 404 | `EXPERIMENT_NOT_FOUND` | Experiment doesn't exist or user lacks org access |
| Any | 401 | `UNAUTHORIZED` | Missing/invalid JWT |

---

## 5. Endpoint Behaviour Detail

### 5.1 `POST /api/v1/experiments/{experiment_id}/logs/{test_case_id}/feedback`
1. Query `Experiment` by `experiment_id`
2. Verify experiment's project belongs to user's org → 404 if not
3. Verify `experiment.status == "completed"` → 400 `EXPERIMENT_NOT_COMPLETED` if not
4. Query `TestCase` by `test_case_id`, verify `experiment_id` matches → 404 if not
5. Validate request body (`FeedbackSubmit`):
   - Cross-field: `vote == "up"` + `correction` present → 400
6. **Upsert** logic (enforced by UQ constraint `uq_feedback_testcase_user`):
   - Check if `Feedback` record exists for `(test_case_id, current_user.id)`
   - If exists → **update** the existing record (vote, correction, comment, updated_at)
   - If not exists → **create** new record
7. Return `FeedbackResponse`:
   - 201 Created (new feedback)
   - 200 OK (updated existing feedback)
8. Audit log: `feedback.submitted` (includes test_case_id, vote)

### 5.2 `DELETE /api/v1/experiments/{experiment_id}/logs/{test_case_id}/feedback`
1. Query `Experiment` by `experiment_id`
2. Verify experiment's project belongs to user's org → 404 if not
3. Query `TestCase` by `test_case_id`, verify `experiment_id` matches → 404 if not
4. Find `Feedback` record for `(test_case_id, current_user.id)` → 404 `FEEDBACK_NOT_FOUND` if not
5. Delete the record
6. Return 204 No Content
7. Audit log: `feedback.deleted`

### 5.3 `GET /api/v1/experiments/{experiment_id}/feedback-summary`
1. Query `Experiment` by `experiment_id`
2. Verify experiment's project belongs to user's org → 404 if not
3. Compute aggregates via SQL:
   - `total_test_cases`: COUNT of test cases in experiment
   - `total_with_feedback`: COUNT DISTINCT of test_case_id in feedback table for this experiment
   - `coverage_percentage`: `(total_with_feedback / total_test_cases) * 100`
   - `representative_total`: COUNT of test cases where `is_representative == true`
   - `representative_with_feedback`: COUNT DISTINCT of representative test_case_ids with feedback
   - `representative_coverage`: `(representative_with_feedback / representative_total) * 100`
   - `vote_breakdown`: COUNT grouped by vote + correction values
   - `my_feedback_count`: COUNT of feedback records by current user for this experiment
4. Return `FeedbackSummaryResponse`

---

## 6. Upsert Semantics

The feedback model enforces a **unique constraint** on `(test_case_id, user_id)`. This means:

```
First POST  → INSERT → 201 Created
Second POST → UPDATE → 200 OK (user changed their mind)
DELETE      → DELETE → 204 No Content
Third POST  → INSERT → 201 Created (re-submit after delete)
```

**Why upsert instead of separate create/update endpoints:**
- The user workflow is simple: click thumbs-up/down. They don't care whether it's a create or update.
- The UQ constraint guarantees data integrity regardless of race conditions.
- Frontend sends the same request shape every time — no conditional logic needed.

---

## 7. Feedback Workflow (Frontend Integration)

```
User views Experiment Logs
    │
    ├── Quick Confirm (Thumbs Up 👍)
    │   POST .../feedback  { vote: "up" }
    │   → Optimistic UI update (React Query)
    │   → Badge shows ✓ on the log entry
    │
    ├── Disagree (Thumbs Down 👎)
    │   → Opens correction modal
    │   POST .../feedback  { vote: "down", correction: "high", comment: "Clearly unsafe" }
    │   → Optimistic UI update
    │   → Badge shows ✗ on the log entry
    │
    └── Change Mind
        POST .../feedback  { vote: "up" }  (overwrites previous down-vote)
        → UI updates
```

**Recommended review workflow:**
1. Toggle "Representatives Only" filter → see ~50–100 key samples
2. Review each representative → thumbs up or thumbs down with correction
3. Check feedback-summary → target 80%+ representative coverage
4. Optionally browse full logs for edge cases

---

## 8. Security & Access Control

| Concern | Rule |
|---------|------|
| **Org scoping** | Feedback is accessed through experiments. The experiment's project must belong to the user's org. |
| **Role enforcement** | All feedback endpoints → `member` or `admin`. Any org member can submit feedback. |
| **Own-data only** | POST creates/updates only the current user's feedback. DELETE removes only the current user's feedback. Users cannot modify or delete other users' feedback. |
| **Completed experiments only** | Feedback can only be submitted for experiments with `status == "completed"`. Prevents feedback on in-progress or pending experiments. |
| **Optimistic update safety** | If the optimistic UI update fails (server rejects), React Query rolls back the UI state automatically. |
| **Audit trail** | Submit and delete actions generate `AuditLog` entries. |
| **Rate limiting** | Standard API rate limit (60 req/min). No additional throttling — feedback is lightweight. |

---
