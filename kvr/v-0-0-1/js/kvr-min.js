'use strict';const dataBaseName="kunniaaVoiceRepeater",objectStorName="audioStore",db=new Dexie(dataBaseName);db.version(1).stores({[objectStorName]:"key, value"});var audio=document.getElementById("audioPlayer"),currentAudioName="",isInRPState=!1;
const importMenu=document.getElementById("importMenu"),importSubMenu=document.getElementById("importSubMenu"),exportMenu=document.getElementById("exportMenu"),exportSubMenu=document.getElementById("exportSubMenu"),debugMenu=document.getElementById("debugMenu"),debugSubMenu=document.getElementById("debugSubMenu"),helpMenu=document.getElementById("helpMenu"),helpSubMenu=document.getElementById("helpSubMenu");var intervalID=null,rpTimePointStart=-1,rpTimePointEnd=-1;const languageToggle=document.getElementById("languageToggle");
var isEnglish=!0;
const translations={Import:"\u5bfc\u5165","Import an audio file":"\u5bfc\u5165\u4e00\u4e2a\u97f3\u9891\u6587\u4ef6",Export:"\u5bfc\u51fa","Export a repeating record file":"\u5bfc\u51fa\u4e00\u4e2a\u590d\u8bfb\u8bb0\u5f55\u6587\u4ef6",Debug:"\u8c03\u8bd5","Console: read all keys":"\u63a7\u5236\u53f0\uff1a\u8bfb\u53d6\u6570\u636e\u5e93\u6240\u6709\u7684Keys","Console: delete audio database":"\u63a7\u5236\u53f0\uff1a\u5220\u9664\u97f3\u9891\u6570\u636e\u5e93","Update play list":"\u66f4\u65b0\u64ad\u653e\u5217\u8868",Help:"\u5e2e\u52a9",
Tutorial:"\u6559\u7a0b","Continue play":"\u7ee7\u7eed\u64ad\u653e","Repeating start":"\u590d\u8bfb\u8d77\u70b9","Repeating end":"\u590d\u8bfb\u7ec8\u70b9","Add repeating":"\u6dfb\u52a0\u590d\u8bfb","Reset play":"\u91cd\u7f6e\u64ad\u653e","Audio library":"\u97f3\u9891\u5e93","Repeating list":"\u590d\u8bfb\u5217\u8868",Delete:"\u5220\u9664","All rights reserved":"\u7248\u6743\u6240\u6709","Kunniaa Voice Repeater":"\u8363\u8000\u8bed\u97f3\u590d\u8bfb\u673a",Version:"\u7248\u672c","Update date":"\u66f4\u65b0\u65e5\u671f"};
languageToggle.addEventListener("click",function(){isEnglish=!isEnglish;languageToggle.textContent=isEnglish?"\u4e2d\u6587":"EN";document.querySelectorAll("[data-translate]").forEach(a=>{const b=a.getAttribute("data-translate");a.textContent=isEnglish?b:translations[b]})});audio.addEventListener("play",()=>{setButtonState("btnCntPlay",!1);setButtonState("btnRPSart",!0);setButtonState("btnRPEnd",!1);setButtonState("btnRPAdd",!1);setButtonState("btnReset",!1)});
audio.addEventListener("ended",()=>{setButtonState("btnCntPlay",!0);setButtonState("btnRPSart",!1);setButtonState("btnRPEnd",!1);setButtonState("btnRPAdd",!1);setButtonState("btnReset",!1)});audio.addEventListener("pause",()=>{setButtonState("btnCntPlay",!0);setButtonState("btnRPSart",!1);setButtonState("btnRPEnd",!1);setButtonState("btnRPAdd",!1);setButtonState("btnReset",!1)});audio.addEventListener("mousedown",function(a){isInRPState&&(a.preventDefault(),a.stopPropagation())},!0);
audio.addEventListener("click",function(a){isInRPState&&(a.preventDefault(),a.stopPropagation())},!0);document.addEventListener("keydown",a=>{a=a.key;"ArrowLeft"==a?--audio.currentTime:"ArrowRight"==a&&(audio.currentTime+=1)},!1);importMenu.addEventListener("mouseenter",()=>{importSubMenu.classList.remove("hidden")});importMenu.addEventListener("mouseleave",a=>{"importSubMenu"!=a.target.id&&importSubMenu.classList.add("hidden")});importSubMenu.addEventListener("mouseleave",()=>{importSubMenu.classList.add("hidden")});
importSubMenu.addEventListener("click",()=>{importSubMenu.classList.add("hidden")});exportMenu.addEventListener("mouseenter",()=>{exportSubMenu.classList.remove("hidden")});exportMenu.addEventListener("mouseleave",a=>{"exportSubMenu"!=a.target.id&&exportSubMenu.classList.add("hidden")});exportSubMenu.addEventListener("mouseleave",()=>{exportSubMenu.classList.add("hidden")});exportSubMenu.addEventListener("click",()=>{exportSubMenu.classList.add("hidden")});
debugMenu.addEventListener("mouseenter",()=>{debugSubMenu.classList.remove("hidden")});debugMenu.addEventListener("mouseleave",a=>{"debugSubMenu"!=a.target.id&&debugSubMenu.classList.add("hidden")});debugSubMenu.addEventListener("mouseleave",()=>{debugSubMenu.classList.add("hidden")});debugSubMenu.addEventListener("click",()=>{debugSubMenu.classList.add("hidden")});helpMenu.addEventListener("mouseenter",()=>{helpSubMenu.classList.remove("hidden")});
helpMenu.addEventListener("mouseleave",a=>{"debugSubMenu"!=a.target.id&&helpSubMenu.classList.add("hidden")});helpSubMenu.addEventListener("mouseleave",()=>{helpSubMenu.classList.add("hidden")});helpSubMenu.addEventListener("click",()=>{helpSubMenu.classList.add("hidden")});const waveSurfer=WaveSurfer.create({container:document.getElementById("waveSurfer"),waveColor:"rgb(200, 0, 200)",progressColor:"rgb(100, 0, 100)",normalize:!0,media:audio});
waveSurfer.on("ready",function(){document.getElementById("placeholderWaveform").style.display="none"});document.getElementById("fileInput").addEventListener("change",async a=>{if(a=a.target.files[0])await storeAudioFile(a.name,a),updatePlayList()});async function storeData(a,b){try{await db[objectStorName].put({key:a,value:b}),console.log(`\u6210\u529f\u5b58\u50a8\u6570\u636e: ${a}`)}catch(c){console.error("\u5b58\u50a8\u6570\u636e\u5931\u8d25:",c)}}
async function getData(a){try{const b=await db[objectStorName].get(a);if(b)return console.log(`\u6210\u529f\u83b7\u53d6\u6570\u636e: ${a}`),b.value;console.log(`\u672a\u627e\u5230\u6570\u636e: ${a}`);return null}catch(b){return console.error("\u83b7\u53d6\u6570\u636e\u5931\u8d25:",b),null}}async function checkKeyExists(a){try{return void 0!==await db[objectStorName].get(a)}catch(b){return console.error("\u68c0\u67e5key\u662f\u5426\u5b58\u5728\u65f6\u51fa\u9519:",b),!1}}
async function storeAudioFile(a,b){await checkKeyExists(a)?console.log(`'${a}'\u5df2\u7ecf\u5b58\u5728\u4e8e\u6570\u636e\u5e93\u4e2d\uff0c\u4e0d\u518d\u91cd\u590d\u5b58\u50a8`):(b=await b.arrayBuffer(),await storeData(a,b),console.log(`'${a}'\u5df2\u7ecf\u6210\u529f\u5b58\u5230\u6570\u636e\u5e93`))}
async function storeList(a,b){await checkKeyExists(a)?console.log(`'${a}'\u5df2\u7ecf\u5b58\u5728\u4e8e\u6570\u636e\u5e93\u4e2d\uff0c\u4e0d\u518d\u91cd\u590d\u5b58\u50a8`):(await storeData(a,b),console.log(`'${a}'\u5df2\u7ecf\u6210\u529f\u5b58\u5230\u6570\u636e\u5e93`))}
function exportRPFile(){let a=document.createElement("div");a.className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center";a.innerHTML='\n        <div class="bg-white p-5 rounded-lg shadow-xl w-96">\n            <h2 class="text-lg font-bold mb-4">\u9009\u62e9\u8981\u5bfc\u51fa\u7684\u590d\u8bfb\u8bb0\u5f55</h2>\n            <div id="rpFileList" class="mb-4 max-h-60 overflow-y-auto"></div>\n            <div class="flex justify-end">\n                <button id="cancelExport" class="mr-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">\u53d6\u6d88</button>\n                <button id="confirmExport" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">\u5bfc\u51fa</button>\n            </div>\n        </div>\n    ';document.body.appendChild(a);
db[objectStorName].where("key").startsWith("").keys().then(b=>{let c=document.getElementById("rpFileList");b.forEach(d=>{if(d.endsWith(".rp")){let e=document.createElement("div");e.innerHTML=`
                <label class="flex items-center">
                    <input type="radio" name="rpFile" value="${d}" class="mr-2">
                    ${d}
                </label>
            `;c.appendChild(e)}})}).catch(b=>{console.error("\u83b7\u53d6.rp\u6587\u4ef6\u5217\u8868\u5931\u8d25\uff1a",b)});document.getElementById("confirmExport").addEventListener("click",()=>{let b=document.querySelector('input[name="rpFile"]:checked');b?db.table(objectStorName).get(b.value).then(c=>{c=new Blob([JSON.stringify(c)],{type:"text/plain"});c=URL.createObjectURL(c);let d=document.createElement("a");d.href=c;d.download=`${b.value}.txt`;d.click();URL.revokeObjectURL(c);a.remove()}).catch(c=>
{console.error("\u5bfc\u51fa\u6587\u4ef6\u5931\u8d25\uff1a",c)}):alert("\u8bf7\u9009\u62e9\u4e00\u4e2a\u6587\u4ef6\u8fdb\u884c\u5bfc\u51fa")});document.getElementById("cancelExport").addEventListener("click",()=>{a.remove()})}function disableAudioControl(){isInRPState=!0;audio.classList.add("pointer-events-none")}function enableAudioControl(){isInRPState=!1;audio.classList.remove("pointer-events-none")}
function setButtonState(a,b){a=document.getElementById(`${a}`);a.disabled=!b;a.classList.toggle("opacity-50",!b);a.classList.toggle("cursor-not-allowed",!b)}function setButtonRPColor(a,b){a=document.getElementById(`${a}`);b?(a.classList.remove("bg-blue-500"),a.classList.add("bg-green-500")):(a.classList.remove("bg-green-500"),a.classList.add("bg-blue-500"))}
function cntPlayAudio(a){0==audio.readyState?alert("\u8bf7\u5148\u52a0\u8f7d\u97f3\u9891"):a.disabled||(null!=intervalID&&(window.clearInterval(intervalID),intervalID=null,rpTimePointEnd=rpTimePointStart=-1),isInRPState&&enableAudioControl(),audio.play(),setButtonState("btnCntPlay",!1),setButtonState("btnRPSart",!0),setButtonState("btnRPEnd",!1),setButtonState("btnRPAdd",!1),setButtonState("btnReset",!1),setButtonRPColor("btnRPSart",!1),setButtonRPColor("btnRPEnd",!1))}
function recordRPStart(a){0==audio.readyState?alert("\u8bf7\u5148\u52a0\u8f7d\u97f3\u9891"):a.disabled||(rpTimePointStart=audio.currentTime,disableAudioControl(),setButtonState("btnCntPlay",!1),setButtonState("btnRPSart",!1),setButtonState("btnRPEnd",!0),setButtonState("btnRPAdd",!1),setButtonState("btnReset",!0),setButtonRPColor("btnRPSart",!0),setButtonRPColor("btnRPEnd",!1))}
function recordRPEnd(a){0==audio.readyState?alert("\u8bf7\u5148\u52a0\u8f7d\u97f3\u9891"):a.disabled||(rpTimePointEnd=audio.currentTime,rpTimePointEnd<rpTimePointStart?alert("\u590d\u8bfb\u7ec8\u70b9\u65f6\u95f4\u70b9\u5c0f\u4e8e\u590d\u8bfb\u8d77\u70b9\u65f6\u95f4\u70b9\uff0c\u65e0\u6548\uff0c\u8bf7\u91cd\u9009\u590d\u8bfb\u7ec8\u70b9\u3002"):(rpTimePointEnd=audio.currentTime,audio.currentTime=rpTimePointStart,audio.play(),intervalID=window.setInterval(function(){audio.currentTime>=rpTimePointEnd?
audio.currentTime=rpTimePointStart:audio.currentTime<=rpTimePointStart&&(audio.currentTime=rpTimePointStart)},0),setButtonState("btnCntPlay",!1),setButtonState("btnRPSart",!1),setButtonState("btnRPEnd",!1),setButtonState("btnRPAdd",!0),setButtonState("btnReset",!0),setButtonRPColor("btnRPSart",!0),setButtonRPColor("btnRPEnd",!0)))}
async function updateOrAddToIndexedDB(a,b){let c=a+".rp",d=await getData(c);null!=d?Array.isArray(d)?(d.push(b),d.sort((e,f)=>e[0]-f[0]),await storeData(c,d),updateRpList(a),console.log("\u5b58\u6570\u636e\u6210\u529f:",d)):console.log("\u83b7\u53d6\u5230\u5176\u4ed6\u7c7b\u578b\u7684\u6570\u636e:",d):(await storeList(c,[b]),console.log("\u5b58\u65b0\u6570\u636e\u6210\u529f:"),updateRpList(a))}
function addRP(a){0==audio.readyState?alert("\u8bf7\u5148\u52a0\u8f7d\u97f3\u9891"):a.disabled||(a=[rpTimePointStart,rpTimePointEnd],console.log("\u590d\u8bfb\u65f6\u95f4\u70b9\uff1a"+rpTimePointStart+","+rpTimePointEnd),updateOrAddToIndexedDB(currentAudioName,a),setButtonState("btnCntPlay",!0),setButtonState("btnRPSart",!1),setButtonState("btnRPEnd",!1),setButtonState("btnRPAdd",!1),setButtonState("btnReset",!1),setButtonRPColor("btnRPSart",!0),setButtonRPColor("btnRPEnd",!0))}
function resetAudioPlay(a){0==audio.readyState?alert("\u8bf7\u5148\u52a0\u8f7d\u97f3\u9891"):a.disabled||(null!=intervalID&&(window.clearInterval(intervalID),intervalID=null),document.getElementById("rpList").querySelectorAll("li").forEach(b=>b.classList.remove("bg-green-200","text-green-800")),enableAudioControl(),audio.currentTime=rpTimePointEnd,audio.play(),rpTimePointEnd=rpTimePointStart=-1,setButtonState("btnCntPlay",!1),setButtonState("btnRPSart",!0),setButtonState("btnRPEnd",!1),setButtonState("btnRPAdd",
!1),setButtonState("btnReset",!1),setButtonRPColor("btnRPSart",!1),setButtonRPColor("btnRPEnd",!1))}function importAudioFromFileToDatabase(){document.getElementById("fileInput").click()}async function readAllKeysOfAudioDataBase(){const a=await db[objectStorName].toCollection().keys();a.forEach(b=>{console.log("key="+b)});console.log("\u6570\u636e\u5e93\u4e2d\u5171\u6709"+a.length+"\u4e2akey")}
async function deleteAudioDatabase(){try{await db.close(),console.log("\u6570\u636e\u5e93\u5df2\u6210\u529f\u5173\u95ed")}catch(a){console.error("\u5173\u95ed\u6570\u636e\u5e93\u65f6\u53d1\u751f\u9519\u8bef:",a)}Dexie.delete(dataBaseName).then(()=>{console.log(`\u6570\u636e\u5e93 ${dataBaseName} \u5df2\u6210\u529f\u5220\u9664`);alert(`\u6570\u636e\u5e93 ${dataBaseName} \u5df2\u6210\u529f\u5220\u9664\uff0c\u5373\u5c06\u5f3a\u5236\u5237\u65b0\u9875\u9762`);window.location.reload()}).catch(a=>{console.error(`\u5220\u9664\u6570\u636e\u5e93 ${dataBaseName} \u65f6\u53d1\u751f\u9519\u8bef:`,
a);alert(`\u5220\u9664\u6570\u636e\u5e93 ${dataBaseName} \u65f6\u53d1\u751f\u9519\u8bef:`+a)})}
async function readRPList(a){a=await getData(a+".rp");let b=document.getElementById("rpList");a&&0<a.length&&a.forEach(function(c){let d=document.createElement("li");d.classList.add("py-2","px-3","hover:bg-gray-300","cursor-pointer","transition","duration-100");var e=c[0],f=c[1];let h=Math.floor(e/60);e=(e%60).toFixed(2);let k=Math.floor(f/60);f=(f%60).toFixed(2);d.textContent=`${h}:${e} - ${k}:${f}`;d.dataset.startTime=c[0];d.dataset.endTime=c[1];d.addEventListener("click",function(){disableAudioControl();
rpTimePointStart=c[0];rpTimePointEnd=c[1];b.querySelectorAll("li").forEach(g=>g.classList.remove("bg-green-200","text-green-800"));this.classList.add("bg-green-200","text-green-800");null!=intervalID&&(window.clearInterval(intervalID),intervalID=null);intervalID=window.setInterval(function(){audio.currentTime>=rpTimePointEnd?audio.currentTime=rpTimePointStart:audio.currentTime<=rpTimePointStart&&(audio.currentTime=rpTimePointStart)},0);setButtonState("btnCntPlay",!1);setButtonState("btnRPSart",!1);
setButtonState("btnRPEnd",!1);setButtonState("btnRPAdd",!1);setButtonState("btnReset",!0);setButtonRPColor("btnRPSart",!0);setButtonRPColor("btnRPEnd",!0)});d.addEventListener("contextmenu",function(g){g.preventDefault();showContextMenuRP(g,c[0],c[1])});b.appendChild(d)})}
function showContextMenu(a,b){let c=document.getElementById("contextMenu");c.style.left=a.pageX+"px";c.style.top=a.pageY+"px";c.classList.remove("hidden");document.getElementById("deleteOption").onclick=function(){deleteAudioFromDatabase(b);c.classList.add("hidden")};document.addEventListener("click",function e(){c.classList.add("hidden");document.removeEventListener("click",e)})}
async function deleteAudioFromDatabase(a){try{await db[objectStorName].delete(a),console.log(`\u6210\u529f\u4ece\u6570\u636e\u5e93\u4e2d\u5220\u9664\u97f3\u9891: ${a}`),await db[objectStorName].delete(a+".rp"),console.log(`\u6210\u529f\u4ece\u6570\u636e\u5e93\u4e2d\u5220\u9664\u590d\u8bfb\u8bb0\u5f55: ${a}.rp`),updatePlayList(),currentAudioName===a&&updateRpList(currentAudioName)}catch(b){console.error("\u5220\u9664\u6570\u636e\u5931\u8d25:",b)}}
function showContextMenuRP(a,b,c){let d=document.getElementById("contextMenuRP");d.style.left=a.pageX+"px";d.style.top=a.pageY+"px";d.classList.remove("hidden");document.getElementById("deleteOptionRP").onclick=function(){deleteRepeatSegment(b,c);d.classList.add("hidden")};document.addEventListener("click",function f(){d.classList.add("hidden");document.removeEventListener("click",f)})}
async function deleteRepeatSegment(a,b){try{let c=await getData(currentAudioName+".rp");c&&Array.isArray(c)?(c=c.filter(d=>!(d[0]===a&&d[1]===b)),c.sort((d,e)=>d[0]-e[0]),await storeData(currentAudioName+".rp",c),console.log("\u590d\u8bfb\u6bb5\u5df2\u6210\u529f\u5220\u9664\u5e76\u91cd\u65b0\u6392\u5e8f"),updateRpList(currentAudioName)):console.log("\u672a\u627e\u5230\u590d\u8bfb\u70b9\u5217\u8868\u6216\u5217\u8868\u683c\u5f0f\u4e0d\u6b63\u786e")}catch(c){console.error("\u5220\u9664\u590d\u8bfb\u6bb5\u65f6\u51fa\u9519:",
c)}}
async function readPlayList(){const a=await db[objectStorName].toCollection().keys();let b=document.getElementById("playList");a.forEach(c=>{if(c.endsWith(".mp3")){var d=document.createElement("li");d.textContent=c;d.classList.add("py-2","px-3","hover:bg-gray-300","cursor-pointer","transition","duration-100");d.addEventListener("click",function(){isInRPState?alert("\u76ee\u524d\u5728\u590d\u8bfb\u76f8\u5173\u72b6\u6001\uff0c\u5207\u6362\u8bf7\u5148\u590d\u4f4d\u91cd\u8bbe\u3002"):(currentAudioName=d.textContent,
waveSurfer.stop(),readAudioAndPlay(currentAudioName),updateRpList(currentAudioName),b.querySelectorAll("li").forEach(e=>e.classList.remove("bg-blue-200","text-blue-800")),this.classList.add("bg-blue-200","text-blue-800"))});d.addEventListener("contextmenu",function(e){e.preventDefault();showContextMenu(e,c)});b.appendChild(d)}})}function updatePlayList(){document.getElementById("playList").innerHTML="";readPlayList()}
function updateRpList(a){document.getElementById("rpList").innerHTML="";readRPList(a)}async function readAudioAndPlay(a){var b=await getData(a);b=new Blob([b],{type:"audio/mp3"});b=URL.createObjectURL(b);waveSurfer.load(b);audio.src=b;currentAudioName=a;audio.play()}window.onload=function(){updatePlayList()};