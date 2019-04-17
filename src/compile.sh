#!/bin/sh

# -] delete old files 
rm ../module.js
rm ../module.html
rm ../ElastiGraf_ctrl.js
rm ../ElastiGraf-panel.css
rm ../options.html


# -] copy stuff that needs just to be copied 
cp module.html ../module.html
cp options.html ../options.html
cp ElastiGraf-panel.css ../ElastiGraf-panel.css

# -] convert es5 to es6
babel module-es6.js --out-file module.js
babel ElastiGraf_ctrl-es6.js --out-file ElastiGraf_ctrl.js

# -] move files to destination 
mv module.js ../module.js
mv ElastiGraf_ctrl.js ../ElastiGraf_ctrl.js




