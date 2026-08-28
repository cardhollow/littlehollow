(function(){
    const MODEL="claude-sonnet-5";
    const MAX_TOOL_ROUNDS=8;
    const history=[{role:"system",content:window.SYSTEM_PROMPT}];

    function getMessage(response){
        if(response&&typeof response==="object"&&response.message) return response.message;
        if(response&&typeof response==="object"&&("content" in response||"tool_calls" in response)) return response;
        if(typeof response==="string") return {role:"assistant",content:response};
        return {role:"assistant",content:response&&response.toString?response.toString():""};
    }
    function messageText(msg){
        const c=msg&&msg.content;
        if(typeof c==="string") return c;
        if(Array.isArray(c)) return c.map(p=>typeof p==="string"?p:p&&p.text||"").join("");
        return "";
    }
    function safeParseArgs(raw){
        if(raw==null)return {};
        if(typeof raw==="object")return raw;
        try{return JSON.parse(raw)}catch(e){return {}}
    }
    async function waitForPuter(timeout=15000){
        const start=Date.now();
        while(!window.puter){
            if(Date.now()-start>timeout) throw new Error("Puter.js did not load.");
            await new Promise(r=>setTimeout(r,100));
        }
        return window.puter;
    }
    async function send(userText){
        history.push({role:"user",content:userText});
        Avatar.setEye("thinking",-1);
        const log=[];
        let finalText="";
        try{
            const puterApi=await waitForPuter();
            for(let round=0;round<MAX_TOOL_ROUNDS;round++){
                Avatar.setEye("thinking",-1);
                const response=await puterApi.ai.chat(history,{model:MODEL,tools:Tools.definitions});
                const msg=getMessage(response);
                const toolCalls=msg.tool_calls;
                history.push({role:"assistant",content:msg.content||"",...(toolCalls&&toolCalls.length?{tool_calls:toolCalls}:{})});
                if(toolCalls&&toolCalls.length){
                    for(const call of toolCalls){
                        const fnName=call.function?call.function.name:call.name;
                        const args=safeParseArgs(call.function?call.function.arguments:call.input);
                        const result=await Tools.execute(fnName,args);
                        log.push(fnName+": "+result.summary);
                        const toolMessage={role:"tool",tool_call_id:call.id,content:JSON.stringify(result)};
                        history.push(toolMessage);
                    }
                    continue;
                }
                finalText=messageText(msg);
                break;
            }
        }catch(err){
            console.error("Little Hollow AI error",err);
            Avatar.setEye("normal");
            return {visibleMessage:"I couldn't reach my AI backend just now. ("+(err&&err.message?err.message:"unknown error")+")",log:[]};
        }
        Avatar.setEye("normal");
        const visibleMessage=finalText?AvatarText.process(finalText):"";
        return {visibleMessage,log};
    }
    function reset(){history.length=1}
    window.LittleHollowAI={send,reset};
})();