"use strict";
/*
 * P2P Multiplayer System — WebRTC DataChannel ベース
 * ---------------------------------------------------
 * Host はオファーSDP+ICEをBase64コードとして生成し、ゲスト(Join側)に渡す。
 * Joinしたゲストがアンサーを返し、接続確立後にチャット・プレイヤー位置同期。
 *
 * 外部シグナリングサーバー不要のピュアP2P方式。
 * 制限: ICE candidatesは手動(コピペ)でやり取り。ローカルネットでない場合は
 *       STUN サーバー経由でのhole punchingが必要。
 */
var P2P = (function(){
  "use strict";

  /* ── 設定 ── */
  var ICE_SERVERS = [
    {urls:'stun:stun.l.google.com:19302'},
    {urls:'stun:stun1.l.google.com:19302'}
  ];
  var MAX_PLAYERS = 4;

  /* ── 状態 ── */
  var _role = null;        // 'host' | 'guest'
  var _pc   = null;        // RTCPeerConnection (host: 最初のゲスト用、今後複数化可)
  var _dc   = null;        // RTCDataChannel
  var _nick = 'Player';
  var _players = {};       // {nick: true}
  var _hostNick = 'Host';

  /* ── DOM helpers ── */
  function $id(id){ return document.getElementById(id); }
  function setStatus(elId, msg, cls){
    var el=$id(elId); if(!el)return;
    el.style.display='flex';
    el.textContent=msg;
    el.className='p2p-status '+(cls||'wait');
  }
  function addChat(nick, msg){
    var log=$id('p2p-chat-log'); if(!log)return;
    var d=document.createElement('div');
    d.className='p2p-chat-msg';
    var span=document.createElement('span');
    span.className='p2p-nick';
    span.textContent=nick+': ';
    d.appendChild(span);
    d.appendChild(document.createTextNode(msg));
    log.appendChild(d);
    log.scrollTop=log.scrollHeight;
  }
  function renderPlayerList(){
    var ul=$id('p2p-players-list'); if(!ul)return;
    ul.innerHTML='';
    // ホスト自身
    var hostItem=document.createElement('div');
    hostItem.className='p2p-player-item';
    hostItem.innerHTML='<span class="p2p-player-dot host"></span><span>'+_hostNick+' (host)</span>';
    ul.appendChild(hostItem);
    // 接続済みゲスト
    for(var k in _players){
      var item=document.createElement('div');
      item.className='p2p-player-item';
      item.innerHTML='<span class="p2p-player-dot"></span><span>'+k+'</span>';
      ul.appendChild(item);
    }
  }
  function updateHudBadge(){
    var badge=$id('p2p-hud-badge'); if(!badge)return;
    var count=Object.keys(_players).length;
    if(_role && count>0){
      badge.classList.add('show');
      badge.textContent=(_role==='host'?'Hosting':'Playing')+'  👥'+(count+1);
    } else if(_role==='host'){
      badge.classList.add('show');
      badge.textContent='Hosting (waiting…)';
    } else {
      badge.classList.remove('show');
    }
  }

  /* ── SDP/ICE encode/decode ── */
  function encode(obj){
    try{return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));}
    catch(e){return '';}
  }
  function decode(str){
    try{return JSON.parse(decodeURIComponent(escape(atob(str.trim()))));}
    catch(e){return null;}
  }

  /* ── DataChannel message handling ── */
  function onMessage(evt){
    try{
      var msg=JSON.parse(evt.data);
      if(msg.type==='chat'){
        addChat(msg.nick||'?', msg.text||'');
      } else if(msg.type==='join'){
        _players[msg.nick]=true;
        renderPlayerList();
        updateHudBadge();
        addChat('System','👋 '+msg.nick+' joined!');
        broadcast({type:'players',list:Object.keys(_players)});
      } else if(msg.type==='players'){
        // ゲスト側: プレイヤーリスト受信
        _players={};
        (msg.list||[]).forEach(function(n){_players[n]=true;});
        renderPlayerList();
        updateHudBadge();
      } else if(msg.type==='pos'){
        // 将来の位置同期に使用
      }
    }catch(e){}
  }

  /* ── DataChannelのセットアップ ── */
  function setupChannel(dc){
    _dc=dc;
    dc.binaryType='arraybuffer';
    dc.onopen=function(){
      console.log('[P2P] DataChannel open');
      if(_role==='guest'){
        dc.send(JSON.stringify({type:'join',nick:_nick}));
        setStatus('p2p-join-status','✅ Connected!','ok');
        updateHudBadge();
        // ゲストはすぐにゲームを開始
        var home=$id('home-overlay');
        if(home && home.classList.contains('show')){
          home.classList.remove('show');
          if(typeof showHome==='function'){/* already hidden */}
        }
      } else {
        addChat('System','✅ A player connected!');
      }
      renderPlayerList();
    };
    dc.onclose=function(){
      console.log('[P2P] DataChannel closed');
      updateHudBadge();
    };
    dc.onmessage=onMessage;
    dc.onerror=function(e){console.warn('[P2P] DC error',e);};
  }

  /* ── Send helpers ── */
  function send(obj){
    if(_dc && _dc.readyState==='open'){
      try{_dc.send(JSON.stringify(obj));}catch(e){}
    }
  }
  function broadcast(obj){ send(obj); } // single-peer for now

  /* ── Host flow ── */
  function startHost(nick){
    // If already generated code (autoStartHostCode ran), just update nick
    if(_role==='host'&&_pc){
      _hostNick=nick||'Host';
      renderPlayerList();
      return;
    }
    _role='host';
    _hostNick=nick||'Host';
    _players={};

    _pc=new RTCPeerConnection({iceServers:ICE_SERVERS});
    var dc=_pc.createDataChannel('bw',{ordered:true});
    setupChannel(dc);

    var allCandidates=[];
    _pc.onicecandidate=function(e){
      if(e.candidate){
        allCandidates.push(e.candidate.toJSON());
      } else {
        // All candidates gathered — encode full offer
        var payload=encode({sdp:_pc.localDescription,ice:allCandidates});
        var codeBox=$id('p2p-host-code');
        if(codeBox) codeBox.textContent=payload;
        setStatus('p2p-host-status','⏳ Share the code above with friends','wait');
      }
    };
    _pc.oniceconnectionstatechange=function(){
      if(_pc.iceConnectionState==='connected'||_pc.iceConnectionState==='completed'){
        setStatus('p2p-host-status','✅ Player connected!','ok');
        updateHudBadge();
      } else if(_pc.iceConnectionState==='disconnected'||_pc.iceConnectionState==='failed'){
        setStatus('p2p-host-status','⚠ Connection lost','err');
        updateHudBadge();
      }
    };

    _pc.createOffer().then(function(offer){
      return _pc.setLocalDescription(offer);
    }).catch(function(e){
      console.error('[P2P] offer error',e);
      setStatus('p2p-host-status','❌ Error: '+e.message,'err');
    });
  }

  /* ── Join flow ── */
  function joinHost(code, nick){
    _role='guest';
    _nick=nick||'Player';

    var data=decode(code);
    if(!data||!data.sdp){
      setStatus('p2p-join-status','❌ Invalid code','err');
      return;
    }
    setStatus('p2p-join-status','🔗 Connecting…','wait');

    _pc=new RTCPeerConnection({iceServers:ICE_SERVERS});
    _pc.ondatachannel=function(e){ setupChannel(e.channel); };

    var allCandidates=[];
    _pc.onicecandidate=function(e){
      if(e.candidate){
        allCandidates.push(e.candidate.toJSON());
      } else {
        // Show answer code (user needs to paste this back to host — advanced flow)
        // For simplicity we auto-try to trickle ICE if host is on same network
        console.log('[P2P] All ICE gathered for guest answer');
      }
    };
    _pc.oniceconnectionstatechange=function(){
      if(_pc.iceConnectionState==='connected'||_pc.iceConnectionState==='completed'){
        setStatus('p2p-join-status','✅ Connected!','ok');
        updateHudBadge();
      } else if(_pc.iceConnectionState==='failed'||_pc.iceConnectionState==='disconnected'){
        setStatus('p2p-join-status','⚠ Connection failed — try again','err');
      }
    };

    _pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(function(){
      // Add host ICE candidates
      (data.ice||[]).forEach(function(c){
        _pc.addIceCandidate(new RTCIceCandidate(c)).catch(function(){});
      });
      return _pc.createAnswer();
    }).then(function(ans){
      return _pc.setLocalDescription(ans);
    }).catch(function(e){
      console.error('[P2P] join error',e);
      setStatus('p2p-join-status','❌ Error: '+e.message,'err');
    });
  }

  /* ── Auto-generate host code when panel is shown ── */
  function autoStartHostCode(){
    // Only auto-generate if no active connection and no code already shown
    var codeBox=$id('p2p-host-code');
    if(!codeBox)return;
    var existing=codeBox.textContent||'';
    // Already has a real code (not the placeholder)
    if(existing.length>20&&existing!=='Generating code…'&&existing!=='Waiting…')return;
    // Start generating an offer (without starting the game)
    if(_role)return; // already have a role
    _role='host';
    _hostNick='Host';
    _players={};
    _pc=new RTCPeerConnection({iceServers:ICE_SERVERS});
    var dc=_pc.createDataChannel('bw',{ordered:true});
    setupChannel(dc);
    var allCandidates=[];
    codeBox.textContent='Generating code…';
    setStatus('p2p-host-status','⏳ Generating connection code…','wait');
    _pc.onicecandidate=function(e){
      if(e.candidate){
        allCandidates.push(e.candidate.toJSON());
      } else {
        var payload=encode({sdp:_pc.localDescription,ice:allCandidates});
        if(codeBox) codeBox.textContent=payload;
        setStatus('p2p-host-status','⏳ Share the code above with friends','wait');
      }
    };
    _pc.oniceconnectionstatechange=function(){
      if(_pc.iceConnectionState==='connected'||_pc.iceConnectionState==='completed'){
        setStatus('p2p-host-status','✅ Player connected!','ok');
        updateHudBadge();
      } else if(_pc.iceConnectionState==='disconnected'||_pc.iceConnectionState==='failed'){
        setStatus('p2p-host-status','⚠ Connection lost','err');
        updateHudBadge();
      }
    };
    _pc.createOffer().then(function(offer){
      return _pc.setLocalDescription(offer);
    }).catch(function(e){
      console.error('[P2P] offer error',e);
      setStatus('p2p-host-status','❌ Error: '+e.message,'err');
      _role=null;_pc=null;_dc=null;
    });
  }

  /* ── Public API ── */
  var API={
    init: function(){
      /* Auto-generate host code as soon as host tab is visible */
      // Wire tab switching to auto-generate
      var hostTab=document.querySelector('.p2p-tab[data-p2p-tab="host"]');
      if(hostTab && !hostTab._p2pAutoGen){
        hostTab._p2pAutoGen=true;
        hostTab.addEventListener('click',function(){
          setTimeout(autoStartHostCode,50);
        });
      }
      // Also trigger immediately if host section is active
      setTimeout(autoStartHostCode,100);

      /* Wire host start button */
      var startBtn=$id('p2p-start-host-btn');
      if(startBtn && !startBtn._p2pBound){
        startBtn._p2pBound=true;
        startBtn.addEventListener('click',function(){
          // Use existing host session (code already generated) or start fresh
          if(!_role){
            var hostNick='Host';
            startHost(hostNick);
          }
          // Host also starts a world (pick first world or create new)
          var worlds=WORLDS.list();
          if(worlds.length>0){
            WORLDS.setActive(worlds[0].id);
          } else {
            var w=WORLDS.create('Multiplayer World','');
            WORLDS.setActive(w.id);
          }
          var home=$id('home-overlay');
          if(home) home.classList.remove('show');
          if(typeof bootstrapWorld==='function') bootstrapWorld();
          updateHudBadge();
        });
      }
      /* Wire join/connect button */
      var connectBtn=$id('p2p-connect-btn');
      if(connectBtn && !connectBtn._p2pBound){
        connectBtn._p2pBound=true;
        connectBtn.addEventListener('click',function(){
          var code=($id('p2p-join-code')||{}).value||'';
          var nick=($id('p2p-join-nick')||{}).value||'Player';
          if(!code.trim()){
            setStatus('p2p-join-status','❌ Please enter the host code','err');
            return;
          }
          joinHost(code.trim(), nick.trim()||'Player');
        });
      }
      /* Wire chat send */
      var sendBtn=$id('p2p-chat-send');
      if(sendBtn && !sendBtn._p2pBound){
        sendBtn._p2pBound=true;
        sendBtn.addEventListener('click',function(){
          var inp=$id('p2p-chat-input');
          if(!inp||!inp.value.trim())return;
          var txt=inp.value.trim();
          inp.value='';
          addChat(_hostNick, txt);
          broadcast({type:'chat',nick:_hostNick,text:txt});
        });
      }
      var chatInp=$id('p2p-chat-input');
      if(chatInp && !chatInp._p2pBound){
        chatInp._p2pBound=true;
        chatInp.addEventListener('keydown',function(e){
          if(e.key==='Enter'){
            var btn=$id('p2p-chat-send');
            if(btn) btn.click();
          }
        });
      }
      /* Copy code on click */
      var codeBox=$id('p2p-host-code');
      if(codeBox && !codeBox._p2pBound){
        codeBox._p2pBound=true;
        codeBox.addEventListener('click',function(){
          var text=codeBox.textContent||'';
          if(!text||text.length<10)return;
          try{
            navigator.clipboard.writeText(text).then(function(){
              codeBox.style.color='#a5d6a7';
              setTimeout(function(){codeBox.style.color='';},1200);
            });
          }catch(e){
            // fallback
            var ta=document.createElement('textarea');
            ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
            document.body.appendChild(ta);ta.select();document.execCommand('copy');
            document.body.removeChild(ta);
          }
        });
      }
      /* Initial render */
      renderPlayerList();
    },
    /* Send player position (called from game loop) */
    sendPos: function(x,y,z,yaw){
      if(_role&&_dc&&_dc.readyState==='open'){
        send({type:'pos',nick:_role==='host'?_hostNick:_nick,x:Math.round(x),y:Math.round(y),z:Math.round(z),yaw:((yaw||0)*57)|0});
      }
    },
    /* Send chat from in-game */
    sendChat: function(text){
      var nick=_role==='host'?_hostNick:_nick;
      broadcast({type:'chat',nick:nick,text:text});
      addChat(nick,text);
    },
    isConnected: function(){return !!(_dc&&_dc.readyState==='open');},
    role: function(){return _role;},
    disconnect: function(){
      if(_pc) try{_pc.close();}catch(e){}
      _pc=null; _dc=null; _role=null;
      updateHudBadge();
    }
  };
  return API;
})();
