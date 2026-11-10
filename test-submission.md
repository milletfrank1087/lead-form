# Test submission: Lead form

A fictional US applicant for testing the `/apply` form. Every identifier below is reserved for fiction, so none of it can belong to a real person.

## Field values

| Field | Value |
| --- | --- |
| First name | Daniel |
| Last name | Whitaker |
| Email | `daniel.whitaker@example.com` |
| US phone | `(512) 555-0147` (type `5125550147`; the form formats it) |
| Approximate credit score | 700–749 — Very good |
| How fast can you respond | Same day |
| Reachable hours / timezone | defaults are fine (09:00–18:00, detected zone) |
| Preferred contact method | Email |
| Consent checkbox | Checked |

> The wizard no longer asks for city, state or employment (`employed` is sent as `"not-collected"`), so
> those values are fixed in the POST body rather than entered on the form.

## Entering it

- **Phone:** type only the digits. The field auto-formats and stops at 10 digits.
- **Availability:** pick "Same day" (the step exists so we learn how fast they answer a live check).
- **Consent:** tick the Terms/Privacy checkbox on the documents step, or the form will not submit.
- **Expected result:** a "Submitting your application…" overlay for about 2 seconds, a brief check flash, then the "application received" screen.

## Where to use it

- Use it on your own copy only:
  - Local: `http://localhost:5173/apply` (start it with `npm run dev`)
  - Live: `https://lead-form-production-cac8.up.railway.app/apply`
- The submit function is currently a stub (`src/lib/submit-application.ts`), so nothing is stored or sent anywhere.
- Do **not** enter it at `phoenixnetwork.online`. The owner would receive it as a real lead.
- Once you connect a real backend, this record will sit in your lead list. Delete it, or filter on the `example.com` email.

## Why these values are safe

- **Phone:** numbers `555-0100` to `555-0199` are reserved for fictional use in the North American Numbering Plan, so they cannot be assigned to a real line.
- **Email:** `example.com` is reserved by internet standards (RFC 2606) and cannot receive mail.
- **Name:** common and fictional. Any resemblance to a real person is coincidence.
