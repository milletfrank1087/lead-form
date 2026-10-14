# Test submission: Lead form

A fictional US applicant for testing the `/apply` form. Every identifier below is reserved for fiction, so none of it can belong to a real person.

## Field values

| Field | Value |
| --- | --- |
| First name | Daniel |
| Last name | Whitaker |
| Email | `daniel.whitaker@example.com` |
| US phone | `(512) 555-0147` (type `5125550147`; the form formats it) |
| City | Austin |
| State | Texas |
| Employment status | Employed Full-Time |
| Approximate credit score | 700–749 — Very Good |
| Additional message | I run a small marketing consultancy in Austin and I'm looking for a partner program that could add recurring revenue for my clients. Happy to jump on a call this week. |
| Referral code | *(leave blank)* |
| Preferred contact method | Email |
| Consent checkbox | Checked |

## Entering it

- **Phone:** type only the digits. The field auto-formats and stops at 10 digits.
- **State:** open the State picker and choose Texas (the list is searchable).
- **Referral code:** leave blank. It is optional, and an invented code could collide with a real one.
- **Consent:** tick the checkbox, or the form will not submit.
- **Expected result:** a "Submitting your application…" overlay for about 2 seconds, a brief check flash, then the "application received" screen.

## Where to use it

- Use it on your own copy only:
  - Local: `http://localhost:5173/apply` (start it with `npm run dev`)
  - Live: `https://lead-form-production-cac8.up.railway.app/apply`
- The submit function is currently a stub (`src/lib/submit-application.ts`), so nothing is stored or sent anywhere.
- Do **not** enter it at `fynexnetwork.com`. The owner would receive it as a real lead.
- Once you connect a real backend, this record will sit in your lead list. Delete it, or filter on the `example.com` email.

## Why these values are safe

- **Phone:** numbers `555-0100` to `555-0199` are reserved for fictional use in the North American Numbering Plan, so they cannot be assigned to a real line.
- **Email:** `example.com` is reserved by internet standards (RFC 2606) and cannot receive mail.
- **Name:** common and fictional. Any resemblance to a real person is coincidence.
