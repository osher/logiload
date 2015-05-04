var LOG = require('log4js').getLogger('lib/steps/wait')
  ;

module.exports = step_wait;
LOG.debug('module loaded');

function step_wait(ctx, done) {
    var agent   = ctx.agent
      , step    = ctx.step
      , log     = ctx.log   || LOG
      , aid     = agent.id
      ;

    log.info("[a#%s] - sleeping %ss", aid, step.wait || step.sleep);
    setTimeout( function() { 
        log.debug("[a#%s] - woke up!", aid);
        done()
    }, step.sleep * 1000 );
}