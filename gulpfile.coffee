gulp = require 'gulp'
gutil = require 'gulp-util'
source = require 'vinyl-source-stream'
browserify = require 'browserify'
coffeeReactify = require 'coffee-reactify'
envify = require 'envify/custom'
brfs = require 'brfs'
connect = require 'gulp-connect'
stylus = require 'gulp-stylus'
autoprefixer = require 'autoprefixer-stylus'
iconfont = require 'gulp-iconfont'
iconfontCss = require 'gulp-iconfont-css'
buildStatus = require 'build-status'
UltrawaveServer = require 'ultrawave/server'


statusServer = buildStatus.server()



gulp.task 'server', ->
  connect.server
    root: 'public'
    fallback: 'public/index.html'
    port: 3001


gulp.task 'peer-server', ->
  new UltrawaveServer port: 3002


gulp.task 'js', ->

  pending = 2
  errorEmitted = false

  statusServer.send 'building'

  ['index', 'dsp'].forEach (bundle) ->

    browserify(
      debug: true
      extensions: ['.coffee', '.cjsx']
      entries: ["./app/scripts/#{bundle}.coffee"]
    )
      .transform(coffeeReactify)
      .transform(envify NODE_ENV: 'development')
      .transform(brfs)
      .bundle()
        .on 'error', (e) ->
          errorEmitted = true
          statusServer.send 'error'
          gutil.log "#{e}"
          @emit 'end'
        .pipe source "#{bundle}.js"
        .pipe gulp.dest './public'
        .on 'end', ->
          pending -= 1
          statusServer.send 'done' unless errorEmitted or pending > 0


gulp.task 'watch-js', ['js'], ->

  gulp.watch ['./app/scripts/**'], ['js']


gulp.task 'css', ->

  gulp
    .src './app/styles/index.styl'
    .pipe(
      stylus(
        use: autoprefixer browsers: ['ios 7']
        'include css': true
        sourcemap:
          inline: true
          sourceRoot: '.'
          basePath: 'app/styles'
      )
    )
    .pipe gulp.dest './public'
    .pipe connect.reload()


gulp.task 'watch-css', ['css'], ->

  gulp.watch ['./app/styles/**'], ['css']


gulp.task 'icons', ->

  gulp
    .src './app/styles/icons/*.svg'
    .pipe iconfontCss
      fontName: 'icons'
      targetPath: '../app/styles/icons.css'
    .pipe iconfont
      fontName: 'icons'
      appendUnicode: true
      formats: ['ttf']
      timestamp: Math.round Date.now() / 1000
    .pipe gulp.dest './public/'


gulp.task 'default', ['server', 'peer-server', 'icons', 'watch-js', 'watch-css']


