var cv = require('../node-opencv/lib/opencv');

cv.readImage('2.jpg', function(err, im) {
  if (err) throw err;
  var width = im.width();
  var height = im.height();
  if (width < 1 || height < 1) throw new Error('Image has no size');

  var binaryImage = im.threshold(200, 255, "Binary");
  console.log("image converted to binary image");
  
  binaryImage.resize(4,4);
  
  //  binaryImage.convertGrayscale();
  console.log(binaryImage.channels());

   var imageMatrix = new Array();

   for(i=0;i<binaryImage.height();i++)
   {
       imageMatrix[i] = new Array();
       var index = 0;
       for(j=0;j<binaryImage.width()*3;j+=3)
       {
           if(binaryImage.pixelRow(i)[j]==0)
           {
               imageMatrix[i][index]=1;
           }
           else
           {
               imageMatrix[i][index]=0;
           }
           index++;
       }
       
   }
   console.log(binaryImage.pixelRow(0)[0]);
   binaryImage.save('./tt.jpg');
   console.log(binaryImage.channels());

});
