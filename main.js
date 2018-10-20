document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);
chrome.runtime.onMessage.addListener(gotMessage);

const currentState = {
  canvasIsOpen: false,
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  //color: "#000000",
  drawMode: 'brush',
  currentAction: null,
  actionsHistory: [],
  undidActions: []
};

const canvas = initCanvas();
const ctx = initContext(canvas);
let temporaryCanvas;
let temporaryCtx;

sendMessage('background_script', {isCurrentPageCanvasSave: true}, function (actionsHistoryString) {
  if (actionsHistoryString) {
    currentState.actionsHistory = JSON.parse(actionsHistoryString)
    redrawCanvas();
  }
});

function gotMessage(msg, sender, sendResponse) {
  console.log(msg);
  if (msg.lineWidth) {
    ctx.lineWidth = msg.lineWidth;
  }
  else if (msg.drawMode) {
    currentState.drawMode = msg.drawMode;
  }
  else if (msg.drawColor) {
    ctx.strokeStyle = msg.drawColor;
  }
  else if (msg.canvasAction) {
    if (msg.canvasAction === 'switch') {
      if (currentState.canvasIsOpen) {
        canvas.style.display = 'none';
        currentState.canvasIsOpen = false;
      }
      else {
        canvas.style.display = 'block';
        currentState.canvasIsOpen = true;
      }
    }
    else if (msg.canvasAction === 'clear') {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }
  else if (msg.undo) {
    if (currentState.actionsHistory.length === 0) return;
    currentState.undidActions.push(currentState.actionsHistory.pop());
    redrawCanvas();
  }
  else if (msg.redo) {
    redoAction();
  }
  else if (msg.getActionsHistory) {
    sendResponse(JSON.stringify(currentState.actionsHistory));
  }
}

function onMouseDown({pageX: x, pageY: y}) {
  if (!currentState.canvasIsOpen) return;
  currentState.currentAction = {tool: currentState.drawMode, steps: [{phase: 'startDrawing', x, y}]};
  switch (currentState.drawMode) {
    case 'brush':
      performBrushAction('startDrawing', x, y);
      break; // brush
    case "rect":
      performRectAction('startDrawing', x, y);
      break; // rect
    case "eraser":
      performEraserAction('startDrawing', x, y);
      break; // eraser
    default: break;
  }
}

function onMouseMove({pageX: x, pageY: y}) {
  if (!currentState.canvasIsOpen) return;
  if (currentState.isDrawing) {
    currentState.currentAction.steps.push({phase: 'drawing', x, y});
  }
  switch (currentState.drawMode) {
    case 'brush':
      if (!currentState.isDrawing) return;
      performBrushAction('drawing', x, y);
      break; // brush
    case 'rect':
      performRectAction('drawing', x, y);
      break; // rect
    case 'eraser':
      temporaryCtx.clearRect(0, 0, temporaryCanvas.width, temporaryCanvas.height);
      temporaryCtx.strokeRect(x - 25, y - 25, 50, 50);
      currentState.lastX = x;
      currentState.lastY = y;
      if (!currentState.isDrawing) return;
      performEraserAction('drawing', x, y);
      break; // eraser
    default: break;
  }
}

function onMouseUp({pageX: x, pageY: y}) {
  if (!currentState.canvasIsOpen || !currentState.isDrawing) return;
  currentState.currentAction.steps.push({phase: 'endDrawing', x, y});
  currentState.actionsHistory.push(currentState.currentAction);
  currentState.currentAction = null;
  switch (currentState.drawMode) {
    case 'brush':
      performBrushAction('endDrawing', x, y);
      break; // brush
    case 'rect':
      performRectAction('endDrawing', x, y);
      break; // rect
    case 'eraser':
      performEraserAction('endDrawing', x, y);
      break; // eraser
    default: break;
  }
}

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  currentState.actionsHistory.forEach(action => {
    action.steps.forEach(step => {
      if (action.tool === 'brush') {
        performBrushAction(step.phase, step.x, step.y, false);
      }
      else if (action.tool === 'rect') {
        performRectAction(step.phase, step.x, step.y, false);
      }
      else if (action.tool === 'eraser') {
        performEraserAction(step.phase, step.x, step.y, false);
      }
    });
  });
}

function redoAction() {
  if (currentState.undidActions.length === 0) return;
  const action = currentState.undidActions.pop();
  action.steps.forEach(step => {
    if (action.tool === 'brush') {
      performBrushAction(step.phase, step.x, step.y);
    }
    else if (action.tool === 'rect') {
      performRectAction(step.phase, step.x, step.y);
    }
    else if (action.tool === 'eraser') {
      performEraserAction(step.phase, step.x, step.y);
    }
  });
  currentState.actionsHistory.push(action);
}

function performBrushAction(phase, x, y) {
  if (phase === 'startDrawing') {
    currentState.isDrawing = true;
    currentState.lastX = x;
    currentState.lastY = y;
  }
  else if (phase === 'drawing') {
    ctx.beginPath();
    ctx.moveTo(currentState.lastX, currentState.lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  else {
    currentState.isDrawing = false;
  }
  currentState.lastX = x;
  currentState.lastY = y;
}

function performRectAction(phase, x, y) {
  if (phase === 'startDrawing') {
    currentState.isDrawing = true;
    currentState.lastX = x;
    currentState.lastY = y;
    temporaryCanvas = initCanvas();
    temporaryCtx = initContext(temporaryCanvas);
    temporaryCtx.lineWidth = ctx.lineWidth;
    temporaryCtx.strokeStyle = ctx.strokeStyle;
    temporaryCanvas.style.display = 'block';
  }
  else if (phase === 'drawing') {
    temporaryCtx.clearRect(0, 0, temporaryCanvas.width, temporaryCanvas.height);
    drawRectangle(temporaryCtx, {x: currentState.lastX, y: currentState.lastY}, {x: x, y: y});
  }
  else {
    temporaryCtx.clearRect(0, 0, temporaryCanvas.width, temporaryCanvas.height);
    temporaryCanvas.style.display = 'none';
    drawRectangle(ctx, {x: currentState.lastX, y: currentState.lastY}, {x: x, y: y});
    currentState.isDrawing = false;
  }
}

function performEraserAction(phase, x, y) {
  const eraserSize = 50;
  if (phase === 'startDrawing') {
    currentState.isDrawing = true;
    currentState.lastX = x;
    currentState.lastY = y;
    temporaryCanvas = initCanvas();
    temporaryCtx = initContext(temporaryCanvas);
    temporaryCtx.strokeStyle = ctx.strokeStyle;
    temporaryCanvas.style.display = 'block';
  }
  else if (phase === 'drawing') {
    ctx.clearRect(x - eraserSize / 2, y - eraserSize / 2, eraserSize, eraserSize);

  }
  else {
    ctx.clearRect(x - eraserSize / 2, y - eraserSize / 2, eraserSize, eraserSize);
    temporaryCtx.clearRect(0, 0, temporaryCanvas.width, temporaryCanvas.height);
    temporaryCanvas.style.display = 'none';
    currentState.isDrawing = false;
  }
}

function initCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = 'absolute';
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.zIndex = 1000;
  canvas.style.display = 'none';
  document.querySelector('body').appendChild(canvas);
  return canvas;
}

function initContext(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.lineJoin = 'round';
  ctx.lineCap = "round";
  return ctx;
}

function drawRectangle(ctx, point1, point2) {
  ctx.beginPath();
  ctx.moveTo(point1.x, point1.y);
  ctx.lineTo(point1.x, point2.y);
  ctx.lineTo(point2.x, point2.y);
  ctx.lineTo(point2.x, point1.y);
  ctx.lineTo(point1.x, point1.y);
  ctx.stroke();
}

function sendMessage(receiver, payload, responseCallback) {
  const message = payload;
  message.from = 'content_script';
  message.to = receiver;
  chrome.runtime.sendMessage(message, responseCallback);
}
