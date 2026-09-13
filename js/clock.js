(function(){
    "use strict";

    if(window.clockAPI && window.__CHXD_CLOCK_SERVICE__){
        return;
    }

    const APP_NAME="Clock";
    const STATE_PATH="chxd:/local/Clock/state.json";
    const AUDIO_CONTEXT_KEY="__CHXD_CLOCK_AUDIO_CONTEXT__";

    const state={
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
        lastAlarmMinute:"",
        lastTimerEnd:0,
        audioContext:null
    };

    window.__CHXD_CLOCK_SERVICE__=state;

    function getFS(){
        return window.FS||null;
    }

    async function loadState(){
        let loaded=false;

        try{
            const raw=localStorage.getItem("chxd_clock_state");

            if(raw){
                const data=JSON.parse(raw);

                if(Array.isArray(data.alarms)){
                    state.alarms=data.alarms;
                }

                state.soundPath=
                    typeof data.soundPath==="string"
                        ?data.soundPath
                        :"";

                if(data.timer){
                    state.timer={
                        running:!!data.timer.running,
                        end:Number(data.timer.end)||0,
                        remaining:Number(data.timer.remaining)||0
                    };
                }

                if(data.stopwatch){
                    state.stopwatch={
                        running:!!data.stopwatch.running,
                        started:Number(data.stopwatch.started)||0,
                        elapsed:Number(data.stopwatch.elapsed)||0,
                        laps:Array.isArray(data.stopwatch.laps)
                            ?data.stopwatch.laps
                            :[]
                    };
                }

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
                    await fs.read(STATE_PATH);

                if(result&&result.ok){
                    const data=
                        JSON.parse(
                            String(result.content||"")
                        );

                    if(Array.isArray(data.alarms)){
                        state.alarms=data.alarms;
                    }

                    state.soundPath=
                        typeof data.soundPath==="string"
                            ?data.soundPath
                            :"";

                    if(data.timer){
                        state.timer={
                            running:!!data.timer.running,
                            end:Number(data.timer.end)||0,
                            remaining:Number(data.timer.remaining)||0
                        };
                    }

                    if(data.stopwatch){
                        state.stopwatch={
                            running:!!data.stopwatch.running,
                            started:Number(data.stopwatch.started)||0,
                            elapsed:Number(data.stopwatch.elapsed)||0,
                            laps:Array.isArray(data.stopwatch.laps)
                                ?data.stopwatch.laps
                                :[]
                        };
                    }
                }
            }
        }catch(_){}
    }

    async function saveState(){
        const data={
            alarms:state.alarms,
            soundPath:state.soundPath,
            timer:state.timer,
            stopwatch:state.stopwatch
        };

        try{
            localStorage.setItem(
                "chxd_clock_state",
                JSON.stringify(data)
            );
        }catch(_){}

        try{
            const fs=getFS();

            if(
                fs&&
                typeof fs.write==="function"
            ){
                await fs.mkdir?.(
                    "chxd:/local/Clock/",
                    {overwrite:true}
                ).catch?.(()=>{});

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
            state.audioContext&&
            state.audioContext.state!=="closed"
        ){
            return state.audioContext;
        }

        const AudioContextClass=
            window[AUDIO_CONTEXT_KEY]||
            window.AudioContext||
            window.webkitAudioContext;

        if(!AudioContextClass){
            return null;
        }

        try{
            state.audioContext=
                new AudioContextClass();

            return state.audioContext;
        }catch(_){
            return null;
        }
    }

    function wakeAudio(){
        const ctx=getAudioContext();

        if(!ctx){
            return null;
        }

        if(ctx.state==="suspended"){
            ctx.resume().catch(()=>{});
        }

        return ctx;
    }

    function playOscillator(){
        const ctx=wakeAudio();

        if(!ctx){
            return false;
        }

        const now=ctx.currentTime;

        const frequencies=[
            880,
            988,
            880,
            660
        ];

        frequencies.forEach(
            (frequency,index)=>{
                const start=
                    now+
                    index*
                    0.32;

                const osc=
                    ctx.createOscillator();

                const gain=
                    ctx.createGain();

                osc.type=
                    index===3
                        ?"square"
                        :"sine";

                osc.frequency.setValueAtTime(
                    frequency,
                    start
                );

                osc.frequency.setValueAtTime(
                    frequency*0.95,
                    start+0.18
                );

                gain.gain.setValueAtTime(
                    0.0001,
                    start
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.32,
                    start+0.02
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    start+0.24
                );

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(start);
                osc.stop(start+0.26);
            }
        );

        return true;
    }

    async function playCustom(path){
        if(!path){
            return playOscillator();
        }

        try{
            const fs=getFS();

            if(
                !fs||
                typeof fs.readBinary!=="function"
            ){
                return playOscillator();
            }

            const result=
                await fs.readBinary(path);

            if(!result||!result.ok){
                return playOscillator();
            }

            const data=result.data;

            let arrayBuffer;

            if(data instanceof Blob){
                arrayBuffer=
                    await data.arrayBuffer();
            }else if(
                data instanceof ArrayBuffer
            ){
                arrayBuffer=data;
            }else if(
                ArrayBuffer.isView(data)
            ){
                arrayBuffer=
                    data.buffer.slice(
                        data.byteOffset,
                        data.byteOffset+
                        data.byteLength
                    );
            }else{
                return playOscillator();
            }

            const ctx=wakeAudio();

            if(!ctx){
                return playOscillator();
            }

            const decoded=
                await ctx.decodeAudioData(
                    arrayBuffer.slice(0)
                );

            const source=
                ctx.createBufferSource();

            const gain=
                ctx.createGain();

            source.buffer=decoded;
            gain.gain.value=1;

            source.connect(gain);
            gain.connect(ctx.destination);

            source.start();

            return true;
        }catch(_){
            return playOscillator();
        }
    }

    async function playSound(){
        if(state.soundPath){
            return playCustom(
                state.soundPath
            );
        }

        return playOscillator();
    }

    function openClock(){
        try{
            if(
                window.Apps&&
                typeof window.Apps.openApp==="function"
            ){
                const result=
                    window.Apps.openApp(
                        APP_NAME,
                        {
                            allowMultiple:false
                        }
                    );

                if(
                    result&&
                    typeof result.catch==="function"
                ){
                    result.catch(()=>{});
                }
            }
        }catch(_){}

        try{
            window.dispatchEvent(
                new CustomEvent(
                    "chxd-clock-open",
                    {
                        detail:{
                            app:APP_NAME
                        }
                    }
                )
            );
        }catch(_){}
    }

    function notify(){
        const message={
            type:"chxd-clock-state",
            state:getPublicState()
        };

        try{
            window.postMessage(
                message,
                "*"
            );
        }catch(_){}

        try{
            for(
                const frame of Array.from(window.frames)
            ){
                frame.postMessage(
                    message,
                    "*"
                );
            }
        }catch(_){}
    }

    function getPublicState(){
        return{
            alarms:state.alarms.map(
                alarm=>({
                    id:alarm.id,
                    time:alarm.time,
                    label:alarm.label,
                    active:alarm.active
                })
            ),
            soundPath:state.soundPath,
            timer:{
                running:state.timer.running,
                end:state.timer.end,
                remaining:
                    state.timer.running
                        ?Math.max(
                            0,
                            state.timer.end-
                            Date.now()
                        )
                        :state.timer.remaining
            },
            stopwatch:{
                running:state.stopwatch.running,
                elapsed:
                    state.stopwatch.running
                        ?state.stopwatch.elapsed+
                         (
                            Date.now()-
                            state.stopwatch.started
                         )
                        :state.stopwatch.elapsed,
                laps:state.stopwatch.laps.slice()
            }
        };
    }

    function alarmTodayKey(){
        const now=new Date();

        return[
            now.getFullYear(),
            String(
                now.getMonth()+1
            ).padStart(2,"0"),
            String(
                now.getDate()
            ).padStart(2,"0")
        ].join("-");
    }

    function currentAlarmTime(){
        const now=new Date();

        return[
            String(
                now.getHours()
            ).padStart(2,"0"),
            String(
                now.getMinutes()
            ).padStart(2,"0")
        ].join(":");
    }

    async function fireAlarm(
        alarm
    ){
        const key=
            alarmTodayKey();

        if(
            alarm.lastFired===key
        ){
            return;
        }

        alarm.lastFired=key;

        await saveState();

        openClock();

        await playSound();

        setTimeout(
            ()=>{
                playSound();
            },
            1200
        );

        setTimeout(
            ()=>{
                playSound();
            },
            2400
        );

        notify();
    }

    async function fireTimer(){
        if(
            state.lastTimerEnd===
            state.timer.end
        ){
            return;
        }

        state.lastTimerEnd=
            state.timer.end;

        state.timer.running=false;
        state.timer.remaining=0;

        await saveState();

        openClock();

        await playSound();

        setTimeout(
            ()=>{
                playSound();
            },
            1200
        );

        setTimeout(
            ()=>{
                playSound();
            },
            2400
        );

        notify();
    }

    function checkAlarms(){
        const minute=
            currentAlarmTime();

        if(
            minute===
            state.lastAlarmMinute
        ){
            return;
        }

        state.lastAlarmMinute=
            minute;

        const today=
            alarmTodayKey();

        for(
            const alarm of state.alarms
        ){
            if(!alarm.active){
                continue;
            }

            if(
                alarm.time===
                minute
            ){
                fireAlarm(alarm);
            }

            if(
                alarm.lastFired===
                today
            ){
                const now=new Date();
                const parts=
                    String(alarm.time)
                        .split(":")
                        .map(Number);

                if(
                    now.getHours()<
                    parts[0]||
                    (
                        now.getHours()===
                        parts[0]&&
                        now.getMinutes()<
                        parts[1]
                    )
                ){
                    alarm.lastFired="";
                }
            }
        }

        saveState();
    }

    function checkTimer(){
        if(!state.timer.running){
            return;
        }

        if(
            state.timer.end<=
            Date.now()
        ){
            fireTimer();
        }
    }

    function normalizeDuration(args){
        if(
            typeof args==="number"
        ){
            return Math.max(
                0,
                args
            );
        }

        args=args||{};

        if(
            args.duration!=null
        ){
            return Math.max(
                0,
                Number(args.duration)||
                0
            );
        }

        if(
            args.ms!=null
        ){
            return Math.max(
                0,
                Number(args.ms)||
                0
            );
        }

        const hours=
            Number(args.hours)||0;

        const minutes=
            Number(args.minutes)||0;

        const seconds=
            Number(args.seconds)||0;

        return Math.max(
            0,
            (
                hours*3600000+
                minutes*60000+
                seconds*1000
            )
        );
    }

    async function setTimer(
        args
    ){
        const duration=
            normalizeDuration(args);

        if(duration<=0){
            return{
                ok:false,
                error:"Timer duration must be greater than zero."
            };
        }

        state.timer.running=true;
        state.timer.end=
            Date.now()+
            duration;
        state.timer.remaining=
            duration;
        state.lastTimerEnd=0;

        await saveState();
        openClock();
        notify();

        return{
            ok:true,
            duration,
            end:state.timer.end
        };
    }

    async function pauseTimer(){
        if(state.timer.running){
            state.timer.remaining=
                Math.max(
                    0,
                    state.timer.end-
                    Date.now()
                );

            state.timer.running=false;

            await saveState();
            notify();
        }

        return{
            ok:true,
            timer:getPublicState().timer
        };
    }

    async function resumeTimer(){
        if(
            state.timer.running
        ){
            return{
                ok:true,
                timer:getPublicState().timer
            };
        }

        if(
            state.timer.remaining<=0
        ){
            return{
                ok:false,
                error:"No paused timer exists."
            };
        }

        state.timer.end=
            Date.now()+
            state.timer.remaining;

        state.timer.running=true;

        await saveState();
        notify();

        return{
            ok:true,
            timer:getPublicState().timer
        };
    }

    async function resetTimer(){
        state.timer.running=false;
        state.timer.end=0;
        state.timer.remaining=0;
        state.lastTimerEnd=0;

        await saveState();
        notify();

        return{
            ok:true
        };
    }

    async function setSound(
        args
    ){
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
                    error:"Filesystem unavailable."
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
                        "Sound file does not exist: "+
                        path
                };
            }
        }

        state.soundPath=path;

        await saveState();
        notify();

        return{
            ok:true,
            soundPath:state.soundPath
        };
    }

    async function testSound(){
        await playSound();

        return{
            ok:true,
            soundPath:state.soundPath
        };
    }

    async function selectSound(){
        if(
            !window.Apps||
            typeof window.Apps.openApp!=="function"
        ){
            return{
                ok:false,
                error:"File Manager is unavailable."
            };
        }

        try{
            const result=
                await window.Apps.openApp(
                    "File Manager",
                    {
                        selectMode:true,
                        allowMultiple:false
                    }
                );

            if(
                !result||
                !result.ok
            ){
                return{
                    ok:false,
                    error:
                        result&&result.error||
                        "Could not open File Manager."
                };
            }

            return{
                ok:true,
                waiting:true
            };
        }catch(error){
            return{
                ok:false,
                error:
                    error&&error.message||
                    String(error)
            };
        }
    }

    async function addAlarm(
        args
    ){
        args=args||{};

        const time=
            String(args.time||"");

        if(!/^\d{2}:\d{2}$/.test(time)){
            return{
                ok:false,
                error:"Alarm time must use HH:MM."
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
                error:"Invalid alarm time."
            };
        }

        const alarm={
            id:
                Number(args.id)||
                Date.now(),
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

        state.alarms.push(alarm);

        await saveState();
        notify();

        return{
            ok:true,
            alarm
        };
    }

    async function updateAlarm(
        args
    ){
        args=args||{};

        const id=
            Number(args.id);

        const alarm=
            state.alarms.find(
                item=>item.id===id
            );

        if(!alarm){
            return{
                ok:false,
                error:"Alarm not found."
            };
        }

        if(args.time!=null){
            const time=
                String(args.time);

            if(
                !/^\d{2}:\d{2}$/.test(time)
            ){
                return{
                    ok:false,
                    error:"Invalid alarm time."
                };
            }

            alarm.time=time;
            alarm.lastFired="";
        }

        if(args.label!=null){
            alarm.label=
                String(args.label);
        }

        if(args.active!=null){
            alarm.active=
                !!args.active;

            if(alarm.active){
                alarm.lastFired="";
            }
        }

        await saveState();
        notify();

        return{
            ok:true,
            alarm
        };
    }

    async function removeAlarm(
        args
    ){
        args=args||{};

        const id=
            Number(
                args.id
            );

        const before=
            state.alarms.length;

        state.alarms=
            state.alarms.filter(
                alarm=>alarm.id!==id
            );

        if(
            state.alarms.length===
            before
        ){
            return{
                ok:false,
                error:"Alarm not found."
            };
        }

        await saveState();
        notify();

        return{
            ok:true
        };
    }

    async function clearAlarms(){
        state.alarms=[];

        await saveState();
        notify();

        return{
            ok:true
        };
    }

    async function enableAlarm(
        args,
        active
    ){
        return updateAlarm({
            id:args&&args.id,
            active
        });
    }

    async function startStopwatch(){
        if(
            !state.stopwatch.running
        ){
            state.stopwatch.running=true;
            state.stopwatch.started=
                Date.now();
        }

        await saveState();
        openClock();
        notify();

        return{
            ok:true,
            stopwatch:
                getPublicState().stopwatch
        };
    }

    async function pauseStopwatch(){
        if(
            state.stopwatch.running
        ){
            state.stopwatch.elapsed+=
                Date.now()-
                state.stopwatch.started;

            state.stopwatch.running=false;
            state.stopwatch.started=0;

            await saveState();
            notify();
        }

        return{
            ok:true,
            stopwatch:
                getPublicState().stopwatch
        };
    }

    async function resetStopwatch(){
        state.stopwatch.running=false;
        state.stopwatch.started=0;
        state.stopwatch.elapsed=0;
        state.stopwatch.laps=[];

        await saveState();
        notify();

        return{
            ok:true
        };
    }

    async function lapStopwatch(){
        const total=
            state.stopwatch.running
                ?state.stopwatch.elapsed+
                 (
                    Date.now()-
                    state.stopwatch.started
                 )
                :state.stopwatch.elapsed;

        const previous=
            state.stopwatch.laps.length
                ?state.stopwatch.laps[
                    state.stopwatch.laps.length-1
                  ].total
                :0;

        const lap={
            id:Date.now(),
            total,
            diff:
                total-
                previous
        };

        state.stopwatch.laps.push(lap);

        await saveState();
        notify();

        return{
            ok:true,
            lap
        };
    }

    async function getState(){
        return{
            ok:true,
            state:getPublicState()
        };
    }

    const actions={
        getState,
        open:async()=>{
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
        removeAlarm,
        deleteAlarm:removeAlarm,
        enableAlarm:args=>enableAlarm(args,true),
        disableAlarm:args=>enableAlarm(args,false),
        clearAlarms,
        setTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        startStopwatch,
        pauseStopwatch,
        resetStopwatch,
        lapStopwatch
    };

    async function runAction(
        name,
        args
    ){
        const fn=actions[name];

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
            return await fn(args||{});
        }catch(error){
            return{
                ok:false,
                error:
                    error&&error.message||
                    String(error)
            };
        }
    }

    window.clockAPI={
        action:async function(batch){
            if(
                !batch||
                typeof batch!=="object"||
                Array.isArray(batch)
            ){
                return{
                    ok:false,
                    error:"clockAPI.action() requires an object."
                };
            }

            const entries=
                Object.entries(batch);

            const results=
                await Promise.all(
                    entries.map(
                        async([name,args])=>[
                            name,
                            await runAction(
                                name,
                                Array.isArray(args)
                                    ?args
                                    :args||{}
                            )
                        ]
                    )
                );

            const output={};

            for(
                const [name,result]
                of results
            ){
                output[name]=result;
            }

            return{
                ok:
                    results.every(
                        ([,result])=>
                            result&&
                            result.ok!==false
                    ),
                results:output,
                state:getPublicState()
            };
        },

        getState:getState,

        setTimer:args=>
            runAction("setTimer",args),

        setAlarm:args=>
            runAction("setAlarm",args),

        addAlarm:args=>
            runAction("addAlarm",args),

        updateAlarm:args=>
            runAction("updateAlarm",args),

        removeAlarm:args=>
            runAction("removeAlarm",args),

        deleteAlarm:args=>
            runAction("deleteAlarm",args),

        enableAlarm:args=>
            runAction("enableAlarm",args),

        disableAlarm:args=>
            runAction("disableAlarm",args),

        clearAlarms:()=>
            runAction("clearAlarms",{}),

        pauseTimer:()=>
            runAction("pauseTimer",{}),

        resumeTimer:()=>
            runAction("resumeTimer",{}),

        resetTimer:()=>
            runAction("resetTimer",{}),

        setSound:args=>
            runAction("setSound",args),

        selectSound:()=>
            runAction("selectSound",{}),

        testSound:()=>
            runAction("testSound",{}),

        open:()=>
            runAction("open",{}),

        startStopwatch:()=>
            runAction(
                "startStopwatch",
                {}
            ),

        pauseStopwatch:()=>
            runAction(
                "pauseStopwatch",
                {}
            ),

        resetStopwatch:()=>
            runAction(
                "resetStopwatch",
                {}
            ),

        lapStopwatch:()=>
            runAction(
                "lapStopwatch",
                {}
            )
    };

    window.addEventListener(
        "message",
        async function(event){
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
                const paths=
                    Array.isArray(data.paths)
                        ?data.paths
                        :data.path
                            ?[data.path]
                            :[];

                const path=
                    paths.find(
                        item=>
                            typeof item==="string"&&
                            item.length>0&&
                            !item.endsWith("/")
                    );

                if(path){
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
                try{
                    event.source?.postMessage(
                        {
                            type:"chxd-clock-state",
                            state:getPublicState()
                        },
                        "*"
                    );
                }catch(_){}

                return;
            }

            if(
                data.type===
                "chxd-clock-action"
            ){
                const batch=
                    data.action||{};

                const result=
                    await window.clockAPI.action(
                        batch
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
        }
    );

    document.addEventListener(
        "pointerdown",
        wakeAudio,
        true
    );

    document.addEventListener(
        "keydown",
        wakeAudio,
        true
    );

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

    loadState().then(
        ()=>{
            if(
                state.timer.running&&
                state.timer.end<=Date.now()
            ){
                fireTimer();
            }

            notify();
        }
    );
})();
