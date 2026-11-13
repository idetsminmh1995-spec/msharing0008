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
const videoStage = document.querySelector('[data-video-stage]');
const videoPlay = document.querySelector('[data-video-play]');
const videoTimeline = document.querySelector('[data-video-timeline]');
const videoTime = document.querySelector('[data-video-time]');
const videoFullscreen = document.querySelector('[data-video-fullscreen]');
let videoTimer;
const savedTheme = localStorage.getItem('msharing-theme');

if (savedTheme === 'dark' || savedTheme === 'light') {
  root.dataset.theme = savedTheme;
}

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
  if (videoTime && videoTimeline) videoTime.textContent = formatTime(Number(videoTimeline.value));
};

videoTimeline?.addEventListener('input', updateVideoTime);

videoPlay?.addEventListener('click', () => {
  const isPlaying = videoPlay.dataset.playing === 'true';
  videoPlay.dataset.playing = String(!isPlaying);
  videoPlay.textContent = isPlaying ? '▶' : 'Ⅱ';
  videoPlay.setAttribute('aria-label', isPlaying ? 'Play video' : 'Pause video');
  videoStage?.classList.toggle('is-playing', !isPlaying);
  window.clearInterval(videoTimer);
  if (!isPlaying) {
    videoTimer = window.setInterval(() => {
      if (!videoTimeline) return;
      const nextTime = Number(videoTimeline.value) + 1;
      if (nextTime >= Number(videoTimeline.max)) {
        videoTimeline.value = videoTimeline.max;
        updateVideoTime();
        videoPlay.click();
        return;
      }
      videoTimeline.value = String(nextTime);
      updateVideoTime();
    }, 1000);
  }
});

videoFullscreen?.addEventListener('click', async () => {
  if (!videoStage) return;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else if (videoStage.requestFullscreen) {
    await videoStage.requestFullscreen();
  }
});

toolCards.forEach((card) => {
  card.addEventListener('click', () => {
    const toolSlug = card.dataset.tool.toLowerCase().replace(/\s+/g, '-');
    window.location.href = `studio.html?tool=${encodeURIComponent(toolSlug)}`;
  });
});
