(function(){
    "use strict";

    const provider = {
        id: "puter",
        ready: false,
        loadingPromise: null
    };

    function clone(value){
        try{
            return JSON.parse(
                JSON.stringify(value)
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

    function parseArgs(value){
        if(value == null){
            return {};
        }

        if(typeof value === "object"){
            return value;
        }

        try{
            return JSON.parse(value);
        }catch(error){
            return {};
        }
    }

    function textOf(message){
        if(!message){
            return "";
        }

        if(typeof message.content === "string"){
            return message.content;
        }

        if(Array.isArray(message.content)){
            return message.content
                .map(part => {
                    if(typeof part === "string"){
                        return part;
                    }

                    return (
                        part &&
                        typeof part.text === "string"
                    )
                        ? part.text
                        : "";
                })
                .join("");
        }

        return "";
    }

    function normalizeToolCall(call){
        if(!call){
            return null;
        }

        if(
            call.function &&
            call.function.name
        ){
            return {
                id: call.id || makeId(),
                type: "function",
                function: {
                    name: String(
                        call.function.name
                    ),
                    arguments:
                        typeof call.function.arguments ===
                        "string"
                            ? call.function.arguments
                            : JSON.stringify(
                                call.function.arguments || {}
                            )
                }
            };
        }

        if(
            call.type === "tool_use" &&
            call.name
        ){
            return {
                id: call.id || makeId(),
                type: "function",
                function: {
                    name: String(call.name),
                    arguments: JSON.stringify(
                        call.input || {}
                    )
                }
            };
        }

        if(call.type === "function_call"){
            if(
                call.function &&
                call.function.name
            ){
                return normalizeToolCall(call);
            }

            if(call.name){
                return {
                    id: call.id || makeId(),
                    type: "function",
                    function: {
                        name: String(call.name),
                        arguments:
                            typeof call.arguments ===
                            "string"
                                ? call.arguments
                                : JSON.stringify(
                                    call.arguments || {}
                                )
                    }
                };
            }
        }

        if(call.name){
            return {
                id: call.id || makeId(),
                type: "function",
                function: {
                    name: String(call.name),
                    arguments:
                        typeof call.arguments === "string"
                            ? call.arguments
                            : JSON.stringify(
                                call.arguments ||
                                call.input ||
                                {}
                            )
                }
            };
        }

        return null;
    }

    function extractToolCalls(message){
        const result = [];

        if(!message){
            return result;
        }

        if(Array.isArray(message.tool_calls)){
            for(const call of message.tool_calls){
                const normalized =
                    normalizeToolCall(call);

                if(normalized){
                    result.push(normalized);
                }
            }
        }

        if(Array.isArray(message.content)){
            for(const part of message.content){
                if(
                    part &&
                    (
                        part.type === "tool_use" ||
                        part.type === "function_call"
                    )
                ){
                    const normalized =
                        normalizeToolCall(part);

                    if(normalized){
                        result.push(normalized);
                    }
                }
            }
        }

        return uniqueCalls(result);
    }

    function parseTextToolCalls(text){
        const calls = [];

        const source =
            String(text || "");

        const regex =
            /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi;

        let match;

        while(
            (match = regex.exec(source))
        ){
            try{
                const data =
                    JSON.parse(match[1]);

                const normalized =
                    normalizeToolCall(data);

                if(normalized){
                    calls.push(normalized);
                }
            }catch(error){}
        }

        if(!calls.length){
            const trimmed =
                source.trim();

            if(
                trimmed.startsWith("{") &&
                trimmed.endsWith("}")
            ){
                try{
                    const data =
                        JSON.parse(trimmed);

                    const normalized =
                        normalizeToolCall(data);

                    if(normalized){
                        calls.push(normalized);
                    }
                }catch(error){}
            }
        }

        return uniqueCalls(calls);
    }

    function uniqueCalls(calls){
        const result = [];
        const seen = new Set();

        for(const call of calls){
            const signature =
                call.id ||
                (
                    call.function.name +
                    "|" +
                    call.function.arguments
                );

            if(seen.has(signature)){
                continue;
            }

            seen.add(signature);
            result.push(call);
        }

        return result;
    }

    async function prepare(){
        if(
            window.puter &&
            window.puter.ai &&
            typeof window.puter.ai.chat === "function"
        ){
            provider.ready = true;
            return window.puter;
        }

        if(provider.loadingPromise){
            return provider.loadingPromise;
        }

        provider.loadingPromise =
            new Promise(
                (
                    resolve,
                    reject
                ) => {
                    const existing =
                        document.querySelector(
                            'script[data-littlehollow-puter="1"]'
                        );

                    if(existing){
                        if(
                            window.puter &&
                            window.puter.ai
                        ){
                            provider.ready = true;

                            resolve(
                                window.puter
                            );

                            return;
                        }

                        existing.addEventListener(
                            "load",
                            () => {
                                if(
                                    window.puter &&
                                    window.puter.ai
                                ){
                                    provider.ready = true;

                                    resolve(
                                        window.puter
                                    );
                                }else{
                                    reject(
                                        new Error(
                                            "Puter.js loaded but window.puter.ai is unavailable."
                                        )
                                    );
                                }
                            },
                            {
                                once: true
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
                                once: true
                            }
                        );

                        return;
                    }

                    const script =
                        document.createElement(
                            "script"
                        );

                    script.async = true;

                    script.src =
                        "https://js.puter.com/v2/";

                    script.dataset.littlehollowPuter =
                        "1";

                    script.onload = () => {
                        if(
                            window.puter &&
                            window.puter.ai
                        ){
                            provider.ready = true;

                            resolve(
                                window.puter
                            );
                        }else{
                            reject(
                                new Error(
                                    "Puter.js loaded but window.puter.ai is unavailable."
                                )
                            );
                        }
                    };

                    script.onerror = () => {
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
            ).catch(
                error => {
                    provider.loadingPromise = null;
                    throw error;
                }
            );

        return provider.loadingPromise;
    }

    async function chat({
        messages,
        tools,
        settings,
        executeTool
    }){
        const puter =
            await prepare();

        if(!executeTool){
            throw new Error(
                "Puter provider requires an executeTool callback."
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
            clone(messages || []);

        let lastMessage = null;

        for(
            let round = 0;
            round < maxRounds;
            round++
        ){
            console.log(
                "[Puter] chat round",
                round + 1
            );

            const response =
                await puter.ai.chat(
                    workingMessages,
                    {
                        model:
                            settings?.puter?.model ||
                            "claude-sonnet-5",

                        tools:
                            tools || []
                    }
                );

            const message =
                response &&
                response.message
                    ? response.message
                    : (
                        response &&
                        typeof response === "object"
                    )
                        ? response
                        : {
                            role: "assistant",
                            content: String(
                                response || ""
                            )
                        };

            lastMessage = message;

            let toolCalls =
                extractToolCalls(message);

            if(!toolCalls.length){
                toolCalls =
                    parseTextToolCalls(
                        textOf(message)
                    );
            }

            if(!toolCalls.length){
                return {
                    message,
                    toolCalls: [],
                    rounds: round + 1
                };
            }

            workingMessages.push({
                role: "assistant",
                content: textOf(message),
                tool_calls: toolCalls
            });

            for(const call of toolCalls){
                const result =
                    await executeTool(
                        call.function.name,
                        parseArgs(
                            call.function.arguments
                        )
                    );

                console.log(
                    "[Puter] tool result:",
                    call.function.name,
                    result
                );

                workingMessages.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: JSON.stringify(result)
                });
            }
        }

        return {
            message:
                lastMessage || {
                    role: "assistant",
                    content: ""
                },

            toolCalls: [],

            rounds:
                maxRounds,

            maxRoundsReached:
                true
        };
    }

    function getStatus(){
        return {
            ready:
                !!(
                    provider.ready &&
                    window.puter &&
                    window.puter.ai &&
                    typeof window.puter.ai.chat ===
                        "function"
                )
        };
    }

    window.LittleHollowAIProviders =
        window.LittleHollowAIProviders || {};

    window.LittleHollowAIProviders.puter = {
        id: "puter",
        prepare,
        chat,
        getStatus
    };
})();
