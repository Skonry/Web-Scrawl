chrome.runtime.onMessage.addListener(gotMessage);

function gotMessage(msg, sender, sendResponse) {
  console.log(msg);
  if (msg.popup === 'isOpen') {
    loadStateFromStorage();
  }
  else if (msg.storageKey && msg.storageValue) {
    saveInStorage(msg.storageKey, msg.storageValue);
  }
  else if (msg.saveCanvas) {
    saveCanvas();
  }
  else if (msg.removeCanvas) {
    removeCanvas();
  }
  else if (msg.isCurrentPageCanvasSave) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const url = tabs[0].url;
      chrome.storage.local.get(url, (obj) => {
        if (obj[url]) {
          sendResponse(obj[url]);
        }
      });
    });

    // indicate asynchronously response
    return true;
  }
}

function loadStateFromStorage() {
  chrome.storage.local.get('lineWidth', (obj) => {
    const lineWidth = obj.lineWidth || 1;
    sendMessage('content_script', {lineWidth: lineWidth});
    sendMessage('popup_script', {lineWidth: lineWidth});
  });
  chrome.storage.local.get('drawMode', (obj) => {
    const drawMode = obj.drawMode || 'brush';
    sendMessage('content_script', {drawMode: drawMode});
    sendMessage('popup_script', {drawMode: drawMode});
  });
  chrome.storage.local.get('drawColor', (obj) => {
    const color = obj.drawColor  || '#000000';
    sendMessage('content_script', {drawColor: color});
    sendMessage('popup_script', {drawColor: color});
  });
}

function saveInStorage(key, value) {
  chrome.storage.local.set({[key]: value});
}

function saveCanvas() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const url = tabs[0].url;
    sendMessage('content_script', {getActionsHistory: true}, function (jsonString) {
      saveInStorage(url, jsonString);
    });
  });
}

function removeCanvas() {
  chrome.tabs.query({active: true, currentWindow:true}, (tabs) => {
    const url = tabs[0].url;
    chrome.storage.local.remove(url);
  });
}

function sendMessage(receiver, payload, responseCallback) {
  const message = payload;
  message.from = 'background_script';
  message.to = receiver;
  if (receiver === 'content_script') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, message, responseCallback);
    });
  } else {
    chrome.runtime.sendMessage(message, responseCallback);
  }
}
