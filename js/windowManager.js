(function(){

    const root=document.getElementById("windows-root");
    const taskbar=document.getElementById("taskbar-items");

    let zTop=100;
    const windows=[];

    let counter=0;

    /*
     * Browser application tabs opened through
     * /application.html
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
     * CREATE NORMAL WINDOW
     * =========================================================
     *
     * options:
     *
     * {
     *     title,
     *     html,
     *     iframeSrc,
     *
     *     closable,
     *     draggable,
     *     resizable,
     *
     *     width,
     *     height,
     *     x,
     *     y,
     *
     *     standaloneKey,
     *     noPad,
     *     onClose
     * }
     */
    function openWindow(options){

        options=options||{};


        /*
         * Standalone protection
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
         * Main window
         */
        const el=
            document.createElement("div");

        el.className=
            "cyan-window";

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
         * Buttons
         *
         * _   □   ×
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

        btns.appendChild(minBtn);


        /*
         * -----------------------------------------------------
         * OPEN IN NEW TAB
         * -----------------------------------------------------
         *
         * This is the □ button.
         *
         * It DOES NOT maximize the window.
         *
         * It opens the same iframe application through:
         *
         * /application.html
         */
        let newTabBtn=null;

        if(options.iframeSrc){

            newTabBtn=
                document.createElement("button");

            newTabBtn.textContent="□";
            newTabBtn.title="Open in New Tab";

            btns.appendChild(newTabBtn);
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

            btns.appendChild(closeBtn);
        }


        header.appendChild(btns);


        /*
         * =====================================================
         * CONTENT
         * =====================================================
         */
        const content=
            document.createElement("div");

        content.className=
            "cyan-window-content"+
            (options.noPad?" no-pad":"");


        /*
         * Store iframe reference so the same app source
         * can be opened in the browser tab.
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


        el.appendChild(header);
        el.appendChild(content);


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

            el.appendChild(handle);

            makeResizable(
                el,
                handle
            );
        }


        root.appendChild(el);


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
         * =====================================================
         * MINIMIZE
         * =====================================================
         */
        minBtn.addEventListener(
            "click",
            e=>{

                e.stopPropagation();

                toggleMinimize(win);
            }
        );


        /*
         * =====================================================
         * OPEN IN NEW TAB
         * =====================================================
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
                            win.iframeSrc,

                        /*
                         * This is specifically the
                         * "new browser tab" operation.
                         */
                        standalone:true
                    });
                }
            );
        }


        /*
         * =====================================================
         * CLOSE
         * =====================================================
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
     * OPEN APP IN REAL BROWSER TAB
     * =========================================================
     *
     * The new browser tab is:
     *
     * /application.html
     *
     * That page contains ONE iframe.
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
         * Give the application a stable ID.
         */
        const appId=
            options.appId||
            (
                "application-"+
                Date.now()+"-"+
                Math.random()
            );


        /*
         * Reuse existing browser tab.
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


        /*
         * Open blank immediately.
         *
         * This is intentionally synchronous so that
         * a button click can create the browser tab.
         */
        let appWindow=null;


        try{

            appWindow=
                window.open(
                    "about:blank",
                    "_blank"
                );

        }catch(error){

            console.error(
                "Little Hollow: failed to open browser tab.",
                error
            );

            return null;
        }


        /*
         * Popup blocked
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
        applicationTabs.set(
            appId,
            {
                window:appWindow,
                appId,
                ready:false
            }
        );


        /*
         * Navigate the newly opened tab.
         */
        try{

            const applicationURL=
                new URL(
                    "/application.html",
                    window.location.href
                ).href;


            appWindow.location.href=
                applicationURL;

        }catch(error){

            console.error(
                "Little Hollow: failed to open application.html.",
                error
            );


            try{
                appWindow.close();
            }catch(_){}


            applicationTabs.delete(
                appId
            );


            return null;
        }


        /*
         * application.html has to finish loading before
         * it can receive our command.
         *
         * Retry briefly.
         */
        let attempts=0;


        const retryTimer=
            setInterval(
                ()=>{

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


                    if(attempts>=40){

                        clearInterval(
                            retryTimer
                        );
                    }

                },
                250
            );


        /*
         * First attempt immediately.
         */
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


        return appWindow;
    }


    /*
     * =========================================================
     * SEND COMMAND TO APPLICATION TAB
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
             * application.html is ready
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
             * application.html forwarded something
             * from its iframe.
             */
            if(
                message.type===
                "application-to-main"
            ){

                const appMessage=
                    message.message;


                /*
                 * Give the existing Main Page code
                 * the original application message.
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
         * Opens /application.html in a REAL browser tab.
         */
        openApplicationTab,

        /*
         * Main Page → application.html → iframe
         */
        sendToApplicationTab,

        /*
         * List external application tabs.
         */
        listApplicationTabs,

        /*
         * Existing Little Hollow windows.
         */
        list:()=>windows.slice()

    };

})();
