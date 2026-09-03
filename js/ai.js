/* js/ai.js */
(function () {
    "use strict";

    const SETTINGS_KEY = "littlehollow.ai.settings";

    const DEFAULTS = {
        provider: "puter",
        mode: "interactive",
        puter: {
            model: "mistralai/ministral-3b-2512"
        },
        onnx: {
            model: "onnx-community/Qwen2.5-0.5B-Instruct",
            device: "webgpu",
            dtype: "q4",
            maxNewTokens: 256,
            temperature: 0.7
        },
        gguf: {
            model: "",
            context: 8192,
            threads: 4,
            maxNewTokens: 512,
            temperature: 0.7
        },
        gemini: {
            apiKey: "",
            model: "gemini-3.5-flash",
            pythonTool: false,
            maxOutputTokens: 4096,
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

    const PROVIDER_FILES = {
        puter: "js/aiPuter.js",
        onnx: "js/aiOnnx.js",
        gguf: "js/aiGGUF.js",
        gemini: "js/aiGemini.js"
    };

    const providerPromises = Object.create(null);
    let settings = loadSettings();
    const history = [];
    let liveTimer = null;
    let liveRunning = false;
    let livePending = false;
    let lastLiveRun = 0;
    let lastLiveHash = "";

    function clone(value) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_) {
            return value;
        }
    }

    function merge(base, extra) {
        const result = clone(base);
        if (!extra || typeof extra !== "object") return result;

        for (const key of Object.keys(extra)) {
            const value = extra[key];
            if (value && typeof value === "object" && !Array.isArray(value)) {
                result[key] = Object.assign({}, result[key] || {}, value);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) return clone(DEFAULTS);
            return merge(DEFAULTS, JSON.parse(raw));
        } catch (error) {
            console.error("Little Hollow AI settings error:", error);
            return clone(DEFAULTS);
        }
    }

    function saveSettings(next) {
        settings = merge(DEFAULTS, next || {});
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return clone(settings);
    }

    function makeSystemMessage() {
        return {
            role: "system",
            content: String(window.SYSTEM_PROMPT || "")
        };
    }

    history.push(makeSystemMessage());

    function refreshSystemMessage() {
        history[0] = makeSystemMessage();
    }

    function trimHistory() {
        if (history.length <= 80) return;
        history.splice(1, history.length - 80);
    }

    function loadScript(src) {
        if (providerPromises[src]) return providerPromises[src];

        providerPromises[src] = new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[data-littlehollow-ai-provider="${src}"]`);
            if (existing) {
                if (existing.dataset.loaded === "1") {
                    resolve();
                    return;
                }
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", () => reject(new Error(`Failed to load provider: ${src}`)), { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = src;
            script.async = false;
            script.dataset.littlehollowAiProvider = src;
            script.addEventListener("load", () => {
                script.dataset.loaded = "1";
                resolve();
            }, { once: true });
            script.addEventListener("error", () => reject(new Error(`Failed to load AI provider: ${src}`)), { once: true });
            document.head.appendChild(script);
        }).catch(error => {
            delete providerPromises[src];
            throw error;
        });

        return providerPromises[src];
    }

    async function getProvider(name) {
        const providerName = name || loadSettings().provider;
        const file = PROVIDER_FILES[providerName];
        if (!file) throw new Error(`Unsupported AI provider: ${providerName}`);

        await loadScript(file);
        const registry = window.LittleHollowAIProviders || {};
        const provider = registry[providerName];

        if (!provider || typeof provider.chat !== "function") {
            throw new Error(`AI provider module did not register correctly: ${providerName}`);
        }
        return provider;
    }

    async function executeTool(name, args) {
        if (!window.Tools || typeof window.Tools.execute !== "function") {
            throw new Error("Little Hollow Tools.execute() is unavailable.");
        }
        return window.Tools.execute(name, args || {});
    }

    function messageText(message) {
        if (!message) return "";
        if (typeof message.content === "string") return message.content;
        if (Array.isArray(message.content)) {
            return message.content.map(part => {
                if (typeof part === "string") return part;
                return typeof part?.text === "string" ? part.text : "";
            }).join("");
        }
        return "";
    }

    function getStateSnapshot() {
        try {
            if (window.LittleHollowState && typeof window.LittleHollowState.getSnapshot === "function") {
                return window.LittleHollowState.getSnapshot();
            }
        } catch (error) {
            console.warn("State snapshot failed:", error);
        }
        return null;
    }

    function appendState(text) {
        const state = getStateSnapshot();
        if (state == null) return String(text || "");
        let serialized = "";
        try {
            serialized = JSON.stringify(state, null, 2);
        } catch (_) {}
        if (!serialized) return String(text || "");
        return `${String(text || "")}\n\n[LITTLE HOLLOW CURRENT STATE]\n${serialized}\n[/LITTLE HOLLOW CURRENT STATE]`;
    }

    async function runAgent(text, options) {
        options = options || {};
        settings = loadSettings();
        refreshSystemMessage();

        let userText = text == null ? "" : String(text);
        if (options.includeState) userText = appendState(userText);

        history.push({ role: "user", content: userText });
        trimHistory();

        if (window.Avatar && typeof window.Avatar.setEye === "function") {
            try { window.Avatar.setEye("thinking", -1); } catch (_) {}
        }

        window.dispatchEvent(new CustomEvent("littlehollow:ai-start", {
            detail: { provider: settings.provider, text: userText }
        }));

        try {
            const provider = await getProvider(settings.provider);
            const tools = window.Tools && Array.isArray(window.Tools.definitions)
                ? window.Tools.definitions
                : [];

            const onToken = typeof options.onToken === "function"
                ? async token => {
                    window.dispatchEvent(new CustomEvent("littlehollow:ai-stream", {
                        detail: { provider: settings.provider, token }
                    }));
                    return options.onToken(token);
                }
                : async token => {
                    window.dispatchEvent(new CustomEvent("littlehollow:ai-stream", {
                        detail: { provider: settings.provider, token }
                    }));
                };

            const result = await provider.chat({
                messages: clone(history),
                tools: clone(tools),
                settings: clone(settings),
                executeTool,
                onToken
            });

            const message = result?.message || { role: "assistant", content: "" };
            const assistantText = messageText(message);

            history.push({ role: "assistant", content: assistantText });
            trimHistory();

            if (window.Avatar && typeof window.Avatar.setEye === "function") {
                try { window.Avatar.setEye("idle", 1200); } catch (_) {}
            }

            window.dispatchEvent(new CustomEvent("littlehollow:ai-end", {
                detail: {
                    provider: settings.provider,
                    model: result?.model || null,
                    text: assistantText,
                    result: clone(result)
                }
            }));

            return result;
        } catch (error) {
            if (window.Avatar && typeof window.Avatar.setEye === "function") {
                try { window.Avatar.setEye("error", 1600); } catch (_) {}
            }
            window.dispatchEvent(new CustomEvent("littlehollow:ai-error", {
                detail: { provider: settings.provider, error }
            }));
            throw error;
        }
    }

    async function run(text, options) {
        return runAgent(text, options);
    }

    async function chat(text, options) {
        return runAgent(text, options);
    }

    // Original Little Hollow Messenger compatibility API.
    // app/messenger.html expects: { visibleMessage: string, log: string[] }
    // Keep the richer runAgent/chat APIs unchanged underneath.
    async function send(text, options) {
        const result = await runAgent(text, options || {});
        const visibleMessage = messageText(result?.message || result);
        const log = Array.isArray(result?.log) ? result.log.map(String) : [];

        return {
            visibleMessage,
            log,
            provider: result?.provider || settings.provider,
            model: result?.model || null,
            result
        };
    }

    function getSettings() {
        settings = loadSettings();
        return clone(settings);
    }

    function setSettings(next) {
        return saveSettings(next);
    }

    function getHistory() {
        return clone(history);
    }

    function clearHistory() {
        history.length = 0;
        history.push(makeSystemMessage());
        window.dispatchEvent(new CustomEvent("littlehollow:ai-history-cleared"));
    }

    function setProvider(provider) {
        settings = loadSettings();
        settings.provider = String(provider || "puter");
        return saveSettings(settings);
    }

    function scheduleLive(text, options) {
        options = options || {};
        if (!settings.live.enabled && options.force !== true) return;

        clearTimeout(liveTimer);
        livePending = true;
        const wait = Math.max(0, Number(settings.live.debounceMs || 1800));

        liveTimer = setTimeout(async () => {
            if (liveRunning) return;
            livePending = false;

            const now = Date.now();
            const minInterval = Math.max(0, Number(settings.live.minIntervalMs || 2500));
            if (now - lastLiveRun < minInterval) return;

            const hash = String(text || "");
            if (!options.force && hash === lastLiveHash) return;
            lastLiveHash = hash;
            lastLiveRun = now;
            liveRunning = true;

            try {
                await runAgent(text, options);
            } catch (error) {
                console.error("Little Hollow live AI error:", error);
            } finally {
                liveRunning = false;
            }
        }, wait);
    }

    window.AI = {
        runAgent,
        run,
        chat,
        send,
        getProvider,
        getSettings,
        setSettings,
        setProvider,
        getHistory,
        clearHistory,
        scheduleLive,
        isLiveRunning: () => liveRunning,
        isLivePending: () => livePending,
        SETTINGS_KEY,
        DEFAULTS: clone(DEFAULTS),
        PROVIDER_FILES: clone(PROVIDER_FILES)
    };

    // Backwards-compatible alias used by some Little Hollow revisions.
    window.LittleHollowAI = window.AI;
})();
