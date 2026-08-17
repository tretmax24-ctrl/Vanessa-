(() => {
  const sync = () => document.body.classList.toggle('messages-open', !!document.querySelector('.messages-page'));
  new MutationObserver(sync).observe(document.getElementById('app'), { childList: true, subtree: true, attributes: true });
  sync();
})();
