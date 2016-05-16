#!/usr/bin/env node
var logger  = require('log4js')
  , args    = require('../lib/args').from(process.argv)
  ;
logger.configure(
  { levels: 
    { "[all]" : args.logLevel 
    }
  , appenders : 
    [ { type: "console" 
      } 
    ]
  }
);

var path    = require('path')
  , o       = require('o-core')
  , log     = logger.getLogger('run')
  , macro   = path.join( process.cwd(), args.macro )
  , starttime
  , runner
  ;

log.info("loading macro: ", macro);

//load macro file synchronously
try {
    macro  = require(macro);
} catch (ex) {
    log.fatal("cannot find macro [%s]\nLooking in folder: [%s]", args.macro, macro );
    return process.exit(1)
}

//merge execution options
if (!macro.options) 
    macro.options = {};
o.merge(macro.options, args);

log.debug( "effective options: ", macro.options );

starttime = Date.now();
runner = require('../lib/runner')(macro, function(e, macro) {
    //TODO final stats
    log[ e ? "error" : "info" ]("Complete in [%ss], with ", (Date.now() - starttime ) / 1000, e || "SUCCESS");
    log.info("stats:\n", macro.stats);
    if (macro.stats.errored) log.warn("Counted total of [%s] errors", macro.stats.errored);
});

process.on('SIGINT' , runner.stop );
process.on('SIGTERM', runner.stop );
