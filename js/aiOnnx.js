/* Little Hollow — local Transformers.js/ONNX provider */
(function () {
    "use strict";

    const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
    const PROVIDER_ID = "onnx";

    const FALLBACK = {
        model: "HuggingFaceTB/SmolLM2-360M-Instruct",
        task: "text-generation",
        system_role: "You are a helpful, concise, and accurate assistant.",
        device: "wasm",
        dtype: "auto",
        parameters: {
            max_new_tokens: 1024,
            temperature: 0.2,
            top_p: 0.95,
            top_k: 30,
            repetition_penalty: 1.05,
            do_sample: true
        }
    };

    const runtime = {
        state: "not_loaded",
        progress: 0,
        message: "ONNX model is not loaded.",
        model: null,
        device: null,
        dtype: null
    };

    let worker = null;
    let workerUrl = null;
    let workerReady = false;
    let requestSerial = 0;
    const pending = new Map();

    function clone(value) {
        try { return JSON.parse(JSON.stringify(value)); }
        catch (_) { return value; }
    }

    function normalizeSettings(settings) {
        const onnx = settings && settings.onnx ? settings.onnx : {};
        const params = onnx.parameters || {};
        return {
            model: String(onnx.model || settings?.model || FALLBACK.model),
            task: String(onnx.task || settings?.task || FALLBACK.task),
            system_role: String(onnx.system_role || settings?.system_role || FALLBACK.system_role),
            device: String(onnx.device || settings?.device || FALLBACK.device).toLowerCase(),
            dtype: String(onnx.dtype || settings?.dtype || FALLBACK.dtype).toLowerCase(),
            parameters: {
                max_new_tokens: Math.max(1, Number(params.max_new_tokens ?? onnx.maxNewTokens ?? FALLBACK.parameters.max_new_tokens) || FALLBACK.parameters.max_new_tokens),
                temperature: Math.max(0, Number(params.temperature ?? onnx.temperature ?? FALLBACK.parameters.temperature)),
                top_p: Math.max(0, Math.min(1, Number(params.top_p ?? FALLBACK.parameters.top_p))),
                top_k: Math.max(1, Number(params.top_k ?? FALLBACK.parameters.top_k) || FALLBACK.parameters.top_k),
                repetition_penalty: Math.max(1, Number(params.repetition_penalty ?? FALLBACK.parameters.repetition_penalty) || FALLBACK.parameters.repetition_penalty),
                do_sample: params.do_sample !== undefined ? !!params.do_sample : (onnx.doSample !== undefined ? !!onnx.doSample : FALLBACK.parameters.do_sample)
            }
        };
    }

    function setStatus(patch) {
        Object.assign(runtime, patch || {});
        window.dispatchEvent(new CustomEvent("littlehollow:onnx-status", {
            detail: clone(getStatus())
        }));
    }

    function getStatus() {
        return {
            ready: runtime.state === "ready",
            state: runtime.state,
            progress: Number(runtime.progress) || 0,
            message: runtime.message || "",
            model: runtime.model,
            device: runtime.device,
            dtype: runtime.dtype
        };
    }

    function revokeWorker() {
        if (worker) {
            try { worker.terminate(); } catch (_) {}
            worker = null;
        }
        if (workerUrl) {
            try { URL.revokeObjectURL(workerUrl); } catch (_) {}
            workerUrl = null;
        }
        workerReady = false;
        for (const entry of pending.values()) {
            entry.reject(new Error("ONNX worker stopped."));
        }
        pending.clear();
    }

    function createWorker() {
        if (worker) return worker;

        const source = `
            import { env, pipeline, TextStreamer } from ${JSON.stringify(TRANSFORMERS_URL)};

            env.allowRemoteModels = true;
            env.allowLocalModels = false;
            env.useBrowserCache = true;
            env.useCustomCache = false;

            let generatorPromise = null;
            let loadedKey = "";

            const post = (data) => self.postMessage(data);

            async function getGenerator(input) {
                const key = JSON.stringify({
                    task: input.task,
                    model: input.model,
                    device: input.device,
                    dtype: input.dtype
                });

                if (!generatorPromise || loadedKey !== key) {
                    generatorPromise = null;
                    loadedKey = key;
                    generatorPromise = pipeline(
                        input.task,
                        input.model,
                        {
                            device: input.device,
                            dtype: input.dtype,
                            progress_callback: (x) => post({
                                requestId: input.requestId,
                                type: "progress",
                                progress: x
                            })
                        }
                    );
                }

                return generatorPromise;
            }

            self.addEventListener("message", async (event) => {
                const input = event.data || {};
                const requestId = input.requestId;

                try {
                    if (input.type === "load") {
                        await getGenerator(input);
                        post({ requestId, type: "ready" });
                        return;
                    }

                    if (input.type === "unload") {
                        generatorPromise = null;
                        loadedKey = "";
                        post({ requestId, type: "unloaded" });
                        return;
                    }

                    if (input.type !== "generate") return;

                    const generator = await getGenerator(input);
                    const streamer = new TextStreamer(generator.tokenizer, {
                        skip_prompt: true,
                        skip_special_tokens: true,
                        callback_function: (text) => post({
                            requestId,
                            type: "token",
                            text
                        })
                    });

                    const messages = Array.isArray(input.messages) && input.messages.length
                        ? input.messages
                        : (input.text || "");

                    await generator(messages, {
                        ...(input.parameters || {}),
                        return_full_text: false,
                        streamer
                    });

                    post({ requestId, type: "complete" });
                } catch (error) {
                    post({
                        requestId,
                        type: "error",
                        message: error instanceof Error ? error.message : String(error),
                        stack: error?.stack || ""
                    });
                }
            });
        `;

        workerUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        worker = new Worker(workerUrl, { type: "module" });
        worker.addEventListener("message", onWorkerMessage);
        worker.addEventListener("error", (event) => {
            setStatus({ state: "error", progress: 0, message: event?.message || "ONNX worker error." });
        });
        return worker;
    }

    function post(type, input) {
        const w = createWorker();
        const requestId = `onnx_${++requestSerial}`;
        return new Promise((resolve, reject) => {
            pending.set(requestId, { resolve, reject });
            w.postMessage({ ...(input || {}), type, requestId });
        });
    }

    function onWorkerMessage(event) {
        const data = event.data || {};
        const requestId = data.requestId;
        const entry = pending.get(requestId);

        if (data.type === "progress") {
            const p = data.progress || {};
            const percentage = Number(p.progress ?? 0);
            setStatus({
                state: "downloading",
                progress: Number.isFinite(percentage) ? percentage : 0,
                message: p.file
                    ? `Downloading ${p.file}${p.loaded != null && p.total != null ? ` — ${p.loaded} / ${p.total}` : ""}`
                    : "Downloading ONNX model..."
            });
            if (entry && typeof entry.onProgress === "function") entry.onProgress(p);
            return;
        }

        if (!entry) return;

        if (data.type === "token") {
            if (typeof entry.onToken === "function") entry.onToken(String(data.text || ""));
            return;
        }

        if (data.type === "ready") {
            pending.delete(requestId);
            workerReady = true;
            entry.resolve(data);
            return;
        }

        if (data.type === "unloaded") {
            pending.delete(requestId);
            workerReady = false;
            entry.resolve(data);
            return;
        }

        if (data.type === "complete") {
            pending.delete(requestId);
            entry.resolve(data);
            return;
        }

        if (data.type === "error") {
            pending.delete(requestId);
            entry.reject(new Error(data.message || "ONNX model execution failed."));
        }
    }

    function extractToolCalls(text) {
        const calls = [];
        const source = String(text || "");
        const tagged = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi;
        let match;
        while ((match = tagged.exec(source))) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed && typeof parsed.name === "string") {
                    calls.push({ name: parsed.name, arguments: parsed.arguments || {} });
                }
            } catch (_) {}
        }
        return calls;
    }

    function stripToolCalls(text) {
        return String(text || "")
            .replace(/<tool_call>\s*[\s\S]*?\s*<\/tool_call>/gi, "")
            .trim();
    }

    async function prepare(settings) {
        const cfg = normalizeSettings(settings || {});
        setStatus({
            state: "starting",
            progress: 0,
            message: `Starting ONNX runtime for ${cfg.model}...`,
            model: cfg.model,
            device: cfg.device,
            dtype: cfg.dtype
        });

        try {
            await post("load", cfg);
            setStatus({ state: "ready", progress: 100, message: "ONNX model is ready." });
            return { status: getStatus() };
        } catch (error) {
            setStatus({ state: "error", progress: 0, message: error?.message || String(error) });
            throw error;
        }
    }

    async function unload() {
        try {
            if (worker) {
                try { await post("unload", {}); } catch (_) {}
            }
        } finally {
            revokeWorker();
            setStatus({ state: "not_loaded", progress: 0, message: "ONNX runtime unloaded." });
        }
    }

    async function chat({ messages, settings, executeTool, onToken }) {
        const cfg = normalizeSettings(settings || {});
        const maxToolRounds = Math.max(1, Math.min(32, Number(settings?.agent?.maxToolRounds || 8)));
        const sourceMessages = Array.isArray(messages) ? clone(messages) : [{ role: "user", content: String(messages || "") }];

        if (!worker || !workerReady || runtime.model !== cfg.model || runtime.device !== cfg.device || runtime.dtype !== cfg.dtype) {
            await prepare(settings);
        }

        let workingMessages = sourceMessages;
        let finalText = "";

        for (let round = 0; round < maxToolRounds; round++) {
            let generated = "";
            setStatus({ state: "generating", progress: 100, message: "ONNX model inferencing..." });

            await new Promise((resolve, reject) => {
                const w = createWorker();
                const requestId = `onnx_${++requestSerial}`;
                pending.set(requestId, {
                    resolve,
                    reject,
                    onToken: (token) => {
                        generated += token;
                        if (typeof onToken === "function") return onToken(token);
                    }
                });
                w.postMessage({
                    type: "generate",
                    requestId,
                    ...cfg,
                    messages: workingMessages
                });
            });

            const calls = extractToolCalls(generated);
            if (!calls.length) {
                finalText = stripToolCalls(generated);
                setStatus({ state: "ready", progress: 100, message: "ONNX model is ready." });
                return {
                    message: { role: "assistant", content: finalText },
                    provider: PROVIDER_ID,
                    model: cfg.model,
                    rounds: round + 1
                };
            }

            workingMessages = workingMessages.concat([{ role: "assistant", content: generated }]);

            for (const call of calls) {
                const result = await executeTool(call.name, call.arguments || {});
                workingMessages.push({
                    role: "user",
                    content: `<tool_result name="${call.name}">${JSON.stringify(result)}<\/tool_result>\nUse this live tool result to answer the original user request.`
                });
            }
        }

        setStatus({ state: "ready", progress: 100, message: "ONNX model is ready." });
        return {
            message: { role: "assistant", content: finalText || "I reached the tool-call limit for this response." },
            provider: PROVIDER_ID,
            model: cfg.model,
            rounds: maxToolRounds,
            maxRoundsReached: true
        };
    }


    const provider = {
        id: PROVIDER_ID,
        prepare,
        chat,
        unload,
        getStatus,
        getSettings: () => clone(runtime)
    };

    window.LittleHollowAIProviders = window.LittleHollowAIProviders || {};
    window.LittleHollowAIProviders[PROVIDER_ID] = provider;

    window.LittleHollowONNX = provider;

    window.addEventListener("beforeunload", revokeWorker);
})();
