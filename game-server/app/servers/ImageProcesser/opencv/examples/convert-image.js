var cv = require('../lib/opencv');

cv.readImage('./files/mona.png', function(err, im) {
  if (err) throw err;
  if (im.width() < 1 || im.height() < 1) throw new Error('Image has no size');
  var im2= cv.threshold(cv.cvtColor(im, CV_RBGA2GRAY), 60)
  var im3 = cv.cvtColor(mat2, CV_GRAY2RGBA);
//   img_hsv = im.copy();
//   img_gray = im.copy();

//   img_hsv.convertHSVscale();
//   img_gray.convertGrayscale();

//   im.save('./tmp/nor.png');
//   img_hsv.save('./tmp/hsv.png');
//   img_gray.save('./tmp/gray.png');

//   img_crop = im.crop(50,50,250,250);
   im3.save('./tmp/crop22.png');

  console.log(im.data[0][0]);
});
