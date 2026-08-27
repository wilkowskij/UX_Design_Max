document.documentElement.classList.add('js');

// ---------------------------------------------------------------
// 1. Copy buttons for code blocks inside #install
// ---------------------------------------------------------------
(function setupCopyButtons() {
  const installSection = document.getElementById('install');
  if (!installSection) return;

  const pres = installSection.querySelectorAll('pre');
  if (!pres.length) return;

  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.className = 'visually-hidden';
  document.body.appendChild(liveRegion);

  pres.forEach((pre) => {
    const text = pre.textContent;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-btn';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy install commands');

    button.addEventListener('click', () => {
      copyText(text)
        .then(() => onCopySuccess(button, liveRegion))
        .catch(() => {
          if (fallbackCopy(text)) {
            onCopySuccess(button, liveRegion);
          } else {
            selectPreText(pre);
          }
        });
    });

    pre.appendChild(button);
  });

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        return navigator.clipboard.writeText(text);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return Promise.reject(new Error('Clipboard API unavailable'));
  }

  function fallbackCopy(text) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch (err) {
      return false;
    }
  }

  function selectPreText(pre) {
    try {
      const range = document.createRange();
      range.selectNodeContents(pre);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (err) {
      /* no-op */
    }
  }

  function onCopySuccess(button, liveRegion) {
    button.textContent = 'Copied';
    liveRegion.textContent = 'Copied to clipboard';
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 1600);
  }
})();

// ---------------------------------------------------------------
// 3. Scroll-spy over the six <section> elements
// ---------------------------------------------------------------
(function setupScrollSpy() {
  const sections = Array.from(document.querySelectorAll('main > section[id]'));
  const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  if (!sections.length || !navLinks.length) return;

  const linkById = new Map();
  navLinks.forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    linkById.set(id, link);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((l) => l.removeAttribute('aria-current'));
        const link = linkById.get(entry.target.id);
        if (link) link.setAttribute('aria-current', 'true');
      });
    },
    { rootMargin: '-45% 0px -50%' }
  );

  sections.forEach((section) => observer.observe(section));
})();

// ---------------------------------------------------------------
// 4. Reveal-on-scroll + flow/card hover-linking
// ---------------------------------------------------------------
(function setupRevealAndHoverLinking() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    const revealTargets = Array.from(document.querySelectorAll('[data-reveal]'));
    if (revealTargets.length) {
      const revealObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -12%' }
      );
      revealTargets.forEach((target) => revealObserver.observe(target));
    }
  }

  const flowNodes = Array.from(document.querySelectorAll('.flow-node'));
  const agentCards = Array.from(document.querySelectorAll('.agent-card'));
  if (!flowNodes.length || !agentCards.length) return;

  const cardByAgent = new Map();
  agentCards.forEach((card) => cardByAgent.set(card.getAttribute('data-agent'), card));

  flowNodes.forEach((node) => {
    const agent = node.getAttribute('data-agent');
    const card = cardByAgent.get(agent);
    if (!card) return;

    node.setAttribute('tabindex', '0');

    const activate = () => card.classList.add('is-active');
    const deactivate = () => card.classList.remove('is-active');

    node.addEventListener('mouseenter', activate);
    node.addEventListener('mouseleave', deactivate);
    node.addEventListener('focusin', activate);
    node.addEventListener('focusout', deactivate);
  });
})();
