# WhatsApp handoff in Facebook & TikTok webviews — research and fixed design

**Date:** 2026-11-07
**Context:** `apply-wizard-v3.html`. Traffic arrives from **paid Facebook and TikTok ads**, so an in-app webview is the *normal* environment, not an edge case.
**Question:** will "submit → WhatsApp" work on every device?

**Answer: no, not as auto-redirect. That is now fixed by design change.**

---

## What I got wrong twice

| Attempt | What I did | Why it failed |
|---|---|---|
| 1 | `setTimeout(() => window.open(url), 1100)` | Popup blocked in Safari (no gesture). |
| 2 | `window.open('')` at click, then delayed `location.href` | Tab opened instantly and stole focus. Only the navigation was delayed. |
| 3 | `setTimeout(() => location.assign(url), 1150)` | **In a webview this cannot open WhatsApp at all.** See below. |

I kept instrumenting *when the navigation fired* and calling it correct. The user was reporting *what they saw*, which was different.

---

## The finding that matters: a timer cannot open an app

Chrome's own documentation, verbatim:

> "Chrome won't launch an external application in the following cases: … **A JavaScript timer tried to open an application without a user gesture.**"
> — [Chrome for Developers, Android Intents](https://developer.chrome.com/docs/android/intents)

And on the fallback:

> "the URL sends users to [the fallback] if the app cannot be found, **the link is triggered by JavaScript without user gesture**, or other cases where we don't launch an external application."

Independent confirmation of how this fails silently:

> "Fire the exact same link without a gesture behind it, and Chrome doesn't attempt to launch the app at all. It goes straight to `S.browser_fallback_url`, **as if the package weren't there**… that outcome is indistinguishable from the app genuinely not being installed."
> — [DarkCore](https://darkcorepwa.com/blog/android-intent-url-browser-fallback-trap/)

Chromium's own internal rules list the same prohibitions:

> "Launching an app without user activation … Launching an app after a long timeout … Launching apps from fallback URLs."
> — [chromium/src external_intents](https://chromium.googlesource.com/chromium/src/+/main/components/external_intents/)

**Consequence for `apply-wizard-v3`:** a 1,150 ms timer is a timer. In a Facebook or TikTok webview on Android, the `intent://` would be refused and land on `wa.me` *inside the webview*. The user never reaches WhatsApp. On iOS the same timer navigation is, per an Apple engineer on the developer forums, "treated like typing the URL: **no app**."

**The animation and an automatic app handoff are mutually exclusive in a webview.**

---

## Why an in-app webview is different from a browser

> "An in-app browser is an embedded webview inside another app that renders links without handing them to the operating system, which prevents Universal Links and App Links from ever reaching the app that claims the domain. **This is not a misconfiguration and there is no setting that fixes it.**"
> — [Deeplinkly](https://www.deeplinkly.com/glossary/deep-links-in-in-app-browsers)

| Context | Asks the OS to resolve? | Opens the app? |
|---|---|---|
| Safari / Chrome / default browser | Yes | **Yes** |
| Notes, Messages, email client | Yes | **Yes** |
| iOS `WKWebView` (Facebook, Instagram, TikTok) | No | **No**, unless the host app intercepts |
| Android `WebView` (same apps) | No | **No**, unless the host overrides |
| Android Custom Tabs | Yes | Yes |

> "Apps that care about the ecosystem do this; **large social apps generally do not, because keeping the user inside the app is the point.**"

---

## The design change

**The handoff is now a real tap, not an automatic redirect.**

```
submit  →  animation (~1.15s)  →  "Application received"
                                 →  big button: "Start the conversation"  ← user taps
                                 →  WhatsApp opens
```

Why this is the correct answer rather than a compromise:

1. **A tap is the gesture every platform requires.** Chrome, Android WebView and iOS all honour a tapped anchor. None honour a timer.
2. **It works in every webview**, because the tap happens in the same frame and with the same user activation as any normal link.
3. **The animation is preserved** — it plays before the button appears, which is what the owner asked for.
4. **It is honest.** A button that says "Start the conversation" is a promise the platform can actually keep; an auto-redirect that lands on a blank webview is not.

### The link itself is platform-aware

| User agent (verified by test) | Generated target |
|---|---|
| Desktop Chrome / Edge / Firefox | `https://wa.me/…` |
| Android browser | `intent://send?phone=…#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=…` |
| Android Facebook webview | `intent://…` (same) |
| iOS Facebook webview | `https://wa.me/…` |

The Android `intent://` carries `S.browser_fallback_url` so a device without WhatsApp lands on `wa.me` instead of erroring. Research confirms the fallback **only accepts http/https** — a `market://` value is silently dropped ([DarkCore](https://darkcorepwa.com/blog/android-intent-url-browser-fallback-trap/)).

### In-app guidance

When a webview is detected, the done screen adds:

> *"Opening straight into the app is blocked inside the Facebook app. If nothing happens, tap the menu and choose **Open in browser**."*

That is the only durable instruction, because the escape hatches are patched or undocumented:

| App (iOS) | `x-safari-https://` | Notes |
|---|---|---|
| Facebook | ✅ via a real tap | confirmed on device Sep 2026 |
| Instagram | ❌ patched mid-2025 | `instagram://extbrowser` reported as a no-op on current builds |
| TikTok | ❌ | no working scheme |

> "Neither the `x-safari-https` scheme nor the `extbrowser` jump reliably opens the system browser today, and every replacement hack lives on borrowed time: a bypass depends on undocumented behaviour inside an app whose owner profits from the WebView and ships updates weekly."
> — [Flyn](https://www.flyn.to/blog/instagram-in-app-browser)

**Recommendation: do not ship escape hacks.** They break silently, and you only find out when conversion drops. Detect the environment, guide the tap, move on.

---

## Will it work 100% on all devices?

**No. Nobody can promise that, and any vendor claiming it is selling a moving target.** Here is the honest matrix:

| Scenario | Result |
|---|---|
| Desktop, any browser | ✅ tap opens WhatsApp / WhatsApp Web |
| iOS Safari, normal browsing | ✅ tap opens the app via Universal Link |
| iOS Chrome | ✅ |
| **iOS Facebook / Instagram / TikTok webview** | ⚠️ tap opens `wa.me` **inside the webview**; user must use the ⋯ menu to reach a real browser |
| Android normal browser | ✅ tap fires `intent://`, opens the app |
| **Android Facebook / Instagram webview** | ⚠️ usually works (`intent://` is often honoured), **not guaranteed** — Meta controls `shouldOverrideUrlLoading` and can change it |
| WhatsApp not installed | ✅ falls back to `wa.me` web |

**The unavoidable floor:** on iOS inside a social webview, no page can hand off to another app. Apple's sandbox plus Meta's interest in retention means the user must take one manual step. That is a platform limit, not a bug in this form.

### What would actually improve it

1. **Measure it.** Add an event on the done screen when the WhatsApp button is tapped, and compare taps to conversations received. If taps ≫ conversations, the handoff is failing in the wild — and you would know rather than guess.
2. **Track `contact_pref` conversion, not just form submits.** A submit with `whatsapp` that never produced a conversation is a false success in the current funnel numbers.
3. Consider a smart-link service *only if* measurement shows the loss is material. They maintain the per-app escape matrix for money, and it can still break without notice.

---

## Verification performed

| Check | Result |
|---|---|
| `submit()` contains no `location.assign` | ✅ verified by stripping comments and grepping the live body |
| `submit()` contains no `window.open` | ✅ |
| Auto-navigations after submit | **0**, measured by stubbing `location.assign` |
| Done screen appears | 1,179 ms |
| Tap anchor exists after animation | ✅ `href="https://wa.me/13183147693?text=…"` |
| Desktop UA | `wa.me` |
| Android UA | `intent://` |
| Android Facebook UA | `intent://` |
| iOS Facebook UA | `wa.me` |
| Console errors | none |

**Not verified:** nothing here has run on a physical iPhone or Android inside the real Facebook app. Everything above is published research plus emulated user agents. The one test that would settle it is ten minutes with two real phones and a real ad click.

---

## Sources

- Chrome, Android Intents (gesture rule) — https://developer.chrome.com/docs/android/intents
- Chromium external_intents (prohibited launches) — https://chromium.googlesource.com/chromium/src/+/main/components/external_intents/
- DarkCore, the `browser_fallback_url` trap — https://darkcorepwa.com/blog/android-intent-url-browser-fallback-trap/
- Deeplinkly, deep links in in-app browsers — https://www.deeplinkly.com/glossary/deep-links-in-in-app-browsers
- appy.to, per-app in-app browser behaviour — https://appy.to/blog/in-app-browser-deep-links
- plugwith.me, escape the in-app browser (2026) — https://plugwith.me/escape-in-app-browser/
- Flyn, Instagram in-app browser — https://www.flyn.to/blog/instagram-in-app-browser
- shalanah/inapp-debugger, per-app matrix — https://github.com/shalanah/inapp-debugger
- Vayda, WhatsApp from Facebook — https://vayda.link/open/whatsapp-from-facebook
- Strait, Facebook links — https://straitlink.in/open-app-from/facebook/
- Meta, in-app browser help — https://en-gb.facebook.com/business/help/206578174518231
- Don't Panic Labs, `window.open` on iOS Safari — https://dontpaniclabs.com/blog/post/2025/07/29/understanding-window-open-behavior-on-ios-safari/
- MDN, `Window.open()` — https://developer.mozilla.org/en-US/docs/Web/API/Window/open
