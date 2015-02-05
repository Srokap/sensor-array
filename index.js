"using strict";

var i2c = require('i2c')
var address = 0x77
var binary = require('binary')
var wire = new i2c(address, {
  device: '/dev/i2c-1',
//  debug: true
}); // point to your i2c address, debug provides REPL interface

wire.scan(function(err, data) {
  // result contains an array of addresses
  console.log('result data', err, data)
});

wire.on('error', function(err, res) {
  console.log('ERROR', err)
})

wire.on('data', function(data) {
  console.log(data)
})

var calib

//read calibration data
wire.readBytes(0xAA, 22, function(err, buffer) {
  console.log(buffer)

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

  console.log(calib)
})

console.log(wire)

//0x77 https://www.sparkfun.com/datasheets/Components/General/BST-BMP085-DS000-05.pdf

setInterval(function(){

  //temperature

  wire.writeBytes(0xF4, [0x2E], function(err, res){
    //console.log('wrote', err, res)
  });

  var B5, UT

  setTimeout(function() {
    wire.readBytes(0xF6, 2, function(err, buffer) {
      UT = buffer[0] << 8 | buffer[1]
      //console.log('temperature', buffer[0] << 8 | buffer[1])
      var X1 = ((UT - calib.AC6) * calib.AC5) >> 15
      var X2 = (calib.MC << 11) / (X1 + calib.MD)
      B5 = X1 + X2
      var T = (B5 + 8) >> 4
      console.log('Temperature ' + (T / 10) + '\'C')
    })
  }, 5)//max convertion time is 4.5ms

  //pressure

  var osrs = 0

  wire.writeBytes(0xF4, [0x34 + (osrs << 6)], function(err, res){
    //console.log('wrote', err, res)
  });

  setTimeout(function() {
    wire.readBytes(0xF6, 3, function(err, buffer) {
//      console.log('pressure', (buffer[0] << 16 | buffer[1] << 8 | buffer[2])>>(8-osrs))

//      var UP = (buffer[0] << 16 | buffer[1] << 8 | buffer[2]) >> (8 - osrs)

      var data = binary.parse(buffer)
        .word8bu('MSB')
        .word8bu('LSB')
        .word8bu('XLSB')
        .vars

      var UP = (data.MSB << 16 | data.LSB << 8 | data.XLSB) >> (8 - osrs)

      var B6 = B5 - 4000
      var X1 = (calib.B2 * ((B6 * B6)>>12)) >> 11
      var X2 = calib.AC2 * B6 >> 11
      var X3 = X1 + X2
      var B3 = ((calib.AC1 * 4 + X3) << osrs + 2) / 4

      console.log('B5', B5)
      console.log('B6', B6)
      console.log('X1', X1)
      console.log('X2', X2)
      console.log('X3', X3)
      console.log('B3', B3)
      
      X1 = (calib.AC3 * B6) >> 13
      X2 = (calib.B1 * ((B6 * B6)>>12))>>16
      X3 = ((X1+X2)+2)>>2
      var B4 = (calib.AC4 * (X3 + 32768)) >> 15
      var B7 = (UP * (50000 >> osrs)) - (B3 * (50000 >> osrs))

      console.log('X1', X1)
      console.log('X2', X2)
      console.log('X3', X3)
      console.log('B4', B4)
      console.log('B7', B7)

      var p
      if (B7 < 0x80000000) {
        p = (B7 *2) / B4 
      } else {
        p = (B7 / B4) *2
      }

      console.log('p', p)

      X1 = (p >> 8) * (p >> 8)
      X1 = (X1 * 3038) >> 16
      X2 = (-7357 * p) >> 16
      p = p + ((X1 + X2 + 3791) >> 4)

      console.log("Pressure " + (p) + ' Pa')
    })
  }, 26)//max convertion time is 25.5ms

}, 100)

//wire.stream(0xF6, 2, 500)

/*setTimeout(function() {
  wire.readBytes(0xF6, 2, function(err, buffer) {
    console.log('read', buffer[0], buffer[1])
  })
}, 10)
*/
