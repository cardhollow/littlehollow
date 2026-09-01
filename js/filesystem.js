(function(){
    "use strict";

    const SYSTEM_FILES = {
        "chxd:/system/about.txt":
            "Little Hollow Environment\nCreated by CHXD\n\nProtected system filesystem.\nFiles here cannot be modified or removed.",

        "chxd:/system/readme.txt":
            "Welcome to Little Hollow.\nOpen Apps, File Manager, Notepad, Paint, Calculator, or Messenger."
    };

    const DEVICE_PREFIX = "chxd:/device/";

    function normalize(path){
        let p = String(
            path == null ? "" : path
        )
            .trim()
            .replace(/\\/g, "/")
            .replace(/\/+/g, "/");

        if(/^local:\//i.test(p)){
            p = "chxd:/local/" + p.slice(7);
        }

        if(/^session:\//i.test(p)){
            p = "chxd:/session/" + p.slice(9);
        }

        if(/^indexdb:\//i.test(p)){
            p = "chxd:/indexdb/" + p.slice(9);
        }

        if(/^puter:\//i.test(p)){
            p = "puter:/" + p.slice(8);
        }

        if(/^device:\//i.test(p)){
            p = "chxd:/device/" + p.slice(8);
        }

        return p;
    }

    function zone(path){
        path = normalize(path);

        if(path.indexOf("chxd:/local/") === 0){
            return "local";
        }

        if(path.indexOf("chxd:/session/") === 0){
            return "session";
        }

        if(path.indexOf("chxd:/indexdb/") === 0){
            return "indexdb";
        }

        if(path.indexOf("chxd:/system/") === 0){
            return "system";
        }

        if(path.indexOf(DEVICE_PREFIX) === 0){
            return "device";
        }

        if(path.indexOf("puter:/") === 0){
            return "puter";
        }

        return null;
    }

    const storageKey = path =>
        "LH::" + normalize(path);

    let idbPromise = null;

    function openIDB(){
        if(idbPromise){
            return idbPromise;
        }

        idbPromise = new Promise(
            (resolve, reject) => {
                const req =
                    indexedDB.open(
                        "littleHollowFS",
                        2
                    );

                req.onupgradeneeded = () => {
                    const db = req.result;

                    if(
                        !db.objectStoreNames.contains(
                            "files"
                        )
                    ){
                        db.createObjectStore(
                            "files"
                        );
                    }

                    if(
                        !db.objectStoreNames.contains(
                            "deviceMounts"
                        )
                    ){
                        db.createObjectStore(
                            "deviceMounts"
                        );
                    }
                };

                req.onsuccess = () => {
                    resolve(
                        req.result
                    );
                };

                req.onerror = () => {
                    reject(
                        req.error
                    );
                };
            }
        );

        return idbPromise;
    }

    function idbGet(key){
        return openIDB().then(
            db =>
                new Promise(
                    (resolve, reject) => {
                        const req =
                            db
                                .transaction(
                                    "files",
                                    "readonly"
                                )
                                .objectStore(
                                    "files"
                                )
                                .get(key);

                        req.onsuccess = () =>
                            resolve(
                                req.result
                            );

                        req.onerror = () =>
                            reject(
                                req.error
                            );
                    }
                )
        );
    }

    function idbSet(key, value){
        return openIDB().then(
            db =>
                new Promise(
                    (resolve, reject) => {
                        const req =
                            db
                                .transaction(
                                    "files",
                                    "readwrite"
                                )
                                .objectStore(
                                    "files"
                                )
                                .put(
                                    value,
                                    key
                                );

                        req.onsuccess = () =>
                            resolve(true);

                        req.onerror = () =>
                            reject(
                                req.error
                            );
                    }
                )
        );
    }

    function idbDelete(key){
        return openIDB().then(
            db =>
                new Promise(
                    (resolve, reject) => {
                        const req =
                            db
                                .transaction(
                                    "files",
                                    "readwrite"
                                )
                                .objectStore(
                                    "files"
                                )
                                .delete(
                                    key
                                );

                        req.onsuccess = () =>
                            resolve(true);

                        req.onerror = () =>
                            reject(
                                req.error
                            );
                    }
                )
        );
    }

    function idbKeys(){
        return openIDB().then(
            db =>
                new Promise(
                    (resolve, reject) => {
                        const req =
                            db
                                .transaction(
                                    "files",
                                    "readonly"
                                )
                                .objectStore(
                                    "files"
                                )
                                .getAllKeys();

                        req.onsuccess = () =>
                            resolve(
                                req.result
                            );

                        req.onerror = () =>
                            reject(
                                req.error
                            );
                    }
                )
        );
    }

    function mountGet(name){
        return openIDB().then(
            db =>
                new Promise(
                    (resolve, reject) => {
                        const req =
                            db
                                .transaction(
                                    "deviceMounts",
                                    "readonly"
                                )
                                .objectStore(
                                    "deviceMounts"
                                )
                                .get(name);

                        req.onsuccess = () =>
                            resolve(
                                req.result
                            );

                        req.onerror = () =>
                            reject(
                                req.error
                            );
                    }
                )
        );
    }

    function mountSet(name, handle){
        return openIDB().then(
            db =>
                new Promise(
                    (resolve, reject) => {
                        const req =
                            db
                                .transaction(
                                    "deviceMounts",
                                    "readwrite"
                                )
                                .objectStore(
                                    "deviceMounts"
                                )
                                .put(
                                    {
                                        name,
                                        handle
                                    },
                                    name
                                );

                        req.onsuccess = () =>
                            resolve(true);

                        req.onerror = () =>
                            reject(
                                req.error
                            );
                    }
                )
        );
    }

    function mountDelete(name){
        return openIDB().then(
            db =>
                new Promise(
                    (resolve, reject) => {
                        const req =
                            db
                                .transaction(
                                    "deviceMounts",
                                    "readwrite"
                                )
                                .objectStore(
                                    "deviceMounts"
                                )
                                .delete(name);

                        req.onsuccess = () =>
                            resolve(true);

                        req.onerror = () =>
                            reject(
                                req.error
                            );
                    }
                )
        );
    }

    function mountKeys(){
        return openIDB().then(
            db =>
                new Promise(
                    (resolve, reject) => {
                        const req =
                            db
                                .transaction(
                                    "deviceMounts",
                                    "readonly"
                                )
                                .objectStore(
                                    "deviceMounts"
                                )
                                .getAllKeys();

                        req.onsuccess = () =>
                            resolve(
                                req.result
                            );

                        req.onerror = () =>
                            reject(
                                req.error
                            );
                    }
                )
        );
    }

    function cleanName(name){
        return String(
            name || ""
        )
            .trim()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
            .replace(/\.+$/g, "")
            .trim();
    }

    async function deviceMountNameExists(name){
        return !!(
            await mountGet(name)
        );
    }

    async function uniqueDeviceMountName(name){
        const base =
            cleanName(name) ||
            "folder";

        if(
            !(await deviceMountNameExists(base))
        ){
            return base;
        }

        let i = 2;

        while(
            await deviceMountNameExists(
                base + "_" + i
            )
        ){
            i++;
        }

        return base + "_" + i;
    }

    async function mountDeviceFolder(){
        if(
            !window.showDirectoryPicker
        ){
            return {
                ok: false,
                error:
                    "File System Access API is not supported by this browser."
            };
        }

        try{
            const handle =
                await window.showDirectoryPicker(
                    {
                        mode: "readwrite"
                    }
                );

            let name =
                await uniqueDeviceMountName(
                    handle.name
                );

            await mountSet(
                name,
                handle
            );

            return {
                ok: true,
                path:
                    DEVICE_PREFIX +
                    name +
                    "/",
                name
            };
        }catch(error){
            if(
                error &&
                error.name === "AbortError"
            ){
                return {
                    ok: false,
                    cancelled: true,
                    error:
                        "Folder selection cancelled."
                };
            }

            return {
                ok: false,
                error:
                    error &&
                    error.message
                        ? error.message
                        : String(error)
            };
        }
    }

    async function unmountDeviceFolder(name){
        name = cleanName(name);

        if(!name){
            return {
                ok: false,
                error: "Invalid device folder."
            };
        }

        await mountDelete(name);

        return {
            ok: true
        };
    }

    async function getDeviceMounts(){
        const keys =
            await mountKeys();

        const result = [];

        for(
            const key of keys
        ){
            const mount =
                await mountGet(key);

            if(
                mount &&
                mount.handle
            ){
                result.push({
                    name: mount.name,
                    path:
                        DEVICE_PREFIX +
                        mount.name +
                        "/",
                    handle:
                        mount.handle
                });
            }
        }

        return result;
    }

    async function ensurePermission(
        handle,
        mode = "readwrite"
    ){
        if(
            !handle
        ){
            return false;
        }

        if(
            typeof handle.queryPermission !==
            "function"
        ){
            return true;
        }

        const current =
            await handle.queryPermission(
                {
                    mode
                }
            );

        if(current === "granted"){
            return true;
        }

        const result =
            await handle.requestPermission(
                {
                    mode
                }
            );

        return result === "granted";
    }

    function splitDevicePath(path){
        const clean =
            normalize(path)
                .slice(
                    DEVICE_PREFIX.length
                )
                .replace(
                    /^\/+/,
                    ""
                )
                .replace(
                    /\/+$/,
                    ""
                );

        if(!clean){
            return [];
        }

        return clean
            .split("/")
            .filter(Boolean);
    }

    async function getDeviceRoot(
        mountName
    ){
        const mount =
            await mountGet(
                mountName
            );

        if(
            !mount ||
            !mount.handle
        ){
            return null;
        }

        return mount.handle;
    }

    async function resolveDeviceParent(
        path,
        createDirectories = false
    ){
        const parts =
            splitDevicePath(
                path
            );

        if(!parts.length){
            return {
                ok: true,
                root: true,
                handle: null,
                name: ""
            };
        }

        const mountName =
            parts.shift();

        const root =
            await getDeviceRoot(
                mountName
            );

        if(!root){
            return {
                ok: false,
                error:
                    "Device folder is not mounted: " +
                    mountName
            };
        }

        if(
            !(await ensurePermission(
                root
            ))
        ){
            return {
                ok: false,
                error:
                    "Permission was not granted for device folder: " +
                    mountName
            };
        }

        let current =
            root;

        for(
            const part of parts
        ){
            current =
                await current.getDirectoryHandle(
                    part,
                    {
                        create:
                            createDirectories
                    }
                );
        }

        return {
            ok: true,
            handle: current,
            name: mountName
        };
    }

    async function getDeviceEntry(
        path
    ){
        const parts =
            splitDevicePath(
                path
            );

        if(!parts.length){
            return {
                ok: true,
                kind: "root"
            };
        }

        const mountName =
            parts.shift();

        const root =
            await getDeviceRoot(
                mountName
            );

        if(!root){
            return {
                ok: false,
                error:
                    "Device folder is not mounted: " +
                    mountName
            };
        }

        if(
            !(await ensurePermission(
                root
            ))
        ){
            return {
                ok: false,
                error:
                    "Permission was not granted for device folder: " +
                    mountName
            };
        }

        let current =
            root;

        if(!parts.length){
            return {
                ok: true,
                kind: "directory",
                handle: current
            };
        }

        for(
            let i = 0;
            i < parts.length - 1;
            i++
        ){
            current =
                await current.getDirectoryHandle(
                    parts[i]
                );
        }

        const name =
            parts[
                parts.length - 1
            ];

        try{
            const file =
                await current.getFileHandle(
                    name
                );

            return {
                ok: true,
                kind: "file",
                handle: file
            };
        }catch(error){}

        try{
            const directory =
                await current.getDirectoryHandle(
                    name
                );

            return {
                ok: true,
                kind: "directory",
                handle: directory
            };
        }catch(error){}

        return {
            ok: false,
            error:
                "Path does not exist: " +
                normalize(path)
        };
    }

    async function deviceRead(path){
        const entry =
            await getDeviceEntry(
                path
            );

        if(!entry.ok){
            return entry;
        }

        if(entry.kind !== "file"){
            return {
                ok: false,
                error:
                    "Path is not a file: " +
                    normalize(path)
            };
        }

        try{
            const file =
                await entry.handle.getFile();

            const content =
                await file.text();

            return {
                ok: true,
                content
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Device read failed: " +
                    (
                        error &&
                        error.message
                            ? error.message
                            : String(error)
                    )
            };
        }
    }

    async function deviceWrite(
        path,
        content,
        create = true
    ){
        const normalized =
            normalize(path);

        const parts =
            splitDevicePath(
                normalized
            );

        if(parts.length < 2){
            return {
                ok: false,
                error:
                    "A device file path is required."
            };
        }

        const fileName =
            parts.pop();

        const mountName =
            parts.shift();

        const root =
            await getDeviceRoot(
                mountName
            );

        if(!root){
            return {
                ok: false,
                error:
                    "Device folder is not mounted: " +
                    mountName
            };
        }

        if(
            !(await ensurePermission(
                root
            ))
        ){
            return {
                ok: false,
                error:
                    "Permission was not granted for device folder: " +
                    mountName
            };
        }

        let directory =
            root;

        for(
            const part of parts
        ){
            try{
                directory =
                    await directory.getDirectoryHandle(
                        part,
                        {
                            create: true
                        }
                    );
            }catch(error){
                return {
                    ok: false,
                    error:
                        "Could not create directory '" +
                        part +
                        "': " +
                        (
                            error &&
                            error.message
                                ? error.message
                                : String(error)
                        )
                };
            }
        }

        let fileHandle;

        try{
            fileHandle =
                await directory.getFileHandle(
                    fileName,
                    {
                        create: !!create
                    }
                );
        }catch(error){
            return {
                ok: false,
                error:
                    "Could not access device file: " +
                    fileName
            };
        }

        try{
            const writable =
                await fileHandle.createWritable();

            await writable.write(
                String(content)
            );

            await writable.close();

            return {
                ok: true
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Device write failed: " +
                    (
                        error &&
                        error.message
                            ? error.message
                            : String(error)
                    )
            };
        }
    }

    async function deviceRemove(path){
        const normalized =
            normalize(path);

        const parts =
            splitDevicePath(
                normalized
            );

        if(parts.length < 2){
            return {
                ok: false,
                error:
                    "The device root cannot be removed."
            };
        }

        const name =
            parts.pop();

        const mountName =
            parts.shift();

        const root =
            await getDeviceRoot(
                mountName
            );

        if(!root){
            return {
                ok: false,
                error:
                    "Device folder is not mounted: " +
                    mountName
            };
        }

        if(
            !(await ensurePermission(
                root
            ))
        ){
            return {
                ok: false,
                error:
                    "Permission was not granted for device folder: " +
                    mountName
            };
        }

        let parent =
            root;

        for(
            const part of parts
        ){
            try{
                parent =
                    await parent.getDirectoryHandle(
                        part
                    );
            }catch(error){
                return {
                    ok: false,
                    error:
                        "Parent folder not found."
                };
            }
        }

        try{
            await parent.removeEntry(
                name,
                {
                    recursive: true
                }
            );

            return {
                ok: true
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Device delete failed: " +
                    (
                        error &&
                        error.message
                            ? error.message
                            : String(error)
                    )
            };
        }
    }

    async function deviceList(path){
        const normalized =
            normalize(path);

        let directory;

        if(
            normalized === DEVICE_PREFIX ||
            normalized === "chxd:/device"
        ){
            directory = null;
        }else{
            const entry =
                await getDeviceEntry(
                    normalized
                );

            if(!entry.ok){
                return [];
            }

            if(
                entry.kind !== "directory" &&
                entry.kind !== "root"
            ){
                return [];
            }

            directory =
                entry.handle;
        }

        if(!directory){
            const mounts =
                await getDeviceMounts();

            return mounts.map(
                mount =>
                    DEVICE_PREFIX +
                    mount.name +
                    "/"
            );
        }

        const result = [];

        for await(
            const item
            of directory.values()
        ){
            const child =
                normalized.replace(
                    /\/+$/,
                    ""
                ) +
                "/" +
                item.name;

            if(
                item.kind === "directory"
            ){
                result.push(
                    child + "/"
                );
            }else{
                result.push(
                    child
                );
            }
        }

        return result;
    }

    async function deviceExists(path){
        const normalized =
            normalize(path);

        if(
            normalized === DEVICE_PREFIX ||
            normalized === "chxd:/device"
        ){
            return true;
        }

        const entry =
            await getDeviceEntry(
                normalized
            );

        return !!entry.ok;
    }

    async function deviceListRecursive(path){
        const result = [];

        async function walk(
            directory,
            base
        ){
            for await(
                const item
                of directory.values()
            ){
                const child =
                    base.replace(
                        /\/+$/,
                        ""
                    ) +
                    "/" +
                    item.name;

                if(
                    item.kind === "directory"
                ){
                    result.push(
                        child + "/"
                    );

                    await walk(
                        item,
                        child + "/"
                    );
                }else{
                    result.push(
                        child
                    );
                }
            }
        }

        if(
            path === DEVICE_PREFIX ||
            path === "chxd:/device"
        ){
            const mounts =
                await getDeviceMounts();

            for(
                const mount of mounts
            ){
                result.push(
                    DEVICE_PREFIX +
                    mount.name +
                    "/"
                );

                await walk(
                    mount.handle,
                    DEVICE_PREFIX +
                    mount.name +
                    "/"
                );
            }

            return result;
        }

        const entry =
            await getDeviceEntry(
                path
            );

        if(!entry.ok){
            return [];
        }

        if(
            entry.kind !== "directory" &&
            entry.kind !== "root"
        ){
            return [];
        }

        await walk(
            entry.handle,
            normalize(path)
        );

        return result;
    }

    function puterReady(){
        return !!(
            window.puter &&
            puter.fs &&
            typeof puter.fs.readdir ===
                "function"
        );
    }

    async function puterRead(path){
        if(!puterReady()){
            return {
                ok: false,
                error:
                    "Puter filesystem is unavailable."
            };
        }

        try{
            const p =
                path.slice(7);

            const r =
                typeof puter.fs.read ===
                "function"
                    ? await puter.fs.read(p)
                    : null;

            if(r == null){
                return {
                    ok: false,
                    error:
                        "Puter filesystem read is unavailable."
                };
            }

            if(
                typeof r === "string"
            ){
                return {
                    ok: true,
                    content: r
                };
            }

            if(
                r &&
                typeof r.text ===
                    "function"
            ){
                return {
                    ok: true,
                    content: await r.text()
                };
            }

            if(
                r &&
                r.content != null
            ){
                return {
                    ok: true,
                    content:
                        String(
                            r.content
                        )
                };
            }

            return {
                ok: true,
                content:
                    String(r)
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Puter read failed: " +
                    error.message
            };
        }
    }

    async function puterWrite(
        path,
        content
    ){
        if(
            !window.puter ||
            !puter.fs ||
            typeof puter.fs.write !==
                "function"
        ){
            return {
                ok: false,
                error:
                    "Puter filesystem is unavailable."
            };
        }

        try{
            await puter.fs.write(
                path.slice(7),
                String(content)
            );

            return {
                ok: true
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Puter write failed: " +
                    error.message
            };
        }
    }

    async function puterRemove(path){
        if(
            !window.puter ||
            !puter.fs ||
            typeof puter.fs.delete !==
                "function"
        ){
            return {
                ok: false,
                error:
                    "Puter filesystem delete is unavailable."
            };
        }

        try{
            await puter.fs.delete(
                path.slice(7)
            );

            return {
                ok: true
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Puter delete failed: " +
                    error.message
            };
        }
    }

    async function puterList(path){
        if(!puterReady()){
            return [];
        }

        try{
            const items =
                await puter.fs.readdir(
                    path.slice(7)
                );

            return (
                Array.isArray(items)
                    ? items
                    : []
            )
                .map(
                    x =>
                        typeof x === "string"
                            ? "puter:/" + x
                            : "puter:/" +
                              (
                                  x.path ||
                                  x.name ||
                                  ""
                              )
                )
                .filter(Boolean);
        }catch(error){
            return [];
        }
    }

    function exists(path){
        path =
            normalize(path);

        const z =
            zone(path);

        if(z === "system"){
            return Promise.resolve(
                Object.prototype.hasOwnProperty.call(
                    SYSTEM_FILES,
                    path
                )
            );
        }

        if(z === "device"){
            return deviceExists(path);
        }

        if(z === "puter"){
            return puterRead(path)
                .then(
                    r => r.ok
                );
        }

        if(z === "local"){
            return Promise.resolve(
                localStorage.getItem(
                    storageKey(path)
                ) !== null
            );
        }

        if(z === "session"){
            return Promise.resolve(
                sessionStorage.getItem(
                    storageKey(path)
                ) !== null
            );
        }

        if(z === "indexdb"){
            return idbGet(
                storageKey(path)
            ).then(
                v => v !== undefined
            );
        }

        return Promise.resolve(false);
    }

    async function read(path){
        path =
            normalize(path);

        const z =
            zone(path);

        if(z === "system"){
            return Object.prototype.hasOwnProperty.call(
                SYSTEM_FILES,
                path
            )
                ? {
                    ok: true,
                    content:
                        SYSTEM_FILES[path]
                }
                : {
                    ok: false,
                    error:
                        "File not found: " +
                        path
                };
        }

        if(z === "device"){
            return deviceRead(path);
        }

        if(z === "puter"){
            return puterRead(path);
        }

        if(z === "local"){
            const v =
                localStorage.getItem(
                    storageKey(path)
                );

            return v === null
                ? {
                    ok: false,
                    error:
                        "File not found: " +
                        path
                }
                : {
                    ok: true,
                    content: v
                };
        }

        if(z === "session"){
            const v =
                sessionStorage.getItem(
                    storageKey(path)
                );

            return v === null
                ? {
                    ok: false,
                    error:
                        "File not found: " +
                        path
                }
                : {
                    ok: true,
                    content: v
                };
        }

        if(z === "indexdb"){
            const v =
                await idbGet(
                    storageKey(path)
                );

            return v === undefined
                ? {
                    ok: false,
                    error:
                        "File not found: " +
                        path
                }
                : {
                    ok: true,
                    content:
                        String(v)
                };
        }

        return {
            ok: false,
            error:
                "Unsupported path: " +
                path
        };
    }

    async function write(
        path,
        content,
        create = true
    ){
        path =
            normalize(path);

        const z =
            zone(path);

        if(z === "system"){
            return {
                ok: false,
                error:
                    "Cannot write to protected system file: " +
                    path
            };
        }

        if(z === "device"){
            return deviceWrite(
                path,
                content,
                create
            );
        }

        if(z === "puter"){
            return puterWrite(
                path,
                content,
                create
            );
        }

        if(!z){
            return {
                ok: false,
                error:
                    "Unsupported path: " +
                    path
            };
        }

        if(
            !create &&
            !(await exists(path))
        ){
            return {
                ok: false,
                error:
                    "File does not exist (use create=true): " +
                    path
            };
        }

        if(z === "local"){
            localStorage.setItem(
                storageKey(path),
                String(content)
            );

            return {
                ok: true
            };
        }

        if(z === "session"){
            sessionStorage.setItem(
                storageKey(path),
                String(content)
            );

            return {
                ok: true
            };
        }

        if(z === "indexdb"){
            await idbSet(
                storageKey(path),
                String(content)
            );

            return {
                ok: true
            };
        }

        return {
            ok: false,
            error:
                "Unsupported path: " +
                path
        };
    }

    async function remove(path){
        path =
            normalize(path);

        const z =
            zone(path);

        if(z === "system"){
            return {
                ok: false,
                error:
                    "Cannot remove protected system file: " +
                    path
            };
        }

        if(z === "device"){
            return deviceRemove(path);
        }

        if(z === "puter"){
            return puterRemove(path);
        }

        if(!z){
            return {
                ok: false,
                error:
                    "Unsupported path: " +
                    path
            };
        }

        if(
            !(await exists(path))
        ){
            return {
                ok: false,
                error:
                    "File not found: " +
                    path
            };
        }

        if(z === "local"){
            localStorage.removeItem(
                storageKey(path)
            );
        }else if(z === "session"){
            sessionStorage.removeItem(
                storageKey(path)
            );
        }else if(z === "indexdb"){
            await idbDelete(
                storageKey(path)
            );
        }

        return {
            ok: true
        };
    }

    async function listZone(z){
        if(z === "system"){
            return Object.keys(
                SYSTEM_FILES
            );
        }

        if(z === "device"){
            return deviceListRecursive(
                DEVICE_PREFIX
            );
        }

        if(z === "puter"){
            return puterList(
                "puter:/"
            );
        }

        if(z === "local"){
            const a = [];

            for(
                let i = 0;
                i < localStorage.length;
                i++
            ){
                const k =
                    localStorage.key(i);

                if(
                    k &&
                    k.indexOf(
                        "LH::chxd:/local/"
                    ) === 0
                ){
                    a.push(
                        k.slice(4)
                    );
                }
            }

            return a;
        }

        if(z === "session"){
            const a = [];

            for(
                let i = 0;
                i < sessionStorage.length;
                i++
            ){
                const k =
                    sessionStorage.key(i);

                if(
                    k &&
                    k.indexOf(
                        "LH::chxd:/session/"
                    ) === 0
                ){
                    a.push(
                        k.slice(4)
                    );
                }
            }

            return a;
        }

        if(z === "indexdb"){
            return (
                await idbKeys()
            )
                .filter(
                    k =>
                        typeof k === "string" &&
                        k.indexOf(
                            "LH::chxd:/indexdb/"
                        ) === 0
                )
                .map(
                    k =>
                        k.slice(4)
                );
        }

        return [];
    }

    async function list(prefix){
        prefix =
            prefix
                ? normalize(prefix)
                : null;

        if(
            prefix &&
            zone(prefix) === "device"
        ){
            return deviceListRecursive(
                prefix
            );
        }

        let zones = [
            "local",
            "session",
            "indexdb",
            "system",
            "device"
        ];

        if(prefix){
            const z =
                zone(prefix);

            if(z){
                zones = [z];
            }
        }

        const all =
            (
                await Promise.all(
                    zones.map(
                        listZone
                    )
                )
            ).flat();

        if(!prefix){
            return all;
        }

        return all.filter(
            p =>
                p.indexOf(prefix) === 0
        );
    }

    function wildcardToRegex(
        p
    ){
        return new RegExp(
            "^" +
            p
                .replace(
                    /[.+^${}()|[\]\\]/g,
                    "\\$&"
                )
                .replace(
                    /\*/g,
                    ".*"
                )
                .replace(
                    /\?/g,
                    "."
                ) +
            "$"
        );
    }

    async function find(pattern){
        pattern =
            normalize(pattern);

        const z =
            zone(pattern);

        const all =
            await list(
                z
                    ? z === "device"
                        ? DEVICE_PREFIX
                        : z + ":/"
                    : null
            );

        const re =
            wildcardToRegex(
                pattern
            );

        return all.filter(
            p =>
                re.test(p)
        );
    }

    window.FS = {
        normalize,
        zone,
        exists,
        read,
        write,
        remove,
        find,
        list,
        puterReady,
        mountDeviceFolder,
        unmountDeviceFolder,
        getDeviceMounts,
        ensurePermission
    };
})();
