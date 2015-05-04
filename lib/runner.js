var async     = require('async')
  , request   = require('request')
  , log       = require('log4js').getLogger('lib/runner')
  , stepTypes = require('./step-types')
  , Stats     = require('./stats')
  , agentId = 1
  ;

module.exports = fire;

function fire(ctx, done) {
    //TODO: validate ctx!!!
    var total    = ctx.total
      , interval = ctx.interval
      , expected = 0
      , rid      = 0
      ;
    ctx.agents = [];

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
        { id   : agentId++
        , jar  : request.jar()
        , stats: new Stats()
        , results: []
        }
      ;
    macro.agents.push(agent);

    macro.fired     = 0;
    macro.starttime = Date.now();

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


