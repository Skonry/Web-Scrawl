const $colorPicker = document.querySelector("#color_picker");
const $canvasSwitch = document.querySelector("#canvas_switch");
const $clearCanvasBtn = document.querySelector("#clear_canvas");
const $lineWidthInput = document.querySelector("#line_width");
const $brushMode = document.querySelector("#brush_mode");
const $rectMode = document.querySelector("#rect_mode");
const $eraserMode = document.querySelector("#eraser_mode");
const $undo = document.querySelector('#undo');
const $redo = document.querySelector('#redo');
const $saveCanvas = document.querySelector('#save_canvas');
const $removeCanvas = document.querySelector('#remove_canvas');

$colorPicker.addEventListener("input", changeColorHandler);
$lineWidthInput.addEventListener("input", changeLineWidthHandler);
$canvasSwitch.addEventListener("click", switchCanvasHandler);
$clearCanvasBtn.addEventListener("click", clearCanvasHandler);
$brushMode.addEventListener("change", selectBrushModeHandler);
$rectMode.addEventListener("change", selectRectModeHandler);
$eraserMode.addEventListener("change", selectEraserModeHandler);
$undo.addEventListener('click', undoHandler);
$redo.addEventListener('click', redoHandler);
$saveCanvas.addEventListener('click', saveCanvasHandler);
$removeCanvas.addEventListener('click', removeCanvasHandler);
chrome.runtime.onMessage.addListener(gotMessage);

sendMessage('background_script', {popup: 'isOpen'});

function gotMessage(msg) {
  console.log(msg);
  if (msg.lineWidth) {
    $lineWidthInput.value = msg.lineWidth;
  }
  else if (msg.drawColor) {
    $colorPicker.value = msg.drawColor;
  }
  else if (msg.drawMode) {
    if (msg.drawMode === 'brush') {
      $brushMode.checked = true;
    }
    else if (msg.drawMode === 'rect') {
      $rectMode.checked = true;
    }
    else if (msg.drawMode === 'eraser') {
      $eraserMode.checked = true;
    }
  }
}

function redoHandler(ev) {
  sendMessage('content_script', {redo: true});
}

function undoHandler(ev) {
  sendMessage('content_script', {undo: true});
}

function changeColorHandler(ev) {
  const color = ev.target.value;
  sendMessage('content_script', {drawColor: color});
  sendMessage('background_script', {storageKey: 'drawColor' , storageValue: color})
}

function switchCanvasHandler() {
  sendMessage('content_script', {canvasAction: 'switch'});
}

function clearCanvasHandler() {
  sendMessage('content_script', {canvasAction: 'clear'});
}

function changeLineWidthHandler(ev) {
  const lineWidth = ev.target.value;
  sendMessage('content_script', {lineWidth: lineWidth});
  sendMessage('background_script', {storageKey: 'lineWidth', storageValue: lineWidth});
}

function selectBrushModeHandler() {
  sendMessage('content_script', {drawMode: 'brush'});
  sendMessage('background_script', {storageKey: 'drawMode', storageValue: 'brush'});
}

function selectRectModeHandler() {
  sendMessage('content_script', {drawMode: 'rect'});
  sendMessage('background_script', {storageKey: 'drawMode', storageValue: 'rect'});
}

function selectEraserModeHandler() {
  sendMessage('content_script', {drawMode: 'eraser'});
  sendMessage('background_script', {storageKey: 'drawMode', storageValue: 'eraser'});
}

function saveCanvasHandler() {
    sendMessage('background_script', {saveCanvas: 'saveCanvas'});
}

function removeCanvasHandler() {
  sendMessage('background_script', {removeCanvas: 'removeCanvas'});
}

function sendMessage(receiver, payload) {
  const message = payload;
  message.from = 'popup_script';
  message.to = receiver;
  if (receiver === 'content_script') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, message);
    });
  } else {
    chrome.runtime.sendMessage(message);
  }
}
