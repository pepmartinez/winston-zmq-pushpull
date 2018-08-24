
var winston = require('winston');

var TR =   require('../').Transport;
var Sink = require('../').Sink;

var sink = new Sink ({max_files: 7, max_size:10000});
sink.run ();

var logger1 = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.simple()
  ),
  transports: [
    new TR ({ 
      level: 'info',
      host: '127.0.0.1',
      port: 5558,
      timestamp: true,
      class_id: 'example-1',
      node_id: 'l1',
      extra: {
        x1: 'qwertyuiop',
        x2: 666
      }
    })
  ]
});

setInterval (function () {
  logger1.info ('logging... %s %d %j', 'ggg', 666, {a:1,b:2}, {extra:0});
}, 100);


var logger2 = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.simple()
  ),
  transports: [
    new TR ({ 
      level: 'info',
      host: '127.0.0.1',
      port: 5558,
      timestamp: true,
      class_id: 'example-1',
      node_id: 'l2',
      extra: {
        x1: 'qwertyuiop',
        x2: 666
      }
    })
  ]
});

setInterval (function () {
  logger2.info ('l0gg1ng... %s %d %j', 'hhh', 222, {a:9,b:8}, {extra:1});
}, 110);
