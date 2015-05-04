var async     = require('async')
  , request   = require('request')
  , fs        = require('fs')
  , extend    = require('util')._extend
  , format    = require('util').format
  , log       = require('log4js').getLogger('lib/runner')
  , stepTypes = require('./step-types')
  , Stats     = require('./stats')
  , agentId = 1
  ;

module.exports = fire;

function fire(ctx, done) {
    //TODO: validate ctx!!!
    var macro    = ctx
      , total    = ctx.total
      , interval = ctx.interval
      , expected = 0
      , rid      = 0
      , lastSec  = 0
      , lastRPS  = 0
      , csv      
      , secIntr
      ;
    ctx.agents = [];

    csv = initCsvOutput(ctx);

    //prepare stats bag per step
    ctx.scenario.forEach(function(step) {
        if (step.type != 'req') return;
     
        step.stats = new Stats();

        //stats bag & rid per URL 
        step.results = {};
        step.req.forEach(function(req) {
            req.id    = ++rid;
            req.stats = new Stats()
        })
    });

    macro.fired     = 0;
    macro.sec       = lastSec = 0;
    macro.starttime = Date.now();

    secIntr = setInterval(
      function() {
           log.info( "RPS:" , lastRPS = macro.fired );
           csv.write( format("%s,%s\n", lastRPS, macro.sec) );
           macro.fired = 0;
           lastSec = macro.sec++
      }
    , 1000
    );
    
    macro.onRequest = function() {
        macro.fired++;
    }

    macro.onResult = function(rslt) {
        csv.write( 
          format(",%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n"
          , macro.sec, rslt.aid, rslt.step, rslt.rid, rslt.dur, rslt.statusCode, rslt.url, rslt.error, rslt.starttime, rslt.endtime
          ) 
        )
    }


    async.whilst(
      function() {
          if (total)
              log.debug("%s more agent(s) to go", total);

          return total--;
      }
    , function(next) {
          var agent = 
              run_user(ctx
              , function() { 
                    if (--expected) 
                        return log.info("[a#%s] - finished. expecting %s more agents to finish", agent.id );

                    clearInterval(secIntr);

                    csv.end();
                    done()
                } 
              )
            ;
          ctx.agents.push( agent );
          ++expected;
          setTimeout(next, interval)         
      }
    , function(e) {
          e 
            ? log.error("error while firing agent [%s]", ctx.total - total, e)
            : log.info("\n\nALL FIRED\n\n") 
      }
    )
}

function run_user(macro, fFinished) {
    var agent = 
        { id     : agentId++
        , jar    : request.jar()
        , stats  : new Stats()
        , params : extend({}, macro.params)
        , results: []
        }
      ;
    macro.agents.push(agent);

    async.eachSeries( macro.scenario
    , function(step, next) { 
          step.starttime = Date.now();
          stepTypes[ step.type ]( 
            { agent: agent
            , step : step
            , macro: macro
            }
          , next 
          );
      }
    , function(e) { 
          var stats = 
              macro.scenario.reduce( function(stats, step) { 
                  if (step.type != "req") return stats;

                  stats.count++;
                  stats.sum += step.stats.avg;
                  stats.max = Math.max(stats.max, step.stats.max) ;
                  stats.min = Math.min(stats.min, step.stats.min) ;

                  return stats;
              }, { avg: 0, max: 0, min: 9999999, count: 0, sum: 0 } )
            ;
          
          stats.avg = stats.sum / stats.count;
          delete stats.sum;
          delete stats.count;

          log[e?"error":"info"]( "[a#%s] - finished with %s, stats: ", agent.id, e ? e.message : "SUCCESS", stats);

          fFinished(e);
      }
    )

    return agent;
}

function initCsvOutput(ctx) {
    var exists = fs.existsSync( ctx.csv )
      , csv
      ;

    csv = fs.createWriteStream(ctx.csv, {'flags': 'a'});
    if (!exists) 
        csv.write("sec-id,RPS,agent-id,step-name,req-id-in-step,dur,status-code,url,hard-error,start-time,end-time\n");
    else
        log.warn("appending to an existing file: ", ctx.csv);

    return csv
    
}