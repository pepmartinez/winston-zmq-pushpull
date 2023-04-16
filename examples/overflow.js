
var winston = require('winston');

var TR =   require('../').Transport;

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
      class_id: 'example-2',
      node_id: 'l1',
      extra: {
        x1: 'qwertyuiop',
        x2: 666
      }
    })
  ]
});


let c = 0;
setInterval (function () {
  logger1.info ('logging... %s %d %j', 'ggg', c++, {a:1,b:2}, {extra:0});
  logger2.info ('logging... %s %d %j', 'ggg', c++, {a:1,b:2}, {extra:0});
}, 100);

