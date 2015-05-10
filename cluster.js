var cluster = require('cluster');

console.log("wake up :) " );

if (cluster.isMaster) {
    console.log("im the master!", process.pid);
    for (var i = 0; i < 4; i++) 
       cluster.fork();

    cluster.on('exit', function(w,c,s) {
        console.log('worker ' + w.process.pid + ' died', c, s);
    })

    //setTimeout(process.exit,1000);
}else{
    console.log("working...", process.argv);
    //setTimeout(process.exit,300);
}