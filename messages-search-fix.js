(()=>{
'use strict';
let observer=null;
function wire(){
  const input=document.getElementById('peopleSearch');
  const list=document.getElementById('peopleList');
  if(!input||!list||input.dataset.maxSearchWired==='1') return;
  input.dataset.maxSearchWired='1';
  const apply=()=>{
    const q=input.value.trim().toLowerCase();
    const rows=[...list.querySelectorAll('.person-row')];
    let matches=0;
    rows.forEach(row=>{
      const button=row.querySelector('.person-main');
      const name=(button?.querySelector('b')?.textContent||'').toLowerCase();
      const username=(button?.querySelector('small')?.textContent||'').toLowerCase();
      const match=!q||name.includes(q)||username.includes(q);
      row.hidden=!match;
      if(match) matches++;
    });
    let empty=list.querySelector('.search-empty');
    if(q && matches===0){
      if(!empty){
        empty=document.createElement('div');
        empty.className='profile-empty search-empty';
        list.appendChild(empty);
      }
      empty.textContent=`No people found for “${input.value.trim()}”.`;
      empty.hidden=false;
    }else if(empty){
      empty.hidden=true;
    }
  };
  input.addEventListener('input',apply);
  input.addEventListener('search',apply);
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';apply();input.blur()}});
  apply();
}
wire();
observer=new MutationObserver(wire);
observer.observe(document.body,{childList:true,subtree:true});
})();
