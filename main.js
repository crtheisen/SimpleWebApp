var redis = require('redis')
var multer  = require('multer')
var express = require('express')
var fs      = require('fs')
var app = express()
// REDIS
var args = process.argv.slice(2);
var PORT = args[0];
var REDIS_PORT = args[1];
var OTHER_PORT = args[2];
var client = redis.createClient(REDIS_PORT, '127.0.0.1', {})
var other_client = redis.createClient(OTHER_PORT, '127.0.0.1', {})
var config = require('./config.json');

///////////// WEB ROUTES

var stack = [];

// HTTP SERVER
var server = app.listen(PORT, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})

var stack = [];
// Add hook to make it easier to get all visited URLS.
app.use(function(req, res, next)
{
	console.log(req.method, req.url);

	stack.push(req.url);       // stack is now [2]
	if (stack.length == 6)
	{
		stack.shift();
	}

	next(); // Passing the request to the next handler in the stack.
});

app.get('/', function(req, res) {
  res.send('hello world')
})

app.get('/set', function(req, res) {
	{
		client.set("expiryKey", "This message will self destruct in 5 seconds");
		res.send('expiring message created!');
		client.expire("expiryKey", "5")
	}
})

app.get('/get', function(req, res) {
	{
		client.get("expiryKey", function(err,value){ res.send(value)});
	}
})

app.get('/recent', function(req, res) {
	{
		res.send("History: " + stack);
	}
})

app.get('/flushall', function(req, res) {
	{
		client.flushall();
    stack = [];
    images = [];
	}
})

app.post('/upload',[ multer({ dest: './uploads/'}), function(req, res){
   console.log(req.body) // form fields
   console.log(req.files) // form files

   if( req.files.image )
   {
	   fs.readFile( req.files.image.path, function (err, data) {
	  		if (err) throw err;
	  		var img = new Buffer(data).toString('base64');
	  		client.rpush("imgs",img);
	  		if(config.mirroring === true) {
	  			console.log("Mirroring Active!");
	  			other_client.rpush("imgs",img);
	  		}
		 });
   }

   res.status(204).end();
}]);

app.get('/meow', function(req, res) {
{
   client.rpop("imgs", function(err,value){
       if (err) throw err;
       if (!value) {
	       res.send("Empty!");
       } else {
	       res.writeHead(200, {'content-type':'text/html'});
	       res.write("<h1>\n<img src='data:my_pic.jpg;base64,"+value+"'/>");
	       res.end();
   	   }
   });
 }
});

//Shorthand version of turn taking load balancer from:
//https://github.com/nodejitsu/node-http-proxy/blob/master/examples/balancer/simple-balancer.js

// var http = require('http'),
//     httpProxy = require('http-proxy');
//
// var myProxy = httpProxy.createServer();
//
// http.createServer(function (req, res) {
//
//   var nextPort = ports.shift();
//   var target = { target: {host: 'localhost', port:nextPort} };
//
//   console.log('balancing request to: ', target);
//   myProxy.web(req, res, target);
//
//   ports.push(nextPort);
// }).listen(8080);
