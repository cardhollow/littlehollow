/* js/aiOnnx.js */
(function () {
    "use strict";

    const REGISTRY = window.LittleHollowAIProviders = window.LittleHollowAIProviders || {};
    const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";

    const DEFAULTS = {
        model: "onnx-community/Qwen2.5-0.5B-Instruct",
        task: "text-generation",
        device: "wasm",
        dtype: "q4",
        systemRole: "You are a helpful, concise, and accurate assistant.",
        max_new_tokens: 1024,
        temperature: 0.2,
        top_p: 0.95,
        top_k: 30,
        repetition_penalty: 1.05,
        do_sample: true,
        maxToolRounds: 8
    };

    let worker = null;
    let workerUrl = null;
    let loadPromise = null;
    let generationCounter = 0;

    const status = {
        state: "not_loaded",
        ready: false,
        progress: 0,
        message: "ONNX model is not loaded.",
        model: "",
        device: "",
        dtype: ""
    };

    function clone(value) {
        try { return JSON.parse(JSON.stringify(value)); }
        catch (_) { return value; }
    }

    function merge(base, extra) {
        const result = clone(base);
        if (!extra || typeof extra !== "object") return result;
        for (const [key, value] of Object.entries(extra)) {
            if (value && typeof value === "object" && !Array.isArray(value) && result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {
                result[key] = merge(result[key], value);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    function setStatus(patch) {
        Object.assign(status, patch || {});
        window.dispatchEvent(new CustomEvent("littlehollow:onnx-status", {
            detail: clone(status)
        }));
    }

    function normalizeSettings(settings) {
        const onnx = settings?.onnx || {};
        return merge(DEFAULTS, {
            model: onnx.model || settings?.model || DEFAULTS.model,
            task: settings?.task || DEFAULTS.task,
            device: onnx.device || settings?.device || DEFAULTS.device,
            dtype: onnx.dtype || settings?.dtype || DEFAULTS.dtype,
            systemRole: settings?.systemRole || onnx.systemRole || DEFAULTS.systemRole,
            max_new_tokens: Number(onnx.maxNewTokens ?? settings?.parameters?.max_new_tokens ?? DEFAULTS.max_new_tokens),
            temperature: Number(onnx.temperature ?? settings?.parameters?.temperature ?? DEFAULTS.temperature),
            top_p: Number(onnx.topP ?? settings?.parameters?.top_p ?? DEFAULTS.top_p),
            top_k: Number(onnx.topK ?? settings?.parameters?.top_k ?? DEFAULTS.top_k),
            repetition_penalty: Number(onnx.repetitionPenalty ?? settings?.parameters?.repetition_penalty ?? DEFAULTS.repetition_penalty),
            do_sample: onnx.doSample ?? settings?.parameters?.do_sample ?? DEFAULTS.do_sample,
            maxToolRounds: Number(settings?.agent?.maxToolRounds ?? DEFAULTS.maxToolRounds)
        });
    }

    function terminateWorker() {
        if (worker) {
            try { worker.terminate(); } catch (_) {}
            worker = null;
        }
        if (workerUrl) {
            try { URL.revokeObjectURL(workerUrl); } catch (_) {}
            workerUrl = null;
        }
        loadPromise = null;
    }

    function createWorker() {
        if (worker) return worker;

        const source = `
            import { env, pipeline, TextStreamer } from '${TRANSFORMERS_URL}';

            env.allowRemoteModels = true;
            env.allowLocalModels = false;
            env.useBrowserCache = true;
            env.useCustomCache = false;

            let generator = null;
            let loadedKey = '';

            function keyOf(c) {
                return [c.task, c.model, c.device, c.dtype].join('|');
            }

            async function load(c) {
                const key = keyOf(c);
                if (generator && loadedKey === key) return generator;
                generator = null;
                loadedKey = '';
                self.postMessage({ status: 'state', state: 'downloading', progress: 0, message: 'Downloading ONNX model...' });
                try {
                    generator = await pipeline(c.task, c.model, {
                        device: c.device,
                        dtype: c.dtype,
                        progress_callback: x => self.postMessage({
                            status: 'progress',
                            file: x?.file || '',
                            progress: Number(x?.progress || 0),
                            loaded: x?.loaded,
                            total: x?.total
                        })
                    });
                    loadedKey = key;
                    self.postMessage({ status: 'ready', progress: 100, message: 'ONNX model is ready.' });
                    return generator;
                } catch (e) {
                    const message = e instanceof Error ? e.message : String(e);
                    self.postMessage({ status: 'error', message });
                    throw e;
                }
            }

            self.addEventListener('message', async event => {
                const input = event.data || {};
                try {
                    if (input.type === 'load') {
                        await load(input.config);
                        return;
                    }

                    if (input.type === 'generate') {
                        const gen = await load(input.config);
                        let output = '';
                        const streamer = new TextStreamer(gen.tokenizer, {
                            skip_prompt: true,
                            skip_special_tokens: true,
                            callback_function: text => {
                                output += text;
                                self.postMessage({ status: 'token', id: input.id, text });
                            }
                        });

                        const messages = Array.isArray(input.messages) && input.messages.length
                            ? input.messages
                            : (input.text || '');

                        const result = await gen(messages, {
                            max_new_tokens: Number(input.parameters.max_new_tokens),
                            temperature: Number(input.parameters.temperature),
                            top_p: Number(input.parameters.top_p),
                            top_k: Number(input.parameters.top_k),
                            repetition_penalty: Number(input.parameters.repetition_penalty),
                            do_sample: Boolean(input.parameters.do_sample),
                            return_full_text: false,
                            streamer
                        });

                        let text = output;
                        if (!text && Array.isArray(result)) {
                            text = result[0]?.generated_text || '';
                        } else if (!text && result?.generated_text) {
                            text = result.generated_text;
                        }
                        self.postMessage({ status: 'complete', id: input.id, text: String(text || '') });
                    }
                } catch (e) {
                    const message = e instanceof Error ? e.message : String(e);
                    self.postMessage({ status: 'generation_error', id: input.id, message });
                }
            });
        `;

        workerUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        worker = new Worker(workerUrl, { type: "module" });
        return worker;
    }

    function wireWorker() {
        const w = createWorker();
        if (w.__littleHollowWired) return w;
        w.__littleHollowWired = true;
        w.addEventListener("message", event => {
            const data = event.data || {};
            if (data.status === "progress" || data.status === "downloading") {
                setStatus({ state: "downloading", ready: false, progress: Number(data.progress || 0), message: data.message || (data.file ? `Downloading ${data.file}` : "Downloading ONNX model...") });
            } else if (data.status === "ready") {
                setStatus({ state: "ready", ready: true, progress: 100, message: data.message || "ONNX model is ready." });
            } else if (data.status === "error") {
                setStatus({ state: "error", ready: false, progress: 0, message: data.message || "ONNX model failed to load." });
            }
        });
        return w;
    }

    async function prepare(settings) {
        const config = normalizeSettings(settings);
        const key = JSON.stringify({ model: config.model, task: config.task, device: config.device, dtype: config.dtype });

        if (status.ready && status._key === key) return { status: clone(status) };
        if (loadPromise && status._key === key) return loadPromise;

        if (status.ready && status._key !== key) unload();

        setStatus({ state: "starting", ready: false, progress: 0, message: `Starting ONNX runtime for ${config.model}...`, model: config.model, device: config.device, dtype: config.dtype, _key: key });
        const w = wireWorker();

        loadPromise = new Promise((resolve, reject) => {
            let settled = false;
            const onMessage = event => {
                const data = event.data || {};
                if (data.status === "ready") {
                    if (settled) return;
                    settled = true;
                    w.removeEventListener("message", onMessage);
                    setStatus({ state: "ready", ready: true, progress: 100, message: "ONNX model is ready.", _key: key });
                    resolve({ status: clone(status) });
                } else if (data.status === "error") {
                    if (settled) return;
                    settled = true;
                    w.removeEventListener("message", onMessage);
                    setStatus({ state: "error", ready: false, progress: 0, message: data.message || "Unable to load ONNX model.", _key: key });
                    reject(new Error(data.message || "Unable to load ONNX model."));
                } else if (data.status === "progress") {
                    setStatus({ state: "downloading", progress: Number(data.progress || 0), message: data.file ? `Downloading ${data.file}` : "Downloading ONNX model..." });
                }
            };
            w.addEventListener("message", onMessage);
            w.postMessage({ type: "load", config });
        }).catch(error => {
            loadPromise = null;
            throw error;
        });

        return loadPromise;
    }

    function unload() {
        terminateWorker();
        setStatus({ state: "not_loaded", ready: false, progress: 0, message: "ONNX model is not loaded.", model: "", device: "", dtype: "", _key: "" });
    }

    function cleanArgs(value) {
        if (!value) return {};
        if (typeof value === "object") return value;
        try { return JSON.parse(String(value)); } catch (_) { return {}; }
    }

    function extractToolCall(text) {
        const source = String(text || "");
        const tag = source.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/i);
        if (tag) {
            try {
                const parsed = JSON.parse(tag[1]);
                if (parsed && typeof parsed.name === "string") {
                    return { name: parsed.name, arguments: cleanArgs(parsed.arguments), raw: tag[0] };
                }
            } catch (_) {}
        }
        const json = source.match(/\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/);
        if (json) {
            try { return { name: json[1], arguments: JSON.parse(json[2]), raw: json[0] }; }
            catch (_) {}
        }
        return null;
    }

    function buildToolInstruction(tools) {
        const list = Array.isArray(tools) ? tools : [];
        const names = list.map(x => x?.function?.name || x?.name).filter(Boolean);
        return [
            "You have access to JavaScript tools.",
            "When live browser information is required, use a tool instead of guessing.",
            "When a tool is needed, output ONLY one tool call in this exact format:",
            '<tool_call>{"name":"TOOL_NAME","arguments":{}}</tool_call>',
            "Do not add markdown fences around a tool call.",
            names.length ? `Available tools: ${names.join(", ")}` : "No tools are currently available."
        ].join("\n");
    }

    function buildMessages(messages, config, tools) {
        const result = [];
        const system = config.systemRole ? String(config.systemRole) : "";
        if (system) result.push({ role: "system", content: system });
        result.push({ role: "system", content: buildToolInstruction(tools) });
        for (const message of Array.isArray(messages) ? messages : []) {
            if (!message) continue;
            const role = ["system", "user", "assistant"].includes(message.role) ? message.role : "user";
            if (role === "system") {
                if (!String(message.content || "").trim()) continue;
                result.push({ role, content: String(message.content) });
            } else {
                result.push({ role, content: typeof message.content === "string" ? message.content : String(message.content || "") });
            }
        }
        return result;
    }

    function runGeneration(config, messages) {
        const w = wireWorker();
        const id = ++generationCounter;
        return new Promise((resolve, reject) => {
            let output = "";
            const onMessage = event => {
                const data = event.data || {};
                if (data.id !== id) return;
                if (data.status === "token") {
                    const token = String(data.text || "");
                    output += token;
                    window.dispatchEvent(new CustomEvent("littlehollow:ai-token", { detail: { provider: "onnx", text: token } }));
                } else if (data.status === "complete") {
                    w.removeEventListener("message", onMessage);
                    resolve(String(data.text ?? output));
                } else if (data.status === "generation_error") {
                    w.removeEventListener("message", onMessage);
                    reject(new Error(String(data.message || "ONNX model execution failed.")));
                }
            };
            w.addEventListener("message", onMessage);
            w.postMessage({
                type: "generate",
                id,
                config,
                messages,
                parameters: {
                    max_new_tokens: Math.max(1, Number(config.max_new_tokens || DEFAULTS.max_new_tokens)),
                    temperature: Math.max(0, Number(config.temperature ?? DEFAULTS.temperature)),
                    top_p: Math.max(0, Math.min(1, Number(config.top_p ?? DEFAULTS.top_p))),
                    top_k: Math.max(1, Number(config.top_k || DEFAULTS.top_k)),
                    repetition_penalty: Math.max(1, Number(config.repetition_penalty || DEFAULTS.repetition_penalty)),
                    do_sample: Boolean(config.do_sample)
                }
            });
        });
    }

    async function chat({ messages, tools, settings, executeTool, onToken }) {
        const config = normalizeSettings(settings);
        await prepare(settings);

        let working = clone(messages || []);
        let lastText = "";
        const maxRounds = Math.max(1, Math.min(32, Number(config.maxToolRounds || DEFAULTS.maxToolRounds)));

        for (let round = 0; round < maxRounds; round++) {
            const promptMessages = buildMessages(working, config, tools);
            lastText = "";
            const originalDispatch = window.dispatchEvent;
            const text = await runGeneration(config, promptMessages);
            lastText = text;

            if (typeof onToken === "function") {
                // Streaming has already been emitted globally; the complete fallback is only
                // needed for runtimes that do not stream individual chunks.
                if (!text) await onToken("");
            }

            const toolCall = extractToolCall(text);
            if (!toolCall || typeof executeTool !== "function") {
                return {
                    message: { role: "assistant", content: text },
                    model: config.model,
                    status: clone(status)
                };
            }

            const result = await executeTool(toolCall.name, toolCall.arguments);
            working.push({ role: "assistant", content: text });
            working.push({
                role: "user",
                content: `<tool_result name="${String(toolCall.name)}">${JSON.stringify(result)}<\\/tool_result>\nUse this live tool result to answer the original user request.`
            });
        }

        return {
            message: { role: "assistant", content: lastText || "I reached the tool-call limit for this response." },
            model: config.model,
            status: clone(status),
            maxToolRoundsReached: true
        };
    }

    function getStatus() {
        const copy = clone(status);
        delete copy._key;
        return copy;
    }

    REGISTRY.onnx = {
        id: "onnx",
        prepare,
        unload,
        chat,
        getStatus
    };

    window.LittleHollowONNX = REGISTRY.onnx;

    window.addEventListener("beforeunload", terminateWorker);
})();
