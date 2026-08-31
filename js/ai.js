/* js/ai.js */
(function(){
    "use strict";

    /*
     * ============================================================
     * LITTLE HOLLOW AI CORE
     * ============================================================
     *
     * THIS FILE DOES NOT IMPLEMENT:
     *
     *   PUTER
     *   ONNX
     *   GGUF
     *
     * Provider-specific behavior lives in:
     *
     *   aiPuter.js
     *   aiOnnx.js
     *   aiGGUF.js
     *
     * The provider contract is:
     *
     *   provider.chat({
     *       messages,
     *       tools,
     *       settings,
     *       executeTool
     *   })
     *
     * The provider itself owns:
     *
     *   - model loading
     *   - model generation
     *   - tool-call parsing
     *   - tool execution loop
     *   - provider-specific history handling
     *   - provider-specific errors
     *
     * This file only manages the application-facing AI API.
     * ============================================================
     */

    const SETTINGS_KEY =
        "littlehollow.ai.settings";


    const DEFAULTS = {

        provider:
            "puter",

        mode:
            "interactive",

        puter:{
            model:
                "claude-sonnet-5"
        },

        onnx:{
            model:
                "onnx-community/Qwen2.5-0.5B-Instruct",

            device:
                "webgpu",

            dtype:
                "q4",

            maxNewTokens:
                256,

            temperature:
                0.7
        },

        gguf:{
            model:"",
            context:
                8192,

            threads:
                4,

            maxNewTokens:
                512,

            temperature:
                0.7
        },

        live:{
            enabled:
                false,

            debounceMs:
                1800,

            minIntervalMs:
                2500
        },

        agent:{
            maxToolRounds:
                8
        }

    };


    const PROVIDER_FILES = {

        puter:
            "js/aiPuter.js",

        onnx:
            "js/aiOnnx.js",

        gguf:
            "js/aiGGUF.js"

    };


    const providerPromises = {};


    let settings;


    const history = [];


    let liveTimer =
        null;


    let liveRunning =
        false;


    let livePending =
        false;


    let lastLiveRun =
        0;


    let lastLiveHash =
        "";


    /*
     * ============================================================
     * GENERIC HELPERS
     * ============================================================
     */

    function clone(
        value
    ){

        try{

            return JSON.parse(
                JSON.stringify(
                    value
                )
            );

        }catch(error){

            return value;

        }

    }


    function merge(
        base,
        extra
    ){

        const result =
            clone(
                base
            );


        if(
            !extra
        ){

            return result;

        }


        for(
            const key of
            Object.keys(extra)
        ){

            if(
                extra[key] &&
                typeof extra[key] ===
                    "object" &&
                !Array.isArray(
                    extra[key]
                )
            ){

                result[key] =
                    Object.assign(
                        {},
                        result[key] || {},
                        extra[key]
                    );

            }else{

                result[key] =
                    extra[key];

            }

        }


        return result;

    }


    /*
     * ============================================================
     * SETTINGS
     * ============================================================
     */

    function loadSettings(){

        try{

            const raw =
                localStorage.getItem(
                    SETTINGS_KEY
                );


            if(
                !raw
            ){

                return clone(
                    DEFAULTS
                );

            }


            const saved =
                merge(
                    DEFAULTS,
                    JSON.parse(
                        raw
                    )
                );


            /*
             * Migrate the old Qwen3 configuration.
             */

            if(
                saved.onnx &&
                saved.onnx.model ===
                    "onnx-community/Qwen3-0.6B-ONNX"
            ){

                saved.onnx.model =
                    DEFAULTS.onnx.model;

                saved.onnx.device =
                    DEFAULTS.onnx.device;

                saved.onnx.dtype =
                    DEFAULTS.onnx.dtype;

                saved.onnx.maxNewTokens =
                    DEFAULTS.onnx.maxNewTokens;

            }


            return saved;

        }catch(error){

            console.error(
                "Little Hollow AI settings error:",
                error
            );


            return clone(
                DEFAULTS
            );

        }

    }


    settings =
        loadSettings();


    /*
     * ============================================================
     * SYSTEM MESSAGE
     * ============================================================
     */

    function makeSystemMessage(){

        return {

            role:
                "system",

            content:
                String(
                    window.SYSTEM_PROMPT ||
                    ""
                )

        };

    }


    history.push(
        makeSystemMessage()
    );


    function refreshSystemMessage(){

        history[0] =
            makeSystemMessage();

    }


    function trimHistory(){

        if(
            history.length <= 80
        ){

            return;

        }


        history.splice(
            1,
            history.length - 80
        );

    }


    /*
     * ============================================================
     * PROVIDER LOADER
     * ============================================================
     *
     * Providers are independent modules.
     *
     * They are loaded only when requested.
     * ============================================================
     */

    function loadScript(
        src
    ){

        if(
            providerPromises[src]
        ){

            return providerPromises[src];

        }


        providerPromises[src] =
            new Promise(
                (
                    resolve,
                    reject
                ) => {

                    /*
                     * Re-use an already-created provider script.
                     */

                    const existing =
                        document.querySelector(
                            'script[data-littlehollow-ai-provider="' +
                            src +
                            '"]'
                        );


                    if(
                        existing
                    ){

                        if(
                            existing.dataset.loaded ===
                            "1"
                        ){

                            resolve();

                            return;

                        }


                        existing.addEventListener(
                            "load",
                            () => {

                                resolve();

                            },
                            {
                                once:
                                    true
                            }
                        );


                        existing.addEventListener(
                            "error",
                            () => {

                                reject(
                                    new Error(
                                        "Failed to load provider: " +
                                        src
                                    )
                                );

                            },
                            {
                                once:
                                    true
                            }
                        );


                        return;

                    }


                    const script =
                        document.createElement(
                            "script"
                        );


                    script.src =
                        src;


                    script.async =
                        false;


                    script.dataset
                        .littlehollowAiProvider =
                        src;


                    script.onload =
                        () => {

                            script.dataset.loaded =
                                "1";


                            resolve();

                        };


                    script.onerror =
                        () => {

                            reject(
                                new Error(
                                    "Failed to load AI provider: " +
                                    src
                                )
                            );

                        };


                    document.head.appendChild(
                        script
                    );

                }
            )
            .catch(
                error => {

                    delete providerPromises[src];

                    throw error;

                }
            );


        return providerPromises[src];

    }


    async function getProvider(
        name
    ){

        name =
            name ||
            loadSettings().provider;


        const file =
            PROVIDER_FILES[name];


        if(
            !file
        ){

            throw new Error(
                "Unsupported AI provider: " +
                name
            );

        }


        await loadScript(
            file
        );


        const registry =
            window.LittleHollowAIProviders ||
            {};


        const provider =
            registry[name];


        if(
            !provider ||
            typeof provider.chat !==
                "function"
        ){

            throw new Error(
                "AI provider module did not register correctly: " +
                name
            );

        }


        return provider;

    }


    /*
     * ============================================================
     * TOOL EXECUTOR INJECTION
     * ============================================================
     *
     * ai.js does NOT decide which tools to call.
     *
     * It merely hands the existing tool executor to the provider.
     *
     * The provider decides:
     *
     *   "I need open_application"
     *
     * then calls:
     *
     *   executeTool("open_application", args)
     *
     * ============================================================
     */

    async function executeTool(
        name,
        args
    ){

        if(
            !window.Tools ||
            typeof window.Tools.execute !==
                "function"
        ){

            throw new Error(
                "Little Hollow Tools.execute() is unavailable."
            );

        }


        return window.Tools.execute(
            name,
            args || {}
        );

    }


    /*
     * ============================================================
     * MESSAGE TEXT
     * ============================================================
     */

    function messageText(
        message
    ){

        if(
            !message
        ){

            return "";

        }


        if(
            typeof message.content ===
                "string"
        ){

            return message.content;

        }


        if(
            Array.isArray(
                message.content
            )
        ){

            return message.content
                .map(
                    part => {

                        if(
                            typeof part ===
                                "string"
                        ){

                            return part;

                        }


                        return (
                            part &&
                            typeof part.text ===
                                "string"
                        )
                            ? part.text
                            : "";

                    }
                )
                .join("");

        }


        return "";

    }


    /*
     * ============================================================
     * STATE
     * ============================================================
     */

    function getStateSnapshot(){

        if(
            window.LittleHollowState &&
            typeof
                window.LittleHollowState
                    .getSnapshot ===
                    "function"
        ){

            try{

                return window
                    .LittleHollowState
                    .getSnapshot();

            }catch(error){

                console.warn(
                    "State snapshot failed:",
                    error
                );

            }

        }


        return null;

    }


    function appendState(
        text
    ){

        const state =
            getStateSnapshot();


        if(
            state == null
        ){

            return String(
                text ||
                ""
            );

        }


        let serialized =
            "";


        try{

            serialized =
                JSON.stringify(
                    state,
                    null,
                    2
                );

        }catch(error){}


        if(
            !serialized
        ){

            return String(
                text ||
                ""
            );

        }


        return (

            String(
                text ||
                ""
            ) +

            "\n\n[LITTLE HOLLOW CURRENT STATE]\n" +

            serialized +

            "\n[/LITTLE HOLLOW CURRENT STATE]"

        );

    }


    /*
     * ============================================================
     * MAIN MESSAGE ENTRY POINT
     * ============================================================
     */

    async function runAgent(
        text,
        options
    ){

        options =
            options ||
            {};


        settings =
            loadSettings();


        let userText =
            String(
                text == null
                    ? ""
                    : text
            );


        if(
            options.includeState
        ){

            userText =
                appendState(
                    userText
                );

        }


        /*
         * Receive incoming user message.
         */

        history.push({

            role:
                "user",

            content:
                userText

        });


        trimHistory();


        if(
            window.Avatar &&
            typeof Avatar.setEye ===
                "function"
        ){

            try{

                Avatar.setEye(
                    "thinking",
                    -1
                );

            }catch(error){}

        }


        try{

            /*
             * Select provider.
             *
             * No provider-specific implementation happens here.
             */

            const provider =
                await getProvider(
                    settings.provider
                );


            const tools =
                (
                    window.Tools &&
                    Array.isArray(
                        window.Tools.definitions
                    )
                )
                    ? window.Tools.definitions
                    : [];


            /*
             * Send the conversation to the provider.
             */

            const result =
                await provider.chat({

                    messages:
                        clone(
                            history
                        ),

                    tools:
                        clone(
                            tools
                        ),

                    settings:
                        clone(
                            settings
                        ),

                    executeTool

                });


            const message =
                result &&
                result.message
                    ? result.message
                    : {
                        role:
                            "assistant",

                        content:
                            ""
                    };


            const assistantText =
                messageText(
                    message
                );


            /*
             * Receive final provider message.
             */

            history.push({

                role:
                    "assistant",

                content:
                    assistantText

            });


            trimHistory();


            if(
                window.Avatar &&
                typeof Avatar.setEye ===
                    "function"
            ){

                try{

                    Avatar.setEye(
                        "normal"
                    );

                }catch(error){}

            }


            return {

                ok:
                    true,

                visibleMessage:
                    (
                        assistantText &&
                        window.AvatarText &&
                        typeof
                            AvatarText.process ===
                                "function"
                    )
                        ? AvatarText.process(
                            assistantText
                          )
                        : assistantText,

                log:
                    result &&
                    Array.isArray(
                        result.log
                    )
                        ? result.log
                        : [],

                provider:
                    settings.provider,

                rounds:
                    result?.rounds ||
                    1,

                maxRoundsReached:
                    !!result?.maxRoundsReached

            };

        }catch(error){

            console.error(
                "Little Hollow AI error:",
                error
            );


            if(
                window.Avatar &&
                typeof Avatar.setEye ===
                    "function"
            ){

                try{

                    Avatar.setEye(
                        "normal"
                    );

                }catch(error2){}

            }


            return {

                ok:
                    false,

                visibleMessage:
                    error &&
                    error.message
                        ? error.message
                        : String(
                            error
                          ),

                log:[]

            };

        }

    }


    /*
     * ============================================================
     * SEND
     * ============================================================
     */

    async function send(
        userText
    ){

        settings =
            loadSettings();


        return runAgent(

            userText,

            {

                includeState:
                    settings.mode ===
                    "live"

            }

        );

    }


    /*
     * ============================================================
     * PROVIDER SETUP
     * ============================================================
     */

    async function preparePuter(){

        const provider =
            await getProvider(
                "puter"
            );


        return provider.prepare();

    }


    async function prepareOnnx(
        overrides
    ){

        const provider =
            await getProvider(
                "onnx"
            );


        const current =
            loadSettings();


        const merged =
            clone(
                current
            );


        merged.onnx =
            Object.assign(
                {},
                merged.onnx,
                overrides || {}
            );


        return provider.prepare(
            merged
        );

    }


    async function prepareGguf(){

        const provider =
            await getProvider(
                "gguf"
            );


        return provider.prepare(
            loadSettings()
        );

    }


    async function unloadOnnx(){

        const provider =
            await getProvider(
                "onnx"
            );


        if(
            typeof provider.unload ===
                "function"
        ){

            return provider.unload();

        }

    }


    function getOnnxStatus(){

        const provider =
            window
                .LittleHollowAIProviders
                ?.onnx;


        if(
            provider &&
            typeof provider.getStatus ===
                "function"
        ){

            return provider.getStatus();

        }


        return {

            state:
                "not_loaded",

            progress:
                0,

            message:
                "ONNX provider has not been loaded."

        };

    }


    function getRuntimeStatus(){

        const active =
            loadSettings().provider;


        const providers =
            window.LittleHollowAIProviders ||
            {};


        const puter =
            providers.puter;


        const onnx =
            providers.onnx;


        const gguf =
            providers.gguf;


        return {

            provider:
                active,

            puterReady:
                !!(
                    puter &&
                    typeof puter.getStatus ===
                        "function" &&
                    puter.getStatus().ready
                ),

            onnx:
                onnx &&
                typeof onnx.getStatus ===
                    "function"

                    ? {

                        loaded:
                            onnx.getStatus()
                                .state ===
                            "ready",

                        status:
                            onnx.getStatus()

                      }

                    : {

                        loaded:
                            false,

                        status:
                            getOnnxStatus()

                      },

            ggufReady:
                !!(
                    gguf &&
                    typeof gguf.getStatus ===
                        "function" &&
                    gguf.getStatus().ready
                )

        };

    }


    /*
     * ============================================================
     * RESET
     * ============================================================
     */

    function reset(){

        history.length =
            0;


        history.push(
            makeSystemMessage()
        );


        lastLiveHash =
            "";

    }


    /*
     * ============================================================
     * LIVE MODE
     * ============================================================
     */

    function hashState(
        value
    ){

        let text =
            "";


        try{

            text =
                JSON.stringify(
                    value
                );

        }catch(error){

            text =
                String(
                    value
                );

        }


        let hash =
            2166136261;


        for(
            let i = 0;
            i < text.length;
            i++
        ){

            hash ^=
                text.charCodeAt(
                    i
                );


            hash +=
                (hash << 1) +
                (hash << 4) +
                (hash << 7) +
                (hash << 8) +
                (hash << 24);

        }


        return (
            hash >>> 0
        ).toString(16);

    }


    function scheduleLive(
        reason
    ){

        const current =
            loadSettings();


        if(
            current.mode !==
                "live"
        ){

            return;

        }


        clearTimeout(
            liveTimer
        );


        livePending =
            true;


        liveTimer =
            setTimeout(

                () => {

                    liveTimer =
                        null;


                    runLive(
                        reason
                    );

                },

                Math.max(
                    250,
                    Number(
                        current.live.debounceMs
                    ) || 1800
                )

            );

    }


    async function runLive(
        reason
    ){

        if(
            liveRunning
        ){

            livePending =
                true;


            return;

        }


        const current =
            loadSettings();


        if(
            current.mode !==
                "live"
        ){

            return;

        }


        const now =
            Date.now();


        const minimum =
            Math.max(
                1000,
                Number(
                    current.live.minIntervalMs
                ) || 2500
            );


        if(
            now - lastLiveRun <
                minimum
        ){

            scheduleLive(
                reason
            );


            return;

        }


        const state =
            getStateSnapshot();


        const hash =
            hashState(
                state
            );


        if(
            hash ===
                lastLiveHash
        ){

            return;

        }


        lastLiveHash =
            hash;


        livePending =
            false;


        liveRunning =
            true;


        lastLiveRun =
            now;


        try{

            await runAgent(

                "LIVE EVENT: " +
                String(
                    reason ||
                    "Little Hollow state changed."
                ) +
                ". Observe the current state and act only if useful. " +
                "Do not produce unnecessary user-facing text.",

                {
                    includeState:
                        true
                }

            );

        }catch(error){

            console.error(
                "Live agent error:",
                error
            );

        }


        liveRunning =
            false;


        if(
            livePending
        ){

            scheduleLive(
                "Another state change occurred."
            );

        }

    }


    function enableLive(){

        clearTimeout(
            liveTimer
        );


        lastLiveHash =
            "";


        scheduleLive(
            "Live mode enabled."
        );

    }


    function disableLive(){

        clearTimeout(
            liveTimer
        );


        liveTimer =
            null;


        livePending =
            false;


        liveRunning =
            false;

    }


    /*
     * ============================================================
     * SETTINGS / STATE EVENTS
     * ============================================================
     */

    function refreshSettings(){

        settings =
            loadSettings();


        refreshSystemMessage();


        if(
            settings.mode !==
                "live"
        ){

            disableLive();

        }

    }


    window.addEventListener(
        "storage",
        event => {

            if(
                event.key ===
                    SETTINGS_KEY
            ){

                refreshSettings();

            }

        }
    );


    window.addEventListener(
        "littlehollow:settingschange",
        refreshSettings
    );


    window.addEventListener(
        "littlehollow:statechange",
        event => {

            const current =
                loadSettings();


            if(
                current.mode !==
                    "live"
            ){

                return;

            }


            scheduleLive(

                event.detail?.reason ||
                "Little Hollow state changed."

            );

        }
    );


    /*
     * ============================================================
     * PUBLIC API
     * ============================================================
     */

    window.LittleHollowAI = {

        send,

        runAgent,

        reset,

        scheduleLive,

        enableLive,

        disableLive,

        preparePuter,

        prepareOnnx,

        prepareGguf,

        unloadOnnx,

        getOnnxStatus,

        getRuntimeStatus,

        getSettings:
            () =>
                loadSettings(),

        getProvider:
            () =>
                loadSettings()
                    .provider,

        getMode:
            () =>
                loadSettings()
                    .mode,

        getHistory:
            () =>
                history.slice()

    };

})();
