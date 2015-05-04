var LOG     = require('log4js').getLogger('lib/steps/req')
  , async   = require('async')
  , REQUEST = require('request')
  ;

module.exports = step_req;
LOG.debug('module loaded');

function step_req(ctx, done) {
    var agent   = ctx.agent
      , step    = ctx.step
      , macro   = ctx.macro
      , request = ctx.request || REQUEST
      , log     = ctx.log     || LOG
      , aid     = agent.id
      , rid     = 1
      ;

    log.debug("[a#%s] - entering step: " , aid, step.name);

    async.each( step.req
    , function(reqInfo, next) {
          var url  = parameterize(agent.params, reqInfo.get)
            , rslt = 
              { aid       : aid
              , step      : step.name
              , rid       : rid++
              , starttime : Date.now() 
              , url       : url
              }
            , sec 
            ;
          
          agent.results.push( rslt );

          log.info("[a#%s] - firing: ", aid, url );


          request( 
            { url    : url
            , jar    : agent.jar
            , headers: 
              { "user-agent" : "stress tester"
              }
            }
          , function(e,r) {
                rslt.endtime = Date.now();
                var reqStats = reqInfo.stats
                  , dur = rslt.dur = rslt.endtime - rslt.starttime
                  ;

                reqStats.gather(dur);
                step.stats.gather(dur);

                if (e) {
                    rslt.error = e.name;
                    rslt.statusCode = null;
                }else{
                    rslt.error = false;
                    rslt.statusCode = r.statusCode;
                }

                log.info("[a#%s] - response [r#%s] arrived in [%sms] - ", aid, reqInfo.id, rslt.dur, e || "ok");
                log.info("req stats [r#%s]: %s", reqInfo.id, reqStats);

                if ('function' == typeof reqInfo.onResponse) {
                    log.info("[a#%s] - runnig onResponse hook", aid);
                    reqInfo.onResponse.apply(ctx, [e, r]);
                }

                macro.onResult( rslt );

                next(e)
            }
          );

          macro.onRequest()
      }
    , function(e) {
          if (!e) {
              log.info("[a#%s] - exiting step: %s", aid, step.name);
              log.info("step stats  [%s] : %s", step.name, step.stats);
          }
          done(e)
      }
    )
}

function parameterize(params, url) {
    return url.replace(/\%\%_([^%]+)\%\%/g, function(_,p) {
        return params[p];
    })
}