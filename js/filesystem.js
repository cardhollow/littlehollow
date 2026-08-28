(function(){
    const SYSTEM_FILES={
        "chxd:/system/about.txt":"Little Hollow Environment\nCreated by CHXD\n\nProtected system filesystem.\nFiles here cannot be modified or removed.",
        "chxd:/system/readme.txt":"Welcome to Little Hollow.\nOpen Apps, File Manager, Notepad, Paint, Calculator, or Messenger."
    };
    function normalize(path){
        let p=String(path==null?"":path).trim().replace(/\\/g,"/").replace(/\/+/g,"/");
        if(/^local:\//i.test(p)) p="chxd:/local/"+p.slice(7);
        if(/^session:\//i.test(p)) p="chxd:/session/"+p.slice(9);
        if(/^indexdb:\//i.test(p)) p="chxd:/indexdb/"+p.slice(9);
        if(/^puter:\//i.test(p)) p="puter:/"+p.slice(8);
        return p;
    }
    function zone(path){
        path=normalize(path);
        if(path.indexOf("chxd:/local/")===0)return "local";
        if(path.indexOf("chxd:/session/")===0)return "session";
        if(path.indexOf("chxd:/indexdb/")===0)return "indexdb";
        if(path.indexOf("chxd:/system/")===0)return "system";
        if(path.indexOf("puter:/")===0)return "puter";
        return null;
    }
    const storageKey=path=>"LH::"+normalize(path);
    let idbPromise=null;
    function openIDB(){
        if(idbPromise)return idbPromise;
        idbPromise=new Promise((resolve,reject)=>{
            const req=indexedDB.open("littleHollowFS",1);
            req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("files"))req.result.createObjectStore("files");};
            req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
        });
        return idbPromise;
    }
    function idbGet(k){return openIDB().then(db=>new Promise((res,rej)=>{const r=db.transaction("files","readonly").objectStore("files").get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
    function idbSet(k,v){return openIDB().then(db=>new Promise((res,rej)=>{const r=db.transaction("files","readwrite").objectStore("files").put(v,k);r.onsuccess=()=>res(true);r.onerror=()=>rej(r.error);}));}
    function idbDelete(k){return openIDB().then(db=>new Promise((res,rej)=>{const r=db.transaction("files","readwrite").objectStore("files").delete(k);r.onsuccess=()=>res(true);r.onerror=()=>rej(r.error);}));}
    function idbKeys(){return openIDB().then(db=>new Promise((res,rej)=>{const r=db.transaction("files","readonly").objectStore("files").getAllKeys();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
    function puterReady(){return !!(window.puter&&puter.fs&&typeof puter.fs.readdir==="function");}
    async function puterRead(path){
        if(!puterReady())return {ok:false,error:"Puter filesystem is unavailable; Puter.js is not implemented or not loaded."};
        try{
            const p=path.slice(7);
            const r=typeof puter.fs.read==="function"?await puter.fs.read(p):null;
            if(r==null)return {ok:false,error:"Puter filesystem read is unavailable."};
            if(typeof r==="string")return {ok:true,content:r};
            if(r&&typeof r.text==="function")return {ok:true,content:await r.text()};
            if(r&&r.content!=null)return {ok:true,content:String(r.content)};
            return {ok:true,content:String(r)};
        }catch(e){return {ok:false,error:"Puter read failed: "+e.message};}
    }
    async function puterWrite(path,content,create){
        if(!window.puter||!puter.fs||typeof puter.fs.write!=="function")return {ok:false,error:"Puter filesystem is unavailable; Puter.js is not implemented or not loaded."};
        try{await puter.fs.write(path.slice(7),String(content));return {ok:true};}catch(e){return {ok:false,error:"Puter write failed: "+e.message};}
    }
    async function puterRemove(path){
        if(!window.puter||!puter.fs||typeof puter.fs.delete!=="function")return {ok:false,error:"Puter filesystem delete is unavailable."};
        try{await puter.fs.delete(path.slice(7));return {ok:true};}catch(e){return {ok:false,error:"Puter delete failed: "+e.message};}
    }
    async function puterList(path){
        if(!puterReady())return [];
        try{
            const items=await puter.fs.readdir(path.slice(7));
            return (Array.isArray(items)?items:[]).map(x=>typeof x==="string"?"puter:/"+x:"puter:/"+(x.path||x.name||"" )).filter(Boolean);
        }catch(e){return [];}
    }
    function exists(path){
        path=normalize(path); const z=zone(path);
        if(z==="system")return Promise.resolve(Object.prototype.hasOwnProperty.call(SYSTEM_FILES,path));
        if(z==="puter")return puterRead(path).then(r=>r.ok);
        if(z==="local")return Promise.resolve(localStorage.getItem(storageKey(path))!==null);
        if(z==="session")return Promise.resolve(sessionStorage.getItem(storageKey(path))!==null);
        if(z==="indexdb")return idbGet(storageKey(path)).then(v=>v!==undefined);
        return Promise.resolve(false);
    }
    async function read(path){
        path=normalize(path); const z=zone(path);
        if(z==="system")return Object.prototype.hasOwnProperty.call(SYSTEM_FILES,path)?{ok:true,content:SYSTEM_FILES[path]}:{ok:false,error:"File not found: "+path};
        if(z==="puter")return puterRead(path);
        if(z==="local"){const v=localStorage.getItem(storageKey(path));return v===null?{ok:false,error:"File not found: "+path}:{ok:true,content:v};}
        if(z==="session"){const v=sessionStorage.getItem(storageKey(path));return v===null?{ok:false,error:"File not found: "+path}:{ok:true,content:v};}
        if(z==="indexdb"){const v=await idbGet(storageKey(path));return v===undefined?{ok:false,error:"File not found: "+path}:{ok:true,content:String(v)};}
        return {ok:false,error:"Unsupported path: "+path};
    }
    async function write(path,content,create){
        path=normalize(path); const z=zone(path);
        if(z==="system")return {ok:false,error:"Cannot write to protected system file: "+path};
        if(z==="puter")return puterWrite(path,content,create);
        if(!z)return {ok:false,error:"Unsupported path: "+path};
        if(!create&&!await exists(path))return {ok:false,error:"File does not exist (use create=true): "+path};
        if(z==="local"){localStorage.setItem(storageKey(path),String(content));return {ok:true};}
        if(z==="session"){sessionStorage.setItem(storageKey(path),String(content));return {ok:true};}
        if(z==="indexdb"){await idbSet(storageKey(path),String(content));return {ok:true};}
        return {ok:false,error:"Unsupported path: "+path};
    }
    async function remove(path){
        path=normalize(path); const z=zone(path);
        if(z==="system")return {ok:false,error:"Cannot remove protected system file: "+path};
        if(z==="puter")return puterRemove(path);
        if(!z)return {ok:false,error:"Unsupported path: "+path};
        if(!await exists(path))return {ok:false,error:"File not found: "+path};
        if(z==="local")localStorage.removeItem(storageKey(path));
        else if(z==="session")sessionStorage.removeItem(storageKey(path));
        else if(z==="indexdb")await idbDelete(storageKey(path));
        return {ok:true};
    }
    async function listZone(z){
        if(z==="system")return Object.keys(SYSTEM_FILES);
        if(z==="puter")return puterList("puter:/");
        if(z==="local"){const a=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf("LH::chxd:/local/")===0)a.push(k.slice(4));}return a;}
        if(z==="session"){const a=[];for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(k&&k.indexOf("LH::chxd:/session/")===0)a.push(k.slice(4));}return a;}
        if(z==="indexdb")return (await idbKeys()).filter(k=>typeof k==="string"&&k.indexOf("LH::chxd:/indexdb/")===0).map(k=>k.slice(4));
        return [];
    }
    function wildcardToRegex(p){return new RegExp("^"+p.replace(/[.+^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$");}
    async function list(prefix){
        prefix=prefix?normalize(prefix):null;
        let zones=["local","session","indexdb","system"];
        if(prefix){const z=zone(prefix);if(z)zones=[z];}
        const all=(await Promise.all(zones.map(listZone))).flat();
        return prefix?all.filter(p=>p.indexOf(prefix)===0):all;
    }
    async function find(pattern){
        pattern=normalize(pattern); const z=zone(pattern); const all=await list(z?z+":/":null); const re=wildcardToRegex(pattern); return all.filter(p=>re.test(p));
    }
    window.FS={normalize,zone,exists,read,write,remove,find,list,puterReady};
})();
