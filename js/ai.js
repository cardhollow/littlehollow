/* js/ai.js */

(function(){

    /*
     * ============================================================
     * LITTLE HOLLOW AI
     *
     * Local ONNX behavior intentionally mirrors the original
     * standalone working HTML:
     *
     *   Transformers.js 4.2.0
     *   Qwen2.5-0.5B-Instruct
     *   Q4
     *   WebGPU
     *
     * IMPORTANT:
     *
     * No ONNX model is loaded at startup.
     *
     * The model is loaded ONLY by:
     *
     *     LittleHollowAI.prepareOnnx()
     *
     * which Settings calls explicitly.
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


            if(!raw)
                return clone(
                    DEFAULTS
                );


            const saved =
                merge(
                    DEFAULTS,
                    JSON.parse(raw)
                );


            /*
             * Migrate the Qwen3 configuration we were testing
             * to the exact model used by the standalone HTML.
             */

            if(
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


    let settings =
        getSettings();


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


    /*
     * ============================================================
     * HISTORY
     * ============================================================
     */

    let history = [];


    function makeSystemMessage(){

        return {

            role:
                "system",

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


    function trimHistory(){

        if(
            history.length <= 80
        )
            return;


        history = [

            history[0],

            ...history.slice(
                -79
            )

        ];

    }


    /*
     * ============================================================
     * ONNX RUNTIME STATE
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
     * PUTER STATE
     * ============================================================
     */

    let puterLoadingPromise =
        null;


    let puterReady =
        false;


    /*
     * ============================================================
     * SEND STATUS TO SETTINGS
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
        )
            return raw;


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


    /*
     * ============================================================
     * PUTER
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


                    const script =
                        document.createElement(
                            "script"
                        );


                    script.async =
                        true;


                    script.src =
                        "https://js.puter.com/v2/";


                    script.dataset
                        .littlehollowPuter =
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

        const puter =
            await preparePuter();


        return puter.ai.chat(

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
     * Only imported after Settings explicitly requests ONNX.
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
     * DEVICE
     * ============================================================
     *
     * Match the original standalone test.
     *
     * We check navigator.gpu rather than rejecting based on a
     * manual adapter feature probe before pipeline().
     * ============================================================
     */

    function resolveOnnxDevice(
        requested
    ){

        if(
            requested ===
            "webgpu"
        ){

            if(
                !("gpu" in navigator)
            ){

                throw new Error(
                    "WebGPU is not available in this browser context."
                );

            }


            return "webgpu";

        }


        if(
            requested ===
            "wasm"
        ){

            return "wasm";

        }


        /*
         * AUTO
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
     * PREPARE ONNX
     * ============================================================
     */

    async function prepareOnnx(
        overrideSettings
    ){

        /*
         * Explicitly invoked ONLY from Settings.
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
         * Make this exactly match the standalone page.
         */

        const model =
            (
                modelSettings.model &&
                modelSettings.model.trim()
            )
                ? modelSettings.model.trim()
                : "onnx-community/Qwen2.5-0.5B-Instruct";


        const device =
            resolveOnnxDevice(
                modelSettings.device || "webgpu"
            );


        /*
         * Use the selected dtype, but default to Q4.
         */

        let dtype =
            modelSettings.dtype ||
            "q4";


        /*
         * The standalone working configuration is Q4.
         *
         * Do not silently use the problematic f16 path.
         */

        if(
            dtype === "q4f16" &&
            device === "webgpu"
        ){

            dtype =
                "q4";

            console.warn(
                "Q4F16 was selected for WebGPU. Using Q4 to match the known-working standalone configuration."
            );

        }


        onnxLoadingPromise =
            (async () => {

                try{

                    /*
                     * IMPORTANT:
                     *
                     * This is the same runtime shape as the
                     * standalone HTML.
                     */

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
                                "Preparing " +
                                model +
                                "..."
                            )

                    });


                    const generator =
                        await pipeline(

                            "text-generation",

                            model,

                            {

                                device:

                                    device,

                                dtype:

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


                    /*
                     * IMPORTANT:
                     *
                     * Only now do we commit the runtime.
                     */

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


                    /*
                     * If Live was selected already, it can
                     * start ONLY after the explicit setup.
                     */

                    if(
                        getSettings().mode ===
                        "live"
                    ){

                        enableLive();

                    }


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
     *
     * Keep this close to the original standalone HTML.
     *
     * Qwen2.5 receives a rendered ChatML-style prompt.
     *
     * ============================================================
     */

    function buildOnnxPrompt(){

        let prompt =
            "<|im_start|>system\n" +
            getSystemPrompt() +
            "\n<|im_end|>\n";


        for(
            const item of history.slice(1)
        ){

            const role =
                item.role ||
                "user";


            /*
             * Ignore internal tool messages in the basic
             * standalone-style ONNX text path.
             */

            if(
                role === "tool"
            )
                continue;


            let content =
                messageText(
                    item
                );


            if(
                !content
            )
                continue;


            prompt +=
                "<|im_start|>" +
                role +
                "\n" +
                content +
                "\n<|im_end|>\n";

        }


        prompt +=
            "<|im_start|>assistant\n";


        return prompt;

    }


    async function generateOnnx(
        currentSettings
    ){

        if(
            !onnxGenerator
        ){

            throw new Error(
                "ONNX is not loaded. Open Settings → AI → ONNX and click DOWNLOAD / LOAD MODEL."
            );

        }


        const generator =
            onnxGenerator;


        const prompt =
            buildOnnxPrompt();


        const output =
            await generator(

                prompt,

                {

                    max_new_tokens:
                        Math.max(
                            16,
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

                }

            );


        let response =
            "";


        if(
            Array.isArray(output) &&
            output.length
        ){

            response =
                output[0] &&
                output[0].generated_text
                    ? output[0].generated_text
                    : "";

        }


        /*
         * Strip the prompt.
         */

        if(
            response.startsWith(
                prompt
            )
        ){

            response =
                response.slice(
                    prompt.length
                );

        }


        /*
         * Clean Qwen special tokens.
         */

        response =
            response
                .replace(
                    /<\|im_end\|>/g,
                    ""
                )
                .replace(
                    /<\|im_start\|>assistant/g,
                    ""
                )
                .trim();


        return {

            role:
                "assistant",

            content:
                response

        };

    }


    /*
     * ============================================================
     * PROVIDER
     * ============================================================
     */

    async function generate(
        currentSettings
    ){

        switch(
            currentSettings.provider
        ){

            case "puter":

                return generatePuter(
                    history,
                    currentSettings
                );


            case "onnx":

                return generateOnnx(
                    currentSettings
                );


            case "gguf":

                return generateGguf(
                    history,
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

        const name =
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


        if(!name){

            return {

                ok:
                    false,

                summary:
                    "Malformed tool call."

            };

        }


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

            console.error(
                "Tool execution failed:",
                name,
                error
            );


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

        }catch(error){}


        if(!serialized)
            return String(
                text || ""
            );


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
     * MAIN AGENT
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
         * No implicit local setup.
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
                    "ONNX is not loaded. Open Settings and explicitly load the model first.",

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
                    "GGUF is not loaded. Open Settings and initialize it first.",

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


            for(
                let round = 0;
                round < maxRounds;
                round++
            ){

                const response =
                    await generate(
                        settings
                    );


                const message =
                    getMessage(
                        response
                    );


                /*
                 * Puter can return native tool_calls.
                 */

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
     * SEND
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
     * LIVE
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
         * NEVER initialize a model here.
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
            hashState(
                state
            );


        if(
            stateHash ===
            lastLiveHash
        ){

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

                (
                    "LIVE EVENT: " +
                    String(
                        reason ||
                        "Little Hollow state changed."
                    ) +
                    ". Observe the current state and act only if useful. " +
                    "Do not produce unnecessary user-facing text."
                ),

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

        /*
         * Called only when a runtime is already loaded.
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
            )
                return;


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
         * Changing settings NEVER initializes a model.
         */

        if(
            settings.mode !==
            "live"
        ){

            disableLive();

            return;

        }


        /*
         * Only an already-loaded ONNX runtime can be
         * activated by Live.
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
     * NO STARTUP CALLS.
     *
     * There is deliberately NO:
     *
     *   prepareOnnx()
     *   preparePuter()
     *   enableLive()
     *   pipeline()
     *
     * here.
     * ============================================================
     */

})();
