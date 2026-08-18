(()=>{
'use strict';
let activeConversationId=null;
Object.defineProperty(window,'activeConversationId',{configurable:false,get:()=>activeConversationId});
const sb=window.supabaseClient;
if(!sb||typeof sb.channel!=='function')return;
const originalChannel=sb.channel.bind(sb);
const originalRemoveChannel=typeof sb.removeChannel==='function'?sb.removeChannel.bind(sb):null;
const topicPattern=/^max-chat-([0-9a-f]{8}-[0-9a-f-]{27,36})$/i;
sb.channel=function(name,...args){
  const match=String(name||'').match(topicPattern);
  if(match){
    activeConversationId=match[1];
    console.log('[CALL DEBUG] activeConversationId:',activeConversationId);
    console.log('[CALL DEBUG] current conversation:',activeConversationId);
  }
  return originalChannel(name,...args);
};
if(originalRemoveChannel){
  sb.removeChannel=function(channel){
    const topic=channel?.topic||'';
    const match=String(topic).match(topicPattern);
    const result=originalRemoveChannel(channel);
    if(match&&match[1]===activeConversationId){
      activeConversationId=null;
      console.log('[CALL DEBUG] activeConversationId: null');
    }
    return result;
  };
}
})();
