(function(){
    const SETTINGS_KEY="littlehollow.ai.settings";
    const MAX_HISTORY_MESSAGES=80;

    const DEFAULTS={
        provider:"puter",
        mode:"interactive",
        puter:{model:"claude-sonnet-5"},
        onnx:{
            model:"onnx-community/Qwen3-0.6B-ONNX",
            variant:"q4",
            device:"auto",
            maxNewTokens:512,
            temperature:0.7
        },
        gguf:{
            model:"",
            context:8192,
            threads:4,
            maxNewTokens:512,
            temperature:0.7
        },
        live:{debounceMs:1800,minIntervalMs:2500},
        agent:{maxToolRounds:8}
    };

    function clone(v){return JSON.parse(JSON.stringify(v));}
    function merge(base,extra){
        const out=clone(base);
        if(!extra)return out;
        for(const k of Object.keys(extra)){
            if(extra[k]&&typeof extra[k]==="object"&&!Array.isArray(extra[k])) out[k]=Object.assign({},out[k]||{},extra[k]);
            else out[k]=extra[k];
        }
        return out;
    }
    function getSettings(){
        try{
            const raw=localStorage.getItem(SETTINGS_KEY);
            return raw?merge(DEFAULTS,JSON.parse(raw)):clone(DEFAULTS);
        }catch(e){return clone(DEFAULTS);}
    }
    function getSystemPrompt(){return String(window.SYSTEM_PROMPT||"");}

    let history=[{role:"system",content:getSystemPrompt()}];

    function reset(){history=[{role:"system",content:getSystemPrompt()}];}
    function trimHistory(){
        if(history.length>MAX_HISTORY_MESSAGES) history=[history[0],...history.slice(-(MAX_HISTORY_MESSAGES-1))];
    }

    function normalizeMessage(response){
        if(response&&typeof response==="object"&&response.message)return response.message;
        if(response&&typeof response==="object"&&("content" in response||"tool_calls" in response))return response;
        if(typeof response==="string")return {role:"assistant",content:response};
        return {role:"assistant",content:response&&response.toString?response.toString():""};
    }
    function messageText(msg){
        const c=msg&&msg.content;
        if(typeof c==="string")return c;
        if(Array.isArray(c))return c.map(p=>typeof p==="string"?p:p&&p.text||"").join("");
        return "";
    }
    function safeParseArgs(raw){
        if(raw==null)return {};
        if(typeof raw==="object")return raw;
        try{return JSON.parse(raw);}catch(e){return {};}
    }

    function postToSettings(payload){
        try{
            const frames=document.querySelectorAll("iframe");
            frames.forEach(frame=>{
                try{
                    const src=String(frame.getAttribute("src")||"");
                    if(src.indexOf("app/settings.html")!==-1 && frame.contentWindow) frame.contentWindow.postMessage(payload,"*");
                }catch(e){}
            });
        }catch(e){}
    }
    function onnxStatus(state,message,extra){
        postToSettings(Object.assign({type:"LITTLE_HOLLOW_ONNX_STATUS",state,message},extra||{}));
    }

    async function waitForPuter(timeout=15000){
        const start=Date.now();
        while(!window.puter){
            if(Date.now()-start>timeout)throw new Error("Puter.js did not load.");
            await new Promise(r=>setTimeout(r,100));
        }
        return window.puter;
    }
    async function generatePuter(messages,settings){
        const puter=await waitForPuter();
        return puter.ai.chat(messages,{model:settings.puter.model,tools:Tools.definitions});
    }

    let transformers=null;
    let onnxGenerator=null;
    let onnxKey="";
    let onnxLoading=null;

    async function getTransformers(){
        if(transformers)return transformers;
        transformers=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0");
        return transformers;
    }

    async function chooseDevice(requested,variant){
        if(requested==="wasm")return "wasm";
        if(requested==="webgpu"){
            if(!navigator.gpu)throw new Error("WebGPU is not available in this browser.");
            const adapter=await navigator.gpu.requestAdapter();
            if(!adapter)throw new Error("No WebGPU adapter is available.");
            if((variant==="q4f16"||variant==="fp16") && adapter.features && !adapter.features.has("shader-f16")){
                throw new Error("This GPU does not report shader-f16 support; choose Q4/WASM or another variant.");
            }
            return "webgpu";
        }
        if(navigator.gpu){
            try{
                const adapter=await navigator.gpu.requestAdapter();
                if(adapter && (!((variant==="q4f16"||variant==="fp16")&&adapter.features&&!adapter.features.has("shader-f16")))) return "webgpu";
            }catch(e){}
        }
        return "wasm";
    }

    async function loadOnnx(options){
        const settings=getSettings();
        const model=String((options&&options.model)||settings.onnx.model||"").trim();
        const variant=String((options&&options.variant)||settings.onnx.variant||"q4");
        const requested=String((options&&options.device)||settings.onnx.device||"auto");
        if(!model)throw new Error("No ONNX model configured.");

        let device;
        try{device=await chooseDevice(requested,variant);}catch(error){
            if(requested==="auto")device="wasm"; else throw error;
        }

        const key=model+"|"+variant+"|"+device;
        if(onnxGenerator&&onnxKey===key){
            onnxStatus("ready","ONNX ready — "+model+" / "+variant+" / "+device,{model,variant,device,progress:100});
            return onnxGenerator;
        }
        if(onnxLoading&&onnxLoading.key===key)return onnxLoading.promise;

        onnxStatus("loading","Preparing ONNX runtime…",{model,variant,device,progress:0});

        onnxLoading={key,promise:null};
        onnxLoading.promise=(async()=>{
            const {pipeline,env}=await getTransformers();
            env.allowRemoteModels=true;
            env.allowLocalModels=false;
            env.useBrowserCache=true;
            env.useWasmCache=true;
            env.logLevel=env.LogLevel?env.LogLevel.ERROR:40;

            let lastProgress={};
            const progressCallback=data=>{
                lastProgress=data||{};
                const p=typeof data?.progress==="number"?Math.round(data.progress):null;
                const file=data?.file?String(data.file):"";
                const status=data?.status?String(data.status):"loading";
                let message="Loading ONNX model…";
                if(p!==null)message=(file?file+" — ":"")+p+"%";
                else if(status==="initiate")message=(file?"Preparing "+file+"…":"Preparing model…");
                else if(status==="done")message=(file?"Loaded "+file:"Model file loaded.");
                onnxStatus("loading",message,{model,variant,device,progress:p,file,status});
            };

            const dtype=variant;
            onnxStatus("downloading","Downloading/reading model files…",{model,variant,device,progress:0});
            const generator=await pipeline("text-generation",model,{device,dtype,progress_callback:progressCallback});
            onnxGenerator=generator;
            onnxKey=key;
            onnxStatus("ready","ONNX ready — local inference enabled",{model,variant,device,progress:100});
            return generator;
        })().catch(async error=>{
            onnxGenerator=null;
            onnxKey="";
            onnxStatus("error",error&&error.message?error.message:String(error),{model,variant,device,progress:0});
            throw error;
        }).finally(()=>{onnxLoading=null;});
        return onnxLoading.promise;
    }

    function parseQwenToolCalls(text){
        const calls=[];
        const re=/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
        let m;
        while((m=re.exec(text))){
            const block=m[1].trim();
            const jsonMatch=block.match(/^\{[\s\S]*\}$/);
            if(jsonMatch){
                try{
                    const obj=JSON.parse(jsonMatch[0]);
                    if(obj&&obj.name)calls.push({id:"local_"+Date.now()+"_"+calls.length,function:{name:obj.name,arguments:JSON.stringify(obj.arguments||{})}});
                    continue;
                }catch(e){}
            }
            const fn=block.match(/<function=([^>]+)>/i);
            if(fn){
                const args={};
                const paramRe=/<parameter=([^>]+)>\s*([\s\S]*?)\s*<\/parameter>/gi;
                let pm;
                while((pm=paramRe.exec(block))){
                    let v=pm[2].trim();
                    try{v=JSON.parse(v);}catch(e){}
                    args[pm[1]]=v;
                }
                calls.push({id:"local_"+Date.now()+"_"+calls.length,function:{name:fn[1],arguments:JSON.stringify(args)}});
            }
        }
        return calls;
    }

    async function generateOnnx(messages,settings){
        const generator=await loadOnnx({model:settings.onnx.model,variant:settings.onnx.variant,device:settings.onnx.device});
        const tools=Tools.definitions;
        let output;
        try{
            output=await generator(messages,{max_new_tokens:Number(settings.onnx.maxNewTokens)||512,do_sample:true,temperature:Number(settings.onnx.temperature)||0.7,tools});
        }catch(first){
            console.warn("ONNX generation with native tool argument failed; retrying through chat template.",first);
            const prompt=generator.tokenizer.apply_chat_template(messages,{tools,tokenize:false,add_generation_prompt:true});
            output=await generator(prompt,{max_new_tokens:Number(settings.onnx.maxNewTokens)||512,do_sample:true,temperature:Number(settings.onnx.temperature)||0.7});
        }
        let generated="";
        if(Array.isArray(output)&&output[0]){
            const item=output[0];
            if(typeof item.generated_text==="string")generated=item.generated_text;
            else if(Array.isArray(item.generated_text)){
                const last=item.generated_text[item.generated_text.length-1];
                generated=typeof last?.content==="string"?last.content:"";
            }
        }else if(typeof output==="string")generated=output;

        const toolCalls=parseQwenToolCalls(generated);
        if(toolCalls.length){
            const cleaned=generated.replace(/<tool_call>[\s\S]*?<\/tool_call>/g,"").trim();
            return {role:"assistant",content:cleaned,tool_calls:toolCalls};
        }
        return {role:"assistant",content:generated.trim()};
    }

    async function generateGguf(messages,settings){
        if(!window.LittleHollowGGUF||typeof window.LittleHollowGGUF.chat!=="function")throw new Error("No GGUF browser runtime is installed.");
        return window.LittleHollowGGUF.chat({messages,tools:Tools.definitions,model:settings.gguf.model,context:settings.gguf.context,threads:settings.gguf.threads,max_new_tokens:settings.gguf.maxNewTokens,temperature:settings.gguf.temperature});
    }

    async function generate(messages,settings){
        if(settings.provider==="puter")return generatePuter(messages,settings);
        if(settings.provider==="onnx")return generateOnnx(messages,settings);
        if(settings.provider==="gguf")return generateGguf(messages,settings);
        throw new Error("Unsupported AI provider: "+settings.provider);
    }

    function getStateSnapshot(){
        try{return window.LittleHollowState&&typeof window.LittleHollowState.getSnapshot==="function"?window.LittleHollowState.getSnapshot():null;}catch(e){return null;}
    }
    function makeInput(text,includeState){
        let content=String(text==null?"":text);
        if(includeState){
            const state=getStateSnapshot();
            if(state)content+="\n\n[LITTLE HOLLOW CURRENT STATE]\n"+JSON.stringify(state,null,2)+"\n[/LITTLE HOLLOW CURRENT STATE]";
        }
        return {role:"user",content};
    }

    async function runAgent(text,options){
        options=options||{};
        const settings=getSettings();
        history.push(makeInput(text,!!options.includeState));
        trimHistory();
        Avatar.setEye("thinking",-1);
        const log=[];
        let finalText="";
        try{
            const rounds=Math.max(1,Number(settings.agent.maxToolRounds)||8);
            let complete=false;
            for(let round=0;round<rounds;round++){
                const msg=normalizeMessage(await generate(history,settings));
                const calls=Array.isArray(msg.tool_calls)?msg.tool_calls:[];
                history.push({role:"assistant",content:msg.content||"",...(calls.length?{tool_calls:calls}:{})});
                if(calls.length){
                    for(const call of calls){
                        const name=call.function?call.function.name:call.name;
                        const args=safeParseArgs(call.function?call.function.arguments:call.input);
                        let result;
                        try{result=await Tools.execute(name,args);}catch(error){result={ok:false,summary:"Tool error: "+(error?.message||String(error))};}
                        log.push({name,summary:result?.summary||"completed"});
                        history.push({role:"tool",tool_call_id:call.id||("call_"+Date.now()),content:JSON.stringify(result)});
                    }
                    trimHistory();
                    continue;
                }
                finalText=messageText(msg);
                complete=true;
                break;
            }
            if(!complete)log.push({name:"__agent__",summary:"Maximum tool rounds reached."});
        }catch(error){
            console.error("Little Hollow AI error:",error);
            Avatar.setEye("normal");
            return {ok:false,visibleMessage:"AI error: "+(error?.message||String(error)),log};
        }
        Avatar.setEye("normal");
        return {ok:true,visibleMessage:finalText?AvatarText.process(finalText):"",log};
    }

    async function send(text){
        const settings=getSettings();
        return runAgent(text,{includeState:settings.mode==="live"});
    }

    let liveTimer=null;
    let liveRunning=false;
    let livePending=false;
    let lastLiveRun=0;
    let lastLiveHash="";
    function stateHash(v){
        let s="";try{s=JSON.stringify(v);}catch(e){s=String(v);}
        let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}return (h>>>0).toString(16);
    }
    function scheduleLive(reason){
        if(getSettings().mode!=="live")return;
        clearTimeout(liveTimer);livePending=true;
        liveTimer=setTimeout(()=>{liveTimer=null;runLive(reason);},Math.max(250,Number(getSettings().live.debounceMs)||1800));
    }
    async function runLive(reason){
        if(liveRunning){livePending=true;return;}
        const settings=getSettings();
        if(settings.mode!=="live"){livePending=false;return;}
        const now=Date.now();
        const minimum=Math.max(1000,Number(settings.live.minIntervalMs)||2500);
        if(now-lastLiveRun<minimum){scheduleLive(reason);return;}
        const state=getStateSnapshot();
        const hash=stateHash(state);
        if(hash===lastLiveHash&&!livePending)return;
        lastLiveHash=hash;livePending=false;liveRunning=true;lastLiveRun=now;
        try{await runAgent("LIVE EVENT: "+String(reason||"Little Hollow state changed.")+" Observe the supplied state and act only if useful. Do not produce unnecessary user-facing text.",{includeState:true});}
        catch(e){console.error("Live agent error:",e);}
        liveRunning=false;
        if(livePending)scheduleLive("Another state change occurred.");
    }
    function enableLive(){lastLiveHash="";scheduleLive("Live mode enabled.");}
    function disableLive(){clearTimeout(liveTimer);liveTimer=null;livePending=false;}

    window.addEventListener("littlehollow:statechange",e=>{if(getSettings().mode==="live")scheduleLive(e.detail?.reason||"Little Hollow state changed.");});
    window.addEventListener("storage",e=>{
        if(e.key!==SETTINGS_KEY)return;
        history[0]={role:"system",content:getSystemPrompt()};
        if(getSettings().mode==="live")enableLive();else disableLive();
    });
    window.addEventListener("littlehollow:settingschange",()=>{
        history[0]={role:"system",content:getSystemPrompt()};
        const s=getSettings();
        if(s.mode==="live")enableLive();else disableLive();
    });

    window.addEventListener("message",event=>{
        const d=event.data||{};
        if(d.type==="LITTLE_HOLLOW_PREPARE_ONNX"){
            const o=d.settings||{};
            loadOnnx({model:o.model,variant:o.variant,device:o.device}).catch(()=>{});
        }
        if(d.type==="LITTLE_HOLLOW_ONNX_STATUS_REQUEST"){
            const s=getSettings();
            if(onnxGenerator&&onnxKey)onnxStatus("ready","ONNX ready — local inference enabled",{model:s.onnx.model,variant:s.onnx.variant,progress:100});
            else onnxStatus("configured","Configured — click LOAD MODEL or use AI to initialize.",{model:s.onnx.model,variant:s.onnx.variant,progress:0});
        }
        if(d.type==="LITTLE_HOLLOW_CLEAR_ONNX"){
            onnxGenerator=null;onnxKey="";onnxStatus("cleared","Runtime unloaded from memory.");
        }
    });

    if(getSettings().mode==="live")enableLive();

    window.LittleHollowAI={send,reset,runAgent,scheduleLive,enableLive,disableLive,getSettings,getProvider:()=>getSettings().provider,getMode:()=>getSettings().mode,getHistory:()=>history.slice(),prepareOnnx:()=>loadOnnx({})};
})();
