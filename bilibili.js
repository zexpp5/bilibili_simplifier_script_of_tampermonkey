// ==UserScript==
// @name         b站首页推荐纯享版
// @namespace    http://tampermonkey.net/
// @version      3.0.2
// @description  这是一个清爽版b站首页的脚本，可以使得首页只有首页推荐，你不再需要忍受bilibili繁复的首页，没有直播、番剧、电视剧、电影一系列让人眼花缭乱的版块，就一个首页推荐，让你能轻松的浏览，不再是只有顶部一小块窗口还不能往回找，错过了就无了，太草了！【bilibili、b站、哔哩哔哩、首页、清爽、推荐、关注列表、时长筛选】
// @author       Waflare
// @match        https://www.bilibili.com/
// @match        https://www.bilibili.com/?spm_id_from=*
// @icon         https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://bilibili.com&size=48
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.6.0.js
// @license      GPL
// ==/UserScript==

(function () {
  'use strict';
  // 获取首页推荐的数据
  function getFrontPage() {
    let url = 'https://api.bilibili.com/x/web-interface/index/top/rcmd?fresh_type=3';
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: (r) => {
          if (JSON.parse(r.response).code !== 0) {
            resolve([]);
            return;
          }
          let result = JSON.parse(r.response).data.item;
          resolve(result);
        }
      })
    })
  }

  // 获取关注列表视频投稿的数据
  function getFollowPage() {
    let url = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all?type=video&timezone_offset=-480&features=itemOpusStyle`
    followedOffset && (url += `&offset=${followedOffset}`);
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: (r) => {
          if (JSON.parse(r.response).code !== 0) {
            resolve([]);
            return;
          }
          if (parseInt(JSON.parse(r.response).data.offset)) {
            followedOffset = parseInt(JSON.parse(r.response).data.offset);
          }
          let result = JSON.parse(r.response).data.items;
          resolve(result);
        }
      })
    })
  }

  // 获取视频模板
  function getTemplate(item) {
    return `
      <a class='w_item' href='https://www.bilibili.com/video/${item.bvid}' target='_blank' id='${item.bvid}'>
        <div class='w_img_box'>
          <img src='${item.pic}' />
          <div class="w_img_box__pubdate">${formatDate(item.pubdate)}</div>
          <div class="w_img_box__duration">${formatTime(item.duration)}</div>
        </div>
        <div class='w_footer'>
          <div class="w_face">
            <img src='${item.owner.face}' />
          </div>
          <div class='w_detail'>
            <div class='w_title'>${item.title}</div>
            <div class='w_up'>${item.owner.name}</div>
            <div class='w_stat'>
              <div>${formatNum(item.stat.view)}播放</div>
              <div>${formatNum(item.stat.like)}点赞</div>
            </div>
          </div>
        </div>
      </a>
    `
  }

  // 获取关注列表视频投稿的模板
  function getFollowedTemplate(item) {
    const modules = item.modules;
    const { face, name, pub_time } = modules.module_author;
    const { title, duration_text, cover, bvid, stat } = modules.module_dynamic.major.archive;
    return `
      <a class='w_item' href='https://www.bilibili.com/video/${bvid}' target='_blank' id='${bvid}'>
        <div class='w_img_box'>
          <img src='${cover}' />
          <div class="w_img_box__pubdate">${pub_time}</div>
          <div class="w_img_box__duration">${duration_text}</div>
        </div>
        <div class='w_footer'>
          <div class="w_face">
            <img src='${face}' />
          </div>
          <div class='w_detail'>
            <div class='w_title'>${title}</div>
            <div class='w_up'>${name}</div>
            <div class='w_stat'>
              <div>${stat.danmaku}弹幕</div>
              <div>${stat.play}播放</div>
            </div>
          </div>
        </div>
      </a>
    `
  }

  // 控制模板，5个选项，分别是：全部、5分钟以下、5-10分钟、10-30分钟、30分钟以上
  // 选择不同的选项，会改变 localstorage 的值，用于控制视频时长的范围
  function getControlTemplate() {
    return `
      <div id="w_control">
        <div id="w_control_content">
          <div class="w_control_item">
            <input type="radio" name="w_control_item" id="w_control_item_1" value="1" />
            <label for="w_control_item_1" id="w_control_label_1">全部</label>
          </div>
          <div class="w_control_item">
            <input type="radio" name="w_control_item" id="w_control_item_2" value="2" />
            <label for="w_control_item_2" id="w_control_label_2">5分钟以下</label>
          </div>
          <div class="w_control_item">
            <input type="radio" name="w_control_item" id="w_control_item_3" value="3" />
            <label for="w_control_item_3" id="w_control_label_3">5-10分钟</label>
          </div>
          <div class="w_control_item">
            <input type="radio" name="w_control_item" id="w_control_item_4" value="4" />
            <label for="w_control_item_4" id="w_control_label_4">10-30分钟</label>
          </div>
          <div class="w_control_item">
            <input type="radio" name="w_control_item" id="w_control_item_5" value="5" />
            <label for="w_control_item_5" id="w_control_label_5">30分钟以上</label>
          </div>
        </div>
        <div id="w_control_content_mini"></div>
        <div id="w_control_title">
          视频时长
          <div id="w_control_expand">
            <
          </div>
        </div>
      </div>
    `
  }

  // 视频类型控制模板，2个选项，分别是：首页视频、关注视频
  function getVideoTypeControlTemplate() {
    return `
      <div id="w_video_type_control">
        <div id="w_video_type_control_content">
          <div class="w_video_type_control_item">
            <input type="radio" name="w_video_type_control_item" id="w_video_type_control_item_1" value="1" />
            <label for="w_video_type_control_item_1" id="w_video_type_control_label_1">首页视频</label>
          </div>
          <div class="w_video_type_control_item">
            <input type="radio" name="w_video_type_control_item" id="w_video_type_control_item_2" value="2" />
            <label for="w_video_type_control_item_2" id="w_video_type_control_label_2">关注视频</label>
          </div>
        </div>
        <div id="w_video_type_control_content_mini"></div>
        <div id="w_video_type_control_title">
          视频类型
          <div id="w_video_type_control_expand">
            <
          </div>
        </div>
      </div>
    `
  }

  // 输入秒数，返回时分秒格式的时间
  function formatTime(time) {
    let hour = Math.floor(time / 3600);
    let minute = Math.floor((time - hour * 3600) / 60);
    let second = Math.floor(time - hour * 3600 - minute * 60);
    let result = '';
    if (hour > 0) {
      // 如果小时大于0，则显示小时，前面补0
      result += (hour < 10 ? '0' + hour : hour) + ':';
    }
    result += (minute < 10 ? '0' + minute : minute) + ':';
    result += (second < 10 ? '0' + second : second);
    return result;
  }

  // 格式化时间，输入时间戳（秒），如果是一周内的时间，则显示几天前，否则返回yyyy-mm-dd格式的时间
  function formatDate(time) {
    let now = new Date();
    let date = new Date(time * 1000);
    let diff = now.getTime() - date.getTime();
    let day = Math.floor(diff / (24 * 3600 * 1000));
    let hour = Math.floor(diff / (3600 * 1000));
    if (hour == 0) {
      return Math.floor(diff / (60 * 1000)) + '分钟前';
    } else if (day == 0) {
      return hour + '小时前';
    } else if (day < 7) {
      return day + '天前';
    } else {
      return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    }
  }

  // 老版 b站
  async function formatData() {
    $('#internationalHeader').after(`
      <div id="w_body">
        <div id="w_content"></div>
        <div id="w_content__loading">
          <div class="spinner">
            <div class="rect1"></div>
            <div class="rect2"></div>
            <div class="rect3"></div>
            <div class="rect4"></div>
            <div class="rect5"></div>
          </div>
          <div id="w_content__loading_text"></div>
        </div>
      </div>
    `);
    $('#w_body').append(getVideoTypeControlTemplate());
    $('#w_body').append(getControlTemplate());
    const videoType = window.localStorage.getItem('video-type');
    if (videoType == '2') {
      let data = []
      while (data.length < 20) {
        const res = await getFollowedVideoData();
        data.push(...res)
      }
      console.log('followed', data);
      for (let item of data) {
        $('#w_content').append(getFollowedTemplate(item));
      }
    } else {
      let data = await getVideoData();
      console.log(data);
      for (let item of data) {
        $('#w_content').append(getTemplate(item));
      }
    }
    $('#w_body').append('<div id="w_btn">顶</div>');
    $('#w_btn').on('click', backTop);
  }

  // 新版 b站
  async function formatDataNew() {
    $('#i_cecream').after(`
      <div id="w_body">
        <div id="w_content"></div>
        <div id="w_content__loading">
          <div class="spinner">
            <div class="rect1"></div>
            <div class="rect2"></div>
            <div class="rect3"></div>
            <div class="rect4"></div>
            <div class="rect5"></div>
          </div>
          <div id="w_content__loading_text"></div>
        </div>
      </div>
    `);
    $('#w_body').append(getVideoTypeControlTemplate());
    $('#w_body').append(getControlTemplate());
    const videoType = window.localStorage.getItem('video-type');
    if (videoType == '2') {
      let data = []
      while (data.length < 20) {
        const res = await getFollowedVideoData();
        data.push(...res)
      }
      console.log('followed', data);
      for (let item of data) {
        $('#w_content').append(getFollowedTemplate(item));
      }
    } else {
      let data = await getVideoData();
      console.log(data);
      for (let item of data) {
        $('#w_content').append(getTemplate(item));
      }
    }
    $('#w_body').append('<div id="w_btn">顶</div>');
    $('#w_btn').on('click', backTop);
  }

  // 控制loading的显示和隐藏以及文案
  function setLoading(show, text = '') {
    $('#w_content__loading_text').text(text);
    if (show) {
      $('#w_content__loading').show();
    } else {
      $('#w_content__loading').hide();
    }
  }

  // 获取视频列表，入参size表示一次的视频数量
  async function getVideoData(size = 20) {
    let data = []

    const videoTimeRange = window.localStorage.getItem('video-time-range');
    const type = ['', '5分钟以下的', '5-10分钟的', '10-30分钟的', '30分钟以上的']
    const videoTimeRangeType = type[videoTimeRange - 1]
    setLoading(true, '正在获取' + videoTimeRangeType + '视频列表，请稍候...');
    while (data.length < size) {
      let res = await getFrontPage();
      if (res.length == 0) {
        break;
      }
      // res.duration 为视频时长，单位为秒，如果视频时长不在范围内，则跳过
      if (videoTimeRange) {
        switch (videoTimeRange) {
          case '1':
            break;
          case '2':
            res = res.filter(item => item.duration < 300);
            break;
          case '3':
            res = res.filter(item => item.duration >= 300 && item.duration < 600);
            break;
          case '4':
            res = res.filter(item => item.duration >= 600 && item.duration < 1800);
            break;
          case '5':
            res = res.filter(item => item.duration >= 1800);
            break;
        }
      }
      data.push(...res);
    }
    setLoading(false);
    const len = data.length - data.length % 5;
    return data.slice(0, len);
  }

  // 获取关注的视频列表
  let followedOffset = 0;
  async function getFollowedVideoData() {
    let data = [];
    const videoTimeRange = window.localStorage.getItem('video-time-range');
    const type = ['', '5分钟以下的', '5-10分钟的', '10-30分钟的', '30分钟以上的']
    const videoTimeRangeType = type[videoTimeRange - 1]
    setLoading(true, `正在获取${videoTimeRangeType}关注视频列表，请稍候...`);
    let res = await getFollowPage();
    if (res.length == 0) {
      setLoading(false);
      return
    }
    const duration = (item) => getSecond(item.modules.module_dynamic.major.archive.duration_text)
    switch (videoTimeRange) {
      case '1':
        break;
      case '2':
        res = res.filter(item => duration(item) < 300);
        break;
      case '3':
        res = res.filter(item => duration(item) >= 300 && duration(item) < 600);
        break;
      case '4':
        res = res.filter(item => duration(item) >= 600 && duration(item) < 1800);
        break;
      case '5':
        res = res.filter(item => duration(item) >= 1800);
        break;
    }
    data.push(...res);
    if (data.length == 0) {
      await getFollowedVideoData();
    }
    setLoading(false);
    return data;
  }

  // 输入hh:mm:ss或者mm:ss格式的时间，返回秒数
  function getSecond(time) {
    let arr = time.split(':');
    let result = 0;
    if (arr.length === 2) {
      result += parseInt(arr[0]) * 60;
      result += parseInt(arr[1]);
    } else {
      result += parseInt(arr[0]) * 3600;
      result += parseInt(arr[1]) * 60;
      result += parseInt(arr[2]);
    }
    return result;
  }

  let timer = null;
  function backTop() {
    let isSafari = /^(?=.Safari)(?!.Chrome)/.test(navigator.userAgent);
    if (isSafari) {
      cancelAnimationFrame(timer);
      timer = requestAnimationFrame(function fn() {
        var oTop = document.body.scrollTop || document.documentElement.scrollTop;
        if (oTop > 0) {
          scrollTo(0, oTop - oTop / 8);
          timer = requestAnimationFrame(fn);
        } else {
          cancelAnimationFrame(timer);
        }
      });
    } else {
      scrollTo({
        left: 0,
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  async function moreVideo() {
    const videoType = window.localStorage.getItem('video-type');
    if (videoType == '2') {
      let data = []
      while (data.length < 20) {
        const res = await getFollowedVideoData();
        data.push(...res)
      }
      for (let item of data) {
        $('#w_content').append(getFollowedTemplate(item));
      }
    } else {
      let data = await getVideoData();
      for (let item of data) {
        $('#w_content').append(getTemplate(item));
      }
    }
  }

  // 判断是否是新版
  function isNewOrOld() {
    return $('#i_cecream').length > 0;
  }

  // 给视频时长选择框绑定事件
  function bindVideoTimeRangeEvent() {
    document.querySelectorAll('#w_control_content label').forEach(item => {
      item.addEventListener('click', function (e) {
        let value = e.target.getAttribute('for').split('_').pop();
        window.localStorage.setItem('video-time-range', value);
      })
    })
  }

  // 给视频类型选择框绑定事件
  function bindVideoTypeEvent() {
    document.querySelectorAll('#w_video_type_control_content label').forEach(item => {
      item.addEventListener('click', function (e) {
        let value = e.target.getAttribute('for').split('_').pop();
        window.localStorage.setItem('video-type', value);
      })
    })
  }

  function handleTimeControlExpand(expand) {
    if (expand == 'false') {
      window.localStorage.setItem('w_time_expand', 'true');
      document.getElementById('w_control_content').style.display = 'flex';
      const mini = document.getElementById('w_control_content_mini')
      mini.style.display = 'none'
    } else {
      window.localStorage.setItem('w_time_expand', 'false');
      document.getElementById('w_control_content').style.display = 'none';
      const mini = document.getElementById('w_control_content_mini')
      const videoTimeRange = window.localStorage.getItem('video-time-range');
      const type = ['全部时长', '5分钟以下的', '5-10分钟的', '10-30分钟的', '30分钟以上的']
      const videoTimeRangeType = type[videoTimeRange - 1]
      mini.innerText = videoTimeRangeType;
      mini.style.display = 'block';
    }
  }

  function handleTypeControlExpand(expand) {
    if (expand == 'false') {
      window.localStorage.setItem('w_type_expand', 'true');
      document.getElementById('w_video_type_control_content').style.display = 'flex';
      const mini = document.getElementById('w_video_type_control_content_mini')
      mini.style.display = 'none'
    } else {
      window.localStorage.setItem('w_type_expand', 'false');
      document.getElementById('w_video_type_control_content').style.display = 'none';
      const mini = document.getElementById('w_video_type_control_content_mini')
      const videoType = window.localStorage.getItem('video-type');
      const type = ['首页推荐', '关注列表']
      const videoTypeType = type[videoType - 1]
      mini.innerText = videoTypeType;
      mini.style.display = 'block';
    }
  }

  // 给展开收起按钮绑定事件
  function bindExpandEvent() {
    const timeControl = document.getElementById('w_control_expand')
    timeControl.addEventListener('click', function () {
      const w_time_expand = window.localStorage.getItem('w_time_expand');
      handleTimeControlExpand(w_time_expand)
    })
    const typeControl = document.getElementById('w_video_type_control_expand')
    typeControl.addEventListener('click', function () {
      const w_type_expand = window.localStorage.getItem('w_type_expand');
      handleTypeControlExpand(w_type_expand)
    })
  }

  // 主函数
  function main() {
    if(isNewOrOld()){
      formatDataNew();
    } else {
      formatData();
    }
    const w_time_expand = window.localStorage.getItem('w_time_expand');
    const w_type_expand = window.localStorage.getItem('w_type_expand');
    if (w_time_expand == undefined) {
      window.localStorage.setItem('w_time_expand', 'true');
    }
    if (w_type_expand == undefined) {
      window.localStorage.setItem('w_type_expand', 'true');
    }
    handleTimeControlExpand(w_time_expand == 'true' ? 'false' : 'true');
    handleTypeControlExpand(w_type_expand == 'true' ? 'false' : 'true');
    bindVideoTypeEvent();
    bindVideoTimeRangeEvent();
    bindExpandEvent();

    // 获取本地存储的视频类型，设置默认选中
    let videoType = window.localStorage.getItem('video-type');
    if (videoType) {
      $(`#w_video_type_control_label_${videoType}`).click();
    } else {
      $(`#w_video_type_control_label_1`).click();
    }
    // 获取本地存储的时间范围，设置默认选中
    let timeRange = window.localStorage.getItem('video-time-range');
    if (timeRange) {
      $(`#w_control_label_${timeRange}`).click();
    } else {
      $(`#w_control_label_1`).click();
    }

    let timeout = null;
    window.onscroll = function () {
      //距离顶部的距离
      var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      //可视区的高度
      var windowHeight = document.documentElement.clientHeight || document.body.clientHeight;
      //滚动条的总高度
      var scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      //滚动条到底部的条件
      if (scrollTop + windowHeight >= scrollHeight - 10) {
        timeout && clearTimeout(timeout);
        timeout = setTimeout(() => {
          moreVideo();
        }, 300);
      }

      const back_top = document.getElementById('w_btn');
      if (back_top === null) return;
      if (scrollTop > 20 && !isNewOrOld()) {
        back_top.style.display = 'block';
      } else {
        back_top.style.display = 'none';
      }
    }
  }

  function formatNum(num) {
    if (!num) {
      return '0';
    }
    if (num < 10000) {
      return num.toString();
    } else {
      return (num / 10000).toFixed(1).toString() + '万';
    }
  }

  // 执行主函数
  main();

  GM_addStyle(`
    body {
      background-color: #ffffff;
    }
    .international-home {
      min-height: 100vh;
    }
    .international-home .storey-box, .international-footer {
      display: none;
    }
    .international-home .first-screen {
      display: none;
    }
    .header-channel {
      display: none;
    }
    main, .bili-footer {
      display: none !important;
    }
    #w_body {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 40px;
      background-color: ${isNewOrOld() ? '#ffffff;' : '#f1f2f3;'}
    }
    #w_control, #w_video_type_control {
      position: fixed;
      z-index: 999;
      width: fit-content;
      padding: 16px 16px 0;
      background-color: #fff;
      border-radius: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #w_control {
      bottom: 20px;
      left: 0;
    }
    #w_video_type_control {
      bottom: 260px;
      left: 0;
    }
    #w_control_title, #w_video_type_control_title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 20px;
      writing-mode: tb-rl;
      display: flex;
    }
    #w_control_content, #w_video_type_control_content {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    #w_control_content > .w_control_item, #w_video_type_control_content > .w_video_type_control_item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    #w_content__loading {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100px;
      margin-top: 20px;
      margin-bottom: 80px;
      font-size: 14px;
      color: #999;
    }
    .w_control_item > label, .w_video_type_control_item > label {
      width: 100px;
      height: 30px;
      line-height: 30px;
      border: 1px solid #e6e6e6;
      border-radius: 4px;
      padding: 0 10px;
      margin-right: 10px;
      text-align: center;
    }
    .w_control_item > label:hover, .w_video_type_control_item > label:hover {
      cursor: pointer;
      border-color: #ff6699;
    }
    .w_control_item > input, .w_video_type_control_item > input {
      display: none;
    }
    .w_control_item > input:checked + label, .w_video_type_control_item > input:checked + label {
      border-color: #ff6699;
      color: #ff6699;
    }

    @media screen and (max-width: 1870px) {
      #w_content {
        width: 1414px !important;
      }
      .w_item {
        width: 270px !important;
      }
    }

    @media screen and (max-width: 1654px) {
      #w_content {
        width: 1198px !important;
      }
      .w_item {
        width: 225px !important;
      }
    }

    @media screen and (max-width: 1438px) {
      #w_content {
        width: 999px !important;
      }
      .w_item {
        width: 186px !important;
      }
    }

    #w_content {
      margin-top: 24px;
      max-width: 1610px;
      display: flex;
      justify-content: flex-start;
      flex-flow: wrap;
    }
    .w_item {
      width: 310px;
      margin-bottom: 10px;
      display: flex;
      flex-direction: column;
      margin-left: 10px;
      transition:all 0.2s;
    }
    .w_item:hover {
      cursor: pointer;
      transform: scale(1.01);
    }
    .w_item > .w_img_box{
      position: relative;
      overflow: hidden;
      padding-top: 62.5%;
      border-radius: 6px;
      background-image: url('https://i.w3tt.com/2021/12/05/BAH9l.png') no-repeat;
    }
    .w_img_box > img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
    }
    .w_img_box > .w_img_box__duration {
      position: absolute;
      bottom: 10px;
      right: 10px;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      background-color: rgba(0, 0, 0, 0.5);
      padding: 2px 4px;
    }
    .w_img_box > .w_img_box__pubdate {
      position: absolute;
      bottom: 10px;
      left: 10px;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      background-color: rgba(0, 0, 0, 0.5);
      padding: 2px 4px;
    }
    .w_item > .w_detail {
      width: 100%;
    }
    .w_footer {
      display: flex;
    }
    .w_footer > .w_face {
      width: 56px;
      padding: 10px;
      box-size: border-sizing;
    }
    .w_footer > .w_detail {
      flex: 1;
    }
    .w_face > img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
    }
    .w_detail > .w_title {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      font-size: 16px;
      line-height: 22px;
      border-top: 10px solid transparent;
      border-bottom: 5px solid transparent;
    }
    .w_detail > .w_up {
      font-size: 14px;
      color: #606060;
    }
    .w_detail > .w_stat {
      font-size: 12px;
      color: #606060;
      line-height: 18px;
      display: flex;
      justify-content: space-between;
    }
    #w_btn {
      display: none;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      line-height: 50px;
      font-size: 20px;
      text-align: center;
      color: #9999b2;
      font-weight: 600;
      background-color: #f6f9fa;
      position: fixed;
      bottom: 30px;
      right: 30px;
    }
    #w_btn:hover {
      cursor: pointer;
    }
    .palette-button-outer div[class="primary-btn"] {
      display: none;
    }
    .spinner {
      margin: 100px auto 30px;
      width: 50px;
      height: 60px;
      text-align: center;
      font-size: 10px;
    }
    .spinner > div {
      background-color: #67CF22;
      height: 100%;
      width: 6px;
      display: inline-block;
      -webkit-animation: stretchdelay 1.2s infinite ease-in-out;
      animation: stretchdelay 1.2s infinite ease-in-out;
    }
    .spinner .rect2 {
      -webkit-animation-delay: -1.1s;
      animation-delay: -1.1s;
    }
    .spinner .rect3 {
      -webkit-animation-delay: -1.0s;
      animation-delay: -1.0s;
    }
    .spinner .rect4 {
      -webkit-animation-delay: -0.9s;
      animation-delay: -0.9s;
    }
    .spinner .rect5 {
      -webkit-animation-delay: -0.8s;
      animation-delay: -0.8s;
    }
    @-webkit-keyframes stretchdelay {
      0%, 40%, 100% { -webkit-transform: scaleY(0.4) }
      20% { -webkit-transform: scaleY(1.0) }
    }
    @keyframes stretchdelay {
      0%, 40%, 100% {
        transform: scaleY(0.4);
        -webkit-transform: scaleY(0.4);
      }  20% {
        transform: scaleY(1.0);
        -webkit-transform: scaleY(1.0);
      }
    }
    #w_control_expand, #w_video_type_control_expand {
      margin-top: 10px;
      writing-mode: horizontal-tb;
      cursor: pointer;
      text-align: center;
    }
    #w_control_content_mini, #w_video_type_control_content_mini {
      color: #9999b2;
      writing-mode: tb-rl;
    }
  `)
})();