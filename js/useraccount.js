let username = localStorage.getItem("littlehollow.username") || "";
let pat = localStorage.getItem("littlehollow.pat") || "";

function saveUserAccount(){
    localStorage.setItem("littlehollow.username", username);
    localStorage.setItem("littlehollow.pat", pat);
}

function clearUserAccount(){
    username = "";
    pat = "";
    localStorage.removeItem("littlehollow.username");
    localStorage.removeItem("littlehollow.pat");
}

window.userAccount = {
    get username(){ return username; },
    get pat(){ return pat; },
    save: saveUserAccount,
    clear: clearUserAccount
};
