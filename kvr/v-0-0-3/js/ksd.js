//KSD: Kunniaa SnapDrop. KSD modified from snapdrop, Https://snapdrop.net
//Synchronize kunniaa voice repeater data between deivces in a local network.
//Should import jszip https://stuk.github.io/jszip/ in html head frist,
//for example <script src="js/jszip.min.js"></script>

//todo 
// 1. 展示传输进度，表示在行动，以免出错  
// 2. 如果对方是空，可能不进行了，实际上需要把自己的传给对方，因此要有一个判断
// 3. 在小米上不成功，在iphone上成功了
// 4. 增加一个搜索功能，否则总是连不上，不能显示搜索的进度
// 5. 有时候不灵，从同一个局域网出去，看不到其他device。
// 6. iphone的浏览器似乎不支持复读功能
// 7. iphone的浏览器，收到了mp3数据，不能存入indexeddb，当时可以播放，重新打开网页就没有了。
// 8. 有可能需要自己写一个nodejs服务端，部署到cloudflare，用免费worker节点，每天免费10万次请求。
// 或者Vercel。
// 9. 全面测试kvr在edege，firefox，以及小米手机上的功能是否正常

(function () {
  //KSD namespace
  window.KSD = window.KSD || {};
  window.isRtcSupported = !!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection);
  if(!window.isRtcSupported){
    alert('RTC is not support!');
  }
  //KSD: only for debuging, print running sequence index of function
  var g_idx = 0;

  // 同步是否运行的指标，避免循环执行
  var g_sync_once = false;

  // debug mobile end
  eruda.init();

  KSD.Events = class {
    static fire(type, detail) {
      window.dispatchEvent(new CustomEvent(type, { detail: detail }));
    }

    static on(type, callback) {
      return window.addEventListener(type, callback, false);
    }

    static off(type, callback) {
      return window.removeEventListener(type, callback, false);
    }
  }

  //KSD: synchronize data between two peers from here
  KSD.audioSync = function (el) {
    console.log('audioSync');
    console.log('el.data-peer-id = ', el.getAttribute('data-peer-id'));
    KSD.Events.fire('sync-start', el.getAttribute('data-peer-id'));
  }

  KSD.ServerConnection = class {
    constructor() {
      let currentTime = new Date();
      let formattedTime = currentTime.getHours() + ':' + currentTime.getMinutes() + ':' + currentTime.getSeconds() + '.' + currentTime.getMilliseconds();
      let logStr = '[' + g_idx + ', ' + formattedTime + ', ' + this.constructor.name + ', ' +
        new Error().stack.split('\n')[1].trim().split(' ')[1] + ']';
      g_idx += 1;

      this._connect();
      KSD.Events.on('beforeunload', e => this._disconnect());
      KSD.Events.on('pagehide', e => this._disconnect());
    }

    _connect() {
      let currentTime = new Date();
      let formattedTime = currentTime.getHours() + ':' + currentTime.getMinutes() + ':' + currentTime.getSeconds() + '.' + currentTime.getMilliseconds();
      let logStr = '[' + g_idx + ', ' + formattedTime + ', ' + this.constructor.name + ', ' +
        new Error().stack.split('\n')[1].trim().split(' ')[1] + ']';
      g_idx += 1;

      clearTimeout(this._reconnectTimer);
      if (this._isConnected() || this._isConnecting()) return;
      const ws = new WebSocket(this._endpoint());
      ws.binaryType = 'arraybuffer';
      ws.onmessage = e => this._onMessage(e.data);
      ws.onclose = e => this._onDisconnect();
      this._socket = ws;
    }

    _onMessage(msg) {
      let currentTime = new Date();
      let formattedTime = currentTime.getHours() + ':' + currentTime.getMinutes() + ':' + currentTime.getSeconds() + '.' + currentTime.getMilliseconds();
      let logStr = '[' + g_idx + ', ' + formattedTime + ', ' + this.constructor.name + ', ' +
        new Error().stack.split('\n')[1].trim().split(' ')[1] + ']';
      g_idx += 1;

      msg = JSON.parse(msg);

      console.log(logStr, 'msg = ', msg);

      switch (msg.type) {
        case 'peers':
          KSD.Events.fire('peers', msg.peers);
          break;
        case 'peer-joined':
          KSD.Events.fire('peer-joined', msg.peer);
          break;
        case 'peer-left':
          KSD.Events.fire('peer-left', msg.peerId);
          break;
        case 'signal':
          KSD.Events.fire('signal', msg);
          break;
        case 'ping':
          this.send({ type: 'pong' });
          break;
        case 'display-name':
          KSD.Events.fire('display-name', msg);
          break;
        default:
          console.error('WS: unkown message type', msg);
      }
    }

    send(message) {
      if (!this._isConnected()) return;
      this._socket.send(JSON.stringify(message));
    }

    _endpoint() {
      const url = "wss://api.snapdrop.net/server/webrtc";
      // const url = "ws://192.168.188.101:3000/server/webrtc";
      return url;
    }

    _disconnect() {
      this.send({ type: 'disconnect' });
      this._socket.onclose = null;
      this._socket.close();
    }

    _onDisconnect() {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = setTimeout(_ => this._connect(), 5000);
    }

    _isConnected() {
      return this._socket && this._socket.readyState === this._socket.OPEN;
    }

    _isConnecting() {
      return this._socket && this._socket.readyState === this._socket.CONNECTING;
    }
  }

  KSD.PeersUI = class {
    constructor() {
      KSD.Events.on('peer-joined', e => this._onPeerJoined(e.detail));
      KSD.Events.on('peer-left', e => this._onPeerLeft(e.detail));
      KSD.Events.on('peers', e => this._onPeers(e.detail));
    }

    _onPeerJoined(peer) {
      if (document.getElementById(peer.id)) return;
      const peerUI = new KSD.PeerUI(peer);
      document.getElementById('deviceContainer').appendChild(peerUI.el);
    }

    _onPeers(peers) {
      this._clearPeers();
      peers.forEach(peer => this._onPeerJoined(peer));
    }

    _onPeerLeft(peerId) {
      const peer = document.getElementById(peerId);
      if (!peer) return;
      peer.remove();
    }

    _clearPeers() {
      const peers = document.getElementById('deviceContainer').innerHTML = '';
    }
  }

  KSD.PeerUI = class {
    html() {
      return `
            <div class="m-5">
              <input type="file" class="hidden" multiple>
              <div class="flex flow-col items-center">
                <div class="flex flex-col items-center">
                  <div class="flex flex-row m-5">
                    <svg class="w-10 h-10 fill-blue-500" viewBox="0 0 24 24">
                      <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z"></path>
                    </svg>
                    <button class="ml-4 px-4 py-2 bg-gray-100 text-blue-600 text-base font-semibold rounded-lg shadow-md hover:bg-gray-200 transition duration-200"
                    onclick="KSD.audioSync(this)">
                      Sync
                    </button>
                  </div>
                  <div class="name text-center text-sm"></div>
                  <div class="device-name text-sm"></div>
                  <div class="text-sm"></div>
                </div>
              </div>
              <div class="progress">
                <div></div>
                <div></div>
              </div>
            </div>`
    }

    constructor(peer) {
      this._peer = peer;
      this._initDom();
    }

    _initDom() {
      const el = document.createElement('div');
      el.id = this._peer.id;
      el.innerHTML = this.html();
      el.ui = this;
      el.querySelector('.name').textContent = this._displayName();
      el.querySelector('.device-name').textContent = this._deviceName();
      el.querySelector('button').setAttribute('data-peer-id', this._peer.id);
      this.el = el;
    }

    _displayName() {
      return this._peer.name.displayName;
    }

    _deviceName() {
      return this._peer.name.deviceName;
    }
  }

  KSD.Peer = class {
    constructor(serverConnection, peerId) {
      this._server = serverConnection;
      this._peerId = peerId;
      this._filesQueue = [];
      this._busy = false;
    }

    sendJSON(message) {
      this._send(JSON.stringify(message));
    }

    sendFile(content) {
      this._filesQueue.push(content);
      if (this._busy) return;
      this._dequeueFile();
    }

    _dequeueFile() {
      if (!this._filesQueue.length) return;
      this._busy = true;
      const content = this._filesQueue.shift();
      this._sendFile(content);
    }

    _sendFile(content) {
      this.sendJSON({
        type: 'header',
        name: content.name || 'blob',
        mime: content.type,
        size: content.size
      });

      this._chunker = new KSD.FileChunker(content,
        chunk => this._send(chunk),
        offset => this._onPartitionEnd(offset));
      this._chunker.nextPartition();
    }

    _onPartitionEnd(offset) {
      this.sendJSON({ type: 'partition', offset: offset });
    }

    _onReceivedPartitionEnd(offset) {
      this.sendJSON({ type: 'partition-received', offset: offset });
    }

    _sendNextPartition() {
      if (!this._chunker || this._chunker.isFileEnd()) return;
      this._chunker.nextPartition();
    }

    _onMessage(message) {
      let currentTime = new Date();
      let formattedTime = currentTime.getHours() + ':' + currentTime.getMinutes() + ':' + currentTime.getSeconds() + '.' + currentTime.getMilliseconds();
      let logStr = '[' + g_idx + ', ' + formattedTime + ', ' + this.constructor.name + ', ' +
        new Error().stack.split('\n')[1].trim().split(' ')[1] + ']';
      g_idx += 1;

      console.log(logStr, 'message = ', message);

      if (typeof message !== 'string') {
        this._onChunkReceived(message);
        return;
      }
      message = JSON.parse(message);
      switch (message.type) {
        case 'header':
          this._onFileHeader(message);
          break;
        case 'partition':
          this._onReceivedPartitionEnd(message);
          break;
        case 'partition-received':
          this._sendNextPartition();
          break;
        case 'transfer-complete':
          this._onTransferCompleted();
          break;
        //KSD: from here, KSD message
        case 'sync-give-me-all-your-keys':
          this._syncSendAllMyKeysToYour();
          break;
        case 'sync-send-all-my-keys-to-your':
          this._syncCalcSyncList(message.val);
          break;
        case 'sync-give-me-files':
          this._syncSendZipFile(message.val);
          break;
      }
    }

    async _syncSendZipFile(files) {
      let currentTime = new Date();
      let formattedTime = currentTime.getHours() + ':' + currentTime.getMinutes() + ':' + currentTime.getSeconds() + '.' + currentTime.getMilliseconds();
      let logStr = '[' + g_idx + ', ' + formattedTime + ', ' + this.constructor.name + ', ' +
        new Error().stack.split('\n')[1].trim().split(' ')[1] + ']';
      g_idx += 1;

      console.log('\n\n\n==============');
      console.log(logStr);

      //KSD: user define part
      //Read IndexedDB, then build a zip file, and send it to peer
      let fileList = [];
      for (let file of files) {
        let data = await KDB.db[KDB.objectStorName].get(file);
        fileList.push({ key: file, value: data.value });
      }

      const zip = new JSZip();
      for (const element of fileList) {
        console.log('element = ', JSON.stringify(element));
        if (element.key.endsWith('.rp')) {
          // console.log('find .rp');
          let tmpStr = element.value.map(e => String(e[0]) + ',' + String(e[1])).reduce((a, b) => a + '\n' + b) + '\n';
          zip.file(element.key + ".txt", tmpStr);
        } else if (element.key.endsWith('.mp3') ||
          element.key.endsWith('.egg') ||
          element.key.endsWith('.wav')) {
          // console.log('find audio');
          zip.file(element.key, element.value);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      this.sendFile(content);

      console.log(logStr, 'end');
    }

    async _syncCalcSyncList(peer_keys) {
      let currentTime = new Date();
      let formattedTime = currentTime.getHours() + ':' + currentTime.getMinutes() + ':' + currentTime.getSeconds() + '.' + currentTime.getMilliseconds();
      let logStr = '[' + g_idx + ', ' + formattedTime + ', ' + this.constructor.name + ', ' +
        new Error().stack.split('\n')[1].trim().split(' ')[1] + ']';
      g_idx += 1;
      console.log('\n\n\n==============');
      console.log(logStr);

      //KSD: use define part
      //Calcuate the keys should be synchormized
      let my_keys = await KDB.db[KDB.objectStorName].toCollection().keys();
      console.log(logStr, 'my_keys = ', my_keys);
      const pullKeys = peer_keys.filter(key => !my_keys.includes(key));
      if (pullKeys.length <= 0) {
        console.log(logStr, 'pullKeys = [], then peer do sync');
        this.sendJSON({ type: 'transfer-complete' });
      } else {
        console.log('List of keys to be obtained from peer = ', JSON.stringify(pullKeys));
        const key_list = { 'type': 'sync-give-me-files', 'val': pullKeys };
        this.sendJSON(key_list);
        console.log('send pullkeys end');
      }
    }

    //KSD: get keys from peer
    async _syncSendAllMyKeysToYour() {
      let logStr = '[' + g_idx + ':' + this.constructor.name + ':' +
        new Error().stack.split('\n')[1].trim().split(' ')[1] + ']';
      g_idx += 1;
      console.log('\n\n\n==============');
      console.log(logStr);

      console.log(logStr, 'g_sync_once = ', g_sync_once);

      //在每一次同步中，一个device中，本函数只运行一次，否则就是死循环，因此用g_sync_once控制
      if (g_sync_once) {
        console.log(logStr, 'g_sync_once is true');
        g_sync_once = false;
        console.log(logStr, 'reset g_sync_once = ', g_sync_once);
      } else {
        console.log(logStr, 'g_sync_once is false');
        const keys = await KDB.db[KDB.objectStorName].toCollection().keys();
        this.sendJSON({ 'type': 'sync-send-all-my-keys-to-your', 'val': keys });
        //为了避免循环，这个函数在每个device上只运行一次。
        g_sync_once = true;
        console.log(logStr, 'reset g_sync_once = ', g_sync_once);
      }

      console.log(logStr, 'end');
    }

    _onFileHeader(header) {
      this._lastProgress = 0;
      this._digester = new KSD.FileDigester({
        name: header.name,
        mime: header.mime,
        size: header.size
      }, file => this._onFileReceived(file));
    }

    _onChunkReceived(chunk) {
      if (!chunk.byteLength) return;
      this._digester.unchunk(chunk);
      const progress = this._digester.progress;
      // occasionally notify sender about our progress 
      if (progress - this._lastProgress < 0.01) return;
      this._lastProgress = progress;
    }

    async _onFileReceived(proxyFile) {
      let logStr = '[' + g_idx + ':' + this.constructor.name + ':' +
        new Error().stack.split('\n')[1].trim().split(' ')[1] + ']';
      g_idx += 1;
      console.log('\n\n\n==============');
      console.log(logStr);

      console.log(logStr, 'file-received', proxyFile);

      //KSD: user define part
      //Unzip file, and save key-value to IndexedDB
      const zipBlob = proxyFile.blob;
      const zip = await JSZip.loadAsync(zipBlob);

      const fileCount = Object.keys(zip.files).length;
      console.log(`There are ${fileCount} files in the ZIP file`);
      let i = 0;
      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        i += 1;
        if (zipEntry.dir) continue;
        let key = filename;
        if (filename.endsWith('.rp.txt')) {
          key = filename.slice(0, -4); // 去掉'.txt'
        }

        const exists = await KDB.checkKeyExists(key);
        if (exists) {
          console.log(`'${key}' already exists in the database, skipping`);
          continue;
        }

        const fileData = await zipEntry.async('arraybuffer');
        if (filename.endsWith('.rp.txt')) {
          let tmpStr = new TextDecoder().decode(fileData);
          if (tmpStr.endsWith('\n')) {
            tmpStr = tmpStr.slice(0, tmpStr.length - 1);
          }
          const tmpList = tmpStr.split('\n').map(e => e.split(',')).map(e => [Number(e[0]), Number(e[1])]);
          await KDB.storeData(key, tmpList);
          console.log('import:', key);
        } else {
          await KDB.storeData(key, fileData);
          console.log('import:', key);
        }
        console.log(`'${key}'Successfully saved in the database`);
      }
      this.sendJSON({ type: 'transfer-complete' });
    }

    _onTransferCompleted() {
      this._reader = null;
      this._busy = false;
      this._dequeueFile();
      //KSD: run from peer, get push key, and synchronize them 
      this.sendJSON({ 'type': 'sync-give-me-all-your-keys', 'val': '' });
    }
  }

  KSD.FileChunker = class {
    constructor(file, onChunk, onPartitionEnd) {
      this._chunkSize = 64000; // 64 KB
      this._maxPartitionSize = 1e6; // 1 MB
      this._offset = 0;
      this._partitionSize = 0;
      this._file = file;
      this._onChunk = onChunk;
      this._onPartitionEnd = onPartitionEnd;
      this._reader = new FileReader();
      this._reader.addEventListener('load', e => this._onChunkRead(e.target.result));
    }

    nextPartition() {
      this._partitionSize = 0;
      this._readChunk();
    }

    _readChunk() {
      const chunk = this._file.slice(this._offset, this._offset + this._chunkSize);
      this._reader.readAsArrayBuffer(chunk);
    }

    _onChunkRead(chunk) {
      this._offset += chunk.byteLength;
      this._partitionSize += chunk.byteLength;
      this._onChunk(chunk);
      if (this.isFileEnd()) return;
      if (this._isPartitionEnd()) {
        this._onPartitionEnd(this._offset);
        return;
      }
      this._readChunk();
    }

    repeatPartition() {
      this._offset -= this._partitionSize;
      this._nextPartition();
    }

    _isPartitionEnd() {
      return this._partitionSize >= this._maxPartitionSize;
    }

    isFileEnd() {
      return this._offset >= this._file.size;
    }

    get progress() {
      return this._offset / this._file.size;
    }
  }

  KSD.FileDigester = class {
    constructor(meta, callback) {
      this._buffer = [];
      this._bytesReceived = 0;
      this._size = meta.size;
      this._mime = meta.mime || 'application/octet-stream';
      this._name = meta.name;
      this._callback = callback;
    }

    unchunk(chunk) {
      this._buffer.push(chunk);
      this._bytesReceived += chunk.byteLength || chunk.size;
      const totalChunks = this._buffer.length;
      this.progress = this._bytesReceived / this._size;
      if (isNaN(this.progress)) this.progress = 1
      if (this._bytesReceived < this._size) return;
      let blob = new Blob(this._buffer, { type: this._mime });
      this._callback({
        name: this._name,
        mime: this._mime,
        size: this._size,
        blob: blob
      });
    }
  }

  KSD.RTCPeer = class extends KSD.Peer {
    constructor(serverConnection, peerId) {
      super(serverConnection, peerId);
      if (!peerId) return; // we will listen for a caller
      this._connect(peerId, true);
    }

    _connect(peerId, isCaller) {
      if (!this._conn) this._openConnection(peerId, isCaller);
      if (isCaller) {
        this._openChannel();
      } else {
        this._conn.ondatachannel = e => this._onChannelOpened(e);
      }
    }

    _openConnection(peerId, isCaller) {
      this._isCaller = isCaller;
      this._peerId = peerId;
      this._conn = new RTCPeerConnection(KSD.RTCPeer.config);
      this._conn.onicecandidate = e => this._onIceCandidate(e);
      this._conn.onconnectionstatechange = e => this._onConnectionStateChange(e);
      this._conn.oniceconnectionstatechange = e => this._onIceConnectionStateChange(e);
    }

    _openChannel() {
      const channel = this._conn.createDataChannel('data-channel', {
        ordered: true,
        reliable: true // Obsolete. See https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/reliable
      });
      channel.onopen = e => this._onChannelOpened(e);
      this._conn.createOffer().then(d => this._onDescription(d)).catch(e => this._onError(e));
    }

    _onDescription(description) {
      this._conn.setLocalDescription(description)
        .then(_ => this._sendSignal({ sdp: description }))
        .catch(e => this._onError(e));
    }

    _onIceCandidate(event) {
      if (!event.candidate) return;
      this._sendSignal({ ice: event.candidate });
    }

    onServerMessage(message) {
      if (!this._conn) this._connect(message.sender, false);

      if (message.sdp) {
        this._conn.setRemoteDescription(new RTCSessionDescription(message.sdp))
          .then(_ => {
            if (message.sdp.type === 'offer') {
              return this._conn.createAnswer()
                .then(d => this._onDescription(d));
            }
          })
          .catch(e => this._onError(e));
      } else if (message.ice) {
        this._conn.addIceCandidate(new RTCIceCandidate(message.ice));
      }
    }

    _onChannelOpened(event) {
      const channel = event.channel || event.target;
      channel.binaryType = 'arraybuffer';
      channel.onmessage = e => this._onMessage(e.data);
      channel.onclose = e => this._onChannelClosed();
      this._channel = channel;
    }

    _onChannelClosed() {
      if (!this.isCaller) return;
      this._connect(this._peerId, true); // reopen the channel
    }

    _onConnectionStateChange(e) {
      switch (this._conn.connectionState) {
        case 'disconnected':
          this._onChannelClosed();
          break;
        case 'failed':
          this._conn = null;
          this._onChannelClosed();
          break;
      }
    }

    _onIceConnectionStateChange() {
      switch (this._conn.iceConnectionState) {
        case 'failed':
          console.error('ICE Gathering failed');
          break;
        default:
          console.log('ICE Gathering', this._conn.iceConnectionState);
      }
    }

    _onError(error) {
      console.error(error);
    }

    _send(message) {
      if (!this._channel) return this.refresh();
      this._channel.send(message);
    }

    _sendSignal(signal) {
      signal.type = 'signal';
      signal.to = this._peerId;
      this._server.send(signal);
    }

    refresh() {
      // check if channel is open. otherwise create one
      if (this._isConnected() || this._isConnecting()) return;
      this._connect(this._peerId, this._isCaller);
    }

    _isConnected() {
      return this._channel && this._channel.readyState === 'open';
    }

    _isConnecting() {
      return this._channel && this._channel.readyState === 'connecting';
    }
  }

  KSD.PeersManager = class {
    constructor(serverConnection) {
      this.peers = {};
      this._server = serverConnection;
      KSD.Events.on('signal', e => this._onMessage(e.detail));
      KSD.Events.on('peers', e => this._onPeers(e.detail));
      // KSD.Events.on('files-selected', e => this._onFilesSelected(e.detail));
      KSD.Events.on('peer-left', e => this._onPeerLeft(e.detail));
      KSD.Events.on('sync-start', e => this._syncStart(e.detail));
    }

    _syncStart(peerId) {
      let logStr = '[' + g_idx + ':' + this.constructor.name + ':' +
        new Error().stack.split('\n')[1].trim().split(' ')[1] + ']';
      g_idx += 1;
      console.log('\n\n\n==============');
      console.log(logStr);

      console.log('ready to sync peer');
      console.log(JSON.stringify(peerId));

      const peer = this.peers[peerId];
      console.log('peer = ', JSON.stringify(peer));
      peer.sendJSON({ 'type': 'sync-give-me-all-your-keys', 'val': '' });

      console.log(logStr, 'end');
    }

    _onMessage(message) {
      if (!this.peers[message.sender]) {
        this.peers[message.sender] = new KSD.RTCPeer(this._server);
      }
      this.peers[message.sender].onServerMessage(message);
    }

    _onPeers(peers) {
      peers.forEach(peer => {
        if (this.peers[peer.id]) {
          this.peers[peer.id].refresh();
          return;
        }
        if (window.isRtcSupported && peer.rtcSupported) {
          this.peers[peer.id] = new KSD.RTCPeer(this._server, peer.id);
        } else {
          console.log("warning, rtc is not supported");
          this.peers[peer.id] = null;
        }
      });
    }

    sendTo(peerId, message) {
      this.peers[peerId].send(message);
    }

    _onPeerLeft(peerId) {
      const peer = this.peers[peerId];
      delete this.peers[peerId];
      if (!peer || !peer._peer) return;
      peer._peer.close();
    }
  }

  KSD.Events.on('display-name', e => {
    const me = e.detail.message;
    const displayName = document.getElementById('displayName')
    displayName.textContent = 'This is ' + me.displayName;
  });

  KSD.RTCPeer.config = {
    'sdpSemantics': 'unified-plan',
    'iceServers': [{
      urls: 'stun:stun.l.google.com:19302'
    }]
  }

  KSD.Snapdrop = class {
    constructor() {
      const server = new KSD.ServerConnection();
      const peers = new KSD.PeersManager(server);
      const peersUI = new KSD.PeersUI();
    }
  }

  const snapdrop = new KSD.Snapdrop();
})();
