
// gm - Copyright Aaron Heckmann <aaron.heckmann+github@gmail.com> (MIT Licensed)

var gm = require('../')
  , dir = __dirname + '/imgs'
gm(dir + '/1.jpg').blackThreshold(100,100,100).write(dir + '/1_resize23.jpg', function(err){
    if (err) return console.dir(arguments)
    console.log(this.outname + " created  ::  " + arguments[3])
    
  }
) 

gm(dir + '/1_resize23.jpg').resample(100,100).write(dir + '/1_resample.jpg', function(err){
    if (err) return console.dir(arguments)
    console.log(this.outname + " created  ::  " + arguments[3])
    
  }
) 

console.log(gm(dir + '/1.jpg').map());
  
// gm(dir + '/1.jpg')
//   .resize(58, 20)
//   .write(dir + '/1_resize23.jpg', function(err){
//     if (err) return console.dir(arguments)
//     console.log(this.outname + " created  ::  " + arguments[3])
//   }
// ) 
