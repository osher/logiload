var logger  = require('log4js')
  , log     = logger.getLogger('run')
  , args    = 
    require('yargs')
    .options(
      { m : 
        { alias    : "macro"
        , describe : "the macro js module to require and run"
        , default  : "./macros/macro"
        }
      , t : 
        { alias    : "total"
        , describe : "total times the scenario should run"
        , default  : 1
        }
      , c :
        { alias    : "csv"
        , describe : "path to output CSV results"
        , default  : "./results/reqStats.csv"
        }
      , l : 
        { alias    : "log-level"
        , describe : "log4js default level DEBUG|INFO|WARN|ERROR|FATAL"
        , default  : "INFO"
        }
      }
    )
    .argv
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

var runner = require('./lib/runner')
  , path    = require('path')
  , fs      = require('fs')
  , macro   = path.join( process.cwd(), args.macro )
  ;

try {
    macro  = require(macro);
} catch (ex) {
    console.log("cannot find macro [%s]\nLooking in folder: [%s]", args.macro, macro );
    process.exit(1);
}

macro.total = args.total;
macro.csv   = args.csv;

runner(macro, function(e) {
    //TODO final stats
})
