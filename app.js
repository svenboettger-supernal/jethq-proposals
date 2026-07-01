(function () {
  'use strict';

  /* ── Password gate ────────────────────────────────────────────
     Change PASSWORD below to whatever JetHQ should be told.
     The gate persists per browser via localStorage. */
  var GATE_KEY = 'supernal_jethq_unlocked';
  var PASSWORD = 'flightdeck';

  function unlock() {
    try { localStorage.setItem(GATE_KEY, '1'); } catch (e) {}
    document.documentElement.classList.remove('locked');
    document.documentElement.classList.add('unlocked');
  }

  function setupGate() {
    var form = document.getElementById('proposal-gate-form');
    var input = document.getElementById('proposal-gate-input');
    var error = document.getElementById('proposal-gate-error');
    if (!form || !input) return;

    if (document.documentElement.classList.contains('locked')) {
      try { input.focus(); } catch (e) {}
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var attempt = (input.value || '').toLowerCase().trim();
      if (attempt === PASSWORD) {
        unlock();
      } else {
        if (error) error.hidden = false;
        input.value = '';
        try { input.focus(); } catch (e) {}
      }
    });

    input.addEventListener('input', function () {
      if (error) error.hidden = true;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGate);
  } else {
    setupGate();
  }

  /* ── Job Description modal ───────────────────────────────────── */

  function openModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var closeBtn = modal.querySelector('.jd-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    var openTrigger = e.target.closest('[data-jd-open]');
    if (openTrigger) {
      e.preventDefault();
      openModal(document.getElementById(openTrigger.getAttribute('data-jd-open')));
      return;
    }
    var closeTrigger = e.target.closest('[data-jd-close]');
    if (closeTrigger) {
      e.preventDefault();
      closeModal(closeTrigger.closest('.jd-modal'));
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openModalEl = document.querySelector('.jd-modal[aria-hidden="false"]');
    if (openModalEl) closeModal(openModalEl);
  });
})();
