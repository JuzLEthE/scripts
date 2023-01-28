// ==UserScript==
// @name         日向坂成员博客内容一键下载
// @namespace    http://plat.hnz46.cn/
// @version      0.1
// @description  一键下载日向坂成员博客的文本内容及图片,支持机翻
// @author       Juz
// @match        https://www.hinatazaka46.com/s/official/diary/detail/*
// @connect      https://cdn.hinatazaka46.com
// @connect      translate.googleapis.com
// @connect      api.fanyi.baidu.com
// @icon         https://cdn.hinatazaka46.com/files/14/hinata/img/favicons/safari-pinned-tab.svg
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @resource     jszip https://cdn.bootcdn.net/ajax/libs/jszip/3.10.0/jszip.min.js
// @resource     FileSaver https://cdn.bootcdn.net/ajax/libs/FileSaver.js/2.0.5/FileSaver.js
// @resource     turndown https://unpkg.com/turndown/dist/turndown.js
// @resource     jquery https://apps.bdimg.com/libs/jquery/1.9.1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js
// ==/UserScript==

;(function () {
  'use strict'
  loadScript('jszip')
  loadScript('FileSaver')
  loadScript('turndown')
  loadScript('jquery')

  GM_registerMenuCommand(
    '打包下载',
    function (event) {
      const title = document.querySelector('.c-blog-article__title').innerText

      const images = Array.from(document.querySelectorAll('.p-blog-article img')).map(item => item.currentSrc)
      createZip(title, images.length > 0 ? images : null, false)
    },
    'downloadTextAndImg'
  )

  GM_registerMenuCommand(
    '打包下载并百度翻译',
    function (event) {
      const title = document.querySelector('.c-blog-article__title').innerText

      const images = Array.from(document.querySelectorAll('.p-blog-article img')).map(item => item.currentSrc)
      createZip(title, images.length > 0 ? images : null, 'baidu')
    },
    'downloadTextWithBaiduTransAndImg'
  )

  GM_registerMenuCommand(
    '打包下载并谷歌翻译(质量很差且需要梯子)',
    function (event) {
      const title = document.querySelector('.c-blog-article__title').innerText

      const images = Array.from(document.querySelectorAll('.p-blog-article img')).map(item => item.currentSrc)
      createZip(title, images.length > 0 ? images : null, 'google')
    },
    'downloadTextWithGoogleTransAndImg'
  )

  function createZip(name, imageUrls, transType) {
    var zip = new JSZip()

    var folder = zip.folder(name)

    const text = parseText(document.querySelector('.p-blog-article'))

    folder.file('文本内容.txt', text)

    let requests = imageUrls.map(url => fetch(url))

    if (transType === 'google') {
      requests.push(translateByGoogle(text))
    } else if (transType === 'baidu') {
      requests.push(translateByBaidu(text))
    }

    Promise.all(requests).then(results => {
      for (let index = 0; index < imageUrls.length; index++) {
        const data = results[index]
        folder.file(index + 1 + '.jpg', data.blob(), { binary: true })
      }
      if (transType) {
        const transResult = getTransResult(results[results.length - 1], transType)
        if (transResult) {
          folder.file('机翻结果.txt', transResult)
        }
      }
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

  function translateByGoogle(text) {
    const googleUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=bd&dj=1&source=input&hl=zh-CN&sl=auto&tl='

    const enc = encodeURIComponent(text)

    const url = googleUrl + 'zh-CN&q=' + enc
    return xGet(url)
  }

  function translateByBaidu(query) {
    var appid = '***********'
    var key = '***********'
    var salt = new Date().getTime()
    var from = 'jp'
    var to = 'zh'
    var str1 = appid + query + salt + key
    var sign = md5(str1)

    return new Promise((resolve, reject) => {
      $.ajax({
        url: 'https://api.fanyi.baidu.com/api/trans/vip/translate',
        type: 'get',
        dataType: 'jsonp',
        data: {
          q: query,
          appid: appid,
          salt: salt,
          from: from,
          to: to,
          sign: sign
        },
        success: function (res, textStatus, request) {
          resolve(res)
        },
        error: function () {
          reject()
        }
      })
    })
  }

  function getTransResult(result, transType) {
    if (transType === 'google') {
      const sentences = result.response.sentences
      return sentences ? sentences.map(s => s.trans).join('') : ''
    } else if (transType === 'baidu') {
      const translateResult = result.trans_result
      return translateResult ? translateResult.map(s => s.dst).join('\n') : ''
    }
  }

  function loadScript(resourceName) {
    const scriptText = GM_getResourceText(resourceName)
    const scriptEl = document.createElement('script')
    scriptEl.textContent = scriptText
    document.body.appendChild(scriptEl)
  }

  function xGet(url, type = 'json') {
    return new Promise((success, fail) => {
      GM_xmlhttpRequest({
        method: 'GET',
        timeout: 10 * 1000,
        url: url,
        responseType: type,
        onload: success,
        onerror: fail,
        ontimeout: fail
      })
    })
  }
})()
