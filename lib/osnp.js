var AddressingMode = {
  NOT_PRESENT: 0x00,
  SHORT_ADDRESS: 0x02,
  EUI: 0x03
};

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

function OSNPFrame() {  
  
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

OSNPFrame.prototype.hasSecurityHeader = function() {
  return this.hasSecurityEnabled() && ((this.frameControlHigh & 0x30) != 0x00);
}

OSNPFrame.prototype.getKeyIdentifierMode = function() {
  return (this.securityControl >>> 3) & 0x03;
}


exports.parseFrame = function(frame) {
  var osnpFrame = new OSNPFrame(); 
  var index = 0;
  osnpFrame.frameControlLow = frame.readUInt8(index++);
  osnpFrame.frameControlHigh = frame.readUInt8(index++);
  osnpFrame.sequenceNumber = frame.readUInt8(index++);
  
  switch (osnpFrame.getDestinationAddressingMode()) {
  case AddressingMode.NOT_PRESENT:
    osnpFrame.destinationPAN = null;
    osnpFrame.destinationAddress = null;
    break;
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
  
  if(osnpFrame.hasPANIDCompression() && (osnpFrame.getSourceAddressingMode() != AddressingMode.NOT_PRESENT)) {
    osnpFrame.sourcePAN = osnpFrame.destinationPAN;
  } else if (osnpFrame.getSourceAddressingMode() == AddressingMode.NOT_PRESENT) {
    osnpFrame.sourcePAN = null;    
  } else {
    osnpFrame.sourcePAN = frame.slice(index, index + 2);
    index += 2;
  }
  
  switch (osnpFrame.getSourceAddressingMode()) {
  case AddressingMode.NOT_PRESENT:
    osnpFrame.sourceAddress = null;
    break;
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
    case KeyIdentifierMode.IMPLICIT:
      osnpFrame.keySource = null;
      osnpFrame.keyIndex = null;
      break;
    case KeyIdentifierMode.KEY_IDX_ONLY:
      osnpFrame.keySource = null;
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