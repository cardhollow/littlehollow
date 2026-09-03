(function(){
    "use strict";

    /*
     * ============================================================
     * BUILT-IN APPLICATION REGISTRY
     * ============================================================
     */

    const REGISTRY={
        apps:{
            title:"APPS",
            src:"app/apps.html",
            w:380,
            h:320
        },

        appinstaller:{
            title:"APP INSTALLER",
            src:"app/AppInstaller.html",
            w:500,
            h:500
        },

        "file manager":{
            title:"FILE MANAGER",
            src:"app/filemanager.html",
            w:520,
            h:390
        },

        filemanager:{
            title:"FILE MANAGER",
            src:"app/filemanager.html",
            w:520,
            h:390
        },

        clock:{
            title:"CLOCK",
            src:"app/clock.html",
            w:340,
            h:340
        },

        calculator:{
            title:"CALCULATOR",
            src:"app/calculator.html",
            w:300,
            h:370
        },

        notepad:{
            title:"NOTEPAD",
            src:"app/notepad.html",
            w:540,
            h:430
        },

        paint:{
            title:"PAINT",
            src:"app/paint.html",
            w:560,
            h:480
        },

        terminaljs:{
            title:"Terminal JS",
            src:"app/TerminalJS.html",
            w:560,
            h:480
        },

        recorder:{
            title:"RECORDER",
            src:"app/recorder.html",
            w:620,
            h:560
        },

        camera:{
            title:"CAMERA",
            src:"app/camera.html",
            w:680,
            h:620
        },

        tictactoe:{
            title:"TIC TAC TOE",
            src:"app/tictactoe.html",
            w:360,
            h:340
        },

        snake:{
            title:"SNAKE",
            src:"app/snake.html",
            w:320,
            h:380
        },

        2048:{
            title:"2048",
            src:"app/2048.html",
            w:430,
            h:520
        },

        minesweeper:{
            title:"MINESWEEPER",
            src:"app/minesweeper.html",
            w:430,
            h:560
        },

        sudoku:{
            title:"SUDOKU",
            src:"app/sudoku.html",
            w:430,
            h:600
        },

        sos:{
            title:"SOS",
            src:"app/sos.html",
            w:430,
            h:600
        },

        tetris:{
            title:"TETRIS",
            src:"app/tetris.html",
            w:400,
            h:620
        },

        wordle:{
            title:"WORDLE",
            src:"app/wordle.html",
            w:430,
            h:650
        },

        documentviewer:{
            title:"DOCUMENT VIEWER",
            src:"app/DocumentViewer.html",
            w:480,
            h:380
        },

        imageviewer:{
            title:"IMAGE VIEWER",
            src:"app/imageviewer.html",
            w:480,
            h:380
        },

        videoplayer:{
            title:"VIDEO PLAYER",
            src:"app/videoplayer.html",
            w:480,
            h:360
        },

        audioplayer:{
            title:"AUDIO PLAYER",
            src:"app/AudioPlayer.html",
            w:420,
            h:260
        },

        gamefinder:{
            title:"GAME FINDER",
            src:"https://funhtml5games.com",
            w:360,
            h:340
        },

        doom:{
            title:"Doom",
            src:"https://js-dos.com/games/doom.exe.html",
            w:360,
            h:340
        },

        pacman:{
            title:"Pacman",
            src:"https://funhtml5games.com?embed=pacman",
            w:460,
            h:480
        },

        gba:{
            title:"GBA",
            src:"app/GBA.html",
            w:360,
            h:340
        },

        browser:{
            title:"BROWSER",
            src:"app/browser.html",
            w:360,
            h:340
        },

        imageeditor:{
            title:"imageeditor",
            src:"app/imageEditor.html",
            w:480,
            h:380
        },

        messenger:{
            title:"MESSENGER",
            src:"app/messenger.html",
            w:430,
            h:360
        },

        map:{
            title:"MAPS",
            src:"app/map.html",
            w:820,
            h:600
        },

        maps:{
            title:"MAPS",
            src:"app/map.html",
            w:820,
            h:600
        },

        settings:{
            title:"SETTINGS",
            src:"app/settings.html",
            w:420,
            h:460
        }
    };


    /*
     * ============================================================
     * APP INSTALLER STORAGE
     * ============================================================
     */

    const CUSTOM_APP_DIR=
        "chxd:/local/Custom Installed Application";

    const CIA_PATH=
        CUSTOM_APP_DIR+
        "/CIA.json";

    const SRC_DOC_DIR=
        CUSTOM_APP_DIR+
        "/SrcDocs";


    /*
     * In-memory cache.
     *
     * getRegisteredAppsSync() can use this immediately without
     * pretending that localStorage is the filesystem.
     */
    let installedAppsCache=[];

    let installedAppsCacheLoaded=false;


    /*
     * ============================================================
     * HELPERS
     * ============================================================
     */

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
            .replace(
                /[^a-zA-Z0-9._-]+/g,
                "_"
            );

        return s||"app";
    }

    function appSourceType(app){
        if(
            app &&
            app.srcDoc!=null &&
            String(app.srcDoc).trim()
        ){
            return "srcDoc";
        }

        return "src";
    }

    function isValidInstalledApp(app){
        if(
            !app ||
            typeof app!=="object"
        ){
            return false;
        }

        const pkg=
            normalizePackage(app.pkg);

        if(!pkg)
            return false;

        const sourceType=
            appSourceType(app);

        if(sourceType==="srcDoc"){
            return !!String(
                app.srcDoc||""
            ).trim();
        }

        return !!String(
            app.src||""
        ).trim();
    }

    function uniqueByIdentity(list){
        const seen=new Set();
        const out=[];

        for(
            const item of
            Array.isArray(list)
                ?list
                :[]
        ){
            if(
                !item ||
                typeof item!=="object"
            ){
                continue;
            }

            let identity;

            if(
                item.package||
                item.pkg
            ){
                identity=
                    "installed:"+
                    String(
                        item.package||
                        item.pkg
                    )
                    .trim()
                    .toLowerCase();
            }else{
                const sourceType=
                    String(
                        item.sourceType||
                        "src"
                    ).toLowerCase();

                const source=
                    String(
                        sourceType==="srcDoc"
                            ?item.srcDoc
                            :item.src
                    ).trim();

                const title=
                    String(
                        item.title||
                        item.name||
                        ""
                    )
                    .trim()
                    .toLowerCase();

                identity=
                    "builtin:"+
                    sourceType+
                    ":"+
                    source.toLowerCase()+
                    ":"+
                    title;
            }

            if(
                !identity||
                seen.has(identity)
            ){
                continue;
            }

            seen.add(identity);
            out.push(item);
        }

        return out;
    }


    /*
     * ============================================================
     * FILESYSTEM
     * ============================================================
     */

    async function getInstalledApps(){
        try{
            if(
                !window.FS ||
                typeof FS.read!=="function"
            ){
                return [];
            }

            const result=
                await FS.read(CIA_PATH);

            if(
                !result ||
                !result.ok ||
                !result.content
            ){
                installedAppsCache=[];
                installedAppsCacheLoaded=true;
                return [];
            }

            const data=
                JSON.parse(result.content);

            installedAppsCache=
                Array.isArray(data)
                    ?data
                    :[];

            installedAppsCacheLoaded=true;

            return installedAppsCache;
        }catch(e){
            console.warn(
                "[Apps] Could not read CIA.json:",
                e
            );

            installedAppsCache=[];
            installedAppsCacheLoaded=true;

            return [];
        }
    }

    /*
     * Synchronous accessor.
     *
     * This does NOT try to fake the CHXD filesystem with localStorage.
     * It returns the latest cache populated by getInstalledApps().
     */
    function getInstalledAppsSync(){
        return Array.isArray(
            installedAppsCache
        )
            ?installedAppsCache.slice()
            :[];
    }


    /*
     * ============================================================
     * REGISTERED APP LIST
     * ============================================================
     */

    function buildRegisteredBuiltins(){
        const result=[];
        const seen=new Set();

        for(
            const [key,def]
            of Object.entries(REGISTRY)
        ){
            if(
                !def ||
                typeof def!=="object"
            ){
                continue;
            }

            const title=
                String(
                    def.title||
                    key||
                    ""
                ).trim();

            if(!title)
                continue;

            const sourceType=
                def.srcDoc!=null
                    ?"srcDoc"
                    :"src";

            const source=
                String(
                    def[sourceType]||
                    ""
                ).trim();

            const identity=
                (
                    sourceType+
                    ":"+
                    source+
                    ":"+
                    title
                ).toLowerCase();

            /*
             * map/maps, file manager/filemanager,
             * etc. share one actual app definition.
             */
            if(seen.has(identity))
                continue;

            seen.add(identity);

            result.push({
                name:title,
                title,
                registry_key:key,

                source:"builtin",

                sourceType,

                src:
                    sourceType==="src"
                        ?source
                        :undefined,

                srcDoc:
                    sourceType==="srcDoc"
                        ?source
                        :undefined,

                w:
                    Number(def.w)||500,

                h:
                    Number(def.h)||500,

                aliases:[key]
            });
        }

        return result;
    }

    function buildRegisteredInstalled(){
        const result=[];

        for(
            const app
            of installedAppsCache
        ){
            if(
                !isValidInstalledApp(app)
            ){
                continue;
            }

            const pkg=
                normalizePackage(app.pkg);

            const title=
                String(
                    app.name||
                    pkg||
                    ""
                ).trim();

            if(!pkg||!title)
                continue;

            const sourceType=
                appSourceType(app);

            result.push({
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
                    String(
                        app.appIcon||
                        "📦"
                    ),

                w:
                    Number(
                        app.w||
                        app.width
                    )||500,

                h:
                    Number(
                        app.h||
                        app.height
                    )||500,

                aliases:[pkg]
            });
        }

        return result;
    }

    function getRegisteredAppsSync(){
        return uniqueByIdentity(
            [
                ...buildRegisteredBuiltins(),
                ...buildRegisteredInstalled()
            ]
        );
    }

    async function getRegisteredApps(){
        await getInstalledApps();

        return getRegisteredAppsSync();
    }


    /*
     * ============================================================
     * FIND APPLICATION
     * ============================================================
     */

    function findBuiltin(name){
        const key=
            normalizeName(name);

        for(
            const [registryKey,def]
            of Object.entries(REGISTRY)
        ){
            if(!def)
                continue;

            if(
                normalizeName(registryKey)===
                key
            ){
                return {
                    key:registryKey,
                    def
                };
            }

            if(
                normalizeName(def.title)===
                key
            ){
                return {
                    key:registryKey,
                    def
                };
            }
        }

        return null;
    }

    function getApp(name){
        const key=
            normalizeName(name);

        const all=
            getRegisteredAppsSync();

        return (
            all.find(app=>{
                if(
                    normalizeName(app.name)===key
                )
                    return true;

                if(
                    normalizeName(app.title)===key
                )
                    return true;

                if(
                    normalizeName(app.package)===key
                )
                    return true;

                if(
                    normalizeName(app.pkg)===key
                )
                    return true;

                if(
                    normalizeName(app.registry_key)===key
                )
                    return true;

                if(
                    Array.isArray(app.aliases)
                ){
                    return app.aliases.some(
                        alias=>
                            normalizeName(alias)===
                            key
                    );
                }

                return false;
            })
        )||null;
    }


    /*
     * ============================================================
     * SRC DOC
     * ============================================================
     */

    function createSrcDocBlobURL(code){
        const html=
            String(
                code==null
                    ?""
                    :code
            );

        const blob=
            new Blob(
                [html],
                {
                    type:"text/html"
                }
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
        if(
            !window.FS ||
            typeof FS.read!=="function"
        ){
            return {
                ok:false,
                error:
                    "Filesystem is unavailable."
            };
        }

        let result;

        try{
            result=
                await FS.read(sourcePath);
        }catch(e){
            return {
                ok:false,
                error:
                    "Could not read srcDoc application source: "+
                    (
                        e &&
                        e.message
                            ?e.message
                            :String(e)
                    )
            };
        }

        if(
            !result ||
            !result.ok
        ){
            return {
                ok:false,
                error:
                    "Could not read srcDoc application source: "+
                    (
                        result &&
                        result.error
                            ?result.error
                            :sourcePath
                    )
            };
        }

        const blobURL=
            createSrcDocBlobURL(
                result.content
            );

        let win;

        try{
            win=
                WM.openWindow({
                    title:
                        title||
                        "APPLICATION",

                    iframeSrc:
                        blobURL,

                    width:
                        (
                            Number(width)||
                            500
                        )+"px",

                    height:
                        (
                            Number(height)||
                            500
                        )+"px",

                    noPad:true,

                    standaloneKey:
                        standaloneKey||
                        null
                });
        }catch(e){
            try{
                URL.revokeObjectURL(
                    blobURL
                );
            }catch(_){}

            return {
                ok:false,
                error:
                    "Could not open application: "+
                    (
                        e &&
                        e.message
                            ?e.message
                            :String(e)
                    )
            };
        }

        /*
         * Blob URL is kept alive until the app window closes.
         */
        if(win){
            const previousClose=
                win.onClose;

            win.onClose=function(){
                try{
                    URL.revokeObjectURL(
                        blobURL
                    );
                }catch(_){}

                if(
                    typeof previousClose===
                    "function"
                ){
                    previousClose();
                }
            };
        }else{
            try{
                URL.revokeObjectURL(
                    blobURL
                );
            }catch(_){}
        }

        return {
            ok:true,
            win,

            installed:true,

            srcDoc:
                sourcePath
        };
    }


    /*
     * ============================================================
     * CHANGE NOTIFICATION
     * ============================================================
     */

    function notifyAppsChanged(
        detail
    ){
        const payload=
            detail||{};

        try{
            window.dispatchEvent(
                new CustomEvent(
                    "lh:apps-changed",
                    {
                        detail:payload
                    }
                )
            );
        }catch(_){}

        try{
            window.postMessage(
                {
                    type:
                        "LH_APPS_CHANGED",

                    detail:
                        payload
                },
                "*"
            );
        }catch(_){}
    }


    /*
     * ============================================================
     * WRITE CIA
     * ============================================================
     */

    async function writeInstalledApps(
        data
    ){
        if(
            !window.FS ||
            typeof FS.write!=="function"
        ){
            return {
                ok:false,
                error:
                    "Filesystem is unavailable."
            };
        }

        const clean=
            Array.isArray(data)
                ?data
                :[];

        let result;

        try{
            result=
                await FS.write(
                    CIA_PATH,
                    JSON.stringify(
                        clean,
                        null,
                        4
                    ),
                    true
                );
        }catch(e){
            return {
                ok:false,
                error:
                    e &&
                    e.message
                        ?e.message
                        :String(e)
            };
        }

        if(
            result &&
            result.ok
        ){
            installedAppsCache=
                clean.slice();

            installedAppsCacheLoaded=
                true;

            notifyAppsChanged({
                source:
                    "AppInstaller"
            });
        }

        return result;
    }


    /*
     * ============================================================
     * INSTALL / UPDATE
     * ============================================================
     */

    async function installApp(
        options
    ){
        options=
            options||{};

        const pkg=
            normalizePackage(
                options.pkg
            );

        const title=
            String(
                options.name||
                pkg||
                ""
            ).trim();

        const icon=
            String(
                options.appIcon||
                options.icon||
                "📦"
            );

        const sourceType=
            String(
                options.sourceType||
                "src"
            )==="srcDoc"
                ?"srcDoc"
                :"src";

        if(!pkg){
            return {
                ok:false,
                error:
                    "Package Name is required."
            };
        }

        if(!title){
            return {
                ok:false,
                error:
                    "App Name is required."
            };
        }

        const data=
            await getInstalledApps();

        const index=
            data.findIndex(
                x=>
                    normalizePackage(
                        x &&
                        x.pkg
                    )===pkg
            );


        /*
         * --------------------------------------------------------
         * SRC APP
         * --------------------------------------------------------
         */

        if(sourceType==="src"){
            const src=
                String(
                    options.src||
                    ""
                ).trim();

            if(!src){
                return {
                    ok:false,
                    error:
                        "URL is required for src applications."
                };
            }

            if(
                !/^https?:\/\//i.test(src)
            ){
                return {
                    ok:false,
                    error:
                        "URL must start with http:// or https://."
                };
            }

            const oldSourcePath=
                index>=0 &&
                data[index] &&
                data[index].srcDoc
                    ?String(
                        data[index].srcDoc
                    )
                    :null;

            const app={
                pkg,
                name:title,
                src,
                appIcon:icon,

                w:
                    Number(
                        options.w||
                        options.width
                    )||500,

                h:
                    Number(
                        options.h||
                        options.height
                    )||500
            };

            if(index>=0)
                data[index]=app;
            else
                data.push(app);

            /*
             * Switching an existing application from srcDoc
             * to src removes the old HTML source file.
             */
            if(oldSourcePath){
                try{
                    await FS.remove(
                        oldSourcePath
                    );
                }catch(_){}
            }

            const writeResult=
                await writeInstalledApps(
                    data
                );

            if(
                !writeResult ||
                !writeResult.ok
            ){
                return {
                    ok:false,
                    error:
                        writeResult &&
                        writeResult.error
                            ?writeResult.error
                            :"Could not write CIA.json"
                };
            }

            return {
                ok:true,
                app
            };
        }


        /*
         * --------------------------------------------------------
         * SRCDOC APP
         * --------------------------------------------------------
         */

        const source=
            String(
                options.srcDoc||
                ""
            );

        if(!source.trim()){
            return {
                ok:false,
                error:
                    "HTML source is required for srcDoc applications."
            };
        }

        let oldSourcePath=null;

        if(
            index>=0 &&
            data[index]
        ){
            oldSourcePath=
                data[index].srcDoc||
                null;
        }

        const sourcePath=
            SRC_DOC_DIR+
            "/"+
            safeFileName(pkg)+
            ".html";

        let sourceWrite;

        try{
            sourceWrite=
                await FS.write(
                    sourcePath,
                    source,
                    true
                );
        }catch(e){
            return {
                ok:false,
                error:
                    e &&
                    e.message
                        ?e.message
                        :"Could not save srcDoc source."
            };
        }

        if(
            !sourceWrite ||
            !sourceWrite.ok
        ){
            return {
                ok:false,
                error:
                    sourceWrite &&
                    sourceWrite.error
                        ?sourceWrite.error
                        :"Could not save srcDoc source."
            };
        }

        const app={
            pkg,
            name:title,

            /*
             * CIA.json stores ONLY the path/reference.
             * The actual HTML stays in SrcDocs.
             */
            srcDoc:sourcePath,

            appIcon:icon,

            w:
                Number(
                    options.w||
                    options.width
                )||500,

            h:
                Number(
                    options.h||
                    options.height
                )||500
        };

        if(index>=0)
            data[index]=app;
        else
            data.push(app);

        /*
         * Delete previous srcDoc file when the package path changed.
         */
        if(
            oldSourcePath &&
            String(oldSourcePath)!==
            String(sourcePath)
        ){
            try{
                await FS.remove(
                    oldSourcePath
                );
            }catch(_){}
        }

        const writeResult=
            await writeInstalledApps(
                data
            );

        if(
            !writeResult ||
            !writeResult.ok
        ){
            return {
                ok:false,
                error:
                    writeResult &&
                    writeResult.error
                        ?writeResult.error
                        :"Could not write CIA.json"
            };
        }

        return {
            ok:true,
            app
        };
    }


    /*
     * ============================================================
     * UNINSTALL
     * ============================================================
     */

    async function uninstallApp(
        pkg
    ){
        pkg=
            normalizePackage(pkg);

        if(!pkg){
            return {
                ok:false,
                error:
                    "Package Name is required."
            };
        }

        const data=
            await getInstalledApps();

        const index=
            data.findIndex(
                x=>
                    normalizePackage(
                        x &&
                        x.pkg
                    )===pkg
            );

        if(index<0){
            return {
                ok:false,
                error:
                    "Installed application not found: "+
                    pkg
            };
        }

        const app=
            data[index];

        data.splice(
            index,
            1
        );

        /*
         * srcDoc applications own a real HTML file.
         * Delete it when the application is removed.
         */
        if(
            app &&
            app.srcDoc
        ){
            try{
                await FS.remove(
                    app.srcDoc
                );
            }catch(_){}
        }

        const writeResult=
            await writeInstalledApps(
                data
            );

        if(
            !writeResult ||
            !writeResult.ok
        ){
            return {
                ok:false,
                error:
                    writeResult &&
                    writeResult.error
                        ?writeResult.error
                        :"Could not update CIA.json"
            };
        }

        return {
            ok:true,
            app
        };
    }


    /*
     * ============================================================
     * OPEN APPLICATION
     * ============================================================
     */

    async function openApp(
        name,
        opts
    ){
        opts=
            opts||{};

        const key=
            normalizeName(name);

        /*
         * Always refresh installed data before resolving.
         * This means an app installed moments ago can be opened
         * without restarting Little Hollow.
         */
        const installed=
            await getInstalledApps();

        /*
         * Installed application lookup.
         * Package name OR friendly app name.
         */
        const installedApp=
            installed.find(
                x=>{
                    return (
                        normalizeName(
                            x &&
                            x.pkg
                        )===key
                    ) ||
                    (
                        normalizeName(
                            x &&
                            x.name
                        )===key
                    );
                }
            );

        /*
         * --------------------------------------------------------
         * INSTALLED APP
         * --------------------------------------------------------
         */

        if(installedApp){
            const title=
                String(
                    installedApp.name||
                    installedApp.pkg||
                    name
                );

            const width=
                opts.width||
                installedApp.w||
                installedApp.width||
                500;

            const height=
                opts.height||
                installedApp.h||
                installedApp.height||
                500;

            const sourceType=
                appSourceType(
                    installedApp
                );

            /*
             * Installed srcDoc:
             *
             * CIA:
             * {
             *     "pkg":"example",
             *     "name":"Example",
             *     "srcDoc":".../SrcDocs/example.html"
             * }
             */
            if(
                sourceType==="srcDoc"
            ){
                const sourcePath=
                    String(
                        installedApp.srcDoc||
                        ""
                    ).trim();

                if(!sourcePath){
                    return {
                        ok:false,
                        error:
                            "Installed srcDoc application has no source path: "+
                            (
                                installedApp.pkg||
                                name
                            )
                    };
                }

                const standalone=
                    opts.allowMultiple
                        ?null
                        :"installed:"+
                         installedApp.pkg;

                const result=
                    await openSourceDoc(
                        sourcePath,
                        title,
                        width,
                        height,
                        standalone
                    );

                if(result){
                    result.installed=true;
                    result.app=installedApp;
                }

                return result;
            }


            /*
             * Installed src:
             */
            const source=
                String(
                    installedApp.src||
                    ""
                ).trim();

            if(!source){
                return {
                    ok:false,
                    error:
                        "Installed application has no src or srcDoc: "+
                        (
                            installedApp.pkg||
                            name
                        )
                };
            }

            const win=
                WM.openWindow({
                    title,

                    iframeSrc:
                        source,

                    width:
                        Number(width)+"px",

                    height:
                        Number(height)+"px",

                    noPad:true,

                    standaloneKey:
                        opts.allowMultiple
                            ?null
                            :"installed:"+
                             installedApp.pkg
                });

            return {
                ok:true,
                win,
                installed:true,
                app:installedApp
            };
        }


        /*
         * --------------------------------------------------------
         * BUILT-IN APP
         * --------------------------------------------------------
         */

        const builtin=
            findBuiltin(
                name
            );

        if(!builtin){
            return {
                ok:false,
                error:
                    "Unknown application: "+
                    name
            };
        }

        const resolvedKey=
            builtin.key;

        const def=
            builtin.def;

        const sourceType=
            def.srcDoc!=null
                ?"srcDoc"
                :"src";


        /*
         * --------------------------------------------------------
         * BUILT-IN SRCDOC
         * --------------------------------------------------------
         */

        if(sourceType==="srcDoc"){
            const sourcePath=
                String(
                    def.srcDoc||
                    ""
                ).trim();

            if(!sourcePath){
                return {
                    ok:false,
                    error:
                        "Registered srcDoc application has no source path: "+
                        name
                };
            }

            return await openSourceDoc(
                sourcePath,
                opts.title||
                    def.title,

                opts.width||
                    def.w,

                opts.height||
                    def.h,

                opts.allowMultiple
                    ?null
                    :(
                        opts.path
                            ?"app:"+
                             resolvedKey+
                             ":"+
                             opts.path
                            :"app:"+
                             resolvedKey
                    )
            );
        }


        /*
         * --------------------------------------------------------
         * BUILT-IN SRC
         * --------------------------------------------------------
         */

        let src=
            String(
                def.src||
                ""
            );

        const params=[];

        if(opts.src){
            params.push(
                "src="+
                encodeURIComponent(
                    opts.src
                )
            );
        }

        if(opts.path){
            params.push(
                "path="+
                encodeURIComponent(
                    String(opts.path)
                )
            );
        }

        if(opts.equation!=null){
            params.push(
                "equation="+
                encodeURIComponent(
                    String(
                        opts.equation
                    )
                )
            );
        }

        if(opts.painting!=null){
            try{
                params.push(
                    "painting="+
                    encodeURIComponent(
                        JSON.stringify(
                            opts.painting
                        )
                    )
                );
            }catch(e){
                return {
                    ok:false,
                    error:
                        "Invalid painting data."
                };
            }
        }

        if(opts.paintPath){
            params.push(
                "paintPath="+
                encodeURIComponent(
                    String(
                        opts.paintPath
                    )
                )
            );
        }

        if(opts.selectMode){
            params.push(
                "select=1"
            );
        }

        if(opts.text!=null){
            params.push(
                "text="+
                encodeURIComponent(
                    String(
                        opts.text
                    )
                )
            );
        }else if(
            opts.initialText!=null
        ){
            params.push(
                "text="+
                encodeURIComponent(
                    String(
                        opts.initialText
                    )
                )
            );
        }

        if(params.length){
            src+=
                "?"+
                params.join("&");
        }

        const standalone=
            opts.allowMultiple
                ?null
                :(
                    opts.equation!=null
                        ?null
                        :(
                            opts.path
                                ?"app:"+
                                 key+
                                 ":"+
                                 opts.path

                                :"app:"+
                                 key
                        )
                );

        const win=
            WM.openWindow({
                title:
                    opts.title||
                    def.title,

                iframeSrc:
                    src,

                width:
                    (
                        opts.width||
                        def.w
                    )+"px",

                height:
                    (
                        opts.height||
                        def.h
                    )+"px",

                noPad:true,

                standaloneKey:
                    standalone
            });

        return {
            ok:true,
            win
        };
    }


    /*
     * ============================================================
     * ONECOMPILER
     * ============================================================
     */

    function openOneCompiler(
        opts
    ){
        opts=
            opts||{};

        const language=
            String(
                opts.language||
                "javascript"
            ).toLowerCase();

        const iframeSrc=
            "https://onecompiler.com/embed/"+
            encodeURIComponent(
                language
            )+
            "?listenToEvents=true"+
            "&codeChangeEvent=true"+
            "&theme=dark"+
            "&hideTitle=true";

        const win=
            WM.openWindow({
                title:
                    opts.title||
                    "ONECOMPILER — "+
                    language.toUpperCase(),

                iframeSrc,

                width:
                    (
                        opts.width||
                        760
                    )+"px",

                height:
                    (
                        opts.height||
                        560
                    )+"px",

                noPad:true,

                standaloneKey:null
            });

        const files=
            (
                Array.isArray(opts.files) &&
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
                                opts.code||
                                ""
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
            return (
                win.el &&
                win.el.querySelector(
                    "iframe"
                )
            );
        }

        function post(
            payload
        ){
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
                eventType:
                    "triggerRun"
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
                e.source!==
                iframe.contentWindow
            ){
                return;
            }

            if(
                !d ||
                !d.language
            ){
                return;
            }

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

                if(wantRun){
                    setTimeout(
                        sendRun,
                        300
                    );
                }

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
                attempts<
                MAX_ATTEMPTS
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

                if(wantRun){
                    setTimeout(
                        sendRun,
                        300
                    );
                }

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
                typeof prevOnClose===
                "function"
            ){
                prevOnClose();
            }
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

        if(iframeEl){
            iframeEl.addEventListener(
                "load",
                kickoff,
                {
                    once:true
                }
            );
        }else{
            kickoff();
        }

        return {
            ok:true,
            win
        };
    }


    /*
     * ============================================================
     * EXTERNAL CODE-OPEN EVENT
     * ============================================================
     */

    window.addEventListener(
        "message",
        e=>{
            const d=
                e.data||{};

            if(
                !d ||
                !d.language
            ){
                return;
            }

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


    /*
     * ============================================================
     * PUBLIC API
     * ============================================================
     */

    window.Apps={

        /*
         * Built-in registry
         */
        REGISTRY,

        /*
         * App launching
         */
        openApp,

        /*
         * Compiler
         */
        openOneCompiler,

        /*
         * Installed apps
         */
        getInstalledApps,

        getInstalledAppsSync,

        /*
         * All registered apps
         */
        getRegisteredApps,

        getRegisteredAppsSync,

        /*
         * Installer API
         */
        installApp,

        uninstallApp,

        /*
         * Lookup
         */
        getApp,

        /*
         * Storage paths
         */
        CUSTOM_APP_DIR,

        CIA_PATH,

        SRC_DOC_DIR,

        /*
         * Useful for tools / app system
         */
        isInstalledApp:
            isValidInstalledApp,

        getSourceType:
            appSourceType
    };


    /*
     * Prime the installed-app cache immediately.
     * This does not block the rest of the desktop.
     */
    getInstalledApps().catch(
        ()=>{}
    );

})();
