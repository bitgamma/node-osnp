var events = require('events');
var util = require('util');

function OSNPCommandQueue() {
  this.pendingCommands = [];
  this.awaitingResponseCommand = null;
}

util.inherits(OSNPCommandQueue, events.EventEmitter);

OSNPCommandQueue.prototype.isEmpty = function() {
  return (this.pendingCommands.length == 0);
}

OSNPCommandQueue.prototype.queue = function(cmd) {
  this.pendingCommands.push(cmd);
}

OSNPCommandQueue.prototype.dequeue = function() {
  if (this.awaitingResponseCommand) {
    return null;
  }
  
  this.awaitingResponseCommand = this.pendingCommands.shift();
  
  if (this.awaitingResponseCommand && this.awaitingResponseCommand.osnpTransmissionTimeout) {
    setTimeout(handleTransmissionTimeout.bind(this, this.awaitingResponseCommand), timeout);    
  }
  
  return this.awaitingResponseCommand;
}

OSNPCommandQueue.prototype.deviceResponded = function() {
  var originalCmd = this.awaitingResponseCommand;
  this.awaitingResponseCommand = null;
  return originalCmd;
}

OSNPCommandQueue.prototype.rescheduleAwaiting = function() {
  this.pendingCommands.unshift(this.awaitingResponseCommand);
  this.awaitingResponseCommand = null;
}

OSNPCommandQueue.prototype.getCommandAwaitingResponse = function() {
  return this.awaitingResponseCommand;
}

function handleTransmissionTimeout(frame) {
  if (frame === this.awaitingResponseCommand) {
    this.awaitingResponseCommand = null;
    this.emit('osnp:transmissionTimeout', frame);
  }
}

module.exports = OSNPCommandQueue;