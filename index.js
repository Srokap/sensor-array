"use strict";

var pressure = require('./lib/devices/bmp085')(0x77)
var compass = require('./lib/devices/hmc5883l')(0x1E)
var utils = require('./lib/utils')

//setInterval(function(){
//  utils.scanDevices(1, function(err, res) {
//    console.log('result data', err, res)
//  })
//}, 500)

//pressure.init(function(){
//  setInterval(function(){
//    pressure.getPressure(function(err, p, T){
//      if (err) {
//        console.error(err)
//      } else {
//        console.log('Temperature', T, p)
//      }
//    })
//  }, 500)
//})

compass.init(function(){
  setInterval(function(){
    compass.getReading(function(err, X, Y, Z){
      if (err) {
        console.error(err)
      } else {
        console.log('Compass', X, Y, Z)
      }
    })
  }, 500)
})

