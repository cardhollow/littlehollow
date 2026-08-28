(function(){

    function boot(){
        const launcher=document.getElementById("launcher-icon");
        launcher.addEventListener("click",()=>{
            Apps.openApp("messenger");
        });

        const appsBtn=document.getElementById("taskbar-apps-btn");
        appsBtn.addEventListener("click",()=>{
            Apps.openApp("apps");
        });

        // Greet once the world is ready.
        setTimeout(()=>{
            Avatar.setHand("wave",1200);
            Avatar.setBlink("b",130);
        },600);
    }

    if(document.readyState==="loading"){
        document.addEventListener("DOMContentLoaded",boot);
    }else{
        boot();
    }

})();
