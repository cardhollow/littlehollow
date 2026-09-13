/* js/aiOnnx.js - Little Hollow local Transformers.js / ONNX provider */
(function () {
    "use strict";

    const REGISTRY = window.LittleHollowAIProviders = window.LittleHollowAIProviders || {};
    const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
    const STORAGE_KEY = "littlehollow.ai.settings";

    const provider = {
        id: "onnx",
        worker: null,
        workerUrl: null,
        workerPromise: null,
        ready: false,
        loading: false,
        model: "HuggingFaceTB/SmolLM2-360M-Instruct",
        status: {
            ready: false,
            state: "not_loaded",
            progress: 0,
            message: "ONNX model is not loaded.",
            model: "HuggingFaceTB/SmolLM2-360M-Instruct",
            device: "wasm",
            dtype: "auto",
            files: []
        }
    };

    function clone(value) {
        try { return JSON.parse(JSON.stringify(value)); }
        catch (_) { return value; }
    }

    function nowMessage(text) {
        return String(text || "");
    }

    function emit(type, detail) {
        const payload = Object.assign({ type }, clone(detail || {}));
        try { window.dispatchEvent(new CustomEvent("littlehollow:ai-onnx", { detail: payload })); } catch (_) {}
        try { window.dispatchEvent(new CustomEvent("littlehollow:ai-onnx-" + String(type).toLowerCase(), { detail: payload })); } catch (_) {}
    }

    function setStatus(patch) {
        provider.status = Object.assign({}, provider.status, patch || {});
        provider.ready = !!provider.status.ready;
        provider.loading = ["starting", "loading", "downloading", "generating"].includes(provider.status.state);
        emit("status", provider.status);
    }

    function updateFileProgress(data) {
        const progress = Number(data && data.progress || 0);
        const item = {
            file: data && data.file || "",
            progress: Number.isFinite(progress) ? progress : 0,
            loaded: data && data.loaded,
            total: data && data.total,
            status: data && data.status || "progress"
        };
        const files = Array.isArray(provider.status.files) ? [...provider.status.files] : [];
        const index = files.findIndex(x => x.file === item.file);
        if (index >= 0) files[index] = Object.assign({}, files[index], item);
        else files.push(item);
        const active = files.filter(x => x.file);
        const overall = active.length ? active.reduce((sum, x) => sum + (Number(x.progress) || 0), 0) / active.length : item.progress;
        setStatus({ files, progress: overall });
        emit("progress", item);
    }

    function createWorker() {
        if (provider.worker) return provider.worker;

        const workerSource = `
            import { env, pipeline, TextStreamer } from "${TRANSFORMERS_URL}";

            let generatorPromise = null;
            let generatorKey = "";

            function fail(message) {
                self.postMessage({ status: "error", output: String(message || "Unknown worker error") });
            }

            async function getGenerator(parameters) {
                const key = JSON.stringify({
                    task: parameters.task,
                    model: parameters.model,
                    device: parameters.device,
                    dtype: parameters.dtype
                });

                if (generatorPromise && generatorKey === key) {
                    return generatorPromise;
                }

                env.allowRemoteModels = true;
                env.allowLocalModels = false;
                env.useBrowserCache = true;
                env.useCustomCache = false;

                const requestedDevice = parameters.device || "wasm";
                generatorKey = key;
                generatorPromise = (async () => {
                    try {
                        return await pipeline(
                            parameters.task || "text-generation",
                            parameters.model,
                            {
                                device: requestedDevice,
                                dtype: parameters.dtype || "auto",
                                progress_callback: (x) => self.postMessage(x)
                            }
                        );
                    } catch (error) {
                        if (String(requestedDevice).toLowerCase() !== "webgpu") throw error;
                        self.postMessage({ status: "fallback", message: "WebGPU unavailable; falling back to WASM...", error: error instanceof Error ? error.message : String(error) });
                        const wasmKey = JSON.stringify({ task: parameters.task || "text-generation", model: parameters.model, device: "wasm", dtype: parameters.dtype || "auto" });
                        generatorKey = wasmKey;
                        return await pipeline(
                            parameters.task || "text-generation",
                            parameters.model,
                            {
                                device: "wasm",
                                dtype: parameters.dtype || "auto",
                                progress_callback: (x) => self.postMessage(x)
                            }
                        );
                    }
                })();

                return generatorPromise;
            }

            self.addEventListener("message", async (event) => {
                const input = event.data || {};
                try {
                    const generator = await getGenerator(input);

                    if (input.op === "load") {
                        self.postMessage({
                            status: "ready",
                            model: input.model,
                            device: input.device || "wasm",
                            dtype: input.dtype || "auto"
                        });
                        return;
                    }

                    const streamer = new TextStreamer(generator.tokenizer, {
                        skip_prompt: true,
                        skip_special_tokens: true,
                        callback_function: (text) => self.postMessage({ status: "update", output: text })
                    });

                    const message = Array.isArray(input.messages) && input.messages.length
                        ? input.messages
                        : (input.text || "");

                    await generator(message, {
                        ...(input.parameters || {}),
                        return_full_text: false,
                        streamer
                    });

                    self.postMessage({ status: "complete" });
                } catch (error) {
                    fail(error instanceof Error ? error.message : String(error));
                }
            });
        `;

        provider.workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
        provider.worker = new Worker(provider.workerUrl, { type: "module" });
        provider.worker.addEventListener("message", onWorkerMessage);
        provider.worker.addEventListener("error", onWorkerError);
        return provider.worker;
    }

    function destroyWorker() {
        if (provider.worker) {
            try { provider.worker.terminate(); } catch (_) {}
            provider.worker = null;
        }
        if (provider.workerUrl) {
            try { URL.revokeObjectURL(provider.workerUrl); } catch (_) {}
            provider.workerUrl = null;
        }
        provider.workerPromise = null;
        provider.ready = false;
        provider.loading = false;
    }

    function onWorkerError(event) {
        const message = event && (event.message || event.error && event.error.message) || "Unknown worker error";
        setStatus({
            ready: false,
            state: "error",
            progress: 0,
            message: "ONNX worker error: " + message
        });
        emit("error", { message });
    }

    function onWorkerMessage(event) {
        const data = event.data || {};

        if (["initiate", "progress"].includes(data.status)) {
            updateFileProgress(data);
            setStatus({
                state: "loading",
                progress: Number(data.progress || 0),
                message: "Downloading " + String(data.file || "model files") + "..."
            });
            return;
        }

        if (data.status === "done") {
            updateFileProgress(data);
            return;
        }

        if (data.status === "ready") {
            setStatus({ ready: true, state: "ready", progress: 100, model: data.model || provider.model, device: data.device || provider.status.device || "wasm", dtype: data.dtype || provider.status.dtype || "auto", message: "ONNX model is ready." });
            return;
        }

        if (data.status === "update") {
            emit("token", { token: String(data.output || "") });
            return;
        }

        if (data.status === "complete") {
            setStatus({ ready: true, state: "ready", progress: 100, message: "ONNX inference complete." });
            emit("complete", {});
            return;
        }

        if (data.status === "error") {
            setStatus({ ready: false, state: "error", progress: 0, message: String(data.output || "Unknown model error") });
            emit("error", { message: String(data.output || "Unknown model error") });
        }
    }

    function post(payload) {
        const worker = createWorker();
        setStatus({ state: provider.ready ? "generating" : "loading", message: provider.ready ? "Model inferencing..." : "Starting ONNX runtime..." });
        worker.postMessage(payload);
    }

    async function prepare(settings) {
        const cfg = settings || {};
        const onnx = cfg.onnx || cfg;
        let device = String(onnx.device || "wasm").toLowerCase();
        const dtype = String(onnx.dtype || "auto").toLowerCase();
        const model = String(onnx.model || "HuggingFaceTB/SmolLM2-360M-Instruct");

        // The supplied working HTML defaults to WASM. Persisting an old WebGPU value
        // from an earlier Little Hollow build must not silently make the new default fail.
        if (!device || device === "auto") device = "wasm";

        provider.model = model;
        setStatus({
            ready: false,
            state: "starting",
            progress: 0,
            message: "Starting ONNX runtime...",
            model,
            device,
            dtype
        });

        if (provider.worker) destroyWorker();
        createWorker();

        post({
            op: "load",
            task: "text-generation",
            model,
            device,
            dtype
        });

        // Wait for the worker to either become ready or fail. The working HTML
        // considers model readiness separate from the first generated response.
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error("Timed out while loading the ONNX model."));
            }, 5 * 60 * 1000);

            const cleanup = () => {
                clearTimeout(timeout);
                window.removeEventListener("littlehollow:ai-onnx-status", onStatus);
                window.removeEventListener("littlehollow:ai-onnx-error", onError);
            };
            const onStatus = event => {
                const state = event.detail || {};
                if (state.state === "ready") { cleanup(); resolve(state); }
                else if (state.state === "error") { cleanup(); reject(new Error(state.message || "ONNX model failed to load.")); }
            };
            const onError = event => {
                cleanup();
                reject(new Error(event.detail?.message || "ONNX model failed to load."));
            };

            window.addEventListener("littlehollow:ai-onnx-status", onStatus);
            window.addEventListener("littlehollow:ai-onnx-error", onError);
        });

        return { ok: true, status: getStatus() };
    }

    async function chat({ messages, settings, executeTool, onToken }) {
        const cfg = settings || {};
        const onnx = cfg.onnx || {};

        if (!provider.ready) {
            await prepare(cfg);
        }

        const history = Array.isArray(messages) ? clone(messages) : [];

        const request = {
            task: "text-generation",
            model: provider.model,
            device: provider.status.device || "wasm",
            dtype: provider.status.dtype || "auto",
            messages: history,
            parameters: {
                max_new_tokens: Number(onnx.max_new_tokens ?? onnx.maxNewTokens ?? 1024),
                temperature: Number(onnx.temperature ?? 0.2),
                top_p: Number(onnx.top_p ?? 0.95),
                top_k: Number(onnx.top_k ?? 30),
                repetition_penalty: Number(onnx.repetition_penalty ?? 1.05),
                do_sample: onnx.do_sample !== false
            }
        };

        let output = "";
        const toolCalls = [];
        let resolveComplete;
        let rejectComplete;
        const completed = new Promise((resolve, reject) => { resolveComplete = resolve; rejectComplete = reject; });

        const tokenHandler = event => {
            const token = String(event.detail?.token || "");
            if (!token) return;
            output += token;
            if (typeof onToken === "function") return onToken(token);
        };
        const doneHandler = () => resolveComplete();
        const errorHandler = event => rejectComplete(new Error(event.detail?.message || "ONNX inference failed."));

        window.addEventListener("littlehollow:ai-onnx-token", tokenHandler);
        window.addEventListener("littlehollow:ai-onnx-complete", doneHandler);
        window.addEventListener("littlehollow:ai-onnx-error", errorHandler);
        try {
            post(request);
            await completed;
        } finally {
            window.removeEventListener("littlehollow:ai-onnx-token", tokenHandler);
            window.removeEventListener("littlehollow:ai-onnx-complete", doneHandler);
            window.removeEventListener("littlehollow:ai-onnx-error", errorHandler);
        }

        // Keep the same text-based tool-call convention used by the working HTML.
        const match = output.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/i);
        if (match) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed && parsed.name) {
                    const args = parsed.arguments && typeof parsed.arguments === "string"
                        ? JSON.parse(parsed.arguments)
                        : (parsed.arguments || {});
                    toolCalls.push({
                        id: "onnx_" + Date.now(),
                        type: "function",
                        function: { name: String(parsed.name), arguments: JSON.stringify(args) }
                    });
                }
            } catch (_) {}
        }

        if (toolCalls.length && typeof executeTool === "function") {
            const call = toolCalls[0];
            const result = await executeTool(call.function.name, JSON.parse(call.function.arguments || "{}"));
            const continuation = clone(history);
            continuation.push({ role: "assistant", content: output });
            continuation.push({
                role: "user",
                content: `<tool_result name="${call.function.name}">${JSON.stringify(result)}</tool_result>\nUse this live tool result to answer the original user request.`
            });
            return chat({ messages: continuation, settings, executeTool, onToken });
        }

        return {
            message: { role: "assistant", content: output.replace(/<tool_call>[\s\S]*?<\/tool_call>/ig, "").trim() },
            provider: "onnx",
            model: provider.model,
            toolCalls: [],
            rounds: 0
        };
    }

    function unload() {
        destroyWorker();
        setStatus({ ready: false, state: "not_loaded", progress: 0, message: "ONNX runtime unloaded." });
    }

    function getStatus() {
        return clone(provider.status);
    }

    REGISTRY.onnx = {
        id: "onnx",
        prepare,
        chat,
        unload,
        getStatus
    };

    // Compatibility aliases for older manager revisions.
    window.LittleHollowONNX = REGISTRY.onnx;
})();
