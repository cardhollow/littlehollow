(function(){

    /*
     * ============================================================
     * LITTLE HOLLOW AI
     * ============================================================
     *
     * One agent interface.
     *
     * Providers:
     *   - puter
     *   - onnx
     *   - gguf
     *
     * Modes:
     *   - interactive
     *   - agent
     *   - live
     *
     * The user controls provider/model settings.
     *
     * Little Hollow controls:
     *   - system prompt
     *   - tools
     *   - site state
     *   - agent behavior
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

            dtype: "q4f16",

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


    function getSystemPrompt(){

        /*
         * NEVER read a user-editable system prompt.
         *
         * The source of truth is systemPrompt.js.
         */

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


    function trimHistory(){

        if(
            history.length <=
            MAX_HISTORY_MESSAGES
        )
            return;


        /*
         * Always preserve the system message.
         */

        const system =
            history[0];


        history =
            [
                system,

                ...history.slice(
                    -(MAX_HISTORY_MESSAGES - 1)
                )

            ];

    }


    /*
     * ============================================================
     * MESSAGE NORMALIZATION
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

                role: "assistant",

                content: response

            };

        }


        return {

            role: "assistant",

            content:
                response &&
                response.toString
                    ? response.toString()
                    : ""

        };

    }


    function messageText(message){

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


    function safeParseArgs(raw){

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


    /*
     * ============================================================
     * PUTER
     * ============================================================
     */

    async function waitForPuter(
        timeout = 15000
    ){

        const started =
            Date.now();


        while(
            !window.puter
        ){

            if(
                Date.now() - started >
                timeout
            ){

                throw new Error(
                    "Puter.js did not load."
                );

            }


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );

        }


        return window.puter;

    }


    async function generatePuter(
        messages,
        settings
    ){

        const puterApi =
            await waitForPuter();


        return await puterApi.ai.chat(

            messages,

            {

                model:
                    settings.puter.model,

                tools:
                    Tools.definitions

            }

        );

    }


    /*
     * ============================================================
     * ONNX / TRANSFORMERS.JS
     * ============================================================
     *
     * This provider dynamically loads Transformers.js once.
     *
     * Supported model repositories must be compatible with
     * Transformers.js / ONNX Runtime Web.
     *
     * ============================================================
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


    async function getTransformers(){

        if(
            transformersModule
        ){

            return transformersModule;

        }


        transformersModule =
            await import(
                "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1"
            );


        return transformersModule;

    }


    function resolveOnnxDevice(
        requested
    ){

        if(
            requested === "webgpu"
        ){

            if(
                !(
                    "gpu" in
                    navigator
                )
            ){

                throw new Error(
                    "WebGPU is not available in this browser."
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
         * AUTO
         */

        if(
            "gpu" in navigator
        ){

            return "webgpu";

        }


        return "wasm";

    }


    async function loadOnnx(
        settings,
        progressCallback
    ){

        const model =
            String(
                settings.onnx.model || ""
            ).trim();


        if(!model){

            throw new Error(
                "No ONNX model configured."
            );

        }


        const device =
            resolveOnnxDevice(
                settings.onnx.device
            );


        const dtype =
            settings.onnx.dtype ||
            (
                device === "webgpu"
                    ? "q4f16"
                    : "q8"
            );


        if(
            onnxGenerator &&
            onnxModelId === model &&
            onnxDevice === device &&
            onnxDtype === dtype
        ){

            return onnxGenerator;

        }


        const {
            pipeline,
            env
        } =
            await getTransformers();


        env.useBrowserCache =
            true;


        env.allowRemoteModels =
            true;


        if(
            progressCallback
        ){

            progressCallback({
                status: "loading",
                message:
                    "Loading ONNX model..."
            });

        }


        onnxGenerator =
            await pipeline(

                "text-generation",

                model,

                {

                    device,

                    dtype,

                    progress_callback:
                        data => {

                            if(
                                progressCallback
                            ){

                                progressCallback(
                                    data
                                );

                            }

                        }

                }

            );


        onnxModelId =
            model;

        onnxDevice =
            device;

        onnxDtype =
            dtype;


        return onnxGenerator;

    }


    function normalizeOnnxOutput(
        output,
        prompt
    ){

        /*
         * Transformers.js commonly returns:
         *
         * [
         *   {
         *      generated_text: ...
         *   }
         * ]
         *
         * Depending on pipeline/model this can instead
         * be a string or message array.
         */

        if(
            Array.isArray(output) &&
            output.length
        ){

            const item =
                output[0];


            if(
                item &&
                typeof item.generated_text === "string"
            ){

                let text =
                    item.generated_text;


                if(
                    prompt &&
                    text.startsWith(prompt)
                ){

                    text =
                        text.slice(
                            prompt.length
                        );

                }


                return {

                    role: "assistant",

                    content:
                        text.trim()

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


        if(
            typeof output === "string"
        ){

            return {

                role: "assistant",

                content:
                    output.trim()

            };

        }


        return getMessage(
            output
        );

    }


    async function generateOnnx(
        messages,
        settings,
        progressCallback
    ){

        const generator =
            await loadOnnx(
                settings,
                progressCallback
            );


        /*
         * Transformers.js can pass chat messages directly.
         *
         * The model's chat template decides how tools are
         * represented. Models without tool-aware chat templates
         * may simply ignore the tools argument.
         */

        let output;


        try{

            output =
                await generator(

                    messages,

                    {

                        max_new_tokens:
                            Math.max(
                                1,
                                Number(
                                    settings
                                        .onnx
                                        .maxNewTokens
                                ) || 512
                            ),

                        temperature:
                            Number(
                                settings
                                    .onnx
                                    .temperature
                            ) || 0.7,

                        do_sample: true,

                        tools:
                            Tools.definitions

                    }

                );

        }catch(firstError){

            /*
             * Some model/runtime combinations do not accept
             * the tools option through the pipeline call.
             *
             * Retry without it rather than making the provider
             * completely unusable.
             */

            console.warn(
                "ONNX tool-aware generation failed; retrying without tools.",
                firstError
            );


            output =
                await generator(

                    messages,

                    {

                        max_new_tokens:
                            Math.max(
                                1,
                                Number(
                                    settings
                                        .onnx
                                        .maxNewTokens
                                ) || 512
                            ),

                        temperature:
                            Number(
                                settings
                                    .onnx
                                    .temperature
                            ) || 0.7,

                        do_sample: true

                    }

                );

        }


        /*
         * We don't know the rendered prompt string here,
         * so let the pipeline-normalized object through.
         */

        return normalizeOnnxOutput(
            output,
            ""
        );

    }


    /*
     * ============================================================
     * GGUF
     * ============================================================
     *
     * Little Hollow does not assume a particular GGUF runtime.
     *
     * A llama.cpp/WebGPU wrapper can expose:
     *
     * window.LittleHollowGGUF.chat(...)
     *
     * This keeps the agent layer independent from the runtime.
     * ============================================================
     */

    async function generateGguf(
        messages,
        settings
    ){

        if(
            !window.LittleHollowGGUF ||
            typeof
                window.LittleHollowGGUF.chat !==
                "function"
        ){

            throw new Error(
                "No GGUF browser runtime is installed."
            );

        }


        return await window
            .LittleHollowGGUF
            .chat({

                messages,

                tools:
                    Tools.definitions,

                model:
                    settings.gguf.model,

                context:
                    settings.gguf.context,

                threads:
                    settings.gguf.threads,

                max_new_tokens:
                    settings.gguf.maxNewTokens,

                temperature:
                    settings.gguf.temperature

            });

    }


    /*
     * ============================================================
     * PROVIDER ROUTER
     * ============================================================
     */

    async function generate(
        messages,
        settings,
        progressCallback
    ){

        switch(
            settings.provider
        ){

            case "puter":

                return generatePuter(
                    messages,
                    settings
                );


            case "onnx":

                return generateOnnx(
                    messages,
                    settings,
                    progressCallback
                );


            case "gguf":

                return generateGguf(
                    messages,
                    settings
                );


            default:

                throw new Error(
                    "Unsupported AI provider: " +
                    settings.provider
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

            return {

                ok: false,

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

                ok: false,

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

            name: fnName,

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


    function serializeState(
        state
    ){

        if(
            state == null
        ){

            return "";

        }


        try{

            return JSON.stringify(
                state,
                null,
                2
            );

        }catch(error){

            return "";

        }

    }


    /*
     * ============================================================
     * INPUT MESSAGE CREATION
     * ============================================================
     */

    function createInputMessage(
        text,
        includeState
    ){

        let content =
            String(
                text == null
                    ? ""
                    : text
            );


        if(
            includeState
        ){

            const state =
                getStateSnapshot();


            const serialized =
                serializeState(
                    state
                );


            if(serialized){

                content +=
                    "\n\n[LITTLE HOLLOW CURRENT STATE]\n" +
                    serialized +
                    "\n[/LITTLE HOLLOW CURRENT STATE]";

            }

        }


        return {

            role: "user",

            content

        };

    }


    /*
     * ============================================================
     * CORE AGENT EXECUTION
     * ============================================================
     */

    async function runAgent(
        userText,
        options
    ){

        options =
            options || {};


        const settings =
            getSettings();


        const includeState =
            !!options.includeState;


        history.push(
            createInputMessage(
                userText,
                includeState
            )
        );


        trimHistory();


        Avatar.setEye(
            "thinking",
            -1
        );


        const log = [];

        let finalText = "";


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

                Avatar.setEye(
                    "thinking",
                    -1
                );


                /*
                 * Add state to the model only when requested.
                 *
                 * For Live mode this happens once per event.
                 */

                const response =
                    await generate(
                        history,
                        settings,
                        options.progressCallback
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

                    role: "assistant",

                    content:
                        msg.content || "",

                    ...(toolCalls.length
                        ? {
                            tool_calls:
                                toolCalls
                          }
                        : {})

                });


                /*
                 * =================================================
                 * TOOL ROUND
                 * =================================================
                 */

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

                            role: "tool",

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


                    /*
                     * Continue so the model can see tool results.
                     */

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

                    name: "__agent__",

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

                ok: false,

                visibleMessage:
                    "AI error: " +
                    (
                        error &&
                        error.message
                            ? error.message
                            : String(error)
                    ),

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

            ok: true,

            visibleMessage,

            log

        };

    }


    /*
     * ============================================================
     * PUBLIC SEND
     * ============================================================
     *
     * Existing application code can continue calling:
     *
     * LittleHollowAI.send("hello")
     *
     * ============================================================
     */

    async function send(
        userText
    ){

        const settings =
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
     * LIVE AGENT
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


        /*
         * Lightweight string hash.
         */

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

        const settings =
            getSettings();


        if(
            settings.mode !== "live"
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
                        settings
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

            /*
             * One event is enough to request another check
             * after the active run finishes.
             */

            livePending =
                true;

            return;

        }


        const settings =
            getSettings();


        if(
            settings.mode !== "live"
        ){

            livePending =
                false;

            return;

        }


        const now =
            Date.now();


        const minimumInterval =
            Math.max(
                1000,
                Number(
                    settings
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


        /*
         * Don't ask the model again if absolutely nothing
         * important changed.
         */

        if(
            stateHash ===
            lastLiveHash &&
            !livePending
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

                [
                    "LIVE EVENT: ",
                    String(
                        reason ||
                        "The current Little Hollow state changed."
                    ),
                    ". Observe the supplied current state and act only if useful. ",
                    "Do not produce a user-facing response unless necessary."
                ].join(""),

                {

                    includeState: true

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

    }


    /*
     * ============================================================
     * STATE CHANGE LISTENER
     * ============================================================
     */

    window.addEventListener(
        "littlehollow:statechange",
        event => {

            const settings =
                getSettings();


            if(
                settings.mode !== "live"
            ){

                return;

            }


            const detail =
                event.detail || {};


            scheduleLive(
                detail.reason ||
                "Little Hollow state changed."
            );

        }
    );


    /*
     * ============================================================
     * SETTINGS CHANGE LISTENER
     * ============================================================
     */

    window.addEventListener(
        "storage",
        event => {

            if(
                event.key !==
                SETTINGS_KEY
            ){

                return;

            }


            history[0] =
                makeSystemMessage();


            const settings =
                getSettings();


            if(
                settings.mode === "live"
            ){

                enableLive();

            }else{

                disableLive();

            }

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
     * Start Live mode when the app boots.
     */

    if(
        getSettings().mode === "live"
    ){

        enableLive();

    }

})();
