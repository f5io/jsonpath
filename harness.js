/**
 * @description Test Harness
 */
require('babel-register');
const glob = require('glob');
const path = require('path');

process.argv.slice(2).forEach(function(arg) {
  glob(arg, function(err, files) {
    if (err) throw err;
    files.forEach(function(file) {
      require(path.resolve(process.cwd(), file));
    });
  });
});
