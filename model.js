var mongoose = require('mongoose')
,   Schema = mongoose.Schema
,	ObjectId = Schema.ObjectId
;


var UserSchema = new Schema({
    uid 			: { type: String, required: true, unique: true, trim: true }
,   name 			: { type: String, required: true, trim: true}
,	date 			: { type: Date, default: Date.now }
,	location    	: {
		longitude 	: { type: String, trim: true }
	,	latitude 	: { type: String, trim: true }
	}
,	activity		: { type: String, default: null, trim: true }
, 	matching 		: { type: Boolean, default: false }
});

var GroupSchema = new Schema({
	date 			: { type: Date, default: Date.now }
,	users 			: [String]
});


exports.User 	= mongoose.model('User', UserSchema);
exports.Group 	= mongoose.model('Group', GroupSchema);