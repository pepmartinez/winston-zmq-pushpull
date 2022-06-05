const zmq =     require ('zeromq');
const winston = require ('winston');
const fs =      require ('fs-extra');
const path =    require ('path');
const klaw =    require ('klaw');
const toTime =  require ('to-time');
const wdrf =    require ('winston-daily-rotate-file');


class Sink {
  constructor (opts) {
    this._opts = opts || {};
    this._bind = this._opts.bind || 'tcp://0.0.0.0:5558';
    this._base_path = this._opts.base_path || './';
    this._filename = this._opts.filename || 'sink-%DATE%.log';

    this._loggers = {};

    this._parse = this._opts.parse || this._dflt_parse;
    this._log =   this._opts.log   || this._dflt_log;
  }


  ////////////////////////////////////////////////////////
  _dflt_parse (buff) {
    try {
      const obj = JSON.parse (buff.toString ());

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
  _dflt_log (msg, logger) {
    logger [msg.level] (msg);
  }


  ////////////////////////////////////////////////////////
  _logger (class_id) {
    let logger = this._loggers[class_id];

    if (!logger) {
      const dirname = path.join (this._base_path, class_id);
      const fname = path.join (this._base_path, class_id, this._filename);
      fs.ensureDirSync (dirname);

      const transport = new winston.transports.DailyRotateFile({
        filename: fname,
        level: 'silly',
        maxSize: this._opts.max_size || null,
        zippedArchive: true,
        datePattern: 'YYYY-MM-DD'
      });

      const age = toTime (this._opts.max_age || '7d').ms();

      transport.on('rotate', (oldFilename, newFilename) => {
//        console.log (`rotating ${oldFilename} --> ${newFilename}`);
        const now = new Date().getTime ();

        klaw (dirname, {filter: f => f.match (/.*\.gz$/)})
        .on ('data', item => {
          if (! item.stats.isFile ()) return;

          const delta = now - (item.stats.ctimeMs + age);
//          console.log ('klaw [%s]: delta %d', item.path, delta);
          if (delta > 0) {
            fs.unlink (item.path);
//            console.log (`  *** deleting old ${item.path} (${delta})`);
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
  run () {
    const sock = zmq.socket ('pull');
    sock.bindSync (this._bind);

    sock.on ('message', buff => {
      const msg = this._parse (buff);

      if (msg) {
        const logger = this._logger (msg.meta.class_id);
        this._log (msg, logger);
      }
    });
  }
}


module.exports = Sink;
