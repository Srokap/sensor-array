"use strict";

/**
 * 3-Axis Digital Compass. Default address: 0x1E
 *
 * @see https://www.seeedstudio.com/wiki/images/4/42/HMC5883.pdf
 */
module.exports = function(address) {

  var I2C = require('i2c')
    , binary = require('binary')
    //, calib
    , debug = require('debug')('hmc5883l')

  var wire = new I2C(address, {
    device: '/dev/i2c-1'
  })

  wire.on('error', function(err, res) {
    console.error('hmc5883l I2C error:', err)
  })

  wire.on('data', function(data) {
    debug(data)
  })

  var init = function(callback) {
    callback()
  }

  return {
    init: init,

    getReading: function(callback) {
      wire.writeBytes(0x02, [0x01], function(err, res){
        if (err) {
          debug('write error', err)
          return callback(err)
        }

        setTimeout(function() {
          wire.readBytes(0x03, 6, function(err, buffer) {
            if (err) {
              debug('read error', err)
              return callback(err)
            }

            var data = binary.parse(buffer)
              .word16bs('X')
              .word16bs('Z')
              .word16bs('Y')
              .vars

            callback(null, data.X, data.Y, data.Z)
          })
        }, 9)//measurement period is 8.3 ms
      })
    }
  }
}
