(function(){
    const definitions=[
        {type:"function",function:{name:"open_application",description:"Open a built-in Little Hollow application. For pre-filling content, prefer the dedicated tools (open_notepad, open_calculator, open_paint) — but path/text/equation/strokes/select are also accepted here and forwarded to the app.",parameters:{type:"object",properties:{name:{type:"string",enum:["Apps","File Manager","Clock","Calculator","Notepad","Paint","tictactoe","snake","imageViewer","videoPlayer","audioPlayer","Messenger"]},src:{type:"string"},path:{type:"string"},text:{type:"string"},equation:{type:"string"},strokes:{type:"array",items:{type:"object"}},select:{type:"boolean"}},required:["name"]}}},
        {type:"function",function:{name:"open_notepad",description:"Open Notepad. You can supply a virtual file path to load, initial text to show, or both.",parameters:{type:"object",properties:{path:{type:"string"},text:{type:"string"},title:{type:"string"}},required:[]}}},
        {type:"function",function:{name:"open_paint",description:"Open Paint with an optional generated painting. A painting is an array of strokes; each stroke can contain color, size and points as [{x,y}]. Coordinates use a 0..1 normalized canvas.",parameters:{type:"object",properties:{strokes:{type:"array",items:{type:"object"}},title:{type:"string"}},required:[]}}},
        {type:"function",function:{name:"open_calculator",description:"Open Calculator with an equation already entered and evaluated. It shows both the equation and answer.",parameters:{type:"object",properties:{equation:{type:"string"}},required:["equation"]}}},
        {type:"function",function:{name:"open_file",description:"Open a virtual file by path using the most suitable app. Text/code opens in Notepad, images/videos/audio use their player/viewer, and archives can be viewed in File Manager.",parameters:{type:"object",properties:{path:{type:"string"}},required:["path"]}}},
        {type:"function",function:{name:"open_file_manager",description:"Open File Manager. In select mode it can be used as a file selector for another app.",parameters:{type:"object",properties:{select:{type:"boolean"}},required:[]}}},
        {type:"function",function:{name:"open_window",description:"Open a window showing text, code, HTML, generated content, results, or other structured output.",parameters:{type:"object",properties:{title:{type:"string"},content_type:{type:"string",enum:["text","code","html"]},content:{type:"string"}},required:["content_type","content"]}}},
        {type:"function",function:{name:"open_iframe",description:"Open an iframe window for a URL, including embeddable web pages or YouTube embeds when permitted.",parameters:{type:"object",properties:{title:{type:"string"},url:{type:"string"},width:{type:"integer",minimum:240},height:{type:"integer",minimum:180}},required:["url"]}}},
        {type:"function",function:{name:"open_browser_url",description:"Open a URL in the Little Hollow Browser as a new tab.",parameters:{type:"object",properties:{url:{type:"string"},title:{type:"string"}},required:["url"]}}},
        {type:"function",function:{name:"browser_new_tab",description:"Create a new empty tab in the Little Hollow Browser.",parameters:{type:"object",properties:{}},required:[]}}},
        {type:"function",function:{name:"browser_get_tabs",description:"Get the current tabs in the Little Hollow Browser including index, id, title, URL, home state, and active state.",parameters:{type:"object",properties:{}},required:[]}}},
        {type:"function",function:{name:"browser_close_tab",description:"Close a Little Hollow Browser tab by zero-based index.",parameters:{type:"object",properties:{index:{type:"integer",minimum:0}},required:["index"]}}},
        {type:"function",function:{name:"create_folder",description:"Create a folder in the Little Hollow virtual filesystem.",parameters:{type:"object",properties:{path:{type:"string"}},required:["path"]}}},
        {type:"function",function:{name:"remove_folder",description:"Remove a folder from the Little Hollow virtual filesystem.",parameters:{type:"object",properties:{path:{type:"string"}},required:["path"]}}},
        {type:"function",function:{name:"list_folder",description:"List files and folders inside a Little Hollow virtual filesystem folder.",parameters:{type:"object",properties:{path:{type:"string"}},required:["path"]}}},
        {type:"function",function:{name:"web_search",description:"Search the public web for external information and return indexed results.",parameters:{type:"object",properties:{query:{type:"string"},max_results:{type:"integer",minimum:1,maximum:10}},required:["query"]}}},
        {type:"function",function:{name:"write_file",description:"Create or overwrite one virtual filesystem file. Paths can use chxd:/local/, chxd:/session/, chxd:/indexdb/ and puter:/ only when Puter filesystem support is actually available.",parameters:{type:"object",properties:{path:{type:"string"},content:{type:"string"},create:{type:"boolean"}},required:["path","content"]}}},
        {type:"function",function:{name:"write_files",description:"Create or overwrite multiple virtual filesystem files in one operation.",parameters:{type:"object",properties:{files:{type:"array",items:{type:"object",properties:{path:{type:"string"},content:{type:"string"},create:{type:"boolean"}},required:["path","content"]}}},required:["files"]}}},
        {type:"function",function:{name:"read_file",description:"Read a virtual filesystem file and open it in a viewer window.",parameters:{type:"object",properties:{path:{type:"string"}},required:["path"]}}},
        {type:"function",function:{name:"remove_file",description:"Delete a virtual filesystem file.",parameters:{type:"object",properties:{path:{type:"string"}},required:["path"]}}},
        {type:"function",function:{name:"find_files",description:"Search for virtual files by wildcard pattern.",parameters:{type:"object",properties:{pattern:{type:"string"}},required:["pattern"]}}},
        {type:"function",function:{name:"list_files",description:"List virtual files under a filesystem prefix.",parameters:{type:"object",properties:{prefix:{type:"string"}},required:["prefix"]}}},
        {type:"function",function:{name:"zip_files",description:"Create a ZIP archive from multiple virtual files and save the ZIP as a virtual file.",parameters:{type:"object",properties:{files:{type:"array",items:{type:"string"}},output_path:{type:"string"}},required:["files","output_path"]}}},
        {type:"function",function:{name:"open_onecompiler",description:"Open OneCompiler with one language and one or multiple files. The files can be edited and run in the embedded editor.",parameters:{type:"object",properties:{language:{type:"string"},code:{type:"string"},name:{type:"string"},files:{type:"array",items:{type:"object"}},run:{type:"boolean"}},required:["language"]}}},
        {type:"function",function:{name:"run_code",description:"Open OneCompiler using source from a virtual file path and optionally run it.",parameters:{type:"object",properties:{path:{type:"string"},language:{type:"string"},run:{type:"boolean"}},required:["path"]}}},
        {type:"function",function:{name:"execute_javascript",description:"Execute arbitrary JavaScript inside a sandboxed isolated frame. It has no DOM or network access and only the provided Little Hollow file APIs: await lh.readFile(path), await lh.writeFile(path,content), await lh.listFiles(prefix), await lh.removeFile(path), and console.log(...). The job is time limited. Use this for generating documents, data, many files, SVG/HTML/text, and other file-building tasks.",parameters:{type:"object",properties:{code:{type:"string"},timeout_ms:{type:"integer",minimum:250,maximum:10000}},required:["code"]}}},
        {type:"function",function:{name:"close_all_windows",description:"Close all currently open windows.",parameters:{type:"object",properties:{}}}}
    ];
    const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    function commandLine(name,args){const shown=Object.entries(args||{}).map(([k,v])=>k+"="+JSON.stringify(v)).join(" ");return "> "+name+(shown?" "+shown:"");}
    function terminal(command){return WM.openWindow({title:"TERMINAL",html:"<div class='terminal'><div class='terminal-head'>LITTLE HOLLOW TERMINAL</div><pre id='terminal-out'>"+esc(command)+"\n<span class='cursor'>█</span></pre></div>",width:"560px",height:"320px",noPad:false,standaloneKey:null});}
    function terminalUpdate(win,command,text){const out=win&&win.el&&win.el.querySelector("#terminal-out");if(out)out.innerHTML=esc(command)+"\n"+esc(text||"")+"\n<span class='cursor'>█</span>";}
    function closeTerminalSoon(win,delay=900){setTimeout(()=>{if(win&&!win.closed)WM.closeWindow(win);},delay);}
    function getBrowserAPI(){
        if(window.BrowserAPI)return window.BrowserAPI;
        const frames=document.querySelectorAll("iframe");
        for(const frame of frames){
            try{
                if(frame.contentWindow&&frame.contentWindow.BrowserAPI)return frame.contentWindow.BrowserAPI;
            }catch(e){}
        }
        return null;
    }
    function browserUnavailable(){return {ok:false,summary:"Embedded Browser API is not available."};}
    function browserOpenUrl(url,title){
        const api=getBrowserAPI();
        if(!api||typeof api.openUrl!=="function")return browserUnavailable();
        url=String(url||"").trim();
        if(!url)return {ok:false,summary:"Browser URL is empty."};
        const result=api.openUrl(url,title);
        return {ok:true,summary:"Opened "+url+" in a new Browser tab.",tab:result||null};
    }
    function browserNewTab(){
        const api=getBrowserAPI();
        if(!api||typeof api.newTab!=="function")return browserUnavailable();
        const result=api.newTab();
        return {ok:true,summary:"Created a new Browser tab.",tab:result||null};
    }
    function browserGetTabs(){
        const api=getBrowserAPI();
        if(!api||typeof api.getTabs!=="function")return browserUnavailable();
        const tabs=api.getTabs();
        return {ok:true,summary:"Retrieved "+tabs.length+" Browser tab(s).",tabs:tabs};
    }
    function browserCloseTab(index){
        const api=getBrowserAPI();
        if(!api||typeof api.closeTab!=="function")return browserUnavailable();
        const i=Number(index);
        if(!Number.isInteger(i)||i<0)return {ok:false,summary:"Tab index must be a non-negative integer."};
        const result=api.closeTab(i);
        if(!result)return {ok:false,summary:"No Browser tab exists at index "+i+"."};
        return {ok:true,summary:"Closed Browser tab at index "+i+"."};
    }
    function folderPath(path){
        let p=String(path||"").trim();
        if(!p)return "";
        try{
            p=FS.normalize(p);
        }catch(e){}
        if(!p.endsWith("/"))p+="/";
        return p;
    }
    async function createFolder(path){
        const p=folderPath(path);
        if(!p)return {ok:false,summary:"Folder path is empty."};
        try{
            if(typeof FS.mkdir==="function"){
                const r=await FS.mkdir(p);
                if(r===true||r&&r.ok===true)return {ok:true,summary:"Created folder "+p+".",path:p};
                return {ok:false,summary:r&&r.error?r.error:"Could not create folder "+p+"."};
            }
        }catch(e){}
        try{
            if(typeof FS.createFolder==="function"){
                const r=await FS.createFolder(p);
                if(r===true||r&&r.ok===true)return {ok:true,summary:"Created folder "+p+".",path:p};
                return {ok:false,summary:r&&r.error?r.error:"Could not create folder "+p+"."};
            }
        }catch(e){}
        try{
            if(typeof FS.makeDir==="function"){
                const r=await FS.makeDir(p);
                if(r===true||r&&r.ok===true)return {ok:true,summary:"Created folder "+p+".",path:p};
                return {ok:false,summary:r&&r.error?r.error:"Could not create folder "+p+"."};
            }
        }catch(e){}
        return {ok:false,summary:"This filesystem does not expose folder creation."};
    }
    async function removeFolder(path){
        const p=folderPath(path);
        if(!p)return {ok:false,summary:"Folder path is empty."};
        try{
            if(typeof FS.rmdir==="function"){
                const r=await FS.rmdir(p);
                if(r===true||r&&r.ok===true)return {ok:true,summary:"Removed folder "+p+".",path:p};
                return {ok:false,summary:r&&r.error?r.error:"Could not remove folder "+p+"."};
            }
        }catch(e){}
        try{
            if(typeof FS.removeFolder==="function"){
                const r=await FS.removeFolder(p);
                if(r===true||r&&r.ok===true)return {ok:true,summary:"Removed folder "+p+".",path:p};
                return {ok:false,summary:r&&r.error?r.error:"Could not remove folder "+p+"."};
            }
        }catch(e){}
        try{
            if(typeof FS.removeDirectory==="function"){
                const r=await FS.removeDirectory(p);
                if(r===true||r&&r.ok===true)return {ok:true,summary:"Removed folder "+p+".",path:p};
                return {ok:false,summary:r&&r.error?r.error:"Could not remove folder "+p+"."};
            }
        }catch(e){}
        return {ok:false,summary:"This filesystem does not expose folder removal."};
    }
    async function listFolder(path){
        const p=folderPath(path);
        if(!p)return {ok:false,summary:"Folder path is empty."};
        try{
            const files=await FS.list(p);
            return {ok:true,summary:files.length?files.length+" item(s) found in "+p+".":"Folder is empty.",path:p,files:files};
        }catch(e){
            return {ok:false,summary:e.message||String(e),path:p};
        }
    }
    async function webSearch(query,maxResults){
        query=String(query||"").trim();
        if(!query)return {ok:false,summary:"Search query is empty."};
        const limit=Math.max(1,Math.min(10,Number(maxResults)||5));
        Avatar.setEye("search",-1);
        try{
            const url="https://api.duckduckgo.com/?q="+encodeURIComponent(query)+"&format=json&no_html=1&skip_disambig=0";
            const r=await fetch(url,{headers:{Accept:"application/json"}});
            if(!r.ok)throw new Error("HTTP "+r.status);
            const d=await r.json(); const results=[];
            if(d.AbstractText)results.push({title:d.Heading||query,snippet:d.AbstractText,url:d.AbstractURL||""});
            const walk=a=>{for(const x of Array.isArray(a)?a:[]){if(results.length>=limit)break;if(x.Topics)walk(x.Topics);else if(x.Text)results.push({title:String(x.Text).split(" - ")[0].slice(0,120),snippet:x.Text,url:x.FirstURL||""});}};
            walk(d.RelatedTopics); walk(d.Results);
            return {ok:true,summary:"Search completed for \""+query+"\" with "+results.length+" result(s).",results,query};
        }catch(e){return {ok:false,summary:"Web search failed: "+e.message,query};}
        finally{Avatar.setEye("normal");}
    }
    function utf8(s){return new TextEncoder().encode(String(s));}
    function u16(n){return [n&255,(n>>>8)&255];}
    function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];}
    function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
    function makeZip(entries){
        const parts=[],central=[];let offset=0;
        for(const entry of entries){const name=utf8(entry.name.replace(/^\/+/,"")),data=entry.data;const crc=crc32(data),header=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name,...data]);parts.push(header);central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]));offset+=header.length;}
        const cdStart=offset,cdSize=central.reduce((n,x)=>n+x.length,0),eocd=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(central.length),...u16(central.length),...u32(cdSize),...u32(cdStart),...u16(0)]);
        const all=[...parts,...central,eocd],blob=new Blob(all,{type:"application/zip"});return blob;
    }
    function blobDataURL(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});}
    async function zipFiles(files,output){
        const entries=[];
        for(const path of Array.isArray(files)?files:[]){const p=FS.normalize(path),r=await FS.read(p);if(!r.ok)return {ok:false,summary:r.error};let data;if(/^data:[^;]+;base64,/i.test(r.content)){const b=atob(r.content.split(",")[1]),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);data=a;}else data=utf8(r.content);entries.push({name:p.replace(/^.*?:\/(?:[^/]+\/)?/,"")||p.split("/").pop(),data});}
        const blob=makeZip(entries),dataUrl=await blobDataURL(blob),dest=FS.normalize(output),w=await FS.write(dest,dataUrl,true);if(!w.ok)return {ok:false,summary:w.error};return {ok:true,summary:"Created ZIP "+dest+" containing "+entries.length+" file(s).",path:dest,binary:true};
    }
    function sandboxRun(code,timeoutMs){
        return new Promise(resolve=>{
            const id="sb-"+Date.now()+"-"+Math.random().toString(36).slice(2),logs=[];
            const frame=document.createElement("iframe");frame.setAttribute("sandbox","allow-scripts");frame.style.cssText="position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;border:0";
            const csp="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-src 'none'; child-src 'none'; form-action 'none'; base-uri 'none'";
            const safeCode=String(code||"").replace(/<\/script/gi,"<\\/script");
            frame.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="${csp}"><script>
const RID=${JSON.stringify(id)};
const pending=new Map();
let seq=0;
function call(api,args){return new Promise((resolve,reject)=>{const rid=RID+":"+(++seq);pending.set(rid,{resolve,reject});parent.postMessage({type:"LH_SANDBOX_REQ",rid,api,args},"*")})}
window.addEventListener("message",e=>{const d=e.data||{};if(d.type==="LH_SANDBOX_RES"&&pending.has(d.rid)){const p=pending.get(d.rid);pending.delete(d.rid);d.ok?p.resolve(d.value):p.reject(new Error(d.error||"operation failed"));}});
const lh={readFile:p=>call("readFile",[p]),writeFile:(p,c)=>call("writeFile",[p,c]),listFiles:p=>call("listFiles",[p||""]),removeFile:p=>call("removeFile",[p]),log:(...a)=>parent.postMessage({type:"LH_SANDBOX_LOG",id:RID,args:a.map(String)},"*")};
(async()=>{try{const result=await (async()=>{
${safeCode}
})();parent.postMessage({type:"LH_SANDBOX_DONE",id:RID,ok:true,result:result==null?"":String(result)},"*")}catch(e){parent.postMessage({type:"LH_SANDBOX_DONE",id:RID,ok:false,error:e&&e.stack||String(e)},"*")}})();<\/script>`;
            document.body.appendChild(frame);
            let done=false; const finish=r=>{if(done)return;done=true;window.removeEventListener("message",onMessage);frame.remove();resolve(r);};
            const onMessage=async e=>{const d=e.data||{};if(d.id!==id&&d.rid!==undefined&&!String(d.rid).startsWith(id+":"))return;if(d.type==="LH_SANDBOX_LOG")logs.push(d.args.join(" "));if(d.type==="LH_SANDBOX_REQ"&&String(d.rid).startsWith(id+":")){try{let value;const a=d.args||[];if(d.api==="readFile"){const r=await FS.read(a[0]);if(!r.ok)throw new Error(r.error);value=r.content;}else if(d.api==="writeFile"){const r=await FS.write(a[0],a[1],true);if(!r.ok)throw new Error(r.error);value=true;}else if(d.api==="listFiles")value=await FS.list(a[0]);else if(d.api==="removeFile"){const r=await FS.remove(a[0]);if(!r.ok)throw new Error(r.error);value=true;}else throw new Error("Unknown sandbox API: "+d.api);e.source.postMessage({type:"LH_SANDBOX_RES",rid:d.rid,ok:true,value},"*");}catch(err){e.source.postMessage({type:"LH_SANDBOX_RES",rid:d.rid,ok:false,error:String(err.message||err)},"*");}}if(d.type==="LH_SANDBOX_DONE")finish({ok:!!d.ok,summary:d.ok?("Sandbox JavaScript finished."+(d.result?" Result: "+d.result:"")):("Sandbox JavaScript failed: "+d.error),logs});};
            window.addEventListener("message",onMessage);
            setTimeout(()=>finish({ok:false,summary:"Sandbox JavaScript timed out after "+timeoutMs+" ms.",logs}),timeoutMs);
        });
    }
    async function executeRaw(name,args){
        args=args||{};
        if(name==="open_application"){
            const hasContent=args.path!=null||args.text!=null||args.equation!=null||(Array.isArray(args.strokes)&&args.strokes.length>0)||!!args.select;
            return Apps.openApp(args.name,{src:args.src,path:args.path,text:args.text,equation:args.equation,painting:Array.isArray(args.strokes)?args.strokes:undefined,selectMode:!!args.select,allowMultiple:hasContent}).ok?{ok:true,summary:"Opened "+args.name+"."}:{ok:false,summary:"Could not open "+args.name+"."};
        }
        if(name==="open_notepad")return Apps.openApp("Notepad",{path:args.path,text:args.text,title:args.title,allowMultiple:!!args.path||args.text!=null}).ok?{ok:true,summary:"Opened Notepad"+(args.path?" with "+args.path:"")+"."}:{ok:false,summary:"Could not open Notepad."};
        if(name==="open_paint")return Apps.openApp("Paint",{painting:Array.isArray(args.strokes)?args.strokes:[],title:args.title,allowMultiple:true}).ok?{ok:true,summary:"Opened Paint with the requested painting."}:{ok:false,summary:"Could not open Paint."};
        if(name==="open_calculator")return Apps.openApp("Calculator",{equation:String(args.equation||""),allowMultiple:true}).ok?{ok:true,summary:"Opened Calculator with equation "+args.equation+"."}:{ok:false,summary:"Could not open Calculator."};
        if(name==="open_file_manager")return Apps.openApp("File Manager",{selectMode:!!args.select,allowMultiple:!!args.select}).ok?{ok:true,summary:"Opened File Manager."}:{ok:false,summary:"Could not open File Manager."};
        if(name==="open_file"){
            const p=FS.normalize(args.path),ext=(p.split("?")[0].split(".").pop()||"").toLowerCase();
            if(ext==="png"||ext==="jpg"||ext==="jpeg"||ext==="gif"||ext==="webp")return Apps.openApp("imageViewer",{src:p,allowMultiple:true}).ok?{ok:true,summary:"Opened image "+p+"."}:{ok:false,summary:"Could not open image."};
            if(ext==="mp4"||ext==="webm"||ext==="mov")return Apps.openApp("videoPlayer",{src:p,allowMultiple:true}).ok?{ok:true,summary:"Opened video "+p+"."}:{ok:false,summary:"Could not open video."};
            if(ext==="mp3"||ext==="wav"||ext==="ogg")return Apps.openApp("audioPlayer",{src:p,allowMultiple:true}).ok?{ok:true,summary:"Opened audio "+p+"."}:{ok:false,summary:"Could not open audio."};
            return Apps.openApp("Notepad",{path:p,allowMultiple:true}).ok?{ok:true,summary:"Opened "+p+" in Notepad."}:{ok:false,summary:"Could not open "+p+"."};
        }
        if(name==="open_window"){const type=String(args.content_type||"text").toLowerCase(),c=String(args.content||"");const html=type==="html"?c:(type==="code"?"<pre style='white-space:pre-wrap;margin:0;font-family:monospace;font-size:12px;'>"+esc(c)+"</pre>":"<div style='white-space:pre-wrap;'>"+esc(c)+"</div>");WM.openWindow({title:args.title||"OUTPUT",html,width:"560px",height:"400px"});return {ok:true,summary:"Opened output window."};}
        if(name==="open_iframe"){const u=String(args.url||"");if(!/^https?:\/\//i.test(u))return {ok:false,summary:"URL must start with http:// or https://."};WM.openWindow({title:args.title||"WEB",iframeSrc:u,width:(Number(args.width)||720)+"px",height:(Number(args.height)||520)+"px",noPad:true});return {ok:true,summary:"Opened web content."};}
        if(name==="open_browser_url")return browserOpenUrl(args.url,args.title);
        if(name==="browser_new_tab")return browserNewTab();
        if(name==="browser_get_tabs")return browserGetTabs();
        if(name==="browser_close_tab")return browserCloseTab(args.index);
        if(name==="create_folder")return await createFolder(args.path);
        if(name==="remove_folder")return await removeFolder(args.path);
        if(name==="list_folder")return await listFolder(args.path);
        if(name==="web_search")return await webSearch(args.query,args.max_results);
        if(name==="write_file"){const p=FS.normalize(args.path),r=await FS.write(p,args.content||"",args.create!==false);return r.ok?{ok:true,summary:"Wrote "+p+"."}:{ok:false,summary:r.error};}
        if(name==="write_files"){const fs=Array.isArray(args.files)?args.files:[];const done=[];for(const f of fs){const p=FS.normalize(f.path),r=await FS.write(p,f.content||"",f.create!==false);if(!r.ok)return {ok:false,summary:r.error,written:done};done.push(p);}return {ok:true,summary:"Wrote "+done.length+" file(s): "+done.join(", ")+"."};}
        if(name==="read_file"){const p=FS.normalize(args.path),r=await FS.read(p);if(!r.ok)return {ok:false,summary:r.error};WM.openWindow({title:p.split("/").pop(),html:"<pre style='white-space:pre-wrap;margin:0;font-family:monospace;font-size:12px;'>"+esc(r.content)+"</pre>",width:"560px",height:"420px"});return {ok:true,summary:"Opened "+p+"."};}
        if(name==="remove_file"){const p=FS.normalize(args.path),r=await FS.remove(p);return r.ok?{ok:true,summary:"Removed "+p+"."}:{ok:false,summary:r.error};}
        if(name==="find_files"){const r=await FS.find(args.pattern||"*");return {ok:true,summary:r.length?"Found "+r.length+" file(s).":"No files matched.",files:r};}
        if(name==="list_files"){const r=await FS.list(args.prefix||"");return {ok:true,summary:r.length?r.length+" file(s) found.":"No files found.",files:r};}
        if(name==="zip_files")return await zipFiles(args.files,args.output_path);
        if(name==="open_onecompiler")return Apps.openOneCompiler({language:args.language,code:args.code||"",name:args.name,files:args.files,run:!!args.run}).ok?{ok:true,summary:"Opened OneCompiler."}:{ok:false,summary:"Could not open OneCompiler."};
        if(name==="run_code"){
            const p=FS.normalize(args.path),r=await FS.read(p);
            if(!r.ok)return {ok:false,summary:r.error};
            const ext=p.split(".").pop().toLowerCase();
            const lang=args.language||({js:"javascript",javascript:"javascript",py:"python",python:"python",java:"java",c:"c",cpp:"cpp",cs:"csharp",php:"php",ts:"typescript",html:"html",css:"css"}[ext]||"javascript");
            return Apps.openOneCompiler({language:lang,files:[{name:p.split("/").pop(),content:r.content}],run:args.run!==false}).ok?{ok:true,summary:"Opened "+p+" in OneCompiler."}:{ok:false,summary:"Could not open OneCompiler."};
        }
        if(name==="execute_javascript")return await sandboxRun(args.code||"",Math.max(250,Math.min(10000,Number(args.timeout_ms)||5000)));
        if(name==="close_all_windows"){WM.closeAll();return {ok:true,summary:"Closed all currently open windows."};}
        return {ok:false,summary:"Unknown tool: "+name};
    }
    async function execute(name,args){
        Avatar.setEye(name==="web_search"?"search":"matrix",-1);
        const win=terminal(commandLine(name,args));
        try{
            const result=await executeRaw(name,args);
            terminalUpdate(win,commandLine(name,args),result);
            if(result.ok)closeTerminalSoon(win,850);
            else closeTerminalSoon(win,1400);
            return result;
        }catch(e){
            const r={ok:false,summary:"Tool error: "+(e.message||String(e))};
            terminalUpdate(win,commandLine(name,args),r);
            closeTerminalSoon(win,1600);
            return r;
        }finally{
            if(name!=="web_search")Avatar.setEye("normal");
        }
    }
    window.Tools={definitions,execute};
})();
