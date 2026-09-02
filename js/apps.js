(function(){
    const REGISTRY={
        apps:{title:"APPS",src:"app/apps.html",w:380,h:320},
        appinstaller:{title:"APP INSTALLER",src:"app/AppInstaller.html",w:500,h:500},
        "file manager":{title:"FILE MANAGER",src:"app/filemanager.html",w:520,h:390},
        filemanager:{title:"FILE MANAGER",src:"app/filemanager.html",w:520,h:390},
        clock:{title:"CLOCK",src:"app/clock.html",w:340,h:340},
        calculator:{title:"CALCULATOR",src:"app/calculator.html",w:300,h:370},
        notepad:{title:"NOTEPAD",src:"app/notepad.html",w:540,h:430},
        paint:{title:"PAINT",src:"app/paint.html",w:560,h:480},
        tictactoe:{title:"TIC TAC TOE",src:"app/tictactoe.html",w:360,h:340},
        snake:{title:"SNAKE",src:"app/snake.html",w:320,h:380},
        2048:{title:"2048",src:"app/2048.html",w:430,h:520},
        minesweeper:{title:"MINESWEEPER",src:"app/minesweeper.html",w:430,h:560},
        sudoku:{title:"SUDOKU",src:"app/sudoku.html",w:430,h:600},
        sos:{title:"SOS",src:"app/sos.html",w:430,h:600},
        tetris:{title:"TETRIS",src:"app/tetris.html",w:400,h:620},
        wordle:{title:"WORDLE",src:"app/wordle.html",w:430,h:650},
        imageviewer:{title:"IMAGE VIEWER",src:"app/imageviewer.html",w:480,h:380},
        videoplayer:{title:"VIDEO PLAYER",src:"app/videoplayer.html",w:480,h:360},
        audioplayer:{title:"AUDIO PLAYER",src:"app/audioplayer.html",w:420,h:260},
        gamefinder:{title:"GAME FINDER",src:"https://funhtml5games.com",w:360,h:340},
        doom:{title:"Doom",src:"https://js-dos.com/games/doom.exe.html",w:360,h:340},
        pacman:{title:"Pacman",src:"https://funhtml5games.com?embed=pacman",w:460,h:480},
        gba:{title:"GBA",src:"app/GBA.html",w:360,h:340},
        browser:{title:"BROWSER",src:"app/browser.html",w:360,h:340},
        imageeditor:{title:"imageeditor",src:"app/imageEditor.html",w:480,h:380},
        messenger:{title:"MESSENGER",src:"app/messenger.html",w:430,h:360},
        settings:{
            title:"SETTINGS",
            src:"app/settings.html",
            w:720,
            h:560
        }
    };

    const CIA_PATH="chxd:/local/Custom Installed Application/CIA.json";

    function normalizeName(name){
        return String(name||"").trim().toLowerCase();
    }

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
                return [];
            }

            const data=
                JSON.parse(result.content);

            return Array.isArray(data)
                ?data
                :[];
        }catch(e){
            return [];
        }
    }

    async function openApp(name,opts){
        opts=opts||{};

        const key=
            normalizeName(name);

        const installed=
            await getInstalledApps();

        const app=
            installed.find(x=>
                normalizeName(x.pkg)===key
            );

        if(app){
            const win=
                WM.openWindow({
                    title:
                        app.name||
                        app.pkg,
                    iframeSrc:
                        app.src,
                    width:
                        (opts.width||500)+"px",
                    height:
                        (opts.height||500)+"px",
                    noPad:true,
                    standaloneKey:
                        "installed:"+
                        app.pkg
                });

            return {
                ok:true,
                win,
                installed:true,
                app
            };
        }

        const def=
            REGISTRY[key];

        if(!def){
            return {
                ok:false,
                error:
                    "Unknown application: "+
                    name
            };
        }

        let src=
            def.src;

        const params=[];

        if(opts.src)
            params.push(
                "src="+
                encodeURIComponent(opts.src)
            );

        if(opts.path)
            params.push(
                "path="+
                encodeURIComponent(
                    String(opts.path)
                )
            );

        if(opts.equation!=null)
            params.push(
                "equation="+
                encodeURIComponent(
                    String(opts.equation)
                )
            );

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

        if(opts.paintPath)
            params.push(
                "paintPath="+
                encodeURIComponent(
                    String(opts.paintPath)
                )
            );

        if(opts.selectMode)
            params.push("select=1");

        if(opts.text!=null)
            params.push(
                "text="+
                encodeURIComponent(
                    String(opts.text)
                )
            );
        else if(opts.initialText!=null)
            params.push(
                "text="+
                encodeURIComponent(
                    String(opts.initialText)
                )
            );

        if(params.length)
            src+="?"+params.join("&");

        const standalone=
            opts.allowMultiple
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

        const win=
            WM.openWindow({
                title:
                    opts.title||
                    def.title,
                iframeSrc:
                    src,
                width:
                    (opts.width||def.w)+"px",
                height:
                    (opts.height||def.h)+"px",
                noPad:true,
                standaloneKey:
                    standalone
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
        REGISTRY
    };
})();
