(function(){
    "use strict";

    if(window.__CHXD_CLOCK_SERVICE__){
        window.clockAPI=window.__CHXD_CLOCK_SERVICE__.api;
        return;
    }

    const APP_NAME="Clock";
    const PIANO_APP_NAME="piano";
    const STATE_KEY="chxd_clock_state_v5";
    const STATE_PATH="chxd:/local/Clock/state.json";
    const SNOOZE_MINUTES=5;

    const service={
        alarms:[],
        soundPath:"",
        timer:{
            running:false,
            end:0,
            remaining:0
        },
        stopwatch:{
            running:false,
            started:0,
            elapsed:0,
            laps:[]
        },
        ring:{
            active:false,
            kind:"",
            id:0,
            snoozeCount:0,
            timerId:0,
            repeatTimer:0
        },
        lastAlarmMinute:"",
        lastTimerEnd:0,
        audioContext:null,
        audioBuffer:null,
        audioSource:null,
        audioGain:null,
        initialized:false
    };

    window.__CHXD_CLOCK_SERVICE__=service;

    function getFS(){
        return window.FS||null;
    }

    function safeNumber(value,fallback=0){
        const n=Number(value);
        return Number.isFinite(n)?n:fallback;
    }

    function safeBool(value){
        return !!value;
    }

    function normalizeAlarm(value){
        const alarm=value||{};

        return{
            id:safeNumber(alarm.id,Date.now()),
            time:String(alarm.time||"00:00"),
            label:String(alarm.label||"Alarm"),
            active:alarm.active!==false,
            lastFired:String(alarm.lastFired||"")
        };
    }

    function normalizeState(value){
        const data=value||{};

        service.alarms=
            Array.isArray(data.alarms)
                ?data.alarms.map(normalizeAlarm)
                :[];

        service.soundPath=
            typeof data.soundPath==="string"
                ?data.soundPath
                :"";

        const timer=data.timer||{};

        service.timer={
            running:safeBool(timer.running),
            end:safeNumber(timer.end),
            remaining:safeNumber(timer.remaining)
        };

        const stopwatch=data.stopwatch||{};

        service.stopwatch={
            running:safeBool(stopwatch.running),
            started:safeNumber(stopwatch.started),
            elapsed:safeNumber(stopwatch.elapsed),
            laps:
                Array.isArray(stopwatch.laps)
                    ?stopwatch.laps.map(
                        lap=>({
                            id:safeNumber(
                                lap&&lap.id,
                                Date.now()
                            ),
                            total:safeNumber(
                                lap&&lap.total
                            ),
                            diff:safeNumber(
                                lap&&lap.diff
                            )
                        })
                    )
                    :[]
        };
    }

    async function loadState(){
        let loaded=false;

        try{
            const raw=
                localStorage.getItem(
                    STATE_KEY
                );

            if(raw){
                normalizeState(
                    JSON.parse(raw)
                );

                loaded=true;
            }
        }catch(_){}

        if(loaded){
            return;
        }

        try{
            const fs=getFS();

            if(
                fs&&
                typeof fs.read==="function"
            ){
                const result=
                    await fs.read(
                        STATE_PATH
                    );

                if(
                    result&&
                    result.ok
                ){
                    normalizeState(
                        JSON.parse(
                            String(
                                result.content||
                                ""
                            )
                        )
                    );
                }
            }
        }catch(_){}
    }

    async function saveState(){
        const data={
            alarms:service.alarms,
            soundPath:service.soundPath,
            timer:service.timer,
            stopwatch:service.stopwatch
        };

        try{
            localStorage.setItem(
                STATE_KEY,
                JSON.stringify(data)
            );
        }catch(_){}

        try{
            const fs=getFS();

            if(
                fs&&
                typeof fs.write==="function"
            ){
                await fs.write(
                    STATE_PATH,
                    JSON.stringify(data),
                    true
                );
            }
        }catch(_){}
    }

    function getAudioContext(){
        if(
            service.audioContext&&
            service.audioContext.state!=="closed"
        ){
            return service.audioContext;
        }

        const C=
            window.AudioContext||
            window.webkitAudioContext;

        if(!C){
            return null;
        }

        try{
            service.audioContext=
                new C();

            return service.audioContext;
        }catch(_){
            return null;
        }
    }

    function wakeAudio(){
        const ctx=
            getAudioContext();

        if(!ctx){
            return null;
        }

        if(
            ctx.state==="suspended"
        ){
            ctx.resume().catch(()=>{});
        }

        return ctx;
    }

    document.addEventListener(
        "pointerdown",
        wakeAudio,
        true
    );

    document.addEventListener(
        "touchstart",
        wakeAudio,
        true
    );

    document.addEventListener(
        "keydown",
        wakeAudio,
        true
    );

    function stopAudio(){
        if(
            service.audioSource
        ){
            try{
                service.audioSource.stop();
            }catch(_){}
        }

        if(
            service.audioGain
        ){
            try{
                service.audioGain.disconnect();
            }catch(_){}
        }

        service.audioSource=null;
        service.audioGain=null;
    }

    function playOscillator(){
        const ctx=
            wakeAudio();

        if(!ctx){
            return false;
        }

        stopAudio();

        const start=
            ctx.currentTime;

        const notes=[
            [880,0],
            [988,.28],
            [880,.56],
            [660,.84],
            [880,1.12],
            [988,1.40],
            [880,1.68],
            [660,1.96]
        ];

        const output=
            ctx.createGain();

        output.gain.value=.95;

        output.connect(
            ctx.destination
        );

        for(
            const [frequency,offset]
            of notes
        ){
            const osc=
                ctx.createOscillator();

            const gain=
                ctx.createGain();

            const t=
                start+offset;

            osc.type=
                "sine";

            osc.frequency.setValueAtTime(
                frequency,
                t
            );

            gain.gain.setValueAtTime(
                .0001,
                t
            );

            gain.gain.exponentialRampToValueAtTime(
                .32,
                t+.018
            );

            gain.gain.exponentialRampToValueAtTime(
                .0001,
                t+.23
            );

            osc.connect(gain);
            gain.connect(output);

            osc.start(t);
            osc.stop(t+.25);
        }

        service.audioSource={
            stop:()=>{}
        };

        return true;
    }

    async function loadCustomAudio(path){
        if(
            service.audioBuffer&&
            service.soundPath===path
        ){
            return service.audioBuffer;
        }

        const fs=
            getFS();

        if(
            !fs||
            typeof fs.readBinary!=="function"
        ){
            return null;
        }

        const result=
            await fs.readBinary(path);

        if(
            !result||
            !result.ok||
            !result.data
        ){
            return null;
        }

        let raw=result.data;

        if(raw instanceof Blob){
            raw=
                await raw.arrayBuffer();
        }

        if(
            ArrayBuffer.isView(raw)
        ){
            raw=
                raw.buffer.slice(
                    raw.byteOffset,
                    raw.byteOffset+
                    raw.byteLength
                );
        }

        if(
            !(raw instanceof ArrayBuffer)
        ){
            return null;
        }

        const ctx=
            wakeAudio();

        if(!ctx){
            return null;
        }

        const decoded=
            await ctx.decodeAudioData(
                raw.slice(0)
            );

        service.audioBuffer=
            decoded;

        service.soundPath=
            path;

        return decoded;
    }

    async function startLoopedCustomAudio(path){
        const ctx=
            wakeAudio();

        if(!ctx){
            return false;
        }

        try{
            const buffer=
                await loadCustomAudio(
                    path
                );

            if(!buffer){
                return false;
            }

            stopAudio();

            const source=
                ctx.createBufferSource();

            const gain=
                ctx.createGain();

            source.buffer=
                buffer;

            source.loop=true;

            gain.gain.value=
                .95;

            source.connect(gain);
            gain.connect(ctx.destination);

            source.start();

            service.audioSource=
                source;

            service.audioGain=
                gain;

            return true;
        }catch(_){
            return false;
        }
    }

    function extension(path){
        const clean=
            String(path||"")
                .split("?")[0]
                .split("#")[0];

        const file=
            clean
                .split("/")
                .pop()||
            "";

        const dot=
            file.lastIndexOf(".");

        if(dot<0){
            return "";
        }

        return file
            .slice(dot+1)
            .toLowerCase();
    }

    function isPKP(path){
        return extension(path)==="pkp";
    }

    async function readText(path){
        const fs=
            getFS();

        if(
            !fs||
            typeof fs.read!=="function"
        ){
            return null;
        }

        try{
            const result=
                await fs.read(path);

            if(
                !result||
                !result.ok
            ){
                return null;
            }

            return String(
                result.content||
                ""
            );
        }catch(_){
            return null;
        }
    }

    async function playPKPInPiano(path){
        const value=
            await readText(path);

        if(
            !value||
            !value.trim()
        ){
            return false;
        }

        stopRing();

        let opened=null;

        try{
            opened=
                await window.Apps.openApp(
                    PIANO_APP_NAME,
                    {
                        allowMultiple:false
                    }
                );
        }catch(_){
            opened=null;
        }

        const sendToWindow=
            win=>{
                if(
                    !win
                ){
                    return false;
                }

                const iframe=
                    win.el&&
                    win.el.querySelector
                        ?win.el.querySelector(
                            "iframe"
                        )
                        :null;

                if(
                    iframe&&
                    iframe.contentWindow
                ){
                    try{
                        iframe.contentWindow.postMessage(
                            {
                                type:"pkp",
                                value:value.trim()
                            },
                            "*"
                        );

                        return true;
                    }catch(_){}
                }

                try{
                    win.postMessage?.(
                        {
                            type:"pkp",
                            value:value.trim()
                        },
                        "*"
                    );

                    return true;
                }catch(_){}

                return false;
            };

        if(
            opened&&
            opened.win
        ){
            if(
                sendToWindow(
                    opened.win
                )
            ){
                return true;
            }
        }

        if(
            opened&&
            sendToWindow(opened)
        ){
            return true;
        }

        let attempts=0;

        const retry=
            ()=>{
                attempts++;

                try{
                    if(
                        window.Apps&&
                        typeof window.Apps.openApp==="function"
                    ){
                        window.Apps.openApp(
                            PIANO_APP_NAME,
                            {
                                allowMultiple:false
                            }
                        ).then(
                            result=>{
                                sendToWindow(
                                    result&&
                                    result.win
                                        ?result.win
                                        :result
                                );
                            }
                        ).catch(()=>{});
                    }
                }catch(_){}

                if(
                    attempts<12
                ){
                    setTimeout(
                        retry,
                        300
                    );
                }
            };

        retry();

        return true;
    }

    function stopRing(){
        if(
            service.ring.timerId
        ){
            clearTimeout(
                service.ring.timerId
            );
        }

        if(
            service.ring.repeatTimer
        ){
            clearTimeout(
                service.ring.repeatTimer
            );
        }

        service.ring.timerId=0;
        service.ring.repeatTimer=0;
        service.ring.active=false;
        service.ring.kind="";
        service.ring.id=0;

        stopAudio();
    }

    async function startNormalRing(){
        service.ring.active=true;

        if(
            service.soundPath
        ){
            const ok=
                await startLoopedCustomAudio(
                    service.soundPath
                );

            if(ok){
                return;
            }
        }

        playOscillator();

        const repeat=
            ()=>{
                if(
                    !service.ring.active
                ){
                    return;
                }

                playOscillator();

                service.ring.repeatTimer=
                    setTimeout(
                        repeat,
                        2500
                    );
            };

        service.ring.repeatTimer=
            setTimeout(
                repeat,
                2500
            );
    }

    function postToClock(message){
        try{
            window.postMessage(
                message,
                "*"
            );
        }catch(_){}

        try{
            for(
                const frame of Array.from(
                    window.frames
                )
            ){
                frame.postMessage(
                    message,
                    "*"
                );
            }
        }catch(_){}
    }

    function sendState(source){
        if(
            !source||
            typeof source.postMessage!=="function"
        ){
            return;
        }

        try{
            source.postMessage(
                {
                    type:"chxd-clock-state",
                    state:getPublicState()
                },
                "*"
            );
        }catch(_){}
    }

    function getPublicState(){
        return{
            alarms:
                service.alarms.map(
                    alarm=>({
                        id:alarm.id,
                        time:alarm.time,
                        label:alarm.label,
                        active:alarm.active,
                        lastFired:alarm.lastFired
                    })
                ),
            soundPath:
                service.soundPath,

            timer:{
                running:
                    service.timer.running,
                end:
                    service.timer.end,
                remaining:
                    service.timer.running
                        ?Math.max(
                            0,
                            service.timer.end-
                            Date.now()
                        )
                        :service.timer.remaining
            },

            stopwatch:{
                running:
                    service.stopwatch.running,

                started:
                    service.stopwatch.started,

                elapsed:
                    service.stopwatch.running
                        ?safeNumber(
                            service.stopwatch.elapsed
                        )+
                        Math.max(
                            0,
                            Date.now()-
                            safeNumber(
                                service.stopwatch.started
                            )
                        )
                        :safeNumber(
                            service.stopwatch.elapsed
                        ),

                laps:
                    service.stopwatch.laps
                        .map(
                            lap=>({
                                id:lap.id,
                                total:safeNumber(
                                    lap.total
                                ),
                                diff:safeNumber(
                                    lap.diff
                                )
                            })
                        )
            },

            ring:{
                active:
                    service.ring.active,
                kind:
                    service.ring.kind,
                id:
                    service.ring.id
            }
        };
    }

    function openClock(){
        try{
            if(
                window.Apps&&
                typeof window.Apps.openApp==="function"
            ){
                window.Apps.openApp(
                    APP_NAME,
                    {
                        allowMultiple:false
                    }
                ).catch?.(()=>{});
            }
        }catch(_){}

        try{
            window.dispatchEvent(
                new CustomEvent(
                    "chxd-clock-open"
                )
            );
        }catch(_){}
    }

    function triggerRingModal(kind,id,label){
        openClock();

        postToClock({
            type:
                "chxd-clock-ring",
            ring:{
                kind,
                id,
                label:
                    label||
                    (
                        kind==="timer"
                            ?"Timer Complete"
                            :"Alarm"
                    )
            }
        });
    }

    async function triggerAlarm(alarm){
        const today=
            [
                new Date().getFullYear(),
                String(
                    new Date().getMonth()+1
                ).padStart(2,"0"),
                String(
                    new Date().getDate()
                ).padStart(2,"0")
            ].join("-");

        if(
            alarm.lastFired===today
        ){
            return;
        }

        alarm.lastFired=
            today;

        await saveState();

        service.ring.active=true;
        service.ring.kind="alarm";
        service.ring.id=alarm.id;

        if(
            isPKP(service.soundPath)
        ){
            await playPKPInPiano(
                service.soundPath
            );
            notify();
            return;
        }

        await startNormalRing();

        triggerRingModal(
            "alarm",
            alarm.id,
            alarm.label
        );

        notify();
    }

    async function triggerTimer(){
        if(
            service.lastTimerEnd===
            service.timer.end
        ){
            return;
        }

        service.lastTimerEnd=
            service.timer.end;

        service.timer.running=false;
        service.timer.remaining=0;

        await saveState();

        service.ring.active=true;
        service.ring.kind="timer";
        service.ring.id=
            service.timer.end;

        if(
            isPKP(service.soundPath)
        ){
            await playPKPInPiano(
                service.soundPath
            );
            notify();
            return;
        }

        await startNormalRing();

        triggerRingModal(
            "timer",
            service.timer.end,
            "Timer Complete"
        );

        notify();
    }

    function checkAlarms(){
        const now=
            new Date();

        const current=
            String(
                now.getHours()
            ).padStart(2,"0")+
            ":"+
            String(
                now.getMinutes()
            ).padStart(2,"0");

        if(
            current===
            service.lastAlarmMinute
        ){
            return;
        }

        service.lastAlarmMinute=
            current;

        const today=
            [
                now.getFullYear(),
                String(
                    now.getMonth()+1
                ).padStart(2,"0"),
                String(
                    now.getDate()
                ).padStart(2,"0")
            ].join("-");

        for(
            const alarm of service.alarms
        ){
            if(
                !alarm.active||
                alarm.time!==current
            ){
                continue;
            }

            triggerAlarm(
                alarm
            );
        }

        for(
            const alarm of service.alarms
        ){
            if(
                !alarm.lastFired
            ){
                continue;
            }

            if(
                alarm.lastFired!==today
            ){
                alarm.lastFired="";
            }
        }

        saveState();
    }

    function checkTimer(){
        if(
            !service.timer.running
        ){
            return;
        }

        if(
            service.timer.end<=
            Date.now()
        ){
            triggerTimer();
        }
    }

    function timerState(){
        return{
            running:
                service.timer.running,
            end:
                service.timer.end,
            remaining:
                service.timer.running
                    ?Math.max(
                        0,
                        service.timer.end-
                        Date.now()
                    )
                    :service.timer.remaining
        };
    }

    async function setTimer(args){
        args=args||{};

        let duration=
            safeNumber(
                args.duration
            );

        if(
            duration<=0
        ){
            duration=
                safeNumber(
                    args.ms
                );
        }

        if(
            duration<=0
        ){
            duration=
                safeNumber(args.hours)*3600000+
                safeNumber(args.minutes)*60000+
                safeNumber(args.seconds)*1000;
        }

        if(
            duration<=0
        ){
            return{
                ok:false,
                error:
                    "Timer duration must be greater than zero."
            };
        }

        stopRing();

        service.timer.running=true;
        service.timer.end=
            Date.now()+
            duration;
        service.timer.remaining=
            duration;

        service.lastTimerEnd=0;

        await saveState();
        openClock();
        notify();

        return{
            ok:true,
            state:getPublicState()
        };
    }

    async function pauseTimer(){
        if(
            service.timer.running
        ){
            service.timer.remaining=
                Math.max(
                    0,
                    service.timer.end-
                    Date.now()
                );

            service.timer.running=false;

            await saveState();
            notify();
        }

        return{
            ok:true,
            state:getPublicState()
        };
    }

    async function resumeTimer(){
        if(
            service.timer.running
        ){
            return{
                ok:true,
                state:getPublicState()
            };
        }

        if(
            service.timer.remaining<=0
        ){
            return{
                ok:false,
                error:
                    "No paused timer exists."
            };
        }

        service.timer.end=
            Date.now()+
            service.timer.remaining;

        service.timer.running=true;

        service.lastTimerEnd=0;

        await saveState();
        notify();

        return{
            ok:true,
            state:getPublicState()
        };
    }

    async function resetTimer(){
        service.timer.running=false;
        service.timer.end=0;
        service.timer.remaining=0;
        service.lastTimerEnd=0;

        stopRing();

        await saveState();
        notify();

        return{
            ok:true,
            state:getPublicState()
        };
    }

    async function setSound(args){
        args=args||{};

        const path=
            String(
                args.path||
                args.soundPath||
                ""
            ).trim();

        if(path){
            const fs=getFS();

            if(
                !fs||
                typeof fs.stat!=="function"
            ){
                return{
                    ok:false,
                    error:
                        "Filesystem unavailable."
                };
            }

            const result=
                await fs.stat(path);

            if(
                !result||
                !result.ok||
                result.kind!=="file"
            ){
                return{
                    ok:false,
                    error:
                        "Sound file not found."
                };
            }
        }

        service.soundPath=
            path;

        service.audioBuffer=null;

        await saveState();
        notify();

        return{
            ok:true,
            soundPath:path,
            state:getPublicState()
        };
    }

    async function selectSound(){
        try{
            const result=
                await window.Apps.openApp(
                    "File Manager",
                    {
                        selectMode:true,
                        allowMultiple:false,
                        title:"SELECT CLOCK SOUND"
                    }
                );

            return{
                ok:!!(
                    result&&
                    result.ok
                ),
                waiting:true
            };
        }catch(error){
            return{
                ok:false,
                error:
                    error&&
                    error.message
                        ?error.message
                        :"Could not open File Manager."
            };
        }
    }

    async function testSound(){
        if(
            isPKP(service.soundPath)
        ){
            await playPKPInPiano(
                service.soundPath
            );

            return{
                ok:true,
                type:"pkp"
            };
        }

        await startNormalRing();

        setTimeout(
            ()=>{
                stopRing();
            },
            6000
        );

        return{
            ok:true,
            type:
                service.soundPath
                    ?"audio"
                    :"oscillator"
        };
    }

    async function addAlarm(args){
        args=args||{};

        const time=
            String(
                args.time||
                ""
            );

        if(
            !/^\d{2}:\d{2}$/.test(
                time
            )
        ){
            return{
                ok:false,
                error:
                    "Alarm time must be HH:MM."
            };
        }

        const parts=
            time.split(":").map(Number);

        if(
            parts[0]>23||
            parts[1]>59
        ){
            return{
                ok:false,
                error:
                    "Invalid alarm time."
            };
        }

        const alarm={
            id:
                safeNumber(
                    args.id,
                    Date.now()
                ),
            time,
            label:
                String(
                    args.label||
                    "Alarm"
                ),
            active:
                args.active!==false,
            lastFired:""
        };

        service.alarms.push(
            alarm
        );

        await saveState();
        notify();

        return{
            ok:true,
            alarm,
            state:getPublicState()
        };
    }

    async function updateAlarm(args){
        args=args||{};

        const id=
            safeNumber(args.id);

        const alarm=
            service.alarms.find(
                item=>item.id===id
            );

        if(!alarm){
            return{
                ok:false,
                error:
                    "Alarm not found."
            };
        }

        if(
            args.time!=null
        ){
            const time=
                String(args.time);

            if(
                !/^\d{2}:\d{2}$/.test(
                    time
                )
            ){
                return{
                    ok:false,
                    error:
                        "Invalid alarm time."
                };
            }

            alarm.time=time;
            alarm.lastFired="";
        }

        if(
            args.label!=null
        ){
            alarm.label=
                String(
                    args.label
                );
        }

        if(
            args.active!=null
        ){
            alarm.active=
                !!args.active;

            if(
                alarm.active
            ){
                alarm.lastFired="";
            }
        }

        await saveState();
        notify();

        return{
            ok:true,
            alarm,
            state:getPublicState()
        };
    }

    async function deleteAlarm(args){
        args=args||{};

        const id=
            safeNumber(args.id);

        const length=
            service.alarms.length;

        service.alarms=
            service.alarms.filter(
                alarm=>alarm.id!==id
            );

        if(
            length===
            service.alarms.length
        ){
            return{
                ok:false,
                error:
                    "Alarm not found."
            };
        }

        if(
            service.ring.id===id&&
            service.ring.kind==="alarm"
        ){
            stopRing();
        }

        await saveState();
        notify();

        return{
            ok:true,
            state:getPublicState()
        };
    }

    async function clearAlarms(){
        service.alarms=[];
        stopRing();

        await saveState();
        notify();

        return{
            ok:true,
            state:getPublicState()
        };
    }

    async function startStopwatch(){
        if(
            service.stopwatch.running
        ){
            return{
                ok:true,
                state:getPublicState()
            };
        }

        service.stopwatch.running=true;
        service.stopwatch.started=
            Date.now();

        await saveState();
        openClock();
        notify();

        return{
            ok:true,
            state:getPublicState()
        };
    }

    async function pauseStopwatch(){
        if(
            service.stopwatch.running
        ){
            service.stopwatch.elapsed=
                safeNumber(
                    service.stopwatch.elapsed
                )+
                Math.max(
                    0,
                    Date.now()-
                    safeNumber(
                        service.stopwatch.started
                    )
                );

            service.stopwatch.running=false;
            service.stopwatch.started=0;

            await saveState();
            notify();
        }

        return{
            ok:true,
            state:getPublicState()
        };
    }

    async function resetStopwatch(){
        service.stopwatch.running=false;
        service.stopwatch.started=0;
        service.stopwatch.elapsed=0;
        service.stopwatch.laps=[];

        await saveState();
        notify();

        return{
            ok:true,
            state:getPublicState()
        };
    }

    async function lapStopwatch(){
        const total=
            service.stopwatch.running
                ?safeNumber(
                    service.stopwatch.elapsed
                )+
                Math.max(
                    0,
                    Date.now()-
                    safeNumber(
                        service.stopwatch.started
                    )
                )
                :safeNumber(
                    service.stopwatch.elapsed
                );

        const previous=
            service.stopwatch.laps.length
                ?safeNumber(
                    service.stopwatch.laps[
                        service.stopwatch.laps.length-1
                    ].total
                )
                :0;

        const lap={
            id:Date.now(),
            total,
            diff:
                total-
                previous
        };

        service.stopwatch.laps.push(
            lap
        );

        await saveState();
        notify();

        return{
            ok:true,
            lap,
            state:getPublicState()
        };
    }

    async function snooze(){
        if(
            !service.ring.active
        ){
            return{
                ok:false,
                error:
                    "No active alarm."
            };
        }

        const kind=
            service.ring.kind;

        const id=
            service.ring.id;

        stopRing();

        if(
            kind==="alarm"
        ){
            const alarm=
                service.alarms.find(
                    item=>item.id===id
                );

            if(alarm){
                alarm.lastFired="";
            }

            await saveState();

            const timeout=
                setTimeout(
                    ()=>{
                        const alarmAgain=
                            service.alarms.find(
                                item=>
                                    item.id===
                                    id
                            );

                        if(
                            alarmAgain&&
                            alarmAgain.active
                        ){
                            triggerAlarm(
                                alarmAgain
                            );
                        }
                    },
                    SNOOZE_MINUTES*
                    60000
                );

            service.ring.timerId=
                timeout;
        }else{
            service.timer.running=false;
            service.timer.remaining=0;
            service.timer.end=0;

            await saveState();

            const timeout=
                setTimeout(
                    ()=>{
                        triggerTimer();
                    },
                    SNOOZE_MINUTES*
                    60000
                );

            service.ring.timerId=
                timeout;
        }

        postToClock({
            type:
                "chxd-clock-ring-stopped"
        });

        notify();

        return{
            ok:true,
            snoozeMinutes:
                SNOOZE_MINUTES,
            state:getPublicState()
        };
    }

    async function dismiss(){
        stopRing();

        postToClock({
            type:
                "chxd-clock-ring-stopped"
        });

        notify();

        return{
            ok:true,
            state:getPublicState()
        };
    }

    function notify(){
        postToClock({
            type:
                "chxd-clock-state",
            state:
                getPublicState()
        });
    }

    async function runAction(
        name,
        args
    ){
        const actionMap={
            getState:
                async()=>({
                    ok:true,
                    state:
                        getPublicState()
                }),
            open:
                async()=>{
                    openClock();

                    return{
                        ok:true
                    };
                },
            setSound,
            selectSound,
            testSound,
            addAlarm,
            setAlarm:addAlarm,
            updateAlarm,
            deleteAlarm,
            removeAlarm:deleteAlarm,
            clearAlarms,
            setTimer,
            pauseTimer,
            resumeTimer,
            resetTimer,
            startStopwatch,
            pauseStopwatch,
            resetStopwatch,
            lapStopwatch,
            snooze,
            dismiss
        };

        const fn=
            actionMap[name];

        if(
            typeof fn!=="function"
        ){
            return{
                ok:false,
                error:
                    "Unknown Clock action: "+
                    name
            };
        }

        try{
            return await fn(
                args||{}
            );
        }catch(error){
            return{
                ok:false,
                error:
                    error&&
                    error.message
                        ?error.message
                        :String(error)
            };
        }
    }

    service.api={

        action:async(batch)=>{
            if(
                !batch||
                typeof batch!=="object"||
                Array.isArray(batch)
            ){
                return{
                    ok:false,
                    error:
                        "clockAPI.action() requires an object."
                };
            }

            const entries=
                Object.entries(batch);

            const results={};
            let allOk=true;

            for(
                const [
                    name,
                    args
                ]
                of entries
            ){
                const result=
                    await runAction(
                        name,
                        args
                    );

                results[name]=result;

                if(
                    !result||
                    result.ok===false
                ){
                    allOk=false;
                }
            }

            return{
                ok:allOk,
                results,
                state:
                    getPublicState()
            };
        },

        getState:
            ()=>runAction(
                "getState",
                {}
            ),

        open:
            ()=>runAction(
                "open",
                {}
            ),

        setSound:
            args=>runAction(
                "setSound",
                args
            ),

        selectSound:
            ()=>runAction(
                "selectSound",
                {}
            ),

        testSound:
            ()=>runAction(
                "testSound",
                {}
            ),

        addAlarm:
            args=>runAction(
                "addAlarm",
                args
            ),

        setAlarm:
            args=>runAction(
                "setAlarm",
                args
            ),

        updateAlarm:
            args=>runAction(
                "updateAlarm",
                args
            ),

        deleteAlarm:
            args=>runAction(
                "deleteAlarm",
                args
            ),

        removeAlarm:
            args=>runAction(
                "removeAlarm",
                args
            ),

        clearAlarms:
            ()=>runAction(
                "clearAlarms",
                {}
            ),

        setTimer:
            args=>runAction(
                "setTimer",
                args
            ),

        pauseTimer:
            ()=>runAction(
                "pauseTimer",
                {}
            ),

        resumeTimer:
            ()=>runAction(
                "resumeTimer",
                {}
            ),

        resetTimer:
            ()=>runAction(
                "resetTimer",
                {}
            ),

        startStopwatch:
            ()=>runAction(
                "startStopwatch",
                {}
            ),

        pauseStopwatch:
            ()=>runAction(
                "pauseStopwatch",
                {}
            ),

        resetStopwatch:
            ()=>runAction(
                "resetStopwatch",
                {}
            ),

        lapStopwatch:
            ()=>runAction(
                "lapStopwatch",
                {}
            ),

        snooze:
            ()=>runAction(
                "snooze",
                {}
            ),

        dismiss:
            ()=>runAction(
                "dismiss",
                {}
            )
    };

    window.clockAPI=
        service.api;

    window.addEventListener(
        "message",
        async event=>{
            const data=
                event.data;

            if(
                !data||
                typeof data!=="object"
            ){
                return;
            }

            if(
                data.type===
                "LH_FILE_SELECTED"
            ){
                const path=
                    data.path||
                    (
                        Array.isArray(
                            data.paths
                        )
                            ?data.paths[0]
                            :""
                    );

                if(
                    typeof path==="string"&&
                    path
                ){
                    await setSound({
                        path
                    });

                    notify();
                }

                return;
            }

            if(
                data.type===
                "chxd-clock-ready"
            ){
                sendState(
                    event.source
                );

                return;
            }

            if(
                data.type===
                "chxd-clock-action"
            ){
                const result=
                    await service.api.action(
                        data.action||{}
                    );

                try{
                    event.source?.postMessage(
                        {
                            type:
                                "chxd-clock-action-result",
                            result
                        },
                        "*"
                    );
                }catch(_){}

                return;
            }

            if(
                data.type===
                "chxd-clock-snooze"
            ){
                await snooze();
                return;
            }

            if(
                data.type===
                "chxd-clock-dismiss"
            ){
                await dismiss();
                return;
            }

            if(
                data.type===
                "chxd-clock-test-sound"
            ){
                await testSound();
                return;
            }
        }
    );

    async function initialize(){
        if(
            service.initialized
        ){
            return;
        }

        service.initialized=true;

        await loadState();

        if(
            service.timer.running&&
            service.timer.end<=Date.now()
        ){
            triggerTimer();
        }

        setInterval(
            ()=>{
                checkAlarms();
                checkTimer();
            },
            250
        );

        setInterval(
            ()=>{
                saveState();
            },
            5000
        );

        notify();
    }

    initialize();
})();
