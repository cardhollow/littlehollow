(function(){

    const root=document.getElementById("windows-root");
    const taskbar=document.getElementById("taskbar-items");

    let zTop=100;
    const windows=[];

    let counter=0;

    /*
     * Browser application tabs.
     *
     * {
     *     window,
     *     appId,
     *     ready,
     *     src,
     *     srcDoc,
     *     title
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
         * □ = open in new browser tab
         * × = close
         */
        const header=
            document.createElement("div");

        header.className=
            "cyan-window-header";


        const titleEl=
            document.createElement("div");

        titleEl.className=
            "cyan-window-title";

        titleEl.textContent=
            options.title||"WINDOW";

        header.appendChild(
            titleEl
        );


        const btns=
            document.createElement("div");

        btns.className=
            "cyan-window-btns";


        /*
         * MINIMIZE
         */
        const minBtn=
            document.createElement("button");

        minBtn.textContent="_";
        minBtn.title="Minimize";

        btns.appendChild(
            minBtn
        );


        /*
         * NEW TAB
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
         * CLOSE
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
         * RESIZE
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


        if(options.draggable!==false){

            makeDraggable(
                el,
                header
            );
        }


        /*
         * MINIMIZE
         */
        minBtn.addEventListener(
            "click",
            e=>{

                e.stopPropagation();

                toggleMinimize(win);
            }
        );


        /*
         * NEW TAB
         */
        if(newTabBtn){

            newTabBtn.addEventListener(
                "click",
                e=>{

                    e.stopPropagation();

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
         * CLOSE
         */
        if(closeBtn){

            closeBtn.addEventListener(
                "click",
                e=>{

                    e.stopPropagation();

                    closeWindow(win);
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
     * OPEN APPLICATION IN REAL BROWSER TAB
     * =========================================================
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


        const appId=
            options.appId||
            (
                "application-"+
                Date.now()+
                "-"+
                Math.random()
            );


        /*
         * Reuse existing tab.
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


                existing.src=
                    src;

                existing.srcDoc=
                    srcDoc;

                existing.title=
                    options.title||
                    "APPLICATION";


                if(existing.ready){

                    sendApplicationCommand(
                        existing.window,
                        {
                            type:
                                "load-app",

                            appId:
                                existing.appId,

                            title:
                                existing.title,

                            src:
                                existing.src,

                            srcDoc:
                                existing.srcDoc
                        }
                    );
                }


                return existing.window;
            }


            applicationTabs.delete(
                appId
            );
        }


        /*
         * IMPORTANT:
         *
         * Resolve application.html relative to the
         * current page.
         *
         * https://cardhollow.github.io/littlehollow/
         *
         * becomes:
         *
         * https://cardhollow.github.io/littlehollow/application.html
         */
        const applicationURL=
            new URL(
                "application.html",
                document.baseURI
            ).href;


        /*
         * Open immediately from the user's click.
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


        if(!appWindow){

            console.warn(
                "Little Hollow: browser blocked the new tab."
            );

            return null;
        }


        /*
         * Remember everything required to load
         * the application after the host becomes ready.
         */
        const record={

            window:
                appWindow,

            appId,

            ready:false,

            src,

            srcDoc,

            title:
                options.title||
                "APPLICATION"
        };


        applicationTabs.set(
            appId,
            record
        );


        /*
         * DO NOT send load-app yet.
         *
         * application.html has not necessarily loaded.
         *
         * We wait for:
         *
         * application.html → application-host-ready
         */
        return appWindow;
    }


    /*
     * =========================================================
     * SEND COMMAND TO application.html
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
             * Same-origin messages only.
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
             * APPLICATION HOST READY
             * =================================================
             *
             * application.html sends this immediately
             * after its own page has loaded.
             *
             * We identify the application tab using
             * event.source.
             */
            if(
                message.type===
                "application-host-ready"
            ){

                let foundRecord=null;


                applicationTabs.forEach(
                    record=>{

                        if(
                            record.window===
                            event.source
                        ){

                            foundRecord=
                                record;
                        }
                    }
                );


                if(!foundRecord){

                    return;
                }


                foundRecord.ready=true;


                /*
                 * NOW send the actual application.
                 */
                sendApplicationCommand(
                    foundRecord.window,
                    {
                        type:
                            "load-app",

                        appId:
                            foundRecord.appId,

                        title:
                            foundRecord.title,

                        src:
                            foundRecord.src,

                        srcDoc:
                            foundRecord.srcDoc
                    }
                );


                return;
            }


            /*
             * =================================================
             * APPLICATION READY
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
                 * Forward the ORIGINAL app message.
                 */
                window.dispatchEvent(
                    new MessageEvent(
                        "message",
                        {
                            data:
                                message.message,

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
                windows.find(
                    w=>w.el===win
                )
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
            e=>move(
                e.clientX,
                e.clientY
            )
        );


        window.addEventListener(
            "mouseup",
            end
        );


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
            e=>move(
                e.clientX,
                e.clientY
            )
        );


        window.addEventListener(
            "mouseup",
            end
        );


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

        openApplicationTab,

        sendToApplicationTab,

        listApplicationTabs,

        list:()=>windows.slice()
    };

})();
