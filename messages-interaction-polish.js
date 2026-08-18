(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
function setup(){
  const search=$('#peopleSearch');
  if(search && !search.dataset.maxSearchReady){
    search.dataset.maxSearchReady='1';
    const wrap=search.closest('.search-wrap');
    if(wrap && !$('#peopleSearchClear',wrap)){
      const clear=document.createElement('button');
      clear.type='button'; clear.id='peopleSearchClear'; clear.className='search-clear'; clear.textContent='×'; clear.setAttribute('aria-label','Clear search'); clear.hidden=true;
      wrap.appendChild(clear);
      const run=()=>{
        const q=search.value.trim().toLowerCase();
        clear.hidden=!q;
        let shown=0;
        $$('.person-row').forEach(row=>{
          const match=!q||row.textContent.toLowerCase().includes(q);
          row.hidden=!match; if(match)shown++;
        });
        let empty=$('#peopleSearchEmpty');
        const list=$('#peopleList');
        if(q && shown===0 && list){
          if(!empty){empty=document.createElement('div');empty.id='peopleSearchEmpty';empty.className='search-empty';empty.innerHTML='<strong>No people found</strong><span>Try another name or username.</span>';list.appendChild(empty)}
          empty.hidden=false;
        }else if(empty) empty.hidden=true;
      };
      search.addEventListener('input',run);
      clear.onclick=()=>{search.value='';run();search.focus()};
    }
  }
  const input=$('#chatInput');
  if(input && !input.dataset.maxComposerReady){
    input.dataset.maxComposerReady='1';
    const ta=document.createElement('textarea');
    ta.id='chatInput'; ta.name=input.name||'message'; ta.maxLength=input.maxLength||5000; ta.placeholder=input.placeholder||'Write a message…'; ta.autocomplete='off'; ta.rows=1; ta.className=input.className;
    for(const a of input.attributes){if(!['id','name','maxlength','placeholder','autocomplete','type','value','class'].includes(a.name))ta.setAttribute(a.name,a.value)}
    input.replaceWith(ta);
    const resize=()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,128)+'px'};
    ta.addEventListener('input',resize);
    ta.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();const form=$('#chatCompose');if(form)form.requestSubmit()}
    });
    resize();
  }
}
const observer=new MutationObserver(()=>setup());
observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
setup();
})();
