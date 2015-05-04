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
  , format  = require('util').format
  , path    = require('path')
  , fs      = require('fs')
  , macro   = path.join( process.cwd(), args.macro )
  , csv     = fs.createWriteStream(args.csv, {'flags': 'a'})
  ;

try {
    macro  = require(macro);
} catch (ex) {
    console.log("cannot find macro [%s]\nLooking in folder: [%s]", args.macro, macro );
    process.exit(1);
}

csv.write("agent-id,step-name,req-id-in-step,dur,status-code,url,hard-error,start-time,end-time\n");

macro.total = args.total;

macro.onResult = function(rslt) {
    csv.write( format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n", rslt.aid, rslt.step, rslt.rid, rslt.dur, rslt.statusCode, rslt.url, rslt.error, rslt.starttime, rslt.endtime) );
}

runner(macro, function(e) {
    //TODO final stats

    csv.end();
})
