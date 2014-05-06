function OSNPAddressTable(initAddressArray) {
  this.allocatedAddresses = { '0': true, '65534': true, '65535': true };
  this.nextFreeAddress = 0x0000;
  
  if (initAddressArray) {
    for (var i = 0, len = initAddressArray.length; i < len; i++) {
      this.allocatedAddresses[initAddressArray[i]] = true;
    }    
  }

  this._findNextFreeAddress();
}

OSNPAddressTable.prototype.allocate = function() {
  var result = this.nextFreeAddress;
  
  if (result !== null) {
    this.allocatedAddresses[result] = true;
    this._findNextFreeAddress();    
  }
  
  return result;
}

OSNPAddressTable.prototype._findNextFreeAddress = function() {
  var startingPoint = this.nextFreeAddress;
  this.nextFreeAddress = (this.nextFreeAddress + 1) % 0x010000;
  
  while(this.allocatedAddresses[this.nextFreeAddress] && (this.nextFreeAddress != startingPoint)) {
    this.nextFreeAddress = (this.nextFreeAddress + 1) % 0x010000;
  }  
  
  // Handles the case where the we found no address and exited the loop because 
  // we already scanned the entire address space
  if (this.allocatedAddresses[this.nextFreeAddress]) {
    this.nextFreeAddress = null;
  }
}

OSNPAddressTable.prototype.free = function(address) {
  if (address >= 0xfffe || address < 0x0001) {
    throw new Error("Addresses 0x0000, 0xfffe and 0xffff are reserved. Anything above that is out of range. You tried freeing: " + address);      
  }
  
  delete this.allocatedAddresses[address];
  
  if (this.nextFreeAddress == null) {
    this.nextFreeAddress = address;
  }
}

module.exports = OSNPAddressTable;