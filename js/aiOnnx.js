/* js/aiOnnx.js */
(function(){
    "use strict";

    /*
     * ============================================================
     * LITTLE HOLLOW ONNX PROVIDER
     * ============================================================
     *
     * Completely independent ONNX implementation.
     *
     * The model runs in a Web Worker.
     *
     * Main page
     *    |
     *    v
     * aiOnnx.js
     *    |
     *    v
     * Web Worker
     *    |
     *    v
     * Transformers.js
     *    |
     *    v
     * ONNX Runtime
     *
     * Tool execution remains on the main thread through the
     * executeTool callback supplied by ai.js.
     * ============================================================
     */

    const provider = {

        id:
            "onnx",

        loadingPromise:
            null,

        worker:
            null,

        ready:
            false,

        requestSeq:
            0,

        pending:
            new Map(),

        settings:
            null,

        status:{

            state:
                "not_loaded",

            progress:
                0,

            message:
                "ONNX model is not loaded."

        }

    };


    /*
     * ============================================================
     * HELPERS
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


    function makeId(){

        return (
            "call_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2)
        );

    }


    function parseArgs(
        value
    ){

        if(
            value == null
        ){

            return {};

        }


        if(
            typeof value ===
                "object"
        ){

            return value;

        }


        try{

            return JSON.parse(
                value
            );

        }catch(error){

            return {};

        }

    }


    /*
     * ============================================================
     * STATUS
     * ============================================================
     */

    function emitStatus(
        patch
    ){

        provider.status =
            Object.assign(
                {},
                provider.status,
                patch ||
                {}
            );


        try{

            window.dispatchEvent(

                new CustomEvent(
                    "littlehollow:onnxstatus",
                    {
                        detail:
                            clone(
                                provider.status
                            )
                    }
                )

            );

        }catch(error){}


        document
            .querySelectorAll(
                "iframe"
            )
            .forEach(
                frame => {

                    try{

                        frame
                            .contentWindow
                            .postMessage(
                                {

                                    type:
                                        "LITTLE_HOLLOW_ONNX_STATUS",

                                    status:
                                        clone(
                                            provider.status
                                        )

                                },

                                "*"

                            );

                    }catch(error){}

                }
            );

    }


    /*
     * ============================================================
     * WEB WORKER SOURCE
     * ============================================================
     */

    function makeWorkerSource(){

        return `

import {
    pipeline,
    TextStreamer,
    env
}
from
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";


env.allowLocalModels =
    false;


env.allowRemoteModels =
    true;


env.useBrowserCache =
    true;


env.useWasmCache =
    true;


let generator =
    null;


let tokenizer =
    null;


let activeDevice =
    "wasm";


let activeDtype =
    "q8";


function send(
    message
){

    self.postMessage(
        message
    );

}


function textOf(
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


function parseArgs(
    value
){

    if(
        value == null
    ){

        return {};

    }


    if(
        typeof value ===
            "object"
    ){

        return value;

    }


    try{

        return JSON.parse(
            value
        );

    }catch(error){

        return {};

    }

}


/*
 * ============================================================
 * PROMPT
 * ============================================================
 */

function buildPrompt(
    messages,
    tools
){

    let output =
        "<|im_start|>system\\\\n";


    const system =
        (
            messages ||
            []
        )
        .find(
            item =>
                item &&
                item.role ===
                    "system"
        );


    output +=
        system &&
        typeof system.content ===
            "string"
            ? system.content
            : "";


    output +=
        "\\\\n\\\\nAVAILABLE TOOLS:\\\\n";


    output +=
        JSON.stringify(
            tools ||
            [],
            null,
            2
        );


    output +=
        "\\\\n\\\\n";


    output +=
        "TOOL CALL FORMAT:\\\\n";


    output +=
        "<tool_call>{\\\\\\"name\\\\\\":\\\\\\"TOOL_NAME\\\\\\",\\\\\\"arguments\\\\\\":{}}</tool_call>\\\\n";


    output +=
        "When the user asks you to perform an action, use the appropriate tool. ";


    output +=
        "Do not claim an action was performed without a successful tool result.\\\\n";


    output +=
        "<|im_end|>\\\\n";


    for(
        const item of
        messages ||
        []
    ){

        if(
            !item ||
            item.role ===
                "system"
        ){

            continue;

        }


        const role =
            item.role ||
            "user";


        const content =
            Array.isArray(
                item.content
            )

                ? item.content
                    .map(
                        part =>
                            typeof part ===
                                "string"
                                ? part
                                : (
                                    part &&
                                    part.text
                                ) ||
                                ""
                    )
                    .join("")

                : String(
                    item.content ||
                    ""
                  );


        if(
            role ===
                "tool"
        ){

            output +=
                "<|im_start|>tool\\\\n" +
                content +
                "\\\\n<|im_end|>\\\\n";


            continue;

        }


        if(
            content
        ){

            output +=
                "<|im_start|>" +
                role +
                "\\\\n" +
                content +
                "\\\\n<|im_end|>\\\\n";

        }


        if(
            role ===
                "assistant" &&
            Array.isArray(
                item.tool_calls
            )
        ){

            for(
                const call of
                item.tool_calls
            ){

                const name =
                    call &&
                    call.function
                        ? call.function.name
                        : "";


                const args =
                    call &&
                    call.function
                        ? parseArgs(
                            call.function.arguments
                          )
                        : {};


                output +=
                    "<|im_start|>assistant\\\\n" +
                    "<tool_call>" +
                    JSON.stringify({
                        name,
                        arguments:
                            args
                    }) +
                    "</tool_call>\\\\n" +
                    "<|im_end|>\\\\n";

            }

        }

    }


    output +=
        "<|im_start|>assistant\\\\n";


    return output;

}


/*
 * ============================================================
 * GPU TEST
 * ============================================================
 */

async function hasWebGPU(){

    if(
        typeof navigator ===
            "undefined"
    ){

        return false;

    }


    if(
        !navigator.gpu
    ){

        return false;

    }


    try{

        const adapter =
            await navigator.gpu
                .requestAdapter();


        return !!adapter;

    }catch(error){

        return false;

    }

}


/*
 * ============================================================
 * INIT MODEL
 * ============================================================
 */

async function initialize(
    config
){

    const model =
        (
            config &&
            config.model
        ) ||
        "onnx-community/Qwen2.5-0.5B-Instruct";


    let requestedDevice =
        (
            config &&
            config.device
        ) ||
        "webgpu";


    let requestedDtype =
        (
            config &&
            config.dtype
        ) ||
        "q4";


    let device =
        requestedDevice;


    /*
     * Real WebGPU adapter test.
     */

    if(
        device ===
            "webgpu"
    ){

        const available =
            await hasWebGPU();


        if(
            !available
        ){

            device =
                "wasm";

        }

    }


    /*
     * Q4F16 is avoided for the known-working WebGPU setup.
     */

    if(
        device ===
            "webgpu" &&
        requestedDtype ===
            "q4f16"
    ){

        requestedDtype =
            "q4";

    }


    /*
     * Use Q8 on WASM unless user deliberately configured
     * something else.
     */

    if(
        device ===
            "wasm" &&
        !requestedDtype
    ){

        requestedDtype =
            "q8";

    }


    activeDevice =
        device;


    activeDtype =
        requestedDtype;


    send({

        type:
            "status",

        state:
            "loading",

        message:
            "Loading " +
            model +
            " • " +
            device.toUpperCase() +
            " • " +
            requestedDtype.toUpperCase()

    });


    const runtime =
        await import(
            "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0"
        );


    let dtype =
        requestedDtype;


    if(
        device ===
            "wasm" &&
        dtype ===
            "q4"
    ){

        dtype =
            "q8";

    }


    generator =
        await runtime.pipeline(

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
                            typeof data.progress ===
                                "number"
                        ){

                            send({

                                type:
                                    "progress",

                                progress:
                                    Math.round(
                                        data.progress
                                    ),

                                message:
                                    "Downloading " +
                                    (
                                        data.file ||
                                        data.name ||
                                        "model"
                                    )

                            });

                        }

                    }

            }

        );


    tokenizer =
        generator.tokenizer;


    activeDtype =
        dtype;


    send({

        type:
            "ready",

        device:
            device,

        dtype:
            dtype

    });


    return {

        model,

        device,

        dtype

    };

}


/*
 * ============================================================
 * GENERATION
 * ============================================================
 */

async function generate(
    prompt,
    config
){

    let streamed =
        "";


    let lastSend =
        0;


    let timer =
        null;


    const streamer =
        new TextStreamer(

            tokenizer,

            {

                skip_prompt:
                    true,

                skip_special_tokens:
                    true,

                callback_function:
                    chunk => {

                        streamed +=
                            chunk;


                        const now =
                            performance.now();


                        if(
                            now -
                            lastSend >=
                                40
                        ){

                            lastSend =
                                now;


                            send({

                                type:
                                    "token",

                                text:
                                    streamed

                            });

                        }else if(
                            !timer
                        ){

                            timer =
                                setTimeout(

                                    () => {

                                        timer =
                                            null;


                                        lastSend =
                                            performance.now();


                                        send({

                                            type:
                                                "token",

                                            text:
                                                streamed

                                        });

                                    },

                                    40

                                );

                        }

                    }

            }

        );


    try{

        const output =
            await generator(

                prompt,

                {

                    max_new_tokens:
                        Math.max(
                            16,
                            Number(
                                config?.maxNewTokens
                            ) || 256
                        ),

                    temperature:
                        Number(
                            config?.temperature
                        ) || 0.7,

                    do_sample:
                        true,

                    top_p:
                        0.9,

                    repetition_penalty:
                        1.05,

                    streamer:

                        streamer,

                    return_full_text:
                        false

                }

            );


        if(
            timer
        ){

            clearTimeout(
                timer
            );

        }


        send({

            type:
                "token",

            text:
                streamed

        });


        let text =
            streamed;


        if(
            !text &&
            Array.isArray(
                output
            ) &&
            output.length
        ){

            const first =
                output[0];


            if(
                first &&
                typeof first.generated_text ===
                    "string"
            ){

                text =
                    first.generated_text;

            }else if(
                first &&
                Array.isArray(
                    first.generated_text
                )
            ){

                const messages =
                    first.generated_text;


                const last =
                    messages[
                        messages.length - 1
                    ];


                text =
                    last &&
                    typeof last.content ===
                        "string"
                        ? last.content
                        : "";

            }

        }


        text =
            String(
                text ||
                ""
            )
            .replace(
                /<\\|im_end\\|>/g,
                ""
            )
            .replace(
                /<\\|im_start\\|>/g,
                ""
            )
            .trim();


        return text;

    }catch(error){

        if(
            timer
        ){

            clearTimeout(
                timer
            );

        }


        throw error;

    }

}


/*
 * ============================================================
 * WORKER MESSAGE HANDLER
 * ============================================================
 */

self.addEventListener(
    "message",
    async event => {

        const data =
            event.data ||
            {};


        try{

            if(
                data.type ===
                    "init"
            ){

                try{

                    const result =
                        await initialize(
                            data.config ||
                            {}
                        );


                    send({

                        type:
                            "initComplete",

                        id:
                            data.id,

                        ok:
                            true,

                        result

                    });

                }catch(firstError){

                    /*
                     * Automatic WebGPU fallback.
                     */

                    if(
                        (
                            data.config ||
                            {}
                        ).device ===
                            "webgpu"
                    ){

                        try{

                            send({

                                type:
                                    "status",

                                state:
                                    "loading",

                                message:
                                    "WebGPU failed • switching to CPU/WASM..."

                            });


                            const fallbackConfig =
                                Object.assign(
                                    {},
                                    data.config ||
                                    {},
                                    {
                                        device:
                                            "wasm",

                                        dtype:
                                            "q8"
                                    }
                                );


                            const result =
                                await initialize(
                                    fallbackConfig
                                );


                            send({

                                type:
                                    "initComplete",

                                id:
                                    data.id,

                                ok:
                                    true,

                                result,

                                fallback:
                                    true

                            });


                            return;

                        }catch(secondError){

                            throw secondError;

                        }

                    }


                    throw firstError;

                }


                return;

            }


            if(
                data.type ===
                    "generate"
            ){

                if(
                    !generator
                ){

                    throw new Error(
                        "ONNX model is not loaded."
                    );

                }


                send({

                    type:
                        "generating"

                });


                const text =
                    await generate(

                        data.prompt ||
                            "",

                        data.config ||
                            {}

                    );


                send({

                    type:
                        "complete",

                    id:
                        data.id,

                    ok:
                        true,

                    text:

                        text,

                    device:

                        activeDevice,

                    dtype:

                        activeDtype

                });


                return;

            }


            if(
                data.type ===
                    "clear"
            ){

                send({

                    type:
                        "cleared",

                    id:
                        data.id,

                    ok:
                        true

                });


                return;

            }

        }catch(error){

            send({

                type:
                    "error",

                id:
                    data.id,

                ok:
                    false,

                error:
                    error &&
                    error.message
                        ? error.message
                        : String(
                            error
                          )

            });

        }

    }
);

`;

    }


    /*
     * ============================================================
     * CREATE WORKER
     * ============================================================
     */

    function ensureWorker(){

        if(
            provider.worker
        ){

            return provider.worker;

        }


        const blob =
            new Blob(
                [
                    makeWorkerSource()
                ],
                {
                    type:
                        "text/javascript"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const worker =
            new Worker(
                url,
                {
                    type:
                        "module"
                }
            );


        URL.revokeObjectURL(
            url
        );


        worker.addEventListener(
            "message",
            event => {

                const data =
                    event.data ||
                    {};


                if(
                    data.type ===
                        "status"
                ){

                    emitStatus({

                        state:
                            data.state ||
                            "loading",

                        message:
                            data.message ||
                            "Loading..."

                    });


                    return;

                }


                if(
                    data.type ===
                        "progress"
                ){

                    emitStatus({

                        state:
                            "downloading",

                        progress:
                            Number(
                                data.progress
                            ) || 0,

                        message:
                            data.message ||
                            "Downloading..."

                    });


                    return;

                }


                if(
                    data.type ===
                        "ready"
                ){

                    emitStatus({

                        state:
                            "ready",

                        progress:
                            100,

                        message:
                            "ONNX READY — " +
                            String(
                                data.device ||
                                ""
                            ).toUpperCase()

                    });


                    return;

                }


                if(
                    data.type ===
                        "token"
                ){

                    try{

                        window.dispatchEvent(

                            new CustomEvent(
                                "littlehollow:onnxtoken",
                                {
                                    detail:{
                                        text:
                                            data.text ||
                                            ""
                                    }
                                }
                            )

                        );

                    }catch(error){}


                    return;

                }


                if(
                    data.id &&
                    provider.pending.has(
                        data.id
                    )
                ){

                    const pending =
                        provider.pending.get(
                            data.id
                        );


                    provider.pending.delete(
                        data.id
                    );


                    if(
                        data.ok
                    ){

                        pending.resolve(
                            data
                        );

                    }else{

                        pending.reject(
                            new Error(
                                data.error ||
                                "ONNX worker request failed."
                            )
                        );

                    }

                }


                if(
                    data.type ===
                        "complete"
                ){

                    try{

                        window.dispatchEvent(

                            new CustomEvent(
                                "littlehollow:onnxcomplete",
                                {
                                    detail:
                                        data
                                }
                            )

                        );

                    }catch(error){}

                }

            }
        );


        worker.addEventListener(
            "error",
            event => {

                const error =
                    new Error(
                        event.message ||
                        "ONNX worker crashed."
                    );


                for(
                    const [
                        ,
                        pending
                    ]
                    of
                    provider.pending
                ){

                    pending.reject(
                        error
                    );

                }


                provider.pending.clear();


                provider.ready =
                    false;


                emitStatus({

                    state:
                        "error",

                    progress:
                        0,

                    message:
                        error.message

                });

            }
        );


        provider.worker =
            worker;


        return worker;

    }


    /*
     * ============================================================
     * WORKER REQUEST
     * ============================================================
     */

    function request(
        type,
        payload
    ){

        const worker =
            ensureWorker();


        const id =
            "onnx_" +
            (
                ++provider.requestSeq
            );


        return new Promise(
            (
                resolve,
                reject
            ) => {

                provider.pending.set(
                    id,
                    {
                        resolve,
                        reject
                    }
                );


                worker.postMessage(

                    Object.assign(
                        {
                            type,
                            id
                        },
                        payload ||
                        {}
                    )

                );

            }
        );

    }


    /*
     * ============================================================
     * PREPARE
     * ============================================================
     */

    async function prepare(
        settings
    ){

        if(
            provider.ready
        ){

            return {

                ok:
                    true,

                state:
                    "ready",

                status:
                    clone(
                        provider.status
                    )

            };

        }


        if(
            provider.loadingPromise
        ){

            return provider.loadingPromise;

        }


        provider.loadingPromise =
            (async () => {

                try{

                    const cfg = {

                        model:
                            (
                                settings?.onnx?.model ||
                                "onnx-community/Qwen2.5-0.5B-Instruct"
                            ).trim(),

                        device:
                            settings?.onnx?.device ||
                            "webgpu",

                        dtype:
                            settings?.onnx?.dtype ||
                            "q4",

                        maxNewTokens:
                            Number(
                                settings?.onnx?.maxNewTokens
                            ) || 256,

                        temperature:
                            Number(
                                settings?.onnx?.temperature
                            ) || 0.7

                    };


                    provider.settings =
                        clone(
                            cfg
                        );


                    emitStatus({

                        state:
                            "starting",

                        progress:
                            0,

                        message:
                            "Starting ONNX provider..."

                    });


                    const result =
                        await request(
                            "init",
                            {
                                config:
                                    cfg
                            }
                        );


                    provider.ready =
                        true;


                    provider.settings =
                        Object.assign(
                            {},
                            cfg,
                            result.result ||
                            {}
                        );


                    emitStatus({

                        state:
                            "ready",

                        progress:
                            100,

                        message:
                            "ONNX ready."

                    });


                    return {

                        ok:
                            true,

                        state:
                            "ready",

                        result:
                            result.result ||
                            null,

                        status:
                            clone(
                                provider.status
                            )

                    };

                }catch(error){

                    provider.ready =
                        false;


                    emitStatus({

                        state:
                            "error",

                        progress:
                            0,

                        message:
                            error.message ||
                            String(
                                error
                            )

                    });


                    throw error;

                }finally{

                    provider.loadingPromise =
                        null;

                }

            })();


        return provider.loadingPromise;

    }


    /*
     * ============================================================
     * BUILD PROMPT
     * ============================================================
     */

    function buildPrompt(
        messages,
        tools
    ){

        let prompt =
            "<|im_start|>system\n";


        const system =
            (
                messages ||
                []
            )
            .find(
                item =>
                    item &&
                    item.role ===
                        "system"
            );


        prompt +=
            (
                system &&
                typeof system.content ===
                    "string"
            )
                ? system.content
                : String(
                    window.SYSTEM_PROMPT ||
                    ""
                  );


        prompt +=
            "\n\nAVAILABLE TOOLS:\n";


        prompt +=
            JSON.stringify(
                tools ||
                [],
                null,
                2
            );


        prompt +=
            "\n\nTOOL CALL FORMAT:\n";


        prompt +=
            "<tool_call>{\"name\":\"TOOL_NAME\",\"arguments\":{}}</tool_call>\n";


        prompt +=
            "When a requested action requires a tool, use the tool. " +
            "Never pretend the tool was executed.\n";


        prompt +=
            "<|im_end|>\n";


        for(
            const item of
            messages ||
            []
        ){

            if(
                !item ||
                item.role ===
                    "system"
            ){

                continue;

            }


            const role =
                item.role ||
                "user";


            const content =
                Array.isArray(
                    item.content
                )

                    ? item.content
                        .map(
                            part =>
                                typeof part ===
                                    "string"
                                    ? part
                                    : (
                                        part &&
                                        part.text
                                    ) ||
                                    ""
                        )
                        .join("")

                    : String(
                        item.content ||
                        ""
                      );


            if(
                role ===
                    "tool"
            ){

                prompt +=
                    "<|im_start|>tool\n" +
                    content +
                    "\n<|im_end|>\n";


                continue;

            }


            if(
                content
            ){

                prompt +=
                    "<|im_start|>" +
                    role +
                    "\n" +
                    content +
                    "\n<|im_end|>\n";

            }


            if(
                role ===
                    "assistant" &&
                Array.isArray(
                    item.tool_calls
                )
            ){

                for(
                    const call of
                    item.tool_calls
                ){

                    const name =
                        call &&
                        call.function
                            ? call.function.name
                            : "";


                    const args =
                        call &&
                        call.function
                            ? parseArgs(
                                call.function.arguments
                              )
                            : {};


                    prompt +=
                        "<|im_start|>assistant\n" +
                        "<tool_call>" +
                        JSON.stringify({
                            name,
                            arguments:
                                args
                        }) +
                        "</tool_call>\n" +
                        "<|im_end|>\n";

                }

            }

        }


        prompt +=
            "<|im_start|>assistant\n";


        return prompt;

    }


    /*
     * ============================================================
     * TOOL CALL NORMALIZATION
     * ============================================================
     */

    function normalizeToolCall(
        value
    ){

        if(
            !value
        ){

            return null;

        }


        if(
            value.function &&
            value.function.name
        ){

            return {

                id:
                    value.id ||
                    makeId(),

                type:
                    "function",

                function:{

                    name:
                        String(
                            value.function.name
                        ),

                    arguments:
                        typeof value.function.arguments ===
                            "string"

                            ? value.function.arguments

                            : JSON.stringify(
                                value.function.arguments ||
                                {}
                              )

                }

            };

        }


        if(
            value.name
        ){

            return {

                id:
                    value.id ||
                    makeId(),

                type:
                    "function",

                function:{

                    name:
                        String(
                            value.name
                        ),

                    arguments:
                        typeof value.arguments ===
                            "string"

                            ? value.arguments

                            : JSON.stringify(
                                value.arguments ||
                                value.input ||
                                {}
                              )

                }

            };

        }


        return null;

    }


    function parseToolCalls(
        text
    ){

        const calls =
            [];


        const source =
            String(
                text ||
                ""
            );


        const regex =
            /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi;


        let match;


        while(
            (match =
                regex.exec(
                    source
                ))
        ){

            try{

                const data =
                    JSON.parse(
                        match[1]
                    );


                const call =
                    normalizeToolCall(
                        data
                    );


                if(
                    call
                ){

                    calls.push(
                        call
                    );

                }

            }catch(error){}

        }


        /*
         * Bare JSON fallback.
         */

        if(
            !calls.length
        ){

            const trimmed =
                source.trim();


            if(
                trimmed.startsWith("{") &&
                trimmed.endsWith("}")
            ){

                try{

                    const data =
                        JSON.parse(
                            trimmed
                        );


                    const call =
                        normalizeToolCall(
                            data
                        );


                    if(
                        call
                    ){

                        calls.push(
                            call
                        );

                    }

                }catch(error){}

            }

        }


        return calls;

    }


    function cleanText(
        text
    ){

        return String(
            text ||
            ""
        )
        .replace(
            /<tool_call>[\s\S]*?<\/tool_call>/gi,
            ""
        )
        .replace(
            /<\|im_end\|>/g,
            ""
        )
        .replace(
            /<\|im_start\|>/g,
            ""
        )
        .trim();

    }


    /*
     * ============================================================
     * CHAT + TOOL LOOP
     * ============================================================
     */

    async function chat({
        messages,
        tools,
        settings,
        executeTool
    }){

        if(
            !provider.ready
        ){

            await prepare(
                settings
            );

        }


        if(
            !executeTool
        ){

            throw new Error(
                "ONNX provider requires an executeTool callback."
            );

        }


        const maxRounds =
            Math.max(
                1,
                Number(
                    settings?.agent?.maxToolRounds
                ) || 8
            );


        let workingMessages =
            clone(
                messages ||
                []
            );


        let lastText =
            "";


        for(
            let round = 0;
            round < maxRounds;
            round++
        ){

            const prompt =
                buildPrompt(
                    workingMessages,
                    tools
                );


            const response =
                await request(

                    "generate",

                    {

                        prompt,

                        config:
                            provider.settings ||
                            settings?.onnx ||
                            {}

                    }

                );


            lastText =
                String(
                    response.text ||
                    ""
                );


            const calls =
                parseToolCalls(
                    lastText
                );


            /*
             * Final response.
             */

            if(
                !calls.length
            ){

                return {

                    message:{

                        role:
                            "assistant",

                        content:
                            cleanText(
                                lastText
                            )

                    },

                    toolCalls:[],

                    rounds:
                        round + 1

                };

            }


            /*
             * Add model tool request to provider-local
             * working history.
             */

            workingMessages.push({

                role:
                    "assistant",

                content:
                    lastText,

                tool_calls:
                    calls

            });


            /*
             * Execute every requested tool.
             */

            for(
                const call of
                calls
            ){

                const result =
                    await executeTool(

                        call.function.name,

                        parseArgs(
                            call.function.arguments
                        )

                    );


                console.log(
                    "[ONNX] tool result:",
                    call.function.name,
                    result
                );


                workingMessages.push({

                    role:
                        "tool",

                    tool_call_id:
                        call.id,

                    content:
                        JSON.stringify(
                            result
                        )

                });

            }

        }


        return {

            message:{

                role:
                    "assistant",

                content:
                    cleanText(
                        lastText
                    )

            },

            toolCalls:[],

            rounds:
                maxRounds,

            maxRoundsReached:
                true

        };

    }


    /*
     * ============================================================
     * UNLOAD
     * ============================================================
     */

    function unload(){

        for(
            const [
                ,
                pending
            ]
            of
            provider.pending
        ){

            pending.reject(
                new Error(
                    "ONNX provider unloaded."
                )
            );

        }


        provider.pending.clear();


        if(
            provider.worker
        ){

            provider.worker.terminate();

            provider.worker =
                null;

        }


        provider.ready =
            false;


        provider.settings =
            null;


        provider.loadingPromise =
            null;


        emitStatus({

            state:
                "not_loaded",

            progress:
                0,

            message:
                "ONNX runtime unloaded."

        });

    }


    /*
     * ============================================================
     * STATUS
     * ============================================================
     */

    function getStatus(){

        return clone(
            provider.status
        );

    }


    /*
     * ============================================================
     * PUBLIC REGISTRATION
     * ============================================================
     */

    window.LittleHollowAIProviders =
        window.LittleHollowAIProviders ||
        {};


    window.LittleHollowAIProviders.onnx = {

        id:
            "onnx",

        prepare,

        chat,

        unload,

        getStatus

    };

})();
