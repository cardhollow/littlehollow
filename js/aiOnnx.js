/* Little Hollow local ONNX/Transformers.js provider */
(function(){
"use strict";

const TRANSFORMERS_URL="https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
const provider={
 id:"onnx",
 ready:false,
 loadingPromise:null,
 worker:null,
 workerUrl:null,
 modelKey:"",
 progressCallback:null
};

function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}
function textOf(m){
 if(!m)return"";
 if(typeof m.content==="string")return m.content;
 if(Array.isArray(m.content))return m.content.map(p=>typeof p==="string"?p:(p&&typeof p.text==="string"?p.text:"")).join("");
 return"";
}
function parseArgs(v){if(v&&typeof v==="object")return v;try{return v?JSON.parse(v):{}}catch(_){return {}}}
function extractToolCall(text){
 const s=String(text||"");
 const tagged=s.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/i);
 if(tagged){try{const x=JSON.parse(tagged[1]);if(x&&typeof x.name==="string")return{name:x.name,arguments:parseArgs(x.arguments),raw:tagged[0]}}catch(_){}}
 const raw=s.match(/\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/);
 if(raw){try{return{name:raw[1],arguments:parseArgs(raw[2]),raw:raw[0]}}catch(_){}}
 return null;
}
function stripToolCall(text,raw){return raw?String(text||"").replace(raw,"").trim():String(text||"").trim()}
function buildToolInstruction(tools){
 if(!Array.isArray(tools)||!tools.length)return"";
 return [
  "You have access to JavaScript tools.",
  "When a tool is needed, output ONLY one tool call in this exact format:",
  '<tool_call>{"name":"TOOL_NAME","arguments":{}}</tool_call>',
  "Use the exact tool name and JSON arguments.",
  "After a tool result is provided, answer the user normally.",
  "Available tools:",
  JSON.stringify(tools)
 ].join("\n");
}
function workerSource(){
 return `
 import { env,pipeline,TextStreamer } from '${TRANSFORMERS_URL}';
 let generator=null;
 let generatorKey="";
 async function getInstance(input){
   const key=[input.model,input.device,input.dtype,input.task].join("|");
   env.allowRemoteModels=true;
   env.allowLocalModels=false;
   env.useBrowserCache=true;
   if(!generator || generatorKey!==key){
     generator=await pipeline(input.task,input.model,{
       device:input.device,
       dtype:input.dtype,
       progress_callback:x=>self.postMessage({status:"progress",...x})
     });
     generatorKey=key;
   }
   return generator;
 }
 self.onmessage=async e=>{
   const input=e.data||{};
   try{
     const gen=await getInstance(input);
     const streamer=new TextStreamer(gen.tokenizer,{
       skip_prompt:true,skip_special_tokens:true,
       callback_function:t=>self.postMessage({status:"update",output:t})
     });
     const messages=input.messages&&input.messages.length?input.messages:(input.text||"");
     await gen(messages,{...(input.parameters||{}),return_full_text:false,streamer});
     self.postMessage({status:"complete"});
   }catch(err){
     self.postMessage({status:"error",output:err&&err.message?err.message:String(err)});
   }
 };
 `;
}
function ensureWorker(){
 if(provider.worker)return provider.worker;
 provider.workerUrl=URL.createObjectURL(new Blob([workerSource()],{type:"text/javascript"}));
 provider.worker=new Worker(provider.workerUrl,{type:"module"});
 provider.worker.addEventListener("message",onWorkerMessage);
 provider.worker.addEventListener("error",e=>window.dispatchEvent(new CustomEvent("littlehollow:ai-error",{detail:{provider:"onnx",error:e}})));
 return provider.worker;
}
function onWorkerMessage(e){
 const d=e.data||{};
 if(d.status==="initiate"||d.status==="progress"||d.status==="done"){
   if(typeof provider.progressCallback==="function")provider.progressCallback(d);
   window.dispatchEvent(new CustomEvent("littlehollow:ai-progress",{detail:clone(d)}));
 }
}
function modelKey(settings){
 const x=settings?.onnx||{};
 const q=x.parameters||{};
 return JSON.stringify({model:x.model,device:x.device,dtype:x.dtype,task:x.task||"text-generation"});
}
async function load(settings,onProgress){
 settings=settings||{};
 if(settings.provider!=="onnx" && settings.onnx==null)throw new Error("ONNX settings are unavailable.");
 const key=modelKey(settings);
 if(provider.ready && provider.modelKey===key)return true;
 provider.progressCallback=onProgress||null;
 ensureWorker();
 return new Promise((resolve,reject)=>{
   const w=provider.worker;
   const onMessage=e=>{
     const d=e.data||{};
     if(d.status==="initiate"||d.status==="progress"||d.status==="done")return;
     if(d.status==="error"){w.removeEventListener("message",onMessage);provider.progressCallback=null;reject(new Error(d.output||"Model load failed."));return}
     if(d.status==="complete"){w.removeEventListener("message",onMessage);provider.ready=true;provider.modelKey=key;provider.progressCallback=null;resolve(true)}
     if(d.status==="update"){}
   };
   w.addEventListener("message",onMessage);
   // A zero-generation probe initializes the pipeline without depending on model output.
   // We use one token and immediately stop only through normal generation semantics.
   w.postMessage({model:settings.onnx.model,device:settings.onnx.device||"wasm",dtype:settings.onnx.dtype||"auto",task:settings.onnx.task||"text-generation",text:"",messages:[{role:"user",content:" "}],parameters:{max_new_tokens:1,do_sample:false}});
 });
}
async function unload(){
 if(provider.worker){provider.worker.terminate();provider.worker=null}
 if(provider.workerUrl){URL.revokeObjectURL(provider.workerUrl);provider.workerUrl=null}
 provider.ready=false;provider.modelKey="";provider.progressCallback=null;
 window.dispatchEvent(new CustomEvent("littlehollow:ai-unloaded",{detail:{provider:"onnx"}}));
}
async function chat({messages,tools,settings,executeTool,onToken}){
 settings=settings||{};
 const onnx=settings.onnx||{};
 const parameters=clone(onnx.parameters||{});
 const systemRole=onnx.system_role||"";
 let working=clone(messages||[]);
 const toolInstruction=buildToolInstruction(tools);
 if(toolInstruction)working=[{role:"system",content:toolInstruction},...working];
 if(systemRole && !working.some(m=>m.role==="system"&&m.content===systemRole))working=[{role:"system",content:systemRole},...working];

 const key=modelKey(settings);
 if(!provider.ready||provider.modelKey!==key)await load(settings);
 const rounds=Math.max(1,Number(settings.agent?.maxToolRounds)||4);
 let finalText="";
 for(let round=0;round<rounds;round++){
   finalText="";
   await new Promise((resolve,reject)=>{
     const w=ensureWorker();
     const listener=e=>{
       const d=e.data||{};
       if(d.status==="update"){finalText+=d.output||"";if(typeof onToken==="function")Promise.resolve(onToken(d.output||"")).catch(()=>{});return}
       if(d.status==="complete"){w.removeEventListener("message",listener);resolve();return}
       if(d.status==="error"){w.removeEventListener("message",listener);reject(new Error(d.output||"Model inference failed."));return}
     };
     w.addEventListener("message",listener);
     w.postMessage({model:onnx.model,device:onnx.device||"wasm",dtype:onnx.dtype||"auto",task:onnx.task||"text-generation",messages:working,parameters});
   });
   const call=extractToolCall(finalText);
   if(!call)return{message:{role:"assistant",content:stripToolCall(finalText)},toolCalls:[],rounds:round+1,model:onnx.model};
   if(typeof executeTool!=="function")return{message:{role:"assistant",content:"Tool call requested, but tool execution is unavailable."},toolCalls:[call],rounds:round+1,model:onnx.model};
   const result=await executeTool(call.name,call.arguments||{});
   working.push({role:"assistant",content:finalText});
   working.push({role:"user",content:`<tool_result name="${call.name}">${JSON.stringify(result)}</tool_result>\nUse this live tool result to answer the original user request.`});
 }
 return{message:{role:"assistant",content:"I reached the tool-call limit for this response."},toolCalls:[],rounds,model:onnx.model};
}

provider.load=load;
provider.unload=unload;
provider.chat=chat;
provider.isReady=()=>provider.ready;
provider.getConfig=()=>({id:provider.id,model:provider.modelKey,ready:provider.ready});
window.LittleHollowAIProviders=window.LittleHollowAIProviders||{};
window.LittleHollowAIProviders.onnx=provider;
window.LittleHollowAIProviders.onnxProvider=provider;
})();
