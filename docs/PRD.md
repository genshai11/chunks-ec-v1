# CHUNKS ECONOMY - Product Requirements Document (PRD)

> Last Updated: 2026-02-18
> Owner: Product + Engineering
> Status: Draft

## 1) Product Context
- **Problem statement:** _Fill in the user/business problem this project solves._
- **Target users:** _Primary user personas._
- **Primary outcome:** _What success looks like for users and business._

## 2) Scope
### In Scope
- _Feature/module A_
- _Feature/module B_

### Out of Scope
- _Explicit exclusions to prevent scope creep_

## 3) Functional Breakdown
| Function | Description | Inputs | Outputs | Owner |
|---|---|---|---|---|
| F-01 | _Core function_ | _input contract_ | _expected output_ | _team_ |
| F-02 | _Secondary function_ | _input contract_ | _expected output_ | _team_ |

## 4) Business Rules (Detailed Logic)
| Rule ID | Rule Description | Condition | Logic | Failure Handling |
|---|---|---|---|---|
| BR-01 | _Rule name_ | _when this applies_ | _if/then logic with thresholds_ | _fallback/error behavior_ |
| BR-02 | _Rule name_ | _when this applies_ | _formula/state-transition_ | _fallback/error behavior_ |

## 5) Skills Flow & Logic
### 5.1 Skill-to-Function Mapping
| Skill/Agent Capability | Trigger | Executes On | Output | Guardrails |
|---|---|---|---|---|
| _Skill A_ | _User action/event_ | _Function IDs_ | _Result artifact_ | _validation/limits_ |

### 5.2 Execution Flow
1. **Intent capture** - map request/event to function (F-*).
2. **Rule evaluation** - apply business rules (BR-*) before execution.
3. **Skill execution** - run selected skill/automation path.
4. **Validation** - verify output, enforce constraints, log decision.
5. **User feedback** - return result + reason (when blocked/adjusted).

### 5.3 Decision Logic (Pseudo)
`	ext
if trigger matches workflow:
  evaluate BR-* in priority order
  if all mandatory rules pass:
    execute mapped skill/function
  else:
    return fallback + remediation step
`",
",

- **Data sources:** _DB tables/APIs/files_
- **External integrations:** _service + purpose_
- **Critical dependencies:** _libraries/services_

## 7) Non-Functional Requirements
- **Performance:** _latency/throughput targets_
- **Reliability:** _uptime/retry policy_
- **Security:** _authz/authn + data constraints_
- **Observability:** _logs/metrics/traces_

## 8) Acceptance Criteria
- [ ] All core functions (F-*) implemented and testable.
- [ ] All business rules (BR-*) documented with explicit logic.
- [ ] Skills flow mapped to real triggers and validated paths.
- [ ] Edge cases and failure paths covered.

## 9) Open Questions
- _Question 1_
- _Question 2_

## 10) Change Log
- **2026-02-18**: Initialized PRD template with function logic, business rules, and skills flow sections.
