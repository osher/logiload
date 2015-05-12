logiload
==========

programmatic tool for load-testing in node-js for scenarios with heavy logic.


Features overview
=================

*) url parameterization
*) any setting can be overriden usign CLI switches
*) patterned file-names
*) output request stat info into req.csv 
*) output overview stats into stats.csv


url parameterization
---
TBD

any setting can be overriden usign CLI switches
---
TBD

Patterned file names
---
 - %a - num of users (corresponds to CLI param -n,--num)
 - %r - arrival interval (corresponds to CLI param -a,--arrive-interval)
 - %p - sample interval (corresponds to CLI param -p,--sample-interval)
 - %t - timestamp or timestamp+tag when tag is provided (tag corresponds to CLI param -t,--tag