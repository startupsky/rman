var cv = require('../node-opencv/lib/opencv');
var gm = require('../')

gm('1.jpg').blackThreshold(150,150,150).write('1_resize23.jpg', function(err){
    if (err) return console.dir(arguments)
    console.log(this.outname + " created  ::  " + arguments[3])
    
  }
) 

cv.readImage('1_resize23.jpg', function(err, im) {
  if (err) throw err;
  var width = im.width();
  var height = im.height();
  if (width < 1 || height < 1) throw new Error('Image has no size');

  var big = new cv.Matrix(height, width);
  var all = new cv.Matrix(height, width);


  var aa =im.threshold(200, 255, "Threshold to Zero Inverted");
  var im_canny = im.copy();
 // im_canny.convertGrayscale();
  var aa = im_canny.threshold(150, 255, "Threshold to Zero Inverted");
  var row = aa.row();
  console.log(row.length);
  console.log(aa.pixel(0).length);
  aa.resize(100,100);
  row = aa.row();
  console.log(row.length);
  console.log(aa.pixelRow(0));
  aa.save('./all34.png');
//   for(i=0;i <= im_canny.height();i++)
//   {
//       for(j=0;j <= im_canny.width();j++) 
//       { 
//           if(im.imageData[img->height*i+j] == 0) 
// {
// img->imageData[img->height*i+j] = 1; 
// }
// else if(img->imageData[img->height*i+j] == 255)
// {
// img->imageData[img->height*i+j] = 0; 
// }
// } 
// }
  
//   im_canny = im.copy();

//   im_canny.canny(lowThresh, highThresh);
//   im_canny.dilate(nIters);

//   contours = im_canny.findContours();

//   for(i = 0; i < contours.size(); i++) {
//     if(contours.area(i) > maxArea) {
//       var moments = contours.moments(i);
//       var cgx = Math.round(moments.m10 / moments.m00);
//       var cgy = Math.round(moments.m01 / moments.m00);
//       big.drawContour(contours, i, GREEN);
//       big.line([cgx - 5, cgy], [cgx + 5, cgy], RED);
//       big.line([cgx, cgy - 5], [cgx, cgy + 5], RED);
//     }
//   }

//   all.drawAllContours(contours, WHITE);

//   big.save('./tmp/big.png');
//   all.save('./tmp/all.png');
  console.log('Image saved to ./tmp/big.png && ./tmp/all.png');
});
