var LOG = require('log4js').getLogger('lib/steps/wait')
  ;

module.exports = step_wait;
LOG.debug('module loaded');

function step_wait(ctx, done) {
    var agent   = ctx.agent
      , step    = ctx.step
      , log     = ctx.log   || LOG
      , aid     = agent.id
      , sleep   = step.wait || step.sleep
      , sleepRnd
      ;

    if ('function' == typeof sleep) sleep = sleep();
    
    sleepRnd = Math.round( sleep * rnd() * 1000);

    log.info("[a#%s] - sleeping %ss, rnd: %ss", aid, sleep, sleepRnd / 1000 );

    setTimeout( function() { 
        log.debug("[a#%s] - woke up!", aid);
        done()
    }, sleepRnd );
}

function rnd() { return (Math.random() + Math.random() + Math.random()) /  1.5 }