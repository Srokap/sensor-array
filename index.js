"use strict";

var pressure = require('./lib/bmp085')(0x77)

pressure.init(function(){
  setInterval(function(){
    pressure.getPressure(function(err, p, T){
      if (err) {
        console.error(err)
      } else {
        console.log('Temperature', T, p)
      }
    })
  }, 500)
})

