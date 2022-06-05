const os =        require('os');
const _ =         require('lodash');
const zmq =       require('zeromq');
const util =      require('util');
const Transport = require('winston-transport');

const { LEVEL, MESSAGE } = require('triple-beam');

module.exports = class ZeroMQ_PushPull extends Transport {
  constructor(options) {
    super(options);

    this.extra = options.extra;
    this.class_id = options.class_id || 'uncategorized';
    this.node_id = options.node_id || os.hostname ();
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 5558;
    this.hwm = options.hwm || 10000;
    this.overflow = options.overflow || function (d, cb) {console.log (d); cb ();}

    this.sock = zmq.socket('push');
    this.sock.connect (util.format ('tcp://%s:%d', this.host, this.port));
  }

  log (data, callback) {
    if (this.silent) {
      return callback && callback (null, true);
    }

    const metas = {};
    if (this.extra) _.merge (metas, this.extra);

    // add ids
    metas.class_id = this.class_id;
    metas.node_id = this.node_id;

    const self = this;
    const output = JSON.stringify ({
      level: data[LEVEL],
      message: data[MESSAGE],
      meta: metas,
      timestamp: new Date()
    });

    if (this.sock._outgoing.length > this.hwm) {
//      console.log ('HWM passed (%d/%d), drop', this.sock._outgoing.length, this.hwm);
      this.overflow (output, function () {
        self.emit('logged');

        if (callback) {
          callback(null, true);
        }
      });
    }
    else {
      this.sock.send (output);

      self.emit('logged');

      if (callback) {
        callback(null, true);
      }
    }
  }
};

