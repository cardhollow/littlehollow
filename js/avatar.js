/*
 * Little Hollow avatar — canvas face renderer.
 * Exposes: setEye, setEyeM, setBlink, setMouth, setHand, typeText, displayText, hideText
 */
(function(){

const canvas=document.getElementById("avatarCanvas");
const ctx=canvas.getContext("2d");

let W=0;
let H=0;
let DPR=1;

const CYAN="#00FFFF";

const typingData={active:false,text:"",index:0,nextPress:0,finishAt:0};
const displayData={active:false,text:""};

const eye={
    width:0,height:0,
    left:{x:0,y:0,tx:0,ty:0},
    right:{x:0,y:0,tx:0,ty:0},
    mode:"normal",
    view:{ox:0,oy:0,w:0,h:0,px:0.5,py:0.5,targetX:0,targetY:0,nextMove:0},
    matrixUntil:-1,
    thinkingUntil:-1,
    searchUntil:-1,
    searchPhase:0,
    matrixColumns:[],
    blink:{left:0,right:0,leftActive:false,rightActive:false,leftStart:0,rightStart:0,leftDuration:150,rightDuration:150,next:0},
    nextLook:0
};

const mouth={value:"closed",x:0,y:0,tx:0,ty:0,currentOpen:0,targetOpen:0,nextMove:0};

const hand={
    mode:"normal",until:-1,
    left:{x:0,y:0,tx:0,ty:0,angle:0},
    right:{x:0,y:0,tx:0,ty:0,angle:0},
    wave:{x:0,y:0,tx:0,ty:0,angle:0,targetAngle:0,side:"right",active:false},
    typing:null
};

function random(min,max){ return Math.random()*(max-min)+min; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function lerp(a,b,t){ return a+(b-a)*t; }

function resize(){
    DPR=Math.min(window.devicePixelRatio||1,2);
    W=window.innerWidth;
    H=window.innerHeight;
    canvas.width=W*DPR;
    canvas.height=H*DPR;
    canvas.style.width=W+"px";
    canvas.style.height=H+"px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
    updateSize();
}
window.addEventListener("resize",resize);

function updateSize(){
    const s=Math.min(W,H);
    eye.width=s*0.20;
    eye.height=s*0.31;
    if(!eye.left.x) centerEyes();
    if(!mouth.x) centerMouth();
}

function centerEyes(){
    const cx=W*0.5;
    const cy=H*0.38;
    const separation=eye.width*1.45;
    eye.left.x=cx-separation/2; eye.right.x=cx+separation/2;
    eye.left.y=cy; eye.right.y=cy;
    eye.left.tx=eye.left.x; eye.left.ty=eye.left.y;
    eye.right.tx=eye.right.x; eye.right.ty=eye.right.y;
}

function centerMouth(){
    mouth.x=W*0.5; mouth.y=H*0.75;
    mouth.tx=mouth.x; mouth.ty=mouth.y;
}

function chooseLook(time){
    if(eye.mode==="view") return;
    const separation=eye.width*random(1.25,1.6);
    const cx=random(eye.width*0.7+separation/2,W-eye.width*0.7-separation/2);
    const cy=random(eye.height*0.7,H*0.62);
    const dy=random(-eye.height*0.10,eye.height*0.10);
    eye.left.tx=cx-separation/2; eye.right.tx=cx+separation/2;
    eye.left.ty=cy+dy; eye.right.ty=cy-dy;
    eye.nextLook=time+random(900,2800);
}

function setEyeM(mode,args){
    mode=String(mode).toLowerCase();
    if(mode==="normal"){ eye.mode="normal"; return; }
    if(mode==="view"){
        const values=Array.isArray(args)?args:[];
        eye.mode="view";
        eye.view.ox=Number(values[0])||0;
        eye.view.oy=Number(values[1])||0;
        eye.view.w=Math.max(0,Number(values[2])||0);
        eye.view.h=Math.max(0,Number(values[3])||0);
        eye.view.px=random(0,1); eye.view.py=random(0,1);
        eye.view.targetX=random(0,1); eye.view.targetY=random(0,1);
        eye.view.nextMove=performance.now()+random(300,900);
    }
}

function updateView(time){
    if(eye.mode!=="view") return;
    if(time>=eye.view.nextMove){
        eye.view.targetX=random(0,1); eye.view.targetY=random(0,1);
        eye.view.nextMove=time+random(700,1800);
    }
    eye.view.px=lerp(eye.view.px,eye.view.targetX,0.025);
    eye.view.py=lerp(eye.view.py,eye.view.targetY,0.025);
    const separation=eye.width*1.45;
    const cx=W*0.5+eye.view.ox+(eye.view.px-0.5)*eye.view.w;
    const cy=H*0.38+eye.view.oy+(eye.view.py-0.5)*eye.view.h;
    eye.left.tx=cx-separation/2; eye.right.tx=cx+separation/2;
    eye.left.ty=cy; eye.right.ty=cy;
}

function setBlink(side,duration){
    side=String(side).toLowerCase();
    const now=performance.now();
    const d=Math.max(1,Number(duration)||150);
    if(side==="l"){ eye.blink.leftActive=true; eye.blink.leftStart=now; eye.blink.leftDuration=d; }
    if(side==="r"){ eye.blink.rightActive=true; eye.blink.rightStart=now; eye.blink.rightDuration=d; }
    if(side==="b"||side==="both"){
        eye.blink.leftActive=true; eye.blink.rightActive=true;
        eye.blink.leftStart=now; eye.blink.rightStart=now;
        eye.blink.leftDuration=d; eye.blink.rightDuration=d;
    }
}

function updateOneBlink(name,time){
    const b=eye.blink;
    if(!b[name+"Active"]){ b[name]=0; return; }
    const p=clamp((time-b[name+"Start"])/b[name+"Duration"],0,1);
    b[name]=Math.sin(p*Math.PI);
    if(p>=1){ b[name+"Active"]=false; b[name]=0; }
}

function updateBlink(time){ updateOneBlink("left",time); updateOneBlink("right",time); }

function setEye(mode,duration){
    mode=String(mode).toLowerCase();
    const now=performance.now();
    eye.mode=mode;
    eye.matrixUntil=-1;
    eye.thinkingUntil=-1;
    eye.searchUntil=-1;
    if(mode==="normal"){ eye.mode="normal"; return; }
    if(mode==="matrix"){
        eye.matrixUntil=duration===-1?-1:now+Math.max(0,Number(duration)||0);
        createMatrix();
        return;
    }
    if(mode==="thinking"){
        eye.thinkingUntil=duration===-1?-1:now+Math.max(0,Number(duration)||0);
        return;
    }
    if(mode==="search"||mode==="searching"){
        eye.mode="search";
        eye.searchUntil=duration===-1?-1:now+Math.max(0,Number(duration)||0);
        eye.searchPhase=0;
        createMatrix();
        return;
    }
    eye.mode="normal";
}

function createMatrix(){
    const count=Math.max(12,Math.floor(eye.width/8));
    eye.matrixColumns=[];
    for(let i=0;i<count;i++){
        const column={x:random(0,1),y:random(-1,1),speed:random(0.25,0.9),chars:[]};
        const len=Math.floor(random(4,12));
        for(let j=0;j<len;j++) column.chars.push(randomMatrixChar());
        eye.matrixColumns.push(column);
    }
}

function randomMatrixChar(){
    const chars="アイウエオカキクケコサシスセソ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return chars[Math.floor(Math.random()*chars.length)];
}

function updateMatrix(time){
    if(eye.mode==="matrix"){
        if(eye.matrixUntil!==-1&&time>=eye.matrixUntil){ eye.mode="normal"; eye.matrixUntil=-1; return; }
        for(const column of eye.matrixColumns){
            column.y+=column.speed*0.012;
            if(column.y>1.3){
                column.y=random(-1.5,-0.2);
                column.speed=random(0.25,0.9);
                for(let i=0;i<column.chars.length;i++) column.chars[i]=randomMatrixChar();
            }
        }
    }
    if(eye.mode==="thinking"){
        if(eye.thinkingUntil!==-1&&time>=eye.thinkingUntil){ eye.mode="normal"; eye.thinkingUntil=-1; return; }
    }
    if(eye.mode==="search"){
        if(eye.searchUntil!==-1&&time>=eye.searchUntil){ eye.mode="normal"; eye.searchUntil=-1; return; }
        eye.searchPhase+=0.045;
    }
}

function drawThinkingEye(x,y,blink,time){
    const blinkScale=Math.max(0.025,1-blink*0.975);
    const w=eye.width;
    const h=eye.height*blinkScale;
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(1+Math.sin(time*0.006)*0.035,1+Math.cos(time*0.005)*0.035);
    ctx.fillStyle=CYAN;
    ctx.globalAlpha=0.18;
    ctx.beginPath();
    ctx.ellipse(0,0,w*0.5,h*0.5,0,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
    for(let i=0;i<5;i++){
        const a=time*0.0035+i*Math.PI*0.4;
        const rx=w*0.30;
        const ry=h*0.25;
        const px=Math.cos(a)*rx;
        const py=Math.sin(a)*ry;
        const r=Math.max(3,w*0.025);
        ctx.beginPath();
        ctx.arc(px,py,r,0,Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

function drawSearchEye(x,y,blink,time){
    const blinkScale=Math.max(0.025,1-blink*0.975);
    const w=eye.width;
    const h=eye.height*blinkScale;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2);
    ctx.clip();
    ctx.fillStyle="#000";
    ctx.fillRect(x-w/2,y-h/2,w,h);
    ctx.strokeStyle=CYAN;
    ctx.lineWidth=Math.max(2,w*0.03);
    const scanY=y-h/2+(Math.sin(time*0.007)*0.5+0.5)*h;
    ctx.globalAlpha=0.9;
    ctx.beginPath();
    ctx.moveTo(x-w/2,scanY);
    ctx.lineTo(x+w/2,scanY);
    ctx.stroke();
    ctx.globalAlpha=0.45;
    for(let i=0;i<6;i++){
        const px=x-w*0.42+i*w*0.17;
        const py=y+h*0.28;
        ctx.beginPath();
        ctx.arc(px,py,Math.max(2,w*0.018),0,Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();
}

function drawNormalEye(x,y,blink){
    const blinkScale=Math.max(0.025,1-blink*0.975);
    ctx.save();
    ctx.translate(x,y);
    ctx.fillStyle=CYAN;
    ctx.beginPath();
    ctx.ellipse(0,0,eye.width/2,eye.height/2*blinkScale,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
}

function drawMatrixEye(x,y,blink){
    const blinkScale=Math.max(0.025,1-blink*0.975);
    const w=eye.width;
    const h=eye.height*blinkScale;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2);
    ctx.clip();
    ctx.fillStyle="#000";
    ctx.fillRect(x-w/2,y-h/2,w,h);
    ctx.font=Math.max(10,w*0.11)+"px monospace";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    for(const column of eye.matrixColumns){
        const px=x-w/2+column.x*w;
        for(let i=0;i<column.chars.length;i++){
            const py=y-h/2+(column.y-i*0.12)*h;
            if(py<y-h/2-20||py>y+h/2+20) continue;
            ctx.globalAlpha=1-(i/column.chars.length)*0.8;
            ctx.fillStyle=CYAN;
            ctx.fillText(column.chars[i],px,py);
        }
    }
    ctx.globalAlpha=1;
    ctx.restore();
}

function drawEye(x,y,blink,time){
    if(eye.mode==="matrix") drawMatrixEye(x,y,blink);
    else if(eye.mode==="thinking") drawThinkingEye(x,y,blink,time);
    else if(eye.mode==="search") drawSearchEye(x,y,blink,time);
    else drawNormalEye(x,y,blink);
}

function setMouth(value){
    value=String(value).toUpperCase();
    if(!["A","E","I","O","U","CLOSED"].includes(value)) return;
    mouth.value=value==="CLOSED"?"closed":value;
    mouth.targetOpen=mouth.value==="closed"?0:1;
}

function chooseMouthMovement(time){
    const s=Math.min(W,H);
    mouth.tx=W*0.5+random(-s*0.16,s*0.16);
    mouth.ty=H*0.75+random(-s*0.08,s*0.08);
    if(mouth.value==="closed"||Math.random()<0.18) mouth.targetOpen=0;
    else mouth.targetOpen=random(0.78,1.08);
    mouth.nextMove=time+random(500,1800);
}

function updateMouth(time){
    if(time>=mouth.nextMove) chooseMouthMovement(time);
    mouth.x=lerp(mouth.x,mouth.tx,0.035);
    mouth.y=lerp(mouth.y,mouth.ty,0.035);
    mouth.currentOpen=lerp(mouth.currentOpen,mouth.targetOpen,0.08);
}

function drawMouth(){
    const s=Math.min(W,H);
    const w=s*0.19;
    const h=s*0.16;
    const open=mouth.currentOpen;

    if(open<0.01){
        ctx.save();
        ctx.strokeStyle=CYAN;
        ctx.lineWidth=Math.max(3,s*0.012);
        ctx.lineCap="round";
        ctx.beginPath();
        ctx.moveTo(mouth.x-w*0.30,mouth.y);
        ctx.lineTo(mouth.x+w*0.30,mouth.y);
        ctx.stroke();
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.translate(mouth.x,mouth.y);
    ctx.scale(0.94+open*0.06,0.94+open*0.06);
    ctx.fillStyle=CYAN;

    if(mouth.value==="A"){
        ctx.beginPath();
        ctx.ellipse(0,0,w*0.48,h*0.52,0,0,Math.PI*2);
        ctx.fill();
    }
    if(mouth.value==="E"){
        ctx.beginPath();
        ctx.ellipse(0,0,w*0.52,h*0.27,0,0,Math.PI*2);
        ctx.fill();
    }
    if(mouth.value==="I"){
        ctx.beginPath();
        ctx.roundRect(-w*0.12,-h*0.48,w*0.24,h*0.96,w*0.12);
        ctx.fill();
    }
    if(mouth.value==="O"){
        ctx.beginPath();
        ctx.ellipse(0,0,w*0.39,h*0.53,0,0,Math.PI*2);
        ctx.fill();
    }
    if(mouth.value==="U"){
        ctx.beginPath();
        ctx.moveTo(-w*0.44,-h*0.44);
        ctx.lineTo(-w*0.44,0);
        ctx.quadraticCurveTo(-w*0.44,h*0.50,0,h*0.50);
        ctx.quadraticCurveTo(w*0.44,h*0.50,w*0.44,0);
        ctx.lineTo(w*0.44,-h*0.44);
        ctx.lineTo(w*0.19,-h*0.44);
        ctx.lineTo(w*0.19,-h*0.02);
        ctx.quadraticCurveTo(w*0.19,h*0.22,0,h*0.22);
        ctx.quadraticCurveTo(-w*0.19,h*0.22,-w*0.19,-h*0.02);
        ctx.lineTo(-w*0.19,-h*0.44);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function typeText(str){
    typingData.text=String(str).toUpperCase();
    typingData.index=0;
    typingData.active=true;
    typingData.finishAt=0;
    typingData.nextPress=performance.now()+500;
    if(hand.mode!=="typing"||!hand.typing) setHand("typing",-1);
}

function displayText(str){ displayData.text=String(str); displayData.active=true; }
function hideText(){ displayData.text=""; displayData.active=false; }

function setHand(mode,duration){
    mode=String(mode).toLowerCase();
    if(mode==="normal"){
        hand.mode="normal"; hand.until=-1; hand.wave.active=false; hand.typing=null;
        return;
    }
    if(mode==="typing"){
        hand.mode="typing";
        hand.until=duration===-1?-1:performance.now()+Math.max(0,duration);
        setupTypingHands();
        return;
    }
    if(mode==="wave"){
        hand.mode="wave";
        hand.until=duration===-1?-1:performance.now()+Math.max(0,duration);
        setupWave();
    }
}

function setupTypingHands(){
    const s=Math.min(W,H);
    hand.left.x=W*0.5-s*0.16; hand.left.y=H*0.84;
    hand.left.tx=hand.left.x; hand.left.ty=hand.left.y;
    hand.right.x=W*0.5+s*0.16; hand.right.y=H*0.84;
    hand.right.tx=hand.right.x; hand.right.ty=hand.right.y;
    hand.left.angle=0; hand.right.angle=0;

    hand.typing={keys:[],pressed:-1,nextPress:0,leftTargetKey:null,rightTargetKey:null};

    const rows=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
    for(let r=0;r<rows.length;r++){
        for(let i=0;i<rows[r].length;i++){
            hand.typing.keys.push({char:rows[r][i],row:r,index:i,pressed:0});
        }
    }
    hand.typing.keys.push({char:"SPACE",row:3,index:0,pressed:0});
    hand.typing.keys.push({char:"ENTER",row:3,index:1,pressed:0});

    chooseTypingTargets(performance.now());
}

function chooseTypingTargets(time){
    if(!hand.typing) return;
    const keys=hand.typing.keys.filter(k=>k.char!=="SPACE"&&k.char!=="ENTER");
    const lIdx=Math.floor(Math.random()*keys.length);
    let rIdx=Math.floor(Math.random()*keys.length);
    if(keys.length>1&&rIdx===lIdx) rIdx=(rIdx+1)%keys.length;
    hand.typing.leftTargetKey=keys[lIdx];
    hand.typing.rightTargetKey=keys[rIdx];
    hand.typing.nextPress=time+random(100,280);
}

function getTypingKeyPosition(key){
    const s=Math.min(W,H);
    const keyW=s*0.055;
    const gap=keyW*0.08;
    const rowY=[H*0.77,H*0.83,H*0.89];

    if(key.char==="SPACE") return {x:W*0.5-s*0.09,y:H*0.95};
    if(key.char==="ENTER") return {x:W*0.5+s*0.13,y:H*0.95};

    const rowLengths=[10,9,7];
    const totalWidth=rowLengths[key.row]*keyW+(rowLengths[key.row]-1)*gap;
    const startX=W*0.5-totalWidth/2;

    return {x:startX+key.index*(keyW+gap)+keyW/2,y:rowY[key.row]};
}

function findKey(char){
    if(!hand.typing) return null;
    if(char===" ") return hand.typing.keys.find(k=>k.char==="SPACE");
    if(char==="\n"||char==="\r") return hand.typing.keys.find(k=>k.char==="ENTER");
    return hand.typing.keys.find(k=>k.char===char)||hand.typing.keys.find(k=>k.char==="ENTER");
}

function chooseTypingHand(){
    if(!hand.typing.leftTargetKey&&!hand.typing.rightTargetKey) return "left";
    if(!hand.typing.leftTargetKey) return "left";
    if(!hand.typing.rightTargetKey) return "right";
    return Math.random()<0.5?"left":"right";
}

function updateTypingHands(time){
    if(!hand.typing) return;
    const keys=hand.typing.keys;
    const s=Math.min(W,H);

    for(const key of keys) key.pressed=Math.max(0,key.pressed-0.12);

    if(typingData.active){
        if(time>=typingData.nextPress&&typingData.index<typingData.text.length){
            const char=typingData.text[typingData.index];
            const key=findKey(char);
            if(key){
                key.pressed=1;
                hand.typing.pressed=key.index;
                const selectedHand=chooseTypingHand();
                if(selectedHand==="left") hand.typing.leftTargetKey=key;
                else hand.typing.rightTargetKey=key;
            }
            typingData.index++;
            typingData.nextPress=time+random(80,180);
        }
        if(typingData.index>=typingData.text.length){
            typingData.active=false;
            typingData.finishAt=time+500;
        }
    }else if(time>=hand.typing.nextPress){
        let index=-1;
        const roll=Math.random();
        if(roll<0.06) index=keys.findIndex(k=>k.char==="SPACE");
        else if(roll<0.10) index=keys.findIndex(k=>k.char==="ENTER");
        else{
            const typingKeys=keys.filter(k=>k.char!=="SPACE"&&k.char!=="ENTER");
            if(typingKeys.length){
                const randomKey=typingKeys[Math.floor(Math.random()*typingKeys.length)];
                index=keys.indexOf(randomKey);
            }
        }
        if(index>=0){
            keys[index].pressed=1;
            hand.typing.pressed=index;
            const selectedHand=chooseTypingHand();
            if(selectedHand==="left") hand.typing.leftTargetKey=keys[index];
            else hand.typing.rightTargetKey=keys[index];
        }
        hand.typing.nextPress=time+random(100,280);
    }

    const lKey=hand.typing.leftTargetKey;
    const rKey=hand.typing.rightTargetKey;

    if(lKey){ const p=getTypingKeyPosition(lKey); hand.left.tx=p.x; hand.left.ty=p.y-s*0.06; }
    if(rKey){ const p=getTypingKeyPosition(rKey); hand.right.tx=p.x; hand.right.ty=p.y-s*0.06; }

    hand.left.x=lerp(hand.left.x,hand.left.tx,0.20);
    hand.left.y=lerp(hand.left.y,hand.left.ty,0.20);
    hand.right.x=lerp(hand.right.x,hand.right.tx,0.20);
    hand.right.y=lerp(hand.right.y,hand.right.ty,0.20);
}

function drawVirtualKeyboard(){
    if(!hand.typing) return;
    const s=Math.min(W,H);
    const keyW=s*0.055;
    const keyH=s*0.055;
    const gap=keyW*0.08;

    const rows=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
    const rowY=[H*0.77,H*0.83,H*0.89];

    ctx.save();
    ctx.lineWidth=Math.max(1.5,s*0.004);
    ctx.font=Math.max(9,s*0.025)+"px monospace";
    ctx.textAlign="center";
    ctx.textBaseline="middle";

    for(let r=0;r<rows.length;r++){
        const row=rows[r];
        const totalWidth=row.length*keyW+(row.length-1)*gap;
        const startX=W*0.5-totalWidth/2;

        for(let i=0;i<row.length;i++){
            const key=hand.typing.keys.find(k=>k.row===r&&k.index===i);
            const x=startX+i*(keyW+gap);
            const y=rowY[r];

            if(key&&key.pressed>0){
                ctx.fillStyle=CYAN;
                ctx.globalAlpha=key.pressed;
                ctx.fillRect(x,y-keyH/2,keyW,keyH);
                ctx.globalAlpha=1;
                ctx.fillStyle="#000";
                ctx.fillText(row[i],x+keyW/2,y);
            }else{
                ctx.strokeStyle=CYAN;
                ctx.strokeRect(x,y-keyH/2,keyW,keyH);
                ctx.fillStyle=CYAN;
                ctx.fillText(row[i],x+keyW/2,y);
            }
        }
    }

    const bottomY=H*0.95;
    const bottomGap=s*0.025;
    const spaceW=s*0.25;
    const enterW=s*0.14;
    const totalBottom=spaceW+enterW+bottomGap;
    const bottomStart=W*0.5-totalBottom/2;
    const spaceX=bottomStart;
    const enterX=spaceX+spaceW+bottomGap;

    const spaceKey=hand.typing.keys.find(k=>k.char==="SPACE");
    const enterKey=hand.typing.keys.find(k=>k.char==="ENTER");

    if(spaceKey&&spaceKey.pressed>0){
        ctx.fillStyle=CYAN; ctx.globalAlpha=spaceKey.pressed;
        ctx.fillRect(spaceX,bottomY-keyH/2,spaceW,keyH);
        ctx.globalAlpha=1; ctx.fillStyle="#000";
    }else{
        ctx.strokeStyle=CYAN;
        ctx.strokeRect(spaceX,bottomY-keyH/2,spaceW,keyH);
        ctx.fillStyle=CYAN;
    }
    ctx.fillText("SPACE",spaceX+spaceW/2,bottomY);

    if(enterKey&&enterKey.pressed>0){
        ctx.fillStyle=CYAN; ctx.globalAlpha=enterKey.pressed;
        ctx.fillRect(enterX,bottomY-keyH/2,enterW,keyH);
        ctx.globalAlpha=1; ctx.fillStyle="#000";
    }else{
        ctx.strokeStyle=CYAN;
        ctx.strokeRect(enterX,bottomY-keyH/2,enterW,keyH);
        ctx.fillStyle=CYAN;
    }
    ctx.fillText("ENTER",enterX+enterW/2,bottomY);
    ctx.restore();
}

function setupWave(){
    hand.wave.side=Math.random()<0.5?"left":"right";
    hand.wave.active=true;
    hand.wave.x=hand.wave.side==="left"?W*0.12:W*0.88;
    hand.wave.y=H*0.82;
    hand.wave.tx=hand.wave.x;
    hand.wave.ty=H*0.48;
    hand.wave.angle=0;
    hand.wave.targetAngle=0;
}

function updateWave(time){
    if(!hand.wave.active) return;
    hand.wave.x=lerp(hand.wave.x,hand.wave.tx,0.05);
    hand.wave.y=lerp(hand.wave.y,hand.wave.ty,0.05);
    hand.wave.targetAngle=Math.sin(time*0.014)*0.55;
    hand.wave.angle=lerp(hand.wave.angle,hand.wave.targetAngle,0.15);
}

function updateHands(time){
    if(hand.mode!=="normal"&&hand.until!==-1&&time>=hand.until){
        hand.mode="normal"; hand.until=-1; hand.wave.active=false; hand.typing=null;
    }
    if(hand.mode==="typing"){
        updateTypingHands(time);
        if(!typingData.active&&typingData.finishAt>0&&time>=typingData.finishAt){
            hand.mode="normal"; hand.until=-1; hand.wave.active=false; hand.typing=null;
            typingData.finishAt=0;
        }
    }
    if(hand.mode==="wave") updateWave(time);
}

function drawHand(x,y,angle,phase,side){
    const s=Math.min(W,H)*0.13;
    const palmW=s*0.5;
    const palmH=s*0.4;
    const fingerW=palmW/4.5;
    const fingerH=[s*0.35,s*0.45,s*0.40,s*0.30];
    const gap=(palmW-fingerW*4)/3;
    const startX=-palmW/2+fingerW/2;

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);
    ctx.fillStyle=CYAN;

    ctx.beginPath();
    ctx.roundRect(-palmW/2,-palmH/2,palmW,palmH,s*0.1);
    ctx.fill();

    for(let i=0;i<4;i++){
        const movement=Math.sin(phase+i*0.7)*s*0.02;
        ctx.beginPath();
        ctx.roundRect(startX+i*(fingerW+gap)-fingerW/2,-palmH/2-fingerH[i]+movement,fingerW,fingerH[i],fingerW/2);
        ctx.fill();
    }

    const thumbDir=side==="left"?1:-1;
    const thumbX=thumbDir===1?palmW/2-fingerW/2:-palmW/2-s*0.25+fingerW/2;
    ctx.beginPath();
    ctx.roundRect(thumbX,0,s*0.25,fingerW,fingerW/2);
    ctx.fill();

    ctx.restore();
}

function drawHands(time){
    if(hand.mode==="typing"){
        drawVirtualKeyboard();
        drawHand(hand.left.x,hand.left.y,0,time*0.014,"left");
        drawHand(hand.right.x,hand.right.y,0,time*0.014+Math.PI,"right");
        return;
    }
    if(hand.mode==="wave"&&hand.wave.active){
        drawHand(hand.wave.x,hand.wave.y,hand.wave.angle,time*0.014,hand.wave.side);
    }
}

function drawHUD(){
    if(!displayData.active) return;
    const s=Math.min(W,H);
    const hudW=Math.min(W*0.85,800);
    const hudH=Math.max(s*0.12,60);
    const hudX=W*0.5-hudW/2;
    const hudY=H*0.05;

    ctx.save();
    ctx.strokeStyle=CYAN;
    ctx.lineWidth=2;
    ctx.fillStyle="rgba(0,40,40,0.7)";

    ctx.beginPath();
    ctx.moveTo(hudX+20,hudY);
    ctx.lineTo(hudX+hudW-20,hudY);
    ctx.lineTo(hudX+hudW,hudY+20);
    ctx.lineTo(hudX+hudW,hudY+hudH-20);
    ctx.lineTo(hudX+hudW-20,hudY+hudH);
    ctx.lineTo(hudX+20,hudY+hudH);
    ctx.lineTo(hudX,hudY+hudH-20);
    ctx.lineTo(hudX,hudY+20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle="rgba(0,255,255,0.1)";
    for(let y=hudY;y<hudY+hudH;y+=4) ctx.fillRect(hudX,y,hudW,1);

    const fontSize=Math.max(16,s*0.035);
    ctx.fillStyle=CYAN;
    ctx.font=`${fontSize*0.6}px monospace`;
    ctx.textAlign="left";
    ctx.textBaseline="middle";
    ctx.fillText("SYS.OUTPUT:",hudX+20,hudY+hudH*0.2);

    ctx.font=`${fontSize}px monospace`;
    let text=displayData.text;
    const maxW=hudW-40;
    while(ctx.measureText(text).width>maxW&&text.length>0) text=text.substring(1);
    ctx.fillText(text,hudX+20,hudY+hudH*0.65);
    ctx.restore();
}

function update(time){
    updateView(time);
    if(eye.mode!=="view"&&time>=eye.nextLook) chooseLook(time);
    if(time>=eye.blink.next){
        setBlink(Math.random()<0.5?"l":"r",random(110,180));
        if(Math.random()<0.35) setBlink("b",random(110,180));
        eye.blink.next=time+random(1800,5200);
    }
    eye.left.x=lerp(eye.left.x,eye.left.tx,0.035);
    eye.left.y=lerp(eye.left.y,eye.left.ty,0.035);
    eye.right.x=lerp(eye.right.x,eye.right.tx,0.035);
    eye.right.y=lerp(eye.right.y,eye.right.ty,0.035);
    updateBlink(time);
    updateMatrix(time);
    updateMouth(time);
    updateHands(time);
}

function render(time){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#000";
    ctx.fillRect(0,0,W,H);
    update(time);
    drawEye(eye.left.x,eye.left.y,eye.blink.left,time);
    drawEye(eye.right.x,eye.right.y,eye.blink.right,time);
    drawMouth();
    drawHands(time);
    drawHUD();
    requestAnimationFrame(render);
}

window.Avatar={setEye,setEyeM,setBlink,setMouth,setHand,typeText,displayText,hideText};

resize();
eye.nextLook=performance.now()+500;
eye.blink.next=performance.now()+random(1800,4000);
mouth.nextMove=performance.now()+random(800,1800);
setMouth("CLOSED");
requestAnimationFrame(render);

})();
