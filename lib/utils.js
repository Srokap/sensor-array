"use strict";

module.exports = (function(){
  return {
    /**
     * Scan for devices on the bus. Result contains an array of addresses
     *
     * @param callback
     */
    scanDevices: function(busId, callback) {
      var I2C = require('i2c')

      var wire = new I2C(0x00, {
        device: '/dev/i2c-' + busId
      })

      wire.scan(function(err, addresses) {
        callback(err, addresses)
      })
    }
  }
})()
