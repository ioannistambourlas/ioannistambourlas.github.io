// Site behaviour. init() runs on first load and again after every AJAX page swap.
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cleanups = [];

  function init() {
    cleanups.forEach(function (fn) { fn(); });
    cleanups = [];

    // Mobile menu
    var toggle = document.querySelector('.menu-toggle'), menu = document.getElementById('menu');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        menu.classList.toggle('is-open', open);
      });
      menu.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') { toggle.setAttribute('aria-expanded', 'false'); menu.classList.remove('is-open'); }
      });
    }

    // Header gets a shadow and shrinks once the top bar has scrolled away
    var header = document.querySelector('.site-header'), topbar = document.querySelector('.topbar');
    function onScroll() {
      if (header) header.classList.toggle('is-stuck', window.scrollY > (topbar ? topbar.offsetHeight : 0) + 4);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(function () { window.removeEventListener('scroll', onScroll); });
    onScroll();

    var y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear();

    // Fade things in as they scroll into view
    var targets = document.querySelectorAll('.fx, [data-reveal], .post, .block__title, .courtdraw');
    document.querySelectorAll('.posts .post').forEach(function (p, i) { if (i > 0) p.style.setProperty('--d', ((i - 1) % 2) * 0.12 + 's'); });
    document.querySelectorAll('.cv__col').forEach(function (col) {
      col.querySelectorAll('.fx').forEach(function (el, i) { el.style.setProperty('--d', i * 0.08 + 's'); });
    });
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px' });
      targets.forEach(function (el) { io.observe(el); });
      cleanups.push(function () { io.disconnect(); });
    } else targets.forEach(function (el) { el.classList.add('is-in'); });

    // Lazy images: load a little before they are visible, shimmer until they arrive
    var lazy = document.querySelectorAll('img.lazy[data-src]');
    function load(img) {
      var box = img.closest('.post__img');
      if (box) box.classList.add('is-loading');
      img.addEventListener('load', function () {
        img.classList.add('is-loaded');
        if (box && !box.querySelector('img.lazy:not(.is-loaded)')) box.classList.remove('is-loading');
      }, { once: true });
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
    if ('IntersectionObserver' in window) {
      var lio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { load(en.target); lio.unobserve(en.target); } });
      }, { rootMargin: '300px 0px' });
      lazy.forEach(function (img) { lio.observe(img); });
      cleanups.push(function () { lio.disconnect(); });
    } else lazy.forEach(load);

    // Court lines draw themselves
    document.querySelectorAll('.courtdraw .draw').forEach(function (el) {
      try { el.style.setProperty('--len', Math.ceil(el.getTotalLength()) + 1); } catch (e) {}
    });

    // Project filters
    var filters = document.querySelectorAll('.filters button'), posts = document.querySelectorAll('.posts .post');
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = btn.dataset.filter;
        filters.forEach(function (b) { var on = b === btn; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
        posts.forEach(function (p) { p.classList.add('is-filtering'); });
        setTimeout(function () {
          posts.forEach(function (p) {
            var show = f === 'all' || p.dataset.cat.split(' ').indexOf(f) > -1;
            p.classList.toggle('is-hidden', !show);
            p.classList.toggle('post--featured', show && p.id === 'futsalaki' && f === 'all');
          });
          requestAnimationFrame(function () { posts.forEach(function (p) { p.classList.remove('is-filtering'); p.classList.add('is-in'); }); });
        }, reduce ? 0 : 260);
      });
    });

    // Highlight the menu item for the section on screen
    var links = document.querySelectorAll('.menu a[href^="#"]');
    if (links.length && 'IntersectionObserver' in window) {
      var map = {};
      links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) map[s.id] = a; });
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) { a.classList.remove('is-current'); });
          if (map[en.target.id]) map[en.target.id].classList.add('is-current');
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      Object.keys(map).forEach(function (id) { sio.observe(document.getElementById(id)); });
      cleanups.push(function () { sio.disconnect(); });
    }

    // Copy email
    var copy = document.getElementById('copy');
    if (copy) copy.addEventListener('click', function () {
      var mail = copy.dataset.email;
      function done() { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy'; }, 1800); }
      if (navigator.clipboard) navigator.clipboard.writeText(mail).then(done, function () { location.href = 'mailto:' + mail; });
      else location.href = 'mailto:' + mail;
    });

    // Contact form opens the visitor's email app with everything filled in
    var form = document.getElementById('contactForm');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim(), company = form.elements.company.value.trim(), msg = form.elements.message.value.trim();
      var subject = 'Hello from ' + name + (company ? ' (' + company + ')' : '');
      location.href = 'mailto:' + form.dataset.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(msg + '\n\n' + name);
    });
  }

  // ---- AJAX navigation between the home page and the case studies ----
  var bar = document.getElementById('loadbar');
  var parts = ['.topbar', '.site-header', '#main', '.site-footer'];

  function isPage(url) {
    if (url.origin !== location.origin) return false;
    if (/\/demos\//.test(url.pathname) || /\.(pdf|jpe?g|png|webp|svg)$/i.test(url.pathname)) return false;
    return /\/$|\.html$/.test(url.pathname);
  }

  function scrollToHash(hash) {
    var el = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
    doc.style.scrollBehavior = 'auto';
    if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
    doc.style.scrollBehavior = '';
  }

  function go(url, push) {
    if (bar) { bar.classList.remove('is-done'); void bar.offsetWidth; bar.classList.add('is-going'); }
    doc.classList.add('is-leaving');
    var started = Date.now();
    fetch(url.href, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (html) {
      var next = new DOMParser().parseFromString(html, 'text/html');
      if (!next.querySelector('#main')) throw new Error('no main');
      setTimeout(function () {
        if (push) history.pushState({ ajax: true }, '', url.href);
        document.title = next.title;
        parts.forEach(function (sel) {
          var cur = document.querySelector(sel), fresh = next.querySelector(sel);
          if (cur && fresh) cur.replaceWith(document.importNode(fresh, true));
        });
        scrollToHash(url.hash);
        init();
        doc.classList.remove('is-leaving');
        if (bar) { bar.classList.remove('is-going'); bar.classList.add('is-done'); }
      }, Math.max(0, 250 - (Date.now() - started)));
    }).catch(function () { location.href = url.href; });
  }

  try {
    if (window.fetch && window.DOMParser && history.pushState && !reduce) {
      history.replaceState({ ajax: true }, '', location.href);
      document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest('a[href]');
        if (!a || a.target || a.hasAttribute('download')) return;
        var url = new URL(a.href, location.href);
        if (!isPage(url)) return;
        if (url.pathname === location.pathname && url.search === location.search) return; // same page, let the anchor scroll
        e.preventDefault();
        go(url, true);
      });
      window.addEventListener('popstate', function (e) {
        if (e.state && e.state.ajax) go(new URL(location.href), false);
      });
    }
  } catch (err) { /* plain navigation still works */ }

  init();
})();
