const root = document.documentElement;
const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileNav = document.querySelector('[data-mobile-nav]');
const mobileBottomNav = document.querySelector('.mobile-bottom-nav');
const themeToggle = document.querySelector('[data-theme-toggle]');
const languageToggle = document.querySelector('[data-language-toggle]');
const language = document.querySelector('[data-language]');
const languageAlt = document.querySelector('[data-language-alt]');
const toolCards = document.querySelectorAll('[data-tool]');
const selectionStatus = document.querySelector('[data-selection-status]');
const studioWorkspace = document.querySelector('[data-studio-workspace]');
const studioTitle = document.querySelector('[data-studio-title]');
const studioDescription = document.querySelector('[data-studio-description]');
const videoMessage = document.querySelector('[data-video-message]');

menuToggle?.addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
});

mobileNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open menu');
  });
});

mobileBottomNav?.querySelectorAll('.bottom-nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    mobileBottomNav.querySelectorAll('.bottom-nav-item').forEach((navItem) => navItem.classList.remove('is-active'));
    item.classList.add('is-active');
  });
});

themeToggle?.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = nextTheme;
  themeToggle.setAttribute('aria-label', `Switch to ${nextTheme === 'dark' ? 'light' : 'dark'} mode`);
});

languageToggle?.addEventListener('click', () => {
  const isEnglish = language.textContent === 'EN';
  language.textContent = isEnglish ? 'MM' : 'EN';
  languageAlt.textContent = isEnglish ? 'EN' : 'MM';
});

toolCards.forEach((card) => {
  card.addEventListener('click', () => {
    toolCards.forEach((toolCard) => {
      toolCard.setAttribute('aria-pressed', String(toolCard === card));
    });
    if (selectionStatus) {
      selectionStatus.textContent = `${card.dataset.tool} selected · Ready to create`;
    }
    if (studioWorkspace) {
      studioWorkspace.hidden = false;
      const toolName = card.dataset.tool;
      const isDrums = toolName === 'Drums';
      if (studioTitle) studioTitle.textContent = isDrums ? 'Drum Studio' : `${toolName} Studio`;
      if (studioDescription) studioDescription.textContent = isDrums
        ? 'Build a beat with your drum kit, then record it into the video preview.'
        : `${toolName} controls will use this same studio layout.`;
      if (videoMessage) videoMessage.textContent = isDrums
        ? 'Your drum performance will appear here.'
        : `Your ${toolName.toLowerCase()} performance will appear here.`;
      studioWorkspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
