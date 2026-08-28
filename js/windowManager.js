(function(){

    const root=document.getElementById("windows-root");
    const taskbar=document.getElementById("taskbar-items");
    let zTop=100;
    const windows=[]; // {id, el, taskbarBtn, standaloneKey, minimized, maximized}
    let counter=0;

    /*
     * External application tabs opened through /application.html.
     *
     * {
     *   window: browserWindow,
     *   appId,
     *   ready
     * }
     */
    const applicationTabs=new Map();


    function bringToFront(win){
        zTop+=1;
        win.el.style.zIndex=zTop;
    }


    function findStandalone(key){
        return windows.find(
            w=>w.standaloneKey===key&&!w.closed
        );
    }


    /**
     * options: {
     *   title,
     *   html,
     *   iframeSrc,
     *   closable,
     *   draggable,
     *   resizable,
     *   maximizable,
     *   width,
     *   height,
     *   x,
     *   y,
     *   standaloneKey,
     *   noPad,
     *   onClose
     * }
     */
    function openWindow(options){

        options=options||{};


        /*
         * Standalone window protection
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

        const id="win-"+counter;


        /*
         * Main window element
         */
        const el=document.createElement("div");

        el.className="cyan-window";
        el.id=id;

        el.style.width=
            options.width||"420px";

        el.style.height=
            options.height||"320px";


        /*
         * Default position
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
                    parseInt(options.width||420)
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
                    parseInt(options.height||320)
                )/2+
                offset-
                100
            );

        el.style.left=
            defaultX+"px";

        el.style.top=
            defaultY+"px";


        /*
         * Header
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

        header.appendChild(titleEl);


        /*
         * Header buttons
         */
        const btns=
            document.createElement("div");

        btns.className=
            "cyan-window-btns";


        /*
         * MINIMIZE
         *
         * _
         */
        const minBtn=
            document.createElement("button");

        minBtn.textContent="_";
        minBtn.title="Minimize";

        btns.appendChild(minBtn);


        /*
         * MAXIMIZE
         *
         * □
         */
        let maxBtn=null;

        if(options.maximizable!==false){

            maxBtn=
                document.createElement("button");

            maxBtn.textContent="□";
            maxBtn.title="Maximize";

            btns.appendChild(maxBtn);
        }


        /*
         * CLOSE
         *
         * ×
         */
        let closeBtn=null;

        if(options.closable!==false){

            closeBtn=
                document.createElement("button");

            closeBtn.textContent="×";
            closeBtn.title="Close";

            btns.appendChild(closeBtn);
        }


        header.appendChild(btns);


        /*
         * Content
         */
        const content=
            document.createElement("div");

        content.className=
            "cyan-window-content"+
            (options.noPad?" no-pad":"");


        /*
         * Existing iframe window
         */
        if(options.iframeSrc){

            const iframe=
                document.createElement("iframe");

            iframe.src=
                options.iframeSrc;

            content.appendChild(iframe);

        }else if(options.html!==undefined){

            content.innerHTML=
                options.html;
        }


        el.appendChild(header);
        el.appendChild(content);


        /*
         * Resize handle
         */
        if(options.resizable!==false){

            const handle=
                document.createElement("div");

            handle.className=
                "resize-handle";

            el.appendChild(handle);

            makeResizable(
                el,
                handle
            );
        }


        root.appendChild(el);


        /*
         * Window state
         */
        const win={
            id,
            el,
            title:options.title||"WINDOW",
            standaloneKey:
                options.standaloneKey||null,

            minimized:false,
            maximized:false,
            closed:false,

            restoreState:null,

            onClose:
                options.onClose||null
        };


        windows.push(win);

        bringToFront(win);


        /*
         * Bring to front
         */
        el.addEventListener(
            "mousedown",
            ()=>bringToFront(win)
        );

        el.addEventListener(
            "touchstart",
            ()=>bringToFront(win),
            {passive:true}
        );


        /*
         * Dragging
         */
        if(options.draggable!==false){

            makeDraggable(
                el,
                header
            );
        }


        /*
         * Minimize
         */
        minBtn.addEventListener(
            "click",
            e=>{

                e.stopPropagation();

                toggleMinimize(win);
            }
        );


        /*
         * Maximize
         */
        if(maxBtn){

            maxBtn.addEventListener(
                "click",
                e=>{

                    e.stopPropagation();

                    toggleMaximize(
                        win,
                        maxBtn
                    );
                }
            );
        }


        /*
         * Close
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


        addTaskbarButton(win);

        return win;
    }


    /*
     * =========================================================
     * MAXIMIZE / RESTORE
     * =========================================================
     */
    function toggleMaximize(
        win,
        button
    ){

        /*
         * RESTORE
         */
        if(win.maximized){

            if(win.restoreState){

                win.el.style.left=
                    win.restoreState.left;

                win.el.style.top=
                    win.restoreState.top;

                win.el.style.width=
                    win.restoreState.width;

                win.el.style.height=
                    win.restoreState.height;
            }

            win.maximized=false;

            button.textContent="□";
            button.title="Maximize";

            bringToFront(win);

            return;
        }


        /*
         * Save current state
         */
        win.restoreState={

            left:
                win.el.style.left,

            top:
                win.el.style.top,

            width:
                win.el.style.width,

            height:
                win.el.style.height
        };


        /*
         * Maximize
         */
        win.maximized=true;

        win.el.style.left="0px";
        win.el.style.top="0px";

        win.el.style.width="100%";

        win.el.style.height=
            "calc(100% - 44px)";


        /*
         * Restore icon
         */
        button.textContent="❐";
        button.title="Restore";

        bringToFront(win);
    }


    /*
     * =========================================================
     * OPEN APPLICATION IN A REAL BROWSER TAB
     * =========================================================
     *
     * The actual browser tab is:
     *
     * /application.html
     *
     * application.html contains exactly ONE iframe.
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
         * Application ID
         */
        const appId=
            options.appId||
            options.standaloneKey||
            (
                "application-"+
                Date.now()+
                "-"+
                Math.random()
            );


        /*
         * Existing tab?
         */
        if(options.standalone!==false){

            const existing=
                applicationTabs.get(
                    appId
                );

            if(existing){

                if(
                    existing.window&&
                    !existing.window.closed
                ){

                    existing.window.focus();


                    sendApplicationCommand(
                        existing.window,
                        {
                            type:"load-app",

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
        }


        /*
         * Open the universal application host.
         */
        const appWindow=
            window.open(
                "/application.html",
                "_blank"
            );


        if(!appWindow){

            console.warn(
                "Little Hollow: browser blocked the application tab."
            );

            return null;
        }


        const record={

            window:appWindow,

            appId,

            ready:false
        };


        applicationTabs.set(
            appId,
            record
        );


        /*
         * application.html may not have loaded yet.
         *
         * Keep sending the load command until the
         * wrapper confirms that it is ready.
         */
        let attempts=0;
        let retryTimer=null;


        const sendInitial=()=>{

            if(
                !appWindow||
                appWindow.closed
            ){

                clearInterval(
                    retryTimer
                );

                applicationTabs.delete(
                    appId
                );

                return;
            }


            attempts+=1;


            sendApplicationCommand(
                appWindow,
                {
                    type:"load-app",

                    appId,

                    title:
                        options.title||
                        "APPLICATION",

                    src,

                    srcDoc
                }
            );


            if(attempts>=30){

                clearInterval(
                    retryTimer
                );
            }
        };


        retryTimer=
            setInterval(
                sendInitial,
                250
            );


        sendInitial();


        return appWindow;
    }


    /*
     * =========================================================
     * SEND MESSAGE TO application.html
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
     * MAIN PAGE ←→ application.html
     * =========================================================
     */
    window.addEventListener(
        "message",
        function(event){

            /*
             * Same origin only
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
             * application.html is ready.
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
             * Message coming from the application
             * inside application.html.
             */
            if(
                message.type===
                "application-to-main"
            ){

                const appMessage=
                    message.message;


                /*
                 * Re-dispatch so existing Main Page
                 * message listeners can receive it.
                 */
                window.dispatchEvent(
                    new MessageEvent(
                        "message",
                        {
                            data:appMessage,

                            origin:event.origin,

                            source:event.source
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

            bringToFront(win);
        }
    }


    /*
     * =========================================================
     * CLOSE
     * =========================================================
     */
    function closeWindow(win){

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

        btn.appendChild(label);


        const x=
            document.createElement("button");

        x.className=
            "tb-x";

        x.textContent="×";


        x.addEventListener(
            "click",
            e=>{

                e.stopPropagation();

                closeWindow(win);
            }
        );


        btn.appendChild(x);


        btn.addEventListener(
            "click",
            ()=>{

                if(win.minimized){

                    toggleMinimize(win);

                }else{

                    bringToFront(win);
                }
            }
        );


        taskbar.appendChild(btn);

        win.taskbarBtn=btn;
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


            /*
             * Don't drag maximized windows.
             */
            if(
                currentWin&&
                currentWin.maximized
            ){
                return;
            }


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
            e=>move(
                e.clientX,
                e.clientY
            )
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

            const currentWin=
                windows.find(
                    w=>w.el===win
                );


            /*
             * Don't resize maximized windows.
             */
            if(
                currentWin&&
                currentWin.maximized
            ){
                return;
            }


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


            const w=Math.max(
                220,
                startW+
                (
                    clientX-
                    startX
                )
            );


            const h=Math.max(
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
            e=>move(
                e.clientX,
                e.clientY
            )
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
         * New browser tab application system
         */
        openApplicationTab,

        /*
         * Send Main Page → application.html → iframe
         */
        sendToApplicationTab,

        /*
         * Get open application tabs
         */
        listApplicationTabs,

        /*
         * Existing window list
         */
        list:()=>windows.slice()
    };

})();
