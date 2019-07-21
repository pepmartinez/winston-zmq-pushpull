var zmq =     require ('zeromq');
var winston = require ('winston');
var fs =      require ('fs-extra');
var path =    require ('path');
var klaw =    require ('klaw');
var toTime =  require ('to-time');
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


////////////////////////////////////////////////////////
Sink.prototype._dflt_parse = function (buff) {
  try {
    var obj = JSON.parse (buff.toString ());

    obj.timestamp = obj.timestamp ? new Date (obj.timestamp) : new Date();

    // TODO check schema
    if (!obj.level) obj.level = 'info';

    if (!obj.meta) {
      console.error ('no .meta in ' + obj);
      return null;
    }

    if (!obj.meta.class_id) {
      console.error ('no .meta.class_id in ' + obj);
      return null;
    }

    if (!obj.meta.node_id) {
      console.error ('no .meta.node_id in ' + obj);
      return null;
    }

    if (!obj.message) {
      console.error ('no .message in ' + obj);
      return null;
    }

    return obj;
  }
  catch (e) {
    console.error ('while parsing [' + buff.toString() + ']:', e);
    return null;
  }
}

////////////////////////////////////////////////////////
Sink.prototype._dflt_log = function (msg, logger) {
  logger [msg.level] (msg);
}

////////////////////////////////////////////////////////
Sink.prototype._logger = function (class_id) {
  var logger = this._loggers[class_id];

  if (!logger) {
    var dirname = path.join (this._base_path, class_id);
    var fname = path.join (this._base_path, class_id, this._filename);
    fs.ensureDirSync (dirname);

    var transport = new winston.transports.DailyRotateFile({
      filename: fname,
      level: 'silly',
      maxSize: this._opts.max_size || null,
      zippedArchive: true,
      datePattern: 'YYYY-MM-DD'
    });

    var age = toTime (this._opts.max_age || '7d').ms();

    transport.on('rotate', (oldFilename, newFilename) => {
//      console.log (`rotating ${oldFilename} --> ${newFilename}`)
      var now = new Date().getTime ();

      klaw(dirname, {filter: function (f) {return f.match (/.*\.gz$/);}})
      .on ('data', item => {
        if (! item.stats.isFile ()) return;

        var delta = now - (item.stats.ctimeMs + age);
        if (delta > 0) {
          fs.unlink (item.path);
//          console.log (`  *** deleting old ${item.path} (${delta})`)
        }
      })
      .on ('end', () => {});
    });


    logger = winston.createLogger({
      level: 'silly',
      format: winston.format.printf (msg => {
        return `${msg.timestamp.toISOString()}|${msg.level}|${msg.meta.class_id}@${msg.meta.node_id}|${msg.message}`;
      }),
      transports: [transport]
    });

    this._loggers[class_id] = logger;
  }

  return logger;
}


////////////////////////////////////////////////////////
Sink.prototype.run = function () {
  var sock = zmq.socket ('pull');
  sock.bindSync (this._bind);

  var self = this;

  sock.on ('message', function (buff) {
    var msg = self._parse (buff);

    if (msg) {
      var logger = self._logger (msg.meta.class_id);
      self._log (msg, logger);
    }
  });
}


module.exports = Sink;
