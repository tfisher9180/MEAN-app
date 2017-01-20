var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var path = require('path');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ 'extended': 'true' }));
app.use(bodyParser.json());

app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, "/public/index.html"));
});

var port = (process.env.PORT || 3000)
//app.listen(8080);
app.listen(port);
console.log('App listening on port', port);