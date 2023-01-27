// ==UserScript==
// @name         hinata-member-blog-downloader
// @namespace    http://plat.hnz46.cn/
// @version      0.1
// @description  一键下载日向坂成员博客的文本内容及图片
// @author       Juz
// @match        https://www.hinatazaka46.com/s/official/diary/detail/*
// @connect      https://cdn.hinatazaka46.com
// @icon         https://cdn.hinatazaka46.com/files/14/hinata/img/favicons/safari-pinned-tab.svg
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceText
// @resource     jszip https://cdn.bootcdn.net/ajax/libs/jszip/3.10.0/jszip.min.js
// @resource     FileSaver https://cdn.bootcdn.net/ajax/libs/FileSaver.js/2.0.5/FileSaver.js
// @resource     turndown https://unpkg.com/turndown/dist/turndown.js
// ==/UserScript==

;(function () {
  'use strict'
  loadScript('jszip')
  loadScript('FileSaver')
  loadScript('turndown')

  GM_registerMenuCommand(
    '下载文本及图片',
    function (event) {
      const title = document.querySelector('.c-blog-article__title').innerText

      const images = Array.from(document.querySelectorAll('.p-blog-article img')).map(item => item.currentSrc)
      createZip(title, images.length > 0 ? images : null)
    },
    'downloadTextAndImg'
  )

  function createZip(name, imageUrls) {
    var zip = new JSZip()

    var folder = zip.folder(name)
    folder.file('文本内容.txt', parseText(document.querySelector('.p-blog-article')))

    let requests = imageUrls.map(url => fetch(url))

    Promise.all(requests)
      .then(results => {
        for (let index = 0; index < results.length; index++) {
          const data = results[index]
          folder.file(index + 1 + '.jpg', data.blob(), { binary: true })
        }
      })
      .finally(() => {
        zip.generateAsync({ type: 'blob' }).then(function (content) {
          saveAs(content, name + '.zip')
        })
      })
  }

  function parseText(dom) {
    var turndownService = new TurndownService({
      emDelimiter: ' ',
      strongDelimiter: ' '
    })
      .addRule('imgStyle', {
        filter: ['img'],
        replacement: function (content) {
          return '\n[图片位置]\n'
        }
      })
      .addRule('linkStyle', {
        filter: ['a'],
        replacement: function (content) {
          return content
        }
      })
      .addRule('headingStyle', {
        filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        replacement: function (content) {
          return '\n' + content + '\n'
        }
      })

    return turndownService.turndown(dom)
  }

  function loadScript(resourceName) {
    const scriptText = GM_getResourceText(resourceName)
    const scriptEl = document.createElement('script')
    scriptEl.textContent = scriptText
    document.body.appendChild(scriptEl)
  }
})()
