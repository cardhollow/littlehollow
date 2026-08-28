<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<title>Browser</title>
		<style>
			*{box-sizing:border-box;margin:0;padding:0;font-family:monospace}
			html,body{width:100%;height:100%;background:#000d0d;color:#00FFFF;overflow:hidden}
			.wrap{display:flex;flex-direction:column;width:100%;height:100%;min-height:0}
			.tabbar{height:34px;display:flex;align-items:center;gap:3px;padding:3px 4px;border-bottom:1px solid #00FFFF;background:#001010;overflow-x:auto;overflow-y:hidden;white-space:nowrap;scrollbar-width:thin}
			.tabbar::-webkit-scrollbar{height:4px}
			.tabbar::-webkit-scrollbar-thumb{background:#00FFFF}
			.tabbar::-webkit-scrollbar-track{background:#001010}
			.newtab{flex:0 0 27px;height:27px;border:1px solid #00FFFF;background:transparent;color:#00FFFF;cursor:pointer;font:18px monospace;line-height:23px;padding:0}
			.newtab:hover{background:#003030}
			.newtab:active{background:#00FFFF;color:#000}
			.tab{flex:0 0 auto;max-width:230px;min-width:92px;height:27px;display:flex;align-items:center;gap:5px;padding:0 6px;border:1px solid #004444;background:#000d0d;color:#00FFFF;cursor:pointer;overflow:hidden}
			.tab.active{border-color:#00FFFF;background:#003030}
			.tab:hover{background:#002626}
			.tab-favicon{width:13px;height:13px;flex:0 0 13px;display:flex;align-items:center;justify-content:center;font-size:10px}
			.tab-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}
			.tab-close{border:0;background:transparent;color:#00FFFF;font:12px monospace;padding:0 2px;cursor:pointer;flex:0 0 auto}
			.tab-close:hover{background:#00FFFF;color:#000}
			.toolbar{display:flex;align-items:center;gap:5px;padding:6px;border-bottom:1px solid #00FFFF;background:#000d0d}
			.urlbox{flex:1;min-width:100px;height:29px;display:flex;align-items:center;border:1px solid #00FFFF;background:#001010}
			.urlbox input{width:100%;height:100%;border:0;outline:0;background:transparent;color:#00FFFF;padding:0 8px;font:11px monospace}
			.urlbox input::placeholder{color:#00AAAA;opacity:.65}
			.toolbtn{height:29px;min-width:30px;border:1px solid #00FFFF;background:transparent;color:#00FFFF;cursor:pointer;font:14px monospace;padding:0 7px}
			.toolbtn:hover{background:#003030}
			.toolbtn:active{background:#00FFFF;color:#000}
			.star{font-size:18px;line-height:1}
			.content{flex:1;min-height:0;position:relative;background:#090909;overflow:hidden}
			.page{position:absolute;inset:0;display:flex;flex-direction:column;min-height:0;background:#000d0d}
			.page.hidden{display:none}
			.home{height:100%;overflow:auto;padding:24px 16px}
			.home-title{text-align:center;font-weight:bold;font-size:15px;margin:8px 0 5px}
			.home-sub{text-align:center;font-size:9px;opacity:.55;margin-bottom:18px}
			.searchrow{display:flex;gap:5px;max-width:720px;margin:0 auto 20px}
			.searchrow input{flex:1;background:#001010;border:1px solid #00FFFF;color:#00FFFF;padding:9px;font:12px monospace;outline:0}
			.searchrow button{border:1px solid #00FFFF;background:transparent;color:#00FFFF;padding:0 12px;font:11px monospace;cursor:pointer}
			.searchrow button:hover{background:#003030}
			.searchrow button:active{background:#00FFFF;color:#000}
			.bookmarks-title{max-width:720px;margin:0 auto 7px;padding-bottom:5px;border-bottom:1px solid #004444;font-size:11px}
			.bookmarks{max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:5px}
			.bookmark-group{border:1px solid #004444;padding:7px}
			.bookmark-group-title{font-size:9px;margin-bottom:5px;color:#00FFFF}
			.bookmark{display:flex;align-items:center;gap:5px;padding:6px;border:1px solid #003535;background:#001010;cursor:pointer}
			.bookmark:hover{background:#003030}
			.bookmark-main{min-width:0;flex:1}
			.bookmark-name{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
			.bookmark-url{font-size:8px;opacity:.55;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
			.bookmark-del{border:1px solid #00FFFF;background:transparent;color:#00FFFF;font:9px monospace;padding:2px 5px;cursor:pointer}
			.bookmark-del:hover{background:#00FFFF;color:#000}
			.nobookmarks{text-align:center;padding:12px;border:1px dashed #004444;opacity:.5;font-size:10px}
			.site{position:absolute;inset:0;display:none;background:#000}
			.site.active{display:block}
			.site iframe{width:100%;height:100%;border:0;background:#000}
			.error{margin:15px;padding:12px;border:1px solid #ff4040;background:#330000;color:#ff4040;font-size:10px;line-height:1.5}
			.status{height:23px;flex:0 0 23px;border-top:1px solid #00FFFF;padding:4px 8px;font-size:9px;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
			.dialog-back{position:absolute;inset:0;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;z-index:1000}
			.dialog-back.show{display:flex}
			.dialog{width:min(92%,420px);border:1px solid #00FFFF;background:#000d0d;box-shadow:0 0 0 1px #003535;padding:10px}
			.dialog h3{font-size:12px;margin-bottom:9px}
			.dialog label{display:block;font-size:9px;margin:7px 0 3px;opacity:.75}
			.dialog input,.dialog select{width:100%;border:1px solid #00FFFF;background:#001010;color:#00FFFF;padding:6px;font:10px monospace;outline:0}
			.dialog-row{display:flex;gap:5px;justify-content:flex-end;margin-top:10px}
			.dialog button{border:1px solid #00FFFF;background:transparent;color:#00FFFF;padding:6px 9px;font:10px monospace;cursor:pointer}
			.dialog button:hover{background:#003030}
			.dialog button.primary{background:#00FFFF;color:#000}
			.context-menu{position:fixed;display:none;z-index:5000;min-width:220px;max-width:calc(100vw - 12px);background:#000d0d;border:1px solid #00FFFF;box-shadow:0 0 0 1px #003535;color:#00FFFF;padding:3px}
			.context-menu.show{display:block}
			.context-item{min-height:28px;display:flex;align-items:center;padding:6px 9px;font-size:10px;cursor:pointer;white-space:nowrap}
			.context-item:hover{background:#003030}
			.context-separator{height:1px;background:#004444;margin:3px 0}
			.context-item.disabled{opacity:.35;pointer-events:none}
			@media(max-width:520px){
				.tab{max-width:175px}
				.toolbar{padding:5px;gap:4px}
				.toolbtn{min-width:28px;padding:0 5px}
				.home{padding:16px 10px}
			}
		</style>
	</head>
	<body>
		<div class="wrap">
			<div class="tabbar" id="tabbar">
				<button class="newtab" id="newTabBtn" title="New tab">+</button>
			</div>
			<div class="toolbar">
				<button class="toolbtn" id="backBtn" title="Back">←</button>
				<button class="toolbtn" id="forwardBtn" title="Forward">→</button>
				<div class="urlbox">
					<input id="urlInput" type="text" autocomplete="off" spellcheck="false" placeholder="Search or enter URL">
				</div>
				<button class="toolbtn" id="goBtn" title="Search / Open">GO</button>
				<button class="toolbtn star" id="bookmarkBtn" title="Add bookmark">☆</button>
			</div>
			<div class="content" id="content">
				<div class="page" id="homePage">
					<div class="home">
						<div class="home-title">BROWSER</div>
						<div class="home-sub">SEARCH THE WEB OR ENTER A URL</div>
						<div class="searchrow">
							<input id="homeSearch" type="text" placeholder="Search Bing..." autocomplete="off" spellcheck="false">
							<button id="homeSearchBtn">SEARCH</button>
						</div>
						<div class="bookmarks-title">BOOKMARKS</div>
						<div class="bookmarks" id="bookmarks"></div>
					</div>
				</div>
			</div>
			<div class="status" id="status">Ready.</div>
			<div class="dialog-back" id="bookmarkDialog">
				<div class="dialog">
					<h3>ADD BOOKMARK</h3>
					<label for="bmName">NAME</label>
					<input id="bmName" type="text">
					<label for="bmFolder">FOLDER</label>
					<select id="bmFolder"></select>
					<div class="dialog-row">
						<button id="bmCancel">CANCEL</button>
						<button class="primary" id="bmSave">SAVE</button>
					</div>
				</div>
			</div>
			<div class="context-menu" id="contextMenu"></div>
		</div>
		<script>
			(function(){
				"use strict";

				const tabbar=document.getElementById("tabbar");
				const content=document.getElementById("content");
				const urlInput=document.getElementById("urlInput");
				const goBtn=document.getElementById("goBtn");
				const bookmarkBtn=document.getElementById("bookmarkBtn");
				const backBtn=document.getElementById("backBtn");
				const forwardBtn=document.getElementById("forwardBtn");
				const newTabBtn=document.getElementById("newTabBtn");
				const status=document.getElementById("status");
				const homeSearch=document.getElementById("homeSearch");
				const homeSearchBtn=document.getElementById("homeSearchBtn");
				const bookmarksEl=document.getElementById("bookmarks");
				const dialog=document.getElementById("bookmarkDialog");
				const bmName=document.getElementById("bmName");
				const bmFolder=document.getElementById("bmFolder");
				const bmCancel=document.getElementById("bmCancel");
				const bmSave=document.getElementById("bmSave");
				const contextMenu=document.getElementById("contextMenu");

				const LS_BOOKMARKS="littlehollow_browser_bookmarks_v1";
				const LS_FOLDERS="littlehollow_browser_bookmark_folders_v1";
				const LS_TABS="littlehollow_browser_last_tabs_v1";
				const BOOKMARK_FILE="chxd:/local/Browser/Bookmarks/bookmarks.json";
				const FOLDER_FILE="chxd:/local/Browser/Bookmarks/folders.json";

				let folders=loadJSON(LS_FOLDERS,["Bookmarks"]);

				if(!folders.length){
					folders=["Bookmarks"];
				}

				let bookmarks=loadJSON(LS_BOOKMARKS,[]);
				let tabs=[];
				let activeId=null;
				let nextId=1;
				let suppressSave=false;
				let longPressTimer=null;
				let longPressStartX=0;
				let longPressStartY=0;

				function loadJSON(key,fallback){
					try{
						const v=JSON.parse(
							localStorage.getItem(key)||""
						);

						return Array.isArray(v)?v:fallback;
					}catch(e){
						return fallback;
					}
				}

				function saveJSON(key,value){
					try{
						localStorage.setItem(
							key,
							JSON.stringify(value)
						);
					}catch(e){}
				}

				function esc(v){
					return String(v==null?"":v)
						.replace(/&/g,"&amp;")
						.replace(/</g,"&lt;")
						.replace(/>/g,"&gt;")
						.replace(/"/g,"&quot;")
						.replace(/'/g,"&#39;");
				}

				function setStatus(s){
					status.textContent=String(s);
				}

				function faviconFor(url){
					if(!url){
						return"⌂";
					}

					if(/bing\.com/i.test(url)){
						return"B";
					}

					if(/youtube\.com|youtu\.be|yt\.com/i.test(url)){
						return"Y";
					}

					try{
						return new URL(url)
							.hostname
							.replace(/^www\./,"")
							.slice(0,1)
							.toUpperCase()||"W";
					}catch(e){
						return"W";
					}
				}

				async function mirrorBookmarksToFS(){
					const data=JSON.stringify(
						{
							version:1,
							folders,
							bookmarks
						},
						null,
						2
					);

					try{
						if(
							parent&&
							parent.FS&&
							typeof parent.FS.write==="function"
						){
							await parent.FS.write(
								BOOKMARK_FILE,
								data,
								true
							);

							await parent.FS.write(
								FOLDER_FILE,
								JSON.stringify(
									{
										version:1,
										folders
									},
									null,
									2
								),
								true
							);
						}
					}catch(e){}
				}

				function persistBookmarks(){
					saveJSON(
						LS_BOOKMARKS,
						bookmarks
					);

					saveJSON(
						LS_FOLDERS,
						folders
					);

					mirrorBookmarksToFS();
					renderBookmarks();
				}

				function renderBookmarks(){
					bmFolder.innerHTML=folders
						.map(
							f=>
								`<option value="${esc(f)}">${esc(f)}</option>`
						)
						.join("");

					if(!bookmarks.length){
						bookmarksEl.innerHTML=
							'<div class="nobookmarks">No bookmarks yet.<br>Press ☆ on an open page to add one.</div>';

						return;
					}

					const groups=folders
						.map(
							folder=>({
								folder,
								items:bookmarks.filter(
									b=>
										(b.folder||"Bookmarks")===folder
								)
							})
						)
						.filter(
							g=>g.items.length
						);

					bookmarksEl.innerHTML=
						groups.length
							?groups.map(
								g=>`
									<div class="bookmark-group">
										<div class="bookmark-group-title">▸ ${esc(g.folder)}</div>
										${g.items.map(b=>{
											const globalIndex=
												bookmarks.indexOf(b);

											return`
												<div class="bookmark" data-index="${globalIndex}">
													<div class="bookmark-main">
														<div class="bookmark-name">${esc(b.name||b.url)}</div>
														<div class="bookmark-url">${esc(b.url)}</div>
													</div>
													<button class="bookmark-del" data-del="${globalIndex}">×</button>
												</div>
											`;
										}).join("")}
									</div>
								`
							).join("")
							:'<div class="nobookmarks">No bookmark items in the current folders.</div>';

					bookmarksEl.querySelectorAll(
						".bookmark"
					).forEach(el=>{
						el.addEventListener(
							"click",
							e=>{
								if(
									e.target.closest(
										".bookmark-del"
									)
								){
									return;
								}

								const b=bookmarks[
									parseInt(
										el.dataset.index,
										10
									)
								];

								if(b){
									navigate(
										b.url,
										b.name||b.url,
										false
									);
								}
							}
						);
					});

					bookmarksEl.querySelectorAll(
						".bookmark-del"
					).forEach(el=>{
						el.addEventListener(
							"click",
							e=>{
								e.stopPropagation();

								const idx=parseInt(
									el.dataset.del,
									10
								);

								if(
									!Number.isFinite(idx)
								){
									return;
								}

								if(
									confirm(
										"Remove this bookmark?"
									)
								){
									bookmarks.splice(
										idx,
										1
									);

									persistBookmarks();
									setStatus(
										"Bookmark removed."
									);
								}
							}
						);
					});
				}

				function titleFromUrl(url){
					try{
						return new URL(url)
							.hostname
							.replace(/^www\./,"")||
							"WEB";
					}catch(e){
						return"WEB";
					}
				}

				function youtubeEmbedUrl(input){
					try{
						const url=new URL(input);

						const host=url.hostname
							.toLowerCase()
							.replace(/^www\./,"");

						if(
							host==="youtube.com"||
							host==="m.youtube.com"||
							host==="yt.com"
						){
							if(
								url.pathname==="/"||
								url.pathname===""
							){
								return"https://www.youtube.com/embed/";
							}

							if(
								url.pathname==="/watch"
							){
								const id=
									url.searchParams.get(
										"v"
									);

								if(id){
									return"https://www.youtube.com/embed/"+encodeURIComponent(id);
								}

								return"https://www.youtube.com/embed/";
							}

							if(
								url.pathname.startsWith(
									"/shorts/"
								)
							){
								const id=
									url.pathname.split(
										"/"
									)[2];

								if(id){
									return"https://www.youtube.com/embed/"+encodeURIComponent(id);
								}
							}

							if(
								url.pathname.startsWith(
									"/live/"
								)
							){
								const id=
									url.pathname.split(
										"/"
									)[2];

								if(id){
									return"https://www.youtube.com/embed/"+encodeURIComponent(id);
								}
							}

							if(
								url.pathname.startsWith(
									"/embed/"
								)
							){
								return url.href;
							}

							if(
								url.pathname.startsWith(
									"/playlist"
								)
							){
								const list=
									url.searchParams.get(
										"list"
									);

								if(list){
									return"https://www.youtube.com/embed/videoseries?list="+encodeURIComponent(list);
								}

								return"https://www.youtube.com/embed/";
							}

							return url.href;
						}

						if(host==="youtu.be"){
							const id=url.pathname
								.replace(/^\/+/,"")
								.split("/")[0];

							if(id){
								return"https://www.youtube.com/embed/"+encodeURIComponent(id);
							}

							return"https://www.youtube.com/embed/";
						}

						return url.href;
					}catch(e){
						return input;
					}
				}

				function normalizeYouTubeInput(value){
					const raw=String(
						value||""
					).trim();

					if(!raw){
						return raw;
					}

					let candidate=raw;

					if(
						!/^[a-z][a-z0-9+.-]*:\/\//i.test(
							candidate
						)
					){
						if(
							/^(www\.)?(youtube\.com|m\.youtube\.com|youtu\.be|yt\.com)(\/|$)/i.test(
								candidate
							)
						){
							candidate=
								"https://"+candidate;
						}
					}

					return youtubeEmbedUrl(
						candidate
					);
				}

				function createTab(initialHome){
					const id=nextId++;

					const tab={
						id,
						title:"New Tab",
						url:"",
						home:true,
						history:[],
						historyIndex:-1,
						siteEl:null,
						tabEl:null,
						frame:null
					};

					const tabEl=
						document.createElement(
							"div"
						);

					tabEl.className="tab";
					tabEl.dataset.id=id;

					tabEl.innerHTML=
						'<span class="tab-favicon">⌂</span>'+
						'<span class="tab-name">New Tab</span>'+
						'<button class="tab-close" title="Close">×</button>';

					tabEl.addEventListener(
						"click",
						()=>{
							activateTab(id);
						}
					);

					tabEl.querySelector(
						".tab-close"
					).addEventListener(
						"click",
						e=>{
							e.stopPropagation();
							closeTab(id);
						}
					);

					tab.tabEl=tabEl;

					const site=
						document.createElement(
							"div"
						);

					site.className="site";
					site.dataset.id=id;

					tab.siteEl=site;

					content.appendChild(site);
					tabs.push(tab);
					tabbar.appendChild(tabEl);

					if(initialHome!==false){
						activateTab(id);
					}

					return tab;
				}

				function activeTab(){
					return tabs.find(
						t=>t.id===activeId
					)||null;
				}

				function activateTab(id){
					const tab=tabs.find(
						t=>t.id===id
					);

					if(!tab){
						return;
					}

					activeId=id;

					tabs.forEach(t=>{
						t.tabEl.classList.toggle(
							"active",
							t.id===id
						);

						t.siteEl.classList.toggle(
							"active",
							t.id===id&&!t.home
						);
					});

					document.getElementById(
						"homePage"
					).classList.toggle(
						"hidden",
						!tab.home
					);

					urlInput.value=
						tab.url||"";

					if(tab.home){
						homeSearch.value="";
					}

					setStatus(
						tab.url
							?"Loaded: "+tab.url
							:"Ready."
					);

					tab.tabEl.scrollIntoView({
						behavior:"smooth",
						block:"nearest",
						inline:"nearest"
					});

					updateStar();
					saveTabs();
				}

				function setTabTitle(
					tab,
					title,
					url
				){
					tab.title=(
						title||
						titleFromUrl(url)||
						"WEB"
					).slice(0,60);

					tab.tabEl.querySelector(
						".tab-name"
					).textContent=tab.title;

					tab.tabEl.querySelector(
						".tab-favicon"
					).textContent=
						faviconFor(url);
				}

				function normalizeInput(value){
					const raw=String(
						value||""
					).trim();

					if(!raw){
						return{
							kind:"empty",
							value:""
						};
					}

					if(
						/^(https?|ftp):\/\//i.test(
							raw
						)
					){
						return{
							kind:"url",
							value:
								normalizeYouTubeInput(
									raw
								)
						};
					}

					if(/^about:/i.test(raw)){
						return{
							kind:"url",
							value:raw
						};
					}

					if(
						/^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(raw)||
						/^[^\s]+\.[^\s]+(?::\d+)?(?:\/.*)?$/i.test(raw)
					){
						const url=
							"https://"+raw;

						return{
							kind:"url",
							value:
								normalizeYouTubeInput(
									url
								)
						};
					}

					return{
						kind:"search",
						value:raw
					};
				}

				function bingUrl(q){
					return"https://www.bing.com/search?q="+
						encodeURIComponent(q);
				}

				function navigate(
					input,
					forcedTitle,
					openInNewTab
				){
					let tab;

					if(openInNewTab){
						tab=createTab(true);
					}else{
						tab=
							activeTab()||
							createTab(true);
					}

					const parsed=
						normalizeInput(input);

					if(
						parsed.kind==="empty"
					){
						activateTab(tab.id);
						urlInput.focus();
						return;
					}

					const url=
						parsed.kind==="search"
							?bingUrl(parsed.value)
							:parsed.value;

					loadUrl(
						tab,
						url,
						forcedTitle||
							(
								parsed.kind==="search"
									?"Bing — "+parsed.value
									:titleFromUrl(url)
							),
						true
					);

					return tab;
				}

				function loadUrl(
					tab,
					url,
					title,
					addHistory
				){
					if(!tab||!url){
						return;
					}

					if(/^javascript:/i.test(url)){
						return;
					}

					url=normalizeYouTubeInput(
						url
					);

					tab.home=false;
					tab.url=url;

					if(addHistory){
						if(
							tab.historyIndex<
							tab.history.length-1
						){
							tab.history=
								tab.history.slice(
									0,
									tab.historyIndex+1
								);
						}

						if(
							tab.history[
								tab.history.length-1
							]!==url
						){
							tab.history.push(url);

							tab.historyIndex=
								tab.history.length-1;
						}
					}

					createBrowserFrame(
						tab,
						url
					);

					setTabTitle(
						tab,
						title||
							titleFromUrl(url),
						url
					);

					activateTab(tab.id);

					setStatus(
						"Loading: "+url
					);

					saveTabs();
				}

				function createBrowserFrame(
					tab,
					url
				){
					tab.siteEl.innerHTML="";

					const iframe=
						document.createElement(
							"iframe"
						);

					iframe.src=url;

					iframe.setAttribute(
						"allowfullscreen",
						""
					);

					iframe.setAttribute(
						"allow",
						"autoplay; fullscreen; clipboard-read; clipboard-write; gamepad; pointer-lock"
					);

					iframe.setAttribute(
						"sandbox",
						"allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-same-origin allow-scripts"
					);

					iframe.referrerPolicy=
						"no-referrer-when-downgrade";

					iframe.addEventListener(
						"load",
						()=>{
							prepareFrame(
								tab,
								iframe
							);
						}
					);

					iframe.addEventListener(
						"error",
						()=>{
							if(
								activeId===tab.id
							){
								setStatus(
									"Could not load: "+
									url
								);
							}
						}
					);

					tab.siteEl.appendChild(
						iframe
					);

					tab.frame=iframe;

					return iframe;
				}

				function prepareFrame(
					tab,
					iframe
				){
					try{
						const win=
							iframe.contentWindow;

						const doc=
							iframe.contentDocument;

						if(!win||!doc){
							return;
						}

						try{
							let base=
								doc.querySelector(
									"base"
								);

							if(!base){
								base=
									doc.createElement(
										"base"
									);

								if(doc.head){
									doc.head.prepend(
										base
									);
								}
							}

							if(base){
								base.target=
									"_self";
							}
						}catch(e){}

						try{
							win.open=function(
								url,
								target
							){
								if(!url){
									return null;
								}

								const href=
									normalizeYouTubeInput(
										new URL(
											String(url),
											doc.baseURI
										).href
									);

								const mode=
									String(
										target||
										"_blank"
									).toLowerCase();

								if(
									mode==="_self"||
									mode==="_top"||
									mode==="_parent"
								){
									navigateTabUrl(
										tab,
										href,
										titleFromUrl(href),
										true
									);
								}else{
									const newTab=
										createTab(true);

									navigateTabUrl(
										newTab,
										href,
										titleFromUrl(href),
										true
									);
								}

								return null;
							};
						}catch(e){}

						doc.addEventListener(
							"click",
							e=>{
								const link=
									e.target.closest
										?e.target.closest("a")
										:null;

								if(!link){
									return;
								}

								const raw=
									link.getAttribute(
										"href"
									);

								if(
									!raw||
									raw==="#"||
									raw.startsWith("#")||
									/^javascript:/i.test(raw)
								){
									return;
								}

								const href=
									normalizeYouTubeInput(
										new URL(
											raw,
											doc.baseURI
										).href
									);

								const target=(
									link.getAttribute(
										"target"
									)||"_self"
								).toLowerCase();

								e.preventDefault();
								e.stopPropagation();

								if(
									target==="_blank"||
									target==="_new"||
									target==="blank"
								){
									const newTab=
										createTab(true);

									navigateTabUrl(
										newTab,
										href,
										link.textContent.trim()||
											titleFromUrl(href),
										true
									);

									return;
								}

								navigateTabUrl(
									tab,
									href,
									link.textContent.trim()||
										titleFromUrl(href),
									true
								);
							},
							true
						);

						doc.addEventListener(
							"auxclick",
							e=>{
								if(e.button!==1){
									return;
								}

								const link=
									e.target.closest
										?e.target.closest("a")
										:null;

								if(!link){
									return;
								}

								const raw=
									link.getAttribute(
										"href"
									);

								if(
									!raw||
									raw==="#"||
									raw.startsWith("#")||
									/^javascript:/i.test(raw)
								){
									return;
								}

								e.preventDefault();
								e.stopPropagation();

								const href=
									normalizeYouTubeInput(
										new URL(
											raw,
											doc.baseURI
										).href
									);

								const newTab=
									createTab(true);

								navigateTabUrl(
									newTab,
									href,
									link.textContent.trim()||
										titleFromUrl(href),
									true
								);
							},
							true
						);

						doc.addEventListener(
							"submit",
							e=>{
								const form=e.target;

								if(
									!form||
									form.tagName!=="FORM"
								){
									return;
								}

								const target=(
									form.getAttribute(
										"target"
									)||"_self"
								).toLowerCase();

								if(
									target!=="_blank"&&
									target!=="_new"&&
									target!=="blank"
								){
									return;
								}

								e.preventDefault();
								e.stopPropagation();

								const action=
									form.getAttribute(
										"action"
									)||doc.location.href;

								const method=(
									form.getAttribute(
										"method"
									)||"get"
								).toLowerCase();

								if(method==="get"){
									const params=
										new URLSearchParams(
											new FormData(form)
										);

									const href=new URL(
										action,
										doc.baseURI
									);

									const extra=
										params.toString();

									if(extra){
										href.search=
											href.search
												?href.search+
													"&"+extra
												:extra;
									}

									const newTab=
										createTab(true);

									navigateTabUrl(
										newTab,
										href.href,
										form.getAttribute(
											"name"
										)||titleFromUrl(
											href.href
										),
										true
									);
								}
							},
							true
						);

						doc.addEventListener(
							"contextmenu",
							e=>{
								e.preventDefault();
								e.stopPropagation();

								const link=
									e.target.closest
										?e.target.closest("a")
										:null;

								const image=
									e.target.closest
										?e.target.closest("img")
										:null;

								if(image){
									const imageUrl=
										new URL(
											image.currentSrc||
												image.src,
											doc.baseURI
										).href;

									showContextMenu(
										e.clientX,
										e.clientY,
										{
											type:"image",
											url:imageUrl,
											link:link
												?new URL(
													link.href,
													doc.baseURI
												).href
												:null
										},
										tab
									);

									return;
								}

								if(link){
									showContextMenu(
										e.clientX,
										e.clientY,
										{
											type:"link",
											url:new URL(
												link.href,
												doc.baseURI
											).href,
											text:
												link.textContent.trim()||
												link.href
										},
										tab
									);

									return;
								}

								showContextMenu(
									e.clientX,
									e.clientY,
									{
										type:"page",
										url:
											tab.url||
											iframe.src
									},
									tab
								);
							},
							true
						);
					}catch(e){}
				}

				function navigateTabUrl(
					tab,
					url,
					title,
					addHistory
				){
					if(!tab||!url){
						return;
					}

					if(/^javascript:/i.test(url)){
						return;
					}

					url=normalizeYouTubeInput(url);

					loadUrl(
						tab,
						url,
						title||titleFromUrl(url),
						addHistory!==false
					);
				}

				function closeTab(id){
					const idx=tabs.findIndex(
						t=>t.id===id
					);

					if(idx<0){
						return false;
					}

					const wasActive=
						activeId===id;

					const tab=tabs[idx];

					try{
						if(tab.frame){
							tab.frame.src=
								"about:blank";
						}
					}catch(e){}

					tab.tabEl.remove();
					tab.siteEl.remove();
					tabs.splice(idx,1);

					if(!tabs.length){
						createTab(true);
					}else if(wasActive){
						const next=
							tabs[
								Math.min(
									idx,
									tabs.length-1
								)
							];

						activateTab(
							next.id
						);
					}

					saveTabs();

					return true;
				}

				function closeTabByIndex(index){
					const idx=
						Number(index);

					if(
						!Number.isInteger(idx)||
						idx<0||
						idx>=tabs.length
					){
						return false;
					}

					return closeTab(
						tabs[idx].id
					);
				}

				function newTab(){
					const tab=createTab(true);

					activateTab(tab.id);
					urlInput.focus();

					return getTabInfo(tab);
				}

				function openUrlInNewTab(url,title){
					const normalized=
						normalizeYouTubeInput(
							String(url||"").trim()
						);

					if(!normalized){
						return null;
					}

					const tab=createTab(true);

					navigateTabUrl(
						tab,
						normalized,
						title||titleFromUrl(normalized),
						true
					);

					return getTabInfo(tab);
				}

				function getTabInfo(tab,index){
					return{
						index:
							typeof index==="number"
								?index
								:tabs.indexOf(tab),
						id:tab.id,
						title:tab.title,
						url:tab.url,
						home:tab.home,
						active:tab.id===activeId
					};
				}

				function getTabs(){
					return tabs.map(
						(tab,index)=>
							getTabInfo(
								tab,
								index
							)
					);
				}

				function getCurrentTab(){
					const tab=activeTab();

					return tab
						?getTabInfo(
							tab,
							tabs.indexOf(tab)
						)
						:null;
				}

				function reloadCurrent(){
					const tab=activeTab();

					if(!tab||tab.home||!tab.url){
						return;
					}

					loadUrl(
						tab,
						tab.url,
						tab.title,
						false
					);
				}

				function back(){
					const tab=activeTab();

					if(
						!tab||
						tab.historyIndex<=0
					){
						setStatus(
							"No previous page."
						);

						return;
					}

					tab.historyIndex--;

					const url=
						tab.history[
							tab.historyIndex
						];

					tab.home=false;
					tab.url=url;

					createBrowserFrame(
						tab,
						url
					);

					setTabTitle(
						tab,
						titleFromUrl(url),
						url
					);

					activateTab(tab.id);
					setStatus(
						"Back: "+url
					);

					updateStar();
				}

				function forward(){
					const tab=activeTab();

					if(
						!tab||
						tab.historyIndex>=
							tab.history.length-1
					){
						setStatus(
							"No next page."
						);

						return;
					}

					tab.historyIndex++;

					const url=
						tab.history[
							tab.historyIndex
						];

					tab.home=false;
					tab.url=url;

					createBrowserFrame(
						tab,
						url
					);

					setTabTitle(
						tab,
						titleFromUrl(url),
						url
					);

					activateTab(tab.id);

					setStatus(
						"Forward: "+url
					);

					updateStar();
				}

				function currentBookmark(){
					const tab=activeTab();

					if(
						!tab||
						tab.home||
						!tab.url
					){
						return null;
					}

					return bookmarks.find(
						b=>b.url===tab.url
					)||null;
				}

				function updateStar(){
					bookmarkBtn.textContent=
						currentBookmark()
							?"★"
							:"☆";
				}

				function openBookmarkDialog(){
					const tab=activeTab();

					if(
						!tab||
						tab.home||
						!tab.url
					){
						setStatus(
							"Open a page before adding a bookmark."
						);

						return;
					}

					const existing=
						currentBookmark();

					bmName.value=
						existing
							?existing.name
							:(tab.title||
								titleFromUrl(
									tab.url
								));

					bmFolder.value=
						existing&&
						folders.includes(
							existing.folder
						)
							?existing.folder
							:folders[0];

					dialog.classList.add(
						"show"
					);

					bmName.focus();
					bmName.select();
				}

				function saveBookmark(){
					const tab=activeTab();

					if(
						!tab||
						tab.home||
						!tab.url
					){
						return;
					}

					const name=
						bmName.value.trim()||
						tab.title||
						titleFromUrl(
							tab.url
						);

					const folder=
						bmFolder.value||
						"Bookmarks";

					const existingIndex=
						bookmarks.findIndex(
							b=>b.url===tab.url
						);

					const item={
						name,
						url:tab.url,
						folder,
						createdAt:Date.now()
					};

					if(existingIndex>=0){
						bookmarks[
							existingIndex
						]={
							...bookmarks[
								existingIndex
							],
							...item
						};
					}else{
						bookmarks.unshift(
							item
						);
					}

					persistBookmarks();

					dialog.classList.remove(
						"show"
					);

					updateStar();

					setStatus(
						"Bookmark saved to "+
						folder+"."
					);
				}

				function saveTabs(){
					if(suppressSave){
						return;
					}

					try{
						const data=tabs.map(
							t=>({
								title:t.title,
								url:t.url,
								home:t.home,
								history:t.history,
								historyIndex:
									t.historyIndex
							})
						);

						localStorage.setItem(
							LS_TABS,
							JSON.stringify(data)
						);
					}catch(e){}
				}

				function restoreTabs(){
					let saved=[];

					try{
						saved=JSON.parse(
							localStorage.getItem(
								LS_TABS
							)||"[]"
						);
					}catch(e){
						saved=[];
					}

					if(
						!Array.isArray(saved)||
						!saved.length
					){
						createTab(true);
						return;
					}

					suppressSave=true;

					saved.slice(0,12).forEach(
						(s,i)=>{
							const tab=
								createTab(false);

							tab.title=
								s.title||
								"New Tab";

							tab.url=
								normalizeYouTubeInput(
									s.url||""
								);

							tab.home=
								s.home!==false;

							tab.history=
								Array.isArray(
									s.history
								)
									?s.history.map(
										normalizeYouTubeInput
									)
									:[];

							tab.historyIndex=
								Number.isFinite(
									s.historyIndex
								)
									?s.historyIndex
									:(tab.history.length-1);

							if(
								!tab.home&&
								tab.url
							){
								createBrowserFrame(
									tab,
									tab.url
								);

								setTabTitle(
									tab,
									tab.title,
									tab.url
								);
							}else{
								setTabTitle(
									tab,
									"New Tab",
									""
								);
							}

							if(i===0){
								activeId=tab.id;
							}
						}
					);

					suppressSave=false;

					const first=tabs[0];

					if(first){
						activateTab(
							first.id
						);
					}
				}

				function addContextSeparator(){
					const separator=
						document.createElement(
							"div"
						);

					separator.className=
						"context-separator";

					contextMenu.appendChild(
						separator
					);
				}

				function addContextItem(
					label,
					handler
				){
					const item=
						document.createElement(
							"div"
						);

					item.className=
						"context-item";

					item.textContent=label;

					item.addEventListener(
						"click",
						e=>{
							e.stopPropagation();
							hideContextMenu();
							handler();
						}
					);

					contextMenu.appendChild(
						item
					);
				}

				function showContextMenu(
					x,
					y,
					target,
					tab
				){
					contextMenu.innerHTML="";

					if(
						target.type==="link"
					){
						addContextItem(
							"Open Link in New Tab",
							()=>{
								const newTab=
									createTab(true);

								navigateTabUrl(
									newTab,
									target.url,
									target.text||
										titleFromUrl(
											target.url
										),
									true
								);
							}
						);

						addContextItem(
							"Open Link in Current Tab",
							()=>{
								navigateTabUrl(
									tab,
									target.url,
									target.text||
										titleFromUrl(
											target.url
										),
									true
								);
							}
						);

						addContextSeparator();

						addContextItem(
							"Copy URL Address",
							()=>{
								copyText(
									target.url
								);
							}
						);

						addContextItem(
							"Copy Link",
							()=>{
								copyText(
									target.url
								);
							}
						);

						addContextSeparator();

						addContextItem(
							"Open Link in Background Tab",
							()=>{
								const newTab=
									createTab(false);

								navigateTabUrl(
									newTab,
									target.url,
									target.text||
										titleFromUrl(
											target.url
										),
									true
								);

								setStatus(
									"Opened in background tab."
								);
							}
						);
					}else if(
						target.type==="image"
					){
						addContextItem(
							"Open Image in New Tab",
							()=>{
								const newTab=
									createTab(true);

								navigateTabUrl(
									newTab,
									target.url,
									"Image",
									true
								);
							}
						);

						addContextItem(
							"Open Image in Current Tab",
							()=>{
								navigateTabUrl(
									tab,
									target.url,
									"Image",
									true
								);
							}
						);

						addContextSeparator();

						addContextItem(
							"Download Image",
							()=>{
								downloadImage(
									target.url
								);
							}
						);

						addContextItem(
							"Copy Image",
							()=>{
								copyImage(
									target.url
								);
							}
						);

						addContextItem(
							"Copy Image Address",
							()=>{
								copyText(
									target.url
								);
							}
						);

						if(target.link){
							addContextSeparator();

							addContextItem(
								"Open Image Link in New Tab",
								()=>{
									const newTab=
										createTab(true);

									navigateTabUrl(
										newTab,
										target.link,
										"Image Link",
										true
									);
								}
							);

							addContextItem(
								"Open Image Link in Current Tab",
								()=>{
									navigateTabUrl(
										tab,
										target.link,
										"Image Link",
										true
									);
								}
							);

							addContextItem(
								"Copy Image Link",
								()=>{
									copyText(
										target.link
									);
								}
							);
						}
					}else{
						addContextItem(
							"Reload",
							reloadCurrent
						);

						addContextSeparator();

						addContextItem(
							"Back",
							back
						);

						addContextItem(
							"Forward",
							forward
						);

						addContextSeparator();

						addContextItem(
							"Copy Page URL",
							()=>{
								copyText(
									tab.url||""
								);
							}
						);
					}

					contextMenu.classList.add(
						"show"
					);

					const rect=
						contextMenu.getBoundingClientRect();

					let left=x;
					let top=y;

					if(
						left+rect.width>
						window.innerWidth-6
					){
						left=
							window.innerWidth-
							rect.width-6;
					}

					if(
						top+rect.height>
						window.innerHeight-6
					){
						top=
							window.innerHeight-
							rect.height-6;
					}

					contextMenu.style.left=
						Math.max(4,left)+"px";

					contextMenu.style.top=
						Math.max(4,top)+"px";
				}

				function hideContextMenu(){
					contextMenu.classList.remove(
						"show"
					);
				}

				async function copyText(text){
					try{
						if(
							navigator.clipboard&&
							navigator.clipboard.writeText
						){
							await navigator.clipboard.writeText(
								String(text)
							);

							setStatus(
								"Copied."
							);

							return;
						}
					}catch(e){}

					try{
						const textarea=
							document.createElement(
								"textarea"
							);

						textarea.value=
							String(text);

						textarea.style.position=
							"fixed";

						textarea.style.left=
							"-9999px";

						document.body.appendChild(
							textarea
						);

						textarea.focus();
						textarea.select();

						document.execCommand(
							"copy"
						);

						textarea.remove();

						setStatus(
							"Copied."
						);
					}catch(e){
						setStatus(
							"Could not copy."
						);
					}
				}

				async function copyImage(url){
					try{
						const response=
							await fetch(
								url,
								{mode:"cors"}
							);

						const blob=
							await response.blob();

						if(
							navigator.clipboard&&
							window.ClipboardItem
						){
							await navigator.clipboard.write([
								new ClipboardItem({
									[blob.type||
										"image/png"]:blob
								})
							]);

							setStatus(
								"Image copied."
							);

							return;
						}
					}catch(e){}

					copyText(url);

					setStatus(
						"Image address copied."
					);
				}

				function downloadImage(url){
					try{
						const a=
							document.createElement(
								"a"
							);

						a.href=url;
						a.download="";
						a.target="_self";

						document.body.appendChild(
							a
						);

						a.click();
						a.remove();

						setStatus(
							"Download requested."
						);
					}catch(e){
						const newTab=
							createTab(true);

						navigateTabUrl(
							newTab,
							url,
							"Image",
							true
						);
					}
				}

				window.BrowserAPI={
					openUrl:function(
						url,
						title
					){
						return openUrlInNewTab(
							url,
							title
						);
					},

					newTab:function(){
						return newTab();
					},

					getTabs:function(){
						return getTabs();
					},

					getCurrentTab:function(){
						return getCurrentTab();
					},

					closeTab:function(index){
						return closeTabByIndex(
							index
						);
					},

					closeTabById:function(id){
						return closeTab(
							Number(id)
						);
					},

					back:function(){
						back();

						return getCurrentTab();
					},

					forward:function(){
						forward();

						return getCurrentTab();
					},

					reload:function(){
						reloadCurrent();

						return getCurrentTab();
					}
				};

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
							data.action===
							"openUrl"
						){
							const result=
								window.BrowserAPI.openUrl(
									data.url,
									data.title
								);

							event.source?.postMessage(
								{
									type:
										"BrowserAPIResult",
									action:
										"openUrl",
									result
								},
								"*"
							);

							return;
						}

						if(
							data.action===
							"newTab"
						){
							const result=
								window.BrowserAPI.newTab();

							event.source?.postMessage(
								{
									type:
										"BrowserAPIResult",
									action:
										"newTab",
									result
								},
								"*"
							);

							return;
						}

						if(
							data.action===
							"getTabs"
						){
							event.source?.postMessage(
								{
									type:
										"BrowserAPIResult",
									action:
										"getTabs",
									result:
										window.BrowserAPI.getTabs()
								},
								"*"
							);

							return;
						}

						if(
							data.action===
							"closeTab"
						){
							const result=
								window.BrowserAPI.closeTab(
									data.index
								);

							event.source?.postMessage(
								{
									type:
										"BrowserAPIResult",
									action:
										"closeTab",
									result
								},
								"*"
							);
						}
					}
				);

				document.addEventListener(
					"click",
					e=>{
						if(
							!contextMenu.contains(
								e.target
							)
						){
							hideContextMenu();
						}
					}
				);

				document.addEventListener(
					"keydown",
					e=>{
						if(e.key==="Escape"){
							hideContextMenu();
						}
					}
				);

				document.addEventListener(
					"scroll",
					hideContextMenu,
					true
				);

				window.addEventListener(
					"resize",
					hideContextMenu
				);

				newTabBtn.addEventListener(
					"click",
					newTab
				);

				goBtn.addEventListener(
					"click",
					()=>{
						navigate(
							urlInput.value,
							false
						);
					}
				);

				backBtn.addEventListener(
					"click",
					back
				);

				forwardBtn.addEventListener(
					"click",
					forward
				);

				bookmarkBtn.addEventListener(
					"click",
					()=>{
						const existing=
							currentBookmark();

						if(existing){
							const idx=
								bookmarks.indexOf(
									existing
								);

							if(idx>=0){
								bookmarks.splice(
									idx,
									1
								);

								persistBookmarks();
								updateStar();

								setStatus(
									"Bookmark removed."
								);
							}
						}else{
							openBookmarkDialog();
						}
					}
				);

				urlInput.addEventListener(
					"keydown",
					e=>{
						if(e.key==="Enter"){
							e.preventDefault();

							navigate(
								urlInput.value,
								false
							);
						}
					}
				);

				homeSearchBtn.addEventListener(
					"click",
					()=>{
						const q=
							homeSearch.value.trim();

						if(!q){
							homeSearch.focus();
							return;
						}

						navigate(
							q,
							false
						);
					}
				);

				homeSearch.addEventListener(
					"keydown",
					e=>{
						if(e.key==="Enter"){
							e.preventDefault();

							const q=
								homeSearch.value.trim();

							if(!q){
								homeSearch.focus();
								return;
							}

							navigate(
								q,
								false
							);
						}
					}
				);

				bmCancel.addEventListener(
					"click",
					()=>{
						dialog.classList.remove(
							"show"
						);
					}
				);

				bmSave.addEventListener(
					"click",
					saveBookmark
				);

				dialog.addEventListener(
					"click",
					e=>{
						if(e.target===dialog){
							dialog.classList.remove(
								"show"
							);
						}
					}
				);

				content.addEventListener(
					"contextmenu",
					e=>{
						if(
							e.target.closest(
								".home"
							)
						){
							return;
						}

						e.preventDefault();
					}
				);

				content.addEventListener(
					"touchstart",
					e=>{
						if(e.touches.length!==1){
							return;
						}

						clearTimeout(
							longPressTimer
						);

						longPressStartX=
							e.touches[0].clientX;

						longPressStartY=
							e.touches[0].clientY;

						longPressTimer=
							setTimeout(
								()=>{
									const tab=
										activeTab();

									if(
										!tab||
										!tab.frame
									){
										return;
									}

									showContextMenu(
										longPressStartX,
										longPressStartY,
										{
											type:"page",
											url:
												tab.url||""
										},
										tab
									);
								},
								650
							);
					},
					{passive:true}
				);

				content.addEventListener(
					"touchmove",
					()=>{
						clearTimeout(
							longPressTimer
						);
					},
					{passive:true}
				);

				content.addEventListener(
					"touchend",
					()=>{
						clearTimeout(
							longPressTimer
						);
					},
					{passive:true}
				);

				content.addEventListener(
					"touchcancel",
					()=>{
						clearTimeout(
							longPressTimer
						);
					},
					{passive:true}
				);

				window.addEventListener(
					"beforeunload",
					()=>{
						saveTabs();
					}
				);

				const params=
					new URLSearchParams(
						location.search
					);

				const initialUrl=
					params.get("url");

				const initialQ=
					params.get("q");

				renderBookmarks();
				restoreTabs();

				if(initialUrl){
					setTimeout(
						()=>{
							navigate(
								initialUrl,
								false
							);
						},
						50
					);
				}else if(initialQ){
					setTimeout(
						()=>{
							homeSearch.value=
								initialQ;

							navigate(
								initialQ,
								false
							);
						},
						50
					);
				}else{
					urlInput.focus();
				}

				mirrorBookmarksToFS();
			})();
		</script>
	</body>
</html>
