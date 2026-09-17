(function(){
	"use strict";

	if(window.__CHXD_CLOCK_WAKE_SERVICE__){
		return;
	}

	const STATE_PATH="chxd:/local/Clock/state.json";
	const APP_NAME="Clock";

	const service={
		lastWakeKey:"",
		opening:false,
		timer:0
	};

	window.__CHXD_CLOCK_WAKE_SERVICE__=service;

	function hostWindows(){
		const list=[window];

		try{
			if(window.parent&&window.parent!==window){
				list.push(window.parent);
			}
		}catch(_){}

		try{
			if(window.top&&window.top!==window&&!list.includes(window.top)){
				list.push(window.top);
			}
		}catch(_){}

		return list;
	}

	function getFS(){
		for(const w of hostWindows()){
			try{
				if(
					w.FS&&
					typeof w.FS.read==="function"
				){
					return w.FS;
				}
			}catch(_){}
		}

		return null;
	}

	async function readState(){
		const fs=getFS();

		if(!fs){
			return null;
		}

		try{
			const result=await fs.read(STATE_PATH);

			if(
				result&&
				typeof result==="object"&&
				result.ok===false
			){
				return null;
			}

			const content=
				result&&
				result.content!=null
					?result.content
					:result;

			if(content==null){
				return null;
			}

			const value=JSON.parse(String(content));

			return value&&typeof value==="object"
				?value
				:null;
		}catch(_){
			return null;
		}
	}

	function now(){
		return new Date();
	}

	function dateKey(date){
		return[
			date.getFullYear(),
			String(date.getMonth()+1).padStart(2,"0"),
			String(date.getDate()).padStart(2,"0")
		].join("-");
	}

	function wakeKey(kind,value){
		return kind+":"+String(value);
	}

	function openClock(key){
		if(service.opening||service.lastWakeKey===key){
			return;
		}

		service.lastWakeKey=key;
		service.opening=true;

		try{
			if(
				window.Apps&&
				typeof window.Apps.openApp==="function"
			){
				const result=
					window.Apps.openApp(
						APP_NAME,
						{allowMultiple:false}
					);

				if(
					result&&
					typeof result.catch==="function"
				){
					result.catch(()=>{});
				}
			}
		}catch(_){}

		setTimeout(()=>{
			service.opening=false;
		},1000);
	}

	async function check(){
		const state=await readState();

		if(!state){
			return;
		}

		const current=now();
		const currentHHMM=
			String(current.getHours()).padStart(2,"0")+
			":"+
			String(current.getMinutes()).padStart(2,"0");

		const today=dateKey(current);

		if(Array.isArray(state.alarms)){
			for(const alarm of state.alarms){
				if(!alarm||alarm.active===false){
					continue;
				}

				if(String(alarm.lastFired||"")===today){
					continue;
				}

				if(String(alarm.time||"")===currentHHMM){
					openClock(
						wakeKey(
							"alarm",
							String(alarm.id)+":"+today
						)
					);
					return;
				}
			}
		}

		const timer=state.timer||{};

		if(
			timer.running&&
			Number(timer.end)>0&&
			Number(timer.end)<=Date.now()
		){
			openClock(
				wakeKey(
					"timer",
					Number(timer.end)
				)
			);
			return;
		}

		const ring=state.ring||{};

		if(ring.active){
			openClock(
				wakeKey(
					"ring",
					String(ring.kind||"")+
					":"+
					String(ring.id||0)
				)
			);
			return;
		}

		if(
			Number(ring.snoozeUntil)>0&&
			Number(ring.snoozeUntil)<=Date.now()
		){
			openClock(
				wakeKey(
					"snooze",
					Number(ring.snoozeUntil)
				)
			);
		}
	}

	window.addEventListener(
		"message",
		event=>{
			const data=event.data;

			if(
				!data||
				typeof data!=="object"
			){
				return;
			}

			if(
				data.type==="chxd-clock-state-changed"||
				data.type==="chxd-clock-ready"
			){
				check();
			}
		}
	);

	check();

	service.timer=setInterval(
		check,
		250
	);
})();
