describe('OSNPAddressTable', function() {
  var chai = require('chai');
  var expect = chai.expect;
  var OSNPAddressTable = require('../lib/osnp_address_table.js');
  chai.should();
  
  describe('#OSNPAddressTable', function() {    
    it('should return an empty OSNPAddressTable object', function() {
      var table = new OSNPAddressTable();
      table.allocatedAddresses.should.deep.equal({ '0': true, '65534': true, '65535': true });
      table.nextFreeAddress.should.equal(0x0001);
      
      table = new OSNPAddressTable([]);
      table.allocatedAddresses.should.deep.equal({ '0': true, '65534': true, '65535': true });
      table.nextFreeAddress.should.equal(0x0001);
    });  
    
    it('should return an initialized OSNPAddressTable object', function() {
      var table = new OSNPAddressTable([0x0001, 0x0002, 0x0003]);
      table.allocatedAddresses.should.deep.equal({ '0': true, '65534': true, '65535': true , '1': true, '2': true, '3': true });
      table.nextFreeAddress.should.equal(0x0004);
      
      table = new OSNPAddressTable([0x0001, 0x0003]);
      table.allocatedAddresses.should.deep.equal({ '0': true, '65534': true, '65535': true, '1': true, '3': true });
      table.nextFreeAddress.should.equal(0x0002);
    });
  });
  
  describe('#allocate', function() {        
    it('should allocate the next available address', function() {
      var table = new OSNPAddressTable([0x0001]);
      table.allocate().should.equal(0x0002);
      table.allocatedAddresses.should.deep.equal({ '0': true, '65534': true, '65535': true , '1': true, '2': true });
      table.nextFreeAddress.should.equal(0x0003);
    });
    
    it('should handle rolling over when at the limits of the address space', function() {
      var table = new OSNPAddressTable([0x0001]);
      table.nextFreeAddress = 0xfffd;
      table.allocate();
      table.allocatedAddresses.should.deep.equal({ '0': true, '65534': true, '65535': true , '1': true, '65533': true });
      table.nextFreeAddress.should.equal(0x0002);
    });
    
    it('should handle failure to allocate an address', function() {
      var addresses = [];
      
      for (var i = 1; i < 0xfffe; i++) {
        addresses.push(i);
      }
      
      var table = new OSNPAddressTable(addresses);
      expect(table.allocate()).to.equal(null);
      expect(table.nextFreeAddress).to.equal(null);
    });
  });
  
  describe('#free', function() {        
    it('should free an allocated address, with no effect to the nextFreeAddress property', function() {
      var table = new OSNPAddressTable([0x0001]);
      table.free(0x0001);
      table.allocatedAddresses.should.deep.equal({ '0': true, '65534': true, '65535': true });
      table.nextFreeAddress.should.equal(0x0002);
    });
    
    it('should do nothing if the address to be freed was not allocated', function() {
      var table = new OSNPAddressTable([0x0001]);
      table.free(0x0002);
      table.allocatedAddresses.should.deep.equal({ '0': true, '65534': true, '65535': true, '1': true });
      table.nextFreeAddress.should.equal(0x0002);
    });
    
    it('should throw an exception if the address to be freed is reserved or out of range.', function() {
      var table = new OSNPAddressTable();
      (function(){ tlv.free(0x0000); }).should.throw(Error);
      (function(){ tlv.free(0xfffe); }).should.throw(Error);
      (function(){ tlv.free(0xfffd); }).should.throw(Error);
      (function(){ tlv.free(0x10000); }).should.throw(Error);
    });
  });
});