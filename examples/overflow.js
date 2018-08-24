
var winston = require('winston');

var TR =   require('../').Transport;

var logger = winston.createLogger({
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
  logger.info ('logging... %s %d %j', 'ggg', 666, {a:1,b:2}, {extra:0});
}, 100);

