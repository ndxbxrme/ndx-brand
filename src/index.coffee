'use strict'

module.exports = (ndx) ->
  ndx.settings.BRANDS_TABLE = ndx.settings.BRANDS_TABLE or process.env.BRANDS_TABLE or 'brands'
  hasBrands = true
  lastHost = null
  brands = []
  refreshBrands = ->
    if hasBrands
      try
        ndx.database.select ndx.settings.BRANDS_TABLE, null, (res) ->
          if res and res.length
            brands = res
      catch e
        hasBrands = false
  ndx.database.on 'ready', ->
    refreshBrands()
  ndx.database.on 'insert', (args, cb) ->
    if args.obj and args.table is ndx.settings.BRANDS_TABLE
      refreshBrands()
    cb()
  ndx.database.on 'update', (args, cb) ->
    if (args.obj or args.objs) and args.table is ndx.settings.BRANDS_TABLE
      refreshBrands()
    cb()
  applyBrand = (args, cb) ->
    if ndx.brand
      if args.table is ndx.settings.BRANDS_TABLE
        return cb true
      if args.obj
        args.obj.brand = ndx.brand[ndx.settings.AUTO_ID]
      else if args.objs
        for obj in args.objs
          obj.brand = ndx.brand[ndx.settings.AUTO_ID]
    cb true
  ndx.database.on 'preInsert', (args, cb) ->
    applyBrand args, cb
  ndx.database.on 'preUpdate', (args, cb) ->
    applyBrand args, cb
  ndx.database.on 'preSelect', (args, cb) ->
    if not ndx.brand
      return cb true
    if ndx.user and ndx.user.roles and ndx.user.hasRole 'superadmin'
      return cb true
    else
      if args.where
        args.where.brand = ndx.brand[ndx.settings.AUTO_ID]
      else
        args.brand = ndx.brand[ndx.settings.AUTO_ID]
      cb true
  ndx.app.use '/', (req, res, next) ->
    host = req.headers.host
    if host is lastHost
      return next()
    lastHost = host
    for brand in brands
      if new RegExp("^#{brand.host.replace('.', '\.').replace('*', '.*')}$").test(host)
        ndx.brand = brand
        return next()
    ndx.brand = {}
    return next()
  ndx.app.get '/brand.css', (req, res) ->
    res.setHeader 'Content-Type', 'text/css'
    if ndx.brand
      if ndx.brand.css
        return res.end ndx.brand.css
      if ndx.brand.cssSrc
        return res.end ndx.static ndx.brand.cssSrc
    res.end ''
  ndx.app.get '/brand.js', (req, res) ->
    res.setHeader 'Content-Type', 'application/javascript'
    js = ""
    if ndx.brand
      mybrand = {}
      Object.assign mybrand, ndx.brand
      delete mybrand.css
      delete mybrand.cssSrc
      js = "
        (function() {
          'use strict';
          var e, error1, module;

          module = null;

          try {
            module = angular.module('ndx');
          } catch (error1) {
            e = error1;
            module = angular.module('ndx', []);
          }      
          module.constant('Brand', #{JSON.stringify(mybrand)});
        }).call(this);
      "
    res.end js