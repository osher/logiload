var format = require('util').format
  , FORMAT = "avg: [%s], max: [%s], min: [%s], cnt: [%s]"
  ;

module.exports = Stats

function Stats() {
    this.min =  999999;
    this.max  = 0;
    this.sum  = 0;
    this.count= 0;
    this.avg  = null
}

Stats.prototype.gather = function Stats_gather(dur) { 
    var bag = this;
    bag.min = Math.min(bag.min, dur);
    bag.max = Math.max(bag.max, dur);
    bag.sum += dur;
    bag.count++
    bag.avg = bag.sum / bag.count;
}

Stats.prototype.toString = function() {
    var bag = this;
    return format(FORMAT, bag.avg, bag.max, bag.min, bag.count)
}
Stats.prototype.toCSV = function() {
    return "TBD"
}