var fs  = require('fs')
  , LOG = require('log4js').getLogger("lib/csv-output")
  ;
module.exports = factory;
LOG.debug("module loaded");

function factory(options) {
    //TODO - input checks
    var filename = options.path
      , exists   = fs.existsSync( options.path )
      , fields   = Object.keys(options.columns)
      , log      = options.log || LOG
      , l        = fields.length - 1//TRICKY: minus last iteration, used in write row function
      , csv
      ;

    log.debug("initiating file: %j", options);

    csv = fs.createWriteStream(filename, { flags: 'a' });
    if (!exists)
        csv.write( fields.map(function(c) { return options.columns[c] }).join(",") + "\n" );
    else
        log.warn("[%s] - already exists - appending.", filename);

    log.info("[%s] - opened" , filename);

    return {
      write:
      function csv_writeRow(rslt,cb) {
          var i, f;
          log.debug("[%s] - writing row: %j", filename, rslt );
          for (i = 0; i < l; i++ ) {
              f = fields[i];
              csv.write(f in rslt ? String(rslt[ f ]) : "");
              csv.write(",");
          }
          csv.write(String(rslt[ fields[i] ] || ""));
          csv.write("\n",cb)
      }
    , end:
      function csv_end(msg,cb) {
          log.info("[%s] - closing" , filename);
          csv.end(msg,cb)
      }
    }
}