const root = document.documentElement;
const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileNav = document.querySelector('[data-mobile-nav]');
const mobileBottomNav = document.querySelector('.mobile-bottom-nav');
const themeToggle = document.querySelector('[data-theme-toggle]');
const languageToggle = document.querySelector('[data-language-toggle]');
const language = document.querySelector('[data-language]');
const languageAlt = document.querySelector('[data-language-alt]');

menuToggle?.addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

mobileNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
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
