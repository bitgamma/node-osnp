function OSNPCommandQueue() {
  this.pendingCommands = [];
  this.awaitingResponseCommand = null;
}

OSNPCommandQueue.prototype.queue = function(cmd) {
  this.pendingCommands.push(cmd);
}

OSNPCommandQueue.prototype.dequeue = function() {
  if (this.awaitingResponseCommand) {
    return null;
  }
  
  this.awaitingResponseCommand = this.pendingCommands.shift();
  
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

OSNPCommandQueue.prototype.getDevice = function() {
  return this.device;
}

module.exports = OSNPCommandQueue;