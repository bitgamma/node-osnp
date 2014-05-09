var OSNPAddressTable = require('./osnp_address_table');
var OSNPCommandQueue = require('./osnp_command_queue');

var FrameType = {
  BEACON: 0x00,
  DATA: 0x01,
  ACK: 0x02,
  MAC_CMD: 0x03
};

var AddressingMode = {
  NOT_PRESENT: 0x00,
  SHORT_ADDRESS: 0x02,
  EUI: 0x03
};

var MACCommand = {
  ASSOCIATION_REQUEST: 0x01,
  ASSOCIATION_RESPONSE: 0x02,
  DISASSOCIATED: 0x03,
  DATA_REQUEST: 0x04,
  DISCOVER: 0x07,
  KEY_UPDATE_REQUEST: 0x80,
  KEY_UPDATE_RESPONSE: 0x81,
  FRAME_COUNTER_ALIGN: 0x82
}

var SecurityLevel = {
  AES_CCM_64: 0x02,
}

var RXMode = {
  POLL_DRIVEN: 0x00,
  ALWAYS_ON: 0x01
};

exports.OSNPAddressTable = OSNPAddressTable;
exports.OSNPCommandQueue = OSNPCommandQueue;

exports.FrameType = FrameType;
exports.AddressingMode = AddressingMode;
exports.MACCommand = MACCommand;
exports.SecurityLevel = SecurityLevel;
exports.RXMode = RXMode;

function OSNPFrame() {  
  this.frameControlLow = null;
  this.frameControlHigh = null;
  this.destinationPAN = null;
  this.destinationAddress = null;
  this.sourcePAN = null;
  this.sourceAddress = null;
  this.frameCounter = null;
  this.keyCounter = null;
  this.payload = null;
}

OSNPFrame.prototype.getFrameType = function() {
  return this.frameControlLow & 0x07;
}

OSNPFrame.prototype.getDestinationAddressingMode = function() {
  return (this.frameControlHigh >>> 2) & 0x03;
}

OSNPFrame.prototype.getSourceAddressingMode = function() {
  return (this.frameControlHigh >>> 6) & 0x03;
}

OSNPFrame.prototype.hasPANIDCompression = function() {
  return (this.frameControlLow & 0x40) == 0x40;
}

OSNPFrame.prototype.hasSecurityEnabled = function() {
  return (this.frameControlLow & 0x08) == 0x08;
}

OSNPFrame.prototype.hasFramePending = function() {
  return (this.frameControlLow & 0x10) == 0x10;
}

OSNPFrame.prototype.hasAckRequested = function() {
  return (this.frameControlLow & 0x20) == 0x20;
}

OSNPFrame.prototype.getKeyIdentifierMode = function() {
  return (this.securityControl >>> 3) & 0x03;
}

OSNPFrame.prototype.getEncodedLength = function() {
  var len = 3;
  if (this.destinationPAN != null) {
    len += this.destinationAddress.length + 2;
  }
  
  if (!this.hasPANIDCompression() && this.sourcePAN != null) {
    len += 2;
  }
  
  if (this.sourceAddress != null) {
    len += this.sourceAddress.length;
  }
  
  if (this.hasSecurityEnabled()) {
    len += 5;
  }
  
  len += this.payload.length;
  
  return len;
}

OSNPFrame.prototype.encode = function(buf) {
  if (buf == undefined) {
    buf = new Buffer(this.getEncodedLength());
  }
  var index = 0;
  buf.writeUInt8(this.frameControlLow, index++);
  buf.writeUInt8(this.frameControlHigh, index++);
  buf.writeUInt8(this.sequenceNumber, index++);
  
  if (this.destinationPAN != null) {
    this.destinationPAN.copy(buf, index);
    index += 2;
    this.destinationAddress.copy(buf, index);
    index += this.destinationAddress.length;
  }
  
  if (!this.hasPANIDCompression() && this.sourcePAN != null) {
    this.sourcePAN.copy(buf, index);
    index += 2;
  }
  
  if (this.sourceAddress != null) {
    this.sourceAddress.copy(buf, index);
    index += this.sourceAddress.length;
  }
  
  if (this.hasSecurityEnabled()) {
    buf.writeUInt32LE(this.frameCounter, index);
    index += 4;
    buf.writeUInt8(this.keyCounter, index++);
  }
  
  this.payload.copy(buf, index);
  
  return buf;
}

var panID;
var shortAddress;
var eui;

var sequenceNumber = 0;

exports.setPANID = function(aPANID) {
  panID = aPANID;
}

exports.getPANID = function() {
  return panID;
}

exports.setShortAddress = function(aShortAddress) {
  shortAddress = aShortAddress;
}

exports.getShortAddress = function() {
  return shortAddress;
}

exports.setEUI = function(aEUI) {
  eui = aEUI;
}

exports.getEUI = function() {
  return eui;
}

exports.createPairingCommand = function(eui, shortAddress, txKey, rxKey) {
  var frameControlLow = exports.makeFrameControlLow(FrameType.MAC_CMD, true, false, true, false);
  var frameControlHigh = exports.makeFrameControlHigh(AddressingMode.EUI, AddressingMode.EUI);
  
  var frame = exports.createFrame(frameControlLow, frameControlHigh);
  frame.destinationPAN = new Buffer([0x00, 0x00]);   
  frame.destinationAddress = eui;
  
  frame.payload = new Buffer(35);
  frame.payload[0] = MACCommand.ASSOCIATION_REQUEST;
  txKey.copy(frame.payload, 1);
  rxKey.copy(frame.payload, 17);
  shortAddress.copy(frame.payload, 33);
  return frame;
}

exports.createUnpairingCommand = function(shortAddress) {
  var frameControlLow = exports.makeFrameControlLow(FrameType.MAC_CMD, true, false, true, false);
  var frameControlHigh = exports.makeFrameControlHigh(AddressingMode.SHORT_ADDRESS, AddressingMode.EUI);
  
  var frame = exports.createFrame(frameControlLow, frameControlHigh);
  frame.destinationPAN = exports.getPANID();
  frame.destinationAddress = shortAddress;
  frame.payload = new Buffer([MACCommand.DISASSOCIATED]);
  
  return frame;
}

exports.createDiscoveryRequest = function() {
  var frameControlLow = exports.makeFrameControlLow(FrameType.MAC_CMD, false, false, false, false);
  var frameControlHigh = exports.makeFrameControlHigh(AddressingMode.SHORT_ADDRESS, AddressingMode.SHORT_ADDRESS);
  
  var frame = exports.createFrame(frameControlLow, frameControlHigh);
  frame.destinationPAN = new Buffer([0x00, 0x00]);
  frame.destinationAddress = new Buffer([0xff, 0xff]);
  frame.payload = new Buffer([MACCommand.DISCOVER]);
  
  return frame;
}

exports.createCommandPacket = function(data, eui, shortAddress, paired) {
  var frameControlLow = exports.makeFrameControlLow(FrameType.DATA, paired, false, true, paired);
  var frameControlHigh;
  
  if (paired) {
    frameControlHigh = exports.makeFrameControlHigh(AddressingMode.SHORT_ADDRESS, AddressingMode.EUI);
  } else {
    frameControlHigh = exports.makeFrameControlHigh(AddressingMode.EUI, AddressingMode.SHORT_ADDRESS);    
  }
  
  var frame = exports.createFrame(frameControlLow, frameControlHigh);
  
  if (paired) {
    frame.destinationPAN = exports.getPANID();
    frame.destinationAddress = shortAddress;    
  } else {
    frame.destinationPAN = new Buffer([0x00, 0x00]);   
    frame.destinationAddress = eui;    
  }
  
  frame.payload = data;
  
  return frame;
}

exports.parseFrame = function(frame) {
  var osnpFrame = new OSNPFrame(); 
  var index = 0;
  osnpFrame.frameControlLow = frame.readUInt8(index++);
  osnpFrame.frameControlHigh = frame.readUInt8(index++);
  osnpFrame.sequenceNumber = frame.readUInt8(index++);
  
  switch (osnpFrame.getDestinationAddressingMode()) {
  case AddressingMode.SHORT_ADDRESS:
    osnpFrame.destinationPAN = frame.slice(index, index + 2);
    index += 2;
    osnpFrame.destinationAddress = frame.slice(index, index + 2);
    index += 2;
    break;
  case AddressingMode.EUI:
    osnpFrame.destinationPAN = frame.slice(index, index + 2);
    index += 2;
    osnpFrame.destinationAddress = frame.slice(index, index + 8);
    index += 8;
    break;
  }
  
  if (osnpFrame.getSourceAddressingMode() != AddressingMode.NOT_PRESENT) {
    if(osnpFrame.hasPANIDCompression()) {
      osnpFrame.sourcePAN = osnpFrame.destinationPAN;
    } else {
      osnpFrame.sourcePAN = frame.slice(index, index + 2);
      index += 2;
    }
  }
  
  switch (osnpFrame.getSourceAddressingMode()) {
  case AddressingMode.SHORT_ADDRESS:
    osnpFrame.sourceAddress = frame.slice(index, index + 2);
    index += 2;
    break;
  case AddressingMode.EUI:
    osnpFrame.sourceAddress = frame.slice(index, index + 8);
    index += 8;
    break;
  }
  
  if (osnpFrame.hasSecurityEnabled()) {
    osnpFrame.frameCounter = frame.readUInt32LE(index);
    index += 4;
    osnpFrame.keyCounter = frame.readUInt8(index++);
  }
  
  osnpFrame.payload = frame.slice(index, frame.length - 2);
  
  return osnpFrame;
}

exports.createFrame = function(frameControlLow, frameControlHigh) {
  var frame = new OSNPFrame();
  
  frame.frameControlLow = frameControlLow;
  frame.frameControlHigh = frameControlHigh;
  
  frame.sequenceNumber = sequenceNumber++;
  
  if (sequenceNumber >= 255) {
    sequenceNumber = 0;
  }
  
  if (frame.hasPANIDCompression() && (frame.getDestinationAddressingMode() != AddressingMode.NOT_PRESENT)) {
    frame.destinationPAN = panID;
  }
  
  switch (frame.getSourceAddressingMode()) {
  case AddressingMode.SHORT_ADDRESS:
    frame.sourcePAN = panID;
    frame.sourceAddress = shortAddress;
    break;
  case AddressingMode.EUI:
    frame.sourcePAN = panID;    
    frame.sourceAddress = eui;
    break;
  }
  
  if (frame.hasSecurityEnabled()) {
    frame.frameCounter = 0;
    frame.keyCounter = 0x10;
  }
  
  frame.payload = new Buffer(0);
  
  return frame;
}

exports.makeFrameControlLow = function(frameType, securityEnabled, framePending, ackRequest, panIDCompression) {
  return frameType | (securityEnabled ? 0x08 : 0x00) | (framePending ? 0x10 : 0x00) | (ackRequest ? 0x20 : 0x00) | (panIDCompression ? 0x40 : 0x00);
}

exports.makeFrameControlHigh = function(destinationAddressingMode, sourceAddressingMode) {
  return (destinationAddressingMode << 2) | (sourceAddressingMode << 6);
}
