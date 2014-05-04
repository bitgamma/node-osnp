function OSNPCommandQueue() {
  this.pendingCommands = [];
  this.awaitingResponseCommand = null;
}

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

module.exports = OSNPCommandQueue;