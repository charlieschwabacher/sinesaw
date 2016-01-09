# sinesaw #

Web audio DAW.  Requires Chrome >= 39.

`npm install` and then `gulp` to run a server and watch coffee/styl source
files.  `mocha` to run tests.

![Screenshot](screenshot.png?raw=true "Screenshot")

---


The idea behind sinesaw is to create an in browser DAW with an interface similar
to Ableton Live.  In terms of latency and processing power, it is difficult for
javascript to complete with native code, but running in browser makes
collaboration and sharing so easy that I think there is an interesting place for
it.  I hope the limited processing power will inspire creativity more than hold
people back.

Sinesaw is far from complete - so far it includes a piano roll sequencer, analog
synthesizer, drum synthesizer, sampler, and web midi input.


### architecture

Sinesaw plays audio through through a single scriptProcessor audio node running
in a worker thread - the audio output is a pure function of the song state and
the current time, this single function is called for every sample of audio.

This approach to audio was inspired by the excellent
[wavepot](http://wavepot.com) project.

Sinesaw uses React.js for the user interface, and models data with the
[ultrawave](//github.com/charlieschwabacher/ultrawave) library.  Ultrawave
handles synchronization of state between peers, and provides a single object
containing the complete application state, which is passed from the ui to the
audio processing thread.


### approaching the code

The best place to start looking at code for audio output is
`app/scripts/dsp/song.coffee`, and `app/scripts/ui/app.cjsx` is the entry
point for the UI code.

The index file for the main thread is `app/scripts/index.coffee` - this creates
both a `Song` model and the root react component `App`.

Planned work is in `todo.txt` and working notes are in `notes.txt`
