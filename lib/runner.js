var async     = require('async')
  , request   = require('request')
  , fs        = require('fs')
  , extend    = require('util')._extend
  , format    = require('util').format
  , log       = require('log4js').getLogger('lib/runner')
  , stepTypes = require('./step-types')
  , Stats     = require('./stats')
  , csvFcty   = require('./csv-output')
  , agentId   = 1
  ;

module.exports = runner_run;

function runner_run(ctx, done) {

    //TODO: validate ctx!!!

    var macro     = ctx
      , total     = ctx.options.num
      , arrivIntr = ctx.options.arriveInterval
      , samplIntr = ctx.options.sampleInterval
      , bail      = !!ctx.options.bail
      , rid       = 0 //rid = request id
      , sid       = 0 //sid = step id
      , lastRPS   = 0 //Request Per Second
      , csvStats
      , csvReq
      , secIntrv
      ;

    ctx.agents = [];
    ctx.byUrl = {};

    //prepare stats bag per step
    ctx.scenario.forEach(function(step) {
        step.id = ++sid;
        if (step.type != 'req') return;
     
        step.stats = new Stats();

        //stats bag & rid per request-info 
        step.results = {};
        step.req.forEach(function(reqInfo) {
            reqInfo.id    = ++rid;
            reqInfo.stats = new Stats();
            if (!('bail' in reqInfo)) reqInfo.bail = bail;
        })
    });

    macro.samples = [];
    nextSample();

    macro.stats = newMacroStats();
    macro.stats.started = 0;
    macro.stats.expected = 0;
    macro.stats.finished = 0;
    macro.stats.returned = 0;

    macro.sid =  0;
    macro.starttime = new Date();

    //init CSV output
    csvReq = 
      csvFcty(
        { path    : ctx.options.reqLog
        , columns : 
          { sid       : "s-id"
          , aid       : "agent-id"
          , step      : "step-name"
          , rid       : "req-id-in-step"
          , dur       : "duration"
          , statusCode: "status-code"
          , error     : "error"
          , url       : "url"
          , starttime : "start-time"
          , endtime   : "end-time"
          }
        }
      );

    csvStats = 
      csvFcty(
        { path: ctx.options.statsLog
        , columns: 
          { sid         : "sample-id"             //macro.sample.sid
          , reqPS       : "Req/sec in sample"     //macro.sample.fired    / ( samplIntr / 1000 )
          , retPS       : "Ret/sec in sample"     //macro.sample.returned / ( samplIntr / 1000 )
          , sTime       : "Req dur in sample"     //macro.sample.avg
          , errored     : "Err in sample"         //macro.sample.errored
          , resTime     : "Req dur"               //macro.stats.avg
          , users_conc  : "conc. users"           //macro.stats.expected  ==>> macro.stats.started - macro.stats.finished
          , reqcount    : "conc. requests"        //macro.stats.fired   - macro.stats.returned
          , smplstarted : "sent in sample"        //macro.sample.started
          , smpldone    : "exitted in sample"     //macro.sample.finished
          , userstarted : "sent users"            //macro.stats.started
          , usersdone   : "exitted users"         //macro.stats.finished
          , fired       : "fired in sample"       //macro.sample.fired
          , returned    : "returned in sample"    //macro.sample.returned 
          , errorcount  : "total req. err"        //macro.stats.errored
          , firecount   : "total req. fired"      //macro.stats.fired
          , returncount : "total req. returned"   //macro.stats.returned
          }
        }
      );

    macro.onRequest = function() {
        macro.sample.fired++;
        macro.stats.fired++;
    }

    macro.onResult = function(rslt) {
        macro.sample.returned++;
        macro.stats.returned++;

        macro.sample.gather(rslt.dur);
        macro.stats.gather(rslt.dur);

        rslt.sid = macro.sample.sid;
        rslt.starttime /= 1000;
        rslt.endtime   /= 1000;

        csvReq.write( rslt );

        if (rslt.error) {
            macro.sample.errored++;
            macro.stats.errored++;
        }

    }

    secIntrv = setInterval(
      function() {
         dumpStatsRow();
         nextSample();
      }
    , samplIntr
    );

    async.whilst( 
      function() {
          if (total)
              log.debug("%s more agent(s) to go", total);

          return total--;
      }
    , agent_start 
    , function(e) {
          e 
            ? log.error("error while firing agent [%s]", ctx.total - total, e)
            : log.info("\n\nALL FIRED\n\n") 
      }
    );


    function agent_start(next) {
        var agent = run_user(ctx
          , function agent_finished(e) { 
                //TODO - check if to restart the user
                //if (testDur && ) {
                //}

                if (--macro.stats.expected) 
                    return log.info("[a#%s] - finished. expecting %s more agents to finish", agent.id );

                cleanup(done);
            } 
          );

        setTimeout(next, arrivIntr)
    }


    //called upon interval
    function dumpStatsRow(f) {
        var s = 
          { sid         : macro.sample.sid                             || 0
          , reqPS       : macro.sample.fired / (samplIntr / 1000)      || 0
          , retPS       : macro.sample.returned / (samplIntr / 1000)   || 0
          , sTime       : macro.sample.avg                             || 0
          , errored     : macro.sample.errored                         || 0
          , resTime     : macro.stats.avg                              || 0
          , users_conc  : macro.stats.expected                         || 0
          , reqcount    : macro.stats.fired - macro.stats.returned     || 0
          , smplstarted : macro.sample.started                         || 0
          , smpldone    : macro.sample.finished                        || 0
          , userstarted : macro.stats.started                          || 0
          , usersdone   : macro.stats.finished                         || 0
          , fired       : macro.sample.fired                           || 0
          , returned    : macro.sample.returned                        || 0
          , errorcount  : macro.stats.errored                          || 0
          , firecount   : macro.stats.fired                            || 0
          , returncount : macro.stats.returned                         || 0
          }
        ;
        log.info("ReqPS: [%s], RetPS: [%s], avg Req. dur: [%s]", s.reqPS, s.retPS, s.sTime);
        csvStats.write(s , f);
    }

    //called after last agent has finished scenario or bailed
    function cleanup(done) { 

        log.info("cleanup...");

        //clear interval
        clearInterval(secIntrv);

        //dump & close csvs 
        async.waterfall( 
          [ dumpStatsRow
          , csvStats.end
          , csvReq.end
          ]
        , function(e) {
              done(e, macro) 
          }
        )
    }

    //creates a bag for the samples, and for the overal stats
    function newMacroStats() {
        return  extend( new Stats(), {
          fired    : 0
        , returned : 0
        , started  : 0
        , finished : 0
        , errored  : 0
        })
    }

    function nextSample() {
        macro.sample = newMacroStats();

        //TODO - skip keeping samples for very big tests
        macro.samples.push(macro.sample);

        macro.sample.sid = macro.samples.length;
    }
}

function run_user(macro, fFinished) {
    var agent = 
        { id     : agentId++
        , jar    : request.jar()
        , stats  : new Stats()
        , params : extend({}, macro.options.params)
        }
      ;
  
    //on agent-start
    ++macro.stats.expected;
    ++macro.stats.started;
    ++macro.sample.started;

    log.debug("[%s] - constructed", agent.id);5/7/2015

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

          //on agent-finish
          ++macro.stats.finished;
          ++macro.sample.finished;
          //TODO: count the brutally errored users

          log[e?"error":"info"]( "[a#%s] - finished with %s, stats: ", agent.id, e ? e.message : "SUCCESS", stats);

          fFinished(e);
      }
    )

    return agent;
}