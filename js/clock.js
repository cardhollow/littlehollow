(() => {
    if (window.__CHXD_CLOCK_SERVICE__) return;

    const SERVICE_KEY = "__CHXD_CLOCK_SERVICE__";
    const APP_NAME = "Clock";
    const STORAGE_KEY = "chxd:/local/Clock/state.json";
    const ALARM_SOUND_DIR = "chxd:/local/Clock/Alarms/";

    const service = {
        alarms: [],
        timer: {
            running: false,
            end: 0,
            remaining: 0,
            sound: ""
        },
        audioContext: null,
        initialized: false,
        lastAlarmMinute: "",
        lastTimerFire: 0,
        fs: null
    };

    window[SERVICE_KEY] = service;
    window.__CHXD_CLOCK_SERVICE__ = service;

    function getFS() {
        return (
            service.fs ||
            window.host?.FS ||
            window.CHXD?.FS ||
            window.parent?.host?.FS ||
            null
        );
    }

    async function readFile(path) {
        const fs = getFS();

        if (!fs?.read) {
            throw new Error("FS.read unavailable");
        }

        return await fs.read(path);
    }

    async function writeFile(path, data) {
        const fs = getFS();

        if (!fs?.write) {
            throw new Error("FS.write unavailable");
        }

        return await fs.write(path, data, true, true);
    }

    function normalizeAlarm(alarm) {
        return {
            id: Number(alarm.id) || Date.now(),
            time: String(alarm.time || "00:00"),
            label: String(alarm.label || "Alarm"),
            active: alarm.active !== false,
            soundPath: String(alarm.soundPath || ""),
            lastFired: String(alarm.lastFired || "")
        };
    }

    async function loadState() {
        let loaded = false;

        try {
            const raw = localStorage.getItem("chxd_clock_state_v1");

            if (raw) {
                const data = JSON.parse(raw);

                if (Array.isArray(data.alarms)) {
                    service.alarms = data.alarms.map(normalizeAlarm);
                }

                if (data.timer && typeof data.timer === "object") {
                    service.timer = {
                        running: !!data.timer.running,
                        end: Number(data.timer.end) || 0,
                        remaining: Number(data.timer.remaining) || 0,
                        sound: String(data.timer.sound || "")
                    };
                }

                loaded = true;
            }
        } catch {}

        if (loaded) return;

        try {
            const raw = await readFile(STORAGE_KEY);

            if (typeof raw === "string") {
                const data = JSON.parse(raw);

                if (Array.isArray(data.alarms)) {
                    service.alarms = data.alarms.map(normalizeAlarm);
                }

                if (data.timer && typeof data.timer === "object") {
                    service.timer = {
                        running: !!data.timer.running,
                        end: Number(data.timer.end) || 0,
                        remaining: Number(data.timer.remaining) || 0,
                        sound: String(data.timer.sound || "")
                    };
                }
            }
        } catch {}
    }

    async function saveState() {
        const data = {
            alarms: service.alarms,
            timer: service.timer
        };

        try {
            localStorage.setItem(
                "chxd_clock_state_v1",
                JSON.stringify(data)
            );
        } catch {}

        try {
            await writeFile(
                STORAGE_KEY,
                JSON.stringify(data)
            );
        } catch {}
    }

    function getAudioContext() {
        if (service.audioContext) return service.audioContext;

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) return null;

        try {
            service.audioContext = new AudioContextClass();
        } catch {
            service.audioContext = null;
        }

        return service.audioContext;
    }

    function unlockAudio() {
        const context = getAudioContext();

        if (!context) return;

        if (context.state === "suspended") {
            context.resume().catch(() => {});
        }
    }

    document.addEventListener("pointerdown", unlockAudio, true);
    document.addEventListener("touchstart", unlockAudio, true);
    document.addEventListener("keydown", unlockAudio, true);

    function playOscillator() {
        const context = getAudioContext();

        if (!context) return;

        if (context.state === "suspended") {
            context.resume().catch(() => {});
        }

        const start = context.currentTime;

        for (let i = 0; i < 4; i++) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            const frequency =
                i % 2 === 0
                    ? 880
                    : 660;

            oscillator.type = i === 3 ? "square" : "sine";

            oscillator.frequency.setValueAtTime(
                frequency,
                start
            );

            oscillator.frequency.setValueAtTime(
                frequency === 880 ? 988 : 740,
                start + 0.2
            );

            gain.gain.setValueAtTime(
                0.0001,
                start
            );

            gain.gain.exponentialRampToValueAtTime(
                0.3,
                start + 0.02
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                start + 0.55
            );

            oscillator.connect(gain);
            gain.connect(context.destination);

            oscillator.start(start);
            oscillator.stop(start + 0.6);
        }
    }

    async function normalizeAudioData(data) {
        if (data instanceof Blob) {
            return await data.arrayBuffer();
        }

        if (data instanceof ArrayBuffer) {
            return data;
        }

        if (ArrayBuffer.isView(data)) {
            return data.buffer.slice(
                data.byteOffset,
                data.byteOffset + data.byteLength
            );
        }

        if (typeof data === "string") {
            if (data.startsWith("data:")) {
                const comma = data.indexOf(",");

                if (comma !== -1) {
                    const meta = data.slice(0, comma);
                    const body = data.slice(comma + 1);

                    if (meta.includes(";base64")) {
                        const binary = atob(body);
                        const bytes =
                            new Uint8Array(binary.length);

                        for (let i = 0; i < binary.length; i++) {
                            bytes[i] =
                                binary.charCodeAt(i);
                        }

                        return bytes.buffer;
                    }

                    return new TextEncoder().encode(
                        decodeURIComponent(body)
                    ).buffer;
                }
            }

            try {
                const binary = atob(data);
                const bytes =
                    new Uint8Array(binary.length);

                for (let i = 0; i < binary.length; i++) {
                    bytes[i] =
                        binary.charCodeAt(i);
                }

                return bytes.buffer;
            } catch {
                throw new Error("Invalid audio data");
            }
        }

        if (data && typeof data === "object") {
            if (data.data !== undefined) {
                return normalizeAudioData(data.data);
            }

            if (data.buffer !== undefined) {
                return normalizeAudioData(data.buffer);
            }

            if (data.content !== undefined) {
                return normalizeAudioData(data.content);
            }

            if (data.file !== undefined) {
                return normalizeAudioData(data.file);
            }
        }

        throw new Error("Unsupported audio data");
    }

    async function playCustomSound(path) {
        if (!path) {
            playOscillator();
            return;
        }

        try {
            const raw = await readFile(path);
            const arrayBuffer =
                await normalizeAudioData(raw);

            const context = getAudioContext();

            if (!context) {
                playOscillator();
                return;
            }

            if (context.state === "suspended") {
                await context.resume();
            }

            const buffer =
                await context.decodeAudioData(
                    arrayBuffer.slice(0)
                );

            const source =
                context.createBufferSource();

            const gain =
                context.createGain();

            source.buffer = buffer;
            gain.gain.value = 1;

            source.connect(gain);
            gain.connect(context.destination);

            source.start();

            return;
        } catch {
            playOscillator();
        }
    }

    async function playSound(path) {
        if (path) {
            await playCustomSound(path);
            return;
        }

        playOscillator();
    }

    function todayKey() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function openClock() {
        try {
            if (window.Apps?.openApp) {
                const result =
                    window.Apps.openApp(APP_NAME);

                if (result?.catch) {
                    result.catch(() => {});
                }
            }
        } catch {}

        try {
            window.dispatchEvent(
                new CustomEvent("chxd-open-app", {
                    detail: {
                        appId: APP_NAME,
                        name: APP_NAME
                    }
                })
            );
        } catch {}

        try {
            for (const frame of Array.from(window.frames)) {
                frame.postMessage(
                    {
                        type: "chxd-open-clock"
                    },
                    "*"
                );
            }
        } catch {}
    }

    async function fireAlarm(alarm) {
        const key = todayKey();

        if (alarm.lastFired === key) return;

        alarm.lastFired = key;

        await saveState();

        openClock();

        await playSound(alarm.soundPath);

        setTimeout(() => {
            playSound(alarm.soundPath);
        }, 1200);

        setTimeout(() => {
            playSound(alarm.soundPath);
        }, 2400);

        notifyFrames({
            type: "chxd-clock-alarm-fired",
            alarm
        });
    }

    function fireTimer() {
        if (service.lastTimerFire === service.timer.end) {
            return;
        }

        service.lastTimerFire = service.timer.end;
        service.timer.running = false;
        service.timer.remaining = 0;

        saveState();

        openClock();

        playSound(service.timer.sound);

        setTimeout(() => {
            playSound(service.timer.sound);
        }, 1200);

        setTimeout(() => {
            playSound(service.timer.sound);
        }, 2400);

        notifyFrames({
            type: "chxd-clock-timer-fired"
        });
    }

    function normalizeTime(time) {
        const parts =
            String(time)
                .split(":")
                .map(Number);

        if (parts.length !== 2) {
            return null;
        }

        if (
            !Number.isFinite(parts[0]) ||
            !Number.isFinite(parts[1])
        ) {
            return null;
        }

        return {
            hour: Math.max(
                0,
                Math.min(23, parts[0])
            ),
            minute: Math.max(
                0,
                Math.min(59, parts[1])
            )
        };
    }

    function checkAlarms() {
        const now = new Date();

        const currentMinute =
            String(now.getHours()).padStart(2, "0") +
            ":" +
            String(now.getMinutes()).padStart(2, "0");

        if (service.lastAlarmMinute !== currentMinute) {
            service.lastAlarmMinute =
                currentMinute;

            for (const alarm of service.alarms) {
                if (!alarm.active) continue;

                const parsed =
                    normalizeTime(alarm.time);

                if (!parsed) continue;

                if (
                    parsed.hour === now.getHours() &&
                    parsed.minute === now.getMinutes()
                ) {
                    fireAlarm(alarm);
                }

                if (
                    alarm.lastFired === todayKey()
                ) {
                    if (
                        now.getHours() < parsed.hour ||
                        (
                            now.getHours() === parsed.hour &&
                            now.getMinutes() < parsed.minute
                        )
                    ) {
                        alarm.lastFired = "";
                    }
                }
            }

            saveState();
        }
    }

    function checkTimer() {
        if (!service.timer.running) return;

        const remaining =
            service.timer.end - Date.now();

        if (remaining <= 0) {
            fireTimer();
            return;
        }

        service.timer.remaining = remaining;

        notifyFrames({
            type: "chxd-clock-timer-state",
            timer: getTimerState()
        });
    }

    function getTimerState() {
        return {
            running: service.timer.running,
            end: service.timer.end,
            remaining: service.timer.running
                ? Math.max(
                    0,
                    service.timer.end - Date.now()
                )
                : service.timer.remaining,
            sound: service.timer.sound
        };
    }

    function notifyFrames(message) {
        try {
            window.postMessage(
                message,
                "*"
            );
        } catch {}

        try {
            for (const frame of Array.from(window.frames)) {
                frame.postMessage(
                    message,
                    "*"
                );
            }
        } catch {}
    }

    function sendState(source) {
        if (!source?.postMessage) return;

        source.postMessage(
            {
                type: "chxd-clock-state",
                alarms: service.alarms,
                timer: getTimerState()
            },
            "*"
        );
    }

    async function openFileSelector() {
        const parent = window;

        const candidates = [
            parent.CHXD?.FileSelector?.open,
            parent.CHXD?.FilePicker?.open,
            parent.LittleHollow?.FileSelector?.open,
            parent.LittleHollow?.FilePicker?.open,
            parent.Apps?.selectFile,
            parent.Apps?.pickFile,
            parent.selectChxdFile,
            parent.openFileSelector
        ];

        for (const candidate of candidates) {
            if (typeof candidate !== "function") {
                continue;
            }

            try {
                const result =
                    await candidate({
                        type: "audio",
                        accept: "audio/*",
                        multiple: false
                    });

                const selected =
                    Array.isArray(result)
                        ? result[0]
                        : result;

                if (selected) {
                    return normalizeSelectedFile(
                        selected
                    );
                }
            } catch {}
        }

        if (typeof window.showOpenFilePicker === "function") {
            try {
                const handles =
                    await window.showOpenFilePicker({
                        multiple: false,
                        types: [
                            {
                                description:
                                    "Audio",
                                accept: {
                                    "audio/*": [
                                        ".mp3",
                                        ".wav",
                                        ".ogg",
                                        ".oga",
                                        ".m4a",
                                        ".aac",
                                        ".flac",
                                        ".webm",
                                        ".opus"
                                    ]
                                }
                            }
                        ]
                    });

                if (handles?.[0]) {
                    const file =
                        await handles[0].getFile();

                    return {
                        file,
                        path: "",
                        name: file.name,
                        type: file.type
                    };
                }
            } catch {}
        }

        throw new Error(
            "No Little Hollow file selector is available"
        );
    }

    async function normalizeSelectedFile(value) {
        if (value instanceof File) {
            return {
                file: value,
                path: "",
                name: value.name,
                type: value.type
            };
        }

        if (value instanceof Blob) {
            return {
                file: value,
                path: "",
                name: "alarm",
                type: value.type
            };
        }

        if (typeof value === "string") {
            return {
                file: null,
                path: value,
                name: value.split("/").pop(),
                type: "audio/*"
            };
        }

        if (value && typeof value === "object") {
            return {
                file:
                    value.file ||
                    value.blob ||
                    null,
                path:
                    value.path ||
                    value.chxdPath ||
                    value.url ||
                    "",
                name:
                    value.name ||
                    value.fileName ||
                    "alarm",
                type:
                    value.type ||
                    "audio/*"
            };
        }

        throw new Error("Invalid selected file");
    }

    async function importSelectedSound() {
        const selected =
            await openFileSelector();

        if (!selected) {
            throw new Error("No sound selected");
        }

        if (selected.path?.startsWith("chxd:")) {
            return {
                path: selected.path,
                name: selected.name
            };
        }

        if (!selected.file) {
            throw new Error(
                "Selected item has no readable file"
            );
        }

        const file =
            selected.file instanceof File
                ? selected.file
                : new File(
                    [selected.file],
                    selected.name || "alarm",
                    {
                        type:
                            selected.type ||
                            selected.file.type ||
                            "audio/*"
                    }
                );

        const safeName =
            file.name
                .replace(
                    /[^a-zA-Z0-9._-]/g,
                    "_"
                )
                .replace(
                    /^[-.]+/,
                    ""
                ) ||
            "alarm";

        const path =
            ALARM_SOUND_DIR +
            Date.now() +
            "_" +
            safeName;

        const data =
            await file.arrayBuffer();

        await writeFile(path, data);

        return {
            path,
            name: file.name
        };
    }

    async function addAlarm(data) {
        const alarm = normalizeAlarm(data);

        service.alarms.push(alarm);

        await saveState();

        return alarm;
    }

    async function updateAlarm(id, changes) {
        const alarm =
            service.alarms.find(
                item => item.id === Number(id)
            );

        if (!alarm) return null;

        Object.assign(
            alarm,
            changes || {}
        );

        if (changes?.active === true) {
            alarm.lastFired = "";
        }

        await saveState();

        return alarm;
    }

    async function deleteAlarm(id) {
        service.alarms =
            service.alarms.filter(
                alarm =>
                    alarm.id !== Number(id)
            );

        await saveState();
    }

    async function startTimer(duration, sound) {
        const ms =
            Math.max(
                0,
                Number(duration) || 0
            );

        if (ms <= 0) return;

        service.timer.running = true;
        service.timer.end =
            Date.now() + ms;
        service.timer.remaining = ms;
        service.timer.sound =
            String(sound || "");

        service.lastTimerFire = 0;

        await saveState();

        openClock();

        notifyFrames({
            type: "chxd-clock-timer-state",
            timer: getTimerState()
        });
    }

    async function pauseTimer() {
        if (!service.timer.running) return;

        service.timer.remaining =
            Math.max(
                0,
                service.timer.end -
                Date.now()
            );

        service.timer.running = false;

        await saveState();

        notifyFrames({
            type: "chxd-clock-timer-state",
            timer: getTimerState()
        });
    }

    async function resumeTimer() {
        if (service.timer.running) return;

        if (
            service.timer.remaining <= 0
        ) {
            return;
        }

        service.timer.end =
            Date.now() +
            service.timer.remaining;

        service.timer.running = true;

        await saveState();

        notifyFrames({
            type: "chxd-clock-timer-state",
            timer: getTimerState()
        });
    }

    async function resetTimer() {
        service.timer.running = false;
        service.timer.end = 0;
        service.timer.remaining = 0;

        await saveState();

        notifyFrames({
            type: "chxd-clock-timer-state",
            timer: getTimerState()
        });
    }

    window.addEventListener(
        "message",
        async event => {
            const data = event.data;

            if (
                !data ||
                typeof data !== "object"
            ) {
                return;
            }

            try {
                if (
                    data.type ===
                    "chxd-clock-ready"
                ) {
                    sendState(
                        event.source
                    );
                    return;
                }

                if (
                    data.type ===
                    "chxd-clock-add-alarm"
                ) {
                    await addAlarm(data.alarm);
                    sendState(
                        event.source
                    );
                    return;
                }

                if (
                    data.type ===
                    "chxd-clock-update-alarm"
                ) {
                    await updateAlarm(
                        data.id,
                        data.changes
                    );

                    sendState(
                        event.source
                    );
                    return;
                }

                if (
                    data.type ===
                    "chxd-clock-delete-alarm"
                ) {
                    await deleteAlarm(
                        data.id
                    );

                    sendState(
                        event.source
                    );
                    return;
                }

                if (
                    data.type ===
                    "chxd-clock-start-timer"
                ) {
                    await startTimer(
                        data.duration,
                        data.sound
                    );

                    sendState(
                        event.source
                    );
                    return;
                }

                if (
                    data.type ===
                    "chxd-clock-pause-timer"
                ) {
                    await pauseTimer();

                    sendState(
                        event.source
                    );
                    return;
                }

                if (
                    data.type ===
                    "chxd-clock-resume-timer"
                ) {
                    await resumeTimer();

                    sendState(
                        event.source
                    );
                    return;
                }

                if (
                    data.type ===
                    "chxd-clock-reset-timer"
                ) {
                    await resetTimer();

                    sendState(
                        event.source
                    );
                    return;
                }

                if (
                    data.type ===
                    "chxd-clock-select-sound"
                ) {
                    const selected =
                        await importSelectedSound();

                    if (
                        event.source?.postMessage
                    ) {
                        event.source.postMessage(
                            {
                                type:
                                    "chxd-clock-selected-sound",
                                soundPath:
                                    selected.path,
                                name:
                                    selected.name
                            },
                            "*"
                        );
                    }

                    return;
                }

                if (
                    data.type ===
                    "chxd-clock-test-sound"
                ) {
                    await playSound(
                        data.soundPath || ""
                    );
                    return;
                }

                if (
                    data.type ===
                    "chxd-clock-open"
                ) {
                    openClock();
                    return;
                }
            } catch (error) {
                try {
                    event.source?.postMessage(
                        {
                            type:
                                "chxd-clock-error",
                            message:
                                error?.message ||
                                "Clock error"
                        },
                        "*"
                    );
                } catch {}
            }
        }
    );

    window.addEventListener(
        "beforeunload",
        () => {
            saveState();
        }
    );

    async function initialize() {
        if (service.initialized) return;

        service.initialized = true;

        await loadState();

        if (
            service.timer.running &&
            service.timer.end <= Date.now()
        ) {
            fireTimer();
        }

        setInterval(() => {
            checkAlarms();
            checkTimer();
        }, 250);

        setInterval(() => {
            saveState();
        }, 5000);
    }

    initialize();
})();
