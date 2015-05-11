Roadmap
=======

Add built-in event hooks to measures 
  - connect time  - until connected 
  - think time    - from connected to accepting response headers
  - response time - from response headers to response end
    *) file: lib/step-types/reg

Standardize: let the user provide req object, ready to fire with request
this will support:
  - more methods: post, get, put, delete, etc...
  - request headers
  - better programmable parameters

Support socket.io step type
  - server info expected elsewhere (perhaps in params)
  - step should specify server by name or id
  - if the session is not connected - should the step type connect first, or fail the scenario?
