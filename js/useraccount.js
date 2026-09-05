let username = localStorage.getItem("littlehollow.username") || "";
let pat = localStorage.getItem("littlehollow.pat") || "";
let github = localStorage.getItem("littlehollow.github") || "";

function saveUserAccount(){
    localStorage.setItem("littlehollow.username", username);
    localStorage.setItem("littlehollow.pat", pat);
    localStorage.setItem("littlehollow.github", github);
}

function clearUserAccount(){
    username = "";
    pat = "";
    github = "";
    localStorage.removeItem("littlehollow.username");
    localStorage.removeItem("littlehollow.pat");
    localStorage.removeItem("littlehollow.github");
}

window.userAccount = {
    get username(){ return username; },
    get pat(){ return pat; },
    get github(){ return github; },
    save: saveUserAccount,
    clear: clearUserAccount
};
