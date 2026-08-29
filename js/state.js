(function(){

    /*
     * ============================================================
     * LITTLE HOLLOW STATE
     * ============================================================
     *
     * This is NOT a dump of the DOM.
     *
     * It exposes only useful application-level state.
     *
     * Other parts of Little Hollow can update this state with:
     *
     *   LittleHollowState.update("reason", {
     *       activeApp: "Notepad"
     *   });
     *
     * Live AI listens for:
     *
     *   "littlehollow:statechange"
     *
     * ============================================================
     */


    const state = {

        session: {

            startedAt:
                new Date().toISOString(),

            lastActivityAt:
                new Date().toISOString()

        },


        desktop: {

            activeApp: null,

            openApps: [],

            focusedWindow: null

        },


        filesystem: {

            currentPath: null,

            selectedPath: null

        },


        recentEvents: []

    };


    const MAX_EVENTS =
        20;


    function clone(value){

        return JSON.parse(
            JSON.stringify(value)
        );

    }


    function touchActivity(){

        state.session.lastActivityAt =
            new Date().toISOString();

    }


    function pushEvent(
        type,
        data
    ){

        state.recentEvents.push({

            type,

            time:
                new Date().toISOString(),

            data:
                data == null
                    ? null
                    : clone(data)

        });


        if(
            state.recentEvents.length >
            MAX_EVENTS
        ){

            state.recentEvents =
                state.recentEvents.slice(
                    -MAX_EVENTS
                );

        }

    }


    function update(
        reason,
        patch
    ){

        patch =
            patch || {};


        if(
            patch.session
        ){

            Object.assign(
                state.session,
                patch.session
            );

        }


        if(
            patch.desktop
        ){

            Object.assign(
                state.desktop,
                patch.desktop
            );

        }


        if(
            patch.filesystem
        ){

            Object.assign(
                state.filesystem,
                patch.filesystem
            );

        }


        if(
            Array.isArray(
                patch.openApps
            )
        ){

            state.desktop.openApps =
                patch.openApps.slice();

        }


        if(
            Array.isArray(
                patch.recentEvents
            )
        ){

            state.recentEvents =
                patch.recentEvents
                    .slice(-MAX_EVENTS);

        }


        touchActivity();


        if(
            reason
        ){

            pushEvent(
                "state_update",
                {
                    reason:
                        String(reason)
                }
            );

        }


        window.dispatchEvent(

            new CustomEvent(
                "littlehollow:statechange",
                {

                    detail: {

                        reason:
                            reason ||
                            "State changed.",

                        snapshot:
                            getSnapshot()

                    }

                }

            )

        );


        return getSnapshot();

    }


    function recordEvent(
        type,
        data,
        reason
    ){

        pushEvent(
            type,
            data
        );


        touchActivity();


        window.dispatchEvent(

            new CustomEvent(
                "littlehollow:statechange",
                {

                    detail: {

                        reason:
                            reason ||
                            type,

                        snapshot:
                            getSnapshot()

                    }

                }

            )

        );

    }


    function getSnapshot(){

        return clone({

            session: {

                startedAt:
                    state.session.startedAt,

                lastActivityAt:
                    state.session.lastActivityAt

            },

            desktop: {

                activeApp:
                    state.desktop.activeApp,

                openApps:
                    state.desktop.openApps,

                focusedWindow:
                    state.desktop.focusedWindow

            },

            filesystem: {

                currentPath:
                    state.filesystem.currentPath,

                selectedPath:
                    state.filesystem.selectedPath

            },

            recentEvents:
                state.recentEvents

        });

    }


    function setActiveApp(
        name
    ){

        state.desktop.activeApp =
            name
                ? String(name)
                : null;


        state.desktop.focusedWindow =
            state.desktop.activeApp;


        update(
            "Active application changed."
        );

    }


    function setOpenApps(
        apps
    ){

        state.desktop.openApps =
            Array.isArray(apps)
                ? apps.map(
                    String
                  )
                : [];


        update(
            "Open applications changed."
        );

    }


    function setFilesystemLocation(
        path
    ){

        state.filesystem.currentPath =
            path == null
                ? null
                : String(path);


        update(
            "Filesystem location changed."
        );

    }


    function setSelectedPath(
        path
    ){

        state.filesystem.selectedPath =
            path == null
                ? null
                : String(path);


        update(
            "Selected file changed."
        );

    }


    window.LittleHollowState = {

        getSnapshot,

        update,

        recordEvent,

        setActiveApp,

        setOpenApps,

        setFilesystemLocation,

        setSelectedPath

    };

})();
