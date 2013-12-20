var express = require('express')
,	mongoose = require('mongoose')
,   http = require('http')
,   path = require('path')
,   async = require('async')
,   validator = require('validator').check
,   sanitize = require('validator').sanitize
,   config = require('./config')
,   model = require('./model')
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


//app.get('/', routes.index);
//app.get('/users', user.list);

/*
app.get('/', function() {

});
*/


var renderResults = function(req, res) {
	return function(err, results) {
		if (err) return res.send({status: '[Error] ' + err});

		res.send(results[0]);
	};
}

/*
GET /users
*/
app.get('/users', function(req, res) {
	async.series([
		function (callback) {
			console.log('[GET] /users');
			model.User.find(callback);
		}
	], renderResults(req, res));
});

/*
GET /user/:uid
*/
app.get('/user/:uid', function(req, res) {
	var uid = req.params.uid;
	async.series([
		function (callback) {
			if (!(validator(uid).notNull() && validator(uid).notEmpty())) 
				callback('Invalid uid - null or empty:' + uid);

			console.log('[GET] /user/' + uid);
			model.User.findOne({uid: uid}, '-_id -__v', callback);
		}
	], renderResults(req, res));
});


/*
POST /user
uid=<uid>
name=<name>
*/
app.post('/user', function(req, res) {
	/* TODO: if login */
	var uid = req.body.uid;
	var name = req.body.name;
	async.series([ 
	    function(callback) {
			if (!(validator(uid).notNull() && validator(uid).notEmpty()))
				callback('Invalid uid - null or empty: ' + uid);
			if (!(validator(name).notNull() && validator(name).notEmpty()))
				callback('Invalid name - null or empty: ' + name);

			console.log('[POST] /user: id=' + uid + '&name=' + name);
			model.User.create({uid: uid, name: name}, function(err, user) {
				if (err) return callback(err);

				callback(null, {status: 'success'});
			});
		}
	], renderResults(req, res));
});

/*
POST /user/:uid
longitude=<longitude>
latitude=<latitude>
activity=<activity>
matching=<match>
*/
app.post('/user/:uid', function(req, res) {
	var uid = req.params.uid;
	var lng = req.body.longitude;
	var lat = req.body.latitude;
	var activity = req.body.activity;
	var matching = req.body.matching;

	async.series([
	    function (callback) {
			if (!(validator(uid).notNull() && validator(uid).notEmpty()))
				return callback('Invalid uid - null or empty: ' + uid);

			console.log('[POST] /user/' + uid + ': ');
			callback(null, {status: 'success'});
	    }
	,	function (callback) {
			if (!((lng && validator(lng).notNull()) && (lat && validator(lat).notNull())))
				return callback(null, {status: 'success'});

			console.log('longitude=' + lng + '&latitude=' + lat);
			model.User.update({uid: uid}, {location: {longitude: lng, latitude: lat}}, function (err, count, raw) {
				if (err) return callback(err);

				callback(null, {status: 'success'});
			});
		}
	,   function (callback) {
			if (!(activity && validator(activity).notNull()))
				return callback(null, {status: 'success'});

			console.log('activity='+activity);
			model.User.update({uid: uid}, {activity: activity}, function (err, count, raw) {
				if (err) return callback(err);

				callback(null, {status: 'success'});
			});
		}
	,	function (callback) {
			if (!(matching && validator(matching).notNull()))
				return callback(null, {status: 'success'});

			matching = sanitize(matching).toBoolean();
			console.log('matching='+matching);
			model.User.update({uid: uid}, {matching: matching}, function (err, count, raw) {
				if (err) return callback(err);

				callback(null, {status: 'success'});
			});
		}
	], renderResults(req, res));
});

app.get('/match/:uid', function(req, res) {
	var uid = req.params.uid;

	var handler = renderResults(req, res);

	if (!(validator(uid).notNull() && validator(uid).notEmpty()))
		return handler('Invalid uid - null or empty: ' + uid);

	console.log('[GET] /match/' + uid + ': ');

	var createGroupTasks = [
		function findUserById(callback) {

			model.User.findOne({uid: uid}, callback);
		}
	,	function findUsersByActivityAndMatching (user, callback) {
			if (!user)
				return callback('Invalid uid - not exist: ' + uid);
			var activity = user.activity;

			console.log('activity='+activity);
			model.User.find({activity: activity, matching: true/*, uid: {$ne: uid}*/}, 'uid -_id', callback);
		}
	, 	function retrieveUidsAndMark (users, callback) {
			console.log('users='+ JSON.stringify(users));

			if (!users || users.length < 2)
				return callback('Mis-match');

			var tasks = [];
			var uids = [];
			async.each(users, function(user, end) {
				console.log('Query uid: ' + user.uid);
				uids.push(user.uid);
				model.User.findOneAndUpdate({uid: user.uid}, {matching: false}, function (err, U) {
					if (err) return end(err);
				});
				end(null);
			}, function (err) {
				if (err) callback(err);
			});

			callback(null, uids);
		}
	,   function createGroup (uids, callback) {
			// create a new group given a list of matched user
			model.Group.create({users: uids}, function (err, group) {
				if (err) return callback(err);

				callback(null, [{gid: group._id}]);
			});
		}
	];


	// check if uid already exists in a group
	model.Group.findOne({users: {$in: [uid]}}, function (err, group) {
		if (err) return handler(err);

		if (group) {
			console.log('Group ' + group._id + ' contains ' + uid);
			//return handler(null, [{gid: group._id}]);
			async.series([
				function removeUserFromGroup (callback) {
					model.Group.findOneAndUpdate({_id: group._id}, {$pull: {users: uid}}, function (err, group){
						if (err) return callback('Remove user: ' + uid);

						console.log('Successfully remove user ' + uid + ' from group: ' + group._id);
						callback(null);
					});
				}
			,	function removeAllGroupsLessThanTwo (callback) {
					model.Group.find({}, {users: {$size: {$lt: 2}}}).remove(function (err, group) {
						if (err) return callback('Remove group of size < 2');

						console.log('Successfully remove all empty groups');
						callback(null);
					});
				}
            ]);
		}
		async.waterfall(createGroupTasks, handler);
	});
});

app.get('/group/:gid', function(req, res) {
	var gid = req.params.gid;

	var handler = renderResults(req, res);
	if (!(validator(gid).notNull() && validator(gid).notEmpty()))
		return handler('Invalid gid - null or empty: ' + gid);

	console.log('[GET] /group/' + gid);

	async.waterfall([
		function findGroup(callback) {
			// TODO: might be error using string to query ObjectId
			model.Group.findOne({_id: gid}, function (err, group) {
				if (err) return callback(err);
				if (!group) return callback('Invalid gid - not exist');
				callback(null, group);
			});
		}
	,	function findAllUsersInGroup(group, callback) {
			model.User.find({uid: {$in: group.users}}, '-__v -_id', function (err, users) {
				if (err) return callback(err);

				callback(null, [users]);
			});
		}
    ], handler);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
