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

    log.info("[a#%s] - entering step: " , aid, step.name);

    async.each( step.req
    , function(reqInfo, next) {
          //TODO: add event hooks to measures 
          //   - connect time  - until connected 
          //   - think time    - from connected to accepting response headers
          //   - response time - from response headers to response end

          var reqStats = reqInfo.stats
            , req  = reqOf(reqInfo, agent)
            , rid  = reqInfo.id
            , rslt =
              { aid       : aid
              , step      : step.name
              , rid       : rid++
              , starttime : Date.now() 
              , req       : req
              , url       : req.url
              }
            , sec 
            ;

          log.info("[a#%s/r#%s] - firing %s: ", aid, rid, req.method || "GET", req.url );

          req.jar = agent.jar;
          request( req
          , function(e,r) {
                var dur = 
                    rslt.dur = 
                      (rslt.endtime = Date.now()) - rslt.starttime
                  , expectedCode
                  ;
                log.debug("[a#%s/r#%s] - response arrived in [%sms]", aid, reqInfo.id, rslt.dur)

                reqStats.gather(dur);
                step.stats.gather(dur);

                if (e) {
                    rslt.error = e.message;
                    rslt.statusCode = null;
                } else {
                    rslt.error = false;
                    rslt.statusCode = r.statusCode;
                }

                expectedCode = reqInfo.expect && reqInfo.expect.code || 200 ;

                if (r && r.statusCode !=  expectedCode) {
                    e = 
                      { message: "Unexpected HTTP Response-Code"
                      , expect : expectedCode
                      , found  : r.statusCode
                      }
                }
                
                //hook for user-code, which may:
                //  - extract state from response body to be used in next steps
                //  - set error from applicative level
                if ('function' == typeof reqInfo.onResponse) {
                    log.debug("[a#%s/r#%s] - runnig onResponse hook:", aid, rid, e ? e.message : "successfull request");

                    //exception safety + gather error when caught exception
                    log.debug("[a#%s/r#%s] - with", aid, rid, r ? r.body || "no body" : e);

                    try {
                        //TODO - move to event emittion??
                        reqInfo.onResponse.apply(ctx, [e, r, rslt]);  
                    } catch (ex) {
                        e = ex;
                    }

                    if (rslt.error && !e) 
                        e = { message: "Custom Assertion failed" };

                    if (e) {
                        e.req          = req;
                        e.responseBody = (r || e).body;
                        e.httpCode     = (r || e).statusCode;
                        e.rslt         = rslt
                        e.reqInfo      = reqInfo;
                    }
                }

                macro.onResult( rslt );

                if (e)
                    log[reqInfo.bail ? "error" : "warn" ]("[a#%s/r#%s] - request errored:\n", aid, rid,  e );

                log.debug("[a#%s/r#%s] - request done\nresult   : %j\nreqStats : %j", aid, rid, rslt, reqStats);

                next(reqInfo.bail ? e : null);
            }
          );
          delete req.jar;

          macro.onRequest()
      }
    , function(e) {
          log.debug("[a#%s] - exiting step: %s\n%j", aid, step.name, step.stats, e || "OK");
          done(e)
      }
    )
}

function reqOf(reqInfo, agent) {
    if ('string' == typeof reqInfo) reqInfo = { req: { url: reqInfo } };
    var req = reqInfo.req /* backward compatibility: */|| { url: reqInfo.get };
    
    if (!req.headers) req.headers = {};
    if (!req.headers["user-agent"]) req.headers["user-agent"] = "logiload stress tester";
    
    req = parameterize( req, agent.params );
    if (!req.timeout) req.timeout = agent.params.reqTimeout;
    
    return req;
}

function parameterize(v, params) {
    var k, o;
    switch(typeof v) {
      case 'string' :
        return v.replace(/\%\%_([^%]+)\%\%/g, function(_,p) {
            return params[p];
        });
      case 'object' : 
        o = {};
        for (k in v) o[k] = parameterize(v[k], params);
        return o        
      default: 
        return v
    }
}