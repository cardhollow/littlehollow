(function(){
    "use strict";

    const SYSTEM_FILES = {
        "chxd:/system/about.txt":
            "Little Hollow Environment\nCreated by CHXD\n\nProtected system filesystem.\nFiles here cannot be modified or removed.",

        "chxd:/system/readme.txt":
            "Welcome to Little Hollow.\nOpen Apps, File Manager, Notepad, Paint, Calculator, or Messenger."
    };

    const DEVICE_PREFIX = "chxd:/device/";
    const ROOT_PREFIXES = {
        local: "chxd:/local/",
        session: "chxd:/session/",
        indexdb: "chxd:/indexdb/",
        system: "chxd:/system/",
        device: DEVICE_PREFIX,
        puter: "puter:/"
    };

    const BINARY_PREFIX = "LH_BINARY_V1:";
    const DIR_PREFIX = "LH_DIR_V1:";

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
            p = "puter:/" + p.slice(7);
        }

        if(/^device:\//i.test(p)){
            p = "chxd:/device/" + p.slice(8);
        }

        if(
            p === "chxd:/local" ||
            p === "chxd:/session" ||
            p === "chxd:/indexdb" ||
            p === "chxd:/system" ||
            p === "chxd:/device"
        ){
            p += "/";
        }

        if(p === "puter:"){
            p = "puter:/";
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

    function isRoot(path){
        path = normalize(path);

        return (
            path === "chxd:/local/" ||
            path === "chxd:/session/" ||
            path === "chxd:/indexdb/" ||
            path === "chxd:/system/" ||
            path === "chxd:/device/" ||
            path === "puter:/"
        );
    }

    function storageKey(path){
        return "LH::" + normalize(path);
    }

    function dirStorageKey(path){
        return "LH::DIR::" + normalize(path);
    }

    function childPath(parent, name, directory){
        const base = normalize(parent).replace(/\/+$/, "");

        return (
            base +
            "/" +
            name +
            (directory ? "/" : "")
        );
    }

    function basename(path){
        const p = normalize(path)
            .replace(/\/+$/, "");

        const i = p.lastIndexOf("/");

        return i === -1
            ? p
            : p.slice(i + 1);
    }

    function dirname(path){
        let p = normalize(path)
            .replace(/\/+$/, "");

        const i = p.lastIndexOf("/");

        if(i === -1){
            return "";
        }

        let result = p.slice(0, i + 1);

        if(
            result &&
            !result.endsWith("/")
        ){
            result += "/";
        }

        if(
            result === "puter:/"
        ){
            return result;
        }

        return result;
    }

    function ensureTrailingSlash(path){
        path = normalize(path);

        return path.endsWith("/")
            ? path
            : path + "/";
    }

    function sameOrInside(parent, child){
        const a = ensureTrailingSlash(parent);
        const b = normalize(child);

        return (
            b === a.slice(0, -1) ||
            b.indexOf(a) === 0
        );
    }

    function isBinaryData(value){
        return (
            value instanceof Blob ||
            value instanceof ArrayBuffer ||
            ArrayBuffer.isView(value)
        );
    }

    function arrayBufferFrom(value){
        if(value instanceof ArrayBuffer){
            return Promise.resolve(value);
        }

        if(ArrayBuffer.isView(value)){
            return Promise.resolve(
                value.buffer.slice(
                    value.byteOffset,
                    value.byteOffset + value.byteLength
                )
            );
        }

        if(value instanceof Blob){
            return value.arrayBuffer();
        }

        return Promise.resolve(
            new TextEncoder().encode(
                String(value)
            ).buffer
        );
    }

    function bytesToBase64(buffer){
        const bytes = new Uint8Array(buffer);
        const chunk = 0x8000;

        let binary = "";

        for(
            let i = 0;
            i < bytes.length;
            i += chunk
        ){
            binary += String.fromCharCode(
                ...bytes.subarray(
                    i,
                    Math.min(
                        i + chunk,
                        bytes.length
                    )
                )
            );
        }

        return btoa(binary);
    }

    function base64ToBytes(base64){
        const binary = atob(base64);
        const bytes = new Uint8Array(
            binary.length
        );

        for(
            let i = 0;
            i < binary.length;
            i++
        ){
            bytes[i] =
                binary.charCodeAt(i);
        }

        return bytes;
    }

    async function packBinary(value){
        const buffer =
            await arrayBufferFrom(value);

        const mime =
            value instanceof Blob
                ? value.type
                : "";

        return (
            BINARY_PREFIX +
            JSON.stringify({
                type: mime,
                data: bytesToBase64(
                    buffer
                )
            })
        );
    }

    function unpackStored(value){
        if(
            typeof value !== "string"
        ){
            return value;
        }

        if(
            !value.startsWith(
                BINARY_PREFIX
            )
        ){
            return value;
        }

        try{
            const payload =
                JSON.parse(
                    value.slice(
                        BINARY_PREFIX.length
                    )
                );

            return new Blob(
                [
                    base64ToBytes(
                        payload.data
                    )
                ],
                {
                    type:
                        payload.type || ""
                }
            );
        }catch(error){
            return value;
        }
    }

    function isStoredDirectory(value){
        return (
            typeof value === "string" &&
            value.startsWith(
                DIR_PREFIX
            )
        );
    }

    function makeDirectoryMarker(){
        return DIR_PREFIX + "1";
    }

    function errorText(error){
        return (
            error &&
            error.message
                ? error.message
                : String(error)
        );
    }

    function isNotFoundError(error){
        return (
            error &&
            (
                error.name === "NotFoundError" ||
                error.code === "ENOENT"
            )
        );
    }

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
                        3
                    );

                req.onupgradeneeded = () => {
                    const db =
                        req.result;

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
                    const db =
                        req.result;

                    db.onversionchange = () => {
                        db.close();
                    };

                    resolve(db);
                };

                req.onerror = () => {
                    reject(req.error);
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
                                .delete(
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
            .replace(
                /[<>:"/\\|?*\x00-\x1F]/g,
                "_"
            )
            .replace(
                /\.+$/g,
                ""
            )
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

        return (
            base +
            "_" +
            i
        );
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

            const name =
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
                    errorText(error)
            };
        }
    }

    async function unmountDeviceFolder(name){
        name = cleanName(name);

        if(!name){
            return {
                ok: false,
                error:
                    "Invalid device folder."
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
                    name:
                        mount.name,
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
        if(!handle){
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

        if(
            current === "granted"
        ){
            return true;
        }

        if(
            typeof handle.requestPermission !==
            "function"
        ){
            return false;
        }

        const result =
            await handle.requestPermission(
                {
                    mode
                }
            );

        return (
            result === "granted"
        );
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
            splitDevicePath(path);

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
            splitDevicePath(path);

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
                handle:
                    directory
            };
        }catch(error){}

        return {
            ok: false,
            error:
                "Path does not exist: " +
                normalize(path)
        };
    }

    async function deviceReadBinary(path){
        const entry =
            await getDeviceEntry(
                path
            );

        if(!entry.ok){
            return entry;
        }

        if(
            entry.kind !== "file"
        ){
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

            return {
                ok: true,
                data: file,
                kind: "file"
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Device read failed: " +
                    errorText(error)
            };
        }
    }

    async function deviceRead(path){
        const result =
            await deviceReadBinary(path);

        if(!result.ok){
            return result;
        }

        try{
            return {
                ok: true,
                content:
                    await result.data.text()
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Device text read failed: " +
                    errorText(error)
            };
        }
    }

    async function deviceWrite(
        path,
        content,
        create = true,
        allowBinary = false
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
            directory =
                await directory.getDirectoryHandle(
                    part,
                    {
                        create: true
                    }
                );
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
                allowBinary
                    ? content
                    : String(content)
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
                    errorText(error)
            };
        }
    }

    async function deviceWriteBinary(
        path,
        data,
        create = true
    ){
        return deviceWrite(
            path,
            data,
            create,
            true
        );
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
                    errorText(error)
            };
        }
    }

    async function deviceList(path){
        const normalized =
            normalize(path);

        if(
            normalized === DEVICE_PREFIX
        ){
            const mounts =
                await getDeviceMounts();

            return mounts.map(
                mount =>
                    DEVICE_PREFIX +
                    mount.name +
                    "/"
            );
        }

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

        const result = [];

        for await(
            const item
            of entry.handle.values()
        ){
            result.push(
                childPath(
                    normalized,
                    item.name,
                    item.kind === "directory"
                )
            );
        }

        return result;
    }

    function puterReady(){
        return !!(
            window.puter &&
            puter.fs
        );
    }

    function puterPath(path){
        const normalized =
            normalize(path);

        if(
            normalized === "puter:/"
        ){
            return "/";
        }

        return normalized.slice(7);
    }

    async function puterReadBinary(path){
        if(
            !puterReady() ||
            typeof puter.fs.read !==
                "function"
        ){
            return {
                ok: false,
                error:
                    "Puter filesystem read is unavailable."
            };
        }

        try{
            const blob =
                await puter.fs.read(
                    puterPath(path)
                );

            return {
                ok: true,
                data: blob,
                kind: "file"
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Puter read failed: " +
                    errorText(error)
            };
        }
    }

    async function puterRead(path){
        const result =
            await puterReadBinary(path);

        if(!result.ok){
            return result;
        }

        try{
            return {
                ok: true,
                content:
                    await result.data.text()
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Puter text read failed: " +
                    errorText(error)
            };
        }
    }

    async function puterWrite(
        path,
        content,
        create = true,
        allowBinary = false,
        overwrite = true
    ){
        if(
            !puterReady() ||
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
                puterPath(path),
                allowBinary
                    ? content
                    : String(content),
                {
                    overwrite:
                        overwrite,
                    createMissingParents:
                        true
                }
            );

            return {
                ok: true
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Puter write failed: " +
                    errorText(error)
            };
        }
    }

    async function puterRemove(path){
        if(
            !puterReady() ||
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
                puterPath(path),
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
                    "Puter delete failed: " +
                    errorText(error)
            };
        }
    }

    async function puterList(path){
        if(
            !puterReady() ||
            typeof puter.fs.readdir !==
                "function"
        ){
            return [];
        }

        try{
            const items =
                await puter.fs.readdir(
                    puterPath(path)
                );

            return (
                Array.isArray(items)
                    ? items
                    : []
            )
                .map(
                    x => {
                        if(
                            typeof x === "string"
                        ){
                            return (
                                "puter:/" +
                                x.replace(
                                    /^\/+/,
                                    ""
                                )
                            );
                        }

                        const child =
                            x.path ||
                            x.name ||
                            "";

                        return (
                            "puter:/" +
                            String(child)
                                .replace(
                                    /^\/+/,
                                    ""
                                )
                        ) +
                        (
                            x.isDir ||
                            x.kind === "directory"
                                ? "/"
                                : ""
                        );
                    }
                )
                .filter(
                    Boolean
                );
        }catch(error){
            return [];
        }
    }

    async function puterStat(path){
        if(
            !puterReady() ||
            typeof puter.fs.stat !==
                "function"
        ){
            return {
                ok: false,
                error:
                    "Puter filesystem stat is unavailable."
            };
        }

        try{
            const item =
                await puter.fs.stat(
                    puterPath(path)
                );

            return {
                ok: true,
                kind:
                    item.isDir
                        ? "directory"
                        : "file",
                name:
                    item.name ||
                    basename(path),
                path:
                    normalize(path),
                size:
                    item.size == null
                        ? null
                        : item.size,
                raw:
                    item
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Puter stat failed: " +
                    errorText(error)
            };
        }
    }

    async function puterMkdir(
        path,
        overwrite = false
    ){
        if(
            !puterReady() ||
            typeof puter.fs.mkdir !==
                "function"
        ){
            return {
                ok: false,
                error:
                    "Puter mkdir is unavailable."
            };
        }

        try{
            await puter.fs.mkdir(
                puterPath(path),
                {
                    overwrite,
                    createMissingParents:
                        true
                }
            );

            return {
                ok: true
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Puter mkdir failed: " +
                    errorText(error)
            };
        }
    }

    async function puterCopy(
        source,
        destination,
        overwrite = false
    ){
        if(
            !puterReady() ||
            typeof puter.fs.copy !==
                "function"
        ){
            return {
                ok: false,
                error:
                    "Puter copy is unavailable."
            };
        }

        try{
            await puter.fs.copy(
                puterPath(source),
                puterPath(destination),
                {
                    overwrite
                }
            );

            return {
                ok: true
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Puter copy failed: " +
                    errorText(error)
            };
        }
    }

    async function puterMove(
        source,
        destination,
        overwrite = false
    ){
        if(
            !puterReady() ||
            typeof puter.fs.move !==
                "function"
        ){
            return {
                ok: false,
                error:
                    "Puter move is unavailable."
            };
        }

        try{
            await puter.fs.move(
                puterPath(source),
                puterPath(destination),
                {
                    overwrite
                }
            );

            return {
                ok: true
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Puter move failed: " +
                    errorText(error)
            };
        }
    }

    function localStored(path){
        return localStorage.getItem(
            storageKey(path)
        );
    }

    function sessionStored(path){
        return sessionStorage.getItem(
            storageKey(path)
        );
    }

    function virtualChildrenFromPaths(
        directory,
        paths
    ){
        const base =
            ensureTrailingSlash(
                directory
            );

        const result =
            new Map();

        for(
            const rawPath of paths
        ){
            const p =
                normalize(rawPath);

            if(
                p.indexOf(base) !== 0 ||
                p === base
            ){
                continue;
            }

            const rest =
                p.slice(
                    base.length
                );

            if(!rest){
                continue;
            }

            const slash =
                rest.indexOf("/");

            if(slash === -1){
                result.set(
                    rest,
                    p
                );
                continue;
            }

            const first =
                rest.slice(
                    0,
                    slash
                );

            result.set(
                first,
                base +
                first +
                "/"
            );
        }

        return Array.from(
            result.values()
        );
    }

    async function listVirtualZone(
        z,
        directory
    ){
        const base =
            ensureTrailingSlash(
                directory ||
                ROOT_PREFIXES[z]
            );

        if(
            z === "local" ||
            z === "session"
        ){
            const paths = [];

            const storage =
                z === "local"
                    ? localStorage
                    : sessionStorage;

            for(
                let i = 0;
                i < storage.length;
                i++
            ){
                const k =
                    storage.key(i);

                if(
                    !k
                ){
                    continue;
                }

                if(
                    k.indexOf(
                        "LH::"
                    ) !== 0
                ){
                    continue;
                }

                if(
                    k.indexOf(
                        "LH::DIR::"
                    ) === 0
                ){
                    continue;
                }

                const p =
                    k.slice(4);

                if(
                    zone(p) === z
                ){
                    paths.push(p);
                }
            }

            for(
                let i = 0;
                i < storage.length;
                i++
            ){
                const k =
                    storage.key(i);

                if(
                    !k ||
                    k.indexOf(
                        "LH::DIR::"
                    ) !== 0
                ){
                    continue;
                }

                const p =
                    k.slice(
                        "LH::DIR::".length
                    );

                if(
                    zone(p) === z
                ){
                    paths.push(
                        ensureTrailingSlash(
                            p
                        )
                    );
                }
            }

            return virtualChildrenFromPaths(
                base,
                paths
            );
        }

        const keys =
            await idbKeys();

        const paths = [];

        for(
            const k of keys
        ){
            if(
                typeof k !==
                "string"
            ){
                continue;
            }

            if(
                k.indexOf(
                    "LH::"
                ) !== 0
            ){
                continue;
            }

            const p =
                k.slice(4);

            if(
                zone(p) !== z
            ){
                continue;
            }

            const value =
                await idbGet(k);

            if(
                isStoredDirectory(value)
            ){
                paths.push(
                    ensureTrailingSlash(
                        p
                    )
                );
            }else{
                paths.push(p);
            }
        }

        return virtualChildrenFromPaths(
            base,
            paths
        );
    }

    async function localSessionIndexdbStat(
        path,
        z
    ){
        if(
            z === "local" ||
            z === "session"
        ){
            const storage =
                z === "local"
                    ? localStorage
                    : sessionStorage;

            if(
                storage.getItem(
                    dirStorageKey(path)
                ) !== null
            ){
                return {
                    ok: true,
                    kind: "directory",
                    name:
                        basename(path),
                    path:
                        ensureTrailingSlash(
                            path
                        ),
                    size: null
                };
            }

            if(
                storage.getItem(
                    storageKey(path)
                ) !== null
            ){
                const raw =
                    storage.getItem(
                        storageKey(path)
                    );

                let size = null;

                if(
                    typeof raw ===
                    "string"
                ){
                    if(
                        raw.startsWith(
                            BINARY_PREFIX
                        )
                    ){
                        try{
                            const payload =
                                JSON.parse(
                                    raw.slice(
                                        BINARY_PREFIX.length
                                    )
                                );

                            size =
                                base64ToBytes(
                                    payload.data
                                ).byteLength;
                        }catch(error){
                            size = null;
                        }
                    }else{
                        size =
                            new Blob(
                                [raw]
                            ).size;
                    }
                }

                return {
                    ok: true,
                    kind: "file",
                    name:
                        basename(path),
                    path:
                        normalize(path),
                    size
                };
            }

            const prefix =
                storageKey(
                    ensureTrailingSlash(
                        path
                    )
                );

            for(
                let i = 0;
                i < storage.length;
                i++
            ){
                const k =
                    storage.key(i);

                if(
                    k &&
                    (
                        k.indexOf(prefix) === 0 ||
                        k.indexOf(
                            "LH::DIR::" +
                            ensureTrailingSlash(
                                path
                            )
                        ) === 0
                    )
                ){
                    return {
                        ok: true,
                        kind: "directory",
                        name:
                            basename(path),
                        path:
                            ensureTrailingSlash(
                                path
                            ),
                        size: null
                    };
                }
            }

            return {
                ok: false,
                error:
                    "Path does not exist: " +
                    normalize(path)
            };
        }

        const raw =
            await idbGet(
                storageKey(path)
            );

        if(
            raw !== undefined
        ){
            if(
                isStoredDirectory(raw)
            ){
                return {
                    ok: true,
                    kind: "directory",
                    name:
                        basename(path),
                    path:
                        ensureTrailingSlash(
                            path
                        ),
                    size: null
                };
            }

            let size = null;

            if(
                raw instanceof Blob
            ){
                size = raw.size;
            }else if(
                raw instanceof ArrayBuffer
            ){
                size =
                    raw.byteLength;
            }else if(
                ArrayBuffer.isView(raw)
            ){
                size =
                    raw.byteLength;
            }else{
                size =
                    new Blob([
                        String(raw)
                    ]).size;
            }

            return {
                ok: true,
                kind: "file",
                name:
                    basename(path),
                path:
                    normalize(path),
                size
            };
        }

        const prefix =
            storageKey(
                ensureTrailingSlash(
                    path
                )
            );

        const keys =
            await idbKeys();

        for(
            const k of keys
        ){
            if(
                typeof k !==
                "string"
            ){
                continue;
            }

            if(
                k.indexOf(prefix) === 0
            ){
                return {
                    ok: true,
                    kind: "directory",
                    name:
                        basename(path),
                    path:
                        ensureTrailingSlash(
                            path
                        ),
                    size: null
                };
            }
        }

        return {
            ok: false,
            error:
                "Path does not exist: " +
                normalize(path)
        };
    }

    async function stat(path){
        path = normalize(path);

        const z =
            zone(path);

        if(!z){
            return {
                ok: false,
                error:
                    "Unsupported path: " +
                    path
            };
        }

        if(z === "system"){
            if(
                Object.prototype.hasOwnProperty.call(
                    SYSTEM_FILES,
                    path
                )
            ){
                return {
                    ok: true,
                    kind: "file",
                    name:
                        basename(path),
                    path,
                    size:
                        new Blob([
                            SYSTEM_FILES[path]
                        ]).size,
                    protected: true
                };
            }

            if(path === "chxd:/system/"){
                return {
                    ok: true,
                    kind: "directory",
                    name: "system",
                    path,
                    size: null,
                    protected: true
                };
            }

            return {
                ok: false,
                error:
                    "Path does not exist: " +
                    path
            };
        }

        if(z === "device"){
            const entry =
                await getDeviceEntry(path);

            if(!entry.ok){
                return entry;
            }

            if(
                entry.kind === "root"
            ){
                return {
                    ok: true,
                    kind: "directory",
                    name: "device",
                    path: DEVICE_PREFIX,
                    size: null
                };
            }

            let size = null;

            if(
                entry.kind === "file"
            ){
                try{
                    size =
                        (
                            await entry.handle.getFile()
                        ).size;
                }catch(error){}
            }

            return {
                ok: true,
                kind:
                    entry.kind,
                name:
                    basename(path),
                path:
                    entry.kind === "directory"
                        ? ensureTrailingSlash(
                            path
                        )
                        : path,
                size,
                handle:
                    entry.handle
            };
        }

        if(z === "puter"){
            if(
                path === "puter/"
            ){
                path = "puter:/";
            }

            if(
                path === "puter:/"
            ){
                return {
                    ok: true,
                    kind: "directory",
                    name: "puter",
                    path: "puter:/",
                    size: null
                };
            }

            return puterStat(path);
        }

        return localSessionIndexdbStat(
            path,
            z
        );
    }

    async function exists(path){
        const result =
            await stat(path);

        return !!result.ok;
    }

    async function readBinary(path){
        path = normalize(path);

        const st =
            await stat(path);

        if(!st.ok){
            return st;
        }

        if(
            st.kind !== "file"
        ){
            return {
                ok: false,
                error:
                    "Path is not a file: " +
                    path
            };
        }

        const z =
            zone(path);

        if(z === "system"){
            return {
                ok: true,
                data:
                    new Blob([
                        SYSTEM_FILES[path]
                    ]),
                kind: "file"
            };
        }

        if(z === "device"){
            return deviceReadBinary(path);
        }

        if(z === "puter"){
            return puterReadBinary(path);
        }

        if(
            z === "local" ||
            z === "session"
        ){
            const storage =
                z === "local"
                    ? localStorage
                    : sessionStorage;

            const raw =
                storage.getItem(
                    storageKey(path)
                );

            if(
                raw === null
            ){
                return {
                    ok: false,
                    error:
                        "File not found: " +
                        path
                };
            }

            const unpacked =
                unpackStored(raw);

            return {
                ok: true,
                data:
                    unpacked instanceof Blob
                        ? unpacked
                        : new Blob([
                            String(unpacked)
                        ]),
                kind: "file"
            };
        }

        if(z === "indexdb"){
            const raw =
                await idbGet(
                    storageKey(path)
                );

            if(
                raw === undefined ||
                isStoredDirectory(raw)
            ){
                return {
                    ok: false,
                    error:
                        "File not found: " +
                        path
                };
            }

            if(raw instanceof Blob){
                return {
                    ok: true,
                    data: raw,
                    kind: "file"
                };
            }

            if(
                raw instanceof ArrayBuffer ||
                ArrayBuffer.isView(raw)
            ){
                return {
                    ok: true,
                    data:
                        new Blob([raw]),
                    kind: "file"
                };
            }

            return {
                ok: true,
                data:
                    new Blob([
                        String(raw)
                    ]),
                kind: "file"
            };
        }

        return {
            ok: false,
            error:
                "Unsupported path: " +
                path
        };
    }

    async function read(path){
        const result =
            await readBinary(path);

        if(!result.ok){
            return result;
        }

        try{
            return {
                ok: true,
                content:
                    await result.data.text()
            };
        }catch(error){
            return {
                ok: false,
                error:
                    "Unable to decode file: " +
                    errorText(error)
            };
        }
    }

    async function writeBinary(
        path,
        data,
        options = {}
    ){
        path = normalize(path);

        const create =
            options.create !== false;

        const overwrite =
            options.overwrite !== false;

        const z =
            zone(path);

        if(!z){
            return {
                ok: false,
                error:
                    "Unsupported path: " +
                    path
            };
        }

        if(z === "system"){
            return {
                ok: false,
                error:
                    "Cannot write to protected system file: " +
                    path
            };
        }

        if(isRoot(path)){
            return {
                ok: false,
                error:
                    "Cannot write to a filesystem root."
            };
        }

        if(!overwrite){
            const already =
                await exists(path);

            if(already){
                return {
                    ok: false,
                    error:
                        "Destination already exists: " +
                        path
                };
            }
        }

        if(z === "device"){
            return deviceWriteBinary(
                path,
                data,
                create
            );
        }

        if(z === "puter"){
            return puterWrite(
                path,
                data,
                create,
                true,
                overwrite
            );
        }

        if(
            z === "local" ||
            z === "session"
        ){
            const storage =
                z === "local"
                    ? localStorage
                    : sessionStorage;

            const packed =
                await packBinary(
                    data
                );

            storage.setItem(
                storageKey(path),
                packed
            );

            return {
                ok: true
            };
        }

        if(z === "indexdb"){
            await idbSet(
                storageKey(path),
                data instanceof Blob
                    ? data
                    : new Blob([data])
            );

            return {
                ok: true
            };
        }

        return {
            ok: false,
            error:
                "Unsupported write target: " +
                path
        };
    }

    async function write(
        path,
        content,
        create = true,
        allowBinary = false
    ){
        path = normalize(path);

        if(
            allowBinary ||
            isBinaryData(content)
        ){
            return writeBinary(
                path,
                content,
                {
                    create,
                    overwrite: true
                }
            );
        }

        const z =
            zone(path);

        if(!z){
            return {
                ok: false,
                error:
                    "Unsupported path: " +
                    path
            };
        }

        if(z === "system"){
            return {
                ok: false,
                error:
                    "Cannot write to protected system file: " +
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

        if(z === "device"){
            return deviceWrite(
                path,
                content,
                create,
                false
            );
        }

        if(z === "puter"){
            return puterWrite(
                path,
                content,
                create,
                false,
                true
            );
        }

        if(
            z === "local" ||
            z === "session"
        ){
            const storage =
                z === "local"
                    ? localStorage
                    : sessionStorage;

            storage.setItem(
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

    async function mkdir(
        path,
        options = {}
    ){
        path = normalize(path);

        if(
            !path.endsWith("/")
        ){
            path += "/";
        }

        const z =
            zone(path);

        if(!z){
            return {
                ok: false,
                error:
                    "Unsupported path: " +
                    path
            };
        }

        if(z === "system"){
            return {
                ok: false,
                error:
                    "Cannot modify protected system filesystem."
            };
        }

        if(z === "device"){
            const parts =
                splitDevicePath(path);

            if(!parts.length){
                return {
                    ok: true
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
                        "Permission denied for device folder."
                };
            }

            let current = root;

            for(
                const part of parts
            ){
                current =
                    await current.getDirectoryHandle(
                        part,
                        {
                            create: true
                        }
                    );
            }

            return {
                ok: true
            };
        }

        if(z === "puter"){
            return puterMkdir(
                path,
                !!options.overwrite
            );
        }

        if(
            z === "local" ||
            z === "session"
        ){
            const storage =
                z === "local"
                    ? localStorage
                    : sessionStorage;

            storage.setItem(
                dirStorageKey(
                    path
                ),
                "1"
            );

            return {
                ok: true
            };
        }

        if(z === "indexdb"){
            await idbSet(
                storageKey(path),
                makeDirectoryMarker()
            );

            return {
                ok: true
            };
        }

        return {
            ok: false,
            error:
                "Unsupported mkdir target: " +
                path
        };
    }

    async function listDir(path){
        path = normalize(path);

        if(
            !path.endsWith("/")
        ){
            path += "/";
        }

        const z =
            zone(path);

        if(!z){
            return [];
        }

        if(z === "system"){
            return Object.keys(
                SYSTEM_FILES
            )
                .filter(
                    p =>
                        dirname(p) ===
                        path
                );
        }

        if(z === "device"){
            return deviceList(path);
        }

        if(z === "puter"){
            return puterList(path);
        }

        return listVirtualZone(
            z,
            path
        );
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
            return puterListRecursive(
                "puter:/"
            );
        }

        if(
            z === "local" ||
            z === "session" ||
            z === "indexdb"
        ){
            return listRecursiveVirtual(
                ROOT_PREFIXES[z]
            );
        }

        return [];
    }

    async function listRecursiveVirtual(
        root
    ){
        const result = [];

        async function walk(directory){
            const children =
                await listDir(
                    directory
                );

            for(
                const child of children
            ){
                result.push(child);

                if(
                    child.endsWith("/")
                ){
                    await walk(
                        child
                    );
                }
            }
        }

        await walk(
            ensureTrailingSlash(root)
        );

        return result;
    }

    async function puterListRecursive(
        root
    ){
        const result = [];

        async function walk(directory){
            const children =
                await puterList(
                    directory
                );

            for(
                const child of children
            ){
                result.push(child);

                if(
                    child.endsWith("/")
                ){
                    await walk(
                        child
                    );
                }
            }
        }

        await walk(
            root
        );

        return result;
    }

    async function deviceListRecursive(
        path
    ){
        const result = [];

        async function walk(directory){
            const children =
                await deviceList(
                    directory
                );

            for(
                const child of children
            ){
                result.push(child);

                if(
                    child.endsWith("/")
                ){
                    await walk(child);
                }
            }
        }

        await walk(
            path
        );

        return result;
    }

    async function list(path){
        if(
            path == null ||
            path === ""
        ){
            const zones = [
                "local",
                "session",
                "indexdb",
                "system",
                "device",
                "puter"
            ];

            const all =
                await Promise.all(
                    zones.map(
                        listZone
                    )
                );

            return all.flat();
        }

        path = normalize(path);

        const st =
            await stat(path);

        if(
            st.ok &&
            st.kind === "file"
        ){
            return [path];
        }

        const directory =
            ensureTrailingSlash(
                path
            );

        return listRecursive(
            directory
        );
    }

    async function listRecursive(path){
        const result = [];

        async function walk(directory){
            const children =
                await listDir(
                    directory
                );

            for(
                const child of children
            ){
                result.push(child);

                if(
                    child.endsWith("/")
                ){
                    await walk(child);
                }
            }
        }

        await walk(
            ensureTrailingSlash(
                path
            )
        );

        return result;
    }

    async function remove(path){
        path = normalize(path);

        const z =
            zone(path);

        if(!z){
            return {
                ok: false,
                error:
                    "Unsupported path: " +
                    path
            };
        }

        if(z === "system"){
            return {
                ok: false,
                error:
                    "Cannot remove protected system file: " +
                    path
            };
        }

        if(
            z === "device"
        ){
            return deviceRemove(path);
        }

        if(
            z === "puter"
        ){
            return puterRemove(path);
        }

        const st =
            await stat(path);

        if(!st.ok){
            return st;
        }

        if(
            z === "local" ||
            z === "session"
        ){
            const storage =
                z === "local"
                    ? localStorage
                    : sessionStorage;

            if(
                st.kind === "directory"
            ){
                const prefix =
                    storageKey(
                        ensureTrailingSlash(
                            path
                        )
                    );

                const dirPrefix =
                    "LH::DIR::" +
                    ensureTrailingSlash(
                        path
                    );

                const keys = [];

                for(
                    let i = 0;
                    i < storage.length;
                    i++
                ){
                    const k =
                        storage.key(i);

                    if(
                        k &&
                        (
                            k.indexOf(prefix) === 0 ||
                            k.indexOf(
                                dirPrefix
                            ) === 0
                        )
                    ){
                        keys.push(k);
                    }
                }

                for(
                    const key of keys
                ){
                    storage.removeItem(key);
                }
            }else{
                storage.removeItem(
                    storageKey(path)
                );

                storage.removeItem(
                    dirStorageKey(path)
                );
            }

            return {
                ok: true
            };
        }

        if(z === "indexdb"){
            if(
                st.kind === "directory"
            ){
                const prefix =
                    storageKey(
                        ensureTrailingSlash(
                            path
                        )
                    );

                const keys =
                    await idbKeys();

                for(
                    const key of keys
                ){
                    if(
                        typeof key ===
                        "string" &&
                        (
                            key ===
                                storageKey(path) ||
                            key.indexOf(prefix) === 0
                        )
                    ){
                        await idbDelete(
                            key
                        );
                    }
                }
            }else{
                await idbDelete(
                    storageKey(path)
                );
            }

            return {
                ok: true
            };
        }

        return {
            ok: false,
            error:
                "Unsupported delete target: " +
                path
        };
    }

    async function resolveDestination(
        source,
        destination
    ){
        source =
            normalize(source);

        destination =
            normalize(destination);

        const dstStat =
            await stat(destination);

        if(
            dstStat.ok &&
            dstStat.kind === "directory"
        ){
            return (
                ensureTrailingSlash(
                    destination
                ) +
                basename(source) +
                (
                    source.endsWith("/")
                        ? "/"
                        : ""
                )
            );
        }

        return destination;
    }

    async function copyFileAcross(
        source,
        destination,
        overwrite
    ){
        const data =
            await readBinary(source);

        if(!data.ok){
            return data;
        }

        return writeBinary(
            destination,
            data.data,
            {
                create: true,
                overwrite
            }
        );
    }

    async function copyRecursive(
        source,
        destination,
        overwrite = false
    ){
        const st =
            await stat(source);

        if(!st.ok){
            return st;
        }

        if(
            st.kind === "file"
        ){
            return copyFileAcross(
                source,
                destination,
                overwrite
            );
        }

        const made =
            await mkdir(
                destination,
                {
                    overwrite
                }
            );

        if(
            !made.ok
        ){
            if(
                overwrite &&
                (await exists(destination))
            ){
                const dst =
                    await stat(
                        destination
                    );

                if(
                    !dst.ok ||
                    dst.kind !== "directory"
                ){
                    return made;
                }
            }else{
                return made;
            }
        }

        const children =
            await listDir(source);

        for(
            const child of children
        ){
            const childName =
                basename(child);

            const target =
                ensureTrailingSlash(
                    destination
                ) +
                childName +
                (
                    child.endsWith("/")
                        ? "/"
                        : ""
                );

            const copied =
                await copyRecursive(
                    child,
                    target,
                    overwrite
                );

            if(!copied.ok){
                return {
                    ok: false,
                    error:
                        "Copy failed at '" +
                        child +
                        "': " +
                        copied.error
                };
            }
        }

        return {
            ok: true
        };
    }

    async function copy(
        source,
        destination,
        options = {}
    ){
        source =
            normalize(source);

        destination =
            normalize(destination);

        const overwrite =
            options.overwrite === true;

        const sourceStat =
            await stat(source);

        if(!sourceStat.ok){
            return sourceStat;
        }

        if(
            sourceStat.kind === "directory" &&
            sameOrInside(
                source,
                destination
            )
        ){
            return {
                ok: false,
                error:
                    "Cannot copy a directory into itself or one of its descendants."
            };
        }

        const finalDestination =
            await resolveDestination(
                source,
                destination
            );

        if(
            normalize(finalDestination) ===
            source
        ){
            return {
                ok: false,
                error:
                    "Source and destination are the same."
            };
        }

        const srcZone =
            zone(source);

        const dstZone =
            zone(finalDestination);

        if(!dstZone){
            return {
                ok: false,
                error:
                    "Unsupported destination: " +
                    finalDestination
            };
        }

        if(
            srcZone === "system" ||
            dstZone === "system"
        ){
            return {
                ok: false,
                error:
                    "The protected system filesystem cannot participate in copy operations."
            };
        }

        const destinationExists =
            await exists(
                finalDestination
            );

        if(
            destinationExists &&
            !overwrite
        ){
            return {
                ok: false,
                error:
                    "Destination already exists: " +
                    finalDestination
            };
        }

        if(
            srcZone === "puter" &&
            dstZone === "puter"
        ){
            return puterCopy(
                source,
                finalDestination,
                overwrite
            );
        }

        if(
            sourceStat.kind === "directory" &&
            destinationExists &&
            overwrite
        ){
            const dstStat =
                await stat(
                    finalDestination
                );

            if(
                !dstStat.ok ||
                dstStat.kind !==
                    "directory"
            ){
                await remove(
                    finalDestination
                );
            }
        }else if(
            destinationExists &&
            overwrite
        ){
            await remove(
                finalDestination
            );
        }

        const copied =
            await copyRecursive(
                source,
                finalDestination,
                overwrite
            );

        if(!copied.ok){
            return copied;
        }

        return {
            ok: true,
            source,
            destination:
                finalDestination,
            kind:
                sourceStat.kind
        };
    }

    async function move(
        source,
        destination,
        options = {}
    ){
        source =
            normalize(source);

        destination =
            normalize(destination);

        const overwrite =
            options.overwrite === true;

        const sourceStat =
            await stat(source);

        if(!sourceStat.ok){
            return sourceStat;
        }

        if(
            sourceStat.kind === "directory" &&
            sameOrInside(
                source,
                destination
            )
        ){
            return {
                ok: false,
                error:
                    "Cannot move a directory into itself or one of its descendants."
            };
        }

        const finalDestination =
            await resolveDestination(
                source,
                destination
            );

        if(
            finalDestination === source
        ){
            return {
                ok: false,
                error:
                    "Source and destination are the same."
            };
        }

        const srcZone =
            zone(source);

        const dstZone =
            zone(finalDestination);

        if(
            !dstZone
        ){
            return {
                ok: false,
                error:
                    "Unsupported destination: " +
                    finalDestination
            };
        }

        if(
            srcZone === "system" ||
            dstZone === "system"
        ){
            return {
                ok: false,
                error:
                    "The protected system filesystem cannot participate in move operations."
            };
        }

        const destinationExists =
            await exists(
                finalDestination
            );

        if(
            destinationExists &&
            !overwrite
        ){
            return {
                ok: false,
                error:
                    "Destination already exists: " +
                    finalDestination
            };
        }

        if(
            srcZone === "puter" &&
            dstZone === "puter"
        ){
            const result =
                await puterMove(
                    source,
                    finalDestination,
                    overwrite
                );

            if(result.ok){
                return {
                    ok: true,
                    source,
                    destination:
                        finalDestination,
                    kind:
                        sourceStat.kind
                };
            }

            return result;
        }

        const copied =
            await copy(
                source,
                finalDestination,
                {
                    overwrite
                }
            );

        if(!copied.ok){
            return copied;
        }

        const removed =
            await remove(source);

        if(!removed.ok){
            return {
                ok: false,
                error:
                    "Copied successfully, but the original could not be removed: " +
                    removed.error,
                copied: true,
                source,
                destination:
                    finalDestination
            };
        }

        return {
            ok: true,
            source,
            destination:
                finalDestination,
            kind:
                sourceStat.kind,
            mode:
                "copy-delete"
        };
    }

    async function rename(
        source,
        newName,
        options = {}
    ){
        newName =
            cleanName(newName);

        if(!newName){
            return {
                ok: false,
                error:
                    "Invalid new name."
            };
        }

        const parent =
            dirname(source);

        if(!parent){
            return {
                ok: false,
                error:
                    "Cannot rename this path."
            };
        }

        return move(
            source,
            ensureTrailingSlash(
                parent
            ) +
            newName +
            (
                normalize(source).endsWith("/")
                    ? "/"
                    : ""
            ),
            options
        );
    }

    async function find(pattern){
        pattern =
            normalize(pattern);

        const z =
            zone(pattern);

        const root =
            z
                ? ROOT_PREFIXES[z]
                : null;

        const all =
            root
                ? await listRecursive(root)
                : await list();

        const re =
            wildcardToRegex(
                pattern
            );

        return all.filter(
            p =>
                re.test(p)
        );
    }

    function wildcardToRegex(
        pattern
    ){
        return new RegExp(
            "^" +
            String(pattern)
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

    window.FS = {
        normalize,
        zone,

        exists,
        stat,

        read,
        readBinary,

        write,
        writeBinary,

        mkdir,

        remove,

        list,
        listDir,
        find,

        copy,
        move,
        rename,

        puterReady,

        mountDeviceFolder,
        unmountDeviceFolder,
        getDeviceMounts,

        ensurePermission
    };
})();
