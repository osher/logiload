var LOG = require('log4js').getLogger('lib/steps/wait')
  ;

module.exports = step_wait;
LOG.debug('module loaded');

function step_wait(ctx, done) {
    var agent   = ctx.agent
      , step    = ctx.step
      , log     = ctx.log   || LOG
      , aid     = agent.id
      , sleep   = (step.wait || step.sleep) * rnd()
      ;

    log.info("[a#%s] - sleeping %ss", aid, step.wait || step.sleep);
    setTimeout( function() { 
        log.debug("[a#%s] - woke up!", aid);
        done()
    }, sleep * 1000 );
}

function rnd() { return (Math.random() + Math.random() + Math.random()) /  1.5 }