(function() {
  'use strict';
  module.exports = function(ndx) {
    var applyBrand, brands, hasBrands, lastHost, refreshBrands;
    ndx.settings.BRANDS_TABLE = ndx.settings.BRANDS_TABLE || process.env.BRANDS_TABLE || 'brands';
    hasBrands = true;
    lastHost = null;
    brands = [];
    refreshBrands = function() {
      var e, error;
      if (hasBrands) {
        try {
          return ndx.database.select(ndx.settings.BRANDS_TABLE, null, function(res) {
            if (res && res.length) {
              return brands = res;
            }
          });
        } catch (error) {
          e = error;
          return hasBrands = false;
        }
      }
    };
    ndx.database.on('ready', function() {
      return refreshBrands();
    });
    ndx.database.on('insert', function(args, cb) {
      if (args.obj && args.table === ndx.settings.BRANDS_TABLE) {
        refreshBrands();
      }
      return cb();
    });
    ndx.database.on('update', function(args, cb) {
      if ((args.obj || args.objs) && args.table === ndx.settings.BRANDS_TABLE) {
        refreshBrands();
      }
      return cb();
    });
    applyBrand = function(args, cb) {
      var i, len, obj, ref;
      if (ndx.brand) {
        if (args.table === ndx.settings.BRANDS_TABLE) {
          return cb(true);
        }
        if (args.obj) {
          args.obj.brand = ndx.brand[ndx.settings.AUTO_ID];
        } else if (args.objs) {
          ref = args.objs;
          for (i = 0, len = ref.length; i < len; i++) {
            obj = ref[i];
            obj.brand = ndx.brand[ndx.settings.AUTO_ID];
          }
        }
      }
      return cb(true);
    };
    ndx.database.on('preInsert', function(args, cb) {
      return applyBrand(args, cb);
    });
    ndx.database.on('preUpdate', function(args, cb) {
      return applyBrand(args, cb);
    });
    ndx.database.on('preSelect', function(args, cb) {
      if (!ndx.brand) {
        return cb(true);
      }
      if (ndx.user && ndx.user.roles && ndx.user.hasRole('superadmin')) {
        return cb(true);
      } else {
        if (args.where) {
          args.where.brand = ndx.brand[ndx.settings.AUTO_ID];
        } else {
          args.brand = ndx.brand[ndx.settings.AUTO_ID];
        }
        return cb(true);
      }
    });
    ndx.app.use('/', function(req, res, next) {
      var brand, host, i, len;
      host = req.headers.host;
      if (host === lastHost) {
        return next();
      }
      lastHost = host;
      for (i = 0, len = brands.length; i < len; i++) {
        brand = brands[i];
        if (new RegExp("^" + (brand.host.replace('.', '\.').replace('*', '.*')) + "$").test(host)) {
          ndx.brand = brand;
          return next();
        }
      }
      ndx.brand = {};
      return next();
    });
    ndx.app.get('/brand.css', function(req, res) {
      res.setHeader('Content-Type', 'text/css');
      if (ndx.brand) {
        if (ndx.brand.css) {
          return res.end(ndx.brand.css);
        }
        if (ndx.brand.cssSrc) {
          return res.end(ndx["static"](ndx.brand.cssSrc));
        }
      }
      return res.end('');
    });
    return ndx.app.get('/brand.js', function(req, res) {
      var js, mybrand;
      res.setHeader('Content-Type', 'application/javascript');
      js = "";
      if (ndx.brand) {
        mybrand = {};
        Object.assign(mybrand, ndx.brand);
        delete mybrand.css;
        delete mybrand.cssSrc;
        js = "(function() { 'use strict'; var e, error1, module; module = null; try { module = angular.module('ndx'); } catch (error1) { e = error1; module = angular.module('ndx', []); } module.constant('Brand', " + (JSON.stringify(mybrand)) + "); }).call(this);";
      }
      return res.end(js);
    });
  };

}).call(this);

//# sourceMappingURL=index.js.map
