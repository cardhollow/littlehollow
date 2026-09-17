(function(){
    "use strict";

    if(window.__CHXD_CLOCK_WAKE_SERVICE__){
        return;
    }

    const STATE_KEY="chxd_clock_state_v5";
    const APP_NAME="Clock";
    const service={
        lastWakeKey:"",
        opening:false,
        timer:0
    };

    window.__CHXD_CLOCK_WAKE_SERVICE__=service;

    function readState(){
        try{
            const raw=localStorage.getItem(STATE_KEY);
            if(!raw){
                return null;
            }
            const value=JSON.parse(raw);
            return value&&typeof value==="object"?value:null;
        }catch(_){
            return null;
        }
    }

    function now(){
        return new Date();
    }

    function dateKey(date){
        return [
            date.getFullYear(),
            String(date.getMonth()+1).padStart(2,"0"),
            String(date.getDate()).padStart(2,"0")
        ].join("-");
    }

    function wakeKey(kind,value){
        return kind+":"+String(value);
    }

    function openClock(key){
        if(service.opening&&service.lastWakeKey===key){
            return;
        }

        if(service.lastWakeKey===key){
            return;
        }

        service.lastWakeKey=key;
        service.opening=true;

        try{
            if(window.Apps&&typeof window.Apps.openApp==="function"){
                const result=window.Apps.openApp(APP_NAME,{allowMultiple:false});
                if(result&&typeof result.catch==="function"){
                    result.catch(()=>{});
                }
            }
        }catch(_){
        }

        try{
            window.dispatchEvent(new CustomEvent("chxd-clock-open"));
        }catch(_){
        }

        setTimeout(()=>{
            service.opening=false;
        },1000);
    }

    function check(){
        const state=readState();
        if(!state){
            return;
        }

        const current=now();
        const currentHHMM=
            String(current.getHours()).padStart(2,"0")+
            ":"+
            String(current.getMinutes()).padStart(2,"0");
        const today=dateKey(current);

        if(Array.isArray(state.alarms)){
            for(const alarm of state.alarms){
                if(!alarm||alarm.active===false){
                    continue;
                }

                if(String(alarm.lastFired||"")===today){
                    continue;
                }

                if(String(alarm.time||"")===currentHHMM){
                    openClock(wakeKey("alarm",String(alarm.id)+":"+today));
                    return;
                }
            }
        }

        const timer=state.timer||{};
        if(timer.running&&Number(timer.end)>0&&Number(timer.end)<=Date.now()){
            openClock(wakeKey("timer",Number(timer.end)));
            return;
        }

        const ring=state.ring||{};
        if(ring.active){
            openClock(wakeKey("ring",String(ring.kind||"")+":"+String(ring.id||0)));
            return;
        }

        if(Number(ring.snoozeUntil)>0&&Number(ring.snoozeUntil)<=Date.now()){
            openClock(wakeKey("snooze",Number(ring.snoozeUntil)));
        }
    }

    window.addEventListener("storage",event=>{
        if(event.key===STATE_KEY){
            check();
        }
    });

    window.addEventListener("message",event=>{
        const data=event.data;
        if(!data||typeof data!=="object"){
            return;
        }
        if(data.type==="chxd-clock-state-changed"||data.type==="chxd-clock-ready"){
            check();
        }
    });

    check();
    service.timer=setInterval(check,250);
})();
