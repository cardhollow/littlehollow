(function(){

    const root=document.getElementById("windows-root");
    const taskbar=document.getElementById("taskbar-items");

    let zTop=100;
    const windows=[];

    let counter=0;

    /*
     * Browser application tabs opened through application.html.
     *
     * {
     *     window: BrowserWindow,
     *     appId: String,
     *     ready: Boolean
     * }
     */
    const applicationTabs=new Map();


    function bringToFront(win){

        if(!win||win.closed){
            return;
        }

        zTop+=1;

        win.el.style.zIndex=zTop;
    }


    function findStandalone(key){

        return windows.find(
            w=>w.standaloneKey===key&&!w.closed
        );
    }


    /*
     * =========================================================
     * NORMAL WINDOW
     * =========================================================
     */
    function openWindow(options){

        options=options||{};


        /*
         * Prevent duplicate standalone windows.
         */
        if(options.standaloneKey){

            const existing=
                findStandalone(
                    options.standaloneKey
                );

            if(existing){

                bringToFront(existing);

                if(existing.minimized){

                    toggleMinimize(existing);
                }

                return existing;
            }
        }


        counter+=1;

        const id=
            "win-"+counter;


        /*
         * Window
         */
        const el=
            document.createElement("div");

        el.className=
            "cyan-window";

        el.id=
            id;


        el.style.width=
            options.width||"420px";

        el.style.height=
            options.height||"320px";


        /*
         * Position
         */
        const offset=
            (windows.length%8)*22;


        const defaultX=
            options.x!=null
            ?options.x
            :Math.max(
                20,
                (
                    window.innerWidth-
                    parseInt(
                        options.width||420
                    )
                )/2+
                offset-
                100
            );


        const defaultY=
            options.y!=null
            ?options.y
            :Math.max(
                60,
                (
                    window.innerHeight-
                    parseInt(
                        options.height||320
                    )
                )/2+
                offset-
                100
            );


        el.style.left=
            defaultX+"px";

        el.style.top=
            defaultY+"px";


        /*
         * =====================================================
         * HEADER
         * =====================================================
         *
         * _   □   ×
         *
         * _ = minimize
         * □ = open app in a real browser tab
         * × = close
         */
        const header=
            document.createElement("div");

        header.className=
            "cyan-window-header";


        /*
         * Title
         */
        const titleEl=
            document.createElement("div");

        titleEl.className=
            "cyan-window-title";

        titleEl.textContent=
            options.title||"WINDOW";

        header.appendChild(
            titleEl
        );


        /*
         * Buttons
         */
        const btns=
            document.createElement("div");

        btns.className=
            "cyan-window-btns";


        /*
         * -----------------------------------------------------
         * MINIMIZE
         * -----------------------------------------------------
         */
        const minBtn=
            document.createElement("button");

        minBtn.textContent="_";
        minBtn.title="Minimize";

        btns.appendChild(
            minBtn
        );


        /*
         * -----------------------------------------------------
         * OPEN IN NEW BROWSER TAB
         * -----------------------------------------------------
         *
         * Only iframe applications get this button.
         */
        let newTabBtn=null;

        if(options.iframeSrc){

            newTabBtn=
                document.createElement("button");

            newTabBtn.textContent="□";

            newTabBtn.title=
                "Open in New Tab";

            btns.appendChild(
                newTabBtn
            );
        }


        /*
         * -----------------------------------------------------
         * CLOSE
         * -----------------------------------------------------
         */
        let closeBtn=null;

        if(options.closable!==false){

            closeBtn=
                document.createElement("button");

            closeBtn.textContent="×";

            closeBtn.title="Close";

            btns.appendChild(
                closeBtn
            );
        }


        header.appendChild(
            btns
        );


        /*
         * =====================================================
         * CONTENT
         * =====================================================
         */
        const content=
            document.createElement("div");

        content.className=
            "cyan-window-content"+
            (
                options.noPad
                ?" no-pad"
                :""
            );


        /*
         * Keep the iframe reference.
         */
        let iframe=null;


        if(options.iframeSrc){

            iframe=
                document.createElement("iframe");

            iframe.src=
                options.iframeSrc;

            content.appendChild(
                iframe
            );

        }else if(options.html!==undefined){

            content.innerHTML=
                options.html;
        }


        el.appendChild(
            header
        );

        el.appendChild(
            content
        );


        /*
         * =====================================================
         * RESIZE HANDLE
         * =====================================================
         */
        if(options.resizable!==false){

            const handle=
                document.createElement("div");

            handle.className=
                "resize-handle";

            el.appendChild(
                handle
            );

            makeResizable(
                el,
                handle
            );
        }


        root.appendChild(
            el
        );


        /*
         * =====================================================
         * WINDOW STATE
         * =====================================================
         */
        const win={

            id,

            el,

            title:
                options.title||"WINDOW",

            standaloneKey:
                options.standaloneKey||null,

            iframe,

            iframeSrc:
                options.iframeSrc||null,

            minimized:false,

            closed:false,

            onClose:
                options.onClose||null
        };


        windows.push(
            win
        );


        bringToFront(
            win
        );


        /*
         * Bring to front.
         */
        el.addEventListener(
            "mousedown",
            ()=>{
                bringToFront(win);
            }
        );


        el.addEventListener(
            "touchstart",
            ()=>{
                bringToFront(win);
            },
            {passive:true}
        );


        /*
         * Dragging.
         */
        if(options.draggable!==false){

            makeDraggable(
                el,
                header
            );
        }


        /*
         * =====================================================
         * MINIMIZE BUTTON
         * =====================================================
         */
        minBtn.addEventListener(
            "click",
            e=>{

                e.stopPropagation();

                toggleMinimize(
                    win
                );
            }
        );


        /*
         * =====================================================
         * NEW TAB BUTTON
         * =====================================================
         */
        if(newTabBtn){

            newTabBtn.addEventListener(
                "click",
                e=>{

                    e.stopPropagation();


                    /*
                     * IMPORTANT:
                     *
                     * openApplicationTab() is called
                     * synchronously from the actual click.
                     *
                     * This gives the browser the best chance
                     * of allowing the new tab.
                     */
                    openApplicationTab({

                        appId:
                            win.standaloneKey||
                            win.id,

                        title:
                            win.title,

                        src:
                            win.iframeSrc
                    });

                }
            );
        }


        /*
         * =====================================================
         * CLOSE BUTTON
         * =====================================================
         */
        if(closeBtn){

            closeBtn.addEventListener(
                "click",
                e=>{

                    e.stopPropagation();

                    closeWindow(
                        win
                    );
                }
            );
        }


        addTaskbarButton(
            win
        );


        return win;
    }


    /*
     * =========================================================
     * OPEN APPLICATION IN NEW BROWSER TAB
     * =========================================================
     *
     * The new tab ALWAYS opens:
     *
     * application.html
     *
     * resolved relative to the current Little Hollow page.
     *
     * Example:
     *
     * Current:
     * https://cardhollow.github.io/littlehollow/index.html
     *
     * Result:
     * https://cardhollow.github.io/littlehollow/application.html
     */
    function openApplicationTab(options){

        options=options||{};


        const src=
            options.src||null;

        const srcDoc=
            options.srcDoc||null;


        if(!src&&!srcDoc){

            console.error(
                "WM.openApplicationTab: missing src or srcDoc"
            );

            return null;
        }


        /*
         * Application identifier.
         */
        const appId=
            options.appId||
            (
                "application-"+
                Date.now()+
                "-"+
                Math.random()
            );


        /*
         * If this app already has a browser tab,
         * focus it instead of opening another one.
         */
        if(options.standalone!==false){

            const existing=
                applicationTabs.get(
                    appId
                );


            if(
                existing&&
                existing.window&&
                !existing.window.closed
            ){

                existing.window.focus();


                sendApplicationCommand(
                    existing.window,
                    {
                        type:
                            "load-app",

                        appId,

                        title:
                            options.title||
                            "APPLICATION",

                        src,

                        srcDoc
                    }
                );


                return existing.window;
            }


            applicationTabs.delete(
                appId
            );
        }


        /*
         * =====================================================
         * RESOLVE application.html CORRECTLY
         * =====================================================
         *
         * DO NOT use:
         *
         * /application.html
         *
         * because that points to the domain root.
         *
         * Instead:
         *
         * application.html
         *
         * resolves relative to the current Little Hollow
         * directory.
         */
        const applicationURL=
            new URL(
                "application.html",
                document.baseURI
            ).href;


        /*
         * =====================================================
         * OPEN NEW TAB
         * =====================================================
         *
         * This happens synchronously while handling the click.
         */
        let appWindow=null;


        try{

            appWindow=
                window.open(
                    applicationURL,
                    "_blank"
                );

        }catch(error){

            console.error(
                "Little Hollow: failed to open application tab.",
                error
            );

            return null;
        }


        /*
         * Browser blocked it.
         */
        if(!appWindow){

            console.warn(
                "Little Hollow: browser blocked the new tab."
            );

            return null;
        }


        /*
         * Register immediately.
         */
        const record={

            window:
                appWindow,

            appId,

            ready:false
        };


        applicationTabs.set(
            appId,
            record
        );


        /*
         * =====================================================
         * SEND LOAD COMMAND
         * =====================================================
         *
         * application.html listens for this.
         */
        sendApplicationCommand(
            appWindow,
            {
                type:
                    "load-app",

                appId,

                title:
                    options.title||
                    "APPLICATION",

                src,

                srcDoc
            }
        );


        /*
         * application.html might not have finished loading
         * yet. Listen for its READY message instead of
         * repeatedly hammering it.
         *
         * The READY handler below will resend the load
         * command once application.html is ready.
         */
        return appWindow;
    }


    /*
     * =========================================================
     * SEND MESSAGE TO APPLICATION.HTML
     * =========================================================
     */
    function sendApplicationCommand(
        appWindow,
        message
    ){

        if(
            !appWindow||
            appWindow.closed
        ){

            return false;
        }


        try{

            appWindow.postMessage(
                message,
                window.location.origin
            );

            return true;

        }catch(error){

            console.error(
                "Little Hollow application message failed:",
                error
            );

            return false;
        }
    }


    /*
     * =========================================================
     * MAIN PAGE MESSAGE RECEIVER
     * =========================================================
     */
    window.addEventListener(
        "message",
        function(event){

            /*
             * Same origin only.
             */
            if(
                event.origin!==
                window.location.origin
            ){

                return;
            }


            if(
                !event.data||
                typeof event.data!=="object"
            ){

                return;
            }


            const message=
                event.data;


            /*
             * =================================================
             * application.html READY
             * =================================================
             */
            if(
                message.type===
                "application-ready"
            ){

                const record=
                    applicationTabs.get(
                        message.appId
                    );


                if(record){

                    record.ready=true;


                    /*
                     * Now that application.html is definitely
                     * listening, send the actual app command.
                     */
                    sendApplicationCommand(
                        record.window,
                        {
                            type:
                                "load-app",

                            appId:
                                record.appId,

                            title:
                                message.title||
                                "APPLICATION",

                            src:
                                message.src||
                                null,

                            srcDoc:
                                message.srcDoc||
                                null
                        }
                    );
                }


                return;
            }


            /*
             * =================================================
             * APPLICATION → MAIN
             * =================================================
             */
            if(
                message.type===
                "application-to-main"
            ){

                /*
                 * Find the external tab that sent this.
                 */
                const appMessage=
                    message.message;


                /*
                 * Re-dispatch a normal "message" event
                 * containing the original application data.
                 *
                 * Existing main-page listeners can continue
                 * using event.data.
                 */
                window.dispatchEvent(
                    new MessageEvent(
                        "message",
                        {
                            data:
                                appMessage,

                            origin:
                                event.origin,

                            source:
                                event.source
                        }
                    )
                );


                return;
            }

        }
    );


    /*
     * =========================================================
     * MAIN PAGE → APPLICATION TAB
     * =========================================================
     */
    function sendToApplicationTab(
        appId,
        message
    ){

        const record=
            applicationTabs.get(
                appId
            );


        if(!record){

            return false;
        }


        if(
            !record.window||
            record.window.closed
        ){

            applicationTabs.delete(
                appId
            );

            return false;
        }


        return sendApplicationCommand(
            record.window,
            {
                type:
                    "main-to-application",

                appId,

                message
            }
        );
    }


    /*
     * =========================================================
     * LIST APPLICATION TABS
     * =========================================================
     */
    function listApplicationTabs(){

        const result=[];


        applicationTabs.forEach(
            (record,appId)=>{

                if(
                    !record.window||
                    record.window.closed
                ){

                    applicationTabs.delete(
                        appId
                    );

                    return;
                }


                result.push({

                    appId,

                    window:
                        record.window,

                    ready:
                        record.ready
                });
            }
        );


        return result;
    }


    /*
     * =========================================================
     * MINIMIZE
     * =========================================================
     */
    function toggleMinimize(win){

        win.minimized=
            !win.minimized;


        win.el.style.display=
            win.minimized
            ?"none"
            :"flex";


        if(win.taskbarBtn){

            win.taskbarBtn.classList.toggle(
                "minimized",
                win.minimized
            );
        }


        if(!win.minimized){

            bringToFront(
                win
            );
        }
    }


    /*
     * =========================================================
     * CLOSE
     * =========================================================
     */
    function closeWindow(win){

        if(!win||win.closed){

            return;
        }


        win.closed=true;


        win.el.remove();


        if(win.taskbarBtn){

            win.taskbarBtn.remove();
        }


        const idx=
            windows.indexOf(win);


        if(idx!==-1){

            windows.splice(
                idx,
                1
            );
        }


        if(
            typeof win.onClose===
            "function"
        ){

            win.onClose();
        }
    }


    function closeAll(){

        [...windows].forEach(
            closeWindow
        );
    }


    /*
     * =========================================================
     * TASKBAR
     * =========================================================
     */
    function addTaskbarButton(win){

        const btn=
            document.createElement("div");

        btn.className=
            "tb-item";


        const label=
            document.createElement("span");

        label.textContent=
            win.title;

        btn.appendChild(
            label
        );


        const x=
            document.createElement("button");

        x.className=
            "tb-x";

        x.textContent="×";


        x.addEventListener(
            "click",
            e=>{

                e.stopPropagation();

                closeWindow(
                    win
                );
            }
        );


        btn.appendChild(
            x
        );


        btn.addEventListener(
            "click",
            ()=>{

                if(win.minimized){

                    toggleMinimize(
                        win
                    );

                }else{

                    bringToFront(
                        win
                    );
                }
            }
        );


        taskbar.appendChild(
            btn
        );


        win.taskbarBtn=
            btn;
    }


    /*
     * =========================================================
     * DRAGGING
     * =========================================================
     */
    function makeDraggable(
        win,
        handle
    ){

        let dragging=false;

        let offsetX=0;
        let offsetY=0;


        function start(
            clientX,
            clientY
        ){

            const currentWin=
                windows.find(
                    w=>w.el===win
                );


            const rect=
                win.getBoundingClientRect();


            dragging=true;


            offsetX=
                clientX-
                rect.left;


            offsetY=
                clientY-
                rect.top;


            bringToFront(
                currentWin
            );
        }


        function move(
            clientX,
            clientY
        ){

            if(!dragging){

                return;
            }


            let x=
                clientX-
                offsetX;


            let y=
                clientY-
                offsetY;


            const maxX=
                window.innerWidth-
                win.offsetWidth;


            const maxY=
                window.innerHeight-
                win.offsetHeight-
                44;


            x=Math.max(
                0,
                Math.min(
                    x,
                    maxX
                )
            );


            y=Math.max(
                0,
                Math.min(
                    y,
                    maxY
                )
            );


            win.style.left=
                x+"px";


            win.style.top=
                y+"px";
        }


        function end(){

            dragging=false;
        }


        /*
         * Mouse
         */
        handle.addEventListener(
            "mousedown",
            e=>{

                if(
                    e.target.closest("button")
                ){

                    return;
                }


                start(
                    e.clientX,
                    e.clientY
                );


                e.preventDefault();
            }
        );


        window.addEventListener(
            "mousemove",
            e=>{
                move(
                    e.clientX,
                    e.clientY
                );
            }
        );


        window.addEventListener(
            "mouseup",
            end
        );


        /*
         * Touch
         */
        handle.addEventListener(
            "touchstart",
            e=>{

                if(
                    e.target.closest("button")
                ){

                    return;
                }


                const t=
                    e.touches[0];


                start(
                    t.clientX,
                    t.clientY
                );

            },
            {passive:true}
        );


        window.addEventListener(
            "touchmove",
            e=>{

                if(!dragging){

                    return;
                }


                const t=
                    e.touches[0];


                move(
                    t.clientX,
                    t.clientY
                );

            },
            {passive:true}
        );


        window.addEventListener(
            "touchend",
            end
        );
    }


    /*
     * =========================================================
     * RESIZING
     * =========================================================
     */
    function makeResizable(
        win,
        handle
    ){

        let resizing=false;

        let startW=0;
        let startH=0;

        let startX=0;
        let startY=0;


        function start(
            clientX,
            clientY
        ){

            resizing=true;

            startW=
                win.offsetWidth;

            startH=
                win.offsetHeight;

            startX=
                clientX;

            startY=
                clientY;
        }


        function move(
            clientX,
            clientY
        ){

            if(!resizing){

                return;
            }


            const w=
                Math.max(
                    220,
                    startW+
                    (
                        clientX-
                        startX
                    )
                );


            const h=
                Math.max(
                    150,
                    startH+
                    (
                        clientY-
                        startY
                    )
                );


            win.style.width=
                w+"px";


            win.style.height=
                h+"px";
        }


        function end(){

            resizing=false;
        }


        /*
         * Mouse
         */
        handle.addEventListener(
            "mousedown",
            e=>{

                start(
                    e.clientX,
                    e.clientY
                );

                e.preventDefault();

                e.stopPropagation();
            }
        );


        window.addEventListener(
            "mousemove",
            e=>{

                move(
                    e.clientX,
                    e.clientY
                );
            }
        );


        window.addEventListener(
            "mouseup",
            end
        );


        /*
         * Touch
         */
        handle.addEventListener(
            "touchstart",
            e=>{

                const t=
                    e.touches[0];


                start(
                    t.clientX,
                    t.clientY
                );


                e.stopPropagation();

            },
            {passive:true}
        );


        window.addEventListener(
            "touchmove",
            e=>{

                if(!resizing){

                    return;
                }


                const t=
                    e.touches[0];


                move(
                    t.clientX,
                    t.clientY
                );

            },
            {passive:true}
        );


        window.addEventListener(
            "touchend",
            end
        );
    }


    /*
     * =========================================================
     * PUBLIC API
     * =========================================================
     */
    window.WM={

        openWindow,

        closeWindow,

        closeAll,

        /*
         * Open existing iframe app through
         * /littlehollow/application.html
         */
        openApplicationTab,

        /*
         * Main Page → application.html → app
         */
        sendToApplicationTab,

        /*
         * List browser application tabs
         */
        listApplicationTabs,

        /*
         * Normal Little Hollow windows
         */
        list:()=>windows.slice()
    };

})();
