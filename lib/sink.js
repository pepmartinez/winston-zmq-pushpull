var zmq =     require ('zmq');                                                                                                                                                                               
var winston = require ('winston');                                                                                                                                                                                
var fs =      require ('fs-extra');
var path =    require ('path');
var wdrf =    require ('winston-daily-rotate-file');


function Sink (opts) {
  this._opts = opts || {};
  this._bind = this._opts.bind || 'tcp://0.0.0.0:5558';
  this._base_path = this._opts.base_path || './';
  this._filename = this._opts.filename || 'sink-%DATE%.log';

  this._loggers = {};

  this._parse = this._opts.parse || this._dflt_parse;
  this._log =   this._opts.log   || this._dflt_log;
}

Sink.prototype._dflt_parse = function (buff) {
  var obj = JSON.parse (buff.toString ());
  obj.timestamp = new Date (obj.timestamp);
  return obj;
}

Sink.prototype._dflt_log = function (msg, logger) {
  logger [msg.level] (msg);
}

Sink.prototype._logger = function (class_id) {
  var logger = this._loggers[class_id];

  if (!logger) {
    var fname = path.join (this._base_path, class_id, this._filename);
    fs.ensureDirSync (path.join (this._base_path, class_id));

    logger = winston.createLogger({
      level: 'silly',
      format: winston.format.printf (msg => {
        return `${msg.timestamp.toISOString()}|${msg.level}|${msg.meta.class_id}@${msg.meta.node_id}|${msg.message}`;
      }),
      transports: [
        new winston.transports.DailyRotateFile({           
          filename: fname,
          level: 'debug',
          maxFiles: this._opts.max_files || 5,
//          tailable: true,
//          zippedArchive: true,
          datePattern: 'YYYYMMDD'
        }),
      ]
    });

    this._loggers[class_id] = logger;
  }

  return logger;
}


Sink.prototype.run = function () {
  var sock = zmq.socket ('pull');
  sock.bindSync (this._bind);

  var self = this;

  sock.on ('message', function (buff) {
    var msg = self._parse (buff);
    var logger = self._logger (msg.meta.class_id);
    self._log (msg, logger);
  });
}


module.exports = Sink;
