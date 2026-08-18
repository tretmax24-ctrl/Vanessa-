self.addEventListener('push',event=>{
  let data={title:'MAX',body:'You have a new notification',url:'./'};
  try{data={...data,...(event.data?event.data.json():{})}}catch{}
  event.waitUntil(self.registration.showNotification(data.title||'MAX',{
    body:data.body||'You have a new notification',
    tag:data.tag||'max-notification',
    data:{url:data.url||'./'},
    icon:'./favicon.ico',
    badge:'./favicon.ico'
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url||'./';
  event.waitUntil((async()=>{
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      if('focus' in client){
        await client.focus();
        if('navigate' in client) await client.navigate(url);
        return;
      }
    }
    if(self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
