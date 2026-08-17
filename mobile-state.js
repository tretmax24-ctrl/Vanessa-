(() => {
  const sync = () => {
    const app = document.getElementById('app');
    const conversation = app?.querySelector('.conversation-screen:not([hidden])');
    document.body.classList.toggle('messages-open', !!app?.querySelector('.messages-page'));
    document.body.classList.toggle('messages-conversation-open', !!conversation);
  };
  const app=document.getElementById('app');
  if(app)new MutationObserver(sync).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
  sync();
})();
