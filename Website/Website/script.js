// App shell lock: the web app owns its viewport, so browser zoom and the
// native context menu are off. The editor keeps its own in-app zoom
// (Ctrl+= / Ctrl+-), which this only suppresses the browser default for.
(() => {
  document.addEventListener('contextmenu', (event) => event.preventDefault());

  const ZOOM_KEYS = new Set(['+', '=', '-', '_', '0']);
  const ZOOM_CODES = new Set(['Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract', 'Digit0', 'Numpad0']);
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (ZOOM_KEYS.has(event.key) || ZOOM_CODES.has(event.code)) event.preventDefault();
  }, { capture: true });

  document.addEventListener('wheel', (event) => {
    if (event.ctrlKey || event.metaKey) event.preventDefault();
  }, { passive: false });

  // Touch/trackpad pinch, plus Safari's own gesture events.
  document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 1) event.preventDefault();
  }, { passive: false });
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
    document.addEventListener(type, (event) => event.preventDefault());
  });
})();

const root = document.documentElement;
const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileNav = document.querySelector('[data-mobile-nav]');
const menuBackdrop = document.querySelector('[data-menu-backdrop]');
const menuClose = document.querySelector('[data-menu-close]');
const mobileBottomNav = document.querySelector('.mobile-bottom-nav');
const themeToggle = document.querySelector('[data-theme-toggle]');
const languageToggle = document.querySelector('[data-language-toggle]');
const language = document.querySelector('[data-language]');
const languageAlt = document.querySelector('[data-language-alt]');
const toolCards = document.querySelectorAll('[data-tool]');
const selectionStatus = document.querySelector('[data-selection-status]');
const studioPage = document.querySelector('[data-studio-page]');
const studioWorkspace = document.querySelector('[data-studio-workspace]');
const studioTitle = document.querySelector('[data-studio-title]');
const studioDescription = document.querySelector('[data-studio-description]');
const videoMessage = document.querySelector('[data-video-message]');
const videoStage = document.querySelector('[data-video-stage]');
const videoOutput = document.querySelector('[data-video-output]');
const videoPlay = document.querySelector('[data-video-play]');
const videoTimeline = document.querySelector('[data-video-timeline]');
const videoTime = document.querySelector('[data-video-time]');
const videoFullscreen = document.querySelector('[data-video-fullscreen]');
const savedTheme = localStorage.getItem('msharing-theme');

if (savedTheme === 'dark' || savedTheme === 'light') {
  root.dataset.theme = savedTheme;
}

const menuIsOpen = () => Boolean(mobileNav?.classList.contains('is-open'));
const menuFocusableItems = () => [...(mobileNav?.querySelectorAll('a[href], button:not([disabled])') || [])];
const closeMobileMenu = (restoreFocus = true) => {
  if (!mobileNav) return;
  mobileNav.classList.remove('is-open');
  mobileNav.setAttribute('aria-hidden', 'true');
  mobileNav.inert = true;
  menuBackdrop?.classList.remove('is-open');
  menuBackdrop?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Open menu');
  if (restoreFocus) menuToggle?.focus();
};
const openMobileMenu = () => {
  if (!mobileNav) return;
  mobileNav.inert = false;
  mobileNav.setAttribute('aria-hidden', 'false');
  mobileNav.classList.add('is-open');
  menuBackdrop?.setAttribute('aria-hidden', 'false');
  menuBackdrop?.classList.add('is-open');
  document.body.classList.add('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'true');
  menuToggle?.setAttribute('aria-label', 'Close menu');
  const focusTarget = menuClose || menuFocusableItems()[0];
  if (focusTarget) window.requestAnimationFrame(() => { if (menuIsOpen()) focusTarget.focus(); });
};

if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => menuIsOpen() ? closeMobileMenu() : openMobileMenu());
  menuClose?.addEventListener('click', () => closeMobileMenu());
  menuBackdrop?.addEventListener('click', () => closeMobileMenu());
  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => closeMobileMenu(false));
  });
  document.addEventListener('keydown', (event) => {
    if (!menuIsOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = menuFocusableItems();
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || !mobileNav.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !mobileNav.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });
  const mobileMenuMedia = window.matchMedia?.('(max-width: 860px)');
  const closeOnDesktop = (event) => { if (!event.matches && menuIsOpen()) closeMobileMenu(false); };
  if (mobileMenuMedia?.addEventListener) mobileMenuMedia.addEventListener('change', closeOnDesktop);
  else mobileMenuMedia?.addListener?.(closeOnDesktop);
}

mobileBottomNav?.querySelectorAll('.bottom-nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    mobileBottomNav.querySelectorAll('.bottom-nav-item').forEach((navItem) => navItem.classList.remove('is-active'));
    item.classList.add('is-active');
  });
});

themeToggle?.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = nextTheme;
  localStorage.setItem('msharing-theme', nextTheme);
  themeToggle.setAttribute('aria-label', `Switch to ${nextTheme === 'dark' ? 'light' : 'dark'} mode`);
});

languageToggle?.addEventListener('click', () => {
  const isEnglish = language.textContent === 'EN';
  language.textContent = isEnglish ? 'MM' : 'EN';
  languageAlt.textContent = isEnglish ? 'EN' : 'MM';
});

if (studioPage && studioWorkspace) {
  const toolName = new URLSearchParams(window.location.search).get('tool') || 'drums';
  const formattedName = toolName.charAt(0).toUpperCase() + toolName.slice(1);
  const isDrums = toolName.toLowerCase() === 'drums';
  if (studioTitle) studioTitle.textContent = isDrums ? 'Drum Studio' : `${formattedName} Studio`;
  if (studioDescription) studioDescription.textContent = isDrums
    ? 'Build a beat with your drum kit, then record it into the video preview.'
    : `${formattedName} controls will use this same studio layout.`;
  if (videoMessage) videoMessage.textContent = isDrums
    ? 'Your drum performance will appear here.'
    : `Your ${formattedName.toLowerCase()} performance will appear here.`;
}

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};
const updateVideoTime = () => {
  if (videoTime && videoTimeline) {
    const seconds = videoOutput ? videoOutput.currentTime : Number(videoTimeline.value);
    videoTime.textContent = formatTime(Math.floor(seconds));
    if (videoTimeline && videoOutput && Number.isFinite(videoOutput.duration)) {
      videoTimeline.value = String(videoOutput.currentTime);
    }
  }
};

videoTimeline?.addEventListener('input', () => {
  if (videoOutput && Number.isFinite(videoOutput.duration)) {
    videoOutput.currentTime = Number(videoTimeline.value);
  }
  updateVideoTime();
});

videoPlay?.addEventListener('click', () => {
  if (!videoOutput || !videoOutput.src) return;
  if (videoOutput.paused) {
    videoOutput.play().catch((error) => {
      const status = document.querySelector('[data-studio-status]');
      if (status) status.textContent = `Video playback failed: ${error.message || error}`;
    });
  } else {
    videoOutput.pause();
  }
});

videoOutput?.addEventListener('play', () => {
  if (videoPlay) {
    videoPlay.textContent = 'Ⅱ';
    videoPlay.setAttribute('aria-label', 'Pause video');
  }
  videoStage?.classList.add('is-playing');
});

videoOutput?.addEventListener('pause', () => {
  if (videoPlay) {
    videoPlay.textContent = '▶';
    videoPlay.setAttribute('aria-label', 'Play video');
  }
  videoStage?.classList.remove('is-playing');
});

videoOutput?.addEventListener('timeupdate', updateVideoTime);

videoFullscreen?.addEventListener('click', async () => {
  if (!videoStage) return;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else if (videoStage.requestFullscreen) {
    await videoStage.requestFullscreen();
  }
});

document.addEventListener('fullscreenchange', () => {
  const isFullscreen = document.fullscreenElement === videoStage;
  if (videoFullscreen) {
    videoFullscreen.textContent = isFullscreen ? '×' : '⛶';
    videoFullscreen.setAttribute('aria-label', isFullscreen ? 'Exit full screen' : 'Full screen');
  }
});

toolCards.forEach((card) => {
  card.addEventListener('click', () => {
    const toolSlug = card.dataset.tool.toLowerCase().replace(/\s+/g, '-');
    window.location.href = `studio.html?tool=${encodeURIComponent(toolSlug)}`;
  });
});
