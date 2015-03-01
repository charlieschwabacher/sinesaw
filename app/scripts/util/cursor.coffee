deepFreeze = require './deep_freeze'
deepMerge = require './deep_merge'
UndoHistory = require './undo_history'
CursorCache = require './cursor_cache'



module.exports =

  create: (inputData, onChange, opts = {}) ->

    data = deepFreeze inputData
    withHistory = opts.history is true
    batched = false
    cache = new CursorCache

    if withHistory
      history = new UndoHistory data, (newData) ->
        data = newData
        onChange new Cursor, history

    update = (newData) ->
      data = newData
      unless batched
        history.update data if withHistory
        onChange new Cursor(), history


    class Handle


    # declare cursor class w/ access to mutable reference to data in closure
    class Cursor

      constructor: (@path = []) ->

      cursor: (path = []) ->
        fullPath = @path.concat path

        return cached if (cached = cache.get fullPath)?

        cursor = new Cursor fullPath
        cache.store cursor
        cursor

      get: (path = []) ->
        target = data
        for key in @path.concat path
          target = target[key]
          return undefined unless target?
        target

      modifyAt: (path, modifier) ->
        fullPath = @path.concat path

        newData = target = {}
        target[k] = v for k, v of data

        for key in fullPath.slice 0, -1
          updated = if Array.isArray target[key] then [] else {}
          updated[k] = v for k, v of target[key]
          target[key] = updated
          Object.freeze target
          target = target[key]

        modifier target, fullPath.slice -1
        Object.freeze target

        cache.clearPath fullPath
        update newData

      set: (path, value) ->
        if arguments.length is 1
          value = path
          path = []

        if @path.length > 0 or path.length > 0
          @modifyAt path, (target, key) ->
            target[key] = deepFreeze value
        else
          update value

      delete: (path) ->
        if @path.length > 0 or path.length > 0
          @modifyAt path, (target, key) ->
            delete target[key]
        else
          update undefined

      merge: (newData) ->
        cache.clearObject @path, newData
        @set [], deepMerge @get(), deepFreeze newData

      bind: (path, pre) ->
        (v) => @set path, if pre then pre v else v

      has: (path) ->
        @get(path)?

      batched: (cb) ->
        batched = true
        cb()
        batched = false
        update data


    # perform callback one time to start
    onChange new Cursor, history


    # return handle for
    new Handle

