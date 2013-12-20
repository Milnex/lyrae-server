var express = require('express')
,	mongoose = require('mongoose')
,   http = require('http')
,   path = require('path')
,   validator = require('validator').check
,   sanitize = require('validator').sanitize
,   config = require('./config')
,   model = require('./model')
//,   routes = require('./routes')
//,   user = require('./routes/user')
;

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}



// database
mongoose.connect(config.db_path);
var db = mongoose.connection;
db.on('error', console.error.bind(console, '[mongodb]'));
db.once('open', function () {

});


app.get('/', routes.index);
//app.get('/users', user.list);

/*
app.get('/', function() {

});
*/


/*
GET /users
*/
app.get('/users', function(req, res) {
	model.User.find(function(err, users) {
		if (err) return res.send({status: err});

		console.log('[GET] /users');
		res.send(users);
	});
});

/*
GET /user/:id
*/
app.get('/user/:id', function(req, res) {
	var uid = req.params.id;
	if (validator(uid).notNull() && validator(uid).notEmpty()) {
		//
		model.User.findOne({uid: uid}, function(err, user) {
			if (err) return res.send({status: err});

			console.log('[GET] /user/' + uid + ': ' + user);
			res.send(user);
		});
	}
	else {
		res.send({status: 'error'});
	}
});


/*
POST /user
id=<uid>
name=<name>
*/
app.post('/user', function(req, res) {
	/* if login */
	var uid = req.body.id;
	var name = req.body.name;
	if (validator(uid).notNull() && validator(uid).notEmpty() && validator(name).notNull() && validator(name).notEmpty()) {
		model.User.create({uid: uid, name: name}, function(err, user) {
			if (err) return res.send({status: err});

			console.log('[POST] /user: ' + uid);
			res.send({status: 'success'});
		});
	}
	else
		res.send({status: 'error'});
});

/*
POST /user/:id
lng=<longitude>
lat=<latitude>
activity=<activity>
matching=<match>
*/
app.post('/user/:id', function(req, res) {
	var uid = req.params.id;
	var lng = req.body.lng;
	var lat = req.body.lat;
	var activity = req.body.activity;
	var matching = sanitize(req.body.matching).toBoolean();

	if (validator(uid).notNull() && validator(uid).notEmpty()) {
		if (lng && validator(lng).notNull() && lat && validator(lat).notNull()) {
			model.User.update({uid: uid}, {location: {lng: lng, lat: lat}}, {upsert: true}, function (err, count, raw) {
				if (err) return res.send({status: err});

				res.send({status: 'success'});
			});
		}
		if (activity && validator(activity).notNull()) {
			model.User.update({uid: uid}, {activity: activity}, {upsert: true}, function (err, count, raw) {
				if (err) return res.send({status: err});

				res.send({status: 'success'});
			});
		}
		if (validator(matching).notNull()) {
			model.User.update({uid: uid}, {matching: matching}, {upsert: true}, function (err, count, raw) {
				if (err) return res.send({status: err});

				res.send({status: 'success'});
			});
		}
	}
	else
		res.send({status: 'error'});
});

app.get('/match/:id', function(req, res) {
	var uid = req.params.id;
	if (validator(uid).notNull() && validator(uid).notEmpty()) {
		model.User.findOne({uid: uid}, function (err, user) {
			if (err) return res.send({status: err});

			var activity = user.activity;
			model.User.find({activity: activity, matching: true, uid: {$ne: uid}}, function (err, users) {
				if (err) return res.send({status: err});

				console.log('[GET] /match/' + uid + ' activity=' + activity + ': ' + users);
				res.send(users);
			});
		});
	}
	else {
		res.send({status: 'error'});
	}
});

app.get('/group/:id', function(req, res) {
	var gid = req.params.id;
	if (validator(gid).notNull() && validator(gid).notEmpty()) {
		model.Group.findOne({gid: gid}, function(err, group) {
			if (err) return res.send({status: err});
			console.log('[GET] /group/' + gid);
			res.send(group);
		});
	}
	else {
		res.send({status: 'error'});
	}
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
