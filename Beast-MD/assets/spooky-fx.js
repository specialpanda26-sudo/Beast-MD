// 🎃 Halloween MD — shared spooky effects driver.
// Include on any page: <script src="/assets/spooky-fx.js" defer></script>
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    spawnFlyingDecor();
    autoPump();
    initPillNav();
  });

  // ---- 1. Floating ghosts + bats drifting across the page ----
  function spawnFlyingDecor() {
    if (document.querySelector('.hmd-fx-layer')) return; // already present
    var layer = document.createElement('div');
    layer.className = 'hmd-fx-layer';
    layer.setAttribute('aria-hidden', 'true');

    var ghosts = ['👻', '👻', '🎃'];
    var bats = ['🦇', '🦇'];

    ghosts.forEach(function (emoji, i) {
      var el = document.createElement('div');
      el.className = 'hmd-ghost';
      el.textContent = emoji;
      el.style.animationDuration = (22 + i * 6) + 's';
      el.style.animationDelay = (i * 5) + 's';
      layer.appendChild(el);
    });
    bats.forEach(function (emoji, i) {
      var el = document.createElement('div');
      el.className = 'hmd-bat';
      el.textContent = emoji;
      el.style.animationDuration = (14 + i * 4) + 's';
      el.style.animationDelay = (i * 3 + 2) + 's';
      layer.appendChild(el);
    });

    document.body.appendChild(layer);
  }

  // ---- 2. Auto pump-on-hover for common interactive elements ----
  function autoPump() {
    var selectors = [
      'button', '.nav-pair-btn', '.logout-btn', '.widget-btn',
      '.btn-pair-hero', 'a.cmd-card', '.cta-btn'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(function (el) {
      el.classList.add('hmd-pump');
    });
  }

  // ---- 3. Pill-highlighted scroll-spy nav ----
  // Looks for a <nav> containing links to in-page anchors (href="#id").
  // If found, wraps them for the sliding pill and highlights the
  // active section as the user scrolls.
  function initPillNav() {
    var nav = document.querySelector('nav');
    if (!nav) return;
    var anchorLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    if (!anchorLinks.length) return;

    var linksContainer = anchorLinks[0].parentElement;
    linksContainer.classList.add('hmd-nav-links');

    var pill = document.createElement('div');
    pill.className = 'hmd-nav-pill';
    linksContainer.insertBefore(pill, linksContainer.firstChild);

    function movePillTo(link) {
      if (!link) { pill.style.width = '0'; return; }
      var lr = link.getBoundingClientRect();
      var cr = linksContainer.getBoundingClientRect();
      pill.style.width = lr.width + 'px';
      pill.style.transform = 'translateX(' + (lr.left - cr.left) + 'px)';
    }

    function setActive(link) {
      anchorLinks.forEach(function (a) { a.classList.remove('hmd-active'); });
      if (link) link.classList.add('hmd-active');
      movePillTo(link);
    }

    // Smooth scroll on click + immediate active state
    anchorLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActive(a);
        }
      });
    });

    // Scroll-spy: highlight whichever section is currently in view
    var sections = anchorLinks
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);

    if (sections.length && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var match = anchorLinks.find(function (a) {
              return a.getAttribute('href').slice(1) === entry.target.id;
            });
            if (match) setActive(match);
          }
        });
      }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
      sections.forEach(function (s) { observer.observe(s); });
    }

    // Fade-in reveal for the sections tied to nav anchors
    sections.forEach(function (s) { s.classList.add('hmd-section-fade'); });
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add('hmd-visible');
        });
      }, { threshold: 0.15 });
      sections.forEach(function (s) { revealObserver.observe(s); });
    } else {
      sections.forEach(function (s) { s.classList.add('hmd-visible'); });
    }

    window.addEventListener('resize', function () {
      var active = nav.querySelector('a.hmd-active');
      if (active) movePillTo(active);
    });

    // Set initial active pill after layout settles
    setTimeout(function () { setActive(anchorLinks[0]); }, 50);
  }
})();
