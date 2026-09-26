/**
 * voice-samples.js — finding the count voices in the bucket.
 *
 * Four pages count bars out loud, and all four used to ask R2 for one
 * exact string: `Counts vocal/M1.wav`. That works only if whoever
 * uploaded the samples happened to type the folder and the extension
 * the same way the page does -- and a bucket holding `M1.wave`, or
 * `Counts Vocal/M1.wav`, or `M1.mp3`, is a bucket where the whole
 * feature is silent with nothing to show for it. The 404 is the same
 * 404 as "nothing uploaded yet", so there is nothing to diagnose from
 * either.
 *
 * So it asks for what is there instead. The first sample is looked for
 * across the spellings people actually use; whichever one answers is
 * remembered, and every sample after it goes straight to that folder
 * with that extension. One page load pays for at most one search.
 *
 * `decodeAudioData` takes mp3, m4a and ogg as happily as wav, so those
 * are worth asking for too: a voice recorded on a phone is an m4a, and
 * there is no reason it should not count bars.
 */
(function (global) {
  'use strict';

  /**
   * The two sample sets, and what each names its files.
   *
   * `Voices/1.wav` counts a bar of beats; `Counts vocal/M1.wav` names
   * the beat you are on for the whole piece. The folder spellings are
   * in the order they are tried: the documented one first, then the
   * ones a person types when they are not looking at the docs.
   */
  var KINDS = {
    count: {
      folders: ['Voices', 'voices', 'Voice', 'Vocals'],
      // A count-in voice is filed under its own number.
      prefixes: [''],
    },
    measure: {
      folders: [
        'Counts vocal',
        'Counts Vocal',
        'counts vocal',
        'Counts vocals',
        'Counts Vocals',
        'Count vocal',
        // Two spaces. A folder typed with one extra space looks
        // identical in a bucket listing and is a different key.
        'Counts  vocal',
        'Counts  Vocal',
      ],
      // `M1` is the documented name; a folder whose files are just
      // `1.wav` is the same recording filed without the prefix, and
      // there is no reason for it to be silent.
      prefixes: ['M', '', 'm'],
    },
  };

  /**
   * Extensions, in the order they are tried.
   *
   * `wave` is second because it is the one this bucket's owner writes,
   * and the case variants are here because R2 keys are case sensitive:
   * `M1.WAV` and `M1.wav` are two different objects, and a person
   * uploading from a desktop has no idea which one they have.
   */
  var EXTENSIONS = ['wav', 'wave', 'WAV', 'mp3', 'm4a'];

  /** kind -> { folder, extension } once something has answered. */
  var resolved = Object.create(null);
  /** kind -> { id, promise }, so four beats asked for at once search once. */
  var searching = Object.create(null);

  function url(apiBase, folder, file, extension) {
    return (
      apiBase +
      '/assets/shared/' +
      encodeURIComponent(folder) +
      '/' +
      encodeURIComponent(file) +
      '.' +
      extension
    );
  }

  function get(address) {
    return fetch(address).then(
      function (res) {
        return res.ok ? res.arrayBuffer() : null;
      },
      function () {
        return null;
      },
    );
  }

  /**
   * Which folder and extension this bucket actually uses, found once.
   *
   * One folder at a time, all its extensions at once: a bucket does
   * not mix spellings inside a folder, so the first folder that
   * answers is the folder, and the earliest extension in the list that
   * answered is the one to keep. Whole search is a handful of 404s and
   * happens once per page load; every sample after it costs one
   * request, exactly as before.
   */
  /** Every address worth asking for one sample, in the order to ask. */
  function addresses(apiBase, kind, id) {
    var spec = KINDS[kind];
    var out = [];
    for (var f = 0; f < spec.folders.length; f++) {
      for (var n = 0; n < spec.prefixes.length; n++) {
        for (var e = 0; e < EXTENSIONS.length; e++) {
          var name = spec.prefixes[n] + id;
          out.push({
            folder: spec.folders[f],
            prefix: spec.prefixes[n],
            name: name,
            extension: EXTENSIONS[e],
            url: url(apiBase, spec.folders[f], name, EXTENSIONS[e]),
          });
        }
      }
    }
    return out;
  }

  function find(apiBase, kind, id) {
    var list = addresses(apiBase, kind, id);
    var at = 0;
    // A batch at a time rather than one at a time: a bucket that has
    // none of them is a few dozen 404s, and asked one after another
    // that is a visible pause before the page can say so.
    function round() {
      if (at >= list.length) return Promise.resolve(null);
      var batch = list.slice(at, at + 8);
      at += batch.length;
      return Promise.all(
        batch.map(function (attempt) {
          return get(attempt.url);
        }),
      ).then(function (results) {
        for (var i = 0; i < results.length; i++) {
          if (results[i] !== null) {
            resolved[kind] = {
              folder: batch[i].folder,
              extension: batch[i].extension,
              prefix: batch[i].prefix,
            };
            return results[i];
          }
        }
        return round();
      });
    }
    return round();
  }

  /**
   * One sample's bytes, or null if the bucket has nothing for it.
   *
   * Null is NOT remembered here. A caller that caches misses forever
   * turns "I had not uploaded them yet" into "this page will never
   * count until it is reloaded", and the person fixing the bucket has
   * no way to know that reloading is what they need. Callers cache
   * what they decode; `reset` throws the search away so a retry is a
   * retry.
   */
  function load(apiBase, kind, id) {
    var spec = KINDS[kind];
    if (!spec) return Promise.resolve(null);
    var known = resolved[kind];
    if (known) return get(url(apiBase, known.folder, known.prefix + id, known.extension));

    if (!searching[kind]) {
      var pending = { id: String(id), promise: null };
      pending.promise = find(apiBase, kind, id).then(
        function (bytes) {
          if (searching[kind] === pending) searching[kind] = null;
          return bytes;
        },
        function () {
          if (searching[kind] === pending) searching[kind] = null;
          return null;
        },
      );
      searching[kind] = pending;
    }
    var search = searching[kind];
    var wanted = String(id);
    return search.promise.then(function (bytes) {
      // The search fetched one file for real; whoever asked for THAT
      // one takes it rather than asking the bucket twice.
      if (search.id === wanted) return bytes;
      var found = resolved[kind];
      if (!found) return null;
      return get(url(apiBase, found.folder, found.prefix + id, found.extension));
    });
  }

  /**
   * What the bucket turned out to hold, for the line under the card.
   *
   * `Counts vocal/M1.wave` rather than `Counts vocal/M1.wav`, when
   * that is what answered -- so the person reading the hint is reading
   * their own bucket rather than the documentation.
   */
  function describe(kind, id) {
    var found = resolved[kind];
    if (!KINDS[kind] || !found) return null;
    return found.folder + '/' + found.prefix + (id === undefined ? 1 : id) + '.' + found.extension;
  }

  /**
   * The same search, but reporting rather than caching.
   *
   * For the card's Test button: it asks every address it would ever
   * ask, says which one answered, and hands back the whole list so a
   * bucket with nothing in it can be read off the page instead of
   * guessed at. Nothing here writes to the cache -- a test is a test.
   */
  function probe(apiBase, kind, id) {
    var list = addresses(apiBase, kind, id === undefined ? 1 : id);
    var tried = [];
    var at = 0;
    function round() {
      if (at >= list.length) return Promise.resolve({ found: null, bytes: null, tried: tried });
      var batch = list.slice(at, at + 8);
      at += batch.length;
      return Promise.all(
        batch.map(function (attempt) {
          return fetch(attempt.url).then(
            function (res) {
              return res.ok ? res.arrayBuffer() : null;
            },
            function () {
              return 'error';
            },
          );
        }),
      ).then(function (results) {
        for (var i = 0; i < results.length; i++) {
          var label = batch[i].folder + '/' + batch[i].name + '.' + batch[i].extension;
          if (results[i] === null || results[i] === 'error') {
            tried.push({ path: label, ok: false, network: results[i] === 'error' });
            continue;
          }
          tried.push({ path: label, ok: true, network: false });
          return { found: label, bytes: results[i], tried: tried };
        }
        return round();
      });
    }
    return round();
  }

  /** Forget the search, so turning the feature off and on retries the bucket. */
  function reset(kind) {
    if (kind === undefined) {
      resolved = Object.create(null);
      searching = Object.create(null);
      return;
    }
    delete resolved[kind];
    delete searching[kind];
  }

  global.VoiceSamples = {
    load: load,
    describe: describe,
    probe: probe,
    reset: reset,
    EXTENSIONS: EXTENSIONS,
  };
})(window);
