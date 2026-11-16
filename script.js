/**
 * script.js
 * Navigation, profile rendering, scroll effects, project gallery and contact form.
 */

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const chevron = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

  const socialIcons = {
    dribbble: '<circle cx="12" cy="12" r="10"/><path d="M19.13 5.09C15.22 9.14 10 10.44 2.06 10.63"/><path d="M8.37 2.45C12.74 8.48 14.39 11.87 16.4 20.17"/><path d="M21.5 12.09c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>',
    twitter: '<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
    github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    whatsapp: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    email: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'
  };

  // --------------------------------------------------------------------------
  // 1. Reveal-on-scroll
  // --------------------------------------------------------------------------
  const revealObserver = 'IntersectionObserver' in window && !reduceMotion
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    : null;

  const introCovering = document.documentElement.classList.contains('intro-pending');

  const observeReveals = (root = document) => {
    root.querySelectorAll('.reveal:not(.in)').forEach((el) => {
      if (!revealObserver) { el.classList.add('in'); return; }
      // Content already on screen under the intro overlay: show it right away. Its reveal
      // would play out of sight anyway, and painting it early keeps LCP from waiting.
      if (introCovering && el.getBoundingClientRect().top < window.innerHeight) {
        el.style.transition = 'none';
        el.classList.add('in');
        void el.offsetWidth; // commit the final state before restoring transitions
        el.style.transition = '';
        return;
      }
      // Stagger siblings (cards in a grid, rows in a list) so they cascade in
      const siblings = el.parentElement
        ? Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'))
        : [el];
      const index = Math.max(0, siblings.indexOf(el));
      el.style.transitionDelay = `${Math.min(index, 8) * 80}ms`;
      revealObserver.observe(el);
    });
  };

  // --------------------------------------------------------------------------
  // 2. Statement text: words light up as you scroll past
  // --------------------------------------------------------------------------
  const statement = $('hero-subtitle');
  let statementWords = [];
  let lastLitCount = -1;

  const splitStatement = (text) => {
    if (!statement) return;
    statement.innerHTML = text.split(/\s+/).map((w) => `<span class="word">${esc(w)}</span>`).join(' ');
    statementWords = Array.from(statement.querySelectorAll('.word'));
    lastLitCount = -1;
    updateStatement();
  };

  const updateStatement = () => {
    if (!statement || !statementWords.length) return;
    if (reduceMotion) { statementWords.forEach((w) => w.classList.add('lit')); return; }
    const rect = statement.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 when the paragraph top reaches 85% of the viewport, 1 when its bottom reaches 45%
    const start = vh * 0.85;
    const end = vh * 0.45;
    const progress = Math.min(Math.max((start - rect.top) / (start - end + rect.height), 0), 1);
    const litCount = Math.round(progress * statementWords.length);
    if (litCount === lastLitCount) return; // nothing changed, skip touching every word
    lastLitCount = litCount;
    statementWords.forEach((w, i) => w.classList.toggle('lit', i < litCount));
  };

  // --------------------------------------------------------------------------
  // 3. Profile rendering
  // --------------------------------------------------------------------------
  const setText = (id, value) => { const el = $(id); if (el && value != null) el.textContent = value; };

  const applyProfileData = (mode) => {
    const data = window.portfolioData && window.portfolioData[mode];
    if (!data) return;

    setText('nav-brand-name', data.shortName);
    setText('profile-name', data.name);
    setText('profile-bio', data.bio);
    setText('profile-status', data.status);
    setText('exp-title-1', data.expHeader.solid);
    setText('exp-title-2', data.expHeader.ghost);
    setText('footer-name', data.name);
    splitStatement(data.hero.subtitle);

    // Profile picture; fall back to the old image if the new file is missing
    document.querySelectorAll('#profile-avatar').forEach((img) => {
      if (!data.avatar) return;
      img.onerror = () => {
        img.onerror = null;
        if (data.avatarFallback) img.src = data.avatarFallback;
      };
      img.src = data.avatar;
      img.alt = data.name;
    });

    const socials = $('profile-socials');
    if (socials) {
      socials.innerHTML = data.socials.map((s) => `
        <a href="${esc(s.url)}" class="social-btn" aria-label="${esc(s.label || s.type)}" title="${esc(s.label || s.type)}"
           ${s.type === 'email' ? '' : 'target="_blank" rel="noopener noreferrer"'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${socialIcons[s.type] || ''}</svg>
        </a>`).join('');
    }

    const stats = $('stats-container');
    if (stats) {
      stats.innerHTML = data.stats.map((s) => `
        <div class="stat reveal">
          <div class="stat-val">${esc(s.val)}</div>
          <div class="stat-lbl">${esc(s.lbl)}</div>
        </div>`).join('');
    }

    const timeline = $('experience-container');
    if (timeline) {
      timeline.innerHTML = data.experiences.map((e) => `
        <li class="timeline-item reveal">
          <span class="timeline-period">${esc(e.period)}</span>
          <div class="timeline-body">
            <h3 class="timeline-company">${esc(e.company)}</h3>
            <p class="timeline-role">${esc(e.role)}</p>
            <p class="timeline-desc">${esc(e.desc)}</p>
          </div>
        </li>`).join('');
    }

    const gallery = $('projects-container');
    if (gallery) {
      const arrowUpRight = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="8 7 17 7 17 16"/></svg>';
      const hourglass = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>';

      gallery.innerHTML = data.projects.map((p, i) => {
        const media = p.ongoing
          ? `<div class="project-media project-media-ongoing" aria-hidden="true">
               <div class="ongoing-glow"></div>
               <div class="ongoing-content">
                 <p class="ongoing-title">In the works.</p>
                 <div class="ongoing-bar"><span></span></div>
               </div>
             </div>`
          : `<div class="project-media">
               <img src="${esc(p.image)}" alt="${esc(p.title)} mockup" width="1280" height="960" loading="lazy" decoding="async">
             </div>`;

        const info = `
          <div class="project-info">
            <div>
              <p class="project-index">${String(i + 1).padStart(2, '0')}</p>
              <h3 class="project-title">${esc(p.title)}</h3>
              <p class="project-category">${esc(p.category)}</p>
              ${p.host ? `<p class="project-host">${esc(p.host)}</p>` : ''}
            </div>
            <span class="round-btn round-btn-light" aria-hidden="true">${p.url ? arrowUpRight : hourglass}</span>
          </div>`;

        return p.url
          ? `<a class="project project-link reveal" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(p.title)} (${esc(p.host || p.url)}) in a new tab">${media}${info}</a>`
          : `<article class="project project-soon reveal" aria-label="${esc(p.title)}, ongoing">${media}${info}</article>`;
      }).join('');
      gallery.scrollLeft = 0;
    }

    observeReveals();
    observeCounters();
  };

  // --------------------------------------------------------------------------
  // 3b. Stats count up from zero when they scroll into view ("10+" keeps its "+")
  // --------------------------------------------------------------------------
  function observeCounters() {
    const els = document.querySelectorAll('.stat-val');
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    const run = (el) => {
      const match = el.dataset.value.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/);
      if (!match) return;
      const [, prefix, num, suffix] = match;
      const target = parseFloat(num);
      const decimals = (num.split('.')[1] || '').length;
      const duration = 1600;
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => {
      el.dataset.value = el.textContent.trim();
      el.textContent = el.dataset.value.replace(/\d+(\.\d+)?/, (m) => (0).toFixed((m.split('.')[1] || '').length));
      io.observe(el);
    });
  }

  // Contact: the Moon descends and the glow settles when the section comes into view
  const contactSection = $('contact');
  if (contactSection) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      contactSection.classList.add('in-view');
    } else {
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { contactSection.classList.add('in-view'); io.disconnect(); }
      }, { threshold: 0.08 });
      io.observe(contactSection);
    }
  }

  // Profile content comes from content.js (user = Muhammad Jundi Assabiq)
  applyProfileData('user');

  // --------------------------------------------------------------------------
  // 4. Navigation: frosted state, scroll spy, mobile menu
  // --------------------------------------------------------------------------
  const nav = $('globalnav');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-link[data-nav]');

  // Coalesce scroll events into one update per frame (avoids forced layouts mid-scroll)
  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      scrollTicking = false;
      const y = window.scrollY;
      // Navbar pill appears once the user scrolls away from the hero top
      nav && nav.classList.toggle('visible', y > 60);
      updateStatement();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateStatement);
  onScroll();

  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((l) => l.classList.toggle('active', l.dataset.nav === entry.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));
  }

  const toggle = $('mobile-toggle');
  const menu = $('mobile-menu');
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  if (toggle && menu) {
    toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  }

  // --------------------------------------------------------------------------
  // 5. Project gallery arrows
  // --------------------------------------------------------------------------
  const gallery = $('projects-container');
  const scrollGallery = (dir) => {
    const card = gallery && gallery.querySelector('.project');
    if (!card) return;
    gallery.scrollBy({ left: dir * (card.offsetWidth + 24), behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  $('gallery-prev')?.addEventListener('click', () => scrollGallery(-1));
  $('gallery-next')?.addEventListener('click', () => scrollGallery(1));

  // --------------------------------------------------------------------------
  // 6. Contact form (simulated send)
  // --------------------------------------------------------------------------
  const form = $('contact-form');
  const submitBtn = $('submit-btn');
  const status = $('form-status');
  let statusTimer = null;

  const showStatus = (text, type) => {
    clearTimeout(statusTimer);
    status.textContent = text;
    status.className = `form-status ${type}`;
    if (type === 'success') {
      statusTimer = setTimeout(() => { status.className = 'form-status'; }, 7000);
    }
  };

  if (form && submitBtn && status) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('form-name').value.trim();
      const email = $('form-email').value.trim();
      const message = $('form-message').value.trim();

      if (!name || !email || !message) {
        showStatus('Please fill in your name, email, and message.', 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showStatus('Please enter a valid email address.', 'error');
        return;
      }

      const original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Sending…</span>';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
        form.reset();
        showStatus(`Thank you, ${name}. Your message has been received.`, 'success');
      }, 900);
    });
  }


  setText('footer-year', new Date().getFullYear());

  // --------------------------------------------------------------------------
  // Bottom glass blur: content that hasn't scrolled up yet sits under a
  // progressive frosted edge. Shown only while <main> is on screen and
  // hidden as soon as the footer enters, so the footer is never blurred.
  // --------------------------------------------------------------------------
  const scrollBlur = $('scroll-blur');
  const mainEl = document.querySelector('main');
  const footerEl = document.querySelector('.footer');
  if (scrollBlur && mainEl && footerEl && 'IntersectionObserver' in window) {
    let mainVisible = false;
    let footerVisible = false;
    const sync = () => scrollBlur.classList.toggle('is-active', mainVisible && !footerVisible);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === mainEl) mainVisible = entry.isIntersecting;
        if (entry.target === footerEl) footerVisible = entry.isIntersecting;
      });
      sync();
    });
    observer.observe(mainEl);
    observer.observe(footerEl);
  }
});
