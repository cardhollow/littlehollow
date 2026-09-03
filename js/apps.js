(function(){
    "use strict";
    const REGISTRY={
        apps:{title:"APPS",src:"app/apps.html",w:380,h:320},
        appinstaller:{title:"APP INSTALLER",src:"app/AppInstaller.html",w:500,h:500},
        "file manager":{title:"FILE MANAGER",src:"app/filemanager.html",w:520,h:390},
        filemanager:{title:"FILE MANAGER",src:"app/filemanager.html",w:520,h:390},
        clock:{title:"CLOCK",src:"app/clock.html",w:340,h:340},
        calculator:{title:"CALCULATOR",src:"app/calculator.html",w:300,h:370},
        notepad:{title:"NOTEPAD",src:"app/notepad.html",w:540,h:430},
        paint:{title:"PAINT",src:"app/paint.html",w:560,h:480},
        terminaljs:{title:"Terminal JS",src:"app/TerminalJS.html",w:560,h:480},
        recorder:{title:"RECORDER",src:"app/recorder.html",w:620,h:560},
        camera:{title:"CAMERA",src:"app/camera.html",w:680,h:620},
        tictactoe:{title:"TIC TAC TOE",src:"app/tictactoe.html",w:360,h:340},
        snake:{title:"SNAKE",src:"app/snake.html",w:320,h:380},
        2048:{title:"2048",src:"app/2048.html",w:430,h:520},
        minesweeper:{title:"MINESWEEPER",src:"app/minesweeper.html",w:430,h:560},
        sudoku:{title:"SUDOKU",src:"app/sudoku.html",w:430,h:600},
        sos:{title:"SOS",src:"app/sos.html",w:430,h:600},
        tetris:{title:"TETRIS",src:"app/tetris.html",w:400,h:620},
        wordle:{title:"WORDLE",src:"app/wordle.html",w:430,h:650},
        documentviewer:{title:"DOCUMENT VIEWER",src:"app/DocumentViewer.html",w:480,h:380},
        imageviewer:{title:"IMAGE VIEWER",src:"app/imageviewer.html",w:480,h:380},
        videoplayer:{title:"VIDEO PLAYER",src:"app/videoplayer.html",w:480,h:360},
        audioplayer:{title:"AUDIO PLAYER",src:"app/AudioPlayer.html",w:420,h:260},
        gamefinder:{title:"GAME FINDER",src:"https://funhtml5games.com",w:360,h:340},
        doom:{title:"Doom",src:"https://js-dos.com/games/doom.exe.html",w:360,h:340},
        pacman:{title:"Pacman",src:"https://funhtml5games.com?embed=pacman",w:460,h:480},
        gba:{title:"GBA",src:"app/GBA.html",w:360,h:340},
        browser:{title:"BROWSER",src:"app/browser.html",w:360,h:340},
        imageeditor:{title:"imageeditor",src:"app/imageEditor.html",w:480,h:380},
        messenger:{title:"MESSENGER",src:"app/messenger.html",w:430,h:360},
        map:{title:"MAPS",src:"app/map.html",w:820,h:600},
        maps:{title:"MAPS",src:"app/map.html",w:820,h:600},
        settings:{title:"SETTINGS",src:"app/settings.html",w:420,h:460}
    };

    /* All App Installer data lives in this directory. */
    const CUSTOM_APP_DIR=
        "chxd:/local/Custom Installed Application";

    const CIA_PATH=
        CUSTOM_APP_DIR+"/CIA.json";

    /* Every srcDoc application's actual HTML source is kept here. */
    const SRC_DOC_DIR=
        CUSTOM_APP_DIR+"/SrcDocs";

    function normalizeName(name){
        return String(name||"")
            .trim()
            .toLowerCase();
    }

    function normalizePackage(pkg){
        return String(pkg||"")
            .trim();
    }

    function safeFileName(value){
        const s=String(value||"")
            .trim()
            .replace(/[^a-zA-Z0-9._-]+/g,"_");

        return s||"app";
    }

    function uniqueByIdentity(list){
        const seen=new Set();
        const out=[];

        for(const item of Array.isArray(list)?list:[]){
            if(!item||typeof item!=="object")
                continue;

            const identity=
                item.package||
                item.pkg
                    ? (
                        "installed:"+
                        String(item.package||item.pkg).trim().toLowerCase()
                    )
                    : (
                        "builtin:"+
                        String(item.sourceType||"src").toLowerCase()+
                        ":"+
                        String(item.src||item.srcDoc||"").trim().toLowerCase()+
                        ":"+
                        String(item.title||item.name||"").trim().toLowerCase()
                    );

            if(!identity||seen.has(identity))
                continue;

            seen.add(identity);
            out.push(item);
        }

        return out;
    }

    async function getInstalledApps(){
        try{
            if(
                !window.FS||
                typeof FS.read!=="function"
            ){
                return [];
            }

            const result=await FS.read(CIA_PATH);

            if(
                !result||
                !result.ok||
                !result.content
            ){
                return [];
            }

            const data=JSON.parse(result.content);

            return Array.isArray(data)?data:[];
        }catch(e){
            console.warn(
                "[Apps] Could not read CIA.json:",
                e
            );
            return [];
        }
    }

    /*
     * This synchronous view is intentionally based on localStorage,
     * because the current filesystem stores the App Installer database
     * in chxd:/local/. It lets tools.js rebuild its AI schema immediately
     * whenever the provider asks for Tools.definitions.
     */
    function getInstalledAppsSync(){
        try{
            const key="LH::"+CIA_PATH;
            const raw=localStorage.getItem(key);

            if(!raw)
                return [];

            const data=JSON.parse(raw);
            return Array.isArray(data)?data:[];
        }catch(e){
            return [];
        }
    }

    function getRegisteredAppsSync(){
        const apps=[];
        const seen=new Set();

        for(const [key,def] of Object.entries(REGISTRY)){
            if(!def||typeof def!=="object")
                continue;

            const title=String(
                def.title||key||""
            ).trim();

            if(!title)
                continue;

            const sourceKey=(def.srcDoc!=null)
                ?"srcDoc"
                :"src";

            const source=String(
                def[sourceKey]||""
            ).trim();

            /* Aliases such as map/maps are one registered app. */
            const identity=(sourceKey+":"+source+":"+title)
                .toLowerCase();

            if(seen.has(identity))
                continue;

            seen.add(identity);

            apps.push({
                name:title,
                title,
                registry_key:key,
                source:
                    "builtin",
                sourceType:sourceKey,
                src:
                    sourceKey==="src"
                        ?source
                        :undefined,
                srcDoc:
                    sourceKey==="srcDoc"
                        ?source
                        :undefined,
                w:Number(def.w)||500,
                h:Number(def.h)||500,
                aliases:[key]
            });
        }

        const installed=getInstalledAppsSync();

        for(const app of installed){
            if(!app||typeof app!=="object")
                continue;

            const pkg=normalizePackage(app.pkg);
            const title=String(
                app.name||pkg||""
            ).trim();

            if(!pkg||!title)
                continue;

            const sourceType=app.srcDoc!=null
                ?"srcDoc"
                :"src";

            apps.push({
                name:title,
                title,
                package:pkg,
                pkg,
                source:"installed",
                sourceType,
                src:
                    sourceType==="src"
                        ?String(app.src||"")
                        :undefined,
                srcDoc:
                    sourceType==="srcDoc"
                        ?String(app.srcDoc||"")
                        :undefined,
                appIcon:
                    String(app.appIcon||"📦"),
                w:Number(app.w||app.width)||500,
                h:Number(app.h||app.height)||500,
                aliases:[pkg]
            });
        }

        return uniqueByIdentity(apps);
    }

    async function getRegisteredApps(){
        const builtins=[];

        const seen=new Set();

        for(const [key,def] of Object.entries(REGISTRY)){
            if(!def||typeof def!=="object")
                continue;

            const title=String(def.title||key||"").trim();
            if(!title)
                continue;

            const sourceType=def.srcDoc!=null
                ?"srcDoc"
                :"src";

            const source=String(def[sourceType]||"").trim();
            const identity=(sourceType+":"+source+":"+title).toLowerCase();

            if(seen.has(identity))
                continue;

            seen.add(identity);

            builtins.push({
                name:title,
                title,
                registry_key:key,
                source:"builtin",
                sourceType,
                src:sourceType==="src"?source:undefined,
                srcDoc:sourceType==="srcDoc"?source:undefined,
                w:Number(def.w)||500,
                h:Number(def.h)||500,
                aliases:[key]
            });
        }

        const installed=await getInstalledApps();

        for(const app of installed){
            if(!app||typeof app!=="object")
                continue;

            const pkg=normalizePackage(app.pkg);
            const title=String(app.name||pkg||"").trim();

            if(!pkg||!title)
                continue;

            const sourceType=app.srcDoc!=null
                ?"srcDoc"
                :"src";

            builtins.push({
                name:title,
                title,
                package:pkg,
                pkg,
                source:"installed",
                sourceType,
                src:sourceType==="src"?String(app.src||""):undefined,
                srcDoc:sourceType==="srcDoc"?String(app.srcDoc||""):undefined,
                appIcon:String(app.appIcon||"📦"),
                w:Number(app.w||app.width)||500,
                h:Number(app.h||app.height)||500,
                aliases:[pkg]
            });
        }

        return uniqueByIdentity(builtins);
    }

    function getApp(name){
        const key=normalizeName(name);
        const all=getRegisteredAppsSync();

        return all.find(app=>{
            return normalizeName(app.name)===key||
                normalizeName(app.title)===key||
                normalizeName(app.package)===key||
                normalizeName(app.pkg)===key||
                normalizeName(app.registry_key)===key||
                (Array.isArray(app.aliases)&&app.aliases.some(x=>normalizeName(x)===key));
        })||null;
    }

    async function buildSrcDocURL(code){
        const html=String(code==null?"":code);

        /*
         * Blob URLs inherit the creator's origin. This means the installed
         * srcDoc application remains able to communicate with Little Hollow,
         * unlike a data: URL which receives an opaque origin.
         */
        const blob=new Blob(
            [html],
            {type:"text/html"}
        );

        return URL.createObjectURL(blob);
    }

    async function openSourceDoc(
        sourcePath,
        title,
        width,
        height,
        standaloneKey
    ){
        const r=await FS.read(sourcePath);

        if(!r||!r.ok){
            return {
                ok:false,
                error:
                    "Could not read srcDoc application source: "+
                    (r&&r.error?r.error:sourcePath)
            };
        }

        const blobURL=await buildSrcDocURL(r.content);

        const win=WM.openWindow({
            title:title||"APPLICATION",
            iframeSrc:blobURL,
            width:(Number(width)||500)+"px",
            height:(Number(height)||500)+"px",
            noPad:true,
            standaloneKey:standaloneKey||null
        });

        /* Revoke only after the app window is closed. */
        const previousClose=win&&win.onClose;

        if(win){
            win.onClose=function(){
                try{
                    URL.revokeObjectURL(blobURL);
                }catch(_){ }

                if(typeof previousClose==="function")
                    previousClose();
            };
        }else{
            try{
                URL.revokeObjectURL(blobURL);
            }catch(_){ }
        }

        return {
            ok:true,
            win,
            srcDoc:sourcePath
        };
    }

    function notifyAppsChanged(detail){
        try{
            window.dispatchEvent(
                new CustomEvent(
                    "lh:apps-changed",
                    {detail:detail||{}}
                )
            );
        }catch(_){ }

        try{
            window.postMessage(
                {
                    type:"LH_APPS_CHANGED",
                    detail:detail||{}
                },
                "*"
            );
        }catch(_){ }
    }

    async function writeInstalledApps(data){
        const result=await FS.write(
            CIA_PATH,
            JSON.stringify(data,null,4),
            true
        );

        if(result&&result.ok){
            notifyAppsChanged({
                source:"AppInstaller"
            });
        }

        return result;
    }

    async function installApp(options){
        options=options||{};

        const pkg=normalizePackage(options.pkg);
        const title=String(
            options.name||pkg||""
        ).trim();
        const icon=String(
            options.appIcon||options.icon||"📦"
        );
        const sourceType=
            String(options.sourceType||"src")===
            "srcDoc"
                ?"srcDoc"
                :"src";

        if(!pkg)
            return {ok:false,error:"Package Name is required."};

        if(!title)
            return {ok:false,error:"App Name is required."};

        if(sourceType==="src"){
            const src=String(options.src||"").trim();

            if(!src){
                return {ok:false,error:"URL is required for src applications."};
            }

            const data=await getInstalledApps();
            const index=data.findIndex(
                x=>normalizePackage(x&&x.pkg)===pkg
            );

            const oldSourcePath=
                index>=0&&data[index]&&data[index].srcDoc
                    ?String(data[index].srcDoc)
                    :null;

            const app={
                pkg,
                name:title,
                src,
                appIcon:icon,
                w:Number(options.w||options.width)||500,
                h:Number(options.h||options.height)||500
            };

            if(index>=0)
                data[index]=app;
            else
                data.push(app);

            /* If this app used to be srcDoc, clean its old source file. */
            if(oldSourcePath){
                try{
                    await FS.remove(oldSourcePath);
                }catch(_){ }
            }

            const result=await writeInstalledApps(data);

            return result&&result.ok
                ?{ok:true,app}
                :{ok:false,error:result&&result.error||"Could not write CIA.json"};
        }

        const source=String(options.srcDoc||"");

        if(!source.trim())
            return {ok:false,error:"HTML source is required for srcDoc applications."};

        const data=await getInstalledApps();
        const index=data.findIndex(
            x=>normalizePackage(x&&x.pkg)===pkg
        );

        let oldSourcePath=null;
        if(index>=0&&data[index])
            oldSourcePath=data[index].srcDoc||null;

        const sourcePath=
            SRC_DOC_DIR+"/"+
            safeFileName(pkg)+".html";

        const sourceWrite=await FS.write(
            sourcePath,
            source,
            true
        );

        if(!sourceWrite||!sourceWrite.ok){
            return {
                ok:false,
                error:
                    sourceWrite&&sourceWrite.error
                        ?sourceWrite.error
                        :"Could not save srcDoc source."
            };
        }

        const app={
            pkg,
            name:title,
            srcDoc:sourcePath,
            appIcon:icon,
            w:Number(options.w||options.width)||500,
            h:Number(options.h||options.height)||500
        };

        if(index>=0)
            data[index]=app;
        else
            data.push(app);

        if(
            oldSourcePath&&
            oldSourcePath!==sourcePath
        ){
            try{
                await FS.remove(oldSourcePath);
            }catch(_){ }
        }

        const result=await writeInstalledApps(data);

        if(!result||!result.ok){
            return {
                ok:false,
                error:
                    result&&result.error
                        ?result.error
                        :"Could not write CIA.json"
            };
        }

        return {
            ok:true,
            app
        };
    }

    async function uninstallApp(pkg){
        pkg=normalizePackage(pkg);

        if(!pkg)
            return {ok:false,error:"Package Name is required."};

        const data=await getInstalledApps();
        const index=data.findIndex(
            x=>normalizePackage(x&&x.pkg)===pkg
        );

        if(index<0)
            return {ok:false,error:"Installed application not found: "+pkg};

        const app=data[index];
        data.splice(index,1);

        if(app&&app.srcDoc){
            try{
                await FS.remove(app.srcDoc);
            }catch(_){ }
        }

        const result=await writeInstalledApps(data);

        if(!result||!result.ok){
            return {
                ok:false,
                error:
                    result&&result.error
                        ?result.error
                        :"Could not update CIA.json"
            };
        }

        return {
            ok:true,
            app
        };
    }

    async function openApp(name,opts){
        opts=opts||{};

        const key=normalizeName(name);
        const installed=await getInstalledApps();

        /* Resolve installed apps by either package OR friendly name. */
        const app=installed.find(x=>
            normalizeName(x&&x.pkg)===key||
            normalizeName(x&&x.name)===key
        );

        if(app){
            const title=String(
                app.name||app.pkg||name
            );
            const width=opts.width||app.w||app.width||500;
            const height=opts.height||app.h||app.height||500;

            if(app.srcDoc!=null){
                const standalone=opts.allowMultiple
                    ?null
                    :"installed:"+app.pkg;

                return await openSourceDoc(
                    String(app.srcDoc),
                    title,
                    width,
                    height,
                    standalone
                );
            }

            const source=String(app.src||"").trim();

            if(!source){
                return {
                    ok:false,
                    error:
                        "Installed application has no src or srcDoc: "+
                        (app.pkg||name)
                };
            }

            const win=WM.openWindow({
                title,
                iframeSrc:source,
                width:Number(width)+"px",
                height:Number(height)+"px",
                noPad:true,
                standaloneKey:
                    opts.allowMultiple
                        ?null
                        :"installed:"+app.pkg
            });

            return {
                ok:true,
                win,
                installed:true,
                app
            };
        }

        let resolvedKey=key;
        let def=REGISTRY[key];

        /* Friendly registered titles must also be valid AI/open targets. */
        if(!def){
            for(const [registryKey,registryDef] of Object.entries(REGISTRY)){
                if(
                    registryDef&&
                    normalizeName(registryDef.title)===key
                ){
                    resolvedKey=registryKey;
                    def=registryDef;
                    break;
                }
            }
        }

        if(!def){
            return {
                ok:false,
                error:"Unknown application: "+name
            };
        }

        let sourceType=
            def.srcDoc!=null
                ?"srcDoc"
                :"src";

        /* srcDoc built-in apps use the same source-file mechanism. */
        if(sourceType==="srcDoc"){
            let sourcePath=String(def.srcDoc||"");

            if(!sourcePath){
                return {
                    ok:false,
                    error:"Registered srcDoc application has no source path: "+name
                };
            }

            return await openSourceDoc(
                String(def.srcDoc),
                opts.title||def.title,
                opts.width||def.w,
                opts.height||def.h,
                opts.allowMultiple
                    ?null
                    :(
                        opts.path
                            ?"app:"+resolvedKey+":"+opts.path
                            :"app:"+resolvedKey
                    )
            );
        }

        let src=String(def.src||"");
        const params=[];

        if(opts.src)
            params.push("src="+encodeURIComponent(opts.src));

        if(opts.path)
            params.push("path="+encodeURIComponent(String(opts.path)));

        if(opts.equation!=null)
            params.push("equation="+encodeURIComponent(String(opts.equation)));

        if(opts.painting!=null){
            try{
                params.push(
                    "painting="+
                    encodeURIComponent(
                        JSON.stringify(opts.painting)
                    )
                );
            }catch(e){
                return {
                    ok:false,
                    error:"Invalid painting data."
                };
            }
        }

        if(opts.paintPath)
            params.push(
                "paintPath="+
                encodeURIComponent(String(opts.paintPath))
            );

        if(opts.selectMode)
            params.push("select=1");

        if(opts.text!=null)
            params.push(
                "text="+
                encodeURIComponent(String(opts.text))
            );
        else if(opts.initialText!=null)
            params.push(
                "text="+
                encodeURIComponent(String(opts.initialText))
            );

        if(params.length)
            src+="?"+params.join("&");

        const standalone=opts.allowMultiple
            ?null
            :(
                opts.equation!=null
                    ?null
                    :(
                        opts.path
                            ?"app:"+key+":"+opts.path
                            :"app:"+key
                    )
            );

        const win=WM.openWindow({
            title:opts.title||def.title,
            iframeSrc:src,
            width:(opts.width||def.w)+"px",
            height:(opts.height||def.h)+"px",
            noPad:true,
            standaloneKey:standalone
        });

        return {
            ok:true,
            win
        };
    }

    function openOneCompiler(opts){
        opts=opts||{};

        const language=
            String(
                opts.language||"javascript"
            ).toLowerCase();

        const iframeSrc=
            "https://onecompiler.com/embed/"+
            encodeURIComponent(language)+
            "?listenToEvents=true&codeChangeEvent=true&theme=dark&hideTitle=true";

        const win=
            WM.openWindow({
                title:
                    opts.title||
                    "ONECOMPILER — "+
                    language.toUpperCase(),
                iframeSrc,
                width:
                    (opts.width||760)+"px",
                height:
                    (opts.height||560)+"px",
                noPad:true,
                standaloneKey:null
            });

        const files=
            (
                Array.isArray(opts.files)&&
                opts.files.length
            )
            ?opts.files
            :[
                {
                    name:
                        opts.name||
                        (
                            "main."+
                            (
                                language==="python"
                                    ?"py"
                                    :language==="javascript"
                                        ?"js"
                                        :"txt"
                            )
                        ),
                    content:
                        String(
                            opts.code||""
                        )
                }
            ];

        const wantRun=
            !!opts.run;

        const tag=
            "[LH:onecompiler:"+
            win.id+
            "]";

        const MAX_ATTEMPTS=10;
        const RETRY_MS=500;

        let attempts=0;
        let settled=false;
        let retryTimer=null;
        let sawLife=false;

        function getFrame(){
            return win.el&&
                win.el.querySelector("iframe");
        }

        function post(payload){
            const iframe=
                getFrame();

            if(
                !iframe||
                !iframe.contentWindow
            ){
                console.warn(
                    tag,
                    "no iframe/contentWindow to post to"
                );
                return false;
            }

            try{
                iframe.contentWindow.postMessage(
                    payload,
                    "*"
                );

                console.log(
                    tag,
                    "posted",
                    payload.eventType
                );

                return true;
            }catch(e){
                console.warn(
                    tag,
                    "postMessage threw",
                    e
                );

                return false;
            }
        }

        function sendRun(){
            post({
                eventType:"triggerRun"
            });
        }

        function cleanup(){
            window.removeEventListener(
                "message",
                onMessage
            );
        }

        function onMessage(e){
            if(settled)
                return;

            const d=
                e.data||{};

            const iframe=
                getFrame();

            if(
                !iframe||
                e.source!==iframe.contentWindow
            )
                return;

            if(
                !d||
                !d.language
            )
                return;

            console.log(
                tag,
                "received message from iframe",
                d
            );

            if(!sawLife){
                sawLife=true;

                post({
                    eventType:
                        "populateCode",
                    language,
                    files
                });

                if(wantRun)
                    setTimeout(
                        sendRun,
                        300
                    );

                settled=true;

                if(retryTimer){
                    clearTimeout(
                        retryTimer
                    );

                    retryTimer=null;
                }

                setTimeout(
                    cleanup,
                    500
                );
            }
        }

        function sendPopulate(){
            if(
                settled||
                sawLife||
                win.closed
            ){
                cleanup();
                return;
            }

            attempts++;

            post({
                eventType:
                    "populateCode",
                language,
                files
            });

            if(
                attempts<MAX_ATTEMPTS
            ){
                retryTimer=
                    setTimeout(
                        sendPopulate,
                        RETRY_MS
                    );
            }else{
                console.log(
                    tag,
                    "gave up after",
                    attempts,
                    "attempts with no response from iframe"
                );

                if(wantRun)
                    setTimeout(
                        sendRun,
                        300
                    );

                settled=true;
                cleanup();
            }
        }

        window.addEventListener(
            "message",
            onMessage
        );

        const prevOnClose=
            win.onClose;

        win.onClose=function(){
            settled=true;
            cleanup();

            if(
                typeof prevOnClose==="function"
            )
                prevOnClose();
        };

        const iframeEl=
            getFrame();

        const kickoff=
            ()=>{
                setTimeout(
                    sendPopulate,
                    150
                );
            };

        if(iframeEl)
            iframeEl.addEventListener(
                "load",
                kickoff,
                {once:true}
            );
        else
            kickoff();

        return {
            ok:true,
            win
        };
    }

    window.addEventListener(
        "message",
        e=>{
            const d=
                e.data||{};

            if(
                !d||
                !d.language
            )
                return;

            if(
                d.type===
                "LH_OPEN_CODE"
            ){
                Apps.openOneCompiler({
                    language:
                        d.language,
                    files:
                        d.files,
                    run:
                        !!d.run
                });
            }
        }
    );

    window.Apps={
        openApp,
        openOneCompiler,
        REGISTRY,
        getInstalledApps,
        getRegisteredApps,
        getRegisteredAppsSync,
        installApp,
        uninstallApp,
        getApp
    };
})();
