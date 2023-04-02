if (typeof browser !== "undefined") {
    chrome.action = browser.browserAction
}
let settings;
// Listen for a click on the browser action
chrome.action.onClicked.addListener(function(tab) {
    chrome.storage.local.get({settings: {home_is_prompts: true}}, function(result) {
        settings = result.settings
        let url;
        if (settings.hasOwnProperty('home_is_prompts')) {
            if (settings.home_is_prompts === true) {
                url = "pages/prompts.html"
            }
            else{
                url = "pages/explorer.html"
            }
        }
        else{
            url = "pages/prompts.html"
        }
        chrome.tabs.create({url: url});
    });
});


chrome.runtime.onMessage.addListener( async function(message) {
    if (message.type === 'b_continue_convo') {
        console.log('background received')
        chrome.tabs.create({url: 'https://chat.openai.com/chat', active: true}, function (my_tab){
            let sent = false;
            chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
                if (tab.id === my_tab.id && changeInfo.status === 'complete' && !sent) {
                    setTimeout(() => chrome.tabs.sendMessage(my_tab.id, {
                        type: 'c_continue_convo',
                        id: message.id,
                        convo: message.convo
                    }), 500)
                    sent = true;
                }
            });
        });
    }
    else if (message.type === "openPrompts"){
        let url = chrome.runtime.getURL('pages/prompts.html')
        chrome.tabs.create({url: url})
    }
	else if(message.type ==='b_use_prompt') {
		console.log('background received')
        chrome.tabs.create({url: 'https://chat.openai.com/chat', active: true}, function (my_tab){
            let sent = false;
            chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
                if (tab.id === my_tab.id && changeInfo.status === 'complete' && !sent) {
                    setTimeout(() => chrome.tabs.sendMessage(my_tab.id, {
                        type: 'c_use_prompt',
                        id: message.id,
                        prompt: message.prompt
                    }), 500)
                    sent = true;
                }
            });
        });
	}
    else if (message.type === "ad"){
        console.log("HEY!")
        const host = `https://raw.githubusercontent.com/benf2004/ChatGPT-History/master/public`;
        const rando = generateUUID() // to not get cached version because headers were causing problems.
        const response = await fetch(`${host}/ads/current.txt?dummy=${rando}`);
        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }
        const text = await response.text();
        console.log({ad:text});
        chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
            const [tab] = tabs;
            chrome.tabs.sendMessage(tab.id, {ad: text, type: "adresponse"});
        });
    }
});
async function setUninstallURL(){
    const host = `https://raw.githubusercontent.com/benf2004/ChatGPT-History/master/public`;
    const rando = generateUUID() // to not get cached version because headers were causing problems.
    const response = await fetch(`${host}/ads/currentUrl.txt?dummy=${rando}`);
    if (!response.ok) {
        throw new Error("HTTP error " + response.status);
    }
    const url = await response.text();
    chrome.runtime.setUninstallURL(url)
}
setUninstallURL()

function getDate() { // generated by ChatGPT
    var date = new Date();
    var options = {year: 'numeric', month: 'long', day: 'numeric'};
    return date.toLocaleString('default', options);
}

function getTime() { // generated by ChatGPT
    var currentDate = new Date();
    var options = {
        hour12: true,
        hour: "numeric",
        minute: "numeric"
    };
    var timeString = currentDate.toLocaleTimeString("default", options);
    return timeString
}

function generateUUID() { // generated by ChatGPT
    // create an array of possible characters for the UUID
    var possibleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    // create an empty string that will be used to generate the UUID
    var uuid = "";

    // loop over the possible characters and append a random character to the UUID string
    for (var i = 0; i < 36; i++) {
        uuid += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
    }

    // return the generated UUID
    return uuid;
}

function new_prompt(title, text, tags="", category="") {
    let prompt = {
        date: getDate(),
        time: getTime(),
        id: generateUUID(),
        title: title,
        text: text,
        tags: tags,
        category: category
    };
    return prompt;
}
chrome.runtime.onInstalled.addListener(async () => {
    chrome.contextMenus.create({
        id: "savePrompt",
        title: "Save text as prompt",
        contexts: ["selection"],
    });

});


chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === "savePrompt") {
        chrome.storage.local.get({prompts: []}, function(result) {
            let prompts = result.prompts
            prompts.push(new_prompt("", info.selectionText))
            chrome.storage.local.set({prompts: prompts})
            chrome.tabs.create({url: "pages/prompts.html"});
            setTimeout(() => chrome.runtime.sendMessage({message: "New Prompt"}), 300)
        });
    }
});

chrome.storage.local.get({autoDetectedLocale: false}, function (result){
    if (!result.autoDetectedLocale){
        let acceptedLanguages = ["en", "zh_CN"]
        chrome.i18n.getAcceptLanguages(function (languages){
            console.log(languages)
            for (let lang of languages){
                lang = lang.replace("-", "_")
                if (acceptedLanguages.includes(lang)){
                    chrome.storage.local.set({lang: lang})
                    chrome.storage.local.set({autoDetectedLocale: true})
                    break;
                }
                else if (acceptedLanguages.includes(lang.split("_")[0])){
                    chrome.storage.local.set({lang: lang.split("_")[0]})
                    chrome.storage.local.set({autoDetectedLocale: true})
                    break;
                }
            }
        })
    }
})