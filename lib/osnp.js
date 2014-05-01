var FrameType = {
  BEACON: 0x00,
  DATA: 0x01,
  ACK: 0x02,
  MAC_CMD: 0x03
};

var FrameVersion = {
  V2003: 0x00,
  V2006: 0x01
}

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
  DISCOVER: 0x07
}

var SecurityLevel = {
  NONE: 0x00,
  MIC_32: 0x01,
  MIC_64: 0x02,
  MIC_128: 0x03,
  ENC: 0x04,
  ENC_MIC_32: 0x05,
  ENC_MIC_64: 0x06,
  ENC_MIC_128: 0x07
}

var KeyIdentifierMode = {
  IMPLICIT: 0x00,
  KEY_IDX_ONLY: 0x01,
  KEY_SOURCE_4: 0x02,
  KEY_SOURCE_8: 0x03
}

exports.FrameType = FrameType;
exports.FrameVersion = FrameVersion;
exports.AddressingMode = AddressingMode;
exports.MACCommand = MACCommand;
exports.SecurityLevel = SecurityLevel;
exports.KeyIdentifierMode = KeyIdentifierMode;

function OSNPFrame() {  
  this.frameControlLow = null;
  this.frameControlHigh = null;
  this.destinationPAN = null;
  this.destinationAddress = null;
  this.sourcePAN = null;
  this.sourceAddress = null;
  this.securityControl = null;
  this.frameCounter = null;
  this.keySource = null;
  this.keyIndex = null;
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

OSNPFrame.prototype.getFrameVersion = function() {
  return (this.frameControlHigh >>> 4) & 0x03;
}

OSNPFrame.prototype.hasPANIDCompression = function() {
  return (this.frameControlLow & 0x40) == 0x40;
}

OSNPFrame.prototype.hasSecurityEnabled = function() {
  return (this.frameControlLow & 0x08) == 0x08;
}

OSNPFrame.prototype.hasSecurityHeader = function() {
  return this.hasSecurityEnabled() && ((this.frameControlHigh & 0x30) != 0x00);
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
  
  if (this.hasSecurityHeader()) {
    len += 5;
    if (this.keySource != null) {
      len += this.keySource.length + 1;
    } else if (this.getKeyIdentifierMode() == KeyIdentifierMode.KEY_IDX_ONLY) {
      len++;
    }
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
  
  if (this.hasSecurityHeader()) {
    buf.writeUInt8(this.securityControl, index++);
    buf.writeUInt32LE(this.frameCounter, index);
    index += 4;
    
    if (this.keySource != null) {
      this.keySource.copy(buf, index);
      index += this.keySource.length;
      buf.writeUInt8(this.keyIndex, index++);
    } else if (this.getKeyIdentifierMode() == KeyIdentifierMode.KEY_IDX_ONLY) {
      buf.writeUInt8(this.keyIndex, index++);
    }
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
  if (osnpFrame.hasSecurityHeader()) {
    osnpFrame.securityControl = frame.readUInt8(index++);
    osnpFrame.frameCounter = frame.readUInt32LE(index);
    index += 4;
  
    switch (osnpFrame.getKeyIdentifierMode()) {
    case KeyIdentifierMode.KEY_IDX_ONLY:
      osnpFrame.keyIndex = frame.readUInt8(index++);
      break;
    case KeyIdentifierMode.KEY_SOURCE_4:
      osnpFrame.keySource = frame.slice(index, index + 4);
      index += 4;
      osnpFrame.keyIndex = frame.readUInt8(index++);
      break;
    case KeyIdentifierMode.KEY_SOURCE_8:
      osnpFrame.keySource = frame.slice(index, index + 8);
      index += 8;
      osnpFrame.keyIndex = frame.readUInt8(index++);
      break;
    }
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
  
  frame.payload = new Buffer(0);
  
  return frame;
}

exports.createResponse = function(originalFrame) {
  var frameControlLow = (originalFrame.frameControlLow & 0xEF) | 0x20;
  var frameControlHigh = (originalFrame.getSourceAddressingMode() << 2) | (originalFrame.getDestinationAddressingMode() << 6) | (originalFrame.frameControlHigher & 0x30);
  var frame = exports.createFrame(frameControlLow,  frameControlHigh);
  
  frame.destinationPAN = originalFrame.sourcePAN;
  frame.destinationAddress = originalFrame.sourceAddress;  
  frame.securityControl = originalFrame.securityControl;
  frame.frameCounter = originalFrame.frameCounter;
  frame.keySource = originalFrame.keySource;
  frame.keyIndex = originalFrame.keyIndex;
  
  return frame;
}

exports.makeFrameControlLow = function(frameType, securityEnabled, framePending, ackRequest, panIDCompression) {
  return frameType | (securityEnabled ? 0x08 : 0x00) | (framePending ? 0x10 : 0x00) | (ackRequest ? 0x20 : 0x00) | (panIDCompression ? 0x40 : 0x00);
}

exports.makeFrameControlHigh = function(destinationAddressingMode, frameVersion, sourceAddressingMode) {
  return (destinationAddressingMode << 2) | (frameVersion << 4) | (sourceAddressingMode << 6);
}
