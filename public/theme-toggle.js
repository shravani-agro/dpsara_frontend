/**
 * DPSara777 Theme & Navigation Controller
 * Handles dark/light theme switching, persistent storage sync, icon updates,
 * and mobile navigation menu interactions.
 */
(function () {
  const STORAGE_KEYS = ['theme', 'dpsara_theme'];

  function getSavedTheme() {
    try {
      for (const k of STORAGE_KEYS) {
        const val = localStorage.getItem(k);
        if (val === 'dark' || val === 'light') return val;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {}
    return 'light';
  }

  const SUN_SVG =
    '<svg class="w-5 h-5 transition-transform duration-300 rotate-0 hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>';

  const MOON_SVG =
    '<svg class="w-5 h-5 transition-transform duration-300 -rotate-12 hover:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>';

  function applyTheme(theme, save = true) {
    const isDark = theme === 'dark';
    const root = document.documentElement;

    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
      root.classList.add('light');
    }

    if (save) {
      try {
        STORAGE_KEYS.forEach((k) => localStorage.setItem(k, theme));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}
    }

    // Update all theme toggle buttons on the page
    document.querySelectorAll('button[aria-label*="Theme"], button[title*="Theme"], .theme-toggle-btn').forEach((btn) => {
      const label = isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.innerHTML = isDark ? SUN_SVG : MOON_SVG;

      // Adjust inline style if present so it doesn't force hardcoded white
      if (btn.style) {
        btn.style.backgroundColor = isDark ? 'rgb(28, 22, 20)' : '#FFFFFF';
        btn.style.borderColor = isDark ? 'rgb(46, 38, 35)' : '#E4E1DF';
        btn.style.color = isDark ? 'rgb(249, 247, 244)' : '#16100E';
      }
    });

    // Ensure header logo reflects theme if dual images are present
    const lightLogos = document.querySelectorAll('.header-logo-light, img[src*="dpsara.svg"]:not(.dark\\:block)');
    const darkLogos = document.querySelectorAll('.header-logo-dark, img[src*="dpsara-dark.svg"], img[src*="dpsara777-logo-dark.svg"]');

    if (lightLogos.length > 0 && darkLogos.length > 0) {
      lightLogos.forEach((img) => (img.style.display = isDark ? 'none' : 'block'));
      darkLogos.forEach((img) => (img.style.display = isDark ? 'block' : 'none'));
    }
  }

  function initThemeButtons() {
    document.querySelectorAll('button[aria-label*="Theme"], button[title*="Theme"], .theme-toggle-btn').forEach((btn) => {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = 'true';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      });
    });
  }

  function initMobileMenu() {
    const mobileNav = document.getElementById('mobile-nav');
    const openBtns = document.querySelectorAll('button[aria-label="Open menu"]');
    const backdrop = document.querySelector('button[aria-label="Close menu"]')?.parentElement?.querySelector('button.fixed.inset-0') ||
                     document.querySelector('div.xl\\:hidden > button.fixed.inset-0');
    const closeBtns = document.querySelectorAll('button[aria-label="Close menu"]');

    function openNav() {
      if (mobileNav) {
        mobileNav.classList.remove('-translate-x-full', 'pointer-events-none');
        mobileNav.classList.add('translate-x-0');
        mobileNav.setAttribute('aria-hidden', 'false');
      }
      if (backdrop) {
        backdrop.classList.remove('hidden');
      }
      document.body.style.overflow = 'hidden';
    }

    function closeNav() {
      if (mobileNav) {
        mobileNav.classList.add('-translate-x-full', 'pointer-events-none');
        mobileNav.classList.remove('translate-x-0');
        mobileNav.setAttribute('aria-hidden', 'true');
      }
      if (backdrop) {
        backdrop.classList.add('hidden');
      }
      document.body.style.overflow = '';
    }

    openBtns.forEach((btn) => {
      if (!btn.dataset.menuBound) {
        btn.dataset.menuBound = 'true';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          openNav();
        });
      }
    });

    closeBtns.forEach((btn) => {
      if (!btn.dataset.menuBound) {
        btn.dataset.menuBound = 'true';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          closeNav();
        });
      }
    });

    if (backdrop && !backdrop.dataset.menuBound) {
      backdrop.dataset.menuBound = 'true';
      backdrop.addEventListener('click', (e) => {
        e.preventDefault();
        closeNav();
      });
    }

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });
  }

  // Initial immediate application
  const initialTheme = getSavedTheme();
  applyTheme(initialTheme, false);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(getSavedTheme(), false);
      initThemeButtons();
      initMobileMenu();
    });
  } else {
    applyTheme(initialTheme, false);
    initThemeButtons();
    initMobileMenu();
  }

  // Listen for storage events from other tabs/windows
  window.addEventListener('storage', () => {
    applyTheme(getSavedTheme(), false);
  });
})();
