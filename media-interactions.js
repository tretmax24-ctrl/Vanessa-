(() => {
  'use strict';
  const getVideos = () => [...document.querySelectorAll('.reel-video, .creation-preview')];
  function wire(video) {
    if (video.dataset.maxMediaWired) return;
    video.dataset.maxMediaWired = '1';
    video.addEventListener('click', e => {
      if (video.classList.contains('creation-preview')) return;
      e.preventDefault();
      if (video.paused) {
        video.muted = false;
        video.volume = 1;
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      } else {
        video.pause();
      }
    });
    video.addEventListener('play', () => {
      if (!video.paused) video.setAttribute('data-playing','1');
    });
    video.addEventListener('pause', () => video.removeAttribute('data-playing'));
  }
  const observer = new MutationObserver(() => getVideos().forEach(wire));
  observer.observe(document.getElementById('app') || document.body, {childList:true,subtree:true});
  getVideos().forEach(wire);
})();
