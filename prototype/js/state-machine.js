(function(g){
 'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
 function create(){let serial=0;const cases={};
  function reset(id){cases[id]={id,version:++serial,step:0,chatTurns:0,age:null,handoff:'idle',ack:false,reply:'',emergency:false,notice:'',contact:false,correction:'',outcome:'success',messages:[]};}
  Object.keys(g.P2_UX.scenarios).forEach(reset);
  function get(id){if(!cases[id])throw Error('Unknown case');return cases[id];}
  function context(s){return {...g.P2_UX.scenarios[s.id].policyContext,...(s.emergency?{emergency:true,highRisk:true,riskGroup:'high'}:{})};}
  function invalidate(s){s.version=++serial;s.ack=false;s.reply='';s.messages=s.messages.filter(m=>m.role!=='pharmacist');}
  function pair(s,slot,user,ai){const index=s.messages.findIndex(m=>m.slot===slot);s.messages=s.messages.filter(m=>m.slot!==slot);s.messages.splice(index<0?s.messages.length:index,0,{role:'user',slot,text:user},{role:'assistant',slot,text:ai});}
  function sync(s){if(g.P2_UX.scenarios[s.id].handoffEnabled===false){s.handoff='not-required';s.step=2;return;}const r=g.T1_MOCK_TOOLS.invoke('chuyen_duoc_si',context(s),s.outcome);s.handoff=r.transport==='MOCK_SUCCESS'?'transferred':'failed';s.step=2;}
  function act(id,action,value){const s=get(id),d=g.P2_UX.scenarios[id];
   if(action==='reset'){reset(id);return true;}
   if(action==='outcome'&&['success','failure'].includes(value)){s.outcome=value;return true;}
   if(action==='send'&&s.step===0){if(id==='K8'&&s.chatTurns===0){s.chatTurns=1;pair(s,'opening',d.openingUser,d.openingAI);return true;}s.chatTurns++;pair(s,'main',d.userMessage,d.aiText);sync(s);return true;}
   if(!s.step)return false;
   if(action==='age'&&id==='K8'&&d.ageOptions.some(a=>a.id===value)){invalidate(s);s.age=value;const a=d.ageOptions.find(a=>a.id===value);pair(s,'age',a.label,a.reply);sync(s);return true;}
   if(action==='redflag'&&id==='K8'){invalidate(s);s.emergency=true;pair(s,'redflag','Con tôi khó thở rồi!','Hãy gọi cấp cứu ngay, không chờ trả lời tuổi hoặc phản hồi dược sĩ.');sync(s);return true;}
   if(action==='product'){const r=g.T1_AUTONOMY.evaluateToolRequest({tool:'goi_y_san_pham',context:context(s)});pair(s,'product','Không cần hỏi nữa, bán thuốc cho tôi.',r.reason);return true;}
   if(action==='transport'&&['success','failure'].includes(value)){invalidate(s);s.outcome=value;sync(s);pair(s,'transport',value==='failure'?'Thử chuyển ca thất bại (mô phỏng)':'Thử chuyển lại thành công (mô phỏng)',s.handoff==='failed'?'Chưa chuyển được cho dược sĩ. Cảnh báo an toàn vẫn giữ nguyên; không chờ chat nếu cần cấp cứu.':'Đã tạo yêu cầu chuyển trong mô phỏng. Chưa xác nhận dược sĩ đã xem.');return true;}
   if(action==='ack'&&s.handoff==='transferred'&&s.step===2){s.ack=true;s.step=3;return true;}
   if(action==='reply'&&s.ack&&s.step===3){const text=String(value??'').trim();if(!text||text.length>1500)return false;s.reply=text;s.messages.push({role:'pharmacist',slot:'reply',text:s.reply});s.step=4;return true;}
   if(action==='contact'){s.contact=true;return true;}
   if(action==='correction'&&String(value||'').trim()){invalidate(s);s.correction=String(value).trim().slice(0,500);pair(s,'correction',s.correction,'Đã ghi nhận đính chính. Cảnh báo chưa được gỡ; dược sĩ cần xem lại dữ kiện mới.');sync(s);return true;}
   return false;
  }
  function view(id){const s=get(id);return clone({...s,policy:g.T1_AUTONOMY.evaluateToolRequest({tool:'goi_y_san_pham',context:context(s)})});}
  return Object.freeze({act,view});
 }g.T1_STORY=Object.freeze({create});
})(window);
