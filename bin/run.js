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
  , runner  = require('../lib/runner')
  , log     = logger.getLogger('run')
  , macro   = path.join( process.cwd(), args.macro )
  , starttime
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
runner(macro, function(e, macro) {
    //TODO final stats
    log[ e ? "error" : "info" ]("Complete in [%ss], with ", (Date.now() - starttime ) / 1000, e || "SUCCESS");
})
