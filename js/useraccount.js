let username =
    localStorage.getItem(
        "littlehollow.username"
    ) || "";

let github =
    localStorage.getItem(
        "littlehollow.github"
    ) || "";

let gas =
    localStorage.getItem(
        "littlehollow.gas"
    ) || "";

let authToken =
    localStorage.getItem(
        "littlehollow.authToken"
    ) || "";

let pats = [];

function saveUserAccount(
    values={}
){
    if(
        Object.prototype.hasOwnProperty.call(
            values,
            "username"
        )
    ){
        username =
            String(
                values.username || ""
            );
    }

    if(
        Object.prototype.hasOwnProperty.call(
            values,
            "github"
        )
    ){
        github =
            String(
                values.github || ""
            );
    }

    if(
        Object.prototype.hasOwnProperty.call(
            values,
            "gas"
        )
    ){
        gas =
            String(
                values.gas || ""
            );
    }

    if(
        Object.prototype.hasOwnProperty.call(
            values,
            "authToken"
        )
    ){
        authToken =
            String(
                values.authToken || ""
            );
    }

    localStorage.setItem(
        "littlehollow.username",
        username
    );

    localStorage.setItem(
        "littlehollow.github",
        github
    );

    localStorage.setItem(
        "littlehollow.gas",
        gas
    );

    if(authToken){
        localStorage.setItem(
            "littlehollow.authToken",
            authToken
        );
    }else{
        localStorage.removeItem(
            "littlehollow.authToken"
        );
    }
}

function setAuthToken(
    value
){
    authToken =
        String(
            value || ""
        );

    saveUserAccount();
}

function setPATS(
    values
){
    pats =
        Array.isArray(
            values
        )
            ?[
                ...new Set(
                    values
                        .map(
                            value =>
                                String(
                                    value || ""
                                ).trim()
                        )
                        .filter(
                            Boolean
                        )
                )
            ]
            :[];

    return [
        ...pats
    ];
}

function clearPATS(){
    pats = [];
}

function clearUserAccount(){
    username = "";
    github = "";
    gas = "";
    authToken = "";
    pats = [];

    localStorage.removeItem(
        "littlehollow.username"
    );

    localStorage.removeItem(
        "littlehollow.github"
    );

    localStorage.removeItem(
        "littlehollow.gas"
    );

    localStorage.removeItem(
        "littlehollow.authToken"
    );
}

window.userAccount = {
    get username(){
        return username;
    },

    get github(){
        return github;
    },

    get gas(){
        return gas;
    },

    get authToken(){
        return authToken;
    },

    get pats(){
        return [
            ...pats
        ];
    },

    get pat(){
        return pats[0] || "";
    },

    save:
        saveUserAccount,

    setAuthToken:
        setAuthToken,

    setPATS:
        setPATS,

    clearPATS:
        clearPATS,

    clear:
        clearUserAccount
};
