function OSNPAddressTable(allocatedAddress, nextFreeAddress) {
  if (!allocatedAddresses) {
    allocatedAddresses = {};
    nextFreeAddress = 0x0001;
  }
  
  this.allocatedAddresses = allocatedAddress;
  this.nextFreeAddress = nextFreeAddress;
}

OSNPAddressTable.prototype.allocate = function() {
  var result = this.nextFreeAddress;
  
  if (this.nextFreeAddress != null) {
    this.nextFreeAddress++;
    this.allocatedAddress[result] = true;
  
    while(this.allocatedAddress[this.nextFreeAddress] && (this.nextFreeAddress != result)) {
      if (this.nextFreeAddress >= 0xfffe) {
        this.nextFreeAddress = 0x0001;
      } else {
        this.nextFreeAddress++;
      }
    }  
    
    if (this.nextFreeAddress == result) {
      this.nextFreeAddress = null;
    }  
  }

  
  return result;
}

OSNPAddressTable.prototype.free = function(address) {
  delete this.allocatedAddress[address];
  
  if (this.nextFreeAddress == null) {
    this.nextFreeAddress = address;
  }
}

module.exports = OSNPAddressTable;