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
const studioPage = document.querySelector('[data-studio-page]');
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

toolCards.forEach((card) => {
  card.addEventListener('click', () => {
    const toolSlug = card.dataset.tool.toLowerCase().replace(/\s+/g, '-');
    window.location.href = `studio.html?tool=${encodeURIComponent(toolSlug)}`;
  });
});
