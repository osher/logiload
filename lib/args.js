var path  = require('path')
  , yargs = 
    require('yargs')
    .usage(
      [ "runs a test scenario for given number of users, with given interval between kickoff of each user"
      , "Synopsis: "
      , "run [-m <macro>] [-t <tag>] [-n <num>] [-i <interval>]"
      ].join("\n")
    ).options(
      { m : 
        { alias    : "macro"
        , describe : "the macro js module to require and run"
        }
      , n : 
        { alias    : "num"
        , describe : "number of users to run"
        , default  : 1
        }
      , a :
        { alias    : "arrive-interval"
        , describe : "interval between start users"
        , type     : "number"
        , default  : 200
        }
      , p :
        { alias    : "sample-interval"
        , describe : "timespan in milliseconds to aggregate stats by"
        , type     : "number"
        , default  : 1000
        }
      , t : 
        { alias    : "tag"
        , describe : "tag name for the test, used in result file names. Default: <basename of macro file>"
        }
      , l : 
        { alias    : "log-level"
        , describe : "log4js level DEBUG|INFO|WARN|ERROR|FATAL"
        , default  : "INFO"
        }
      , r : 
        { alias    : "req-log"
        , describe : "pattern(*) representing a path to write to the request data"
        , default  : "./results/u%n.a%a-%t-req.csv"
        }
      , s : 
        { alias    : "stats-log"
        , describe : "pattern(*) representing a path to write to the gathered stats"
        , default  : "./results/u%n.a%a-%t-stat.csv"
        }
      , L :
        { alias    : "log-path"
        , describe : "pattern(*) representing a path to write the log ingo"
        , default  : "./results/u%n.a%a-%t-run.log"
        }
      }
    ).epilog(
      [ "(*) pattern placeholders"
      , "  %a - num of users"
      , "  %r - arrival interval"
      , "  %p - sample interval"
      , "  %t - timestamp or timestamp+tag when tag is provided"
      ].join("")
    ).demand(
      "macro"
    )
  , patternables = 
    { r : "reqLog"
    , s : "statsLog"
    , L : "logPath"
    }
  ;

module.exports = 
  { from: 
    function(argv) {
        var args = yargs.parse(argv)
          , tag
          , d = new Date()
          ;

        //deduct tag from macro basename
        if (!args.tag) 
             args.tag = 
               path.basename( args.macro );

        //load timestamp on tag
        args.t = 
          args.tag = 
            [ d.getFullYear(),"-",d.getMonth() + 1,"-",d.getDate(),"T"
            , d.getHours()   ,".",d.getMinutes()  ,".",d.getSeconds()
            , "-",args.tag
            ].map( function(n) { return n < 10 ? "0" + n : n } )//2 digits padding
             .join("");

        //resolve patternables
        Object.keys(patternables).forEach(function(k) {
            args[k] = args[ patternables[k] ] = 
               fromPattern(args[k], args)
        });
        
        return args
    }
  , fromPattern: fromPattern
  }

function fromPattern(v, args) {
    return v.replace(/%(.)/g, function(_,p) {
        return args[p];
    })
}