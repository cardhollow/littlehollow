(function(){

    /*
     * ============================================================
     * LITTLE HOLLOW AI
     * ============================================================
     *
     * IMPORTANT:
     *
     * NO PROVIDER IS LOADED AT STARTUP.
     *
     * ONNX is loaded ONLY when:
     *
     *   LittleHollowAI.prepareOnnx()
     *
     * is explicitly called from Settings.
     *
     * This intentionally mirrors the known-working standalone
     * ONNX setup:
     *
     *   transformers 4.2.0
     *   Qwen2.5-0.5B-Instruct
     *   WebGPU + Q4
     *
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
            context:8192,
            threads:4,
            maxNewTokens:512,
            temperature:0.7
        },

        live:{
            enabled:false,
            debounceMs:1800,
            minIntervalMs:2500
        },

        agent:{
            maxToolRounds:8
        }

    };


    /*
     * ============================================================
     * SETTINGS
     * ============================================================
     */

    function clone(value){

        return JSON.parse(
            JSON.stringify(value)
        );

    }


    function merge(base, extra){

        const result =
            clone(base);


        if(!extra)
            return result;


        for(
            const key of Object.keys(extra)
        ){

            if(
                extra[key] &&
                typeof extra[key] === "object" &&
                !Array.isArray(extra[key])
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


    function getSettings(){

        try{

            const raw =
                localStorage.getItem(
                    SETTINGS_KEY
                );


            if(!raw){

                return clone(
                    DEFAULTS
                );

            }


            return merge(
                DEFAULTS,
                JSON.parse(raw)
            );

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


    let settings =
        getSettings();


    /*
     * ============================================================
     * HISTORY
     * ============================================================
     */

    let history = [];


    function getSystemPrompt(){

        return String(
            window.SYSTEM_PROMPT || ""
        );

    }


    function createSystemMessage(){

        return {

            role:
                "system",

            content:
                getSystemPrompt()

        };

    }


    function createHistory(){

        return [
            createSystemMessage()
        ];

    }


    history =
        createHistory();


    /*
     * ============================================================
     * RUNTIME STATE
     * ============================================================
     */

    let transformersModule =
        null;

    let onnxGenerator =
        null;

    let onnxLoadingPromise =
        null;

    let onnxModelId =
        null;

    let onnxDevice =
        null;

    let onnxDtype =
        null;


    let puterLoadingPromise =
        null;

    let puterReady =
        false;


    let onnxStatus = {

        state:
            "not_loaded",

        progress:
            0,

        message:
            "ONNX model is not loaded."

    };


    /*
     * ============================================================
     * STATUS
     * ============================================================
     */

    function sendToSettings(
        message
    ){

        document
            .querySelectorAll(
                "iframe"
            )
            .forEach(
                frame => {

                    try{

                        frame.contentWindow.postMessage(
                            message,
                            "*"
                        );

                    }catch(error){}

                }
            );

    }


    function setOnnxStatus(
        patch
    ){

        onnxStatus =
            Object.assign(
                {},
                onnxStatus,
                patch || {}
            );


        sendToSettings({

            type:
                "LITTLE_HOLLOW_ONNX_STATUS",

            status:
                clone(
                    onnxStatus
                )

        });


        try{

            window.dispatchEvent(

                new CustomEvent(
                    "littlehollow:onnxstatus",
                    {
                        detail:
                            clone(
                                onnxStatus
                            )
                    }
                )

            );

        }catch(error){}

    }


    function setPuterStatus(
        status,
        message
    ){

        sendToSettings({

            type:
                "LITTLE_HOLLOW_PUTER_STATUS",

            status,

            message:
                message || ""

        });

    }


    /*
     * ============================================================
     * MESSAGE HELPERS
     * ============================================================
     */

    function getMessage(
        response
    ){

        if(
            response &&
            typeof response === "object" &&
            response.message
        ){

            return response.message;

        }


        if(
            response &&
            typeof response === "object" &&
            (
                "content" in response ||
                "tool_calls" in response
            )
        ){

            return response;

        }


        if(
            typeof response === "string"
        ){

            return {

                role:
                    "assistant",

                content:
                    response

            };

        }


        return {

            role:
                "assistant",

            content:
                response &&
                response.toString
                    ? response.toString()
                    : ""

        };

    }


    function messageText(
        message
    ){

        const content =
            message &&
            message.content;


        if(
            typeof content === "string"
        ){

            return content;

        }


        if(
            Array.isArray(content)
        ){

            return content
                .map(
                    part =>
                        typeof part === "string"
                            ? part
                            : part &&
                              part.text
                                ? part.text
                                : ""
                )
                .join("");

        }


        return "";

    }


    function safeParseArgs(
        raw
    ){

        if(raw == null)
            return {};


        if(
            typeof raw === "object"
        ){

            return raw;

        }


        try{

            return JSON.parse(
                raw
            );

        }catch(error){

            return {};

        }

    }


    /*
     * ============================================================
     * PUTER
     * ============================================================
     *
     * No Puter.js script is fetched until this function is called.
     *
     * ============================================================
     */

    async function preparePuter(){

        if(
            puterReady &&
            window.puter
        ){

            setPuterStatus(
                "ready",
                "Puter.js is ready."
            );


            return window.puter;

        }


        if(
            puterLoadingPromise
        ){

            return puterLoadingPromise;

        }


        puterLoadingPromise =
            new Promise(
                (resolve,reject) => {

                    setPuterStatus(
                        "loading",
                        "Loading Puter.js..."
                    );


                    if(
                        window.puter
                    ){

                        puterReady =
                            true;


                        setPuterStatus(
                            "ready",
                            "Puter.js is ready."
                        );


                        resolve(
                            window.puter
                        );


                        return;

                    }


                    const existing =
                        document.querySelector(
                            'script[data-littlehollow-puter="1"]'
                        );


                    if(existing){

                        existing.addEventListener(
                            "load",
                            () => {

                                if(
                                    window.puter
                                ){

                                    puterReady =
                                        true;


                                    setPuterStatus(
                                        "ready",
                                        "Puter.js is ready."
                                    );


                                    resolve(
                                        window.puter
                                    );

                                }else{

                                    reject(
                                        new Error(
                                            "Puter.js loaded but window.puter is unavailable."
                                        )
                                    );

                                }

                            },
                            {
                                once:true
                            }
                        );


                        existing.addEventListener(
                            "error",
                            () => {

                                reject(
                                    new Error(
                                        "Puter.js failed to load."
                                    )
                                );

                            },
                            {
                                once:true
                            }
                        );


                        return;

                    }


                    const script =
                        document.createElement(
                            "script"
                        );


                    script.async =
                        true;


                    script.src =
                        "https://js.puter.com/v2/";


                    script.dataset.littlehollowPuter =
                        "1";


                    script.onload =
                        () => {

                            if(
                                window.puter
                            ){

                                puterReady =
                                    true;


                                setPuterStatus(
                                    "ready",
                                    "Puter.js is ready."
                                );


                                resolve(
                                    window.puter
                                );

                            }else{

                                reject(
                                    new Error(
                                        "Puter.js loaded but window.puter is unavailable."
                                    )
                                );

                            }

                        };


                    script.onerror =
                        () => {

                            reject(
                                new Error(
                                    "Puter.js failed to load."
                                )
                            );

                        };


                    document.head.appendChild(
                        script
                    );

                }
            );


        try{

            return await puterLoadingPromise;

        }catch(error){

            puterLoadingPromise =
                null;


            setPuterStatus(
                "error",
                error.message
            );


            throw error;

        }

    }


    async function generatePuter(
        messages,
        currentSettings
    ){

        const puterApi =
            await preparePuter();


        return puterApi.ai.chat(

            messages,

            {

                model:
                    currentSettings
                        .puter
                        .model,

                tools:
                    Tools.definitions

            }

        );

    }


    /*
     * ============================================================
     * TRANSFORMERS.JS
     * ============================================================
     *
     * This import ONLY happens from prepareOnnx().
     *
     * ============================================================
     */

    async function getTransformers(){

        if(
            transformersModule
        ){

            return transformersModule;

        }


        setOnnxStatus({

            state:
                "loading_runtime",

            progress:
                0,

            message:
                "Loading Transformers.js..."

        });


        transformersModule =
            await import(

                "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0"

            );


        return transformersModule;

    }


    /*
     * ============================================================
     * ONNX DEVICE
     * ============================================================
     *
     * IMPORTANT:
     *
     * The standalone working HTML simply checked:
     *
     *     "gpu" in navigator
     *
     * and selected WebGPU.
     *
     * We do the same here instead of calling requestAdapter()
     * and potentially rejecting a browser that successfully
     * handled the standalone pipeline.
     *
     * ============================================================
     */

    function resolveOnnxDevice(
        requested
    ){

        if(
            requested === "webgpu"
        ){

            if(
                !(
                    "gpu" in navigator
                )
            ){

                throw new Error(
                    "WebGPU is not exposed by this browser context."
                );

            }


            return "webgpu";

        }


        if(
            requested === "wasm"
        ){

            return "wasm";

        }


        /*
         * AUTO:
         *
         * Match the standalone page.
         */

        if(
            "gpu" in navigator
        ){

            return "webgpu";

        }


        return "wasm";

    }


    /*
     * ============================================================
     * ONNX PREPARE
     * ============================================================
     */

    async function prepareOnnx(
        overrideSettings
    ){

        /*
         * This is explicit.
         *
         * Nothing calls this at startup.
         */

        if(
            onnxGenerator
        ){

            return {

                ok:
                    true,

                state:
                    "ready",

                model:
                    onnxModelId,

                device:
                    onnxDevice,

                dtype:
                    onnxDtype

            };

        }


        if(
            onnxLoadingPromise
        ){

            return onnxLoadingPromise;

        }


        const currentSettings =
            getSettings();


        const modelSettings =
            Object.assign(

                {},

                currentSettings.onnx,

                overrideSettings || {}

            );


        /*
         * Match the first known-working HTML.
         *
         * If the UI still contains the old Qwen3 model,
         * intentionally use Qwen2.5 instead.
         */

        let model =
            String(
                modelSettings.model || ""
            ).trim();


        if(
            !model ||
            model ===
                "onnx-community/Qwen3-0.6B-ONNX"
        ){

            model =
                "onnx-community/Qwen2.5-0.5B-Instruct";

        }


        /*
         * Match the standalone page by default.
         */

        const requestedDevice =
            modelSettings.device ||
            "webgpu";


        let dtype =
            modelSettings.dtype ||
            "q4";


        if(
            dtype === "q4f16" &&
            requestedDevice === "webgpu"
        ){

            /*
             * Do not silently enter the f16 path that was
             * producing the shader errors.
             *
             * The working standalone test uses Q4.
             */

            dtype =
                "q4";

        }


        onnxLoadingPromise =
            (async () => {

                try{

                    const device =
                        resolveOnnxDevice(
                            requestedDevice
                        );


                    setOnnxStatus({

                        state:
                            "loading",

                        progress:
                            0,

                        message:
                            "Preparing ONNX model..."

                    });


                    const {
                        pipeline,
                        env
                    } =
                        await getTransformers();


                    env.allowLocalModels =
                        false;


                    env.allowRemoteModels =
                        true;


                    env.useBrowserCache =
                        true;


                    setOnnxStatus({

                        state:
                            "downloading",

                        progress:
                            0,

                        message:
                            (
                                "Downloading " +
                                model +
                                "..."
                            )

                    });


                    /*
                     * This is intentionally shaped like the
                     * original standalone working HTML:
                     *
                     * pipeline(
                     *   "text-generation",
                     *   MODEL_ID,
                     *   {
                     *      device,
                     *      dtype,
                     *      progress_callback
                     *   }
                     * )
                     */

                    const generator =
                        await pipeline(

                            "text-generation",

                            model,

                            {

                                device,

                                dtype,

                                progress_callback:
                                    data => {

                                        if(
                                            data &&
                                            typeof
                                                data.progress ===
                                                "number"
                                        ){

                                            const progress =
                                                Math.round(
                                                    data.progress
                                                );


                                            const file =
                                                data.file ||
                                                data.name ||
                                                "model";


                                            setOnnxStatus({

                                                state:
                                                    "downloading",

                                                progress,

                                                message:
                                                    (
                                                        "Downloading " +
                                                        file +
                                                        " — " +
                                                        progress +
                                                        "%"
                                                    )

                                            });

                                        }else{

                                            const file =
                                                data &&
                                                (
                                                    data.file ||
                                                    data.name
                                                );


                                            setOnnxStatus({

                                                state:
                                                    "loading",

                                                progress:
                                                    0,

                                                message:
                                                    file
                                                        ? (
                                                            "Loading " +
                                                            file +
                                                            "..."
                                                          )
                                                        : "Initializing ONNX Runtime..."

                                            });

                                        }

                                    }

                            }

                        );


                    onnxGenerator =
                        generator;


                    onnxModelId =
                        model;


                    onnxDevice =
                        device;


                    onnxDtype =
                        dtype;


                    setOnnxStatus({

                        state:
                            "ready",

                        progress:
                            100,

                        message:
                            (
                                "READY — " +
                                model +
                                " • " +
                                device.toUpperCase() +
                                " • " +
                                dtype.toUpperCase()
                            )

                    });


                    return {

                        ok:
                            true,

                        state:
                            "ready",

                        model,

                        device,

                        dtype

                    };

                }catch(error){

                    console.error(
                        "ONNX setup failed:",
                        error
                    );


                    onnxGenerator =
                        null;

                    onnxModelId =
                        null;

                    onnxDevice =
                        null;

                    onnxDtype =
                        null;


                    setOnnxStatus({

                        state:
                            "error",

                        progress:
                            0,

                        message:
                            error &&
                            error.message
                                ? error.message
                                : String(error)

                    });


                    throw error;

                }finally{

                    onnxLoadingPromise =
                        null;

                }

            })();


        return onnxLoadingPromise;

    }


    function unloadOnnx(){

        onnxGenerator =
            null;

        onnxModelId =
            null;

        onnxDevice =
            null;

        onnxDtype =
            null;


        setOnnxStatus({

            state:
                "not_loaded",

            progress:
                0,

            message:
                "ONNX runtime unloaded."

        });


        disableLive();

    }


    function getOnnxStatus(){

        return clone(
            onnxStatus
        );

    }


    /*
     * ============================================================
     * GGUF
     * ============================================================
     */

    async function prepareGguf(){

        if(
            window.LittleHollowGGUF &&
            typeof
                window.LittleHollowGGUF.prepare ===
                "function"
        ){

            return window
                .LittleHollowGGUF
                .prepare(
                    getSettings().gguf
                );

        }


        throw new Error(
            "No GGUF browser runtime is installed."
        );

    }


    async function generateGguf(
        messages,
        currentSettings
    ){

        if(
            !window.LittleHollowGGUF ||
            typeof
                window.LittleHollowGGUF.chat !==
                "function"
        ){

            throw new Error(
                "GGUF runtime is not loaded."
            );

        }


        return window
            .LittleHollowGGUF
            .chat({

                messages,

                tools:
                    Tools.definitions,

                model:
                    currentSettings
                        .gguf
                        .model,

                context:
                    currentSettings
                        .gguf
                        .context,

                threads:
                    currentSettings
                        .gguf
                        .threads,

                max_new_tokens:
                    currentSettings
                        .gguf
                        .maxNewTokens,

                temperature:
                    currentSettings
                        .gguf
                        .temperature

            });

    }


    /*
     * ============================================================
     * ONNX GENERATION
     * ============================================================
     */

    async function generateOnnx(
        messages,
        currentSettings
    ){

        /*
         * NEVER prepare here.
         *
         * If user hasn't loaded ONNX from Settings,
         * fail without downloading anything.
         */

        if(
            !onnxGenerator
        ){

            throw new Error(
                "ONNX is not loaded. Open Settings → AI → ONNX and click LOAD / SET UP MODEL."
            );

        }


        const generator =
            onnxGenerator;


        /*
         * Start with the same generation method as
         * the standalone working HTML.
         */

        const options = {

            max_new_tokens:
                Math.max(
                    1,
                    Number(
                        currentSettings
                            .onnx
                            .maxNewTokens
                    ) || 256
                ),

            temperature:
                Number(
                    currentSettings
                        .onnx
                        .temperature
                ) || 0.7,

            do_sample:
                true,

            top_p:
                0.9,

            repetition_penalty:
                1.05

        };


        /*
         * For now, use the model's chat interface when
         * available.
         *
         * Qwen2.5 can use the tokenizer/model chat template
         * through Transformers.js.
         */

        return generator(
            messages,
            options
        );

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
                window.LittleHollowState.getSnapshot ===
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
            !state
        ){

            return String(
                text || ""
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

        }catch(error){

            serialized =
                "";

        }


        if(!serialized){

            return String(
                text || ""
            );

        }


        return (

            String(
                text || ""
            ) +

            "\n\n[LITTLE HOLLOW CURRENT STATE]\n" +

            serialized +

            "\n[/LITTLE HOLLOW CURRENT STATE]"

        );

    }


    /*
     * ============================================================
     * AGENT
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
            getSettings();


        /*
         * Local providers MUST have been explicitly prepared.
         */

        if(
            settings.provider ===
            "onnx" &&
            !onnxGenerator
        ){

            return {

                ok:
                    false,

                visibleMessage:
                    "ONNX is not loaded. Open Settings → AI → ONNX and click LOAD / SET UP MODEL.",

                log:[]

            };

        }


        if(
            settings.provider ===
            "gguf" &&
            !(
                window.LittleHollowGGUF &&
                typeof
                    window.LittleHollowGGUF.chat ===
                    "function"
            )
        ){

            return {

                ok:
                    false,

                visibleMessage:
                    "GGUF is not loaded. Open Settings and initialize the GGUF runtime.",

                log:[]

            };

        }


        let content =
            String(
                text == null
                    ? ""
                    : text
            );


        if(
            options.includeState
        ){

            content =
                appendState(
                    content
                );

        }


        history.push({

            role:
                "user",

            content

        });


        /*
         * Prevent unbounded history.
         */

        if(
            history.length > 80
        ){

            history = [

                history[0],

                ...history.slice(
                    -79
                )

            ];

        }


        Avatar.setEye(
            "thinking",
            -1
        );


        const log = [];

        let finalText =
            "";


        try{

            const maxRounds =
                Math.max(
                    1,
                    Number(
                        settings.agent.maxToolRounds
                    ) || 8
                );


            for(
                let round = 0;
                round < maxRounds;
                round++
            ){

                const response =
                    await generate(
                        history,
                        settings
                    );


                const message =
                    getMessage(
                        response
                    );


                const toolCalls =
                    Array.isArray(
                        message.tool_calls
                    )
                        ? message.tool_calls
                        : [];


                history.push({

                    role:
                        "assistant",

                    content:
                        message.content ||
                        "",

                    ...(toolCalls.length
                        ? {
                            tool_calls:
                                toolCalls
                          }
                        : {})

                });


                if(
                    toolCalls.length
                ){

                    for(
                        const call of
                            toolCalls
                    ){

                        const name =
                            call.function
                                ? call.function.name
                                : call.name;


                        const rawArgs =
                            call.function
                                ? call.function.arguments
                                : call.input;


                        const args =
                            safeParseArgs(
                                rawArgs
                            );


                        let result;


                        try{

                            Avatar.setEye(
                                "matrix"
                            );


                            result =
                                await Tools.execute(
                                    name,
                                    args
                                );

                        }catch(error){

                            result = {

                                ok:
                                    false,

                                summary:
                                    error &&
                                    error.message
                                        ? error.message
                                        : String(error)

                            };

                        }


                        log.push({

                            name,

                            summary:
                                result &&
                                result.summary
                                    ? result.summary
                                    : "completed"

                        });


                        history.push({

                            role:
                                "tool",

                            tool_call_id:
                                call.id ||
                                (
                                    "call_" +
                                    Date.now() +
                                    "_" +
                                    Math.random()
                                        .toString(36)
                                        .slice(2)
                                ),

                            content:
                                JSON.stringify(
                                    result
                                )

                        });

                    }


                    continue;

                }


                finalText =
                    messageText(
                        message
                    );


                break;

            }

        }catch(error){

            console.error(
                "Little Hollow AI error:",
                error
            );


            Avatar.setEye(
                "normal"
            );


            return {

                ok:
                    false,

                visibleMessage:
                    error &&
                    error.message
                        ? error.message
                        : String(error),

                log

            };

        }


        Avatar.setEye(
            "normal"
        );


        return {

            ok:
                true,

            visibleMessage:
                finalText
                    ? AvatarText.process(
                        finalText
                      )
                    : "",

            log

        };

    }


    /*
     * ============================================================
     * PROVIDER ROUTER
     * ============================================================
     */

    async function generate(
        messages,
        currentSettings
    ){

        switch(
            currentSettings.provider
        ){

            case "puter":

                return generatePuter(
                    messages,
                    currentSettings
                );


            case "onnx":

                return generateOnnx(
                    messages,
                    currentSettings
                );


            case "gguf":

                return generateGguf(
                    messages,
                    currentSettings
                );


            default:

                throw new Error(
                    "Unsupported AI provider: " +
                    currentSettings.provider
                );

        }

    }


    /*
     * ============================================================
     * PUBLIC SEND
     * ============================================================
     */

    async function send(
        userText
    ){

        settings =
            getSettings();


        return runAgent(

            userText,

            {

                includeState:
                    settings.mode === "live"

            }

        );

    }


    /*
     * ============================================================
     * LIVE
     * ============================================================
     *
     * NOTHING HERE STARTS BY ITSELF.
     *
     * Live only runs when:
     *
     *   - mode = live
     *   - a provider is already prepared
     *   - a real state-change event occurs
     *
     * ============================================================
     */

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


    function hashState(
        state
    ){

        let text =
            "";


        try{

            text =
                JSON.stringify(
                    state
                );

        }catch(error){

            text =
                String(
                    state
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
                text.charCodeAt(i);

            hash +=
                (
                    hash << 1
                ) +
                (
                    hash << 4
                ) +
                (
                    hash << 7
                ) +
                (
                    hash << 8
                ) +
                (
                    hash << 24
                );

        }


        return (
            hash >>> 0
        ).toString(16);

    }


    function scheduleLive(
        reason
    ){

        const currentSettings =
            getSettings();


        if(
            currentSettings.mode !==
            "live"
        ){

            return;

        }


        /*
         * Absolutely no local runtime initialization here.
         */

        if(
            currentSettings.provider ===
            "onnx" &&
            !onnxGenerator
        ){

            return;

        }


        if(
            currentSettings.provider ===
            "gguf" &&
            !(
                window.LittleHollowGGUF &&
                typeof
                    window.LittleHollowGGUF.chat ===
                    "function"
            )
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
                        currentSettings
                            .live
                            .debounceMs
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


        const currentSettings =
            getSettings();


        if(
            currentSettings.mode !==
            "live"
        ){

            return;

        }


        if(
            currentSettings.provider ===
            "onnx" &&
            !onnxGenerator
        ){

            return;

        }


        if(
            currentSettings.provider ===
            "gguf" &&
            !(
                window.LittleHollowGGUF &&
                typeof
                    window.LittleHollowGGUF.chat ===
                    "function"
            )
        ){

            return;

        }


        const now =
            Date.now();


        const minimumInterval =
            Math.max(
                1000,
                Number(
                    currentSettings
                        .live
                        .minIntervalMs
                ) || 2500
            );


        if(
            now - lastLiveRun <
            minimumInterval
        ){

            scheduleLive(
                reason
            );

            return;

        }


        const state =
            getStateSnapshot();


        const currentHash =
            hashState(
                state
            );


        if(
            currentHash ===
            lastLiveHash
        ){

            livePending =
                false;

            return;

        }


        lastLiveHash =
            currentHash;

        livePending =
            false;

        liveRunning =
            true;

        lastLiveRun =
            now;


        try{

            await runAgent(

                (
                    "LIVE EVENT: " +
                    String(
                        reason ||
                        "Little Hollow state changed."
                    ) +
                    ". Observe the current state and act only if useful. " +
                    "Do not generate unnecessary user-facing text."
                ),

                {
                    includeState:true
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

        /*
         * Explicitly called after a local model has already
         * been loaded.
         */

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
     * STATE EVENTS
     * ============================================================
     */

    window.addEventListener(
        "littlehollow:statechange",
        event => {

            const currentSettings =
                getSettings();


            if(
                currentSettings.mode !==
                "live"
            ){

                return;

            }


            scheduleLive(

                event.detail &&
                event.detail.reason
                    ? event.detail.reason
                    : "Little Hollow state changed."

            );

        }
    );


    /*
     * ============================================================
     * SETTINGS EVENTS
     * ============================================================
     */

    function refreshSettings(){

        settings =
            getSettings();


        history[0] =
            createSystemMessage();


        if(
            settings.mode !==
            "live"
        ){

            disableLive();

            return;

        }


        /*
         * Do NOT load a model.
         *
         * Do NOT call prepareOnnx().
         *
         * Live only becomes usable after the user explicitly
         * initialized the provider from Settings.
         */

        if(
            settings.provider ===
            "onnx" &&
            onnxGenerator
        ){

            enableLive();

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


    /*
     * ============================================================
     * RUNTIME STATUS
     * ============================================================
     */

    function getRuntimeStatus(){

        return {

            provider:
                getSettings().provider,

            puterReady,

            onnx:{

                loaded:
                    !!onnxGenerator,

                model:
                    onnxModelId,

                device:
                    onnxDevice,

                dtype:
                    onnxDtype,

                status:
                    getOnnxStatus()

            },

            ggufReady:
                !!(
                    window.LittleHollowGGUF &&
                    typeof
                        window.LittleHollowGGUF.chat ===
                        "function"
                )

        };

    }


    /*
     * ============================================================
     * RESET
     * ============================================================
     */

    function reset(){

        history =
            createHistory();

        lastLiveHash =
            "";

    }


    /*
     * ============================================================
     * PUBLIC API
     * ============================================================
     */

    window.LittleHollowAI = {

        send,

        reset,

        runAgent,

        scheduleLive,

        enableLive,

        disableLive,

        preparePuter,

        prepareOnnx,

        prepareGguf,

        unloadOnnx,

        getOnnxStatus,

        getRuntimeStatus,

        getSettings,

        getProvider:
            () =>
                getSettings().provider,

        getMode:
            () =>
                getSettings().mode,

        getHistory:
            () =>
                history.slice()

    };


    /*
     * ============================================================
     * NO STARTUP MODEL LOADING.
     *
     * DO NOT PUT ANY prepareOnnx(), preparePuter(),
     * enableLive(), or pipeline() call here.
     * ============================================================
     */

})();
