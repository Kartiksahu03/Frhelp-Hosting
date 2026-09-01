# FrHelp AI Revenue Recovery - Buildathon Guide

## Complete Story

A student tries to purchase a course using Razorpay. The payment fails. FrHelp captures the real Razorpay failure fields and stores them. The same failure is processed by either a baseline strategy or the AI strategy. The AI can choose only one bounded action. JavaScript validates that action before execution. Recovery outcomes are recorded and the instructor dashboard compares baseline and AI recovered revenue.

## Experiment

Run two 200-attempt batches with equivalent scenario distribution:

```bash
cd server
node scripts/runExperiment.js baseline buildathon-baseline-001
node scripts/runExperiment.js ai buildathon-ai-001
```

The runner creates a deterministic 200-scenario plan for each strategy. It does not invent Razorpay payments, failures, or recovery outcomes. Complete each payment through supported Razorpay Test Mode flows and let the application capture actual returned failure data.

## Fair Comparison

- Baseline: same action for every eligible failure: `send_reminder`.
- AI: reads only real `error_code`, `error_reason`, `error_description`, `error_source`, and `error_step`.
- AI can output only: `retry_now`, `retry_later`, `send_upi_link`, `send_reminder`, or `do_nothing`.
- Code validates every action.
- Dashboard numbers are calculated from MongoDB records.

## Prompt Injection Test

```bash
cd server
node tests/promptInjection.test.js
```

Expected result: 25/25 unsafe actions are blocked by `recoveryRules.js` and converted to the safe fallback `do_nothing`.

## Demo Sequence (2-3 minutes)

1. Show FrHelp course purchase.
2. Trigger a supported Razorpay Test Mode payment failure.
3. Show the real failure reason being captured.
4. Show baseline decision: same reminder strategy.
5. Show AI decision using the same real failure fields.
6. Show code-level action validation.
7. Open Payment Recovery dashboard.
8. Compare failed payments, recovery attempts, recoveries, recovery rate, and recovered amount.
9. Highlight Incremental Recovered Revenue.
10. Run the prompt injection suite and show 25/25 blocked.

## Honest Exceptions

UPI Payment Links are recorded as an exception when Razorpay Test Mode does not support the required UPI recovery flow. The system does not fabricate a successful UPI recovery.

## Security Boundary

The AI cannot enroll a student, issue a discount, change a price, grant free access, mark a payment successful, or invent an action. Payment verification and enrollment remain server-side and outside AI authority.
