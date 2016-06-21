var argv = require('minimist')(process.argv.slice(2));
var ProcessImages = require('../libs/ProcessImages.js');

//example callback
//node bin/image_process2 -p ~/Pictures/DSC_0017.jpg
//node bin/image_process2 -p ~/Pictures/DSC_0017.jpg -o resize
var imagePath = argv.p || argv.path;
var op = argv.o || argv.operation || null;

new ProcessImages(imagePath).process(op,function(err,filePaths) {
  if (process.send) return process.send({error:err, paths:filePaths});
  console.log(err,filePaths);
});
