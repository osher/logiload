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
          var url  = parameterize(agent.params, reqInfo.get).replace(/,/g,"%2C")
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
                    //TODO: allow hook for applicative errors
                }

                if (  reqInfo.expect && reqInfo.expect.code
                   && r.statusCode != reqInfo.expectCode
                   ) {
                    e = 
                      { message: "Wrong Status Code"
                      , expect : reqInfo.expect.code
                      , found  : r.statusCode
                      }
                }


                log.info("[a#%s] - response [r#%s] arrived in [%sms] - ", aid, reqInfo.id, rslt.dur, e || r.statusCode);
                log.info("req stats [r#%s]: %s", reqInfo.id, reqStats);


                if ('function' == typeof reqInfo.onResponse) {
                    log.info("[a#%s] - runnig onResponse hook", aid);
                    //TODO - exception safety + gather error when caught exception
                    //TODO - move to event emittion

                    try {
                        reqInfo.onResponse.apply(ctx, [e, r]);  
                    } catch (ex) {
                        e = ex;
                        e.reqInfo      = reqInfo;
                        e.reqUrl       = url;
                        e.responseBody = (r || e).body;
                        e.httpCode     = (r || e).statusCode;
                        log.error("req.onResponse",e);
                    }
                }

                //TODO - move to event emittion?
                macro.onResult( rslt );

                next(reqInfo.bail ? e : null);
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