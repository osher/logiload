logiload
==========

programmatic tool for load-testing in node-js for scenarios with heavy logic.

Features overview
=================

- describe your test as a data-structure simply exported by a node-module
- use request parameterization to express your logic
- override any setting given in the scenario usign CLI switches
- writes it's output to patterned file-names
  - output request stat info into req.csv 
  - output overview stats into stats.csv
- run modes:
   - to a given number of times to run the scenario (by providing -n <num-of-times>)
   - until SIGTERM/SIGINT (by prviding -n-1)
- Command types:
   - req - to fire one or more requests in parallel
   - wait - thinktime between simulated page-views
- uses a bell curve to spread think times for more humanlike behavior

Request parameterization
---
Parameterizing of parts in request descriptors are done using the tsung placeholders style,
i.e using placeholders wrapped with `%%_` and `%%`, example: `%%_param1%%` will replace this expression with the value in `agent.params.param1`.
`agent.params` collection starts as a clone of the `macro.options.params` provided by the user.
User may manipulate the `agent.params` using `onResponse(err, response)` hook, 
which is called on a context with reference to `agent`.

Note in the following example how the 2nd request adds to the cart the product-id returned by the 1st request.
```
module.exports = 
{ options: 
  { params: 
    { env: "stage"
    }
  , scenario: 
    [ { type: "req"
        req : 
        [ "http://%%_env%%.mydomain.com/promo-data"
        ]
      , onResponse: function(e, r) {
            if (e) throw e;
            this.agent.params.product = JSON.parse(r.body).product
        }
      }
    , { type: "wait", wait: 1500 }
    , { type: "req"
        req: 
        [ { method: "POST"
          , url:    "http://%%_env%%.mydomain.com/addToChart"
          , body:   {
              pid:  "%%_product%%"
            }
          }
        ]
      }
    ]
  }
}
```

any setting can be overriden usign CLI switches
---
TBD

Patterned file names
---
 - %a - num of users (corresponds to CLI param -n,--num)
 - %r - arrival interval (corresponds to CLI param -a,--arrive-interval)
 - %p - sample interval (corresponds to CLI param -p,--sample-interval)
 - %t - timestamp or timestamp+tag when tag is provided (tag corresponds to CLI param -t,--tag