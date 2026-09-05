let username=localStorage.getItem("littlehollow.username")||"";
let github=localStorage.getItem("littlehollow.github")||"";
let gas=localStorage.getItem("littlehollow.gas")||"";
let authToken=localStorage.getItem("littlehollow.authToken")||"";
let pats=[];
try{
    const raw=localStorage.getItem("littlehollow.pats");
    if(raw){
        const parsed=JSON.parse(raw);
        if(Array.isArray(parsed)){
            pats=[...new Set(parsed.map(v=>String(v||"").trim()).filter(Boolean))];
        }
    }
}catch(_){ }
if(!pats.length){
    const oldPat=localStorage.getItem("littlehollow.pat")||"";
    if(oldPat){
        pats=[oldPat];
        localStorage.setItem("littlehollow.pats",JSON.stringify(pats));
        localStorage.removeItem("littlehollow.pat");
    }
}
function saveUserAccount(values={}){
    if(Object.prototype.hasOwnProperty.call(values,"username"))username=String(values.username||"");
    if(Object.prototype.hasOwnProperty.call(values,"github"))github=String(values.github||"");
    if(Object.prototype.hasOwnProperty.call(values,"gas"))gas=String(values.gas||"");
    if(Object.prototype.hasOwnProperty.call(values,"authToken"))authToken=String(values.authToken||"");
    if(Object.prototype.hasOwnProperty.call(values,"pats"))setPATS(values.pats);
    localStorage.setItem("littlehollow.username",username);
    localStorage.setItem("littlehollow.github",github);
    localStorage.setItem("littlehollow.gas",gas);
    if(authToken)localStorage.setItem("littlehollow.authToken",authToken);else localStorage.removeItem("littlehollow.authToken");
    localStorage.setItem("littlehollow.pats",JSON.stringify(pats));
}
function setAuthToken(value){
    authToken=String(value||"");
    saveUserAccount();
}
function setPATS(values){
    pats=Array.isArray(values)?[...new Set(values.map(v=>String(v||"").trim()).filter(Boolean))]:[];
    localStorage.setItem("littlehollow.pats",JSON.stringify(pats));
    return [...pats];
}
function addPAT(value){
    const value2=String(value||"").trim();
    if(value2&&!pats.includes(value2))pats.push(value2);
    localStorage.setItem("littlehollow.pats",JSON.stringify(pats));
    return [...pats];
}
function removePAT(value){
    const value2=String(value||"").trim();
    pats=pats.filter(item=>item!==value2);
    localStorage.setItem("littlehollow.pats",JSON.stringify(pats));
    return [...pats];
}
function clearPATS(){
    pats=[];
    localStorage.removeItem("littlehollow.pats");
}
function clearUserAccount(){
    username="";
    github="";
    gas="";
    authToken="";
    pats=[];
    localStorage.removeItem("littlehollow.username");
    localStorage.removeItem("littlehollow.github");
    localStorage.removeItem("littlehollow.gas");
    localStorage.removeItem("littlehollow.authToken");
    localStorage.removeItem("littlehollow.pats");
    localStorage.removeItem("littlehollow.pat");
}
window.userAccount={
    get username(){return username;},
    get github(){return github;},
    get gas(){return gas;},
    get authToken(){return authToken;},
    get pats(){return [...pats];},
    get pat(){return pats[0]||"";},
    save:saveUserAccount,
    setAuthToken:setAuthToken,
    setPATS:setPATS,
    addPAT:addPAT,
    removePAT:removePAT,
    clearPATS:clearPATS,
    clear:clearUserAccount
};
