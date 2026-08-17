(() => {
  'use strict';
  const getVideos = () => [...document.querySelectorAll('.reel-video, .creation-preview')];
  const playWithSound = video => {
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    video.play().catch(() => {});
  };
  function wire(video) {
    if (video.dataset.maxMediaWired) return;
    video.dataset.maxMediaWired = '1';
    video.addEventListener('click', e => {
      if (video.classList.contains('creation-preview')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (video.paused) playWithSound(video); else video.pause();
    }, {capture:true});
  }
  const wirePlayButton = button => {
    if (button.dataset.maxPlayWired) return;
    button.dataset.maxPlayWired = '1';
    button.addEventListener('click', e => {
      const video = button.closest('.reel')?.querySelector('.reel-video');
      if (!video) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (video.paused) playWithSound(video); else video.pause();
    }, {capture:true});
  };
  const scan = () => {
    getVideos().forEach(wire);
    document.querySelectorAll('[data-play]').forEach(wirePlayButton);
  };
  const observer = new MutationObserver(scan);
  observer.observe(document.getElementById('app') || document.body, {childList:true,subtree:true});
  scan();
})();
