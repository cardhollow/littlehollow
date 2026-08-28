/*
 * Window manager: creates draggable, resizable, minimizable windows.
 * Supports plain HTML content or an iframe pointed at an app page.
 */
(function(){

    const root=document.getElementById("windows-root");
    const taskbar=document.getElementById("taskbar-items");
    let zTop=100;
    const windows=[]; // {id, el, taskbarBtn, standaloneKey, minimized}
    let counter=0;

    function bringToFront(win){
        zTop+=1;
        win.el.style.zIndex=zTop;
    }

    function findStandalone(key){
        return windows.find(w=>w.standaloneKey===key&&!w.closed);
    }

    /**
     * options: {
     *   title, html, iframeSrc, closable, draggable, resizable,
     *   width, height, x, y, standaloneKey, noPad, onClose
     * }
     */
    function openWindow(options){
        options=options||{};

        if(options.standaloneKey){
            const existing=findStandalone(options.standaloneKey);
            if(existing){
                bringToFront(existing);
                if(existing.minimized) toggleMinimize(existing);
                return existing;
            }
        }

        counter+=1;
        const id="win-"+counter;

        const el=document.createElement("div");
        el.className="cyan-window";
        el.id=id;
        el.style.width=options.width||"420px";
        el.style.height=options.height||"320px";

        const offset=(windows.length%8)*22;
        const defaultX=options.x!=null?options.x:Math.max(20,(window.innerWidth-parseInt(options.width||420))/2+offset-100);
        const defaultY=options.y!=null?options.y:Math.max(60,(window.innerHeight-parseInt(options.height||320))/2+offset-100);

        el.style.left=defaultX+"px";
        el.style.top=defaultY+"px";

        const header=document.createElement("div");
        header.className="cyan-window-header";

        const titleEl=document.createElement("div");
        titleEl.className="cyan-window-title";
        titleEl.textContent=options.title||"WINDOW";
        header.appendChild(titleEl);

        const btns=document.createElement("div");
        btns.className="cyan-window-btns";

        const minBtn=document.createElement("button");
        minBtn.textContent="_";
        minBtn.title="Minimize";
        btns.appendChild(minBtn);

        let closeBtn=null;
        if(options.closable!==false){
            closeBtn=document.createElement("button");
            closeBtn.textContent="×";
            closeBtn.title="Close";
            btns.appendChild(closeBtn);
        }

        header.appendChild(btns);

        const content=document.createElement("div");
        content.className="cyan-window-content"+(options.noPad?" no-pad":"");

        if(options.iframeSrc){
            const iframe=document.createElement("iframe");
            iframe.src=options.iframeSrc;
            content.appendChild(iframe);
        }else if(options.html!==undefined){
            content.innerHTML=options.html;
        }

        el.appendChild(header);
        el.appendChild(content);

        if(options.resizable!==false){
            const handle=document.createElement("div");
            handle.className="resize-handle";
            el.appendChild(handle);
            makeResizable(el,handle);
        }

        root.appendChild(el);

        const win={
            id,
            el,
            title:options.title||"WINDOW",
            standaloneKey:options.standaloneKey||null,
            minimized:false,
            closed:false,
            onClose:options.onClose||null
        };

        windows.push(win);
        bringToFront(win);

        el.addEventListener("mousedown",()=>bringToFront(win));
        el.addEventListener("touchstart",()=>bringToFront(win),{passive:true});

        if(options.draggable!==false){
            makeDraggable(el,header);
        }

        minBtn.addEventListener("click",e=>{
            e.stopPropagation();
            toggleMinimize(win);
        });

        if(closeBtn){
            closeBtn.addEventListener("click",e=>{
                e.stopPropagation();
                closeWindow(win);
            });
        }

        addTaskbarButton(win);

        return win;
    }

    function toggleMinimize(win){
        win.minimized=!win.minimized;
        win.el.style.display=win.minimized?"none":"flex";
        if(win.taskbarBtn){
            win.taskbarBtn.classList.toggle("minimized",win.minimized);
        }
        if(!win.minimized) bringToFront(win);
    }

    function closeWindow(win){
        win.closed=true;
        win.el.remove();
        if(win.taskbarBtn) win.taskbarBtn.remove();
        const idx=windows.indexOf(win);
        if(idx!==-1) windows.splice(idx,1);
        if(typeof win.onClose==="function") win.onClose();
    }

    function closeAll(){
        [...windows].forEach(closeWindow);
    }

    function addTaskbarButton(win){
        const btn=document.createElement("div");
        btn.className="tb-item";

        const label=document.createElement("span");
        label.textContent=win.title;
        btn.appendChild(label);

        const x=document.createElement("button");
        x.className="tb-x";
        x.textContent="×";
        x.addEventListener("click",e=>{
            e.stopPropagation();
            closeWindow(win);
        });
        btn.appendChild(x);

        btn.addEventListener("click",()=>{
            if(win.minimized) toggleMinimize(win);
            else bringToFront(win);
        });

        taskbar.appendChild(btn);
        win.taskbarBtn=btn;
    }

    function makeDraggable(win,handle){
        let dragging=false;
        let offsetX=0;
        let offsetY=0;

        function start(clientX,clientY){
            const rect=win.getBoundingClientRect();
            dragging=true;
            offsetX=clientX-rect.left;
            offsetY=clientY-rect.top;
            bringToFront(windows.find(w=>w.el===win));
        }

        function move(clientX,clientY){
            if(!dragging) return;
            let x=clientX-offsetX;
            let y=clientY-offsetY;
            const maxX=window.innerWidth-win.offsetWidth;
            const maxY=window.innerHeight-win.offsetHeight-44;
            x=Math.max(0,Math.min(x,maxX));
            y=Math.max(0,Math.min(y,maxY));
            win.style.left=x+"px";
            win.style.top=y+"px";
        }

        function end(){ dragging=false; }

        handle.addEventListener("mousedown",e=>{
            if(e.target.closest("button")) return;
            start(e.clientX,e.clientY);
            e.preventDefault();
        });
        window.addEventListener("mousemove",e=>move(e.clientX,e.clientY));
        window.addEventListener("mouseup",end);

        handle.addEventListener("touchstart",e=>{
            if(e.target.closest("button")) return;
            const t=e.touches[0];
            start(t.clientX,t.clientY);
        },{passive:true});
        window.addEventListener("touchmove",e=>{
            if(!dragging) return;
            const t=e.touches[0];
            move(t.clientX,t.clientY);
        },{passive:true});
        window.addEventListener("touchend",end);
    }

    function makeResizable(win,handle){
        let resizing=false;
        let startW=0,startH=0,startX=0,startY=0;

        function start(clientX,clientY){
            resizing=true;
            startW=win.offsetWidth;
            startH=win.offsetHeight;
            startX=clientX;
            startY=clientY;
        }

        function move(clientX,clientY){
            if(!resizing) return;
            const w=Math.max(220,startW+(clientX-startX));
            const h=Math.max(150,startH+(clientY-startY));
            win.style.width=w+"px";
            win.style.height=h+"px";
        }

        function end(){ resizing=false; }

        handle.addEventListener("mousedown",e=>{
            start(e.clientX,e.clientY);
            e.preventDefault();
            e.stopPropagation();
        });
        window.addEventListener("mousemove",e=>move(e.clientX,e.clientY));
        window.addEventListener("mouseup",end);

        handle.addEventListener("touchstart",e=>{
            const t=e.touches[0];
            start(t.clientX,t.clientY);
            e.stopPropagation();
        },{passive:true});
        window.addEventListener("touchmove",e=>{
            if(!resizing) return;
            const t=e.touches[0];
            move(t.clientX,t.clientY);
        },{passive:true});
        window.addEventListener("touchend",end);
    }

    window.WM={
        openWindow,
        closeWindow,
        closeAll,
        list:()=>windows.slice()
    };

})();
