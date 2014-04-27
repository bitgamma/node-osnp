describe('OSNP', function() {
  var chai = require('chai');
  var osnp = require('../lib/osnp.js');
  chai.should();
  
  osnp.setPANID(new Buffer([0xfe, 0xca]));
  osnp.setShortAddress(new Buffer([0xbe, 0xba]));
  osnp.setEUI(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  
  describe('#parseFrame', function() {    
    it('should parse a frame and return an OSNPFrame object', function() {
      var frame = new Buffer([0x61, 0x88, 0x01, 0xfe, 0xca, 0xef, 0xbe, 0xbe, 0xba, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00]);
      var osnpFrame = osnp.parseFrame(frame);
      osnpFrame.frameControlLow.should.equal(0x61);
      osnpFrame.frameControlHigh.should.equal(0x88);
      osnpFrame.sequenceNumber.should.equal(0x01);
      osnpFrame.destinationPAN.should.deep.equal(new Buffer([0xfe, 0xca]));
      osnpFrame.destinationAddress.should.deep.equal(new Buffer([0xef, 0xbe]));
      osnpFrame.sourcePAN.should.deep.equal(new Buffer([0xfe, 0xca]));
      osnpFrame.sourceAddress.should.deep.equal(new Buffer([0xbe, 0xba]));
      osnpFrame.payload.should.deep.equal(new Buffer([0x74, 0x65, 0x73, 0x74]));
    });
    
    it('should parse a frame with security but in 802.15.4-2003 format and return an OSNPFrame object', function() {
      var frame = new Buffer([0x69, 0x88, 0x01, 0xfe, 0xca, 0xef, 0xbe, 0xbe, 0xba, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00]);
      var osnpFrame = osnp.parseFrame(frame);
      osnpFrame.frameControlLow.should.equal(0x69);
      osnpFrame.frameControlHigh.should.equal(0x88);
      osnpFrame.hasSecurityEnabled().should.equal(true);
      osnpFrame.hasSecurityHeader().should.equal(false);
      osnpFrame.sequenceNumber.should.equal(0x01);
      osnpFrame.destinationPAN.should.deep.equal(new Buffer([0xfe, 0xca]));
      osnpFrame.destinationAddress.should.deep.equal(new Buffer([0xef, 0xbe]));
      osnpFrame.sourcePAN.should.deep.equal(new Buffer([0xfe, 0xca]));
      osnpFrame.sourceAddress.should.deep.equal(new Buffer([0xbe, 0xba]));
      osnpFrame.payload.should.deep.equal(new Buffer([0x74, 0x65, 0x73, 0x74]));
    });
    
    it('should parse a frame with security header and return an OSNPFrame object', function() {
      var frame = new Buffer([0x69, 0x98, 0x01, 0xfe, 0xca, 0xef, 0xbe, 0xbe, 0xba, 0x15, 0xa7, 0xfa, 0xaf, 0x7a, 0xaa, 0xaa, 0xaa, 0xaa, 0x01, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00]);
      var osnpFrame = osnp.parseFrame(frame);
      osnpFrame.frameControlLow.should.equal(0x69);
      osnpFrame.frameControlHigh.should.equal(0x98);
      osnpFrame.hasSecurityEnabled().should.equal(true);
      osnpFrame.hasSecurityHeader().should.equal(true);
      osnpFrame.sequenceNumber.should.equal(0x01);
      osnpFrame.destinationPAN.should.deep.equal(new Buffer([0xfe, 0xca]));
      osnpFrame.destinationAddress.should.deep.equal(new Buffer([0xef, 0xbe]));
      osnpFrame.sourcePAN.should.deep.equal(new Buffer([0xfe, 0xca]));
      osnpFrame.sourceAddress.should.deep.equal(new Buffer([0xbe, 0xba]));
      osnpFrame.sourceAddress.should.deep.equal(new Buffer([0xbe, 0xba]));
      osnpFrame.securityControl.should.equal(0x15);
      osnpFrame.frameCounter.should.equal(0x7aaffaa7);
      osnpFrame.keySource.should.deep.equal(new Buffer([0xaa, 0xaa, 0xaa, 0xaa]));
      osnpFrame.keyIndex.should.equal(0x01);
      osnpFrame.payload.should.deep.equal(new Buffer([0x74, 0x65, 0x73, 0x74]));
    });
  });
  
  describe('#encode', function() {
    it('should encode an OSNPFrame object to a Buffer', function() {
      var frame = new Buffer([0x61, 0x88, 0x01, 0xfe, 0xca, 0xef, 0xbe, 0xbe, 0xba, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00]);
      var osnpFrame = osnp.parseFrame(frame);
      osnpFrame.encode().should.deep.equal(frame.slice(0, frame.length - 2));
    });
    
    it('should encode a frame with security but in 802.15.4-2003 format to a Buffer', function() {
      var frame = new Buffer([0x69, 0x88, 0x01, 0xfe, 0xca, 0xef, 0xbe, 0xbe, 0xba, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00]);
      var osnpFrame = osnp.parseFrame(frame);
      osnpFrame.encode().should.deep.equal(frame.slice(0, frame.length - 2));
    });
    
    it('should encode a frame with security header to the given Buffer', function() {
      var frame = new Buffer([0x69, 0x98, 0x01, 0xfe, 0xca, 0xef, 0xbe, 0xbe, 0xba, 0x15, 0xa7, 0xfa, 0xaf, 0x7a, 0xaa, 0xaa, 0xaa, 0xaa, 0x01, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00]);
      var osnpFrame = osnp.parseFrame(frame);
      var buf = new Buffer(osnpFrame.getEncodedLength());
      osnpFrame.encode(buf);
      buf.should.deep.equal(frame.slice(0, frame.length - 2));
    });
  });
  
  describe('#createFrame', function() {
    it('should create a frame with the given options and populate source addressing options', function() {
      var osnpFrame = osnp.createFrame(0x61, 0x88);
      osnpFrame.destinationPAN.should.deep.equal(new Buffer([0xfe, 0xca]));
      osnpFrame.sourcePAN.should.deep.equal(new Buffer([0xfe, 0xca]));
      osnpFrame.sourceAddress.should.deep.equal(new Buffer([0xbe, 0xba]));
    }); 
  }); 

  describe('#createResponse', function() {
    it('should create a frame with a ready header as a response to this frame', function() {
      var frame = new Buffer([0x61, 0xc8, 0x01, 0xfe, 0xca, 0xbe, 0xba,  0xef, 0xbe, 0xef, 0xbe, 0xef, 0xbe, 0xef, 0xbe, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00]);
      var osnpFrame = osnp.parseFrame(frame);
      var respFrame = osnp.createResponse(osnpFrame);
      respFrame.encode().should.deep.equal(new Buffer([0x61, 0x8c, 0x01, 0xfe, 0xca, 0xef, 0xbe, 0xef, 0xbe, 0xef, 0xbe, 0xef, 0xbe, 0xbe, 0xba]));
    }); 
  }); 
  
  describe('#makeFrameControlLow', function() {
    it('should format a control low byte with the given parameters', function() {
      var frameControlLow = osnp.makeFrameControlLow(osnp.FrameType.DATA, false, false, true, true);
      frameControlLow.should.equal(0x61);
    }); 
  }); 
  
  describe('#makeFrameControlHigh', function() {
    it('should format a control high byte with the given parameters', function() {
      var frameControlHigh = osnp.makeFrameControlHigh(osnp.AddressingMode.SHORT_ADDRESS, osnp.FrameVersion.V2003, osnp.AddressingMode.SHORT_ADDRESS);
      frameControlHigh.should.equal(0x88);
    }); 
  }); 
});