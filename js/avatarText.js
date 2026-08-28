/*
 * The ONLY thing Little Hollow expresses through inline text tags
 * rather than a real tool call: avatar emotes. Everything else
 * (apps, windows, files) goes through js/tools.js as function calls.
 *
 * Recognized inline tags, written naturally inside the AI's reply:
 *   <blinkL, ms>  <blinkR, ms>  <blinkboth, ms>  <wave, ms>
 */
(function(){

    const AVATAR_RE=/<(blinkL|blinkR|blinkboth|wave),\s*(-?\d+)\s*>/gi;

    function process(text){
        text=String(text||"");
        const found=[];
        let m;

        AVATAR_RE.lastIndex=0;
        while((m=AVATAR_RE.exec(text))!==null){
            found.push({cmd:m[1].toLowerCase(),ms:parseInt(m[2],10)});
        }

        const clean=text.replace(AVATAR_RE,"").replace(/[ \t]{2,}/g," ").trim();

        for(const f of found){
            if(f.cmd==="blinkl") Avatar.setBlink("l",f.ms);
            else if(f.cmd==="blinkr") Avatar.setBlink("r",f.ms);
            else if(f.cmd==="blinkboth") Avatar.setBlink("b",f.ms);
            else if(f.cmd==="wave") Avatar.setHand("wave",f.ms);
        }

        return clean;
    }

    window.AvatarText={process};

})();
