/* js/aiGGUF.js */
(function(){
    "use strict";

    /*
     * ============================================================
     * LITTLE HOLLOW GGUF PROVIDER
     * ============================================================
     */

    const provider = {

        id:
            "gguf"

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


    /*
     * ============================================================
     * NORMALIZE TOOL CALL
     * ============================================================
     */

    function normalizeToolCall(
        call
    ){

        if(
            !call
        ){

            return null;

        }


        if(
            call.function &&
            call.function.name
        ){

            return {

                id:
                    call.id ||
                    makeId(),

                type:
                    "function",

                function:{

                    name:
                        String(
                            call.function.name
                        ),

                    arguments:
                        typeof call.function.arguments ===
                            "string"

                            ? call.function.arguments

                            : JSON.stringify(
                                call.function.arguments ||
                                {}
                              )

                }

            };

        }


        if(
            call.type ===
                "tool_use" &&
            call.name
        ){

            return {

                id:
                    call.id ||
                    makeId(),

                type:
                    "function",

                function:{

                    name:
                        String(
                            call.name
                        ),

                    arguments:
                        JSON.stringify(
                            call.input ||
                            {}
                        )

                }

            };

        }


        if(
            call.name
        ){

            return {

                id:
                    call.id ||
                    makeId(),

                type:
                    "function",

                function:{

                    name:
                        String(
                            call.name
                        ),

                    arguments:
                        typeof call.arguments ===
                            "string"

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


    function extractToolCalls(
        message
    ){

        const calls =
            [];


        if(
            !message
        ){

            return calls;

        }


        if(
            Array.isArray(
                message.tool_calls
            )
        ){

            for(
                const call of
                message.tool_calls
            ){

                const normalized =
                    normalizeToolCall(
                        call
                    );


                if(
                    normalized
                ){

                    calls.push(
                        normalized
                    );

                }

            }

        }


        if(
            Array.isArray(
                message.content
            )
        ){

            for(
                const part of
                message.content
            ){

                if(
                    part &&
                    (
                        part.type ===
                            "tool_use" ||
                        part.type ===
                            "function_call"
                    )
                ){

                    const normalized =
                        normalizeToolCall(
                            part
                        );


                    if(
                        normalized
                    ){

                        calls.push(
                            normalized
                        );

                    }

                }

            }

        }


        return calls;

    }


    function parseTextToolCalls(
        text
    ){

        const source =
            String(
                text ||
                ""
            );


        const calls =
            [];


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

                const normalized =
                    normalizeToolCall(
                        JSON.parse(
                            match[1]
                        )
                    );


                if(
                    normalized
                ){

                    calls.push(
                        normalized
                    );

                }

            }catch(error){}

        }


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

                    const normalized =
                        normalizeToolCall(
                            JSON.parse(
                                trimmed
                            )
                        );


                    if(
                        normalized
                    ){

                        calls.push(
                            normalized
                        );

                    }

                }catch(error){}

            }

        }


        return calls;

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
            window.LittleHollowGGUF &&
            typeof
                window.LittleHollowGGUF.prepare ===
                    "function"
        ){

            return window
                .LittleHollowGGUF
                .prepare(
                    settings?.gguf ||
                    {}
                );

        }


        throw new Error(
            "No GGUF browser runtime is installed."
        );

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
            !window.LittleHollowGGUF ||
            typeof
                window.LittleHollowGGUF.chat !==
                    "function"
        ){

            throw new Error(
                "GGUF runtime is not loaded."
            );

        }


        if(
            !executeTool
        ){

            throw new Error(
                "GGUF provider requires an executeTool callback."
            );

        }


        const cfg =
            settings?.gguf ||
            {};


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


        let lastMessage = {

            role:
                "assistant",

            content:
                ""

        };


        for(
            let round = 0;
            round < maxRounds;
            round++
        ){

            const raw =
                await window
                    .LittleHollowGGUF
                    .chat({

                        messages:
                            workingMessages,

                        tools:
                            tools ||
                            [],

                        model:
                            cfg.model,

                        context:
                            cfg.context,

                        threads:
                            cfg.threads,

                        max_new_tokens:
                            cfg.maxNewTokens,

                        temperature:
                            cfg.temperature

                    });


            const message =
                raw &&
                raw.message

                    ? raw.message

                    : (
                        raw &&
                        typeof raw ===
                            "object"
                      )

                        ? raw

                        : {

                            role:
                                "assistant",

                            content:
                                String(
                                    raw ||
                                    ""
                                )

                          };


            lastMessage =
                message;


            let calls =
                extractToolCalls(
                    message
                );


            if(
                !calls.length
            ){

                calls =
                    parseTextToolCalls(
                        textOf(
                            message
                        )
                    );

            }


            if(
                !calls.length
            ){

                return {

                    message,

                    toolCalls:[],

                    rounds:
                        round + 1

                };

            }


            workingMessages.push({

                role:
                    "assistant",

                content:
                    textOf(
                        message
                    ),

                tool_calls:
                    calls

            });


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
                    "[GGUF] tool result:",
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

            message:
                lastMessage,

            toolCalls:[],

            rounds:
                maxRounds,

            maxRoundsReached:
                true

        };

    }


    /*
     * ============================================================
     * STATUS
     * ============================================================
     */

    function getStatus(){

        return {

            ready:
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
     * PUBLIC REGISTRATION
     * ============================================================
     */

    window.LittleHollowAIProviders =
        window.LittleHollowAIProviders ||
        {};


    window.LittleHollowAIProviders.gguf = {

        id:
            "gguf",

        prepare,

        chat,

        getStatus

    };

})();
