(function () {
    "use strict";

    const REGISTRY =
        window.LittleHollowAIProviders =
        window.LittleHollowAIProviders || {};

    const API_ROOT =
        "https://generativelanguage.googleapis.com/v1beta/models/";

    const GEMINI_SCHEMA_KEYS = new Set([
        "type",
        "format",
        "title",
        "description",
        "nullable",
        "enum",
        "items",
        "properties",
        "required"
    ]);

    function normalizeSchemaTypes(value) {
        if (
            !value ||
            typeof value !== "object"
        ) {
            return;
        }

        if (
            typeof value.type ===
            "string"
        ) {
            const upper =
                value.type.toUpperCase();

            if (
                [
                    "OBJECT",
                    "STRING",
                    "NUMBER",
                    "INTEGER",
                    "BOOLEAN",
                    "ARRAY"
                ].includes(upper)
            ) {
                value.type =
                    upper;
            }
        }

        if (
            value.properties &&
            typeof value.properties ===
                "object"
        ) {
            Object.values(
                value.properties
            ).forEach(
                normalizeSchemaTypes
            );
        }

        if (
            value.items &&
            typeof value.items ===
                "object"
        ) {
            normalizeSchemaTypes(
                value.items
            );
        }

        if (
            Array.isArray(
                value.anyOf
            )
        ) {
            value.anyOf.forEach(
                normalizeSchemaTypes
            );
        }

        if (
            Array.isArray(
                value.oneOf
            )
        ) {
            value.oneOf.forEach(
                normalizeSchemaTypes
            );
        }

        if (
            Array.isArray(
                value.allOf
            )
        ) {
            value.allOf.forEach(
                normalizeSchemaTypes
            );
        }
    }

    function sanitizeGeminiSchema(value) {
        if (
            value == null
        ) {
            return value;
        }

        if (
            Array.isArray(value)
        ) {
            return value.map(
                sanitizeGeminiSchema
            );
        }

        if (
            typeof value !==
            "object"
        ) {
            return value;
        }

        const output = {};

        for (
            const [key, child]
            of Object.entries(value)
        ) {
            if (
                !GEMINI_SCHEMA_KEYS.has(
                    key
                )
            ) {
                continue;
            }

            output[key] =
                sanitizeGeminiSchema(
                    child
                );
        }

        if (
            output.properties &&
            typeof output.properties ===
                "object" &&
            !Array.isArray(
                output.properties
            )
        ) {
            const properties = {};

            for (
                const [
                    propertyName,
                    propertySchema
                ]
                of Object.entries(
                    output.properties
                )
            ) {
                properties[
                    propertyName
                ] =
                    sanitizeGeminiSchema(
                        propertySchema
                    );
            }

            output.properties =
                properties;
        }

        if (
            output.items &&
            typeof output.items ===
                "object"
        ) {
            output.items =
                sanitizeGeminiSchema(
                    output.items
                );
        }

        return output;
    }

    function cleanSchema(schema) {
        const source =
            schema &&
            typeof schema ===
                "object"
                ? JSON.parse(
                    JSON.stringify(
                        schema
                    )
                )
                : {
                    type:
                        "OBJECT",

                    properties:
                        {}
                };

        let cleaned =
            sanitizeGeminiSchema(
                source
            );

        normalizeSchemaTypes(
            cleaned
        );

        if (
            !cleaned.type
        ) {
            cleaned.type =
                "OBJECT";
        }

        if (
            cleaned.type ===
                "OBJECT" &&
            (
                !cleaned.properties ||
                typeof cleaned.properties !==
                    "object"
            )
        ) {
            cleaned.properties =
                {};
        }

        if (
            cleaned.required &&
            Array.isArray(
                cleaned.required
            )
        ) {
            cleaned.required =
                cleaned.required.filter(
                    name =>
                        typeof name ===
                        "string"
                );
        }

        return cleaned;
    }

    function toGeminiTools(
        tools,
        enablePython
    ) {
        const declarations =
            [];

        for (
            const tool
            of Array.isArray(tools)
                ? tools
                : []
        ) {
            if (!tool) {
                continue;
            }

            const name =
                tool.name ||
                tool.function?.name;

            const description =
                tool.description ||
                tool.function?.description ||
                "";

            const parameters =
                tool.parameters ||
                tool.function?.parameters ||
                tool.input_schema;

            if (!name) {
                continue;
            }

            declarations.push({
                name:
                    String(name),

                description:
                    String(description),

                parameters:
                    cleanSchema(
                        parameters || {
                            type:
                                "OBJECT",

                            properties:
                                {}
                        }
                    )
            });
        }

        const geminiTools =
            [];

        if (
            declarations.length
        ) {
            geminiTools.push({
                functionDeclarations:
                    declarations
            });
        }

        if (
            enablePython
        ) {
            geminiTools.push({
                codeExecution:
                    {}
            });
        }

        return geminiTools;
    }

    function messageToGeminiContent(
        message
    ) {
        if (!message) {
            return null;
        }

        if (
            message.role ===
            "system"
        ) {
            return null;
        }

        const role =
            message.role ===
            "assistant"
                ? "model"
                : "user";

        const parts =
            [];

        if (
            typeof message.content ===
            "string"
        ) {
            if (
                message.content.length
            ) {
                parts.push({
                    text:
                        message.content
                });
            }
        } else if (
            Array.isArray(
                message.content
            )
        ) {
            for (
                const part
                of message.content
            ) {
                if (!part) {
                    continue;
                }

                if (
                    typeof part ===
                    "string"
                ) {
                    if (
                        part.length
                    ) {
                        parts.push({
                            text:
                                part
                        });
                    }
                } else if (
                    typeof part.text ===
                    "string"
                ) {
                    parts.push({
                        text:
                            part.text
                    });
                }
            }
        }

        if (!parts.length) {
            return null;
        }

        return {
            role,
            parts
        };
    }

    function extractText(
        chunk
    ) {
        let text =
            "";

        const candidates =
            Array.isArray(
                chunk?.candidates
            )
                ? chunk.candidates
                : [];

        for (
            const candidate
            of candidates
        ) {
            const parts =
                candidate?.content
                    ?.parts || [];

            for (
                const part
                of parts
            ) {
                if (
                    typeof part?.text ===
                    "string"
                ) {
                    text +=
                        part.text;
                }
            }
        }

        return text;
    }

    function collectFunctionCalls(
        chunk,
        calls
    ) {
        const candidates =
            Array.isArray(
                chunk?.candidates
            )
                ? chunk.candidates
                : [];

        for (
            const candidate
            of candidates
        ) {
            const parts =
                candidate?.content
                    ?.parts || [];

            for (
                const part
                of parts
            ) {
                if (
                    !part?.functionCall?.name
                ) {
                    continue;
                }

                const fc =
                    part.functionCall;

                calls.push({
                    name:
                        String(
                            fc.name
                        ),

                    args:
                        fc.args &&
                        typeof fc.args ===
                            "object"
                            ? fc.args
                            : {},

                    id:
                        part.id ||
                        fc.id ||
                        null,

                    thoughtSignature:
                        part.thoughtSignature ||
                        part.thought_signature ||
                        null
                });
            }
        }
    }

    function collectModelParts(
        chunk,
        parts
    ) {
        const candidates =
            Array.isArray(
                chunk?.candidates
            )
                ? chunk.candidates
                : [];

        const candidate =
            candidates[0];

        if (
            !candidate?.content
                ?.parts
        ) {
            return;
        }

        for (
            const part
            of candidate.content.parts
        ) {
            if (
                !part ||
                typeof part !==
                    "object"
            ) {
                continue;
            }

            parts.push(
                JSON.parse(
                    JSON.stringify(
                        part
                    )
                )
            );
        }
    }

    async function readSSE(
        response,
        onChunk
    ) {
        if (
            !response.body ||
            typeof response.body
                .getReader !==
                "function"
        ) {
            const raw =
                await response.text();

            if (
                !raw.trim()
            ) {
                return;
            }

            try {
                await onChunk(
                    JSON.parse(raw)
                );
            } catch (_) {
                throw new Error(
                    "Gemini returned an unreadable response."
                );
            }

            return;
        }

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        let buffer =
            "";

        while (true) {
            const {
                value,
                done
            } =
                await reader.read();

            if (done) {
                break;
            }

            buffer +=
                decoder.decode(
                    value,
                    {
                        stream:
                            true
                    }
                );

            const events =
                buffer.split(
                    /\r?\n\r?\n/
                );

            buffer =
                events.pop() ||
                "";

            for (
                const event
                of events
            ) {
                const dataLines =
                    event
                        .split(
                            /\r?\n/
                        )
                        .filter(
                            line =>
                                line.startsWith(
                                    "data:"
                                )
                        )
                        .map(
                            line =>
                                line
                                    .slice(
                                        5
                                    )
                                    .trim()
                        );

                if (
                    !dataLines.length
                ) {
                    continue;
                }

                const data =
                    dataLines
                        .join("\n")
                        .trim();

                if (
                    !data ||
                    data ===
                        "[DONE]"
                ) {
                    continue;
                }

                try {
                    await onChunk(
                        JSON.parse(
                            data
                        )
                    );
                } catch (error) {
                    console.warn(
                        "Little Hollow Gemini SSE parse warning:",
                        error,
                        data
                    );
                }
            }
        }

        buffer +=
            decoder.decode();

        if (
            buffer.trim()
        ) {
            const dataLines =
                buffer
                    .split(
                        /\r?\n/
                    )
                    .filter(
                        line =>
                            line.startsWith(
                                "data:"
                            )
                    )
                    .map(
                        line =>
                            line
                                .slice(
                                    5
                                )
                                .trim()
                    );

            const data =
                dataLines
                    .join("\n")
                    .trim();

            if (
                data &&
                data !==
                    "[DONE]"
            ) {
                try {
                    await onChunk(
                        JSON.parse(
                            data
                        )
                    );
                } catch (error) {
                    console.warn(
                        "Little Hollow Gemini final SSE parse warning:",
                        error
                    );
                }
            }
        }
    }

    function makeSystemInstruction(
        messages
    ) {
        const explicit =
            Array.isArray(
                messages
            )
                ? messages.find(
                    message =>
                        message?.role ===
                        "system"
                )
                : null;

        const prompt =
            explicit
                ? String(
                    explicit.content ||
                    ""
                )
                : String(
                    window.SYSTEM_PROMPT ||
                    ""
                );

        if (!prompt) {
            return undefined;
        }

        return {
            parts: [
                {
                    text:
                        prompt
                }
            ]
        };
    }

    function extractApiError(
        json,
        status
    ) {
        const message =
            json?.error?.message ||
            json?.error?.status ||
            json?.message;

        return message
            ? `Gemini API error (${status}): ${message}`
            : `Gemini API request failed with HTTP ${status}.`;
    }

    async function requestStream({
        apiKey,
        model,
        contents,
        systemInstruction,
        tools,
        onToken,
        modelParts,
        generationSettings
    }) {
        const url =
            API_ROOT +
            encodeURIComponent(
                model
            ) +
            ":streamGenerateContent?alt=sse&key=" +
            encodeURIComponent(
                apiKey
            );

        const body = {
            contents,

            ...(systemInstruction
                ? {
                    systemInstruction
                }
                : {}),

            ...(tools.length
                ? {
                    tools
                }
                : {}),

            generationConfig: {
                maxOutputTokens:
                    Math.max(
                        1,
                        Math.min(
                            65000,
                            Number(
                                generationSettings
                                    ?.maxOutputTokens ||
                                4096
                            )
                        )
                    )
            }
        };

        const response =
            await fetch(
                url,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            body
                        )
                }
            );

        if (
            !response.ok
        ) {
            let payload =
                null;

            try {
                payload =
                    await response.json();
            } catch (_) {}

            throw new Error(
                extractApiError(
                    payload,
                    response.status
                )
            );
        }

        const functionCalls =
            [];

        let streamedText =
            "";

        await readSSE(
            response,
            async chunk => {
                collectModelParts(
                    chunk,
                    modelParts
                );

                collectFunctionCalls(
                    chunk,
                    functionCalls
                );

                const text =
                    extractText(
                        chunk
                    );

                if (text) {
                    streamedText +=
                        text;

                    if (
                        typeof onToken ===
                        "function"
                    ) {
                        await onToken(
                            text,
                            chunk
                        );
                    }

                    window.dispatchEvent(
                        new CustomEvent(
                            "littlehollow:ai-token",
                            {
                                detail: {
                                    provider:
                                        "gemini",

                                    text,

                                    chunk
                                }
                            }
                        )
                    );
                }

                window.dispatchEvent(
                    new CustomEvent(
                        "littlehollow:ai-chunk",
                        {
                            detail: {
                                provider:
                                    "gemini",

                                chunk
                            }
                        }
                    )
                );
            }
        );

        return {
            text:
                streamedText,

            functionCalls,

            modelParts
        };
    }

    function makeFunctionResponseParts(
        results
    ) {
        return results.map(
            result => ({
                functionResponse: {
                    name:
                        String(
                            result.name
                        ),

                    ...(result.id
                        ? {
                            id:
                                String(
                                    result.id
                                )
                        }
                        : {}),

                    response:
                        normalizeToolResponse(
                            result.value
                        )
                }
            })
        );
    }

    function normalizeToolResponse(
        value
    ) {
        if (
            value == null
        ) {
            return {
                result:
                    null
            };
        }

        if (
            typeof value ===
            "object"
        ) {
            return value;
        }

        return {
            result:
                String(value)
        };
    }

    function dedupeCalls(
        calls
    ) {
        const seen =
            new Set();

        return calls.filter(
            call => {
                const key =
                    `${call.name}:${JSON.stringify(call.args || {})}`;

                if (
                    seen.has(key)
                ) {
                    return false;
                }

                seen.add(key);

                return true;
            }
        );
    }

    async function chat({
        messages,
        tools,
        settings,
        executeTool,
        onToken
    }) {
        const gemini =
            settings?.gemini ||
            {};

        const apiKey =
            String(
                gemini.apiKey ||
                ""
            ).trim();

        const model =
            String(
                gemini.model ||
                "gemini-3.5-flash"
            ).trim() ||
            "gemini-3.5-flash";

        const maxToolRounds =
            Math.max(
                1,
                Math.min(
                    32,
                    Number(
                        settings?.agent
                            ?.maxToolRounds ||
                        8
                    )
                )
            );

        if (!apiKey) {
            throw new Error(
                "Gemini API key is not configured. Open Settings → Gemini and add your key."
            );
        }

        const contents =
            [];

        for (
            const message
            of Array.isArray(
                messages
            )
                ? messages
                : []
        ) {
            const content =
                messageToGeminiContent(
                    message
                );

            if (content) {
                contents.push(
                    content
                );
            }
        }

        if (
            !contents.length
        ) {
            contents.push({
                role:
                    "user",

                parts: [
                    {
                        text:
                            "Hello."
                    }
                ]
            });
        }

        const geminiTools =
            toGeminiTools(
                tools,
                Boolean(
                    gemini.pythonTool
                )
            );

        const systemInstruction =
            makeSystemInstruction(
                messages
            );

        let fullText =
            "";

        for (
            let round = 0;
            round < maxToolRounds;
            round += 1
        ) {
            const modelParts =
                [];

            const result =
                await requestStream({
                    apiKey,
                    model,
                    contents,
                    systemInstruction,
                    tools:
                        geminiTools,
                    onToken,
                    modelParts,
                    generationSettings:
                        gemini
                });

            fullText +=
                result.text ||
                "";

            const calls =
                dedupeCalls(
                    result.functionCalls
                );

            if (
                !calls.length
            ) {
                return {
                    message: {
                        role:
                            "assistant",

                        content:
                            fullText
                    },

                    provider:
                        "gemini",

                    model,

                    usage:
                        null
                };
            }

            if (
                result.modelParts
                    .length
            ) {
                contents.push({
                    role:
                        "model",

                    parts:
                        result.modelParts
                });
            }

            const results =
                [];

            for (
                const call
                of calls
            ) {
                window.dispatchEvent(
                    new CustomEvent(
                        "littlehollow:ai-tool-start",
                        {
                            detail: {
                                provider:
                                    "gemini",

                                name:
                                    call.name,

                                args:
                                    call.args
                            }
                        }
                    )
                );

                try {
                    if (
                        typeof executeTool !==
                        "function"
                    ) {
                        throw new Error(
                            "No Little Hollow tool executor is available."
                        );
                    }

                    const value =
                        await executeTool(
                            call.name,
                            call.args ||
                                {}
                        );

                    results.push({
                        name:
                            call.name,

                        id:
                            call.id,

                        value
                    });

                    window.dispatchEvent(
                        new CustomEvent(
                            "littlehollow:ai-tool-end",
                            {
                                detail: {
                                    provider:
                                        "gemini",

                                    name:
                                        call.name,

                                    args:
                                        call.args,

                                    result:
                                        value
                                }
                            }
                        )
                    );
                } catch (error) {
                    const failure = {
                        error:
                            error?.message ||
                            String(error)
                    };

                    results.push({
                        name:
                            call.name,

                        id:
                            call.id,

                        value:
                            failure
                    });

                    window.dispatchEvent(
                        new CustomEvent(
                            "littlehollow:ai-tool-error",
                            {
                                detail: {
                                    provider:
                                        "gemini",

                                    name:
                                        call.name,

                                    args:
                                        call.args,

                                    error:
                                        failure.error
                                }
                            }
                        )
                    );
                }
            }

            contents.push({
                role:
                    "user",

                parts:
                    makeFunctionResponseParts(
                        results
                    )
            });
        }

        return {
            message: {
                role:
                    "assistant",

                content:
                    fullText ||
                    "I hit the tool-call limit before I could finish."
            },

            provider:
                "gemini",

            model,

            usage:
                null,

            maxToolRoundsReached:
                true
        };
    }

    REGISTRY.gemini = {
        name:
            "Gemini",

        chat,

        getConfig:
            function (settings) {
                return settings?.gemini ||
                    {};
            }
    };
})();
