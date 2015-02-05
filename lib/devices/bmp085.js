"use strict";

/**
 * Temperature and pressure sensor. Default address: 0x77
 *
 * @see https://www.sparkfun.com/datasheets/Components/General/BST-BMP085-DS000-05.pdf
 *
 * @type {Function}
 */
module.exports = function(address){

  var I2C = require('i2c')
    , binary = require('binary')
    , calib
    , debug = require('debug')('bmp085')

  var wire = new I2C(address, {
    device: '/dev/i2c-1'
  })

  wire.on('error', function(err, res) {
    console.error('bmp085 I2C error:', err)
  })

  wire.on('data', function(data) {
    debug(data)
  })

  var init = function(callback) {
    //read calibration data
    wire.readBytes(0xAA, 22, function(err, buffer) {
      //debug(buffer)

      calib = binary.parse(buffer)
        .word16bs('AC1')
        .word16bs('AC2')
        .word16bs('AC3')
        .word16bu('AC4')
        .word16bu('AC5')
        .word16bu('AC6')
        .word16bs('B1')
        .word16bs('B2')
        .word16bs('MB')
        .word16bs('MC')
        .word16bs('MD')
        .vars

      debug('Calibration data', calib)
      callback()
    })
  }

  /**
   * Get raw temperature reading without calibration data
   *
   * @param callback
   */
  var getTemperatureRaw = function(callback) {

    debug('Getting raw temperature')

    wire.writeBytes(0xF4, [0x2E], function(err, res){
      if (err) {
        debug('write error', err)
        return callback(err)
      }

      setTimeout(function() {
        wire.readBytes(0xF6, 2, function(err, buffer) {
          if (err) {
            debug('read error', err)
            return callback(err)
          }

          var UT = buffer[0] << 8 | buffer[1]
          callback(null, UT)
        })
      }, 5)//max convertion time is 4.5ms
    })
  }

  /**
   * Get raw pressure reading without calibration data
   *
   * @param osrs Precision, integer value from 0 to 3
   * @param callback
   */
  var getPressureRaw = function(osrs, callback) {

    debug('Getting raw pressure')

    wire.writeBytes(0xF4, [0x34 + (osrs << 6)], function(err, res){
      if (err) {
        debug('write error', err)
        return callback(err)
      }

      setTimeout(function() {
        wire.readBytes(0xF6, 3, function (err, buffer) {
          if (err) {
            debug('read error', err)
            return callback(err)
          }

          var data = binary.parse(buffer)
            .word8bu('MSB')
            .word8bu('LSB')
            .word8bu('XLSB')
            .vars

          var UP = (data.MSB << 16 | data.LSB << 8 | data.XLSB) >> (8 - osrs)
          callback(null, UP)
        })
      }, 26)//max convertion time is 25.5ms for most detailed run
    })
  }


  return {
    init: init,

    getPressure: function(callback) {

      debug('getPressure')
      var osrs = 0

      getTemperatureRaw(function(err, rawTemp) {
        if (err) {
          return callback(err)
        }

        var UT = rawTemp
        var X1 = ((UT - calib.AC6) * calib.AC5) >> 15
        var X2 = (calib.MC << 11) / (X1 + calib.MD)
        var B5 = X1 + X2
        var T = (B5 + 8) >> 4

        debug('UT', UT)
        debug('X1', X1)
        debug('X2', X2)
        debug('B5', B5)

        debug('Temperature ' + (T / 10) + '\'C')

        getPressureRaw(osrs, function(err, UP) {
          if (err) {
            return callback(err)
          }

          var B6 = B5 - 4000
          var X1 = (calib.B2 * ((B6 * B6)>>12)) >> 11
          var X2 = calib.AC2 * B6 >> 11
          var X3 = X1 + X2
          var B3 = ((calib.AC1 * 4 + X3) << osrs + 2) / 4

          debug('B5', B5)
          debug('B6', B6)
          debug('X1', X1)
          debug('X2', X2)
          debug('X3', X3)
          debug('B3', B3)

          X1 = (calib.AC3 * B6) >> 13
          X2 = (calib.B1 * ((B6 * B6)>>12))>>16
          X3 = ((X1+X2)+2)>>2
          var B4 = (calib.AC4 * (X3 + 32768)) >> 15
          var B7 = (UP * (50000 >> osrs)) - (B3 * (50000 >> osrs))

          debug('X1', X1)
          debug('X2', X2)
          debug('X3', X3)
          debug('B4', B4)
          debug('B7', B7)

          var p
          if (B7 < 0x80000000) {
            p = (B7 *2) / B4
          } else {
            p = (B7 / B4) *2
          }

          debug('p', p)

          X1 = (p >> 8) * (p >> 8)
          X1 = (X1 * 3038) >> 16
          X2 = (-7357 * p) >> 16
          p = p + ((X1 + X2 + 3791) >> 4)

          debug("Pressure " + (p / 100) + ' hPa')

          callback(null, p/100, T/10)
        })
      })
    }
  }
}