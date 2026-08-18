(()=>{
  'use strict';
  const STYLE_ID='max-chat-architecture';
  const MOBILE='(max-width:900px)';
  const installStyle=()=>{
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      .messages-page .conversation{
        min-height:0!important;
        min-width:0!important;
        display:flex!important;
        flex-direction:column!important;
        overflow:hidden!important;
      }
      .messages-page .conversation[hidden]{display:none!important}
      .messages-page .messages-contacts.contacts-hidden{display:none!important}
      .messages-page #chatBody{
        flex:1 1 auto!important;
        min-height:0!important;
        min-width:0!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
        scrollbar-gutter:stable;
      }
      .messages-page #chatMessages{
        height:auto!important;
        min-height:100%!important;
        max-height:none!important;
        overflow:visible!important;
        flex:none!important;
      }
      .messages-page #chatCompose{
        position:static!important;
        inset:auto!important;
        flex:0 0 auto!important;
        display:flex!important;
        visibility:visible!important;
        opacity:1!important;
        width:100%!important;
        z-index:2!important;
      }
      @media ${MOBILE}{
        .messages-page{height:100dvh!important;min-height:0!important;overflow:hidden!important}
        .messages-page .conversation{
          position:absolute!important;
          inset:0!important;
          width:100%!important;
          height:100dvh!important;
        }
        .messages-page #chatBody{padding-bottom:4px!important}
      }
    `;
    document.head.appendChild(s);
  };
  const mount=()=>{
    const conv=document.getElementById('conversation');
    const legacy=document.getElementById('chatMessages');
    const compose=document.getElementById('chatCompose');
    if(!conv||!legacy||!compose)return;
    let body=document.getElementById('chatBody');
    if(!body){
      body=document.createElement('div');
      body.id='chatBody';
      body.setAttribute('role','log');
      legacy.parentNode.insertBefore(body,legacy);
      body.appendChild(legacy);
    }else if(legacy.parentNode!==body){
      body.appendChild(legacy);
    }
  };
  const run=()=>{installStyle();mount()};
  const observe=()=>{
    const root=document.getElementById('app')||document.body;
    new MutationObserver(run).observe(root,{childList:true,subtree:true});
  };
  run();
  observe();
  window.addEventListener('resize',run,{passive:true});
})();
