(function(){

    /*
     * ============================================================
     * LITTLE HOLLOW AI
     * ============================================================
     *
     * Providers:
     *   puter
     *   onnx
     *   gguf
     *
     * Modes:
     *   interactive
     *   agent
     *   live
     *
     * IMPORTANT:
     *
     * No local model is loaded automatically.
     *
     * ONNX/GGUF must be explicitly prepared from Settings.
     *
     * Sending a message does NOT implicitly download/load an
     * ONNX model.
     *
     * ============================================================
     */

    const SETTINGS_KEY =
        "littlehollow.ai.settings";

    const MAX_HISTORY_MESSAGES =
        80;

    const DEFAULTS = {

        provider: "puter",

        mode: "interactive",

        puter: {
            model: "claude-sonnet-5"
        },

        onnx: {

            model:
                "onnx-community/Qwen3-0.6B-ONNX",

            device: "auto",

            /*
             * q4 avoids the f16 shader path that is failing
             * on the user's current WebGPU implementation.
             */
            dtype: "q4",

            maxNewTokens: 512,

            temperature: 0.7

        },

        gguf: {

            model: "",

            context: 8192,

            threads: 4,

            maxNewTokens: 512,

            temperature: 0.7

        },

        live: {

            enabled: false,

            debounceMs: 1800,

            minIntervalMs: 2500

        },

        agent: {

            maxToolRounds: 8

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


            if(!raw)
                return clone(
                    DEFAULTS
                );


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


    /*
     * ============================================================
     * INTERNAL RUNTIME STATE
     * ============================================================
     */

    let settings =
        getSettings();


    let history = [];


    /*
     * ONNX runtime
     */

    let transformersModule =
        null;

    let onnxGenerator =
        null;

    let onnxModelId =
        null;

    let onnxDevice =
        null;

    let onnxDtype =
        null;

    let onnxLoadingPromise =
        null;

    let onnxStatus = {

        state: "not_loaded",

        progress: 0,

        message:
            "ONNX model is not loaded."

    };


    /*
     * Puter runtime
     */

    let puterLoadingPromise =
        null;

    let puterReady =
        false;


    /*
     * ============================================================
     * SYSTEM PROMPT
     * ============================================================
     */

    function getSystemPrompt(){

        return String(
            window.SYSTEM_PROMPT || ""
        );

    }


    function makeSystemMessage(){

        return {

            role: "system",

            content:
                getSystemPrompt()

        };

    }


    function createHistory(){

        return [
            makeSystemMessage()
        ];

    }


    history =
        createHistory();


    /*
     * ============================================================
     * STATUS BROADCAST
     * ============================================================
     */

    function broadcastOnnxStatus(
        patch
    ){

        onnxStatus =
            Object.assign(
                {},
                onnxStatus,
                patch || {}
            );


        /*
         * Settings is an iframe, so CustomEvent on the
         * parent does not reach it.
         *
         * Send directly to same-origin iframes.
         */

        document
            .querySelectorAll("iframe")
            .forEach(frame => {

                try{

                    frame.contentWindow.postMessage(

                        {
                            type:
                                "LITTLE_HOLLOW_ONNX_STATUS",

                            status:
                                clone(
                                    onnxStatus
                                )

                        },

                        "*"

                    );

                }catch(error){}

            });


        /*
         * Also expose a normal event for code in the
         * parent page.
         */

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


    function broadcastPuterStatus(
        status,
        message
    ){

        const payload = {

            type:
                "LITTLE_HOLLOW_PUTER_STATUS",

            status,

            message:
                message || ""

        };


        document
            .querySelectorAll("iframe")
            .forEach(frame => {

                try{

                    frame.contentWindow.postMessage(
                        payload,
                        "*"
                    );

                }catch(error){}

            });


        try{

            window.dispatchEvent(
                new CustomEvent(
                    "littlehollow:puterstatus",
                    {
                        detail: payload
                    }
                )
            );

        }catch(error){}

    }


    /*
     * ============================================================
     * MESSAGE HELPERS
     * ============================================================
     */

    function getMessage(response){

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

            console.warn(
                "Invalid tool arguments:",
                raw
            );

            return {};

        }

    }


    function trimHistory(){

        if(
            history.length <=
            MAX_HISTORY_MESSAGES
        )
            return;


        history = [

            history[0],

            ...history.slice(
                -(MAX_HISTORY_MESSAGES - 1)
            )

        ];

    }


    /*
     * ============================================================
     * PUTER
     * ============================================================
     *
     * Puter.js is lazy-loaded.
     *
     * Nothing is fetched at page startup.
     * ============================================================
     */

    async function preparePuter(){

        if(
            puterReady &&
            window.puter
        ){

            broadcastPuterStatus(
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
                (resolve, reject) => {

                    broadcastPuterStatus(
                        "loading",
                        "Loading Puter.js..."
                    );


                    if(
                        window.puter
                    ){

                        puterReady =
                            true;

                        broadcastPuterStatus(
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

                                    broadcastPuterStatus(
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

                            }
                        );


                        return;

                    }


                    const script =
                        document.createElement(
                            "script"
                        );


                    script.src =
                        "https://js.puter.com/v2/";

                    script.async =
                        true;

                    script.dataset.littlehollowPuter =
                        "1";


                    script.onload =
                        () => {

                            if(
                                window.puter
                            ){

                                puterReady =
                                    true;

                                broadcastPuterStatus(
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

            broadcastPuterStatus(
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


        return await puterApi.ai.chat(

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
     * Imported ONLY when the user explicitly clicks
     * "LOAD ONNX MODEL" in Settings.
     * ============================================================
     */

    async function getTransformers(){

        if(
            transformersModule
        ){

            return transformersModule;

        }


        broadcastOnnxStatus({

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
     * WEBGPU CAPABILITY
     * ============================================================
     */

    async function getGpuCapabilities(){

        if(
            !("gpu" in navigator)
        ){

            return {

                available: false,

                shaderF16: false

            };

        }


        try{

            const adapter =
                await navigator
                    .gpu
                    .requestAdapter();


            if(!adapter){

                return {

                    available: false,

                    shaderF16: false

                };

            }


            const features =
                adapter.features;


            return {

                available: true,

                shaderF16:
                    features.has(
                        "shader-f16"
                    )

            };

        }catch(error){

            return {

                available: false,

                shaderF16: false

            };

        }

    }


    async function resolveOnnxDevice(
        requested,
        dtype
    ){

        const caps =
            await getGpuCapabilities();


        const dtypeNeedsF16 =
            String(
                dtype || ""
            ).toLowerCase()
            === "q4f16" ||
            String(
                dtype || ""
            ).toLowerCase()
            === "fp16";


        /*
         * Explicit WebGPU request.
         */

        if(
            requested === "webgpu"
        ){

            if(
                !caps.available
            ){

                throw new Error(
                    "WebGPU is not available."
                );

            }


            if(
                dtypeNeedsF16 &&
                !caps.shaderF16
            ){

                throw new Error(
                    "This WebGPU adapter does not support shader-f16. Choose ONNX Q4 or WASM."
                );

            }


            return "webgpu";

        }


        /*
         * Explicit WASM.
         */

        if(
            requested === "wasm"
        ){

            return "wasm";

        }


        /*
         * AUTO.
         *
         * Only choose WebGPU if it is actually suitable.
         */

        if(
            caps.available &&
            (
                !dtypeNeedsF16 ||
                caps.shaderF16
            )
        ){

            return "webgpu";

        }


        return "wasm";

    }


    /*
     * ============================================================
     * ONNX MODEL
     * ============================================================
     */

    async function prepareOnnx(
        overrideSettings
    ){

        /*
         * ONLY called intentionally from Settings or
         * application code.
         *
         * This function is NEVER called at startup.
         */

        if(
            onnxGenerator
        ){

            return {

                ok: true,

                state: "ready",

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


        const model =
            String(
                modelSettings.model || ""
            ).trim();


        if(!model){

            const error =
                new Error(
                    "No ONNX model is configured."
                );


            broadcastOnnxStatus({

                state: "error",

                progress: 0,

                message:
                    error.message

            });


            throw error;

        }


        onnxLoadingPromise =
            (async () => {

                try{

                    /*
                     * Resolve device before loading the
                     * expensive model.
                     */

                    const device =
                        await resolveOnnxDevice(

                            modelSettings.device,

                            modelSettings.dtype

                        );


                    const dtype =
                        modelSettings.dtype ||
                        (
                            device === "webgpu"
                                ? "q4"
                                : "q8"
                        );


                    broadcastOnnxStatus({

                        state:
                            "loading",

                        progress:
                            0,

                        message:
                            "Preparing ONNX model..."

                    });


                    const {
                        pipeline
                    } =
                        await getTransformers();


                    broadcastOnnxStatus({

                        state:
                            "downloading",

                        progress:
                            0,

                        message:
                            "Downloading model files..."

                    });


                    const generator =
                        await pipeline(

                            "text-generation",

                            model,

                            {

                                device,

                                dtype,

                                progress_callback:
                                    data => {

                                        const progress =
                                            typeof data.progress ===
                                            "number"
                                                ? Math.round(
                                                    data.progress
                                                  )
                                                : null;


                                        const file =
                                            data.file ||
                                            data.name ||
                                            "";


                                        if(
                                            progress != null
                                        ){

                                            broadcastOnnxStatus({

                                                state:
                                                    "downloading",

                                                progress,

                                                message:
                                                    file
                                                        ? (
                                                            "Downloading " +
                                                            file +
                                                            " — " +
                                                            progress +
                                                            "%"
                                                          )
                                                        : (
                                                            "Downloading model — " +
                                                            progress +
                                                            "%"
                                                          )

                                            });

                                        }else{

                                            broadcastOnnxStatus({

                                                state:
                                                    "loading",

                                                progress:
                                                    0,

                                                message:
                                                    file
                                                        ? "Loading " + file
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


                    broadcastOnnxStatus({

                        state:
                            "ready",

                        progress:
                            100,

                        message:
                            (
                                "Ready — " +
                                model +
                                " • " +
                                device.toUpperCase()
                            )

                    });


                    /*
                     * If Live mode was selected previously,
                     * Live can begin ONLY now, after explicit
                     * model setup has succeeded.
                     */

                    if(
                        getSettings().mode ===
                        "live"
                    ){

                        enableLive();

                    }


                    return {

                        ok: true,

                        state:
                            "ready",

                        model,

                        device,

                        dtype

                    };

                }catch(error){

                    /*
                     * Don't leave a half-created runtime around.
                     */

                    onnxGenerator =
                        null;

                    onnxModelId =
                        null;

                    onnxDevice =
                        null;

                    onnxDtype =
                        null;


                    broadcastOnnxStatus({

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

        /*
         * Transformers.js does not expose one universal
         * "destroy pipeline" API across all runtimes.
         *
         * Releasing our references allows garbage collection.
         */

        onnxGenerator =
            null;

        onnxModelId =
            null;

        onnxDevice =
            null;

        onnxDtype =
            null;


        broadcastOnnxStatus({

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

        /*
         * GGUF is deliberately explicit.
         *
         * This project does not bundle a GGUF browser engine yet.
         */

        if(
            window.LittleHollowGGUF &&
            typeof
                window.LittleHollowGGUF.prepare ===
                "function"
        ){

            return await window
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
                "GGUF runtime is not loaded. Open Settings and load/configure a GGUF runtime."
            );

        }


        return await window
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
         * IMPORTANT:
         *
         * Sending a message does NOT call prepareOnnx().
         *
         * The user must explicitly load the model from Settings.
         */

        if(
            !onnxGenerator
        ){

            throw new Error(
                "ONNX is not loaded. Open Settings → AI → ONNX and click LOAD / SET UP MODEL first."
            );

        }


        const generator =
            onnxGenerator;


        const generationOptions = {

            max_new_tokens:
                Math.max(
                    1,
                    Number(
                        currentSettings
                            .onnx
                            .maxNewTokens
                    ) || 512
                ),

            temperature:
                Number(
                    currentSettings
                        .onnx
                        .temperature
                ) || 0.7,

            do_sample: true

        };


        /*
         * Qwen3's Transformers.js model can accept chat
         * messages directly.
         *
         * Tool schemas are supplied when possible.
         */

        let output;


        try{

            output =
                await generator(

                    messages,

                    Object.assign(
                        {},
                        generationOptions,

                        {
                            tools:
                                Tools.definitions
                        }

                    )

                );

        }catch(error){

            /*
             * Some model/template combinations don't accept
             * the tools option through the generic pipeline.
             *
             * Retry once without the extra option.
             *
             * We do NOT reload/re-download the model.
             */

            console.warn(
                "ONNX tool-aware generation failed; retrying without explicit tools option.",
                error
            );


            output =
                await generator(

                    messages,

                    generationOptions

                );

        }


        return normalizeOnnxOutput(
            output
        );

    }


    function normalizeOnnxOutput(
        output
    ){

        if(
            Array.isArray(output) &&
            output.length
        ){

            const item =
                output[0];


            /*
             * Chat output often comes back as:
             *
             * generated_text: [
             *   ...messages
             * ]
             */

            if(
                item &&
                Array.isArray(
                    item.generated_text
                )
            ){

                const messages =
                    item.generated_text;


                const last =
                    messages[
                        messages.length - 1
                    ];


                if(last){

                    return {

                        role:
                            last.role ||
                            "assistant",

                        content:
                            last.content ||
                            "",

                        ...(last.tool_calls
                            ? {
                                tool_calls:
                                    last.tool_calls
                              }
                            : {})

                    };

                }

            }


            /*
             * Plain generated string.
             */

            if(
                item &&
                typeof
                    item.generated_text ===
                    "string"
            ){

                return {

                    role:
                        "assistant",

                    content:
                        item.generated_text

                };

            }


            if(
                item &&
                item.message
            ){

                return getMessage(
                    item
                );

            }

        }


        return getMessage(
            output
        );

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
     * TOOL EXECUTION
     * ============================================================
     */

    async function executeToolCall(
        call,
        log
    ){

        const fnName =
            call &&
            call.function
                ? call.function.name
                : call &&
                  call.name;


        const rawArgs =
            call &&
            call.function
                ? call.function.arguments
                : call &&
                  call.input;


        if(!fnName){

            const result = {

                ok:
                    false,

                summary:
                    "Malformed tool call."

            };


            log.push({

                name:
                    "__invalid_tool_call__",

                summary:
                    result.summary

            });


            return result;

        }


        const args =
            safeParseArgs(
                rawArgs
            );


        let result;


        try{

            result =
                await Tools.execute(
                    fnName,
                    args
                );

        }catch(error){

            console.error(
                "Tool execution failed:",
                fnName,
                error
            );


            result = {

                ok:
                    false,

                summary:
                    "Tool error: " +
                    (
                        error &&
                        error.message
                            ? error.message
                            : String(error)
                    )

            };

        }


        log.push({

            name:
                fnName,

            summary:
                result &&
                result.summary
                    ? result.summary
                    : "completed"

        });


        return result;

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
                    "Could not collect Little Hollow state:",
                    error
                );

            }

        }


        return null;

    }


    function addStateToInput(
        text
    ){

        const state =
            getStateSnapshot();


        if(
            state == null
        ){

            return String(
                text || ""
            );

        }


        let serialized = "";


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
        inputText,
        options
    ){

        options =
            options || {};


        settings =
            getSettings();


        /*
         * If a local provider hasn't been explicitly loaded,
         * fail immediately instead of silently downloading.
         */

        if(
            settings.provider === "onnx" &&
            !onnxGenerator
        ){

            return {

                ok:
                    false,

                visibleMessage:
                    "ONNX isn't set up yet. Open Settings → AI → ONNX and click LOAD / SET UP MODEL.",

                log: []

            };

        }


        if(
            settings.provider === "gguf" &&
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
                    "GGUF isn't set up yet. Open Settings and load a GGUF browser runtime/model.",

                log: []

            };

        }


        const includeState =
            !!options.includeState;


        let content =
            String(
                inputText == null
                    ? ""
                    : inputText
            );


        if(
            includeState
        ){

            content =
                addStateToInput(
                    content
                );

        }


        history.push({

            role:
                "user",

            content

        });


        trimHistory();


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
                        settings
                            .agent
                            .maxToolRounds
                    ) || 8
                );


            let finished =
                false;


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


                const msg =
                    getMessage(
                        response
                    );


                const toolCalls =
                    Array.isArray(
                        msg.tool_calls
                    )
                        ? msg.tool_calls
                        : [];


                history.push({

                    role:
                        "assistant",

                    content:
                        msg.content ||
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

                        const result =
                            await executeToolCall(
                                call,
                                log
                            );


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


                    trimHistory();

                    continue;

                }


                finalText =
                    messageText(
                        msg
                    );


                finished =
                    true;


                break;

            }


            if(!finished){

                log.push({

                    name:
                        "__agent__",

                    summary:
                        "Maximum tool rounds reached."

                });

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


        const visibleMessage =
            finalText
                ? AvatarText.process(
                    finalText
                  )
                : "";


        return {

            ok:
                true,

            visibleMessage,

            log

        };

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
                    settings.mode ===
                    "live"

            }

        );

    }


    /*
     * ============================================================
     * LIVE MODE
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


    function stableHash(
        value
    ){

        let text = "";


        try{

            text =
                JSON.stringify(
                    value
                );

        }catch(error){

            text =
                String(value);

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
         * Local providers MUST already be loaded.
         *
         * Live may never initialize them.
         */

        if(
            currentSettings.provider === "onnx" &&
            !onnxGenerator
        ){

            return;

        }


        if(
            currentSettings.provider === "gguf" &&
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

            livePending =
                false;

            return;

        }


        /*
         * No provider auto-setup here.
         */

        if(
            currentSettings.provider ===
            "onnx" &&
            !onnxGenerator
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


        const stateHash =
            stableHash(
                state
            );


        if(
            stateHash ===
            lastLiveHash
        ){

            livePending =
                false;

            return;

        }


        lastLiveHash =
            stateHash;

        livePending =
            false;

        liveRunning =
            true;

        lastLiveRun =
            now;


        try{

            await runAgent(

                [
                    "LIVE EVENT: ",
                    String(
                        reason ||
                        "Little Hollow state changed."
                    ),
                    ". Observe the supplied state and act only if useful. ",
                    "Do not produce unnecessary user-facing text."
                ].join(""),

                {

                    includeState:
                        true

                }

            );

        }catch(error){

            console.error(
                "Little Hollow live agent error:",
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
         * IMPORTANT:
         *
         * This function is now only called AFTER an explicitly
         * prepared local model is ready, or after application code
         * deliberately enables Live.
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
     * STATE CHANGES
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


            /*
             * This can schedule an already-loaded runtime,
             * but cannot cause model setup.
             */

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
     * SETTINGS CHANGES
     * ============================================================
     */

    function refreshSettings(){

        settings =
            getSettings();


        history[0] =
            makeSystemMessage();


        /*
         * IMPORTANT:
         *
         * Changing mode to Live does NOT start the model.
         *
         * If ONNX is already loaded, it may start Live.
         * Otherwise nothing happens.
         */

        if(
            settings.mode ===
            "live"
        ){

            if(
                settings.provider ===
                "puter"
            ){

                /*
                 * Puter may load on demand.
                 *
                 * But we still don't invoke AI automatically
                 * just because mode changed.
                 */

            }else if(
                settings.provider ===
                "onnx"
            ){

                if(
                    onnxGenerator
                ){

                    enableLive();

                }

            }

        }else{

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
        () => {

            refreshSettings();

        }
    );


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
     * RUNTIME STATUS
     * ============================================================
     */

    function getRuntimeStatus(){

        return {

            provider:
                getSettings().provider,

            puterReady,

            onnx: {

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
     * IMPORTANT:
     *
     * THERE IS DELIBERATELY NO:
     *
     * if(mode === "live") enableLive();
     *
     * here.
     *
     * The page opening must never initialize a local model.
     * ============================================================
     */

})();
