(function(g){'use strict';
 /* Bộ thực thi DEMO, không gọi API, không gửi tin nhắn, không gọi điện. */
 function invoke(tool, context, mockOutcome){
   const evaluated=g.T1_AUTONOMY.evaluateToolRequest({tool,context});
   if(evaluated.decision!=='MOCK_EXECUTE') return { ...evaluated, transport:'NOT_EXECUTED' };
   if(tool==='chuyen_duoc_si') return { ...evaluated,
     transport:mockOutcome==='failure'?'MOCK_FAILURE':'MOCK_SUCCESS',
     realTransfer:false,acknowledged:false};
   return {...evaluated, transport:'MOCK_DISPLAY_ONLY',realTransfer:false};
 }
 g.T1_MOCK_TOOLS={invoke};
})(window);
