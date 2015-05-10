var params = 
    { baseUrl : "http://localhost/"
    }
  , home = 
    { name: "home"
    , type: "req"
    , req : 
      [ { get: "%%_baseUrl%%/"
        , onResponse: 
          function(e,r) {
              var prod = r.body.exec(/id="featuredProduct" value="(.*)"/);
              if (prod) 
                  this.macro.params.featuredProduct = prod[1];
          }
        }
      ]
    }
  , homeAssets = 
    { name: "home-assets"
    , type: "req"
    , req :
      [ { get: "%%_baseUrl%%/logo.ico" }
      , { get: "%%_baseUrl%%/banner.jpg" }
      , { get: "%%_baseUrl%%/js/home.js" }
      , { get: "%%_baseUrl%%/css/css.css" }
      ]
    }
  , pause2sec = 
    { name: "pause@home"
    , type: "sleep" 
    , wait: 2 
    }
  ;

module.exports = 
  { { options: 
      { params  : params
      }
    }
  , scenarios: 
    { featuedProduct:
      [ home
      , homeAssets
      , pause2sec
      , { name: "sales"
        , type: "req"
        , req : 
          [ { get : "%%_baseUrl%%/sales/%%_featuredProduct%%" }
          ]
        }
      , { name: "home-assets"
        , type: "req"
        , req :
          [ { get: "%%_baseUrl%%/logo.ico" }
          , { get: "%%_baseUrl%%/sales.jpg" }
          , { get: "%%_baseUrl%%/js/sales.js" }
          , { get: "%%_baseUrl%%/css/css.css" }
          , { get: "%%_baseUrl%%/img/%%_featuredProduct%%.jpg" }
          ]
        }
      , pause2sec
      , home
      , homeAssets
      ]
    }
  }
;