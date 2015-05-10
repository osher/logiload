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

module.exports = fire;

function fire(ctx, done) {
    //TODO: validate ctx!!!
    var macro     = ctx
      , total     = ctx.options.num
      , arrivIntr = ctx.options.arriveInterval
      , samplIntr = ctx.options.sampleInterval
      , bail      = !!ctx.options.bail
      , rid       = 0 //rid = request id
      , lastSid   = 0 //sid = sample-id
      , lastRPS   = 0 //Request Per Second
      , csvStats
      , csvReq
      , secIntrv
      ;
    ctx.agents = [];

    //prepare stats bag per step
    ctx.scenario.forEach(function(step) {
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
    macro.stats.expected = 0;

    macro.sid       = lastSid = 0;
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
          { sid         : "s-id"                  //macro.sample.sid
          , fired       : "fired in sample"       //macro.sample.fired
          , reqPS       : "Req/sec"               //macro.sample.fired    / ( samplIntr / 1000 )
          , returned    : "returned in sample"    //macro.sample.returned 
          , retPS       : "Ret/sec"               //macro.sample.returned / ( samplIntr / 1000 )
          , users_conc  : "conc. users"           //macro.stats.started - macro.stats.finished
          , userstarted : "sent users"            //macro.stats.started
          , usersdone   : "exitted users"         //macro.stats.finished
          , reqcount    : "conc. requests"        //macro.stats.fired   - macro.stats.returned
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

        rslt.sid = macro.sample.sid;
        rslt.starttime /= 1000;
        rslt.endtime   /= 1000;

        csvReq.write( rslt );
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
    , function(next) {
          var agent = 
              run_user(ctx
              , function(e) { 
                    //TODO: count brutally errored users
                    if (--macro.expected) 
                        return log.info("[a#%s] - finished. expecting %s more agents to finish", agent.id );

                    cleanup(done);
                } 
              )
            ;
          ctx.agents.push( agent );
          ++macro.expected;
          setTimeout(next, arrivIntr)         
      }
    , function(e) {
          e 
            ? log.error("error while firing agent [%s]", ctx.total - total, e)
            : log.info("\n\nALL FIRED\n\n") 
      }
    );

    //called upon interval
    function dumpStatsRow(f) {
         
        var s = 
          { sid        : macro.sample.sid                             || 0
          , reqPS      : macro.sample.fired / (samplIntr / 1000)      || 0
          , users_conc : macro.stats.started - macro.stats.finished   || 0
          , fired      : macro.sample.fired                           || 0
          , returned   : macro.sample.returned                        || 0
          , retPS      : macro.sample.returned / (samplIntr / 1000)   || 0
          , userstarted: macro.stats.started                          || 0
          , usersdone  : macro.stats.finished                         || 0
          , reqcount   : macro.stats.fired - macro.stats.returned     || 0
          , firecount  : macro.stats.fired                            || 0
          , returncount: macro.stats.returned                         || 0
          }
        log.debug("dumping stats: %j", s);
         
        csvStats.write(s , f );
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
        return {
          fired    : 0
        , returned : 0
        , started  : 0
        , finished : 0
        }
    }

    function nextSample() {
        macro.sample = newMacroStats();

        //TODO - skip keeping samples for very big tests
        macro.samples.push(macro.sample);

        macro.sample.sid = macro.samples.length
    }
}

function run_user(macro, fFinished) {
    var agent = 
        { id     : agentId++
        , jar    : request.jar()
        , stats  : new Stats()
        , params : extend({}, macro.options.params)
        , results: []
        }
      ;
    macro.agents.push(agent);
  
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

          log[e?"error":"info"]( "[a#%s] - finished with %s, stats: ", agent.id, e ? e.message : "SUCCESS", stats);

          fFinished(e);
      }
    )

    return agent;
}

function initCsvOutput(filename, header) {
    var exists   = fs.existsSync( filename )
      , csv
      ;

    csv = fs.createWriteStream(filename, {'flags': 'a'});
    if (!exists) 
        csv.write(header);
    else
        log.warn("appending to an existing file: ", filename);

    return csv
}