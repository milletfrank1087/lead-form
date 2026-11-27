// Combined PageMonitor + FunnelMonitor (ported from Paypal donate / GFM New Cloaked)
// Reports (1) browser-side JS/promise/resource errors to /api/client/error and
// (2) application form stage progression & unsubmitted exits to /api/client/report.
(function () {
  var ERROR_ENDPOINT = '/api/client/error';
  var REPORT_ENDPOINT = '/api/client/report';
  var ORDER = [
    'page_loaded',
    'form_ready',
    'personal_info',
    'qualification',
    'contact_method',
    'submitting',
    'validation_error',
    'submitted',
  ];
  var furthest = 'page_loaded';
  var submitted = false;
  var failed = false;
  var sentExit = false;
  var sentErrors = {};
  var errorCount = 0;
  var droppedErrors = 0;
  var capWarned = false;
  var startedAt = Date.now();
  // Per-signature budget, and a higher global one. A single noisy signature used to be able to burn the
  // whole page budget and silence every later error the applicant would have hit.
  var PER_KEY_MAX = 3;
  var GLOBAL_MAX = 40;

  function send(endpoint, payload, contentType) {
    var body = JSON.stringify(payload);
    try {
      if (
        navigator.sendBeacon &&
        navigator.sendBeacon(
          endpoint,
          new Blob([body], { type: contentType || 'application/json' })
        )
      ) {
        return;
      }
    } catch (_) {}
    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': contentType || 'application/json' },
        body: body,
        keepalive: true,
      }).catch(function () {});
    } catch (_) {}
  }

  function stage(name) {
    if (name === 'submitted') {
      submitted = true;
      furthest = 'submitted';
      return;
    }
    if (ORDER.indexOf(name) > ORDER.indexOf(furthest)) {
      furthest = name;
    }
  }

  function error(kind, message, extra) {
    var msg = String(message || '').slice(0, 300);
    var src = extra && extra.src ? String(extra.src).slice(0, 200) : '';
    // A blank message used to be dropped here, which is exactly the case the browser gives us most:
    // the page samples what it can and reports it rather than going dark.
    if (!msg && !src) return;
    if (
      /^Script error\.?$|ResizeObserver loop|chrome-extension:|moz-extension:|safari-extension:|webkit-masked-url/i.test(
        msg + ' ' + src
      )
    ) {
      return;
    }
    var stack = extra && extra.stack ? String(extra.stack).slice(0, 600) : '';
    // Key on the message, the source AND the first stack frame: a blank message used to collapse every
    // distinct error into one bucket, so the second real failure was treated as a duplicate and lost.
    var frame = stack.split('\n').map(function (l) { return l.trim(); })[1] || '';
    var key = kind + '|' + msg + '|' + src + '|' + frame;
    sentErrors[key] = (sentErrors[key] || 0) + 1;
    if (sentErrors[key] > PER_KEY_MAX) return;
    if (errorCount >= GLOBAL_MAX) {
      droppedErrors += 1;
      if (!capWarned) {
        capWarned = true;
        send(ERROR_ENDPOINT, {
          kind: 'cap',
          type: 'cap',
          msg: 'error budget exhausted; later errors are only counted',
          message: 'error budget exhausted; later errors are only counted',
          cap: GLOBAL_MAX,
          distinct: Object.keys(sentErrors).length,
          stage: furthest,
          secs: Math.round((Date.now() - startedAt) / 1000),
        }, 'text/plain');
      }
      return;
    }
    errorCount += 1;
    send(
      ERROR_ENDPOINT,
      {
        // Both shapes: `kind`/`msg` is what this file has always sent, `type`/`message` is what the
        // server reads. Sending one alone left every stored error blank.
        kind: kind,
        type: kind,
        msg: msg || '(empty message)',
        message: msg || '(empty message)',
        src: src,
        line: (extra && extra.line) || 0,
        code: extra && extra.code != null ? String(extra.code).slice(0, 60) : '',
        stack: stack,
        repeat: sentErrors[key],
        stage: furthest,
        ms: (extra && extra.ms) || null,
        secs: Math.round((Date.now() - startedAt) / 1000),
      },
      'text/plain'
    );
  }

  window.addEventListener(
    'error',
    function (e) {
      if (e.target && e.target !== window && (e.target.src || e.target.href)) {
        error(
          'resource',
          'failed to load ' + (e.target.tagName || '').toLowerCase(),
          { src: e.target.src || e.target.href }
        );
        return;
      }
      error('js', e.message, {
        src: e.filename,
        line: e.lineno,
        stack: e.error && e.error.stack,
      });
    },
    true
  );

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    error('promise', r && r.message ? r.message : String(r), {
      stack: r && r.stack,
      src: r && r.stack ? String(r.stack).split('\n')[1] : '',
    });
  });

  function reportExit() {
    if (submitted || sentExit || furthest === 'page_loaded' || furthest === 'form_ready') return;
    sentExit = true;
    var elapsedMs = Date.now() - startedAt;
    send(REPORT_ENDPOINT, {
      t: 'exit',
      // Keep the reason: an abandoned application after a submit that threw is a different problem from
      // one abandoned by a hesitation, and `furthest` alone cannot tell them apart.
      stage: furthest,
      failed: failed,
      ms: elapsedMs,
      secs: Math.round(elapsedMs / 1000),
    });
  }

  window.addEventListener('pagehide', reportExit);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && furthest !== 'submitting') {
      reportExit();
    }
  });

  var attempts = 0;
  function attempt(result, ms, extra) {
    if (attempts >= 10) return;
    attempts += 1;
    if (result === 'error') failed = true;
    if (result === 'submitted') failed = false;
    extra = extra || {};
    send(REPORT_ENDPOINT, {
      t: 'attempt',
      result: result,
      ms: Math.round(ms || 0),
      stage: furthest,
    });
  }

  window.PageMonitor = { error: error };
  window.FunnelMonitor = {
    stage: stage,
    error: error,
    attempt: attempt,
    getStage: function () {
      return furthest;
    },
    getElapsedMs: function () {
      return Date.now() - startedAt;
    },
  };
})();
