var express = require('express');
var app = express();
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bodyParser = require('body-parser');
var path = require('path');

//mongoose.connect('mongodb://user:user@ds145168.mlab.com:45168/the_partridge_project');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ 'extended': 'true' }));
app.use(bodyParser.json());

var lobbySchema = new Schema({
	platform: String,
	mode: String,
	player_name: String,
	title: String,
	description: String,
	voice: String
});

var lobbyModel = mongoose.model('lobbyModel', lobbySchema, 'lobbies');

app.get('/api/lobbies', function(req, res) {
	lobbyModel.find(function(err, lobbies) {
		if (err) {
			res.send(err);
		} else {
			res.json(lobbies);
		}
	});
});

app.post('/api/lobbies', function(req, res) {
	lobbyModel.create({
		platform: req.body.platform,
		mode: req.body.mode,
		player_name: req.body.player_name,
		title: req.body.title,
		description: req.body.description,
		voice: req.body.voice
	}, function(err, lobby) {
		if (err) {
			res.send(err);
		} else {
			lobbyModel.find(function(err, lobbies) {
				if (err) {
					res.send(err);
				} else {
					res.json(lobbies);
				}
			});
		}
	});
});

app.delete('/api/lobbies/:lobby_id', function(req, res) {
	lobbyModel.remove({
		_id: req.params.lobby_id
	}, function(err, lobby) {
		if (err) {
			res.send(err);
		} else {
			lobbyModel.find(function(err, lobbies) {
				if (err) {
					res.send(err);
				} else {
					res.json(lobbies);
				}
			});
		}
	});
});

app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, "/public/index.html"));
});

var port = (process.env.PORT || 3000)
//app.listen(8080);
app.listen(port);
console.log('App listening on port', port);