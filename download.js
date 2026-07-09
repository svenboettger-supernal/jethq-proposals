(function () {
  'use strict';

  var btn = document.getElementById('dl-full');
  var note = document.getElementById('dl-note');
  if (!btn) return;

  /* Pages in reading order. First entry is this overview page. */
  var PAGES = [
    { url: './',                id: 'dl-overview' },
    { url: 'core-home/',        id: 'dl-core-home' },
    { url: 'markets-listings/', id: 'dl-markets-listings' },
    { url: 'intranet/',         id: 'dl-intranet' },
    { url: 'sales-ops/',        id: 'dl-sales-ops' },
    { url: 'admin-finance/',    id: 'dl-admin-finance' },
    { url: 'ask-jethq/',        id: 'dl-ask-jethq' }
  ];

  var EXTRA_CSS = [
    '@media print { .dl-page { break-before: page; } .dl-page:first-child { break-before: auto; } }',
    '.dl-page:not(:first-child) .masthead { margin-top: 0; }',
    '.masthead .brand { cursor: default; }'
  ].join('\n');

  function setNote(msg) {
    if (!note) return;
    note.textContent = msg || '';
    note.hidden = !msg;
  }

  function fetchText(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + url);
      return r.text();
    });
  }

  function fetchDataURL(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + url);
      return r.blob();
    }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = function () { reject(new Error('Could not read ' + url)); };
        fr.readAsDataURL(blob);
      });
    });
  }

  /* Absolute URL of a page's directory, used to resolve its relative links. */
  function baseOf(pageUrl) {
    return new URL(pageUrl, document.baseURI).href;
  }

  function build() {
    var defaultLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Preparing…';
    setNote('');

    var parser = new DOMParser();

    Promise.all([
      fetchText('styles.css'),
      fetchText('configurator.js').catch(function () { return ''; }),
      Promise.all(PAGES.map(function (p) { return fetchText(p.url); }))
    ]).then(function (res) {
      var css = res[0];
      var configuratorSrc = res[1];
      var docs = res[2].map(function (h) { return parser.parseFromString(h, 'text/html'); });

      /* Map every page directory to its in-document anchor, so internal
         links become jumps within the single downloaded file. */
      var pageAnchor = {};
      PAGES.forEach(function (p) { pageAnchor[baseOf(p.url)] = p.id; });

      /* Collect every image referenced across the pages (resolved absolute). */
      var imgUrls = {};
      docs.forEach(function (doc, i) {
        var base = baseOf(PAGES[i].url);
        Array.prototype.forEach.call(doc.querySelectorAll('img[src]'), function (img) {
          imgUrls[new URL(img.getAttribute('src'), base).href] = true;
        });
      });

      var uniqueImgs = Object.keys(imgUrls);

      return Promise.all([
        fetchDataURL('assets/favicon.png').catch(function () { return ''; }),
        Promise.all(uniqueImgs.map(function (u) {
          return fetchDataURL(u).then(function (d) { return [u, d]; })
                                .catch(function () { return [u, u]; });
        }))
      ]).then(function (assets) {
        var favicon = assets[0];
        var imgMap = {};
        assets[1].forEach(function (pair) { imgMap[pair[0]] = pair[1]; });

        var articles = docs.map(function (doc, i) {
          var base = baseOf(PAGES[i].url);

          /* Drop the gate, scripts, back links, and the download block itself. */
          ['#proposal-gate', 'script', '.back-link', '.download-cta'].forEach(function (sel) {
            Array.prototype.forEach.call(doc.querySelectorAll(sel), function (n) { n.remove(); });
          });

          /* Inline images. */
          Array.prototype.forEach.call(doc.querySelectorAll('img[src]'), function (img) {
            var abs = new URL(img.getAttribute('src'), base).href;
            if (imgMap[abs]) img.setAttribute('src', imgMap[abs]);
          });

          /* Rewrite links that point at another proposal page into anchors;
             leave external links (prototype, recording) untouched. */
          Array.prototype.forEach.call(doc.querySelectorAll('a[href]'), function (a) {
            var abs = new URL(a.getAttribute('href'), base).href;
            if (pageAnchor[abs]) {
              a.setAttribute('href', '#' + pageAnchor[abs]);
              a.removeAttribute('target');
            }
          });

          var wrap = doc.createElement('article');
          wrap.className = 'dl-page';
          wrap.id = PAGES[i].id;
          while (doc.body.firstChild) wrap.appendChild(doc.body.firstChild);
          return wrap.outerHTML;
        });

        var iconTag = favicon ? '<link rel="icon" type="image/png" href="' + favicon + '">' : '';

        var out =
          '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
          '<meta charset="utf-8">\n' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
          '<title>Supernal · JetHQ Flight Deck · Full proposal</title>\n' +
          '<meta name="description" content="Full JetHQ Flight Deck proposal, every package end to end.">\n' +
          iconTag + '\n' +
          '<style>\n' + css + '\n' + EXTRA_CSS + '\n</style>\n' +
          '</head>\n<body>\n' +
          articles.join('\n') +
          (configuratorSrc ? '\n<script>\n' + configuratorSrc + '\n</script>\n' : '') +
          '\n</body>\n</html>\n';

        var blob = new Blob([out], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'jethq-flight-deck-proposal.html';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);

        btn.disabled = false;
        btn.textContent = defaultLabel;
        setNote('Downloaded jethq-flight-deck-proposal.html');
      });
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = defaultLabel;
      setNote('Sorry, the download could not be built. Please try again.');
      if (window.console) console.error(err);
    });
  }

  btn.addEventListener('click', build);
})();
