(function wefunPanel() {
  if (location.host !== 'office.wefun.kr') {
    alert('office.wefun.kr에 로그인한 상태에서 실행해주세요.');
    return;
  }
  if (document.getElementById('__wp')) {
    document.getElementById('__wp').remove();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function norm(v) {
    if (v == null) return '';
    var s = String(v).trim();
    if (s.charAt(0) === "'") s = s.slice(1);
    return s;
  }

  function nn(s) {
    return norm(s).replace(/\s+/g, '');
  }

  function now() {
    var d = new Date();
    var k = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (9 * 3600000));
    var p = function(n) {
      return ('0' + n).slice(-2);
    };
    return k.getFullYear() + '-' + p(k.getMonth() + 1) + '-' + p(k.getDate()) + ' ' + p(k.getHours()) + ':' + p(k.getMinutes());
  }

  function kstDate() {
    var d = new Date();
    return new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (9 * 3600000));
  }

  function addWorkdays(d, num) {
    var r = new Date(d.getTime()),
      a = 0;
    while (a < num) {
      r.setDate(r.getDate() + 1);
      var w = r.getDay();
      if (w !== 0 && w !== 6) a++;
    }
    return r;
  }

  function firstDeliveryStr() {
    var f = addWorkdays(kstDate(), 3),
      p = function(n) {
        return ('0' + n).slice(-2);
      };
    return f.getFullYear() + '-' + p(f.getMonth() + 1) + '-' + p(f.getDate());
  }

  function workdayD1Str() {
    var f = addWorkdays(kstDate(), 1),
      p = function(n) {
        return ('0' + n).slice(-2);
      };
    return f.getFullYear() + '-' + p(f.getMonth() + 1) + '-' + p(f.getDate());
  }

  function fmtTs(v) {
    if (!v) return '';
    var s = String(v);
    var d = new Date(s);
    if (isNaN(d.getTime())) return s.replace('T', ' ').slice(5, 16);
    var p = function(n) {
      return ('0' + n).slice(-2);
    };
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function toast(msg, color) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:44px;transform:translateX(-50%);background:' + (color || '#0f2c47') + ';color:#fff;padding:13px 24px;border-radius:11px;font-size:14px;font-weight:700;z-index:2147483647;box-shadow:0 12px 34px rgba(0,0,0,.32);font-family:system-ui,-apple-system,\"Malgun Gothic\",sans-serif';
    document.body.appendChild(t);
    setTimeout(function() {
      t.style.transition = 'opacity .4s';
      t.style.opacity = '0';
      setTimeout(function() {
        if (t.parentNode) t.remove();
      }, 400);
    }, 1900);
  }
  var VALID = {
    '신규': 1,
    '코스변경': 1,
    '주소변경': 1,
    '거래처명': 1
  };
  var PART_ALIAS = {
    '신규': '신규',
    '신규코드발급': '신규',
    '코스변경': '코스변경',
    '주소변경': '주소변경',
    '거래처명': '거래처명',
    '거래처명변경': '거래처명',
    '상호변경': '거래처명'
  };

  function normPart(p) {
    p = String(p || '').replace(/\s+/g, '');
    return PART_ALIAS[p] || p;
  }
  var DAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
  var rows = [],
    results = [],
    busy = false,
    REQ = {
      dept: '',
      name: '',
      email: ''
    };
  var MODE = localStorage.getItem('__wpMode') || 'requester'; /* ===== 설정: 배포 전에 이 두 줄만 채우세요 ===== */
  var API_URL = 'https://wefun-queu.kg-yim.workers.dev/'; /* 공유 큐 API — Cloudflare Workers + D1 */
  var ADMINS = ['kg_yim@wefun.io']; /* 관리자용을 볼 수 있는 이메일(물류팀). 쉼표로 추가 */ /* ============================================= */
  var IS_ADMIN = false;
  var VERSION = '26.08.14 17:10';
  var CYCLES = ['매일', '매주1회', '매주2회', '매주3회', '매주4회', '격주', '매월1회_첫째주', '매월1회_둘째주', '매월1회_셋째주', '매월1회_넷째주', '매월2회_첫째_셋째주', '매월2회_둘째_넷째주', '매월3회_첫째_둘째_셋째주', '매월3회_첫째_둘째_넷째주', '매월3회_첫째_셋째_넷째주', '매월3회_둘째_셋째_넷째주', '매월4회_첫째_둘째_셋째_넷째주', '수기일정생성', '계획일정없음'];

  function eqRange(name, n) {
    var a = [];
    for (var i = 1; i <= n; i++) a.push(name + ' * ' + i);
    return a;
  }
  var EQUIP = ['자체설비(매대)', '자체설비(냉장고)'].concat(eqRange('스탠드매대900', 5), eqRange('스탠드매대500', 5), eqRange('테이블매대(원목)', 10), eqRange('냉장고(대형)', 5), eqRange('냉장고(소형)', 5), eqRange('냉동고(스탠드)', 5), eqRange('냉동고(소형)', 5), eqRange('종이트레이(6구)', 16), ['스마트냉장고', '구형 키오스크', '신형 키오스크', '라면바 1구', '라면바 2구', '시리얼디스펜서', '전자레인지', '온장고', '없음']);
  var ACTIONS = {
    '배송주기변경': {
      auto: 'cycle',
      fields: [{
        k: '변경주기',
        label: '변경 배송주기',
        type: 'select',
        opts: CYCLES,
        req: true
      }, {
        k: '변경요일',
        label: '변경 배송요일(매주 계열)',
        type: 'days'
      }, {
        k: '사유',
        label: '변경 사유',
        type: 'text'
      }]
    },
    '배송일정생성': {
      auto: 'create',
      fields: [{
        k: '배송일',
        label: '배송일(여러 날짜 추가 가능)',
        type: 'dates',
        req: true
      }, {
        k: '비고',
        label: '비고',
        type: 'text'
      }]
    },
    '배송일정변경': {
      auto: 'move',
      fields: [{
        k: '기존배송일',
        label: '기존 배송일',
        type: 'date',
        req: true
      }, {
        k: '변경배송일',
        label: '변경할 날짜',
        type: 'date',
        req: true
      }, {
        k: '사유',
        label: '사유',
        type: 'text'
      }]
    },
    '배송일정삭제': {
      auto: 'delete',
      fields: [{
        k: '삭제일',
        label: '삭제할 배송일(여러 날짜 추가 가능)',
        type: 'dates',
        req: true
      }, {
        k: '사유',
        label: '사유',
        type: 'text'
      }]
    },
    '배송메모': {
      memo: true,
      fields: [{
        k: '메모내용',
        label: '배송메모 (기타 주차 및 출입 관련 메모)',
        type: 'textarea'
      }]
    },
    '신규코드발급': {
      fields: [{
        k: '서비스구분',
        label: '서비스 구분',
        type: 'select',
        opts: ['스낵24', '조식24'],
        req: true
      }, {
        k: '월예산',
        label: '월 예산 (오피스 자동)',
        type: 'text',
        ro: true
      }, {
        k: '담당자성함',
        label: '담당자 성함',
        type: 'text',
        req: true
      }, {
        k: '담당자연락처',
        label: '담당자 연락처',
        type: 'text',
        req: true
      }, {
        k: '요청주기',
        label: '요청 배송주기(정기)',
        type: 'select',
        opts: CYCLES,
        req: true
      }, {
        k: '정기배송요일',
        label: '정기 배송요일(매주 계열)',
        type: 'days'
      }, {
        k: '첫배송희망일',
        label: '첫 배송희망일',
        type: 'date',
        min3: true,
        req: true
      }, {
        k: '배송형태',
        label: '배송형태',
        type: 'select',
        opts: ['택배', '방문진열', '보냉가방 적재'],
        req: true
      }, {
        k: '요청설비',
        label: '요청 설비 (복수 선택)',
        type: 'multi',
        opts: EQUIP
      }, {
        k: '설치일',
        label: '설치 희망일 (자산 · 전체 날짜 선택 가능)',
        type: 'date',
        req: true,
        reqIf: '요청설비'
      }, {
        k: '배송특이사항',
        label: '배송 특이사항 및 요청사항',
        type: 'textarea',
        req: true
      }]
    },
    '수기피킹': {
      picking: true
    },
    '주소변경': {
      passthru: true,
      d1: true,
      fields: [{
        k: '변경주소',
        label: '변경 주소 (신주소)',
        type: 'addr',
        req: true
      }, {
        k: '변경상세주소',
        label: '상세주소 (동/호 등)',
        type: 'text'
      }, {
        k: '사유',
        label: '변경 사유',
        type: 'text'
      }]
    },
    '거래처명변경': {
      passthru: true,
      d1: true,
      fields: [{
        k: '변경거래처명',
        label: '변경 거래처명 (신규 상호)',
        type: 'text',
        req: true
      }, {
        k: '사유',
        label: '변경 사유',
        type: 'text'
      }]
    },
    '담당자변경': {
      passthru: true,
      d1: true,
      svc: true,
      fields: [{
        k: '담당자성함',
        label: '담당자 성함',
        type: 'text',
        req: true
      }, {
        k: '담당자연락처',
        label: '담당자 연락처',
        type: 'text',
        req: true
      }, {
        k: '사유',
        label: '변경 사유',
        type: 'text'
      }]
    },
    '배송시간문의': {
      dtime: true,
      fields: [{
        k: '문의내용',
        label: '문의 내용',
        type: 'textarea'
      }]
    },
    '코스변경': {
      passthru: true,
      d1: true,
      fields: [{
        k: '변경코스',
        label: '변경 코스 (우린배송담당)',
        type: 'text',
        req: true
      }, {
        k: '사유',
        label: '변경 사유',
        type: 'text'
      }]
    }
  };

  function actionKeys() {
    var ks = Object.keys(ACTIONS);
    ks.sort(function(a, b) {
      if (a === '신규코드발급') return -1;
      if (b === '신규코드발급') return 1;
      if (a === '배송시간문의') return 1;      /* 조회성 문의라 맨 끝 */
      if (b === '배송시간문의') return -1;
      if (a === '코스변경') return 1;
      if (b === '코스변경') return -1;
      return 0;
    });
    return ks;
  } /* ---------- 공유 큐 API ---------- */
  function apiUrl() {
    var b = (API_URL.indexOf('PASTE') === -1) ? API_URL : '';
    /* 구 앱스크립트 주소로 수동 설정해둔 경우 자동 해제 → 새 기본(워커)으로 전환 */
    var ov = localStorage.getItem('__wpApi') || '';
    if (ov && ov.indexOf('script.google.com') > -1) { try { localStorage.removeItem('__wpApi'); } catch (e) {} ov = ''; }
    return ov || b;
  }

  function api(params, _retry) {
    var u = apiUrl();
    if (!u) return Promise.reject(new Error('연결설정(웹앱 URL)이 필요합니다. 상단 ⚙️ 연결설정에서 등록하세요.'));
    var qs = Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    var READS = { list: 1, ping: 1, one: 1, comment_list: 1, board_list: 1 };            /* 순수 읽기 */
    var RETRY_OK = { list: 1, ping: 1, one: 1, comment_list: 1, board_list: 1, sent: 1 };  /* sent=멱등이라 재시도 안전 */
    return fetch(u, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: qs }).then(function(r) {
      return r.text();
    }).then(function(t) {
      var j = null;
      /* 구글이 JSON 대신 HTML(로그인/일시장애 페이지)을 뱉는 일이 있다. 이때 서버 실행은 이미
         끝났을 수 있으므로 '실패'로 단정하면 안 된다 → badResponse 로 표시만 하고 호출부가 확인. */
      try { j = JSON.parse(t); } catch (pe) { throw new Error('서버 응답이 JSON이 아닙니다(구글 일시장애)'); }
      if (!j || j.ok === false) { var ae = new Error((j && j.error) || '응답 오류'); ae.appError = true; throw ae; }
      if (!READS[params.e]) { cacheBust(params.id || params.ids || ''); }   /* 쓰기 성공 → 캐시를 헌 것으로 표시 + 해당 행 제거 */
      return j;
    }).catch(function(e) {
      if (!_retry && RETRY_OK[params.e]) {
        return new Promise(function(rs) { setTimeout(rs, 600); }).then(function() { return api(params, true); });
      }
      if (e && !e.appError) { try { e.badResponse = true; } catch (_be) {} }  /* 전송·응답 단계 실패 = 서버엔 반영됐을 수 있음 */
      throw e;
    });
  }

  function submitReq(o) {
    return api({
      e: 'submit',
      data: JSON.stringify(o)
    });
  }

  function listReq(f) {
    f = f || {};
    f.e = 'list';
    return api(f).then(function(j) {
      return j.items || [];
    });
  }

  /* 목록 캐시: 있으면 즉시 그려주고(=대기 화면 없음) 뒤에서 새로 받아 교체한다.
     쓰기가 성공하면 api()가 cacheBust()로 통째로 버리므로 옛 목록이 남지 않는다.
     LOADSEQ: 늦게 도착한 응답이 최신 화면을 덮어쓰는 것 방지. */
  var LCACHE = {}, LOADSEQ = 0;
  /* 쓰기 후 캐시를 통째로 버리면 승인할 때마다 다음 화면 전환에서 '불러오는 중…'이 떴다.
     → 버리지 않고 '헌 것' 표시만 한다. 헌 캐시라도 일단 그려서 대기 화면을 없애고 뒤에서 새로 받아 교체한다.
     처리된 건의 id 를 알면 캐시에서 그 행을 미리 빼서, 새로고침 전 잠깐의 낡은 표시도 줄인다. */
  function cacheBust(ids) {
    var rm = String(ids || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean);
    for (var k in LCACHE) {
      LCACHE[k].stale = true;
      var arr = LCACHE[k].items;
      if (rm.length && arr) {
        for (var i = arr.length - 1; i >= 0; i--) {
          if (rm.indexOf(String(arr[i].id)) > -1) { arr.splice(i, 1); }
        }
      }
    }
    _pendCache = { n: 0, t: 0 };
  }
  function listReqSWR(elId, f, cb) {
    var my = ++LOADSEQ;
    var key = elId + '|' + JSON.stringify(f);
    var el = document.getElementById(elId);
    var c = LCACHE[key];
    var shown = false;
    if (c) {
      /* 헌 캐시라도 일단 그린다 — '불러오는 중…'은 캐시가 아예 없을 때(첫 진입)만 */
      try { cb(c.items); shown = true; } catch (e) {}
    } else if (el) {
      el.innerHTML = '<div style="color:#94a3b8;padding:10px">불러오는 중…</div>';
    }
    return listReq(f).then(function(items) {
      LCACHE[key] = { items: items, t: Date.now() };
      if (my === LOADSEQ) { cb(items); }
      return items;
    }, function(err) {
      if (shown) { return; }          /* 캐시로 이미 보여줬으면 조용히 넘어간다 */
      if (el && el.innerHTML.indexOf('불러오는 중') > -1) {
        el.innerHTML = '<div style="color:#b00;padding:10px">불러오기 실패: ' + esc((err && err.message) || err) + '<br><span style="color:#94a3b8;font-size:12px">[조회]를 다시 눌러주세요.</span></div>';
      }
      throw err;                      /* 삼키지 않는다 — '불러오는 중…'에서 멈추는 것 방지 */
    });
  }

  /* 동시 실행 개수 제한 — 한꺼번에 다 던지면 브라우저 연결 한도에 걸려 오히려 느려진다 */
  function mapLimit(arr, limit, fn, onProgress) {
    var res = new Array(arr.length), nx = 0, done = 0, active = 0;
    return new Promise(function(resolve, reject) {
      if (!arr.length) { resolve(res); return; }
      function pump() {
        while (active < limit && nx < arr.length) {
          active++;
          (function(idx) {
            Promise.resolve().then(function() { return fn(arr[idx], idx); }).then(function(v) {
              res[idx] = v; active--; done++;
              if (onProgress) { try { onProgress(done, arr.length); } catch (_p) {} }
              if (done === arr.length) { resolve(res); } else { pump(); }
            }, reject);
          })(nx++);
        }
      }
      pump();
    });
  }

  /* 쓰기 응답이 깨졌을 때(badResponse) 실제 반영 여부를 '읽기'로만 확인한다.
     ★ 쓰기 재시도는 절대 하지 않는다 — 중복 등록/중복 슬랙 위험. */
  function reqStatus(id) {
    return api({ e: 'one', id: id }).then(function(j) { return j && j.found ? j : null; });
  }
  function afterWriteFail(e, id, okMsg, failLabel, onOk, onFail) {
    var base = failLabel + ': ' + ((e && e.message) || e);
    if (!(e && e.badResponse && id)) { onFail(base); return; }
    reqStatus(id).then(function(r) {
      if (r && r.status && r.status !== '대기') { onOk(okMsg); }
      else { onFail(base + '\n\n서버 확인 결과 아직 반영 안 됐습니다. 다시 시도하세요.'); }
    }).catch(function() {
      onFail(base + '\n\n반영 여부를 확인하지 못했습니다. 목록을 새로고침해 상태를 먼저 확인하세요.\n(이미 완료로 바뀌어 있으면 다시 승인하지 마세요 — 중복 알림이 갑니다)');
    });
  }
  /* 일괄 반영 기록: 요약 1건 올리고 ts 받아 → 상세를 그 스레드에만 이어붙인다.
     실패해도 반영 자체는 이미 끝난 상태라 사용자 흐름은 막지 않는다. */
  function bulkLogStart(o) { o.e = 'bulklog'; return api(o).then(function(j) { return (j && j.ts) || ''; }); }
  function bulkLogReply(threadTs, body) { return api({ e: 'bulklog', threadTs: threadTs, body: body }); }

  function setNotice(id, val) {
    return api({ e: 'meta', id: id, custNotice: val });
  }
  function ncXlsx(items) {
    return ensureExcel().then(function() {   /* 이 경로는 ExcelJS만 쓴다 — SheetJS(≈900KB) 받을 이유 없음 */
      var head = ['요청일시', '고객사 안내', '구분', '월예산', '거래처명', '주소', '담당자성함', '담당자연락처', '요청주기', '정기배송요일', '첫배송희망일', '배송형태', '배송특이사항', '요청설비', '설치일', '점포코드(상온)', '점포코드(저온)', '상태', '처리자', '처리메모', '처리일시'];
      function g(it, k) { return detailGet(it.detail, k) || ''; }
      var rows = [head].concat(items.map(function(it) {
        return [String(it.ts || '').slice(0, 10), String(it.custNotice || ''), g(it, '서비스구분'), g(it, '월예산'), String(it.branchName || ''), g(it, '주소'), g(it, '담당자성함'), String(g(it, '담당자연락처')), g(it, '요청주기'), g(it, '정기배송요일'), g(it, '첫배송희망일'), g(it, '배송형태'), g(it, '배송특이사항'), g(it, '요청설비'), g(it, '설치일'), String(it.hot || ''), String(it.cold || ''), String(it.status || ''), String(it.admin || ''), String(it.adminNote || ''), String(it.decidedTs || '')];
      }));
      var cols = head.map(function(h, ci) {
        var w = h.length * 2;
        rows.forEach(function(r) { var v = String(r[ci] == null ? '' : r[ci]); var len = 0; for (var x = 0; x < v.length; x++) { len += v.charCodeAt(x) > 127 ? 2 : 1; } if (len > w) w = len; });
        return { wch: Math.min(60, w + 2) };
      });
      return xlsxDownload(rows, cols, '신규코드', '신규코드_' + NC_DR.from + '~' + NC_DR.to + '.xlsx').then(function() {
        toast('✓ 신규코드 엑셀 ' + items.length + '건', '#0a7d47');
      });
    }).catch(function(e) { alert('엑셀 생성 실패: ' + (e && e.message || e)); });
  }
  function decideReq(id, status, note, threadTs) {
    return api({
      e: 'decide',
      id: id,
      status: status,
      note: note || '',
      admin: REQ.name,
      threadTs: threadTs || ''
    });
  }

  function decideStage(id, stage, note, threadTs) {
    return api({
      e: 'decide',
      id: id,
      stage: stage,
      note: note || '',
      admin: REQ.name,
      threadTs: threadTs || ''
    });
  } /* ---------- 스타일 ---------- */
  var st = document.createElement('style');
  st.id = '__wpStyle';
  st.textContent = '#__wp *{box-sizing:border-box;font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif}#__wp{position:fixed;inset:0;background:rgba(4,12,20,.62);z-index:2147483647;overflow:auto;padding:24px 16px}.wp-card{width:min(1480px,98vw);margin:0 auto;background:#F8FAFC;border-radius:10px;box-shadow:0 24px 70px rgba(2,8,20,.45);overflow:hidden;border:1px solid #0B1220}.wp-head{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:#0B1220;color:#F1F5F9;border-bottom:2px solid #38BDF8}.wp-head h2{margin:0;font-size:18px;font-weight:800;letter-spacing:-.02em;display:flex;align-items:center;gap:8px}.wp-logo{display:inline-flex;align-items:center;justify-content:center;background:#fff;border:1px solid #E2E8F0;border-radius:7px;padding:5px 9px}.wp-who{font-size:12.5px;color:#94A3B8;margin-top:3px}.wp-hbtn{height:34px;display:inline-flex;align-items:center;background:#1E293B;color:#CBD5E1;border:1px solid #334155;border-radius:5px;padding:0 12px;cursor:pointer;font-size:13.5px;margin-left:6px}.wp-hbtn:hover{background:#334155;color:#fff}.wp-hbtn.on{background:#38BDF8;color:#04121F;font-weight:800;border-color:#38BDF8}.wp-ico{width:34px;padding:0;justify-content:center;font-weight:700}#__wp.wp-max{padding:0;overflow:hidden}#__wp.wp-max .wp-card{width:100vw;max-width:100vw;height:100vh;border-radius:0;margin:0;box-shadow:none;border:none;overflow:hidden;display:flex;flex-direction:column}#__wp.wp-max .wp-head{flex:none}#__wp.wp-max .wp-body{padding:14px 30px;flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}#__wp.wp-max #__wpTabs{flex:none}#__wp.wp-max #__wpView{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column}#__wp.wp-max #__wpView .wp-scroll{flex:1;min-height:0;max-height:none;border:1px solid #E2E8F0}.wp-launch{position:fixed;right:22px;bottom:22px;width:56px;height:56px;border-radius:14px;background:#0B1220;color:#38BDF8;font-size:24px;border:1px solid #334155;cursor:grab;box-shadow:0 10px 26px rgba(2,8,20,.5);z-index:2147483647;display:flex;align-items:center;justify-content:center;user-select:none}.wp-launch:active{cursor:grabbing}.wp-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;background:#EF4444;color:#fff;font-size:12px;font-weight:700;line-height:20px;text-align:center;border-radius:10px;border:2px solid #0B1220}.wp-launch:hover{transform:scale(1.06)}.wp-body{padding:16px 20px}.wp-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}.wp-tab{height:38px;display:inline-flex;align-items:center;padding:0 15px;cursor:pointer;border:1px solid #E2E8F0;border-radius:5px;background:#fff;color:#475569;font-weight:700;font-size:14.5px}.wp-tab:hover{background:#F1F5F9}.wp-tab.on{background:#0B1220;color:#fff;border-color:#0B1220}.wp-inp{height:34px;padding:0 10px;border:1px solid #CBD5E1;border-radius:5px;font-size:14px;outline:none;background:#fff;color:#17222E}.wp-inp:focus{border-color:#38BDF8;box-shadow:0 0 0 3px rgba(56,189,248,.25)}select.wp-inp{height:34px;cursor:pointer}textarea.wp-inp{height:auto;min-height:96px;padding:8px 10px;line-height:1.5}input.wp-inp[type=date]{cursor:pointer}input.wp-inp[type=date]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:.5}.wp-btn{height:34px;display:inline-flex;align-items:center;cursor:pointer;border-radius:5px;font-weight:700;font-size:13.5px;padding:0 14px;border:1px solid transparent}.wp-btn.pri{background:#0B1220;color:#fff}.wp-btn.pri:hover{background:#1E293B}.wp-btn.ok{background:#16A34A;color:#fff}.wp-btn.ok:hover{background:#15803D}.wp-btn.dg{background:#EF4444;color:#fff}.wp-btn.dg:hover{background:#DC2626}.wp-btn.gh{background:#fff;color:#334155;border-color:#CBD5E1}.wp-btn.gh:hover{background:#F1F5F9}.wp-tbl{border-collapse:collapse;width:100%;font-size:14px}.wp-tbl th{position:sticky;top:0;background:#0F172A;color:#CBD5E1;text-align:left;padding:9px 10px;border-bottom:1px solid #0B1220;font-weight:700;font-size:12.5px}.wp-tbl td{padding:9px 10px;border-bottom:1px solid #E2E8F0;color:#1E293B;vertical-align:top;background:#fff}.wp-tbl tbody tr:hover td{background:#F1F5F9}.wp-act{height:28px;display:inline-flex;align-items:center;cursor:pointer;border:1px solid #0B1220;color:#0B1220;background:#fff;border-radius:5px;font-size:12px;padding:0 9px;margin:2px;font-weight:600}.wp-act:hover{background:#0B1220;color:#fff}.wp-dd{position:relative;display:inline-block}.wp-ddbtn{height:34px;display:inline-flex;align-items:center;cursor:pointer;border:1px solid #0B1220;color:#0B1220;background:#fff;border-radius:5px;font-size:12.5px;padding:0 11px;font-weight:700}.wp-ddbtn:hover{background:#0B1220;color:#fff}.wp-ddmenu{display:none;position:absolute;right:0;top:100%;margin-top:4px;background:#fff;border:1px solid #E2E8F0;border-radius:8px;box-shadow:0 14px 34px rgba(2,8,20,.18);z-index:20;min-width:160px;overflow:hidden}.wp-dd.on .wp-ddmenu{display:block}.wp-ddi{display:block;width:100%;text-align:left;cursor:pointer;border:none;background:none;padding:10px 14px;font-size:13.5px;color:#1E293B}.wp-ddi:hover{background:#F1F5F9;color:#0B1220;font-weight:600}.wp-scroll{max-height:64vh;overflow:auto;border:1px solid #E2E8F0;border-radius:8px}.wp-form{border:1px solid #E2E8F0;border-radius:8px;padding:18px;margin-top:12px;background:#fff}.wp-meta{background:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;margin:10px 0;font-size:13px;line-height:1.8;color:#334155}.wp-fld{display:flex;align-items:center;gap:10px;margin:11px 0}.wp-fld>span{width:200px;color:#475569;font-size:14px;flex:none;font-weight:600}.wp-fld .wp-inp,.wp-fld select{flex:1;min-width:0;height:40px}.wp-pill{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:5px;font-size:12px;font-weight:800;font-family:ui-monospace,Menlo,monospace}.wp-day{height:34px;cursor:pointer;border:1px solid #CBD5E1;background:#fff;border-radius:5px;padding:0 11px;margin:2px;font-size:13px}.wp-day.on{background:#0B1220;color:#fff;border-color:#0B1220}.wp-log{font-size:12.5px;max-height:52vh;overflow:auto;border:1px solid #E2E8F0;border-radius:8px;padding:6px 12px;margin-top:8px}.wp-log>div{padding:4px 0;border-bottom:1px solid #F1F5F9}';
  (document.head || document.documentElement).appendChild(st);

  /* 화면·확인창 표시용으로만 날짜 뒤에 요일을 붙인다.
     시트에 저장되는 요청내용은 그대로 둔다 — runActionCore 의 detailGet 이 '2026-08-13' 원형을 그대로 써야 한다. */
  var DOWK = ['일', '월', '화', '수', '목', '금', '토'];
  function addDow(s) {
    return String(s == null ? '' : s).replace(/(\d{4})-(\d{2})-(\d{2})/g, function(m, y, mo, d) {
      var dt = new Date(+y, +mo - 1, +d);
      if (isNaN(dt.getTime()) || dt.getMonth() !== +mo - 1) return m;
      return m + '(' + DOWK[dt.getDay()] + ')';
    });
  }

  function pill(status) {
    var m = {
      '대기': '#F59E0B',
      '완료': '#16A34A',
      '반려': '#EF4444',
      '수정요청': '#A855F7'
    };
    var c = m[status] || '#64748B';
    return '<span class="wp-pill" style="background:' + c + '1f;color:' + c + ';border:1px solid ' + c + '55">' + esc(status) + '</span>';
  } /* ---------- 패널 ---------- */
  var LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 197 37" width="116" height="22" style="display:block"><path d="M14.7 34.8C12.2 32.3 1.3 13.4 1.0 11.0C0.3 6.1 3.5 2.0 8.0 2.0C11.4 2.0 13.2 3.5 16.8 9.4L19.8 14.3L21.4 11.3C25.5 3.2 30.1 0.4 35.0 3.0C37.7 4.4 50.0 26.4 50.0 29.8C50.0 35.3 43.0 38.9 38.6 35.7C37.7 35.0 35.6 32.3 34.1 29.6L31.2 24.8L28.5 29.4C24.0 37.2 19.0 39.1 14.7 34.8ZM116.6 35.0C110.3 33.0 107.1 26.7 109.3 20.3C110.9 15.4 114.8 12.7 120.1 12.8C125.7 12.9 129.2 16.2 129.4 21.6L129.5 25.5L122.2 25.8C118.3 26.0 115.0 26.5 115.0 27.0C115.0 29.3 120.1 31.3 124.4 30.7C128.2 30.2 128.9 30.3 129.3 32.0C129.6 33.2 129.2 34.1 128.1 34.4C124.2 35.6 119.3 35.8 116.6 35.0ZM158.4 35.3C157.2 35.1 155.2 33.8 154.0 32.5C152.0 30.4 151.7 28.9 151.6 21.8L151.5 13.5L154.5 13.5L157.5 13.5L158.0 21.5C158.5 29.1 158.6 29.5 160.9 29.8C164.6 30.4 166.0 27.6 166.0 19.8L166.0 13.0L169.1 13.0L172.3 13.0L171.8 21.2C171.6 25.9 170.7 30.5 169.9 31.8C168.7 33.6 162.9 36.3 161.0 35.9C160.7 35.8 159.5 35.5 158.4 35.3ZM77.8 23.9L74.1 12.9L77.3 13.2C80.4 13.5 80.6 13.8 82.5 21.0L84.4 28.5L86.8 20.8C88.8 13.9 89.4 13.0 91.5 13.0C93.6 13.0 94.2 13.9 96.1 19.9C98.5 27.2 99.3 27.9 100.4 23.3C102.9 13.0 102.9 13.0 106.1 13.0C108.2 13.0 109.1 13.4 108.8 14.2C108.5 14.9 106.8 19.9 105.1 25.2C102.0 34.4 101.7 35.0 99.1 35.0C96.6 35.0 96.2 34.4 94.1 28.0C92.9 24.1 91.7 21.0 91.5 21.0C91.2 21.0 90.1 24.1 88.9 28.0C87.0 34.4 86.6 35.0 84.1 35.0C81.6 35.0 81.2 34.4 77.8 23.9ZM136.0 26.5C136.0 18.7 135.8 18.0 134.0 18.0C132.5 18.0 132.0 17.3 132.0 15.5C132.0 13.7 132.5 13.0 133.9 13.0C135.4 13.0 136.0 12.0 136.5 8.8C137.4 3.7 140.9 -0.0 144.9 0.0C149.5 0.0 150.8 0.8 150.2 3.5C149.9 5.4 149.3 5.9 147.6 5.5C144.7 4.8 143.1 6.1 142.4 9.8C141.8 12.9 141.9 13.0 144.9 13.0C147.5 13.0 148.0 13.4 148.0 15.5C148.0 17.6 147.5 18.0 145.0 18.0L142.0 18.0L142.0 26.5L142.0 35.0L139.0 35.0L136.0 35.0L136.0 26.5ZM176.0 24.0L176.0 13.0L179.0 13.0C181.1 13.0 182.0 13.5 182.0 14.7C182.0 16.1 182.2 16.1 184.0 14.5C186.8 12.0 191.6 12.2 194.3 14.9C196.2 16.7 196.6 18.4 196.8 26.0L197.2 35.0L194.1 35.0L191.0 35.0L191.0 27.7C191.0 19.9 190.1 18.0 186.3 18.0C183.3 18.0 182.0 21.3 182.0 29.1C182.0 35.0 182.0 35.0 179.0 35.0L176.0 35.0L176.0 24.0ZM124.0 20.6C124.0 16.6 117.7 16.0 115.2 19.8C113.8 22.0 113.8 22.0 118.9 22.0C122.6 22.0 124.0 21.6 124.0 20.6Z" fill="#17181A"/><circle cx="53.5" cy="8.5" r="7.5" fill="#FFE100"/></svg>';
  var ov = document.createElement('div');
  ov.id = '__wp';
  ov.innerHTML = '<div class="wp-card">' + '<div class="wp-head"><div style="display:flex;align-items:center;gap:11px"><span class="wp-logo">' + LOGO + '</span><div><h2>물류 · 배송관리 <span style="font-size:11px;font-weight:600;opacity:.65;letter-spacing:.3px">v' + VERSION + '</span> <span style="font-size:10.5px;font-weight:600;color:#38BDF8">· 최대화(전체화면) 단독 사용 권장</span></h2><div class="wp-who" id="__wpWho">요청자 확인 중…</div></div></div>' + '<div style="text-align:right"><div><button class="wp-hbtn" id="__wpMreq">요청자용</button><button class="wp-hbtn" id="__wpMadm">관리자용</button>' + '<button class="wp-hbtn" id="__wpCfg">⚙️ 연결설정</button>' + '<button class="wp-hbtn wp-ico" id="__wpMin" title="최소화">—</button>' + '<button class="wp-hbtn wp-ico" id="__wpMax" title="최대화">▢</button>' + '<button class="wp-hbtn wp-ico" id="__wpX" title="닫기">✕</button></div>' + '</div></div>' + '<div class="wp-body"><div class="wp-tabs" id="__wpTabs"></div><div id="__wpView"></div></div></div>';
  /* 배경(바깥) 클릭으로는 닫히지 않음 — 실수로 꺼짐 방지 */ /* 날짜칸 아무 곳이나 클릭/포커스하면 달력 바로 열림 */
  function popDate(e) {
    var t = e.target;
    if (t && t.tagName === 'INPUT' && t.type === 'date') {
      try {
        t.showPicker();
      } catch (_) {}
    }
  }
  ov.addEventListener('click', popDate);
  ov.addEventListener('focusin', popDate); /* Esc: 열린 메뉴/폼 닫기 */
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape' || !document.getElementById('__wp')) return;
    if (document.getElementById('__wpActMenu')) {
      closeActMenu();
      return;
    }
    var f = document.getElementById('__wpForm');
    if (f && f.innerHTML) {
      f.innerHTML = '';
      var qr = document.getElementById('__wpQr');
      if (qr) qr.style.display = 'block';
    }
  });
  document.body.appendChild(ov);
  ov.classList.add('wp-max');
  var _mx0 = document.getElementById('__wpMax'); if (_mx0) { _mx0.textContent = '❐'; _mx0.title = '기본 크기'; }
  document.body.style.overflow = 'hidden';
  // 패널 내 입력창에서 Enter가 오피스 페이지 폼을 제출/새로고침해 패널이 사라지는 것 방지
  // (Enter 기본동작만 차단, 각 입력창의 개별 Enter 핸들러는 그대로 동작. textarea 줄바꿈은 허용)
  ov.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') {
      e.preventDefault();
    }
  }, true);
  var launcher = null;
  var __wpOrigTitle = document.title;
  document.title = '위펀 오피스 / 물류';

  function close() {
    stopPoll();
    document.body.style.overflow = '';
    document.title = __wpOrigTitle;
    ov.remove();
    if (st.parentNode) st.remove();
    if (launcher && launcher.parentNode) launcher.remove();
  }
  var badgePoll = null;

  function reopen() {
    stopPoll();
    ov.style.display = '';
    ov.classList.add('wp-max');
    document.getElementById('__wpMax').textContent = '❐';
    document.getElementById('__wpMax').title = '기본 크기';
    document.body.style.overflow = 'hidden';
    resetPos();
    if (launcher) launcher.style.display = 'none';
  }

  /* 미전달(승인됐는데 코드전달 안 된 건) 개수 — 배지용. 서버 부담 줄이려 5분 캐시 */
  var _pendCache = { n: 0, t: 0 };
  function pendingCodeCount() {
    if (Date.now() - _pendCache.t < 600000) { return Promise.resolve(_pendCache.n); }
    return listReq({ pending: 'code' }).then(function(items) {
      _pendCache = { n: items.length, t: Date.now() };
      return items.length;
    }).catch(function() { return _pendCache.n; });
  }

  function updateBadge() {
    if (!launcher || launcher.style.display === 'none') return;
    /* 두 발을 동시에 던지면 서버(Apps Script)가 직렬화하며 서로 막는다 → 순차로 */
    var p = IS_ADMIN ? listReq({ status: '대기' }).then(function(items) {
      var n = items.length;
      return pendingCodeCount().then(function(m) { return n + m; });
    }) : listReq({
      email: REQ.email
    }).then(function(items) {
      var seen = localStorage.getItem('__wpSeen') || '';
      return items.filter(function(it) {
        return it.status !== '대기' && String(it.decidedTs || '') > seen;
      }).length;
    });
    p.then(function(n) {
      var b = launcher.querySelector('.wp-badge');
      if (n > 0) {
        if (!b) {
          b = document.createElement('span');
          b.className = 'wp-badge';
          launcher.appendChild(b);
        }
        b.textContent = n > 99 ? '99+' : n;
      } else if (b) {
        b.remove();
      }
    }).catch(function() {});
  }

  function startPoll() {
    stopPoll();
    updateBadge();
    badgePoll = setInterval(updateBadge, 180000);   /* 30초는 너무 잦다 — Apps Script 직렬 큐를 계속 점유해 다른 조회를 막았다 */
  }

  function stopPoll() {
    if (badgePoll) {
      clearInterval(badgePoll);
      badgePoll = null;
    }
  }

  function showLauncher() {
    if (!launcher) {
      launcher = document.createElement('div');
      launcher.className = 'wp-launch';
      launcher.title = '위펀 물류 · 배송관리 (드래그로 이동)';
      launcher.innerHTML = LOGO;
      var moved = false,
        dr = null;
      launcher.addEventListener('mousedown', function(e) {
        dr = {
          x: e.clientX,
          y: e.clientY,
          l: launcher.getBoundingClientRect().left,
          t: launcher.getBoundingClientRect().top
        };
        moved = false;
        e.preventDefault();
      });
      document.addEventListener('mousemove', function(e) {
        if (!dr) return;
        var dx = e.clientX - dr.x,
          dy = e.clientY - dr.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        launcher.style.left = Math.max(6, Math.min(window.innerWidth - 64, dr.l + dx)) + 'px';
        launcher.style.top = Math.max(6, Math.min(window.innerHeight - 64, dr.t + dy)) + 'px';
        launcher.style.right = 'auto';
        launcher.style.bottom = 'auto';
      });
      document.addEventListener('mouseup', function() {
        dr = null;
      });
      launcher.addEventListener('click', function() {
        if (moved) {
          moved = false;
          return;
        }
        reopen();
      });
      document.body.appendChild(launcher);
    }
    launcher.style.display = 'flex';
    startPoll();
  }
  document.getElementById('__wpX').onclick = close;
  document.getElementById('__wpMin').onclick = function() {
    ov.style.display = 'none';
    document.body.style.overflow = '';
    showLauncher();
  };
  var CARD = ov.querySelector('.wp-card');

  function resetPos() {
    CARD.style.position = '';
    CARD.style.left = '';
    CARD.style.top = '';
    CARD.style.margin = '';
  }
  document.getElementById('__wpMax').onclick = function() {
    var on = ov.classList.toggle('wp-max');
    this.textContent = on ? '❐' : '▢';
    this.title = on ? '기본 크기' : '최대화';
    document.body.style.overflow = on ? 'hidden' : '';
    if (on) resetPos();
  }; /* 헤더 드래그로 이동 */
  var HEAD = ov.querySelector('.wp-head');
  HEAD.style.cursor = 'move';
  var drag = null;
  function __wpPt(e) { return (e.touches && e.touches[0]) ? e.touches[0] : e; }
  function __wpDown(e) {
    var h = e.target && e.target.closest ? e.target.closest('.wp-head') : null;
    if (!h || h !== HEAD) return;
    if (e.target.closest('button')) return;
    if (ov.classList.contains('wp-max')) return;
    var p = __wpPt(e);
    var r = CARD.getBoundingClientRect();
    CARD.style.position = 'fixed';
    CARD.style.margin = '0';
    CARD.style.left = r.left + 'px';
    CARD.style.top = r.top + 'px';
    drag = {
      dx: p.clientX - r.left,
      dy: p.clientY - r.top
    };
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  }
  function __wpMove(e) {
    if (!drag) return;
    var p = __wpPt(e);
    CARD.style.left = Math.max(0, Math.min(window.innerWidth - 80, p.clientX - drag.dx)) + 'px';
    CARD.style.top = Math.max(0, Math.min(window.innerHeight - 40, p.clientY - drag.dy)) + 'px';
    e.preventDefault();
    e.stopPropagation();
  }
  function __wpUp(e) {
    if (!drag) return;
    drag = null;
    document.body.style.userSelect = '';
    e.stopPropagation();
  }
  document.addEventListener('mousedown', __wpDown, true);
  document.addEventListener('mousemove', __wpMove, true);
  document.addEventListener('mouseup', __wpUp, true);
  document.addEventListener('touchstart', __wpDown, { capture: true, passive: false });
  document.addEventListener('touchmove', __wpMove, { capture: true, passive: false });
  document.addEventListener('touchend', __wpUp, true);
  document.getElementById('__wpCfg').onclick = function() {
    var cur = apiUrl();
    var u = prompt('공유 큐 웹앱 URL(.../exec)을 붙여넣으세요.', cur);
    if (u === null) return;
    localStorage.setItem('__wpApi', u.trim());
    alert(u.trim() ? '연결설정 저장됨' : 'URL 비움');
  };
  document.getElementById('__wpMreq').onclick = function() {
    setMode('requester');
  };
  document.getElementById('__wpMadm').onclick = function() {
    setMode('admin');
  };
  var VIEW = document.getElementById('__wpView');

  function applyAccess() {
    var e = (REQ.email || '').toLowerCase();
    if (!e) { return; }  /* 프로필 로딩 전엔 모드 변경 금지 (요청자용으로 튀는 것 방지) */
    var byEmail = ADMINS.map(function(x) {
      return String(x).toLowerCase();
    }).indexOf(e) > -1;
    var byDept = String(REQ.dept || '').indexOf('물류') > -1; /* 부서에 '물류' 포함 시 자동 관리자 */
    IS_ADMIN = byEmail || byDept;
    document.getElementById('__wpMadm').style.display = IS_ADMIN ? '' : 'none';
    document.getElementById('__wpCfg').style.display = IS_ADMIN ? '' : 'none';
    if (!IS_ADMIN && MODE === 'admin') setMode('requester');
  }

  var _tabsBuilt = false;
  function setMode(m) {
    if (m === 'admin' && !IS_ADMIN) {
      m = 'requester';
    }
    var _changed = (MODE !== m) || !_tabsBuilt;
    MODE = m;
    localStorage.setItem('__wpMode', m);
    document.getElementById('__wpMreq').className = 'wp-hbtn' + (m === 'requester' ? ' on' : '');
    document.getElementById('__wpMadm').className = 'wp-hbtn' + (m === 'admin' ? ' on' : '');
    if (_changed) { _tabsBuilt = true; buildTabs(); }
  }
  var TABS = {
    requester: [
      ['find', '거래처 조회 · 요청'],
      ['newcode', '신규코드'],
      ['mine', '내 요청 상태'],
      ['board_update', '업데이트 이력'],
      ['board_feature', '기능개선']
    ],
    admin: [
      ['review_deliv', '배송요청검토'],
      ['review_syn', '시너지요청검토'],
      ['review_pick', '수기피킹검토'],
      ['find', '거래처 조회'],
      ['bulk', '배송정보 일괄입력'],
      ['sched_bulk', '배송일정 일괄'],
      ['stats', '배송통계'],
      ['kstats', '기사통계'],
      ['dispatch', '배차'],
      ['board_update', '업데이트 이력'],
      ['board_feature', '기능개선']
    ]
  };

  function buildTabs() {
    var list = TABS[MODE];
    var tb = document.getElementById('__wpTabs');
    tb.innerHTML = '';
    list.forEach(function(t, i) {
      var b = document.createElement('button');
      b.className = 'wp-tab' + (i === 0 ? ' on' : '');
      b.textContent = t[1];
      b.onclick = function() {
        [].forEach.call(tb.children, function(x) {
          x.className = 'wp-tab';
        });
        b.className = 'wp-tab on';
        showTab(t[0]);
      };
      tb.appendChild(b);
    });
    showTab(list[0][0]);
  }

  function showTab(t) {
    if (t === 'find') viewFind();
    else if (t === 'mine') viewMine();
    else if (t === 'review_deliv') viewReview('deliv');
    else if (t === 'review_syn') viewReview('syn');
    else if (t === 'review_pick') viewReview('pick');
    else if (t === 'bulk') viewBulk();
    else if (t === 'sched_bulk') viewSchedBulk();
    else if (t === 'stats') viewStats();
    else if (t === 'kstats') viewKStats();
    else if (t === 'dispatch') viewDispatch();
    else if (t === 'newcode') viewNewCode();
    else if (t === 'board_update') viewBoard('update');
    else if (t === 'board_feature') viewBoard('feature');
  } /* ---------- 거래처 조회 ---------- */
  function cellLines(td) {
    if (!td) return [];
    var h = td.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    var d = document.createElement('div');
    d.innerHTML = h;
    return (d.textContent || '').split('\n').map(function(s) {
      return s.trim();
    }).filter(Boolean);
  }

  function parseRich(tr) {
    var oc = null;
    tr.querySelectorAll('a').forEach(function(a) {
      var o = a.getAttribute('onclick') || '';
      if (o.indexOf('branchView') > -1) oc = o;
    });
    if (!oc) return null;
    var id = (oc.match(/branchView\('(\d+)'\)/) || [])[1];
    if (!id) return null;
    var td = [].slice.call(tr.querySelectorAll('td'));
    var na = cellLines(td[2]);
    var dv = cellLines(td[4]).join(' ');
    var codes = cellLines(td[5]);
    var mgr = (cellLines(td[13])[0] || '').split('/').map(function(s) {
      return s.trim();
    });
    return {
      id: id,
      hot: codes[0] || '',
      cold: codes[1] || '',
      name: na[0] || '',
      addr: na[1] || '',
      course: cellLines(td[6])[0] || '',
      method: /^택배/.test(dv) ? '택배' : (/^방문/.test(dv) ? '방문' : ''),
      manager: mgr[0] || '',
      cc: (codes[0] || '') + (codes[1] || '')
    };
  }

  function searchRich(kw, snackActiveOnly) {
    var f = snackActiveOnly ? ('&serviceStatuses=' + encodeURIComponent('활동')) : '';
    return fetch('/office/sales/branch?size=50&page=1&searchYN=Y' + f + '&searchKeyword=' + encodeURIComponent(kw)).then(function(r) {
      return r.text();
    }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      return [].slice.call(doc.querySelectorAll('table tbody tr')).map(parseRich).filter(Boolean);
    });
  }

  function searchBranch(kw) {
    return searchRich(kw).then(function(a) {
      return a.map(function(x) {
        return {
          id: x.id,
          name: x.name,
          cc: x.cc,
          driver: x.course
        };
      });
    });
  } /* 상품 검색 (수기피킹) — /office/item/item HTML 파싱. 품목명/바코드/용량/출고기준/주문단위(moq) */
  function searchItems(kw) {
    var base = '/office/item/item?size=30&page=1&searchYN=Y&pageSize=30';
    base += '&searchParamItemStatuses=' + encodeURIComponent('판매중') + '&searchParamItemStatuses=' + encodeURIComponent('일시품절');
    base += '&searchParamItemStorages=' + encodeURIComponent('상온') + '&searchParamItemStorages=' + encodeURIComponent('저온') + '&searchParamItemStorages=' + encodeURIComponent('직배송_상온') + '&searchParamItemStorages=' + encodeURIComponent('직배송_저온');
    base += '&itemListSearchKeyword=' + encodeURIComponent(kw);
    return fetch(base).then(function(r) {
      return r.text();
    }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var trs = [].slice.call(doc.querySelectorAll('table tbody tr'));
      var out = [];
      trs.forEach(function(tr) {
        var tds = tr.querySelectorAll('td');
        if (tds.length < 17) return;
        var link = '';
        tr.querySelectorAll('a').forEach(function(a) {
          var oc = a.getAttribute('onclick') || '';
          if (!link && oc.indexOf('itemView') > -1) link = oc;
        });
        var code = (link.match(/itemView\('([^']+)'\)/) || [])[1] || '';
        function tx(i) {
          return tds[i] ? (tds[i].innerText || '').replace(/\s+/g, ' ').trim() : '';
        }
        var c0 = tx(0);
        var barcode = (c0.match(/\[B\]\s*([0-9]+)/) || [])[1] || '';
        var name = tx(4);
        if (!name && !code) return;
        var pkg = tx(6);
        var orderUnit = tx(7); // 주문단위(moq) 예: "6개"
        var volume = tx(10);
        var priceCell = tx(12); // 판매가공급가세액 예: "₩2,170 ₩1,973 ₩197"
        var price = (priceCell.match(/₩\s*([\d,]+)/) || [])[1] || '';
        var storage = tx(16).split(' ')[0]; // 상온/저온/조식
        out.push({
          code: code,
          barcode: barcode,
          name: name,
          brand: tx(2),
          pkg: pkg,
          orderUnit: orderUnit,
          moq: (orderUnit.match(/\d+/) || [])[0] || '',
          volume: volume,
          storage: storage,
          price: price
        });
      });
      return out;
    });
  } /* 거래처(branchId) → 해당 서비스들의 serviceId (배송일정 캘린더 딥링크용, 읽기전용) */
  function resolveServiceIds(branchId) {
    function isoD(dt) {
      var p = function(n) {
        return ('0' + n).slice(-2);
      };
      return dt.getFullYear() + '-' + p(dt.getMonth() + 1) + '-' + p(dt.getDate());
    }

    function q(monthsBack, monthsFwd) {
      var a = new Date(),
        b = new Date();
      a.setMonth(a.getMonth() - monthsBack);
      b.setMonth(b.getMonth() + monthsFwd);
      var url = '/office/order/schedule?searchYN=Y&branchId=' + encodeURIComponent(branchId) + '&deliveryDateBegin=' + isoD(a) + '&deliveryDateEnd=' + isoD(b) + '&size=50';
      return fetch(url).then(function(r) {
        return r.text();
      }).then(function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var ids = [];
        doc.querySelectorAll('a').forEach(function(a) {
          var m = (a.getAttribute('href') || '').match(/\/office\/order\/schedule\/service\/(\d+)/);
          if (m) ids.push(m[1]);
        });
        return ids.filter(function(v, i) {
          return ids.indexOf(v) === i;
        });
      });
    }
    return q(6, 6).then(function(ids) {
      return ids.length ? ids : q(18, 18);
    });
  } /* 신규 등 스케줄이 아직 없는 거래처용: 서비스 목록에서 거래처명+활동으로 serviceId 찾기 (승인 시 이 serviceId로 주기 생성→스케줄 생성) */
  function resolveServicesByName(name) {
    if (!name) return Promise.resolve([]);
    return fetch('/office/sales/service?searchYN=Y&size=50&page=1&searchKeyword=' + encodeURIComponent(name)).then(function(r) {
      return r.text();
    }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var trs = [].slice.call(doc.querySelectorAll('tr')).filter(function(tr) {
        return /service\/update\/\d+/.test(tr.innerHTML);
      });
      var want = nn(name);
      var ids = [];
      trs.forEach(function(tr) {
        var m = tr.innerHTML.match(/service\/update\/(\d+)/);
        if (!m) return;
        var tds = tr.querySelectorAll('td');
        var bn = nn(tds[2] && tds[2].innerText || ''); // 거래처명칸엔 주소가 뒤에 붙어있음 → 시작부분 일치로 매칭
        var st = (tds[3] && tds[3].innerText || '');
        if (want && bn.indexOf(want) === 0 && /활동/.test(st)) ids.push(m[1]);
      });
      return ids;
    }).catch(function() {
      return [];
    });
  }

  /* 스케줄이 아직 없는 거래처는 스케줄 페이지에서 serviceId가 안 나온다.
     → 서비스 목록에서 거래처명+활동으로 한 번 더 찾는다. (신규코드발급이 쓰던 방식을 공용화) */
  function resolveSid(branchId, branchName) {
    return resolveServiceIds(branchId).then(function(ids) {
      return (ids && ids.length) ? ids : (branchName ? resolveServicesByName(branchName) : []);
    }).catch(function() {
      return branchName ? resolveServicesByName(branchName) : [];
    });
  }

  function openSchedule(branchId) {
    return resolveServiceIds(branchId).then(function(ids) {
      if (ids.length === 1) {
        window.open('/office/order/schedule/service/' + ids[0], '_blank');
      } else {
        window.open('/office/order/schedule?searchYN=Y&branchId=' + encodeURIComponent(branchId), '_blank');
      }
    }).catch(function() {
      window.open('/office/order/schedule', '_blank');
    });
  }

  function openServiceEdit(branchId) {
    return resolveServiceIds(branchId).then(function(ids) {
      if (ids.length) {
        window.open('/office/sales/service/update/' + ids[0], '_blank');
      } else {
        window.open('/office/sales/service?searchYN=Y&branchId=' + encodeURIComponent(branchId), '_blank');
      }
    }).catch(function() {
      window.open('/office/sales/service', '_blank');
    });
  }

  function getCurrentCycle(branchId) {
    return resolveServiceIds(branchId).then(function(ids) {
      if (!ids.length) return null;
      return fetch('/office/sales/service/update/' + ids[0]).then(function(r) {
        return r.text();
      }).then(function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var dc = doc.querySelector('[name=deliveryCycle]');
        var cyc = dc ? dc.value : '';
        var dw = doc.querySelector('[name=dayOfWeek]');
        var days = [];
        if (dw) {
          [].forEach.call(dw.options, function(o) {
            if (o.selected) days.push(o.value);
          });
        }
        return {
          cyc: cyc,
          days: days
        };
      });
    });
  }

  function serviceInfo(branchId, branchName) {
    return resolveServiceIds(branchId).then(function(ids) {
      return ids.length ? ids : (branchName ? resolveServicesByName(branchName) : []);
    }).then(function(ids) {
      if (!ids.length) return null;
      var sid = ids[0];
      return fetch('/office/sales/service/update/' + sid).then(function(r) {
        return r.text();
      }).then(function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');

        function v(n) {
          var e = doc.querySelector('[name="' + n + '"]');
          return e ? (e.value || '') : '';
        }
        return {
          sid: sid,
          serviceType: v('serviceType'),
          budget: v('budget'),
          beginDate: v('deliveryBeginDate')
        };
      });
    });
  } /* 배송일정 실제 조회/생성/삭제 (검증된 API) */
  function getScheduleEvents(serviceId) {
    return fetch('/office/order/schedule/service/' + serviceId).then(function(r) {
      return r.text();
    }).then(function(html) {
      var re = /deliveryDate["'\s:]+["']?(\d{4}-\d{2}-\d{2})["']?[\s\S]{0,40}?orderScheduleId["'\s:]+(\d+)/g,
        m, out = [];
      while ((m = re.exec(html))) {
        out.push({
          deliveryDate: m[1],
          orderScheduleId: m[2]
        });
      }
      return out;
    });
  }

  function createDelivery(serviceId, date) {
    return fetch('/office/order/schedule/service/update/' + serviceId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'   /* 오피스 화면($.ajax)과 동일하게 — 없으면 서버가 다른 분기를 타 500이 날 수 있다 */
      },
      body: 'orderScheduleId=0&deliveryDate=' + encodeURIComponent(date)
    }).then(function(r) {
      if (!r.ok) throw new Error('생성 실패 HTTP ' + r.status);
      return r.json().catch(function() {
        return {};
      });
    });
  }

  function moveDelivery(serviceId, orderScheduleId, newDate) {
    return fetch('/office/order/schedule/service/update/' + serviceId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: 'orderScheduleId=' + encodeURIComponent(orderScheduleId) + '&deliveryDate=' + encodeURIComponent(newDate)
    }).then(function(r) {
      if (!r.ok) throw new Error('변경 실패 HTTP ' + r.status);
      return true;
    });
  }

  function deleteDelivery(serviceId, orderScheduleId, date) {
    return fetch('/office/order/schedule/service/delete/' + serviceId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: 'orderScheduleId=' + encodeURIComponent(orderScheduleId) + '&deliveryDate=' + encodeURIComponent(date)
    }).then(function(r) {
      if (!r.ok) throw new Error(date + ' 삭제 실패 HTTP ' + r.status + (r.status === 500 ? ' (거래명세 생성 여부 확인)' : ''));
      return true;
    });
  } /* 배송주기 변경: 서비스 편집 페이지를 숨긴 iframe으로 로드→필드 세팅→next() 실행(팝업 없이 자동). 헤드리스 POST는 서버 DTO검증에 막혀 이 방식만 유효. */
  function driveCycle(sid, cyc, days, beginDate) {
    return new Promise(function(resolve, reject) {
      var ifr = document.createElement('iframe');
      ifr.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;height:900px;border:0';
      ifr.src = '/office/sales/service/update/' + sid;
      var timer = setTimeout(function() {
        done();
        reject(new Error('편집 화면 로딩 지연 — 수동 확인'));
      }, 25000);

      function done() {
        clearTimeout(timer);
        setTimeout(function() {
          if (ifr.parentNode) ifr.remove();
        }, 6000);
      }
      ifr.onload = function() {
        setTimeout(function() {
          try {
            var w = ifr.contentWindow,
              d = ifr.contentDocument;
            var dc = d.querySelector('[name=deliveryCycle]');
            if (!dc) {
              done();
              return reject(new Error('편집 폼 없음'));
            }
            var $ = w.jQuery;
            var t = [].slice.call(dc.options).filter(function(o) {
              return o.value === cyc;
            })[0];
            if (!t) {
              done();
              return reject(new Error('주기 옵션 매칭 실패: ' + cyc));
            } [].forEach.call(dc.options, function(o) {
              o.selected = (o === t);
            });
            dc.value = t.value;
            $(dc).trigger('change');
            var noDay = (cyc === '매일' || cyc === '계획일정없음' || cyc === '수기일정생성');
            var useDays = noDay ? [] : days;
            var dw = d.querySelector('[name=dayOfWeek]');
            if (dw) {
              [].forEach.call(dw.options, function(o) {
                o.selected = useDays.indexOf(o.value) > -1;
              });
              $(dw).trigger('change');
            }
            if (beginDate) {
              var bd = d.querySelector('[name=deliveryBeginDate]');
              if (bd) {
                bd.value = beginDate;
                try {
                  $(bd).trigger('change');
                } catch (_) {}
              }
            }
            fixAgreementDoc(d, $);
            d.querySelector('[name=recreateScheduleYN]').checked = true;
            w.confirm = function() {
              return true;
            };
            w.alert = function() {};
            w.eval('next()');
            done();
            resolve(true);
          } catch (e) {
            done();
            reject(e);
          }
        }, 1200);
      };
      document.body.appendChild(ifr);
    });
  }

  function detailGet(detail, key) {
    var m = String(detail || '').split('·').map(function(s) {
      return s.trim();
    });
    for (var i = 0; i < m.length; i++) {
      var kv = m[i].split(':');
      if (kv[0] && kv[0].trim() === key) return kv.slice(1).join(':').trim();
    }
    return '';
  }
  var FOUND = {};

  function closeActMenu() {
    var e = document.getElementById('__wpActMenu');
    if (e) e.remove();
    document.removeEventListener('mousedown', __amOut, true);
    window.removeEventListener('resize', closeActMenu, true);
  }

  function __amOut(e) {
    var m = document.getElementById('__wpActMenu');
    if (m && !m.contains(e.target)) closeActMenu();
  }

  function openActMenu(btn, bid) {
    closeActMenu();
    var acts = actionKeys().filter(function(a) { return a !== '신규코드발급'; });
    var m = document.createElement('div');
    m.id = '__wpActMenu';
    m.style.cssText = 'position:fixed;z-index:2147483647;background:#fff;border:1px solid #e2e8f0;border-radius:11px;box-shadow:0 16px 40px rgba(15,23,42,.22);min-width:168px;padding:5px;font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif';
    m.innerHTML = acts.map(function(a) {
      return '<button class="wp-ami" data-a="' + esc(a) + '" style="display:block;width:100%;text-align:left;border:none;background:none;padding:10px 14px;font-size:13px;color:#1e293b;cursor:pointer;border-radius:7px">' + esc(a) + '</button>';
    }).join('');
    document.body.appendChild(m);
    var r = btn.getBoundingClientRect(),
      mw = m.offsetWidth,
      mh = m.offsetHeight;
    var left = Math.min(r.right - mw, window.innerWidth - mw - 10);
    if (left < 10) left = 10;
    var top = (r.bottom + 6 + mh > window.innerHeight - 10) ? Math.max(10, r.top - mh - 6) : r.bottom + 6;
    m.style.left = left + 'px';
    m.style.top = top + 'px';
    [].forEach.call(m.querySelectorAll('.wp-ami'), function(b) {
      b.onmouseover = function() {
        b.style.background = '#eef4fb';
        b.style.color = '#1f4e78';
        b.style.fontWeight = '600';
      };
      b.onmouseout = function() {
        b.style.background = 'none';
        b.style.color = '#1e293b';
        b.style.fontWeight = '400';
      };
      b.onclick = function() {
        var a = b.getAttribute('data-a');
        closeActMenu();
        /* 배송시간문의는 먼저 조회한다 — 이미 완료된 건이면 요청을 만들 이유가 없다 */
        if (a === '배송시간문의') { openDeliveryTime(FOUND[bid]); return; }
        openForm(a, FOUND[bid]);
      };
    });
    setTimeout(function() {
      document.addEventListener('mousedown', __amOut, true);
      window.addEventListener('resize', closeActMenu, true);
    }, 0);
  }

  function viewFind() {
    VIEW.innerHTML = '<div style="display:flex;gap:8px;margin-bottom:12px"><input id="__wpQ" class="wp-inp" placeholder="점포코드 또는 거래처명 입력 후 Enter" style="flex:1"><button id="__wpQb" class="wp-btn pri">검색</button></div><div id="__wpQr" class="wp-scroll" style="display:none"></div><div id="__wpForm"></div>';
    document.getElementById('__wpQb').onclick = runFind;
    document.getElementById('__wpQ').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        runFind();
      }
    });
    document.getElementById('__wpQ').focus();
  }

  function runFind() {
    var q = document.getElementById('__wpQ').value.trim();
    var box = document.getElementById('__wpQr');
    document.getElementById('__wpForm').innerHTML = '';
    if (!q) {
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    box.innerHTML = '<div style="color:#94a3b8;padding:10px">검색 중…</div>';
    searchRich(q, true).then(function(list) {
      FOUND = {};
      list.forEach(function(r) {
        FOUND[r.id] = r;
      });
      if (!list.length) {
        box.innerHTML = '<div style="color:#b00;padding:10px">결과 없음</div>';
        return;
      }
      var acts = actionKeys();
      var showActs = (MODE === 'requester');
      var h = (showActs ? '<div id="__wpBulkBar" style="display:none;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;background:#0B1220;color:#fff;border-radius:6px;flex-wrap:wrap"><b>선택 <span id="__wpBkN">0</span>건</b><span style="opacity:.45">|</span><select id="__wpBulkAct" class="wp-inp" style="height:32px;max-width:190px;color:#17222E"><option value="배송일정생성">배송일정생성</option><option value="배송일정변경">배송일정변경</option><option value="배송일정삭제">배송일정삭제</option><option value="배송주기변경">배송주기변경</option><option value="배송메모">배송메모</option></select><button id="__wpBulkGo" class="wp-btn" style="height:32px;background:#38BDF8;color:#04121F;border:none">선택 일괄요청</button></div>' : '') + '<table class="wp-tbl"><thead><tr>' + (showActs ? ['<input type="checkbox" id="__wpBkAll" style="cursor:pointer">'] : []).concat(['점포코드', '거래처명', '담당코스', '배송', '주소']).concat(showActs ? ['작업요청'] : []).map(function(x) {
        return '<th>' + x + '</th>';
      }).join('') + '</tr></thead><tbody>';
      list.forEach(function(r) {
        var menu = showActs ? ('<td style="white-space:nowrap;text-align:right"><button class="wp-ddbtn" data-id="' + r.id + '">＋ 작업 요청 ▾</button></td>') : '';
        var code = esc(r.hot) + (r.cold ? '<span style="color:#94a3b8"> / ' + esc(r.cold) + '</span>' : '');
        h += '<tr>' + (showActs ? '<td style="text-align:center;white-space:nowrap"><input type="checkbox" class="__wpBk" data-id="' + r.id + '" style="cursor:pointer"></td>' : '') + '<td style="font-weight:700;white-space:nowrap">' + (code || '<span style="color:#cbd5e1">-</span>') + '</td><td style="min-width:180px">' + esc(r.name) + '</td><td style="white-space:nowrap">' + esc(r.course || '-') + '</td><td style="white-space:nowrap">' + esc(r.method || '-') + '</td><td style="color:#64748b;line-height:1.4">' + esc(r.addr || '-') + '</td>' + menu + '</tr>';
      });
      h += '</tbody></table>';
      box.innerHTML = h;
      [].forEach.call(box.querySelectorAll('.wp-ddbtn'), function(b) {
        b.onclick = function(e) {
          e.stopPropagation();
          openActMenu(b, b.getAttribute('data-id'));
        };
      });
      var _bkBar = document.getElementById('__wpBulkBar');
      function _bkUpd() { var n = box.querySelectorAll('.__wpBk:checked').length; if (_bkBar) { document.getElementById('__wpBkN').textContent = n; _bkBar.style.display = n ? 'flex' : 'none'; } }
      [].forEach.call(box.querySelectorAll('.__wpBk'), function(c) { c.onchange = _bkUpd; });
      var _bkAll = document.getElementById('__wpBkAll');
      if (_bkAll) _bkAll.onchange = function() { [].forEach.call(box.querySelectorAll('.__wpBk'), function(c) { c.checked = _bkAll.checked; }); _bkUpd(); };
      var _bkGo = document.getElementById('__wpBulkGo');
      if (_bkGo) _bkGo.onclick = function() { var ids = [].map.call(box.querySelectorAll('.__wpBk:checked'), function(c) { return c.getAttribute('data-id'); }); var brs = ids.map(function(id) { return FOUND[id]; }).filter(Boolean); if (!brs.length) return; openBulkForm(document.getElementById('__wpBulkAct').value, brs); };
    }).catch(function(e) {
      box.innerHTML = '<div style="color:#b00;padding:10px">오류: ' + esc(e.message) + '</div>';
    });
  } /* ---------- 요일 다중선택 ---------- */
  function bindDays(key) {
    var inp = document.getElementById('__wpf_' + key);
    var dd = document.getElementById('__wpf_' + key + '_dd');
    if (!inp || !dd) return;
    inp.onclick = function() {
      dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    };
    [].forEach.call(dd.querySelectorAll('.wp-day'), function(b) {
      b.onclick = function() {
        var cyc = (document.getElementById('__wpf_변경주기') || document.getElementById('__wpf_요청주기') || {}).value || '';
        if (/^매월/.test(cyc)) {
          if (!b.classList.contains('on')) {
            [].forEach.call(dd.querySelectorAll('.wp-day.on'), function(x) {
              x.classList.remove('on');
            });
            b.classList.add('on');
          } else {
            b.classList.remove('on');
          }
        } else {
          b.classList.toggle('on');
        }
        var sel = [].slice.call(dd.querySelectorAll('.wp-day.on')).map(function(x) {
          return x.getAttribute('data-d');
        });
        inp.value = sel.join(',');
      };
    });
  }

  function buildSchedCal(host, dates) {
    var setD = {};
    (dates || []).forEach(function(d) { setD[d] = 1; });
    var t = new Date();
    var cur = { y: t.getFullYear(), m: t.getMonth() };
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var BTN = 'width:30px;height:30px;border:1px solid #e2e8f0;background:#fff;border-radius:8px;cursor:pointer;color:#475569;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center';
    function draw() {
      var startDow = new Date(cur.y, cur.m, 1).getDay();
      var dim = new Date(cur.y, cur.m + 1, 0).getDate();
      var td = new Date();
      var todayStr = td.getFullYear() + '-' + pad(td.getMonth() + 1) + '-' + pad(td.getDate());
      var h = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><button type="button" class="__wpCalPrev" style="' + BTN + '">‹</button><b style="font-size:14.5px;color:#0f172a;letter-spacing:.3px">' + cur.y + '. ' + pad(cur.m + 1) + '</b><button type="button" class="__wpCalNext" style="' + BTN + '">›</button></div>';
      h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:3px">';
      var W = ['일', '월', '화', '수', '목', '금', '토'];
      W.forEach(function(w, i) { h += '<div style="text-align:center;font-size:11px;font-weight:600;padding:3px 0;color:' + (i === 0 ? '#ef4444' : (i === 6 ? '#3b82f6' : '#94a3b8')) + '">' + w + '</div>'; });
      h += '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">';
      var b;
      for (b = 0; b < startDow; b++) { h += '<div></div>'; }
      for (var d = 1; d <= dim; d++) {
        var ds = cur.y + '-' + pad(cur.m + 1) + '-' + pad(d);
        var on = setD[ds];
        var isToday = (ds === todayStr);
        var dow = (startDow + d - 1) % 7;
        var st = 'height:36px;display:flex;align-items:center;justify-content:center;font-size:12.5px;border-radius:9px;';
        if (on) { st += 'background:#0EA5E9;color:#fff;font-weight:700;box-shadow:0 2px 5px rgba(14,165,233,.35)'; }
        else { st += 'color:' + (dow === 0 ? '#ef4444' : (dow === 6 ? '#3b82f6' : '#334155')) + ';background:#f8fafc'; if (isToday) { st += ';border:1.5px solid #cbd5e1'; } }
        h += '<div style="' + st + '">' + d + '</div>';
      }
      h += '</div>';
      host.innerHTML = h;
      host.querySelector('.__wpCalPrev').onclick = function() { cur.m--; if (cur.m < 0) { cur.m = 11; cur.y--; } draw(); };
      host.querySelector('.__wpCalNext').onclick = function() { cur.m++; if (cur.m > 11) { cur.m = 0; cur.y++; } draw(); };
    }
    draw();
  }

  function bindDates(key) {
    var pick = document.getElementById('__wpf_' + key + '_pick');
    var addb = document.getElementById('__wpf_' + key + '_add');
    var chips = document.getElementById('__wpf_' + key + '_chips');
    var hid = document.getElementById('__wpf_' + key);
    if (!pick || !addb || !chips || !hid) return;
    var arr = [];
    function render() {
      arr.sort();
      hid.value = arr.join(',');
      /* 칩에는 요일까지 보여주되 hid.value(=제출값)는 'YYYY-MM-DD' 원형 그대로 둔다 */
      chips.innerHTML = arr.map(function(d) { return '<span style="display:inline-flex;align-items:center;gap:4px;background:#e0f2fe;color:#075985;border-radius:6px;padding:2px 8px;font-size:12px">' + addDow(d) + ' <b data-d="' + d + '" style="cursor:pointer;color:#0369a1;font-weight:700">×</b></span>'; }).join('');
      [].forEach.call(chips.querySelectorAll('b[data-d]'), function(x) { x.onclick = function() { arr = arr.filter(function(y) { return y !== x.getAttribute('data-d'); }); render(); }; });
    }
    addb.onclick = function() { var v = pick.value; if (!v) { toast('날짜를 선택하세요', '#c0392b'); return; } if (arr.indexOf(v) < 0) arr.push(v); pick.value = ''; render(); };
  }

  function bindMulti(key) {
    var inp = document.getElementById('__wpf_' + key);
    var dd = document.getElementById('__wpf_' + key + '_dd');
    if (!inp || !dd) return;
    inp.onclick = function(e) {
      e.stopPropagation();
      dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    };
    dd.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    [].forEach.call(dd.querySelectorAll('input[type=checkbox]'), function(cb) {
      cb.onchange = function() {
        var sel = [];
        [].forEach.call(dd.querySelectorAll('input[type=checkbox]'), function(c) {
          if (c.checked) sel.push(c.value);
        });
        inp.value = sel.join(', ');
      };
    });
  } /* ---------- 요청 폼 ---------- */
  function flab(f) { return esc(f.label) + (f.req ? ' <span style="color:#dc2626" title="필수">*</span>' : ''); }

  function fieldHtml(f) {
    var id = '__wpf_' + f.k;
    if (f.type === 'dates') return '<div class="wp-fld"><span>' + flab(f) + '</span><div style="flex:1"><div style="display:flex;gap:6px"><input type="date" id="' + id + '_pick" class="wp-inp" style="flex:1"><button type="button" id="' + id + '_add" class="wp-btn gh" style="white-space:nowrap">+ 추가</button></div><div id="' + id + '_chips" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px"></div><input type="hidden" id="' + id + '"></div></div>';
    if (f.type === 'select') return '<div class="wp-fld"><span>' + flab(f) + '</span><select id="' + id + '" class="wp-inp"><option value=""></option>' + f.opts.map(function(o) {
      return '<option>' + esc(o) + '</option>';
    }).join('') + '</select></div>';
    if (f.type === 'days') return '<div class="wp-fld"><span>' + flab(f) + '</span><div style="flex:1;position:relative"><input id="' + id + '" class="wp-inp" readonly placeholder="요일 선택(복수 가능)" style="width:100%;cursor:pointer"><div id="' + id + '_dd" style="display:none;position:absolute;z-index:9;left:0;right:0;background:#fff;border:1px solid #cbd5e1;border-radius:9px;padding:8px;margin-top:3px;box-shadow:0 10px 30px rgba(0,0,0,.18)">' + DAYS.map(function(d) {
      return '<button type="button" class="wp-day" data-d="' + d + '">' + d.slice(0, 1) + '</button>';
    }).join('') + '</div></div></div>';
    if (f.type === 'multi') return '<div class="wp-fld"><span>' + flab(f) + '</span><div style="flex:1;position:relative"><input id="' + id + '" class="wp-inp" readonly placeholder="설비 선택(복수 가능)" style="width:100%;cursor:pointer"><div id="' + id + '_dd" style="display:none;position:absolute;z-index:9;left:0;right:0;background:#fff;border:1px solid #cbd5e1;border-radius:9px;padding:6px;margin-top:3px;box-shadow:0 10px 30px rgba(0,0,0,.18);max-height:260px;overflow:auto">' + f.opts.map(function(o) {
      return '<label style="display:block;padding:5px 8px;font-size:13px;cursor:pointer;border-radius:6px"><input type="checkbox" value="' + esc(o) + '" style="margin-right:8px;vertical-align:middle">' + esc(o) + '</label>';
    }).join('') + '</div></div></div>';
    if (f.type === 'textarea') return '<div style="margin:10px 0"><div style="color:#475569;font-size:13px;margin-bottom:4px">' + flab(f) + '</div><textarea id="' + id + '" class="wp-inp" style="width:100%;height:130px;font-family:inherit"></textarea></div>';
    if (f.type === 'addr') return '<div class="wp-fld"><span>' + flab(f) + '</span><div style="flex:1;display:flex;gap:6px"><input id="' + id + '" class="wp-inp" type="text" style="flex:1" placeholder="주소검색 버튼으로 입력"><button type="button" id="' + id + '_btn" class="wp-btn gh" style="padding:7px 12px;white-space:nowrap">주소검색</button></div></div>';
    if (f.type === 'date') {
      /* 날짜 고르면 옆에 요일이 바로 뜬다 — 잘못된 요일 선택을 입력 시점에 잡기 위함 */
      return '<div class="wp-fld"><span>' + flab(f) + '</span><div style="flex:1;display:flex;align-items:center;gap:9px"><input id="' + id + '" class="wp-inp" type="date" style="flex:1"><span id="' + id + '_dow" style="min-width:34px;font-size:13.5px;font-weight:700;color:#1f4e78"></span></div></div>';
    }
    return '<div class="wp-fld"><span>' + flab(f) + '</span><input id="' + id + '" class="wp-inp" type="text"' + (f.ro ? ' readonly style="background:#f1f5f9;color:#475569"' : '') + '></div>';
  }

  function openPostcodeModal(cb) {
    ensurePostcode().then(function() {
      var ov = document.createElement('div');
      ov.id = '__wpPcOv';
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif';
      ov.innerHTML = '<div style="background:#fff;border-radius:12px;padding:10px;width:460px;max-width:94vw;box-shadow:0 20px 60px rgba(0,0,0,.35)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:14px">주소 검색</b><button id="__wpPcX" class="wp-btn gh" style="padding:4px 10px">✕</button></div><div id="__wpPcBox" style="height:440px"></div></div>';
      document.body.appendChild(ov);

      function close() {
        if (ov.parentNode) ov.remove();
      }
      document.getElementById('__wpPcX').onclick = close;
      ov.onclick = function(e) {
        if (e.target === ov) close();
      };
      new daum.Postcode({
        oncomplete: function(d) {
          cb(d.roadAddress || d.address, d);
          close();
        }
      }).embed(document.getElementById('__wpPcBox'), {
        autoClose: false
      });
    }).catch(function(e) {
      alert('주소검색 로드 실패: ' + (e && e.message || e));
    });
  }

  function bindAddr(key) {
    var id = '__wpf_' + key;
    var btn = document.getElementById(id + '_btn');
    if (!btn) return;
    btn.onclick = function() {
      openPostcodeModal(function(addr) {
        var el = document.getElementById(id);
        if (el) el.value = addr;
      });
    };
  }

      var BOARD_CACHE = {};
  function boardList(type) { return api({ e: 'board_list', type: type }).then(function(j) { return j.posts || []; }); }
  function boardAdd(type, title, body) { return api({ e: 'board_add', type: type, title: title, body: body, name: REQ.name || '', email: REQ.email || '' }); }
  function boardEdit(id, title, body) { return api({ e: 'board_edit', id: id, title: title, body: body }); }
  function boardView(id) { return api({ e: 'board_view', id: id }).then(function(j) { return j.views || 0; }); }
  function boardDelete(id) { return api({ e: 'board_delete', id: id, email: REQ.email || '', admin: IS_ADMIN ? '1' : '0' }); }
  function cmtList(pid) { return api({ e: 'comment_list', postId: pid }).then(function(j) { return j.comments || []; }); }
  function cmtAdd(pid, body) { return api({ e: 'comment_add', postId: pid, body: body, name: REQ.name || '', email: REQ.email || '' }); }
  function viewBoard(type) {
    var isUpd = (type === 'update');
    var canWrite = isUpd ? IS_ADMIN : true;
    var title = isUpd ? '업데이트 이력' : '기능개선 · 문의 게시판';
    var hint = isUpd ? '패널 업데이트 내역입니다. 제목을 누르면 상세와 댓글이 열립니다.' : '개선 아이디어·불편·문의를 자유롭게 남겨주세요. 제목을 누르면 댓글도 달 수 있어요.';
    VIEW.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px"><b style="font-size:15px">' + title + '</b>' + (canWrite ? '<button id="__wpBdNew" class="wp-btn pri">글쓰기</button>' : '') + '</div><div style="font-size:12px;color:#94a3b8;margin-bottom:10px">' + hint + '</div><div id="__wpBdWrap"></div><div id="__wpBdList" class="wp-scroll">불러오는 중…</div>';
    if (canWrite) document.getElementById('__wpBdNew').onclick = function() { boardWriteForm(type, null); };
    loadBoard(type);
  }
  function loadBoard(type) {
    document.getElementById('__wpBdList').innerHTML = '<div style="color:#94a3b8;padding:10px">불러오는 중…</div>';
    boardList(type).then(function(posts) { renderBoard(type, posts); }).catch(function(e) { document.getElementById('__wpBdList').innerHTML = '<div style="color:#b00;padding:10px">' + esc(e.message) + '</div>'; });
  }
  function renderCmts(el, cs) {
    if (!cs.length) { el.innerHTML = '<span style="color:#94a3b8;font-size:12px">첫 댓글을 남겨보세요.</span>'; return; }
    el.innerHTML = cs.map(function(c) { return '<div style="padding:5px 0;border-bottom:1px solid #eef2f7;font-size:12.5px"><b>' + esc(c.name || '-') + '</b> <span class="mono" style="color:#94a3b8;font-size:11px">' + esc(c.ts || '') + '</span><div style="color:#334155;white-space:pre-wrap;margin-top:1px">' + esc(c.body || '') + '</div></div>'; }).join('');
  }
  function renderBoard(type, posts) {
    var isUpd = (type === 'update');
    var el = document.getElementById('__wpBdList');
    if (!posts.length) { el.innerHTML = '<div style="color:#94a3b8;padding:14px">아직 글이 없습니다.</div>'; return; }
    var h = '<table class="wp-tbl" style="width:100%"><thead><tr><th style="width:60px">번호</th><th>제목</th><th style="width:120px">작성자</th><th style="width:140px">작성일</th><th style="width:70px;text-align:center">조회수</th></tr></thead><tbody>';
    posts.forEach(function(po, i) {
      BOARD_CACHE[po.id] = po;
      var editable = isUpd ? IS_ADMIN : (IS_ADMIN || (po.email && String(po.email) === String(REQ.email)));
      h += '<tr class="__wpBdRow" data-i="' + i + '" style="cursor:pointer"><td style="color:#64748b">' + (posts.length - i) + '</td><td style="font-weight:600">' + esc(po.title) + '</td><td>' + esc(po.name) + '</td><td class="mono" style="color:#64748b">' + esc(po.ts) + '</td><td class="mono" style="color:#64748b;text-align:center" data-vc="' + esc(po.id) + '">' + (po.views || 0) + '</td></tr>';
      h += '<tr class="__wpBdBody" data-i="' + i + '" data-post="' + esc(po.id) + '" style="display:none"><td></td><td colspan="4" style="background:#F8FAFC;padding:12px"><div class="__wpBdText" data-i="' + i + '" style="white-space:pre-wrap;color:#334155;line-height:1.6">' + esc(po.body || '') + '</div>' + (editable ? '<div style="margin-top:8px;display:flex;gap:6px"><button class="wp-btn gh __wpBdEdit" data-id="' + esc(po.id) + '" style="padding:4px 11px;font-size:12px">수정</button><button class="wp-btn gh __wpBdDel" data-id="' + esc(po.id) + '" style="padding:4px 11px;font-size:12px;color:#b91c1c">삭제</button></div>' : '') + '<div style="margin-top:10px;border-top:1px solid #E2E8F0;padding-top:8px"><div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px">댓글</div><div class="__wpCmtList" data-post="' + esc(po.id) + '"></div><div style="display:flex;gap:6px;margin-top:6px"><input class="wp-inp __wpCmtIn" data-post="' + esc(po.id) + '" placeholder="댓글 입력" style="flex:1;height:32px"><button class="wp-btn ok __wpCmtBtn" data-post="' + esc(po.id) + '" style="height:32px">등록</button></div></div></td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
    [].forEach.call(el.querySelectorAll('.__wpBdRow'), function(row) {
      row.onclick = function() {
        var i = row.getAttribute('data-i');
        var bd = el.querySelector('.__wpBdBody[data-i="' + i + '"]');
        if (!bd) return;
        var show = (bd.style.display === 'none');
        bd.style.display = show ? 'table-row' : 'none';
        if (show && bd.getAttribute('data-loaded') !== '1') {
          bd.setAttribute('data-loaded', '1');
          var pid0 = bd.getAttribute('data-post');
          boardView(pid0).then(function(vc) { var vcell = el.querySelector('[data-vc="' + pid0 + '"]'); if (vcell) vcell.textContent = vc; }).catch(function() {});
          var cl = bd.querySelector('.__wpCmtList');
          cl.innerHTML = '<span style="color:#94a3b8;font-size:12px">불러오는 중…</span>';
          cmtList(bd.getAttribute('data-post')).then(function(cs) { renderCmts(cl, cs); }).catch(function() { cl.innerHTML = '<span style="color:#b00;font-size:12px">댓글 로드 실패</span>'; });
        }
      };
    });
    [].forEach.call(el.querySelectorAll('.__wpBdEdit'), function(b) {
      b.onclick = function(e) { e.stopPropagation(); boardWriteForm(type, BOARD_CACHE[b.getAttribute('data-id')]); try { document.getElementById('__wpBdWrap').scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} };
    });
    [].forEach.call(el.querySelectorAll('.__wpBdDel'), function(b) {
      b.onclick = function(e) { e.stopPropagation(); if (!confirm('이 글을 삭제할까요? 되돌릴 수 없습니다.')) return; b.disabled = true; boardDelete(b.getAttribute('data-id')).then(function() { toast('삭제되었습니다', '#0a7d47'); loadBoard(type); }).catch(function(e2) { b.disabled = false; alert(e2.message); }); };
    });
    [].forEach.call(el.querySelectorAll('.__wpCmtBtn'), function(b) {
      b.onclick = function(e) {
        e.stopPropagation();
        var pid = b.getAttribute('data-post');
        var inp = el.querySelector('.__wpCmtIn[data-post="' + pid + '"]');
        var v = inp.value.trim();
        if (!v) return;
        b.disabled = true;
        cmtAdd(pid, v).then(function() { inp.value = ''; b.disabled = false; var cl = el.querySelector('.__wpCmtList[data-post="' + pid + '"]'); cmtList(pid).then(function(cs) { renderCmts(cl, cs); }); }).catch(function(e2) { b.disabled = false; alert(e2.message); });
      };
    });
    [].forEach.call(el.querySelectorAll('.__wpCmtIn'), function(inp) {
      inp.onclick = function(e) { e.stopPropagation(); };
      inp.onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); var pid = inp.getAttribute('data-post'); el.querySelector('.__wpCmtBtn[data-post="' + pid + '"]').click(); } };
    });
  }
  function boardWriteForm(type, ep) {
    var wrap = document.getElementById('__wpBdWrap');
    wrap.innerHTML = '<div class="wp-form"><b style="font-size:14px">' + (ep ? '글 수정' : '새 글') + '</b><div class="wp-fld" style="margin-top:8px"><span>제목</span><input id="__wpBdTitle" class="wp-inp"></div><div style="margin:10px 0"><div style="color:#475569;font-size:13px;margin-bottom:4px">내용</div><textarea id="__wpBdBodyIn" class="wp-inp" style="width:100%;height:120px"></textarea></div><div style="display:flex;gap:8px"><button id="__wpBdSave" class="wp-btn ok">' + (ep ? '수정 저장' : '등록') + '</button><button id="__wpBdCancel" class="wp-btn gh">취소</button></div></div>';
    if (ep) { document.getElementById('__wpBdTitle').value = ep.title || ''; document.getElementById('__wpBdBodyIn').value = ep.body || ''; }
    document.getElementById('__wpBdCancel').onclick = function() { wrap.innerHTML = ''; };
    document.getElementById('__wpBdSave').onclick = function() {
      var t = document.getElementById('__wpBdTitle').value.trim(), b = document.getElementById('__wpBdBodyIn').value.trim();
      if (!t) { toast('제목을 입력하세요', '#c0392b'); return; }
      var sb = this; sb.disabled = true; sb.textContent = '저장 중…';
      var pr = ep ? boardEdit(ep.id, t, b) : boardAdd(type, t, b);
      pr.then(function() { toast(ep ? '수정되었습니다' : '등록되었습니다', '#0a7d47'); wrap.innerHTML = ''; loadBoard(type); }).catch(function(e) { sb.disabled = false; sb.textContent = ep ? '수정 저장' : '등록'; alert(e.message); });
    };
  }
    function openBulkForm(action, brs) {
    var spec = ACTIONS[action];
    if (!spec) return;
    var box = document.getElementById('__wpForm');
    var qr = document.getElementById('__wpQr');
    if (qr) qr.style.display = 'none';
    var meta = '<div class="wp-meta"><b>일괄 대상 ' + brs.length + '개 거래처</b><br><span style="color:#475569">' + brs.map(function(b){return esc(b.name);}).join(', ') + '</span><br><b>요청자</b> ' + esc(REQ.dept) + ' / ' + esc(REQ.name) + '</div>';
    var fh = (spec.fields || []).map(fieldHtml).join('');
    box.innerHTML = '<div class="wp-form"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">일괄 요청 · ' + esc(action) + '</b><button id="__wpBBack" class="wp-btn gh" style="padding:6px 12px">← 목록</button></div>' + meta + fh + '<div style="margin-top:12px;display:flex;gap:10px;align-items:center"><button id="__wpBSave" class="wp-btn ok">' + brs.length + '개 거래처에 일괄 제출</button><span id="__wpBProg" style="font-size:12.5px;color:#64748b"></span></div><div style="font-size:11.5px;color:#94a3b8;margin-top:6px">* 선택한 거래처 각각에 동일 내용으로 요청이 생성됩니다. (물류팀 승인 후 반영)</div></div>';
    document.getElementById('__wpBBack').onclick = function() { box.innerHTML = ''; if (qr) qr.style.display = 'block'; };
    (spec.fields || []).forEach(function(f) { if (f.type === 'days') bindDays(f.k); if (f.type === 'multi') bindMulti(f.k); if (f.type === 'addr') bindAddr(f.k); if (f.type === 'dates') bindDates(f.k); });
    document.getElementById('__wpBSave').onclick = function() {
      var self = this;
      var vals = {}, parts = [];
      (spec.fields || []).forEach(function(f) { var el = document.getElementById('__wpf_' + f.k); var v = el ? el.value.trim() : ''; vals[f.k] = v; if (v) parts.push(f.k + ': ' + v); });
      var cyc = vals['변경주기'] || '', day = vals['변경요일'] || '';
      var DRX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
      if (action === '배송주기변경') {
        if (!cyc) { toast('변경 주기를 선택하세요', '#c0392b'); return; }
        if (!/^(매일|수기일정생성|계획일정없음)$/.test(cyc) && day.split(',').filter(Boolean).length === 0) { toast('배송요일을 선택하세요', '#c0392b'); return; }
      }
      if (action === '배송일정생성' && !vals['배송일']) { toast('배송일을 1개 이상 추가하세요', '#c0392b'); return; }
      if (action === '배송일정삭제' && !vals['삭제일']) { toast('삭제할 배송일을 1개 이상 추가하세요', '#c0392b'); return; }
      if (action === '배송일정변경' && (!DRX.test(vals['기존배송일']) || !DRX.test(vals['변경배송일']))) { toast('기존/변경 배송일을 선택하세요', '#c0392b'); return; }
      if (action === '배송메모' && !vals['메모내용']) { toast('메모 내용을 입력하세요', '#c0392b'); return; }
      if (!confirm(brs.length + '개 거래처에 [' + action + '] 요청을 일괄 생성합니다. 진행할까요?')) return;
      if (!REQ.email) { alert('요청자 정보를 아직 못 불러왔어요. 잠시 후 다시 시도하세요.'); return; }
      self.disabled = true;
      var prog = document.getElementById('__wpBProg');
      var ok = 0, fail = 0, idx = 0;
      function detailFor(br) {
        if (action === '배송주기변경') {
          return getCurrentCycle(br.id).then(function(cur) { var pre = []; if (cur) { pre.push('기존주기: ' + (cur.cyc || '-')); pre.push('기존요일: ' + ((cur.days && cur.days.length) ? cur.days.map(function(x){x=String(x).trim();return /요일$/.test(x)?x:(/^[월화수목금토일]$/.test(x)?x+'요일':x);}).join(',') : '-')); } return pre.concat(parts).join(' · '); }).catch(function() { return parts.join(' · '); });
        }
        if (action === '배송메모') {
          return getForm(br.id).then(function(f) { var cur = getVal(f, 'parkingMemo') || ''; return '기존메모: ' + (cur || '(없음)') + ' · 변경메모: ' + vals['메모내용']; }).catch(function() { return '변경메모: ' + vals['메모내용']; });
        }
        return Promise.resolve(parts.join(' · '));
      }
      function step() {
        if (idx >= brs.length) {
          toast('일괄 제출 완료 · 성공 ' + ok + (fail ? (' · 실패 ' + fail) : ''), '#0a7d47');
          box.innerHTML = '<div class="wp-form"><b style="color:#0a7d47">완료 ' + ok + '건 제출' + (fail ? (' (실패 ' + fail + ')') : '') + '</b><div style="margin-top:10px"><button id="__wpBB2" class="wp-btn gh">← 목록으로</button></div></div>';
          document.getElementById('__wpBB2').onclick = function() { box.innerHTML = ''; if (qr) qr.style.display = 'block'; };
          return;
        }
        var br = brs[idx];
        prog.textContent = '제출 중… ' + (idx + 1) + '/' + brs.length + ' (' + br.name + ')';
        detailFor(br).then(function(detail) {
          return submitReq({ ts: now(), dept: REQ.dept, name: REQ.name, email: REQ.email, action: action, hot: br.hot, cold: br.cold, branchId: br.id, branchName: br.name, detail: detail });
        }).then(function() { ok++; }).catch(function() { fail++; }).then(function() { idx++; step(); });
      }
      step();
    };
  }
  function openForm(action, br, edit) {
    if (!br) return;
    if (MODE !== 'requester' && !(edit && (edit.adminEdit || edit.adminEditOnly))) {
      alert('요청 제출은 요청자용 모드에서 하세요.');
      return;
    }
    var spec = ACTIONS[action];
    var box = document.getElementById('__wpForm');
    document.getElementById('__wpQr').style.display = 'none';
    var meta = '<div class="wp-meta"><b>거래처</b> ' + esc(br.name) + ' · 점포코드 ' + esc(br.hot) + (br.cold ? '/' + esc(br.cold) : '') + ' · 담당코스 ' + esc(br.course || '-') + '<br><span style="color:#94a3b8">' + esc(br.addr || '') + '</span><br><b>요청자</b> ' + esc(REQ.dept) + ' / ' + esc(REQ.name) + ' (' + esc(REQ.email) + ')</div>';

    function shell(inner, saveLabel) {
      var lbl = IS_ADMIN ? '바로 반영' : '요청 제출';
      var note = IS_ADMIN ? '* 물류팀 계정이라 승인 없이 위펀 오피스에 바로 반영됩니다.' : '* 제출하면 물류팀 승인 후 위펀 오피스에 반영됩니다.';
      return '<div class="wp-form"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">' + esc(action) + '</b><button id="__wpBack" class="wp-btn gh" style="padding:6px 12px">← 목록</button></div>' + meta + inner + '<div style="margin-top:12px;display:flex;gap:8px;align-items:center"><button id="__wpSave" class="wp-btn ok">' + lbl + '</button></div><div style="font-size:11.5px;color:#94a3b8;margin-top:6px">' + note + '</div></div>';
    }

    function bind() {
      document.getElementById('__wpBack').onclick = function() {
        box.innerHTML = '';
        document.getElementById('__wpQr').style.display = 'block';
      };
      if (spec.deeplink) {
        var ob = document.getElementById('__wpOpen');
        if (ob) ob.onclick = function() {
          ob.disabled = true;
          var o = ob.textContent;
          ob.textContent = '여는 중…';
          openSchedule(br.id).then(function() {
            ob.disabled = false;
            ob.textContent = o;
          });
        };
      }
    }

    function successScreen(msg) {
      box.innerHTML = '<div class="wp-form"><b style="color:#0a7d47">' + msg + '</b><div style="margin-top:10px"><button id="__wpBack2" class="wp-btn gh">← 목록으로</button></div></div>';
      document.getElementById('__wpBack2').onclick = function() {
        box.innerHTML = '';
        document.getElementById('__wpQr').style.display = 'block';
      };
    }

    function doSubmit(detail) {
      var sb = document.getElementById('__wpSave');
      if (!REQ.email) {
        sb.disabled = true;
        sb.textContent = '요청자 확인 중…';
        ensureProfile().then(function() {
          if (!REQ.email) {
            sb.disabled = false;
            sb.textContent = (IS_ADMIN ? '바로 반영' : '요청 제출');
            alert('요청자 정보를 아직 불러오지 못했습니다. 로그인 상태 확인 후 다시 시도해주세요.');
            return;
          }
          applyAccess();
          doSubmit(detail);
        });
        return;
      }
      var o = {
        ts: now(),
        dept: REQ.dept,
        name: REQ.name,
        email: REQ.email,
        action: action,
        hot: br.hot,
        cold: br.cold,
        branchId: br.id,
        branchName: br.name,
        detail: detail
      };
      if (edit && edit.id) o.id = edit.id;
      if (edit && edit.adminEditOnly) {
        sb.disabled = true;
        sb.textContent = '저장 중…';
        editDetail(edit.id, o.detail, REQ.name).then(function() {
          toast('✓ 요청 내용 수정됨 (대기 유지)', '#0a7d47');
          if (typeof viewReview === 'function') { viewReview(); } else { successScreen('✓ 요청 내용이 수정됐습니다. 물류승인을 진행하세요.'); }
        }).catch(function(e) {
          sb.disabled = false;
          sb.textContent = (IS_ADMIN ? '바로 반영' : '요청 제출');
          alert('저장 실패: ' + (e && e.message || e));
        });
        return;
      }
      if (edit && edit.adminEdit) {
        if (!confirm('[' + action + '] 수정 후 승인 · 위펀 오피스 반영 — ' + (br.name || '') + ' 진행할까요?')) return;
        sb.disabled = true;
        sb.textContent = '반영 중…';
        runActionCore(o).then(function(note) {
          return editApprove(edit.id, o.detail, REQ.name, (note || '') + ' · 수정반영');
        }).then(function() {
          toast('✓ 수정 반영 완료', '#0a7d47');
          if (typeof viewReview === 'function') { try { viewReview(); } catch (ve) {} } else { successScreen('✓ 수정 후 승인 · 위펀 오피스에 반영됐습니다.'); }
        }).catch(function(e) {
          sb.textContent = '반영 확인 중…';
          afterWriteFail(e, edit.id, '✓ 수정 반영 완료 (응답 지연 → 서버에서 확인됨)', '반영 실패', function(msg) {
            toast(msg, '#0a7d47');
            if (typeof viewReview === 'function') { try { viewReview(); } catch (ve) {} } else { successScreen(msg); }
          }, function(msg) {
            sb.disabled = false;
            sb.textContent = (IS_ADMIN ? '바로 반영' : '요청 제출');
            alert(msg);
          });
        });
        return;
      }
      if (IS_ADMIN) {
        /* 물류팀 = 승인 없이 바로 반영 */
        if (action === '주소변경') {
          if (confirm('코스를 바꾸시겠습니까? (주소 변경으로 배송코스가 달라지면 새 코스를 입력하세요)')) {
            var nc = prompt('새 코스(우린배송담당)를 입력하세요.', br.course || '');
            if (nc !== null && nc.trim()) o._newCourse = nc.trim();
          }
        }
        if (!confirm('물류팀 계정이라 승인 없이 바로 반영합니다.\n[' + action + '] ' + br.name + '\n진행할까요?')) {
          return;
        }
        sb.disabled = true;
        sb.textContent = '반영 중…';
        runActionCore(o).then(function(note) {
          return submitReq(o).then(function(r) {
            if (r && r.id) return decideReq(r.id, '완료', (note || '') + ' · 직접반영', r && r.slackTs);
          }).catch(function() {});
        }).then(function() {
          toast('✓ 위펀 오피스에 바로 반영됐습니다', '#0a7d47');
          successScreen('✓ 위펀 오피스에 바로 반영됐습니다.');
        }).catch(function(e) {
          sb.disabled = false;
          sb.textContent = '바로 반영';
          alert('반영 실패: ' + (e && e.message || e));
        });
        return;
      }
      sb.disabled = true;
      sb.textContent = '제출 중…';
      submitReq(o).then(function() {
        toast('✓ ' + action + ' 요청이 제출됐습니다', '#0a7d47');
        successScreen('✓ 요청이 제출됐습니다. 관리자 승인 대기 중입니다.');
      }).catch(function(e) {
        sb.disabled = false;
        sb.textContent = '요청 제출';
        alert('제출 실패: ' + e.message);
      });
    }
    if (spec.memo) {
      box.innerHTML = shell('<div style="color:#94a3b8;padding:8px">기존 배송메모 불러오는 중…</div>', '요청 제출');
      bind();
      document.getElementById('__wpSave').disabled = true;
      getForm(br.id).then(function(form) {
        var cur = (form.querySelector('[name="parkingMemo"]') || {}).value || '';
        var inner = '<div style="margin:6px 0"><div style="color:#475569;font-size:13px;margin-bottom:4px">기존 메모 (참고)</div><div style="background:#fff;border:1px dashed #cbd5e1;border-radius:8px;padding:8px;font-size:12.5px;white-space:pre-wrap;color:#64748b;max-height:120px;overflow:auto">' + (esc(cur) || '<span style=\"color:#cbd5e1\">(비어 있음)</span>') + '</div></div><div style="margin:10px 0"><div style="color:#475569;font-size:13px;margin-bottom:4px">배송메모 (수정 후 제출 → 승인 시 반영)</div><textarea id="__wpf_메모내용" class="wp-inp" style="width:100%;height:130px;font-family:inherit"></textarea></div>';
        box.innerHTML = shell(inner, '요청 제출');
        bind();
        var _cur = cur, _prevNew = '';
        if (edit && edit.prefill != null) {
          var _pf = String(edit.prefill);
          if (_pf.indexOf('변경메모: ') > -1) { _prevNew = _pf.split('변경메모: ').pop(); var _gm = _pf.split(' · 변경메모: ')[0]; if (_gm.indexOf('기존메모: ') === 0) _cur = _gm.slice(6); } else { _prevNew = _pf; }
        }
        document.getElementById('__wpf_메모내용').value = (edit ? _prevNew : _cur);
        document.getElementById('__wpSave').onclick = function() {
          var _nv = document.getElementById('__wpf_메모내용').value;
          doSubmit('기존메모: ' + (_cur || '(없음)') + ' · 변경메모: ' + _nv);
        };
      }).catch(function(e) {
        box.innerHTML = shell('<div style="color:#b00;padding:8px">메모 불러오기 실패: ' + esc(e.message) + '</div>', '요청 제출');
        bind();
      });
      return;
    }
    if (spec.picking) {
      openPickingForm(br, meta, shell, bind, doSubmit, box);
      return;
    }
    var fh = (spec.fields || []).map(fieldHtml).join('');
    if (spec.d1) {
      fh = '<div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:9px;padding:9px 11px;font-size:12.5px;margin:2px 0 4px">ℹ️ 변경 내용은 <b>평일 기준 D+1(' + esc(workdayD1Str()) + ')</b>에 반영됩니다. (자회사 코드전달 일괄입력)</div>' + fh;
    }
    box.innerHTML = shell(fh, '요청 제출');
    bind();
    var _schedDates = [];
    if (/^배송일정/.test(action)) {
      var _sbx = document.createElement('div');
      _sbx.style.cssText = 'background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;font-size:12.5px;color:#475569;margin:2px 0 10px;box-shadow:0 1px 3px rgba(15,23,42,.06)';
      _sbx.textContent = '기존 배송일정 불러오는 중…';
      box.insertBefore(_sbx, box.firstChild);
      resolveSid(br.id, br.name).then(function(_ids) {
        if (!_ids.length) { _sbx.textContent = '기존 배송일정: (서비스 없음)'; return; }
        return getScheduleEvents(_ids[0]).then(function(_evs) {
          var _dl = _evs.map(function(e) { return e.deliveryDate; }).filter(function(v, i, a) { return a.indexOf(v) === i; }).sort();
          _schedDates = _dl;
          _sbx.innerHTML = '<div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:10px">📅 기존 배송일정 <span style="color:#0EA5E9">' + _dl.length + '건</span></div><div class="__wpCalHost"></div>';
          buildSchedCal(_sbx.querySelector('.__wpCalHost'), _dl);
        });
      }).catch(function() { _sbx.textContent = '기존 배송일정: 불러오기 실패'; });
    }
    (spec.fields || []).forEach(function(f) {
      if (f.type === 'days') bindDays(f.k);
      if (f.type === 'multi') bindMulti(f.k);
      if (f.type === 'addr') bindAddr(f.k);
      if (f.type === 'dates') bindDates(f.k);
      if (f.type === 'date') {
        var el = document.getElementById('__wpf_' + f.k);
        if (el) {
          if (f.min3) { el.min = firstDeliveryStr(); }
          var dowEl = document.getElementById('__wpf_' + f.k + '_dow');
          if (dowEl) {
            var upd = function() { dowEl.textContent = el.value ? ('(' + DOWK[new Date(el.value.slice(0,4), +el.value.slice(5,7) - 1, +el.value.slice(8,10)).getDay()] + ')') : ''; };
            el.addEventListener('change', upd);
            el.addEventListener('input', upd);
            upd();
          }
        }
      }
    });
    if (edit && edit.prefill) {
      var _pfm = {};
      String(edit.prefill).split(' · ').forEach(function(pp) { pp = pp.trim(); var ix = pp.indexOf(':'); if (ix < 0) return; _pfm[pp.slice(0, ix).trim()] = pp.slice(ix + 1).trim(); });
      (spec.fields || []).forEach(function(f) { var el = document.getElementById('__wpf_' + f.k); if (el && _pfm[f.k] != null && _pfm[f.k] !== '') el.value = _pfm[f.k]; });
    }
    if (action === '신규코드발급') {
      serviceInfo(br.id, br.name).then(function(si) {
        var be = document.getElementById('__wpf_월예산');
        if (be && si && si.budget) be.value = si.budget;
      }).catch(function() {});
    }
          (function() { var cs = document.getElementById('__wpf_변경주기') || document.getElementById('__wpf_요청주기'); var dk = document.getElementById('__wpf_변경요일') ? '변경요일' : (document.getElementById('__wpf_정기배송요일') ? '정기배송요일' : ''); if (!cs || !dk) return; var di = document.getElementById('__wpf_' + dk); var df = di ? di.closest('.wp-fld') : null; function sync() { var nd = /^(매일|수기일정생성|계획일정없음)$/.test(cs.value || ''); if (df) df.style.display = nd ? 'none' : ''; if (nd && di) di.value = ''; } cs.onchange = sync; sync(); })();
document.getElementById('__wpSave').onclick = function() {
      var self = this;
      var vals = {},
        parts = [];
      (spec.fields || []).forEach(function(f) {
        var el = document.getElementById('__wpf_' + f.k);
        var v = el ? el.value.trim() : '';
        vals[f.k] = v;
        if (v) parts.push(f.k + ': ' + v);
      });
      /* 필수값 검사 — 빈 채로 요청이 올라가면 물류팀이 되물어야 한다 */
      var miss = (spec.fields || []).filter(function(f) {
        if (!f.req) { return false; }
        /* reqIf: 지정한 항목이 채워진 경우에만 필수 (예: 설비가 있어야 설치일이 의미 있음) */
        if (f.reqIf) {
          var g = vals[f.reqIf] || '';
          if (!g || g === '없음') { return false; }
        }
        return !vals[f.k];
      }).map(function(f) { return f.label || f.k; });
      if (miss.length) {
        alert('빈 값을 확인하세요.\n\n다음 항목을 입력해주세요\n · ' + miss.join('\n · '));
        var _fe = document.getElementById('__wpf_' + (spec.fields || []).filter(function(f) { return (f.label || f.k) === miss[0]; })[0].k);
        if (_fe && _fe.focus) { try { _fe.focus(); } catch (_ff) {} }
        return;
      }
      var cycV = vals['변경주기'] || vals['요청주기'] || '',
        dayV = vals['변경요일'] || vals['정기배송요일'] || '';
      if (/^매월/.test(cycV) && dayV && dayV.split(',').filter(Boolean).length > 1) {
        toast('매월 주기는 배송요일을 1개만 선택하세요', '#c0392b');
        return;
      }
      if (cycV && !/^(매일|수기일정생성|계획일정없음)$/.test(cycV) && dayV.split(',').filter(Boolean).length === 0) {
        toast('배송요일을 선택하세요 (요일 미선택 시 반영 불가)', '#c0392b');
        return;
      }
      self.disabled = true;
      var o0 = self.textContent;
      self.textContent = '확인 중…';
      preValidate(action, br, vals).then(function(res) {
        if (!res.ok) {
          self.disabled = false;
          self.textContent = o0;
          if (res.alert) { alert(res.msg); } else { toast(res.msg, '#c0392b'); }
          return;
        }
        if (action === '배송주기변경') {
          return getCurrentCycle(br.id).then(function(cur) {
            var pre = [];
            if (cur) {
              pre.push('기존주기: ' + (cur.cyc || '-'));
              pre.push('기존요일: ' + (cur.days && cur.days.length ? cur.days.map(function(x){x=String(x).trim();return /요일$/.test(x)?x:(/^[월화수목금토일]$/.test(x)?x+'요일':x);}).join(',') : '-'));
            }
            doSubmit(pre.concat(parts).join(' · '));
          }).catch(function() {
            doSubmit(parts.join(' · '));
          });
        }
        if (action === '신규코드발급') {
          return getForm(br.id).then(function(f) {
            return { a1: (getVal(f, 'address1') || '').trim() || (br.addr || ''), a2: (getVal(f, 'address2') || '').trim() };
          }).catch(function() {
            return { a1: (br.addr || ''), a2: '' };
          }).then(function(ad) {
            var pre = ['작성일: ' + now().slice(0, 10), '주소: ' + ad.a1];
            if (ad.a2) pre.push('상세주소: ' + ad.a2);
            doSubmit(pre.concat(parts).join(' · '));
          });
        }
        if (spec.passthru) {
          var preP = ['반영예정일: ' + workdayD1Str()];
          if (action === '주소변경' || action === '코스변경') preP.push('기존코스: ' + (br.course || '-'));
          if (action === '주소변경') {
            return getForm(br.id).then(function(f) {
              var a1 = (getVal(f, 'address1') || '').trim() || (br.addr || '-');
              var a2 = (getVal(f, 'address2') || '').trim();
              preP.push('기존주소: ' + a1);
              if (a2) preP.push('기존상세주소: ' + a2);
              doSubmit(preP.concat(parts).join(' · '));
            }).catch(function() {
              preP.push('기존주소: ' + (br.addr || '-'));
              doSubmit(preP.concat(parts).join(' · '));
            });
          }
          if (spec.svc) {
            return serviceInfo(br.id, br.name).then(function(si) {
              if (si) preP.push('서비스구분: ' + (si.serviceType || '-'));
              doSubmit(preP.concat(parts).join(' · '));
            }).catch(function() {
              doSubmit(preP.concat(parts).join(' · '));
            });
          }
          doSubmit(preP.concat(parts).join(' · '));
          return;
        }
        doSubmit(parts.join(' · '));
      }).catch(function(e) {
        self.disabled = false;
        self.textContent = o0;
        alert('확인 실패: ' + e.message);
      });
    };
  } /* ---------- 수기피킹 폼 (품목 라인 + 오피스 상품검색 자동채움) ---------- */
  function pkComma(n) {
    n = Math.round(Number(n) || 0);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function openPickingForm(br, meta, shell, bind, doSubmit, box) {
    var inner = '' +
      '<div style="background:#eef4fb;border:1px solid #cfe0f3;border-radius:9px;padding:9px 11px;font-size:12.5px;margin:2px 0 8px;color:#334155">수기피킹 요청 — 품목명 검색으로 바코드·용량·출고기준·주문단위 자동 입력. 엑셀 업로드도 가능 (양식 다운로드 참고). 단가·수량은 직접 입력.</div>' +
      '<div class="wp-fld"><span>배송일</span><input id="__wpPkDate" class="wp-inp" type="date"></div>' +
      '<div class="wp-fld"><span>수기피킹 구분</span><select id="__wpPkType" class="wp-inp"><option>기본</option><option>유통기한 임박</option></select></div>' +
      '<div class="wp-fld"><span>비고</span><input id="__wpPkBigo" class="wp-inp" placeholder="요청 전체 비고 (선택)"></div>' +
      '<div id="__wpPkNote" style="display:none;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:8px;padding:7px 10px;font-size:11.5px;margin:6px 0"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 4px;flex-wrap:wrap;gap:5px"><b style="font-size:13px">품목</b><span style="display:flex;gap:5px;flex-wrap:wrap"><button id="__wpPkTpl" type="button" class="wp-btn gh" style="padding:5px 10px">양식</button><button id="__wpPkUp" type="button" class="wp-btn gh" style="padding:5px 10px">엑셀 업로드</button><button id="__wpPkAdd" type="button" class="wp-btn gh" style="padding:5px 11px">+ 품목 추가</button></span></div>' +
      '<input id="__wpPkFile" type="file" accept=".xlsx,.xls" style="display:none">' +
      '<div id="__wpPkItems"></div>' +
      '<div style="text-align:right;font-size:13px;margin-top:6px">총 합계금액 <b id="__wpPkTotal" style="color:#0a7d47">0</b> 원 · <span id="__wpPkCnt">0</span>건</div>';
    box.innerHTML = shell(inner, '요청 제출');
    bind();
    var itemsBox = document.getElementById('__wpPkItems');
    var dateEl = document.getElementById('__wpPkDate');
    dateEl.min = now().slice(0, 10);
    var typeEl = document.getElementById('__wpPkType');
    var noteEl = document.getElementById('__wpPkNote');
    typeEl.onchange = function() {
      if (typeEl.value === '유통기한 임박') {
        noteEl.style.display = 'block';
        noteEl.textContent = '※ 유통기한 임박 상품은 기존 배송일정에 맞춰서만 배송 가능합니다. (배송일이 아니면 별도 전달 요망)';
      } else {
        noteEl.style.display = 'none';
      }
    };

    function recalc() {
      var total = 0,
        cnt = 0;
      [].forEach.call(itemsBox.querySelectorAll('.pk-item'), function(card) {
        var price = Number((card.querySelector('.pk-price').value || '').replace(/[^\d.]/g, '')) || 0;
        var inbox = Number((card.querySelector('.pk-inbox').value || '').replace(/[^\d.]/g, '')) || 0;
        var boxes = Number((card.querySelector('.pk-boxes').value || '').replace(/[^\d.]/g, '')) || 0;
        var ea = (inbox > 0 ? inbox : 1) * boxes;
        var sum = price * ea;
        card.querySelector('.pk-ea').textContent = pkComma(ea);
        card.querySelector('.pk-sum').textContent = pkComma(sum);
        if (card.getAttribute('data-code') || card.getAttribute('data-barcode')) cnt++;
        total += sum;
      });
      document.getElementById('__wpPkTotal').textContent = pkComma(total);
      document.getElementById('__wpPkCnt').textContent = cnt;
    }

    function addItem(pre) {
      var card = document.createElement('div');
      card.className = 'pk-item';
      card.style.cssText = 'border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-bottom:8px;background:#fff';
      card.innerHTML = '' +
        '<div style="display:flex;gap:6px;align-items:center"><input class="pk-name wp-inp" placeholder="품목명 검색 후 Enter/검색" style="flex:1"><button type="button" class="pk-search wp-btn gh" style="padding:6px 10px">검색</button><button type="button" class="pk-del wp-btn gh" style="padding:6px 10px;border-color:#c0392b;color:#c0392b">삭제</button></div>' +
        '<div class="pk-dd" style="display:none;border:1px solid #cbd5e1;border-radius:8px;margin-top:4px;max-height:190px;overflow:auto;background:#fff"></div>' +
        '<div class="pk-meta" style="font-size:11.5px;color:#94a3b8;margin:6px 0">품목 미선택</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">' +
        '<label style="font-size:11.5px;color:#475569">단가<br><input class="pk-price wp-inp" type="number" min="0" style="width:90px"></label>' +
        '<label style="font-size:11.5px;color:#475569">입수수량<br><input class="pk-inbox wp-inp" type="number" min="0" style="width:80px"></label>' +
        '<label style="font-size:11.5px;color:#475569">박스수량<br><input class="pk-boxes wp-inp" type="number" min="0" style="width:80px"></label>' +
        '<span style="font-size:11.5px;color:#475569">주문수량(EA)<br><b class="pk-ea" style="font-size:14px;color:#1f4e78">0</b></span>' +
        '<span style="font-size:11.5px;color:#475569">합계<br><b class="pk-sum" style="font-size:14px;color:#0a7d47">0</b></span>' +
        '</div>';
      itemsBox.appendChild(card);
      var nameEl = card.querySelector('.pk-name');
      var ddEl = card.querySelector('.pk-dd');
      var metaEl = card.querySelector('.pk-meta');
      if (pre) {
        card.setAttribute('data-code', pre.code || '');
        card.setAttribute('data-barcode', pre.barcode || '');
        card.setAttribute('data-storage', pre.storage || '');
        card.setAttribute('data-volume', pre.volume || '');
        card.setAttribute('data-moq', pre.moq || '');
        card.setAttribute('data-name', pre.name || '');
        nameEl.value = pre.name || '';
        if (pre.price) card.querySelector('.pk-price').value = pre.price;
        if (pre.inbox) card.querySelector('.pk-inbox').value = pre.inbox;
        if (pre.boxes) card.querySelector('.pk-boxes').value = pre.boxes;
        metaEl.innerHTML = '✔ <b style="color:#334155">' + esc(pre.name || '') + '</b> · 바코드 ' + esc(pre.barcode || '') + ' · ' + esc(pre.storage || '') + ' · ' + esc(pre.volume || '') + (pre.moq ? ' · 주문단위 ' + esc(pre.moq) : '');
        metaEl.style.color = '#0a7d47';
      }

      function doSearch() {
        var kw = (nameEl.value || '').trim();
        if (kw.length < 1) {
          return;
        }
        ddEl.style.display = 'block';
        ddEl.innerHTML = '<div style="padding:8px;color:#94a3b8;font-size:12px">검색 중…</div>';
        searchItems(kw).then(function(list) {
          if (!list.length) {
            ddEl.innerHTML = '<div style="padding:8px;color:#b00;font-size:12px">결과 없음</div>';
            return;
          }
          ddEl.innerHTML = list.slice(0, 20).map(function(it, idx) {
            return '<button type="button" class="pk-opt" data-i="' + idx + '" style="display:block;width:100%;text-align:left;border:none;border-bottom:1px solid #f1f5f9;background:none;padding:7px 9px;font-size:12px;cursor:pointer">' + esc(it.name) + ' <span style="color:#94a3b8">· ' + esc(it.volume) + ' · ' + esc(it.storage) + ' · 주문단위 ' + esc(it.orderUnit) + ' · 바코드 ' + esc(it.barcode) + '</span></button>';
          }).join('');
          [].forEach.call(ddEl.querySelectorAll('.pk-opt'), function(b) {
            b.onmouseover = function() {
              b.style.background = '#eef4fb';
            };
            b.onmouseout = function() {
              b.style.background = 'none';
            };
            b.onclick = function() {
              var it = list[Number(b.getAttribute('data-i'))];
              card.setAttribute('data-code', it.code || '');
              card.setAttribute('data-barcode', it.barcode || '');
              card.setAttribute('data-storage', it.storage || '');
              card.setAttribute('data-volume', it.volume || '');
              card.setAttribute('data-moq', it.orderUnit || '');
              card.setAttribute('data-name', it.name || '');
              nameEl.value = it.name || '';
              metaEl.innerHTML = '✔ <b style="color:#334155">' + esc(it.name) + '</b> · 바코드 ' + esc(it.barcode) + ' · ' + esc(it.storage) + ' · ' + esc(it.volume) + ' · 주문단위 ' + esc(it.orderUnit) + (it.price ? ' · 판매가 ' + esc(it.price) : '');
              metaEl.style.color = '#0a7d47';
              if (it.price && !card.querySelector('.pk-price').value) card.querySelector('.pk-price').value = String(it.price).replace(/[^\d]/g, '');
              ddEl.style.display = 'none';
              recalc();
            };
          });
        }).catch(function(e) {
          ddEl.innerHTML = '<div style="padding:8px;color:#b00;font-size:12px">검색 실패: ' + esc(e.message) + '</div>';
        });
      }
      card.querySelector('.pk-search').onclick = doSearch;
      nameEl.onkeydown = function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSearch();
        }
      };
      nameEl.oninput = function() {
        card.removeAttribute('data-code');
        card.removeAttribute('data-barcode');
        metaEl.textContent = '품목 미선택';
        metaEl.style.color = '#94a3b8';
      };
      card.querySelector('.pk-del').onclick = function() {
        card.remove();
        recalc();
      };
      [].forEach.call(card.querySelectorAll('.pk-price,.pk-inbox,.pk-boxes'), function(i) {
        i.oninput = recalc;
      });
      recalc();
    }
    document.getElementById('__wpPkAdd').onclick = function() {
      addItem();
    };
    document.getElementById('__wpPkTpl').onclick = function() {
      downloadPickingTemplate();
    };
    document.getElementById('__wpPkFile').onchange = function() {
      var f = this.files[0];
      if (!f) return;
      var self = this;
      ensureXLSX().then(function() {
        return f.arrayBuffer();
      }).then(function(buf) {
        var wb = XLSX.read(buf, {
          type: 'array'
        });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var arr = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: ''
        });
        // 헤더 행 위치 찾기 (바코드/품목명 포함)
        var hi = -1;
        for (var i = 0; i < arr.length; i++) {
          var joined = arr[i].map(function(x) {
            return String(x).replace(/\s+/g, '');
          }).join('|');
          if (joined.indexOf('바코드') > -1 && joined.indexOf('품목명') > -1) {
            hi = i;
            break;
          }
        }
        if (hi < 0) {
          toast('헤더(바코드·품목명)를 찾지 못했습니다', '#c0392b');
          return;
        }
        var H = arr[hi].map(function(x) {
          return String(x).replace(/\s+/g, '');
        });

        function col(name) {
          return H.indexOf(name);
        }
        var ci = {
          barcode: col('바코드'),
          name: col('품목명'),
          storage: col('출고기준'),
          volume: col('용량'),
          price: col('단가'),
          inbox: col('입수박스'),
          boxes: col('박스수량'),
          moq: col('주문단위')
        };
        // 기존 빈 카드 제거
        [].forEach.call(itemsBox.querySelectorAll('.pk-item'), function(c) {
          if (!c.getAttribute('data-barcode') && !c.getAttribute('data-code') && !(c.querySelector('.pk-name').value || '').trim()) c.remove();
        });
        var added = 0;
        for (var r = hi + 1; r < arr.length; r++) {
          var row = arr[r];
          function g(k) {
            return ci[k] > -1 ? String(row[ci[k]] == null ? '' : row[ci[k]]).trim() : '';
          }
          var bc = g('barcode'),
            nm = g('name');
          if (!bc && !nm) continue;
          addItem({
            barcode: bc,
            name: nm,
            storage: g('storage'),
            volume: g('volume'),
            moq: g('moq'),
            price: g('price').replace(/[^\d.]/g, ''),
            inbox: g('inbox').replace(/[^\d.]/g, ''),
            boxes: g('boxes').replace(/[^\d.]/g, '')
          });
          added++;
        }
        recalc();
        toast('✓ ' + added + '개 품목 업로드됨', '#0a7d47');
        self.value = '';
      }).catch(function(e) {
        toast('업로드 실패: ' + (e && e.message || e), '#c0392b');
        self.value = '';
      });
    };
    document.getElementById('__wpPkUp').onclick = function() {
      document.getElementById('__wpPkFile').click();
    };
    addItem();
    document.getElementById('__wpSave').onclick = function() {
      var date = dateEl.value;
      if (!date) {
        toast('배송일을 선택하세요', '#c0392b');
        return;
      }
      var cards = [].slice.call(itemsBox.querySelectorAll('.pk-item'));
      var lines = [],
        total = 0,
        bad = 0;
      cards.forEach(function(card) {
        var name = card.getAttribute('data-name') || (card.querySelector('.pk-name').value || '').trim();
        var barcode = card.getAttribute('data-barcode') || '';
        if (!card.getAttribute('data-code') && !barcode) {
          bad++;
          return;
        }
        var storage = card.getAttribute('data-storage') || '';
        var volume = card.getAttribute('data-volume') || '';
        var moq = card.getAttribute('data-moq') || '';
        var price = Number((card.querySelector('.pk-price').value || '').replace(/[^\d.]/g, '')) || 0;
        var inbox = Number((card.querySelector('.pk-inbox').value || '').replace(/[^\d.]/g, '')) || 0;
        var boxes = Number((card.querySelector('.pk-boxes').value || '').replace(/[^\d.]/g, '')) || 0;
        var ea = (inbox > 0 ? inbox : 1) * boxes;
        var sum = price * ea;
        total += sum;
        lines.push('▸ ' + name + ' | 바코드 ' + barcode + ' | ' + storage + ' | ' + volume + ' | 단가 ' + pkComma(price) + '원 | 입수 ' + (inbox || '-') + ' | 박스 ' + (boxes || '-') + ' | 주문 ' + pkComma(ea) + 'EA | 합계 ' + pkComma(sum) + '원 | 주문단위 ' + (moq || '-'));
      });
      if (!lines.length) {
        toast(bad ? '품목을 검색해서 선택하세요' : '품목을 1개 이상 추가하세요', '#c0392b');
        return;
      }
      var bigo = (document.getElementById('__wpPkBigo').value || '').trim();
      var head = ['배송일: ' + date, '피킹구분: ' + typeEl.value, '품목수: ' + lines.length + '건', '합계금액: ' + pkComma(total) + '원'];
      if (bigo) head.push('비고: ' + bigo);
      var detail = head.join('\n') + '\n' + lines.join('\n');
      doSubmit(detail);
    };
  } /* 요청자 단계 사전검증: 실시간 스케줄로 이미있음/없음 판정 → 잘못된 요청은 제출 차단(관리자 미전달) */
  /* 배송일정 생성기간 안내문 — 생성기간은 계약기본정보라 물류가 수정 못 함 */
  function windowMsg(w, extra) {
    return (extra ? extra + '\n\n' : '') +
      '이 거래처의 배송일정 생성기간이 ' + w.expire + ' 까지입니다. (최초계약일 ' + w.contract + ' + ' + w.period + '개월)\n\n' +
      '생성기간은 계약기본정보라 물류팀에서 수정할 수 없습니다.\n' +
      '영업팀에 [배송일정 생성기간] 연장을 먼저 요청하신 후 다시 접수해주세요.';
  }
  function preValidate(action, br, vals) {
    if (/조식/.test(String(br.name || ''))) return Promise.resolve({ ok: true });
    if (action === '배송시간문의') return Promise.resolve({ ok: true });
    if (action !== '배송일정생성' && action !== '배송일정삭제' && action !== '배송일정변경' && action !== '배송주기변경') return Promise.resolve({
      ok: true
    });
    return resolveSid(br.id, br.name).then(function(ids) {
      if (!ids.length) return {
        ok: false,
        msg: '이 거래처에 스낵24 서비스가 없습니다. (거래처명·서비스 상태 확인 필요)'
      };
      /* 배송주기변경: 생성기간 만료면 재생성 자체가 불가 → 접수 차단 */
      if (action === '배송주기변경') {
        return schedWindow(ids[0]).then(function(w) {
          if (w && w.expire <= todayStr()) {
            return { ok: false, alert: true, msg: windowMsg(w, '⛔ 배송주기변경 접수 불가 — 배송일정 생성기간 만료') };
          }
          return { ok: true };
        });
      }
      /* 배송일정생성/변경: 요청 날짜가 생성기간 밖이면 접수 차단 */
      var gateDates = [];
      if (action === '배송일정생성') gateDates = String(vals['배송일'] || '').split(',').filter(Boolean);
      if (action === '배송일정변경' && vals['변경배송일']) gateDates = [vals['변경배송일']];
      var winP = gateDates.length ? schedWindow(ids[0]) : Promise.resolve(null);
      return winP.then(function(w) {
        if (w) {
          var over = gateDates.filter(function(x) { return x > w.expire; });
          if (over.length) {
            return { ok: false, alert: true, msg: windowMsg(w, '⛔ 접수 불가 — 요청하신 배송일(' + over.join(', ') + ')이 배송일정 생성기간 이후입니다') };
          }
        }
        return preValidateEvents(action, ids[0], vals);
      });
    });
  }
  function preValidateEvents(action, sid0, vals) {
    return getScheduleEvents(sid0).then(function(evs) {
        var set = {};
        evs.forEach(function(e) {
          set[e.deliveryDate] = 1;
        });
        if (action === '배송일정생성') {
          var ds = String(vals['배송일'] || '').split(',').filter(Boolean);
          if (!ds.length) return { ok: false, msg: '배송일을 1개 이상 추가하세요.' };
          var dup = ds.filter(function(x) { return set[x]; });
          if (dup.length) return { ok: false, msg: dup.join(', ') + ' 에 이미 배송일정이 있습니다 (생성 불필요)' };
        }
        if (action === '배송일정삭제') {
          var xs = String(vals['삭제일'] || '').split(',').filter(Boolean);
          if (!xs.length) return { ok: false, msg: '삭제할 배송일을 1개 이상 추가하세요.' };
          var miss = xs.filter(function(x) { return !set[x]; });
          if (miss.length) return { ok: false, msg: miss.join(', ') + ' 에 배송일정이 없습니다 (삭제 불가)' };
        }
        if (action === '배송일정변경') {
          var od = vals['기존배송일'],
            nd = vals['변경배송일'];
          if (!/^\d{4}-\d{2}-\d{2}$/.test(od) || !/^\d{4}-\d{2}-\d{2}$/.test(nd)) return {
            ok: false,
            msg: '기존/변경 배송일을 선택하세요.'
          };
          if (!set[od]) return {
            ok: false,
            msg: '기존 배송일(' + od + ')에 일정이 없습니다'
          };
          if (set[nd]) return {
            ok: false,
            msg: '변경할 날짜(' + nd + ')에 이미 배송일정이 있습니다'
          };
          if (od === nd) return {
            ok: false,
            msg: '기존 날짜와 변경 날짜가 같습니다'
          };
        }
        return {
          ok: true
        };
      });
  } /* ---------- 기간 필터 · 엑셀 공통 ---------- */
  function todayStr() {
    return now().slice(0, 10);
  }

  function filterByDate(items, from, to) {
    return items.filter(function(it) {
      var d = String(it.ts || '').slice(0, 10);
      return (!from || d >= from) && (!to || d <= to);
    });
  }

  function drBar(fromId, toId, goId, csvId) {
    if (!window.__wpQBound) {
      window.__wpQBound = true;
      document.addEventListener('click', function(e) {
        var b = (e.target && e.target.closest) ? e.target.closest('[data-wpq]') : null;
        if (!b) return;
        var days = parseInt(b.getAttribute('data-wpq'), 10) || 0;
        var d = new Date(); d.setDate(d.getDate() + days);
        var sv = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        var f = document.getElementById(b.getAttribute('data-f')), t = document.getElementById(b.getAttribute('data-t')), g = document.getElementById(b.getAttribute('data-g'));
        if (f) f.value = sv;
        if (t) t.value = sv;
        if (g) g.click();
      }, true);
    }
    return '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input type="date" id="' + fromId + '" class="wp-inp" style="min-height:38px;padding:7px 9px"><span style="color:#94a3b8">~</span><input type="date" id="' + toId + '" class="wp-inp" style="min-height:38px;padding:7px 9px"><button id="' + goId + '" class="wp-btn pri" style="padding:7px 13px">조회</button><button class="wp-btn gh" style="padding:7px 11px" data-wpq="-1" data-f="' + fromId + '" data-t="' + toId + '" data-g="' + goId + '">전일</button><button class="wp-btn gh" style="padding:7px 11px" data-wpq="0" data-f="' + fromId + '" data-t="' + toId + '" data-g="' + goId + '">오늘</button><button id="' + csvId + '" class="wp-btn gh" style="padding:7px 13px">⬇ 엑셀</button></div>';
  }

  function reqCsv(items, fname) {
    function parseDetail(d) {
      var map = {}, order = [];
      String(d || '').split(' · ').forEach(function(p) {
        p = p.trim(); if (!p) return;
        var idx = p.indexOf(':'); if (idx < 0) return;
        var k = p.slice(0, idx).trim(), v = p.slice(idx + 1).trim();
        if (!(k in map)) order.push(k);
        map[k] = v;
      });
      return { map: map, order: order };
    }
    var keys = [], seen = {};
    var parsed = items.map(function(it) {
      var pd = parseDetail(it.detail);
      pd.order.forEach(function(k) { if (!seen[k]) { seen[k] = 1; keys.push(k); } });
      return pd;
    });
    var head = ['요청일시', '부서', '요청자', '이메일', '작업', '점포코드(상온)', '점포코드(저온)', '거래처명'].concat(keys).concat(['상태', '처리자', '처리메모', '처리일시']);
    var rows = [head].concat(items.map(function(it, i) {
      var m = parsed[i].map;
      return [it.ts, it.dept, it.name, it.email, it.action, it.hot, it.cold, it.branchName].concat(keys.map(function(k) { return m[k] == null ? '' : m[k]; })).concat([it.status, it.admin, it.adminNote, it.decidedTs]);
    }));
    var csv = '﻿' + rows.map(function(r) {
      return r.map(function(c) {
        var s = String(c == null ? '' : c).replace(/"/g, '""');
        return /[",\n]/.test(s) ? '"' + s + '"' : s;
      }).join(',');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    }));
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } /* ---------- 내 요청 상태(요청자) ---------- */
  var NC_DR = { from: '', to: '' };
  var NC_STATUS = '완료';
  function ncFromDefault() {
    var d = new Date();
    d.setDate(d.getDate() - 90);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function runNcFind() {
    var q = document.getElementById('__wpNcQ').value.trim();
    var box = document.getElementById('__wpQr');
    document.getElementById('__wpForm').innerHTML = '';
    if (!q) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.innerHTML = '<div style="color:#94a3b8;padding:10px">검색 중…</div>';
    searchRich(q, true).then(function(list) {
      FOUND = {};
      list.forEach(function(r) { FOUND[r.id] = r; });
      if (!list.length) { box.innerHTML = '<div style="color:#b00;padding:10px">결과 없음</div>'; return; }
      var h = '<table class="wp-tbl"><thead><tr>' + ['점포코드', '거래처명', '담당코스', '배송', '주소', '발급'].map(function(x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>';
      list.forEach(function(r) {
        var code = esc(r.hot) + (r.cold ? '<span style="color:#94a3b8"> / ' + esc(r.cold) + '</span>' : '');
        h += '<tr><td style="font-weight:700;white-space:nowrap">' + (code || '<span style="color:#cbd5e1">-</span>') + '</td><td style="min-width:180px">' + esc(r.name) + '</td><td style="white-space:nowrap">' + esc(r.course || '-') + '</td><td style="white-space:nowrap">' + esc(r.method || '-') + '</td><td style="color:#64748b;line-height:1.4">' + esc(r.addr || '-') + '</td><td style="white-space:nowrap;text-align:right"><button class="wp-ncbtn" data-id="' + r.id + '">＋ 신규코드 발급요청</button></td></tr>';
      });
      h += '</tbody></table>';
      box.innerHTML = h;
      [].forEach.call(box.querySelectorAll('.wp-ncbtn'), function(b) {
        b.onclick = function(e) { e.stopPropagation(); openForm('신규코드발급', FOUND[b.getAttribute('data-id')]); };
      });
    }).catch(function(e) {
      box.innerHTML = '<div style="color:#b00;padding:10px">오류: ' + esc(e.message) + '</div>';
    });
  }
  function viewNewCode() {
    var isReq = (MODE === 'requester');
    if (!NC_DR.from) { NC_DR.to = todayStr(); NC_DR.from = ncFromDefault(); }
    VIEW.innerHTML = (isReq ? '<div style="display:flex;gap:8px;margin-bottom:12px"><input id="__wpNcQ" class="wp-inp" placeholder="신규코드 발급할 거래처: 점포코드 또는 거래처명 입력 후 Enter" style="flex:1"><button id="__wpNcQb" class="wp-btn pri">검색</button></div><div id="__wpQr" class="wp-scroll" style="display:none"></div><div id="__wpForm" style="margin-bottom:14px"></div>' : '') + '<div style="display:flex;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:10px"><div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap"><b style="font-size:14px">신규코드 발급 이력</b><span style="color:#cbd5e1;margin:0 5px">|</span>' + ['대기','완료','반려','전체'].map(function(f){return '<button class="wp-btn ' + (f===NC_STATUS?'pri':'gh') + ' __wpNcFt" data-f="' + f + '" style="padding:0 12px">' + f + '</button>';}).join('') + '</div>' + drBar('__wpNcF', '__wpNcT', '__wpNcGo', '__wpNcCsv') + '</div><div id="__wpNcList" class="wp-scroll">불러오는 중…</div>';
    if (isReq) {
      document.getElementById('__wpNcQb').onclick = runNcFind;
      document.getElementById('__wpNcQ').addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); runNcFind(); } });
    }
    document.getElementById('__wpNcF').value = NC_DR.from;
    document.getElementById('__wpNcT').value = NC_DR.to;
    [].forEach.call(VIEW.querySelectorAll('.__wpNcFt'), function(b) { b.onclick = function() { NC_STATUS = b.getAttribute('data-f'); viewNewCode(); }; });
    var cache = [];
    function load() {
      NC_DR.from = document.getElementById('__wpNcF').value;
      NC_DR.to = document.getElementById('__wpNcT').value;
      listReqSWR('__wpNcList', { from: NC_DR.from, to: NC_DR.to }, function(items) {
        var only = items.filter(function(it) { return String(it.action) === '신규코드발급'; });
        cache = filterByDate(only, NC_DR.from, NC_DR.to);
        if (NC_STATUS !== '전체') cache = cache.filter(function(it) { return String(it.status) === NC_STATUS; });
        renderReqTable('__wpNcList', cache, false, { custNotice: true });
      }).catch(function(e) {
        document.getElementById('__wpNcList').innerHTML = '<div style="color:#b00;padding:10px">' + esc(e.message) + '</div>';
      });
    }
    document.getElementById('__wpNcGo').onclick = load;
    document.getElementById('__wpNcCsv').onclick = function() { ncXlsx(cache); };
    load();
  }
  var MINE_DR = {
    from: '',
    to: ''
  };

  function viewMine() {
    try {
      localStorage.setItem('__wpSeen', now());
    } catch (e) {}
    if (!MINE_DR.from) {
      MINE_DR.from = todayStr();
      MINE_DR.to = todayStr();
    }
    VIEW.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px"><b style="font-size:14px">내 요청 상태</b>' + drBar('__wpMF', '__wpMT', '__wpMGo', '__wpMCsv') + '</div><div id="__wpMineList" class="wp-scroll">불러오는 중…</div>';
    document.getElementById('__wpMF').value = MINE_DR.from;
    document.getElementById('__wpMT').value = MINE_DR.to;
    var cache = [];

    function load() {
      MINE_DR.from = document.getElementById('__wpMF').value;
      MINE_DR.to = document.getElementById('__wpMT').value;
      listReqSWR('__wpMineList', {
        email: REQ.email,
        from: MINE_DR.from,
        to: MINE_DR.to
      }, function(items) {
        cache = filterByDate(items, MINE_DR.from, MINE_DR.to);
        renderReqTable('__wpMineList', cache, false);
        /* 내가 넣은 대기 건은 기간 밖이어도 항상 위에 붙인다 — 어제 요청이 안 보여서
           처리된 줄 알고 넘어가는 것 방지. 실패해도 기간 결과는 이미 그려져 있다. */
        listReq({ email: REQ.email, status: '대기' }).then(function(pend) {
          if (!pend || !pend.length) { return; }
          var seen = {}, merged = [];
          pend.concat(cache).forEach(function(it) {
            if (!seen[it.id]) { seen[it.id] = 1; merged.push(it); }
          });
          if (merged.length === cache.length) { return; }   /* 새로 붙을 게 없으면 다시 안 그린다 */
          merged.sort(function(a, b) { return String(b.ts || '').localeCompare(String(a.ts || '')); });
          cache = merged;
          renderReqTable('__wpMineList', cache, false);
        }).catch(function() {});
      }).catch(function(e) {
        document.getElementById('__wpMineList').innerHTML = '<div style="color:#b00;padding:10px">' + esc(e.message) + '</div>';
      });
    }
    document.getElementById('__wpMGo').onclick = load;
    document.getElementById('__wpMCsv').onclick = function() {
      reqCsv(cache, '내요청_' + MINE_DR.from + '~' + MINE_DR.to + '.csv');
    };
    load();
  } /* ---------- 요청 검토/처리 내역(관리자) ---------- */
  var REV_STATUS = '대기',
    REV_ACTION = '전체',
    REV_DR = {
      from: '',
      to: ''
    };
  var REV_GROUP = 'deliv';
  var REV_GROUPS = {
    deliv: ['배송주기변경', '배송일정생성', '배송일정변경', '배송일정삭제', '배송메모', '배송시간문의'],
    syn: ['신규코드발급', '주소변경', '거래처명변경', '담당자변경', '코스변경'],
    pick: ['수기피킹']
  };

  function viewReview(group) {
    if (group) { REV_GROUP = group; REV_ACTION = '전체'; }
    group = REV_GROUP || 'deliv';
    var GACTS = REV_GROUPS[group] || REV_GROUPS.deliv;
    if (!REV_DR.from) {
      REV_DR.from = todayStr();
      REV_DR.to = todayStr();
    }
    /* 미전달 = 승인 완료됐는데 아직 코드전달 엑셀에 안 담긴 건. 시너지(코드전달) 그룹에서만 의미 있음 */
    var PENDOK = (group === 'syn' || group === 'pick');   /* 미전달 큐를 쓰는 그룹 */
    if (REV_STATUS === '미전달' && !PENDOK) { REV_STATUS = '대기'; }
    var PEND = (REV_STATUS === '미전달');
    /* 미처리 건은 날짜로 자르면 안 된다 — 어제 들어온 대기 건이 오늘 화면에서 사라져 그대로 묻힌다.
       '대기'와 '미전달'은 기간을 무시하고 전부 보여준다. 완료·반려는 이력 조회라 기간 유지. */
    var ALLW = (REV_STATUS === '대기');
    var NODATE = PEND || ALLW;
    var filters = PENDOK ? ['대기', '완료', '미전달', '반려', '전체'] : ['대기', '완료', '반려', '전체'];
    var actSel = '<select id="__wpAf" class="wp-inp" style="min-height:38px;padding:7px 9px;max-width:190px"><option value="전체">전체 작업</option>' + GACTS.map(function(a) {
      return '<option value="' + esc(a) + '"' + (a === REV_ACTION ? ' selected' : '') + '>' + esc(a) + '</option>';
    }).join('') + '</select>';
    VIEW.innerHTML = '<div style="margin-bottom:10px"><div style="margin-bottom:8px;display:flex;align-items:center;gap:5px;flex-wrap:wrap">' + filters.map(function(f) {
      return '<button class="wp-btn ' + (f === REV_STATUS ? 'pri' : 'gh') + ' __wpFt" data-f="' + f + '" style="padding:7px 13px">' + f + '</button>';
    }).join('') + '<span style="color:#cbd5e1;margin:0 3px">|</span>' + actSel + '</div>' + drBar('__wpRF', '__wpRT', '__wpRGo', '__wpRCsv') + (PEND ? '<div style="margin-top:7px;padding:9px 12px;background:#FFF7ED;border:1px solid #FDBA74;border-radius:7px;font-size:12.5px;color:#9A3412;line-height:1.65"><b>미전달 — 승인은 끝났는데 아직 ' + (group === 'pick' ? '수기피킹' : '코드전달') + ' 엑셀에 안 담긴 건입니다.</b><br>위 기간과 상관없이 전부 나옵니다. 엑셀을 받으면 전달완료로 표시되고 이 목록에서 사라집니다.</div>' : '') + (ALLW ? '<div style="margin-top:7px;padding:9px 12px;background:#FFFBEB;border:1px solid #FCD34D;border-radius:7px;font-size:12.5px;color:#92400E;line-height:1.65"><b>대기 — 아직 처리 안 된 요청 전부입니다.</b><br>기간과 상관없이 나옵니다. 어제·지난주에 들어온 건도 처리할 때까지 계속 보입니다.</div>' : '') + '<div style="margin-top:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">' + (ALLW ? '<button id="__wpBulkAp" class="wp-btn ok" style="padding:7px 13px">✓ 일괄승인</button><button id="__wpBulkRj" class="wp-btn dg" style="padding:7px 13px">일괄반려</button><span style="color:#cbd5e1">|</span>' : '') + '<button id="__wpRCode" class="wp-btn ' + (PEND ? 'pri' : 'gh') + '" style="padding:7px 13px">⬇ 코드전달 엑셀</button><button id="__wpRPick" class="wp-btn gh" style="padding:7px 13px">⬇ 수기피킹 엑셀</button><span style="color:#94a3b8;font-size:11px">코드전달=신규·주소·거래처명·담당자·코스변경 / 수기피킹=피킹 품목 양식</span></div></div><div id="__wpRevList" class="wp-scroll">불러오는 중…</div>';
    document.getElementById('__wpRF').value = REV_DR.from;
    document.getElementById('__wpRT').value = REV_DR.to;
    if (NODATE) {  /* 대기·미전달은 기간 개념이 없다 — 날짜칸 잠금 */
      document.getElementById('__wpRF').disabled = true;
      document.getElementById('__wpRT').disabled = true;
      document.getElementById('__wpRF').style.opacity = '.45';
      document.getElementById('__wpRT').style.opacity = '.45';
    }
    [].forEach.call(VIEW.querySelectorAll('.__wpFt'), function(b) {
      b.onclick = function() {
        REV_STATUS = b.getAttribute('data-f');
        viewReview();
      };
    });
    document.getElementById('__wpAf').onchange = function() {
      REV_ACTION = this.value;
      load();
    };
    var cache = [];

    function load() {
      REV_DR.from = document.getElementById('__wpRF').value;
      REV_DR.to = document.getElementById('__wpRT').value;
      listReqSWR('__wpRevList', PEND ? { pending: (group === 'pick' ? 'pick' : 'code') } : ALLW ? { status: '대기' } : {
        status: REV_STATUS === '전체' ? '' : REV_STATUS,
        from: REV_DR.from,
        to: REV_DR.to
      }, function(items) {
        cache = NODATE ? items : filterByDate(items, REV_DR.from, REV_DR.to);
        cache = cache.filter(function(it) { return GACTS.indexOf(it.action) > -1; });
        if (REV_ACTION !== '전체') cache = cache.filter(function(it) {
          return it.action === REV_ACTION;
        });
        /* 검토는 처리 대기열이다 → 들어온 순서(과거 → 최근)로 놓아야 위에서부터 순서대로 처리할 수 있다.
           (서버는 최근순으로 내려주므로 여기서 뒤집는다) */
        cache.sort(function(x, y) { return String(x.ts || '').localeCompare(String(y.ts || '')); });
        REV_CACHE = cache;
        renderReqTable('__wpRevList', cache, true, { codeSent: PENDOK, selectable: PEND || ALLW });
      }).catch(function(e) {
        document.getElementById('__wpRevList').innerHTML = '<div style="color:#b00;padding:10px">' + esc(e.message) + '</div>';
      });
    }
    document.getElementById('__wpRGo').onclick = load;
    /* ---- 일괄 승인/반려 (대기 화면 전용) ----
       신규코드발급은 건별로 우린담당 입력이 필요해 일괄에서 제외한다.
       주소변경의 '코스도 바꿀까요?' 질문은 일괄에선 건너뛴다(코스 유지). */
    function bulkSelIds() {
      var bx = document.getElementById('__wpRevList');
      var m = {};
      [].forEach.call(bx ? bx.querySelectorAll('.__wpSel:checked') : [], function(c) { m[c.getAttribute('data-id')] = 1; });
      return m;
    }
    function bulkRun(items, worker, label, btn) {
      var o0 = btn.textContent, i = 0, ok = 0, fails = [];
      btn.disabled = true;
      var other = document.getElementById(btn.id === '__wpBulkAp' ? '__wpBulkRj' : '__wpBulkAp');
      if (other) { other.disabled = true; }
      function fin() {
        btn.disabled = false; btn.textContent = o0;
        if (other) { other.disabled = false; }
        toast(label + ' 완료 · 성공 ' + ok + (fails.length ? ' / 실패 ' + fails.length : ''), fails.length ? '#b45309' : '#0a7d47');
        if (fails.length) { alert(label + ' 실패 ' + fails.length + '건 — 목록에 남아 있습니다.\n\n' + fails.join('\n')); }
      }
      function step() {
        if (i >= items.length) { fin(); return; }
        var it = items[i++];
        btn.textContent = label + ' ' + i + '/' + items.length;
        worker(it).then(function() {
          ok++; dropReqRow(it.id);
        }).catch(function(e) {
          fails.push((it.branchName || it.id) + ' — ' + ((e && e.message) || e));
        }).then(function() { setTimeout(step, 400); });   /* 웹앱 직렬 큐 배려 — 몰아치면 스로틀 걸린다 */
      }
      step();
    }
    var _bAp = document.getElementById('__wpBulkAp');
    if (_bAp) {
      _bAp.onclick = function() {
        var ids = bulkSelIds();
        var all = cache.filter(function(it) { return ids[it.id] && it.status === '대기'; });
        var sel = all.filter(function(it) { return it.action !== '신규코드발급'; });
        var skip = all.length - sel.length;
        if (!sel.length) { toast(skip ? '신규코드발급은 일괄승인 불가 — 건별로 승인하세요' : '체크된 건이 없습니다', '#c0392b'); return; }
        var byAct = {};
        sel.forEach(function(it) { byAct[it.action] = (byAct[it.action] || 0) + 1; });
        var msg = '[일괄승인] ' + sel.length + '건\n' +
          Object.keys(byAct).map(function(k) { return ' · ' + k + ' ' + byAct[k] + '건'; }).join('\n') +
          (skip ? '\n\n※ 신규코드발급 ' + skip + '건 제외 (우린담당 입력이 필요해 건별 승인)' : '') +
          '\n\n배송 계열은 위펀 오피스에 바로 반영되고, 건별로 슬랙 회신이 나갑니다.\n진행할까요?';
        if (!confirm(msg)) { return; }
        bulkRun(sel, function(it) {
          return runActionCore(it).then(function(note) {
            return decideReq(it.id, '완료', note || '', it.slackTs);
          });
        }, '일괄승인', this);
      };
    }
    var _bRj = document.getElementById('__wpBulkRj');
    if (_bRj) {
      _bRj.onclick = function() {
        var ids = bulkSelIds();
        var sel = cache.filter(function(it) { return ids[it.id] && it.status === '대기'; });
        if (!sel.length) { toast('체크된 건이 없습니다', '#c0392b'); return; }
        var note = prompt('[일괄반려] ' + sel.length + '건에 적용할 반려 사유를 입력하세요.', '');
        if (note === null) { return; }
        if (!note.trim()) { toast('반려 사유는 필수입니다', '#c0392b'); return; }
        if (!confirm('[일괄반려] ' + sel.length + '건\n사유: ' + note + '\n\n건별로 요청자에게 슬랙 회신이 나갑니다.\n진행할까요?')) { return; }
        bulkRun(sel, function(it) {
          return decideReq(it.id, '반려', note, it.slackTs);
        }, '일괄반려', this);
      };
    }
    document.getElementById('__wpRCsv').onclick = function() {
      reqCsv(cache, '배송요청_' + REV_STATUS + '_' + REV_DR.from + '~' + REV_DR.to + '.csv');
    };
    /* 미전달 화면에서 체크된 건들의 id — 하나도 안 찍었으면 null(=전체) */
    function selPick() {
      var bx = document.getElementById('__wpRevList');
      if (!bx) { return null; }
      var cbs = bx.querySelectorAll('.__wpSel:checked');
      if (!cbs.length) { return null; }
      var m = {};
      [].forEach.call(cbs, function(c) { m[c.getAttribute('data-id')] = 1; });
      return m;
    }
    document.getElementById('__wpRCode').onclick = function() {
      var selM = selPick();
      var pool = selM ? cache.filter(function(it) { return selM[it.id]; }) : cache;
      /* 승인 완료된 건만 내보낸다 — 예전엔 '대기' 건까지 섞여 나갔다 */
      var ok = pool.filter(function(it) { return codeGubun(it.action) && it.status === '완료'; });
      var notYet = pool.filter(function(it) { return codeGubun(it.action) && it.status !== '완료'; }).length;
      if (!ok.length) { toast(selM ? '선택한 건 중 코드전달 대상(완료)이 없습니다' : '코드전달 대상(승인 완료된 건)이 없습니다', '#c0392b'); return; }
      if (selM) { toast('선택한 ' + ok.length + '건만 담습니다', '#1f4e78'); }
      if (notYet && !confirm('아직 승인되지 않은 ' + notYet + '건은 빼고 뽑습니다.\n\n계속할까요?')) return;
      buildCodeXlsx(ok, '코드전달_' + todayStr() + '.xlsx', true, load);
    };
    document.getElementById('__wpRPick').onclick = function() {
      var selP = selPick();
      var poolP = selP ? cache.filter(function(it) { return selP[it.id]; }) : cache;
      /* 코드전달과 같은 원칙 — 승인 완료된 건만 담고, 담은 건 전달완료로 표시해 미전달 큐에서 뺀다 */
      var okp = poolP.filter(function(it) { return it.action === '수기피킹' && it.status === '완료'; });
      var notYetP = poolP.filter(function(it) { return it.action === '수기피킹' && it.status !== '완료'; }).length;
      if (!okp.length) { toast(selP ? '선택한 건 중 수기피킹 대상(완료)이 없습니다' : '수기피킹 대상(승인 완료된 건)이 없습니다', '#c0392b'); return; }
      if (selP) { toast('선택한 ' + okp.length + '건만 담습니다', '#1f4e78'); }
      if (notYetP && !confirm('아직 승인되지 않은 ' + notYetP + '건은 빼고 뽑습니다.\n\n계속할까요?')) return;
      buildPickingXlsx(okp, '수기피킹_' + todayStr() + '.xlsx', true, load);
    };
    load();
  }

  function codeGubun(action) {
    return action === '신규코드발급' ? '신규' : action === '주소변경' ? '주소변경' : action === '거래처명변경' ? '거래처명변경' : action === '담당자변경' ? '담당자변경' : action === '코스변경' ? '코스변경' : '';
  }

  function codeRow(it) {
    var cm = /코스변경=([^·]+)/.exec(it.adminNote || '');
    var course = cm ? cm[1].trim() : '기존';
    var gubun = codeGubun(it.action);
    var phone = '';
    if (/택배/.test((detailGet(it.detail, '서비스구분') || '') + ' ' + (detailGet(it.detail, '배송형태') || ''))) {
      phone = detailGet(it.detail, '담당자연락처') || '';
    }
    if (it.action === '주소변경') {
      var m = detailGet(it.detail, '변경주소'),
        d2 = detailGet(it.detail, '변경상세주소');
      var addr = (m || '') + (d2 ? (m ? ' ' : '') + d2 : '');
      if (!addr) addr = '기존';
      if (cm) gubun = '코스변경,주소변경';
      return Promise.resolve([it.branchName || '', addr, course, gubun, phone, it.hot || '', it.cold || '']);
    }
    if (it.action === '신규코드발급') {
      var dm = /우린담당=([^·]+)/.exec(it.adminNote || '');
      var drvCourse = dm ? dm[1].trim() : '';
      if (drvCourse === '-') drvCourse = '';
      var stored = ((detailGet(it.detail, '주소') || '') + ' ' + (detailGet(it.detail, '상세주소') || '')).trim();
      // 주소는 요청 제출 시점에 이미 시트에 저장된다(doSubmit의 '주소:' 항목).
      // 코드전달은 '코드를 발급해달라'는 요청서라 상온/저온코드는 비어 있는 게 정상 →
      // 주소만 있으면 오피스를 볼 이유가 없다. (예전엔 hot·cold 둘 다 있어야 넘어가서 사실상 매번 조회했다)
      if (stored || !it.branchId) {
        return Promise.resolve([it.branchName || '', stored, drvCourse, gubun, phone, it.hot || '', it.cold || '']);
      }
      // 주소가 없는 옛 요청만 오피스에서 보충
      return getForm(it.branchId).then(function(f) {
        var a1 = getVal(f, 'address1') || '';
        var a2 = getVal(f, 'address2') || '';
        var full = stored || (a1 + (a2 ? ' ' + a2 : '')).trim();
        var hot = it.hot || getVal(f, 'woolinClientCode') || '';
        var cold = it.cold || getVal(f, 'eyClientCode') || '';
        return [it.branchName || '', full, drvCourse, gubun, phone, hot, cold];
      }).catch(function() {
        return [it.branchName || '', stored, drvCourse, gubun, phone, it.hot || '', it.cold || ''];
      });
    }
    if (it.action === '코스변경') {
      var nco = detailGet(it.detail, '변경코스') || '기존';
      return Promise.resolve([it.branchName || '', '기존', nco, '코스변경', phone, it.hot || '', it.cold || '']);
    }
    var nmC = it.branchName || '';
    if (it.action === '거래처명변경') { var nnC = detailGet(it.detail, '변경거래처명'); if (nnC) nmC = nnC; }
    // 거래처명변경·담당자변경 등
    return Promise.resolve([nmC, '기존', course, gubun, phone, it.hot || '', it.cold || '']);
  }

  function buildCodeXlsx(items, fname, markSent, onDone) {
    var targets = (items || []).filter(function(it) {
      return codeGubun(it.action);
    });
    if (!targets.length) {
      toast('코드전달 대상(신규·주소변경·거래처명변경·담당자변경)이 없습니다', '#c0392b');
      return;
    }
    /* codeRow 는 신규건일 때 오피스 거래처 페이지를 통째로 받아온다.
       전부 동시에 던지면 서로 밀려 더 느려지므로 4개씩 끊어서 돌린다. */
    var btnP = document.getElementById('__wpRCode');
    var btnP0 = btnP ? btnP.textContent : '';
    function prog(d, t) { if (btnP) { btnP.textContent = '조회 중 ' + d + '/' + t; } }
    toast('코드전달 생성 중… (신규 주소 조회)', '#1f4e78');
    ensureExcel().then(function() {
      return mapLimit(targets, 4, codeRow, prog);
    }).then(function(all) {
      if (btnP) { btnP.textContent = btnP0; }
      var changeData = [], newData = [];
      targets.forEach(function(it, i) {
        if (it.action === '신규코드발급') { newData.push(all[i]); } else { changeData.push(all[i]); }
      });
      var head1 = ['거래처명', '주소', '코스', '구분', '담당자번호', '상온코드', '저온코드'];
      var head2 = ['거래처명', '주소', '코스', '구분', '담당자번호', '상온코드', '저온코드'];
      var rows = [];
      if (changeData.length) {
        rows.push(head1);
        rows = rows.concat(changeData);
      }
      if (newData.length) {
        rows.push(head2); // 신규 섹션 머릿글 재삽입
        rows = rows.concat(newData);
      }
      return xlsxDownload(rows, [{ wch: 40 }, { wch: 52 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 11 }, { wch: 11 }], '코드전달', fname).then(function() {
        toast('✓ 코드전달 엑셀 변경 ' + changeData.length + ' · 신규 ' + newData.length + '건 생성', '#0a7d47');
        if (!markSent) return;
        /* 엑셀에 담긴 건에 전달일을 찍어 미전달 큐에서 뺀다 */
        return api({ e: 'sent', ids: targets.map(function(t) { return t.id; }).join(','), val: todayStr() }).then(function() {
          _pendCache = { n: 0, t: 0 };  /* 배지 캐시 무효화 */
          toast('✓ ' + targets.length + '건 전달완료 표시', '#0a7d47');
          if (onDone) onDone();
        }).catch(function(e) {
          alert('엑셀은 받았는데 전달완료 표시에 실패했습니다.\n' + ((e && e.message) || e) + '\n\n해당 건들이 미전달 목록에 그대로 남아 있습니다.\n이미 자회사에 보내셨다면 중복 전달되지 않게 확인해주세요.');
        });
      });
    }).catch(function(e) {
      if (btnP) { btnP.textContent = btnP0; }
      alert('코드전달 생성 실패: ' + (e && e.message || e));
    });
  }

  function pkNum(s) {
    return Number(String(s || '').replace(/[^\d.]/g, '')) || 0;
  }

  function buildPickingXlsx(items, fname, markSent, onDone) {
    var targets = (items || []).filter(function(it) {
      return it.action === '수기피킹';
    });
    if (!targets.length) {
      toast('수기피킹 요청이 없습니다', '#c0392b');
      return;
    }
    ensureExcel().then(function() {   /* ExcelJS 경로 */
      var head = ['신청일', '작성자', '거래처명', '상온코드', '저온코드', '배송일', '바코드', '품목명', '출고기준', '용량', '단가', '입수박스', '박스수량', '주문단위', '주문수량(EA)', '합계', '비고', '피킹구분'];
      var rows = [head];
      targets.forEach(function(it) {
        var lines = String(it.detail || '').split('\n');
        var deliv = '',
          gubun = '',
          bigo = '';
        lines.forEach(function(l) {
          l = l.trim();
          if (l.indexOf('배송일:') === 0) deliv = l.slice(l.indexOf(':') + 1).trim();
          else if (l.indexOf('피킹구분:') === 0) gubun = l.slice(l.indexOf(':') + 1).trim();
          else if (l.indexOf('비고:') === 0) bigo = l.slice(l.indexOf(':') + 1).trim();
        });
        var applyDate = String(it.ts || '').slice(0, 10);
        lines.forEach(function(l) {
          l = l.trim();
          if (l.charAt(0) !== '▸') return;
          var parts = l.replace(/^▸\s*/, '').split('|').map(function(s) {
            return s.trim();
          });

          function pick(prefix) {
            for (var i = 0; i < parts.length; i++) {
              if (parts[i].indexOf(prefix) === 0) return parts[i].slice(prefix.length).trim();
            }
            return '';
          }
          var name = parts[0] || '';
          var storage = parts[2] || '';
          var volume = parts[3] || '';
          var inbox = pick('입수 ');
          if (inbox === '-') inbox = '';
          var boxes = pick('박스 ');
          if (boxes === '-') boxes = '';
          rows.push([applyDate, it.name || '', it.branchName || '', it.hot || '', it.cold || '', deliv, pick('바코드 '), name, storage, volume, pkNum(pick('단가 ')), inbox ? pkNum(inbox) : '', boxes ? pkNum(boxes) : '', pick('주문단위 '), pkNum(pick('주문 ')), pkNum(pick('합계 ')), bigo, gubun]);
        });
      });
      if (rows.length < 2) {
        toast('수기피킹 품목이 없습니다', '#c0392b');
        return;
      }
      return xlsxDownload(rows, [{ wch: 12 }, { wch: 10 }, { wch: 34 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 34 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 12 }, { wch: 11 }, { wch: 20 }, { wch: 12 }], '수기피킹', fname).then(function() {
        toast('✓ 수기피킹 엑셀 ' + (rows.length - 1) + '건 생성', '#0a7d47');
        if (!markSent) return;
        return api({ e: 'sent', ids: targets.map(function(t) { return t.id; }).join(','), val: todayStr() }).then(function() {
          _pendCache = { n: 0, t: 0 };
          toast('✓ ' + targets.length + '건 전달완료 표시', '#0a7d47');
          if (onDone) onDone();
        }).catch(function(e) {
          alert('엑셀은 받았는데 전달완료 표시에 실패했습니다.\n' + ((e && e.message) || e) + '\n\n해당 건들이 미전달 목록에 그대로 남아 있습니다.');
        });
      });
    }).catch(function(e) {
      alert('수기피킹 엑셀 생성 실패: ' + (e && e.message || e));
    });
  } /* 수기피킹 업로드 기본양식(빈 템플릿) */
  function downloadPickingTemplate() {
    ensureXLSX().then(function() {
      var head = ['바코드', '품목명', '출고기준', '용량', '단가', '입수박스', '박스수량', '주문단위', '주문수량(EA)', '합계'];
      var ex = ['8809422043027', '[예시] 컨디션 헛개수_340ml', '상온', '340ml', 1840, 20, 1, 20, 20, 36800];
      var ws = XLSX.utils.aoa_to_sheet([head, ex]);
      ws['!cols'] = [{
        wch: 15
      }, {
        wch: 34
      }, {
        wch: 9
      }, {
        wch: 9
      }, {
        wch: 9
      }, {
        wch: 9
      }, {
        wch: 9
      }, {
        wch: 9
      }, {
        wch: 12
      }, {
        wch: 11
      }];
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '수기피킹');
      XLSX.writeFile(wb, '수기피킹_업로드양식.xlsx');
      toast('✓ 업로드 양식 다운로드', '#0a7d47');
    }).catch(function(e) {
      alert('양식 생성 실패: ' + (e && e.message || e));
    });
  }

    function editDetail(id, detail, admin) {
    return api({ e: 'editdetail', id: id, detail: detail, admin: admin });
  }
  function editApprove(id, detail, admin, note) {
    return api({ e: 'editapprove', id: id, detail: detail, admin: admin, note: note || '' });
  }
  function openReviewEdit(it, pending) {
    if (!it) return;
    var host = document.getElementById('__wpEditHost');
    if (!host) { host = document.createElement('div'); host.id = '__wpEditHost'; host.style.marginTop = '14px'; VIEW.appendChild(host); }
    host.innerHTML = '<div id="__wpQr" style="display:none"></div><div id="__wpForm"></div>';
    /* 기존코스·기존주소를 빈값으로 열면 슬랙 요청내용에 '기존코스: -' 로 나간다 → 원 요청내용에서 되살림 */
    var br = { id: it.branchId, name: it.branchName, hot: it.hot, cold: it.cold, course: detailGet(it.detail, '기존코스'), addr: detailGet(it.detail, '기존주소') };
    openForm(it.action, br, { id: it.id, prefill: it.detail, adminEdit: !pending, adminEditOnly: !!pending });
    try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }
  function openEditForm(it) {
    if (!it) return;
    var host = document.getElementById('__wpEditHost');
    if (!host) { host = document.createElement('div'); host.id = '__wpEditHost'; host.style.marginTop = '14px'; VIEW.appendChild(host); }
    host.innerHTML = '<div id="__wpQr" style="display:none"></div><div id="__wpForm"></div>';
    /* 기존코스·기존주소를 빈값으로 열면 슬랙 요청내용에 '기존코스: -' 로 나간다 → 원 요청내용에서 되살림 */
    var br = { id: it.branchId, name: it.branchName, hot: it.hot, cold: it.cold, course: detailGet(it.detail, '기존코스'), addr: detailGet(it.detail, '기존주소') };
    openForm(it.action, br, { id: it.id, prefill: it.detail });
    try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }
  /* 승인·반려 후 목록 전체를 다시 그리면 '불러오는 중…'으로 한 번 비었다가 돌아와 눈이 아프다.
     처리된 행만 지우고 끝낸다. 서버 캐시는 api() 가 이미 무효화했으므로 다음 조회 때 정상 반영된다. */
  var REV_CACHE = [];
  function dropReqRow(id) {
    var box = document.getElementById('__wpRevList');
    if (!box) { return false; }
    var tr = box.querySelector('tr[data-id="' + id + '"]');
    if (!tr) { return false; }
    /* filter 로 새 배열을 만들면 viewReview 의 cache(엑셀 버튼이 참조)와 갈라진다 → 같은 배열을 제자리에서 지운다 */
    for (var ri = REV_CACHE.length - 1; ri >= 0; ri--) {
      if (String(REV_CACHE[ri].id) === String(id)) { REV_CACHE.splice(ri, 1); }
    }
    tr.style.transition = 'opacity .16s';
    tr.style.opacity = '0';
    setTimeout(function() {
      var tb = tr.parentNode;
      if (tb) { tb.removeChild(tr); }
      if (tb && !tb.querySelectorAll('tr').length) {
        box.innerHTML = '<div style="color:#94a3b8;padding:14px">처리할 요청이 없습니다.</div>';
      }
    }, 170);
    return true;
  }
  /* 행 제거로 끝났으면 재조회를 건너뛴다 */
  function afterDecide(id) {
    if (dropReqRow(id)) { return; }
    try { viewReview(); } catch (_ad) {}
  }

  function renderReqTable(elId, items, admin, opt) {
    opt = opt || {};
    var cn = !!opt.custNotice;
    var box = document.getElementById(elId);
    if (!items.length) {
      box.innerHTML = '<div style="color:#94a3b8;padding:14px">해당 기간에 요청이 없습니다.</div>';
      return;
    }
    var sel = !!opt.selectable;   /* 미전달 화면: 맨 왼쪽 체크박스 — 선택한 건만 엑셀에 담기 */
    var cols = [
      ['시각', 80],
      [cn ? '고객사 안내' : '부서', cn ? 90 : 56],
      ['요청자', 70],
      ['작업', 110],
      ['점포코드', 72],
      ['거래처명', 160],
      ['요청내용', 0],
      ['상태', 60],
      [admin ? '처리' : '처리결과', admin ? 178 : 150]
    ];
    if (sel) { cols.unshift(['<input type="checkbox" id="__wpSelAll" title="전체 선택/해제" style="cursor:pointer">', 30]); }
    var h = '<table class="wp-tbl" style="table-layout:fixed;width:100%"><thead><tr>' + cols.map(function(c) {
      return '<th style="' + (c[1] ? 'width:' + c[1] + 'px;' : '') + '">' + c[0] + '</th>';
    }).join('') + '</tr></thead><tbody>';
    items.forEach(function(it) {
      var doneInfo = it.admin ? ('<div style="font-size:12px;line-height:1.55"><b style="color:#334155">' + esc(it.admin) + '</b>' + (it.decidedTs ? ' <span style="color:#94a3b8">' + esc(fmtTs(it.decidedTs)) + '</span>' : '') + (it.adminNote ? '<div style="color:#64748b;margin-top:1px">' + addDow(esc(it.adminNote)).split(' · ').join('<br>') + '</div>' : '') + '</div>') : '';
      /* 코드전달 대상(시너지) 완료건은 전달 여부를 눈에 보이게 — 놓친 건이 목록에서 티나게 */
      var sentInfo = '';
      if (admin && opt.codeSent && it.status === '완료' && (codeGubun(it.action) || it.action === '수기피킹')) {
        sentInfo = it.sent ?
          ('<div style="font-size:11.5px;color:#0a7d47;margin-top:3px">📤 전달 ' + esc(it.sent) + ' <button class="wp-act __wpUnsent" data-id="' + esc(it.id) + '" style="height:21px;font-size:11px;padding:0 6px;margin:0 0 0 3px;border-color:#cbd5e1;color:#94a3b8">취소</button></div>') :
          '<div style="font-size:11.5px;color:#b45309;margin-top:3px;font-weight:700">⚠ 코드 미전달</div>';
      }
      var last;
      if (admin) {
        if (it.status === '대기') {
          if (it.action === '신규코드발급') {
            /* 자산승인 단계 폐지 — 물류승인만으로 완료. 설비건은 슬랙에서 자산담당에게 확인 요청만 나감 */
            var d물 = /물류승인/.test(it.adminNote || '');
            var eqm = /요청설비:\s*([^·]*)/.exec(it.detail || '');
            var hasEq = !!(eqm && eqm[1].trim() && eqm[1].trim() !== '없음');
            last = '<td style="white-space:normal;line-height:1.9"><button class="wp-act __wpAp2" data-id="' + esc(it.id) + '" data-stage="물류" ' + (d물 ? 'disabled style="opacity:.45;border-color:#94a3b8;color:#94a3b8"' : 'style="border-color:#1f4e78;color:#1f4e78"') + '>물류승인' + (d물 ? ' ✓' : '') + '</button>' + '<button class="wp-act __wpRj" data-id="' + esc(it.id) + '" style="border-color:#c0392b;color:#c0392b">반려</button><button class="wp-act __wpFix" data-id="' + esc(it.id) + '" style="border-color:#b45309;color:#b45309">수정승인</button>' + (hasEq ? '<div style="font-size:11.5px;color:#7c3aed;margin-top:2px">설비건 · 승인 시 자산담당 확인요청 발송</div>' : '') + (it.adminNote ? '<div style="font-size:11.5px;color:#64748b;margin-top:2px">' + esc(it.adminNote) + '</div>' : '') + '</td>';
          } else if (it.action === '배송시간문의') {
            last = '<td style="white-space:normal;line-height:1.9"><button class="wp-act __wpDtLook" data-id="' + esc(it.id) + '" style="border-color:#1f4e78;color:#1f4e78;font-weight:700">조회</button>' +
              '<button class="wp-act __wpAp" data-id="' + esc(it.id) + '" style="border-color:#0a7d47;color:#0a7d47">회신승인</button>' +
              '<button class="wp-act __wpRj" data-id="' + esc(it.id) + '" style="border-color:#c0392b;color:#c0392b">반려</button></td>';
          } else {
            last = '<td style="white-space:normal;line-height:2.1"><button class="wp-act __wpAp" data-id="' + esc(it.id) + '" style="border-color:#0a7d47;color:#0a7d47">승인</button><button class="wp-act __wpFix" data-id="' + esc(it.id) + '" style="border-color:#b45309;color:#b45309">수정승인</button><button class="wp-act __wpRj" data-id="' + esc(it.id) + '" style="border-color:#c0392b;color:#c0392b">반려</button></td>';
          }
        } else {
          last = '<td>' + doneInfo + sentInfo + '</td>';
        }
      } else {
        var _mine = (String(it.email || '') === String(REQ.email || ''));
        var _lastInner;
        if (it.status === '대기') { _lastInner = _mine ? ('<button class="wp-act __wpCancel" data-id="' + esc(it.id) + '" style="border-color:#c0392b;color:#c0392b">요청취소</button>') : '<span style="color:#94a3b8;font-size:12px">대기중</span>'; }
        else if (it.status === '수정요청' && _mine && MODE === 'requester') { _lastInner = doneInfo + '<div style="margin-top:5px"><button class="wp-act __wpEdit" data-id="' + esc(it.id) + '" style="border-color:#b45309;color:#b45309">수정해 다시요청</button></div>'; }
        else { _lastInner = doneInfo; }
        last = '<td style="white-space:normal">' + _lastInner + '</td>';
      }
      var bn = it.branchId ? ('<a href="/office/sales/branch/' + esc(it.branchId) + '" target="_blank" style="color:#1f4e78;text-decoration:none">' + esc(it.branchName) + '</a>') : esc(it.branchName);
      h += '<tr data-id="' + esc(it.id) + '">' + (sel ? ('<td><input type="checkbox" class="__wpSel" data-id="' + esc(it.id) + '" style="cursor:pointer"></td>') : '') + '<td style="white-space:nowrap;color:#64748b">' + esc(fmtTs(it.ts)) + '</td>' + (cn ? ('<td style="white-space:nowrap"><select class="__wpNotice" data-id="' + esc(it.id) + '" style="display:inline-block;width:78px;height:30px;line-height:1;font-size:12.5px;padding:2px 6px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;vertical-align:top;box-sizing:border-box"><option value=""' + (String(it.custNotice || '') === '완료' ? '' : ' selected') + '></option><option value="완료"' + (String(it.custNotice || '') === '완료' ? ' selected' : '') + '>완료</option></select></td>') : ('<td style="white-space:nowrap">' + esc(it.dept) + '</td>')) + '<td style="white-space:nowrap">' + esc(it.name) + '</td>' + '<td style="white-space:normal;word-break:break-word;line-height:1.25;font-weight:600">' + esc(it.action) + '</td>' + '<td style="white-space:nowrap">' + esc(it.hot || '-') + '</td>' + '<td style="word-break:break-word;line-height:1.35">' + bn + '</td>' + '<td style="color:#334155;white-space:normal;word-break:break-word;line-height:1.5;">' + addDow(esc(it.detail)).replace(/\n/g, '<br>').split(' · ').map(function(_p, _i, _a) { return (_i > 0 && /^변경/.test(_p) && /^기존/.test(_a[_i - 1]) ? '<div style="height:7px"></div>' : '') + _p; }).join('<br>') + '</td>' + '<td style="white-space:nowrap">' + pill(it.status) + '</td>' + last + '</tr>';
    });
    h += '</tbody></table>';
    box.innerHTML = h;
    var map = {};
    items.forEach(function(it) {
      map[it.id] = it;
    });
    [].forEach.call(box.querySelectorAll('.__wpAp'), function(b) {
      b.onclick = function() {
        approve(map[b.getAttribute('data-id')], b);
      };
    });
    [].forEach.call(box.querySelectorAll('.__wpAp2'), function(b) {
      b.onclick = function() {
        approveStage(map[b.getAttribute('data-id')], b.getAttribute('data-stage'), b);
      };
    });
    [].forEach.call(box.querySelectorAll('.__wpDtLook'), function(b) {
      b.onclick = function() {
        var it = map[b.getAttribute('data-id')];
        if (!it) { return; }
        openDeliveryTime({ id: it.branchId, name: it.branchName, hot: it.hot, cold: it.cold, addr: '', course: '', method: '' }, true);
      };
    });
    var selAll = document.getElementById('__wpSelAll');
    if (selAll) {
      selAll.onclick = function() {
        [].forEach.call(box.querySelectorAll('.__wpSel'), function(c) { c.checked = selAll.checked; });
      };
    }
    [].forEach.call(box.querySelectorAll('.__wpUnsent'), function(b) {
      b.onclick = function() {
        var it = map[b.getAttribute('data-id')];
        if (!it || b.disabled) return;
        if (!confirm('[전달취소] ' + (it.branchName || '') + '\n\n미전달 목록으로 되돌립니다. 다음 코드전달 엑셀에 다시 담깁니다.\n진행할까요?')) return;
        b.disabled = true;
        api({ e: 'sent', ids: it.id, val: '' }).then(function() {
          _pendCache = { n: 0, t: 0 };
          toast('전달취소됨 · 미전달 목록으로 돌아갑니다', '#b45309');
          try { viewReview(); } catch (_ue) {}
        }).catch(function(e) {
          b.disabled = false;
          alert('전달취소 실패: ' + ((e && e.message) || e));
        });
      };
    });
    [].forEach.call(box.querySelectorAll('.__wpRj'), function(b) {
      b.onclick = function() {
        if (b.disabled) return;
        var note = prompt('반려 사유를 입력하세요.', '');
        if (note === null) return;
        b.disabled = true;
        var ov = b.textContent;
        b.textContent = '처리중…';
        var ap = b.parentNode && b.parentNode.querySelector('.__wpAp');
        if (ap) ap.disabled = true;
        decideReq(b.getAttribute('data-id'), '반려', note).then(function() {
          toast('반려 처리됐습니다', '#c0392b');
          afterDecide(b.getAttribute('data-id'));
        }).catch(function(e) {
          b.disabled = false;
          b.textContent = ov;
          if (ap) ap.disabled = false;
          alert(e.message);
        });
      };
    });
    [].forEach.call(box.querySelectorAll('.__wpCancel'), function(b) {
      b.onclick = function() {
        if (b.disabled) return;
        if (!confirm('이 요청을 취소할까요?')) return;
        b.disabled = true;
        b.textContent = '취소중…';
        decideReq(b.getAttribute('data-id'), '취소', '요청자 취소').then(function() {
          toast('요청이 취소됐습니다', '#c0392b');
          viewMine();
        }).catch(function(e) {
          b.disabled = false;
          b.textContent = '요청취소';
          alert(e.message);
        });
      };
    });
    [].forEach.call(box.querySelectorAll('.__wpFix'), function(b) {
      b.onclick = function() {
        var it2 = map[b.getAttribute('data-id')];
        openReviewEdit(it2, it2 && it2.action === '신규코드발급');
      };
    });
    [].forEach.call(box.querySelectorAll('.__wpEdit'), function(b) {
      b.onclick = function() {
        openEditForm(map[b.getAttribute('data-id')]);
      };
    });
    [].forEach.call(box.querySelectorAll('.__wpNotice'), function(sel) {
      sel.onchange = function() {
        var nid = sel.getAttribute('data-id');
        sel.disabled = true;
        setNotice(nid, sel.value).then(function() { toast('고객사 안내 저장됨', '#0a7d47'); if (map[nid]) map[nid].custNotice = sel.value; sel.disabled = false; }).catch(function(e) { sel.disabled = false; alert(e.message); });
      };
    });
  } /* 실제 위펀 오피스 반영 (확인창 없음) — 요청자(관리자) 직접반영·관리자 승인 공용 */
  function waitScheduleReady(sid, tries) {
    return new Promise(function(rs) { setTimeout(rs, 600); }).then(function() {
      return getScheduleEvents(sid);
    }).then(function(evs) {
      if ((evs && evs.length) || tries <= 1) { return evs || []; }
      return waitScheduleReady(sid, tries - 1);
    });
  }

  /* 배송일정 생성기간 창 — 정보수정 페이지의 최초계약일(contractDate) + 생성기간(period 개월).
     이 창이 지난 서비스는 주기를 재생성해도 일정이 0건 생성되는데 폼 제출은 성공해서
     '완료'로 넘어가버린다(성공처럼 보이는 실패). 승인 전에 계산해서 막는다. */
  function schedWindow(sid) {
    return fetch('/office/sales/service/update/' + sid).then(function(r) { return r.text(); }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      function v(n) { var e = doc.querySelector('[name="' + n + '"]'); return e ? (e.value || '') : ''; }
      var per = parseInt(v('period'), 10);
      var cd = v('contractDate');
      if (!per || per <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(cd)) { return null; }   /* 못 읽으면 판단 보류(막지 않음) */
      var d = new Date(cd + 'T00:00:00');
      d.setMonth(d.getMonth() + per);
      var p2 = function(n) { return (n < 10 ? '0' : '') + n; };
      return { period: per, contract: cd, expire: d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) };
    }).catch(function() { return null; });
  }
  function schedWindowGuard(sid) {
    return schedWindow(sid).then(function(w) {
      if (w && w.expire <= todayStr()) {
        throw new Error('배송일정 생성기간 만료 — 최초계약일 ' + w.contract + ' + ' + w.period + '개월 = ' + w.expire + ' 까지만 일정이 생성됩니다.\n[영업 > 서비스 > 정보수정]에서 배송일정 생성기간을 연장한 뒤 다시 승인하세요.');
      }
      return w;
    });
  }

  function runActionCore(it) {
    if (/조식/.test(String(it.branchName || '')) && (it.action === '배송주기변경' || it.action === '배송일정생성' || it.action === '배송일정변경' || it.action === '배송일정삭제')) {
      return Promise.resolve('조식 건 · 위펀오피스 미반영 → 조식팀 일정반영 요청');
    }
    if (it.action === '배송메모') {
      if (!it.branchId) return Promise.reject(new Error('거래처ID 없음'));
      return getForm(it.branchId).then(function(f) {
        setVal(f, 'parkingMemo', it.detail.indexOf('변경메모: ') > -1 ? it.detail.split('변경메모: ').pop() : it.detail);
        return postForm(f);
      }).then(function() {
        return '메모 반영';
      });
    }
    if (it.action === '배송일정생성' || it.action === '배송일정변경' || it.action === '배송일정삭제') {
      if (!it.branchId) return Promise.reject(new Error('거래처ID 없음'));
      return resolveSid(it.branchId, it.branchName).then(function(ids) {
        if (!ids.length) throw new Error('스낵24 서비스 없음 (거래처명 확인 필요)');
        var sid = ids[0];
        if (it.action === '배송일정생성') {
          var gds = String(detailGet(it.detail, '배송일') || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean);
          if (!gds.length) throw new Error('배송일 없음');
          var gch = Promise.resolve();
          gds.forEach(function(dv) { gch = gch.then(function() { return createDelivery(sid, dv); }); });
          return gch.then(function() { return gds.join(', ') + ' 생성'; });
        }
        if (it.action === '배송일정변경') {
          var od = detailGet(it.detail, '기존배송일'),
            nd = detailGet(it.detail, '변경배송일');
          return getScheduleEvents(sid).then(function(evs) {
            var ev = evs.filter(function(e) {
              return e.deliveryDate === od;
            });
            if (!ev.length) throw new Error(od + ' 배송 없음');
            return moveDelivery(sid, ev[0].orderScheduleId, nd).then(function() {
              return od + '→' + nd + ' 변경';
            });
          });
        }
        return getScheduleEvents(sid).then(function(evs) {
          var xds = String(detailGet(it.detail, '삭제일') || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean);
          if (!xds.length) throw new Error('삭제일 없음');
          var ch = Promise.resolve();
          var done = [];
          xds.forEach(function(dv) {
            var ev = evs.filter(function(e) { return e.deliveryDate === dv; });
            ev.forEach(function(e) { ch = ch.then(function() { return deleteDelivery(sid, e.orderScheduleId, dv); }); });
            if (ev.length) done.push(dv);
          });
          return ch.then(function() { return (done.length ? done.join(', ') : '(대상 없음)') + ' 삭제'; });
        });
      });
    }
    if (it.action === '배송주기변경') {
      if (!it.branchId) return Promise.reject(new Error('거래처ID 없음'));
      return resolveSid(it.branchId, it.branchName).then(function(ids) {
        if (!ids.length) throw new Error('스낵24 서비스 없음 (거래처명 확인 필요)');
        var sid = ids[0];
        var cyc = detailGet(it.detail, '변경주기');
        if (cyc.indexOf('계획일정없음') > -1) cyc = '계획일정없음';
        var daysRaw = detailGet(it.detail, '변경요일') || detailGet(it.detail, '배송요일');
        var days = daysRaw ? daysRaw.split(',').map(function(s) {
          return s.trim().charAt(0);
        }).filter(Boolean) : [];
        if (!cyc) throw new Error('변경주기 없음');
        var noGen = (cyc === '계획일정없음' || cyc === '수기일정생성');
        return (noGen ? Promise.resolve(null) : schedWindowGuard(sid)).then(function() {
          return driveCycle(sid, cyc, days);
        }).then(function() {
          if (noGen) { return cyc + ' 재생성'; }
          /* 사후 검증 — 재생성 후 오늘 이후 일정이 실제로 찍혔는지 확인. 0건이면 승인 실패로 남긴다 */
          return waitScheduleReady(sid, 5).then(function(evs) {
            var t = todayStr();
            var fut = (evs || []).filter(function(e) { return e.deliveryDate >= t; });
            if (!fut.length) { throw new Error('주기를 재생성했지만 일정이 0건입니다 — [영업 > 서비스 > 정보수정]의 배송일정 생성기간을 확인하세요.'); }
            return cyc + (days.length ? '(' + days.join(',') + ')' : '') + ' 재생성 (' + fut.length + '건 확인)';
          });
        });
      });
    }
    if (it.action === '신규코드발급') {
      if (!it.branchId) return Promise.reject(new Error('거래처ID 없음'));
      var driver = it._driver || '';
      var begin = detailGet(it.detail, '첫배송희망일');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(begin)) {
        var mm = String(it.detail).match(/첫배송일[^:]*:\s*(\d{4}-\d{2}-\d{2})/);
        begin = mm ? mm[1] : '';
      }
      var cyc2 = detailGet(it.detail, '요청주기');
      if (cyc2.indexOf('계획일정없음') > -1) cyc2 = '계획일정없음';
      var draw = detailGet(it.detail, '정기배송요일');
      var days2 = draw ? draw.split(',').map(function(s) {
        return s.trim().charAt(0);
      }).filter(Boolean) : [];
      if (/조식/.test(String(detailGet(it.detail, '서비스구분') || '')) || /조식/.test(String(it.branchName || ''))) {
        // 조식: 주기(정기배송)는 조식팀이 별도 입력 → 물류승인은 우린배송담당(코드)만 반영, 서비스매칭·주기생성 생략
        var chainJ = Promise.resolve();
        if (driver) {
          chainJ = chainJ.then(function() {
            return getForm(it.branchId).then(function(f) {
              setVal(f, 'woolinDriver', driver);
              return postForm(f);
            });
          });
        }
        return chainJ.then(function() {
          return '우린담당=' + (driver || '-') + ' · 주기=조식(조식팀 별도입력) · 배송시작일=' + (begin || '-');
        });
      }
      return resolveServiceIds(it.branchId).then(function(ids) {
        // 스케줄이 있으면 그걸로, 없으면(신규) 서비스목록에서 거래처명+활동으로 serviceId 조회
        return ids.length ? ids : resolveServicesByName(it.branchName);
      }).then(function(ids) {
        if (!ids.length) throw new Error('서비스 없음 (스케줄·서비스목록 모두 매칭 실패) — 거래처명 확인 필요');
        var sid = ids[0];
        var chain = Promise.resolve();
        if (driver) {
          chain = chain.then(function() {
            return getForm(it.branchId).then(function(f) {
              setVal(f, 'woolinDriver', driver);
              return postForm(f);
            });
          });
        }
        var okBegin = begin && begin.length === 10;
        var begin1 = okBegin ? (begin.slice(0, 8) + '01') : begin;
        var noGen = (cyc2 === '계획일정없음' || cyc2 === '수기일정생성');
        if (cyc2) {
          if (!noGen) { chain = chain.then(function() { return schedWindowGuard(sid); }); }
          chain = chain.then(function() {
            return driveCycle(sid, cyc2, days2, begin1);
          });
          if (okBegin && noGen) {
            chain = chain.then(function() { return createDelivery(sid, begin); });
          } else if (okBegin) {
            chain = chain.then(function() {
              return waitScheduleReady(sid, 7);
            }).then(function(evs) {
              /* 첫배송일 이전 일정 정리.
                 - 과거 날짜: 서버가 삭제를 거부한다(HTTP 500). 주문도 안 붙으니 건너뛴다.
                 - 미래 날짜 중 삭제 실패(거래명세 연결 등): 모아서 날짜까지 알려주고 승인은 대기로 남긴다.
                 예전엔 삭제 하나 실패하면 어떤 날짜인지도 모른 채 승인 전체가 죽었다. */
              /* 방금 driveCycle 로 생성된 행은 서버 후처리가 도는 동안 삭제가 500으로 튕긴다
                 (같은 행을 몇 분 뒤 손으로 지우면 정상 삭제됨 = 타이밍 문제).
                 → 2초 기다렸다 시작하고, 건별로 실패 시 2초 간격 재시도 3회. 순차 실행. */
              var t = todayStr();
              var targets = [], failed = [];
              var hasFirst = false;
              (evs || []).forEach(function(e) {
                if (e.deliveryDate === begin) { hasFirst = true; }
                if (e.deliveryDate >= begin) { return; }
                if (e.deliveryDate < t) { return; }
                targets.push(e);
              });
              function delRetry(e, tries) {
                return deleteDelivery(sid, e.orderScheduleId, e.deliveryDate).catch(function(err) {
                  if (tries <= 0) { failed.push(e.deliveryDate); return; }
                  return new Promise(function(rs) { setTimeout(rs, 2000); }).then(function() { return delRetry(e, tries - 1); });
                });
              }
              var ch = new Promise(function(rs) { setTimeout(rs, targets.length ? 2000 : 0); });
              targets.forEach(function(e) { ch = ch.then(function() { return delRetry(e, 3); }); });
              return ch.then(function() {
                if (failed.length) {
                  failed.sort();
                  throw new Error('첫배송일(' + begin + ') 이전 일정 삭제 실패: ' + failed.join(', ') + '\n재시도까지 실패했습니다. 오피스 배송일정에서 해당 날짜를 직접 삭제한 뒤, 패널에서 다시 승인하세요.\n(다시 승인해도 주기 재생성으로 같은 날짜가 다시 생기니, 승인 → 실패 시 그때 지우는 순서가 맞습니다)');
                }
                if (!hasFirst) { return createDelivery(sid, begin); }
              });
            });
          }
        }
        return chain.then(function() {
          return '우린담당=' + (driver || '-') + ' · 주기=' + (cyc2 ? cyc2 + (days2.length ? '(' + days2.join(',') + ')' : '') : '-') + ' · 첫배송=' + (begin || '-') + ' · 주기시작=' + (okBegin ? begin1 : '-');
        });
      });
    }
    if (it.action === '주소변경' || it.action === '거래처명변경' || it.action === '담당자변경' || it.action === '코스변경') {
      var d1 = detailGet(it.detail, '반영예정일') || detailGet(it.detail, 'D1반영예정일') || workdayD1Str();
      var wk = ['일', '월', '화', '수', '목', '금', '토'];
      var dp = d1.split('-');
      var dow = (dp.length === 3) ? (wk[new Date(+dp[0], +dp[1] - 1, +dp[2]).getDay()] + '요일') : '';
      var extra = '';
      if (it.action === '주소변경' && it._newCourse) extra = ' · 코스변경=' + it._newCourse;
      return Promise.resolve(d1 + (dow ? ' ' + dow : '') + ' 위펀오피스 반영예정' + extra);
    }
    if (it.action === '배송시간문의') {
      /* 승인 = 조회해서 회신. 오피스에 쓰는 건 없다. */
      var dday = todayStr();
      return dtSchedules(it.branchName, dday).then(function(rows) {
        var mine = rows.filter(function(r) { return nn(r.branch).indexOf(nn(it.branchName)) > -1; });
        if (!mine.length) { mine = rows; }
        if (!mine.length) { return '금일 배송 배정 없음 (배송일이 아니거나 일정 미등록)'; }
        var r0 = mine.filter(function(x) { return x.status === '완료'; })[0] || mine[0];
        return dtManagerId(r0.driver, dday).then(function(mi) {
          var base = ['상태 ' + (r0.status || '-'), '기사 ' + (r0.driver || '-') + (r0.course ? '(' + r0.course + ')' : '')];
          if (r0.meridiem && r0.meridiem !== '없음') { base.push(r0.meridiem + ' 배송'); }
          if (r0.seq) { base.push('순번 ' + r0.seq); }
          if (!mi.mid) { return base.join(' · '); }
          return dtStop(mi.mid, dday, it.branchName).then(function(st) {
            if (st.start) { base.push('업무시작 ' + st.start); }
            if (st.done) { base.push('완료 ' + st.done); }
            (st.before || []).forEach(function(u) { base.push('진열전 ' + u); });
            (st.after || []).forEach(function(u) { base.push('진열후 ' + u); });
            return base.join(' · ');
          });
        });
      }).catch(function(e) { return '조회 실패: ' + ((e && e.message) || e); });
    }
    if (it.action === '수기피킹') {
      return Promise.resolve('수기피킹 요청 (피킹팀 처리)');
    }
    return Promise.reject(new Error('알 수 없는 작업'));
  }

  function approve(it, btn) {
    if (!it || btn.disabled) return;
    var passthru = (it.action === '주소변경' || it.action === '거래처명변경' || it.action === '담당자변경');
    if (it.action === '신규코드발급') {
      var drv = prompt('우린배송담당(코스)을 입력하세요.\n거래처 배송정보의 우린배송담당에 반영됩니다.', '');
      if (drv === null) return;
      it._driver = drv.trim();
    }
    if (it.action === '주소변경') {
      if (confirm('코스를 바꾸시겠습니까?\n(주소 변경으로 배송코스가 달라지면 새 코스를 입력하세요)')) {
        var nc = prompt('새 코스(우린배송담당)를 입력하세요.', it.course || '');
        if (nc !== null && nc.trim()) it._newCourse = nc.trim();
      }
    }
    var pick = (it.action === '수기피킹');
    var dtq = (it.action === '배송시간문의');
    var cfmMsg = dtq ? ('[배송시간문의] 확인 회신\n' + (it.branchName || '') + '\n\n금일 배송 배정·완료시각·진열사진을 조회해 요청자에게 회신합니다.\n(오피스에 반영되는 것은 없습니다)\n\n진행할까요?') : pick ? ('[수기피킹] 완료 처리\n' + (it.branchName || '') + '\n\n피킹팀 처리 완료로 표시하고 요청자에게 알립니다.\n진행할까요?') : passthru ? ('[' + it.action + '] 검토 승인(접수)\n' + (it.branchName || '') + '\n' + addDow(it.detail || '') + (it._newCourse ? '\n코스변경 → ' + it._newCourse : '') + '\n\n승인하면 자회사 코드전달로 접수됩니다. (평일 D+1(' + workdayD1Str() + ') 반영 예정)\n진행할까요?') : ('[' + it.action + '] 승인 · 위펀 오피스에 반영\n' + (it.branchName || '') + '\n' + addDow(it.detail || '') + '\n\n진행할까요?');
    if (!confirm(cfmMsg)) return;
    btn.disabled = true;
    var orig = btn.textContent;
    btn.textContent = '처리중…';
    var rj = btn.parentNode && btn.parentNode.querySelector('.__wpRj');
    if (rj) rj.disabled = true;
    runActionCore(it).then(function(note) {
      return decideReq(it.id, '완료', note || '', it.slackTs);
    }).then(function() {
      toast(dtq ? '✓ 배송시간 확인 회신됐습니다' : pick ? '✓ 수기피킹 완료 처리됐습니다' : (passthru ? ('✓ ' + it.action + ' 접수 · D+1 반영 예정') : ('✓ ' + it.action + ' 완료 처리됐습니다')), '#0a7d47');
      afterDecide(it.id);
    }).catch(function(e) {
      btn.textContent = '확인 중…';
      afterWriteFail(e, it.id, '✓ ' + it.action + ' 완료 (응답 지연 → 서버에서 확인됨)', it.action + ' 반영 실패', function(msg) {
        toast(msg, '#0a7d47');
        afterDecide(it.id);
      }, function(msg) {
        btn.disabled = false;
        btn.textContent = orig;
        if (rj) rj.disabled = false;
        alert(msg);
      });
    });
  } /* 신규코드발급 승인 — 물류승인 1단계로 완료. 설비 요청건은 슬랙에서 자산담당 확인요청이 함께 나감 */
  function approveStage(it, stage, btn) {
    if (!it || btn.disabled) return;
    stage = '물류';
    var drv = prompt('우린배송담당(코스)을 입력하세요.\n거래처 배송정보의 우린배송담당에 반영됩니다.', '');
    if (drv === null) return;
    it._driver = drv.trim();
    var _eqm = /요청설비:\s*([^·]*)/.exec(it.detail || '');
    var _eq = (_eqm && _eqm[1].trim() !== '없음') ? _eqm[1].trim() : '';
    if (!confirm('[물류승인] ' + (it.branchName || '') + '\n우린담당·주기·배송시작일을 오피스에 반영하고 요청을 완료 처리합니다.' + (_eq ? '\n\n설비 요청건 → 슬랙에 @자산관리 확인요청이 함께 발송됩니다.\n · ' + _eq : '') + '\n\n진행할까요?')) return;
    btn.disabled = true;
    var o = btn.textContent;
    btn.textContent = '처리중…';
    var chain = runActionCore(it);
    chain.then(function(note) {
      return decideStage(it.id, stage, note || '', it.slackTs);
    }).then(function() {
      toast(stage + '승인 처리됐습니다', '#0a7d47');
      afterDecide(it.id);
    }).catch(function(e) {
      btn.textContent = '확인 중…';
      /* 물류승인은 완료 처리되지만, 응답이 깨진 경우 처리메모의 '물류승인:' 표시로도 판정 */
      if (e && e.badResponse) {
        reqStatus(it.id).then(function(r) {
          if (r && (String(r.memo || '').indexOf(stage + '승인:') > -1 || (r.status && r.status !== '대기'))) {
            toast(stage + '승인 처리됐습니다 (응답 지연 → 서버에서 확인됨)', '#0a7d47');
            afterDecide(it.id);
            return;
          }
          btn.disabled = false; btn.textContent = o;
          alert(stage + '승인 실패: ' + (e.message || e) + '\n\n서버 확인 결과 아직 반영 안 됐습니다. 다시 시도하세요.');
        }).catch(function() {
          btn.disabled = false; btn.textContent = o;
          alert(stage + '승인 실패: ' + (e.message || e) + '\n\n반영 여부를 확인하지 못했습니다. 목록을 새로고침해 상태를 먼저 확인하세요.');
        });
        return;
      }
      btn.disabled = false;
      btn.textContent = o;
      alert(stage + '승인 실패: ' + (e && e.message || e));
    });
  } /* ---------- 프로필 ---------- */
  function loadProfile() {
    return fetch('/office/common/popup/profile').then(function(r) {
      return r.text();
    }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      REQ.name = (doc.querySelector('[name="name"]') || {}).value || '';
      REQ.email = (doc.querySelector('[name="email"]') || {}).value || '';
      doc.querySelectorAll('th,td,label,dt,div,span').forEach(function(el) {
        if (el.children.length === 0 && el.innerText && el.innerText.replace(/\s+/g, '') === '시스템상부서') {
          var n = el.nextElementSibling;
          if (n) REQ.dept = n.innerText.replace(/\s+/g, ' ').trim();
        }
      });
      document.getElementById('__wpWho').innerHTML = '요청자 · <b>' + esc(REQ.dept) + '</b> / <b>' + esc(REQ.name) + '</b> (' + esc(REQ.email) + ')';
      try { if (REQ.email) localStorage.setItem('__wpProfile', JSON.stringify({ name: REQ.name, email: REQ.email, dept: REQ.dept })); } catch (e) {}
    }).catch(function() {
      document.getElementById('__wpWho').textContent = '요청자 정보를 불러오지 못했습니다(로그인 확인).';
    });
  }

  function ensureProfile() {
    return REQ.email ? Promise.resolve() : loadProfile();
  } /* ================= 배송정보 일괄입력(관리자) ================= */
  function loadScript(src) {
    return new Promise(function(res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = function() {
        rej(new Error('스크립트 로드 실패: ' + src));
      };
      document.head.appendChild(s);
    });
  }

  function ensureXLSX() {
    return window.XLSX ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  }
  function ensureExcel() {
    return window.ExcelJS ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
  }
  function xlsxDownload(rows, cols, sheetName, filename) {
    return ensureExcel().then(function() {
      var wb = new ExcelJS.Workbook();
      var ws = wb.addWorksheet(sheetName);
      var head = rows[0] || [];
      function sameAsHead(r) {
        if (!r || r.length !== head.length) return false;
        for (var i = 0; i < head.length; i++) { if (String(r[i] == null ? '' : r[i]) !== String(head[i] == null ? '' : head[i])) return false; }
        return true;
      }
      rows.forEach(function(r, ri) {
        var row = ws.addRow(r);
        if (ri === 0 || sameAsHead(r)) {
          row.eachCell({ includeEmpty: true }, function(cell) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });
        }
      });
      var ncol = head.length;
      rows.forEach(function(r) { if (r && r.length > ncol) ncol = r.length; });
      for (var c = 0; c < ncol; c++) {
        var w = 6;
        rows.forEach(function(r) { var v = String(r && r[c] != null ? r[c] : ''); var len = 0; for (var x = 0; x < v.length; x++) { len += v.charCodeAt(x) > 127 ? 2 : 1; } if (len > w) w = len; });
        ws.getColumn(c + 1).width = Math.min(60, w + 2);
      }
      return wb.xlsx.writeBuffer();
    }).then(function(buf) {
      var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { if (a.parentNode) a.remove(); URL.revokeObjectURL(a.href); }, 1200);
    });
  }

  function ensurePostcode() {
    return (window.daum && window.daum.Postcode) ? Promise.resolve() : loadScript('https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js');
  }

  function getForm(id, _retry) {
    return fetch('/office/sales/branch/update/' + id).then(function(r) {
      return r.text();
    }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var form = doc.querySelector('form');
      if (!form) throw new Error('수정 폼을 열 수 없음(권한/로그인 확인)');
      return form;
    }).catch(function(e) {
      if (!_retry) { return new Promise(function(rs) { setTimeout(rs, 700); }).then(function() { return getForm(id, true); }); }
      throw e;
    });
  }

    function fixAgreementDoc(root, jq) {
    try {
      var radios = [].slice.call(root.querySelectorAll('input[type=radio]'));
      var yak = null, muyak = null;
      radios.forEach(function(rr) {
        var lt = '';
        if (rr.id) { var lb = root.querySelector('label[for="' + rr.id + '"]'); if (lb) lt = lb.textContent || ''; }
        if (!lt && rr.parentNode && rr.parentNode.tagName === 'LABEL') lt = rr.parentNode.textContent || '';
        if (!lt) { var nx = rr.nextSibling, acc = ''; while (nx && acc.length < 8) { acc += (nx.textContent || nx.nodeValue || ''); nx = nx.nextSibling; } lt = acc; }
        if (lt.indexOf('무약정') > -1) muyak = rr;
        else if (lt.indexOf('약정') > -1) yak = rr;
      });
      if (!(yak && muyak && yak.checked)) return false;
      var per = null;
      [].slice.call(root.querySelectorAll('input')).forEach(function(inp) {
        var nx = inp.nextSibling, acc = ''; while (nx && acc.length < 8) { acc += (nx.textContent || nx.nodeValue || ''); nx = nx.nextSibling; }
        if (acc.indexOf('개월') > -1) per = inp;
      });
      var pv = per ? parseInt(String(per.value).replace(/[^0-9]/g, ''), 10) : NaN;
      if (per && (!pv || pv <= 0)) {
        yak.checked = false;
        muyak.checked = true;
        if (jq) { try { jq(muyak).trigger('click'); jq(muyak).trigger('change'); } catch (_) {} }
        return true;
      }
    } catch (e) {}
    return false;
  }
  function postForm(form) {
    fixAgreementDoc(form, null);
    var fd = new FormData(form);
    form.querySelectorAll('select').forEach(function(s) {
      if (s.name && !fd.has(s.name)) {
        var o = s.querySelector('option[selected]');
        if (o) fd.set(s.name, o.value);
        else if (s.value) fd.set(s.name, s.value);
      }
    });
    return fetch('/office/sales/branch/update', {
      method: 'POST',
      body: new URLSearchParams(fd)
    }).then(function(r) {
      if (!r.ok) throw new Error('저장 실패 HTTP ' + r.status);
    });
  }

  function setVal(form, name, val) {
    var el = form.querySelector('[name="' + name + '"]');
    if (el) el.value = val;
  }

  function getVal(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value : '';
  }

  function parseFile(file) {
    return file.arrayBuffer().then(function(buf) {
      var wb = XLSX.read(buf, {
        type: 'array'
      });
      var ws = wb.Sheets['코드전달'];
      if (!ws) throw new Error("'코드전달' 시트가 없습니다.");
      var arr = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: ''
      });
      var out = [];
      arr.forEach(function(r, i) {
        if (i === 0) return; // 헤더행
        var a = norm(r[0]),
          b = norm(r[1]),
          c = norm(r[2]),
          d = norm(r[3]),
          f = norm(r[5]),
          g = norm(r[6]);
        if (d === '구분') return; // 혹시 남은 헤더
        var raw = d.split(/[,/·]/).map(function(p) {
          return p.trim();
        }).filter(Boolean);
        if (!raw.length && !a && !f) return; // 완전 빈 행만 무시
        var parts = [],
          bad = [];
        raw.forEach(function(p) {
          var n = normPart(p);
          if (VALID[n]) {
            if (parts.indexOf(n) < 0) parts.push(n);
          } else {
            bad.push(p);
          }
        });
        var invalid = (bad.length > 0) || (parts.length === 0);
        out.push({
          row: i + 1,
          name: a,
          addr: b,
          course: c,
          parts: parts,
          raw: d,
          hot: f,
          cold: g,
          kind: parts.indexOf('신규') > -1 ? '신규' : '변경',
          invalid: invalid,
          err: bad.length ? ('인식 불가 구분: ' + bad.join(',') + (raw.length ? ' (원본: ' + d + ')' : '')) : (parts.length === 0 ? '구분 값이 비어 있음' : '')
        });
      });
      return out;
    });
  }

  function splitAddr(b) {
    var main = b,
      detail = '';
    if (b.indexOf('\n') > -1) {
      var p = b.split('\n');
      main = p[0].trim();
      detail = p.slice(1).join(' ').trim();
    } else if (b.indexOf(')') > -1) {
      var i = b.indexOf(')');
      main = b.slice(0, i + 1).trim();
      detail = b.slice(i + 1).replace(/^[,\s]+/, '').trim();
    } else if (b.indexOf(',') > -1) {
      var q = b.split(',');
      main = q[0].trim();
      detail = q.slice(1).join(',').trim();
    } else {
      // 도로명(로/길 + 번호) → 뒤는 상세
      var rm = b.match(/^(.*?(?:로|길)\s?\d+(?:-\d+)?)\s+(\S.*)$/);
      // 지번(동/가/리/읍/면 + 번지) → 뒤는 상세 (예: "논현동 232-3 4층")
      if (!rm) rm = b.match(/^(.*?(?:동|가|리|읍|면|번지)\s*\d+(?:-\d+)?)\s+(\S.*)$/);
      // 최후: 첫 숫자블록(번지/번호) 뒤 공백+나머지
      if (!rm) rm = b.match(/^(.*?\d+(?:-\d+)?)\s+(\S.*)$/);
      if (rm) {
        main = rm[1].trim();
        detail = (rm[2] || '').trim();
      }
    }
    return {
      query: main.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(),
      detail: detail || '-'
    };
  }
  var SIDO = {
    '서울특별시': '서울',
    '부산광역시': '부산',
    '대구광역시': '대구',
    '인천광역시': '인천',
    '광주광역시': '광주',
    '대전광역시': '대전',
    '울산광역시': '울산',
    '세종특별자치시': '세종',
    '경기도': '경기',
    '강원특별자치도': '강원',
    '강원도': '강원',
    '충청북도': '충북',
    '충청남도': '충남',
    '전북특별자치도': '전북',
    '전라북도': '전북',
    '전라남도': '전남',
    '경상북도': '경북',
    '경상남도': '경남',
    '제주특별자치도': '제주'
  };

  function abbrevSido(a) {
    for (var k in SIDO) {
      if (a.indexOf(k) === 0) return SIDO[k] + a.slice(k.length);
    }
    return a;
  }

  function jusoLookup(query) {
    var key = localStorage.getItem('__wdbJusoKey');
    if (!key) return Promise.resolve(null);
    return new Promise(function(resolve) {
      var cb = '__wpJ' + Date.now();
      var to = setTimeout(function() {
        cleanup();
        resolve(null);
      }, 8000);

      function cleanup() {
        clearTimeout(to);
        delete window[cb];
        if (s.parentNode) s.parentNode.removeChild(s);
      }
      window[cb] = function(data) {
        cleanup();
        try {
          var c = data.results && data.results.common;
          if (c && String(c.errorCode) !== '0') {
            blog('⚠️ 주소API 오류(' + c.errorCode + '): ' + esc(c.errorMessage));
            return resolve(null);
          }
          var list = (data.results && data.results.juso) || [];
          if (!list.length) {
            blog('⚠️ 주소API 결과 없음: ' + esc(query));
            return resolve(null);
          }
          var qn = query.replace(/\s+/g, '');
          var m = list.filter(function(j) {
            return (j.roadAddrPart1 || '').replace(/\s+/g, '').indexOf(qn) > -1 || qn.indexOf((j.roadAddrPart1 || '').replace(/\s+/g, '')) > -1;
          });
          if (m.length !== 1) {
            if (list.length === 1) m = list;
            else return resolve(null);
          }
          var j = m[0];
          resolve({
            zonecode: j.zipNo,
            addr: abbrevSido(j.roadAddrPart1 + (j.roadAddrPart2 ? ' ' + j.roadAddrPart2.trim() : '')),
            bcode: j.admCd
          });
        } catch (e) {
          resolve(null);
        }
      };
      var s = document.createElement('script');
      s.src = 'https://business.juso.go.kr/addrlink/addrLinkApiJsonp.do?confmKey=' + encodeURIComponent(key) + '&currentPage=1&countPerPage=10&resultType=json&keyword=' + encodeURIComponent(query) + '&callback=' + cb;
      s.onerror = function() {
        cleanup();
        resolve(null);
      };
      document.head.appendChild(s);
    });
  }

  function widgetPick(query, label) {
    return ensurePostcode().then(function() {
      return new Promise(function(resolve) {
        var box = document.getElementById('__wpAddr');
        box.innerHTML = '<div style="border:2px solid #f0c000;border-radius:8px;padding:8px;margin:8px 0"><b>주소 선택</b> — ' + esc(label) + ' → <code>' + esc(query) + '</code> 맞는 결과 클릭.<div id="__wpPC" style="height:360px;margin-top:6px"></div></div>';
        new daum.Postcode({
          oncomplete: function(d) {
            box.innerHTML = '';
            resolve({
              zonecode: String(d.zonecode),
              addr: d.roadAddress || d.address,
              bcode: String(d.bcode)
            });
          }
        }).embed(document.getElementById('__wpPC'), {
          q: query,
          autoClose: false
        });
      });
    });
  }

  function pickAddress(query, label) {
    return jusoLookup(query).then(function(r) {
      return r || widgetPick(query, label);
    });
  }
  var BLOG = null;

  function blog(html) {
    if (BLOG) {
      BLOG.insertAdjacentHTML('beforeend', '<div>' + html + '</div>');
      BLOG.scrollTop = BLOG.scrollHeight;
    }
  }

  function badge(t, c) {
    return '<b style="color:' + c + '">' + t + '</b>';
  }

  function fail(r, why) {
    results.push([r.row, r.parts.join(','), r.name, '실패', why]);
    blog('❌ ' + esc(r.name) + ' — ' + badge('실패', '#b00') + ' · ' + esc(why));
  }

  function okk(r, msg) {
    results.push([r.row, r.parts.join(','), r.name, '성공', msg]);
    blog('✅ ' + esc(r.name) + ' — ' + badge('성공', '#0a7') + ' · ' + esc(msg));
  }

  function skip(r, msg) {
    results.push([r.row, r.parts.join(','), r.name, '스킵', msg]);
    blog('⏭️ ' + esc(r.name) + ' — ' + badge('스킵', '#888') + ' · ' + esc(msg));
  }

  function processRow(r) {
    if (r.invalid) return Promise.resolve(fail(r, r.err || '구분 인식 실패'));
    if (r.kind === '신규') {
      return searchBranch(r.name).then(function(list) {
        var m = list.filter(function(x) {
          return nn(x.name) === nn(r.name);
        });
        if (!m.length) return fail(r, '거래처 검색 결과 없음');
        if (m.length > 1) return fail(r, '동일 거래처명 ' + m.length + '건 — 수동 확인');
        var t = m[0];
        if (t.cc) {
          if (t.cc === r.hot + r.cold || t.cc === r.hot) return skip(r, '이미 등록됨 (점포코드 일치)');
          return fail(r, '점포코드가 이미 있음(' + t.cc + ') — 수동 확인');
        }
        return getForm(t.id).then(function(form) {
          setVal(form, 'woolinDriver', r.course);
          setVal(form, 'woolinClientCode', r.hot);
          setVal(form, 'eyClientCode', r.cold);
          setVal(form, 'deliveryType', r.course === '스낵택배' ? '택배' : '방문');
          return postForm(form).then(function() {
            okk(r, '배송담당 ' + r.course + ' · ' + r.hot + '/' + r.cold + ' · ' + (r.course === '스낵택배' ? '택배' : '방문'));
          });
        });
      });
    }
    return searchBranch(r.hot).then(function(list) {
      var m = list.filter(function(x) {
        return x.cc === r.hot + r.cold || x.cc === r.hot || (r.cold && x.cc.indexOf(r.hot) === 0 && x.cc.slice(-r.cold.length) === r.cold);
      });
      if (!m.length) return fail(r, '점포코드 ' + r.hot + ' 매칭 없음');
      var sp = null,
        ap = Promise.resolve(null);
      if (r.parts.indexOf('주소변경') > -1) {
        sp = splitAddr(r.addr);
        ap = pickAddress(sp.query, r.name);
      }
      return ap.then(function(ad) {
        var pt = [],
          chain = Promise.resolve();
        m.forEach(function(t) {
          chain = chain.then(function() {
            return getForm(t.id).then(function(form) {
              var msgs = [];
              if (r.parts.indexOf('코스변경') > -1) {
                var cur = getVal(form, 'woolinDriver');
                setVal(form, 'woolinDriver', r.course);
                msgs.push('코스 ' + cur + '→' + r.course);
                /* 배송방법은 조건 없이 항상 같이 맞춘다 (신규 일괄과 동일한 규칙).
                   예전엔 '스낵택배로/에서' 바뀔 때만 손대서, 택배 아닌 코스끼리 옮기면 옛 값이 남았다. */
                var dt = (r.course === '스낵택배') ? '택배' : '방문';
                setVal(form, 'deliveryType', dt);
                msgs.push('배송방법=' + dt);
              }
              if (r.parts.indexOf('거래처명') > -1) {
                setVal(form, 'name', r.name);
                msgs.push('거래처명 변경');
              }
              if (ad) {
                var det2 = (sp.detail && sp.detail !== '-') ? sp.detail : '';
                setVal(form, 'zonecode', ad.zonecode);
                setVal(form, 'address1', ad.addr);
                setVal(form, 'standardRegionCd', ad.bcode);
                setVal(form, 'address2', det2);
                msgs.push('주소 ' + ad.addr + ' (' + ad.zonecode + ')' + (det2 ? ' 상세:' + det2 : ' 상세:(없음)'));
              }
              return postForm(form).then(function() {
                pt.push('#' + t.id + ' ' + (msgs.join(', ') || '변경없음'));
              });
            });
          });
        });
        return chain.then(function() {
          okk(r, (m.length > 1 ? (m.length + '건 매칭 — 모두 반영 · ') : '') + pt.join(' | '));
        });
      });
    });
  }

  /* ---------- 배송일정 일괄 업로드 (주기변경·생성·변경·삭제) ----------
     300건 이상을 패널로 한 건씩 넣는 건 불가능하다. 엑셀로 받아서 순차 반영한다.
     요청큐/슬랙은 타지 않는다 — 물류팀 직접 반영이라 건별 알림이 오히려 소음이 된다. */
  var SB_ACTS = ['배송주기변경', '배송일정생성', '배송일정변경', '배송일정삭제'];

  /* 엑셀 날짜는 serial(숫자) 그대로 받아 XLSX.SSF 로 푼다.
     cellDates:true + Date.getDate() 조합은 KST(+9)에서 하루 당겨진다
     (SheetJS 가 만든 Date 가 로컬 자정 직전이라 날짜가 하나 내려감) → 쓰지 말 것. */
  function sbP2(n) { return (n < 10 ? '0' : '') + n; }
  function sbD(v) {
    if (typeof v === 'number' && isFinite(v) && v > 0) {
      var dc = (window.XLSX && XLSX.SSF && XLSX.SSF.parse_date_code) ? XLSX.SSF.parse_date_code(v) : null;
      if (dc && dc.y) { return dc.y + '-' + sbP2(dc.m) + '-' + sbP2(dc.d); }
    }
    if (v instanceof Date) { return v.getFullYear() + '-' + sbP2(v.getMonth() + 1) + '-' + sbP2(v.getDate()); }
    var m = String(v == null ? '' : v).match(/(\d{4})[-.\/ ]+(\d{1,2})[-.\/ ]+(\d{1,2})/);
    return m ? (m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2)) : '';
  }
  function sbDates(v) {
    /* 숫자(엑셀 serial)와 Date 는 String() 으로 바꾸면 안 된다 — sbD 의 숫자 분기를 못 타고 전부 빈 값이 된다 */
    if (typeof v === 'number' || v instanceof Date) { var one = sbD(v); return one ? [one] : []; }
    return String(v == null ? '' : v).split(/[,\n;]+/).map(function(x) { return sbD(x); }).filter(Boolean);
  }

  function sbTemplate() {
    return ensureXLSX().then(function() {
      var head = ['작업', '점포코드(상온)', '거래처명', '주기', '요일', '날짜1', '날짜2', '비고'];
      var ex = [
        ['배송주기변경', '40677', '', '매주2회', '월,수', '', '', '주기/요일만 채우면 됨'],
        ['배송일정생성', '40677', '', '', '', '2026-08-13,2026-08-20', '', '날짜1에 쉼표로 여러 개'],
        ['배송일정변경', '40677', '', '', '', '2026-08-13', '2026-08-14', '날짜1=기존, 날짜2=변경'],
        ['배송일정삭제', '40677', '', '', '', '2026-08-13,2026-08-20', '', '날짜1에 쉼표로 여러 개']
      ];
      var ws = XLSX.utils.aoa_to_sheet([head].concat(ex));
      ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 34 }, { wch: 18 }, { wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 26 }];
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '배송일정일괄');
      XLSX.writeFile(wb, '배송일정_일괄업로드_양식.xlsx');
    });
  }

  function sbParse(file) {
    return ensureXLSX().then(function() { return file.arrayBuffer(); }).then(function(buf) {
      var wb = XLSX.read(buf, { type: 'array' });   /* cellDates 쓰지 않는다 — sbD 주석 참고 */
      var arr = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      var out = [];
      for (var i = 1; i < arr.length; i++) {
        var r = arr[i] || [];
        var act = norm(r[0]).replace(/\s+/g, '');
        if (!act && !norm(r[1]) && !norm(r[2])) continue;
        out.push({ _row: i + 1, action: act, code: norm(r[1]), name: norm(r[2]), cyc: norm(r[3]).replace(/\s+/g, ''), days: norm(r[4]), d1: sbDates(r[5]), d2: sbD(r[6]), memo: norm(r[7]) });
      }
      return out;
    });
  }

  /* 실행 없이 형식만 본다 — 오피스 조회는 실행 단계에서 한다(300건 사전조회는 너무 느림) */
  function sbCheck(r) {
    if (SB_ACTS.indexOf(r.action) < 0) return '작업명이 올바르지 않음 (' + SB_ACTS.join('/') + ')';
    if (!r.code && !r.name) return '점포코드 또는 거래처명 필요';
    if (r.action === '배송주기변경') {
      if (!r.cyc) return '주기 없음';
      if (CYCLES.indexOf(r.cyc) < 0) return '주기값이 목록에 없음: ' + r.cyc;
      if (/^매주/.test(r.cyc) && !r.days) return '매주 계열은 요일 필요';
      return '';
    }
    if (r.action === '배송일정변경') {
      if (r.d1.length !== 1) return '날짜1(기존배송일) 1개 필요';
      if (!r.d2) return '날짜2(변경배송일) 필요';
      if (r.d1[0] === r.d2) return '기존/변경 날짜가 같음';
      return '';
    }
    if (!r.d1.length) return '날짜1 1개 이상 필요';
    return '';
  }

  function sbDetail(r) {
    if (r.action === '배송주기변경') { var p = ['변경주기: ' + r.cyc]; if (r.days) p.push('변경요일: ' + r.days); return p.join(' · '); }
    if (r.action === '배송일정생성') return '배송일: ' + r.d1.join(',');
    if (r.action === '배송일정삭제') return '삭제일: ' + r.d1.join(',');
    return '기존배송일: ' + r.d1[0] + ' · 변경배송일: ' + r.d2;
  }

  function sbFind(r) {
    var kw = r.code || r.name;
    return searchBranch(kw).then(function(list) {
      if (!list.length) return null;
      if (r.code) {
        var byCode = list.filter(function(x) { return x.cc === r.code || String(x.cc).indexOf(r.code) === 0; });
        if (byCode.length === 1) return byCode[0];
        if (byCode.length > 1) return { _many: byCode.length };
      }
      if (r.name) {
        var byName = list.filter(function(x) { return nn(x.name) === nn(r.name); });
        if (byName.length === 1) return byName[0];
        if (byName.length > 1) return { _many: byName.length };
      }
      return list.length === 1 ? list[0] : { _many: list.length };
    });
  }

  /* 요약 1건 + 상세는 스레드 답글로만 — 채널에 300줄이 쏟아지는 것 방지 */
  function sbSlack(total, ok, ng, res, sblog) {
    var kinds = {};
    res.forEach(function(x) { kinds[x[1]] = (kinds[x[1]] || 0) + 1; });
    var fails = res.filter(function(x) { return x[3] === '실패'; })
      .map(function(x) { return x[0] + '행 ' + x[2] + ' — ' + x[4]; }).join('\n');
    sblog('슬랙 기록 올리는 중…');
    return bulkLogStart({
      title: '배송일정 일괄 반영', name: REQ.name || '', email: REQ.email || '',
      total: total, ok: ok, ng: ng,
      kinds: Object.keys(kinds).map(function(k) { return k + ' ' + kinds[k]; }).join(' · '),
      fails: fails
    }).then(function(ts) {
      if (!ts) { sblog('<span style="color:#b45309">슬랙 기록 실패(요약) — 결과 복사로 대신 남겨주세요.</span>'); return; }
      /* 상세는 3000자 단위로 잘라 스레드에만. 순차로 보내 순서를 지킨다. */
      var lines = res.map(function(x) { return x[0] + '행 | ' + x[1] + ' | ' + x[2] + ' | ' + x[3] + ' | ' + x[4]; });
      var chunks = [], cur = '';
      lines.forEach(function(l) {
        if ((cur + l).length > 3000) { chunks.push(cur); cur = ''; }
        cur += l + '\n';
      });
      if (cur) { chunks.push(cur); }
      var ch = Promise.resolve();
      chunks.slice(0, 12).forEach(function(c, ci) {
        ch = ch.then(function() { return bulkLogReply(ts, '[' + (ci + 1) + '/' + Math.min(chunks.length, 12) + ']\n' + c); });
      });
      return ch.then(function() { sblog('<span style="color:#0a7d47">✓ 슬랙 기록 완료 (요약 1건 + 상세 ' + Math.min(chunks.length, 12) + '개 답글)</span>'); });
    }).catch(function(e) {
      sblog('<span style="color:#b45309">슬랙 기록 실패: ' + esc((e && e.message) || e) + ' — 반영 자체는 끝났습니다.</span>');
    });
  }

  /* ---------- 당일 배송시간 문의 조회 ----------
     슬랙으로 들어온 문구를 그대로 붙여넣으면 오피스 네 화면을 한 번에 훑는다.
       1) 거래처        : 담당코스·점포코드·주소
       2) 배송일정      : 오늘이 배송일인가 / 아니면 다음 배송일
       3) 기사업무현황  : 거래처명으로 역검색 → 담당 기사 후보 (코스가 1:N 이라 코스로는 못 좁힌다)
       4) 기사업무상세  : 그 거래처 블록의 완료시간 / 배송추적: 기사 연락처 */
  var DT_PHONE = null;

  /* 서비스 관리 > 배송기사 관리 — 이름 → 휴대전화. 재직자를 우선한다. 한 번 받으면 캐싱. */
  function dtPhones() {
    if (DT_PHONE) { return Promise.resolve(DT_PHONE); }
    return fetch('/office/delivery-manager/v2/driver?size=500&page=1&searchYN=Y').then(function(r) { return r.text(); }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var map = {};
      [].slice.call(doc.querySelectorAll('table tbody tr')).forEach(function(tr) {
        var td = [].slice.call(tr.querySelectorAll('td'));
        if (td.length < 7) { return; }
        function t(i) { return (td[i] ? (td[i].innerText || '') : '').replace(/\s+/g, ' ').trim(); }
        var nm = t(2), ph = t(3).replace(/[^0-9]/g, ''), live = /재직/.test(t(6));
        if (!nm || !ph) { return; }
        if (!map[nm] || live) { map[nm] = ph; }   /* 동명이인이면 재직자로 덮어쓴다 */
      });
      DT_PHONE = map;
      return map;
    }).catch(function() { DT_PHONE = {}; return DT_PHONE; });
  }



  /* 배송일정 등록 화면 — 거래처명으로 오늘 배정을 바로 준다.
     (manager-tasks 의 키워드는 거래처가 아니라 기사명만 검색된다. 여기가 맞는 화면이다.) */
  function dtSchedules(name, day) {
    var u = '/office/delivery-manager/v2/schedules?searchYN=Y&size=50&page=1&startDate=' + day + '&endDate=' + day +
      '&searchKeyword=' + encodeURIComponent(name);
    return fetch(u).then(function(r) { return r.text(); }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var out = [];
      [].slice.call(doc.querySelectorAll('table tbody tr')).forEach(function(tr) {
        var td = [].slice.call(tr.querySelectorAll('td'));
        if (td.length < 14) { return; }   /* 검색폼 안의 표를 걸러낸다 */
        function t(i) { return (td[i] ? (td[i].innerText || '') : '').replace(/\s+/g, ' ').trim(); }
        out.push({ course: t(2), driver: t(3), seq: t(4), branch: t(5), addr: t(7), status: t(12), meridiem: t(13) });
      });
      return out;
    }).catch(function() { return []; });
  }

  /* 기사명 → deliveryManagerId (완료시각을 보려면 상세 페이지가 필요하다) */
  function dtManagerId(driver, day) {
    if (!driver) { return Promise.resolve(''); }
    var u = '/office/delivery-manager/v2/manager-tasks?searchYN=Y&size=50&page=1&startDate=' + day + '&endDate=' + day +
      '&searchKeyword=' + encodeURIComponent(driver);
    return fetch(u).then(function(r) { return r.text(); }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var rows = [].slice.call(doc.querySelectorAll('table tbody tr')).filter(function(tr) { return tr.querySelectorAll('td').length >= 11; });
      for (var i = 0; i < rows.length; i++) {
        var td = rows[i].querySelectorAll('td');
        var nm = (td[2].innerText || '').replace(/\s+/g, ' ').trim();
        if (nn(nm) !== nn(driver)) { continue; }
        var a = rows[i].querySelector('a[href*="deliveryManagerId="]');
        var mid = a ? ((a.getAttribute('href') || '').match(/deliveryManagerId=(\d+)/) || [])[1] : '';
        return { mid: mid || '', rate: (td[7].innerText || '').trim(), start: (td[9].innerText || '').trim() };
      }
      return { mid: '', rate: '', start: '' };
    }).catch(function() { return { mid: '', rate: '', start: '' }; });
  }

  /* 기사업무 상세 — 스톱 하나당 <table> 하나다. 그 거래처 테이블에서 완료시각과 진열 전/후 사진을 뽑는다. */
  function dtStop(mid, day, branchName) {
    var u = '/office/delivery-manager/v2/manager-tasks/details?deliveryManagerId=' + encodeURIComponent(mid) +
      '&deliveryDateBegin=' + day + '&deliveryDateEnd=' + day;
    return fetch(u).then(function(r) { return r.text(); }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var want = nn(branchName);
      var tbs = [].slice.call(doc.querySelectorAll('table')).filter(function(tb) {
        return nn(tb.innerText || tb.textContent || '').indexOf(want) > -1;
      });
      if (!tbs.length) { return { found: false, done: '', start: '', before: [], after: [] }; }
      var tb = tbs[tbs.length - 1];
      var txt = (tb.innerText || tb.textContent || '');
      var done = (txt.match(/완료\s*시간\s*[:\s]*([0-2]?\d:[0-5]\d(?::[0-5]\d)?)/) || [])[1] || '';
      var st = (txt.match(/업무시작\s*시간\s*[:\s]*([0-2]?\d:[0-5]\d(?::[0-5]\d)?)/) || [])[1] || '';
      /* 한 라벨에 사진이 여러 장일 수 있다. 행 전체에서 순서대로 집으면 진열전 2번째가 진열후로 밀린다.
         → 라벨 셀을 만나면 현재 라벨을 바꾸고, 그 뒤 셀의 이미지를 해당 라벨에 담는다. */
      var before = [], after = [];
      [].slice.call(tb.querySelectorAll('tr')).forEach(function(tr) {
        if (!/진열/.test(tr.innerText || '')) { return; }
        var cur = '';
        [].slice.call(tr.querySelectorAll('td,th')).forEach(function(c) {
          var lab = (c.innerText || '').replace(/\s+/g, '');
          if (lab.indexOf('진열전') > -1) { cur = 'b'; }
          else if (lab.indexOf('진열후') > -1) { cur = 'a'; }
          if (!cur) { return; }
          var ims = [].slice.call(c.querySelectorAll('img')).map(function(x) { return x.getAttribute('src') || ''; }).filter(Boolean);
          if (!ims.length) { return; }
          var tgt = (cur === 'b') ? before : after;
          ims.forEach(function(u) { if (tgt.indexOf(u) < 0) { tgt.push(u); } });
        });
      });
      return { found: true, done: done, start: st, before: before, after: after };
    }).catch(function() { return { found: false, done: '', start: '', before: [], after: [] }; });
  }

  function dtNextDay(br) {
    return resolveSid(br.id, br.name).then(function(ids) {
      if (!ids.length) { return { today: false, next: '', none: true }; }
      return getScheduleEvents(ids[0]).then(function(evs) {
        var t = todayStr();
        var ds = (evs || []).map(function(e) { return e.deliveryDate; }).filter(Boolean).sort();
        var next = ds.filter(function(d) { return d > t; })[0] || '';
        return { today: ds.indexOf(t) > -1, next: next, none: false };
      });
    }).catch(function() { return { today: false, next: '', none: true }; });
  }

  /* 거래처 단건 배송시간 조회 — [작업 요청] 드롭다운에서 호출. 요청 제출이 아니라 조회만 한다. */
  function openDeliveryTime(br, inReview) {
    if (!br) { toast('거래처 정보를 찾을 수 없습니다', '#c0392b'); return; }
    var box = document.getElementById('__wpForm');
    var qr = document.getElementById('__wpQr');
    if (inReview || !box) {
      /* 검토 화면에는 폼 영역이 없다 → 화면 위에 겹쳐 띄운다 */
      var old = document.getElementById('__wpDtOv');
      if (old) { old.remove(); }
      var ov2 = document.createElement('div');
      ov2.id = '__wpDtOv';
      ov2.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(4,12,20,.5);overflow:auto;padding:36px 18px';
      ov2.innerHTML = '<div style="max-width:940px;margin:0 auto;background:#fff;border-radius:12px;padding:16px 18px" id="__wpDtHost"></div>';
      ov2.addEventListener('mousedown', function(e) { if (e.target === ov2) { ov2.remove(); } });
      document.body.appendChild(ov2);
      box = document.getElementById('__wpDtHost');
      qr = null;
    }
    if (qr) { qr.style.display = 'none'; }
    box.innerHTML = '<div class="wp-form"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<b style="font-size:15px">배송시간 문의 · ' + esc(br.name || '') + '</b>' +
      '<button id="__wpDtX" class="wp-btn gh">닫기</button></div>' +
      '<div id="__wpDtR"><div style="color:#94a3b8;padding:12px">조회 중… (배송배정 → 담당기사 → 완료시각 순으로 확인합니다)</div></div></div>';
    document.getElementById('__wpDtX').onclick = function() {
      var ovx = document.getElementById('__wpDtOv');
      if (ovx) { ovx.remove(); return; }
      box.innerHTML = '';
      if (qr) { qr.style.display = 'block'; }
    };
    var day = todayStr();
    dtSchedules(br.name, day).then(function(rows) {
      /* 키워드로 여러 거래처가 걸릴 수 있으니 이 거래처만 남긴다 */
      var mine = rows.filter(function(r) { return nn(r.branch).indexOf(nn(br.name)) > -1; });
      if (!mine.length && rows.length) { mine = rows; }
      if (!mine.length) {
        return dtNextDay(br).then(function(sc) { return dtRender(br, sc, [], {}, inReview); });
      }
      return Promise.all([
        mapLimit(mine, 3, function(r) {
          return dtManagerId(r.driver, day).then(function(mi) {
            r.mid = mi.mid; r.rate = mi.rate; r.wstart = mi.start;
            if (!mi.mid) { return r; }
            return dtStop(mi.mid, day, br.name).then(function(st) { r.stop = st; return r; });
          });
        }),
        dtPhones()
      ]).then(function(res) { return dtRender(br, { today: true, next: '', none: false }, res[0], res[1], inReview); });
    }).catch(function(e) {
      var R = document.getElementById('__wpDtR');
      if (R) { R.innerHTML = '<div style="color:#b00;padding:12px">' + esc((e && e.message) || e) + '</div>'; }
    });
  }

  function dtRender(br, sched, rows, ph, inReview) {
    var R = document.getElementById('__wpDtR');
    if (!R) { return; }
    var doneRow = rows.filter(function(r) { return r.status === '완료'; })[0] || null;
    var goRow = rows.filter(function(r) { return r.status === '출발'; })[0] || null;
    var mer = (rows[0] && rows[0].meridiem && rows[0].meridiem !== '없음') ? rows[0].meridiem : '';
    var state, color, reply;
    if (doneRow) {
      var t = (doneRow.stop && (doneRow.stop.done || doneRow.stop.start)) || '';
      var hm = t ? t.slice(0, 5) : '';
      state = '\u2705 배송 완료' + (t ? ' · ' + t : '');
      color = '#0a7d47';
      reply = '금일 ' + (hm ? hm + ' ' : '') + '배송 완료되었습니다. 확인 부탁드립니다.';
    } else if (goRow) {
      state = '\ud83d\ude9a 배송 중 (기사 출발)'; color = '#1f4e78';
      reply = '담당 기사가 배송 중입니다.' + (mer ? ' 금일 ' + mer + ' 배송 예정 건입니다.' : '') + ' 곧 도착 예정이며 확인 후 회신드리겠습니다.';
    } else if (rows.length) {
      state = '\u23f3 배송 예정 (아직 미출발)'; color = '#b45309';
      reply = '확인 결과 금일 ' + (mer ? mer + ' ' : '') + '배송 예정 건입니다. 담당 기사 확인 후 예정 시간 회신드리겠습니다.';
    } else if (sched.none) {
      state = '\u2754 배송일정(서비스) 확인 필요'; color = '#64748b';
      reply = '확인 후 회신드리겠습니다.';
    } else {
      state = '\u26d4 금일은 배송일이 아닙니다'; color = '#c0392b';
      reply = '확인 결과 금일은 배송일이 아닙니다.' + (sched.next ? ' 다음 배송일은 ' + addDow(sched.next) + ' 입니다.' : '');
    }
    var h = '<div class="wp-meta" style="margin-top:0">' + esc(br.hot || '-') + (br.cold ? '/' + esc(br.cold) : '') +
      (br.course ? ' · 담당코스 <b>' + esc(br.course) + '</b>' : '') + (br.method ? ' · ' + esc(br.method) : '') +
      '<br><span style="color:#94a3b8">' + esc(br.addr || '') + '</span></div>' +
      '<div style="padding:9px 2px;font-size:16px;font-weight:800;color:' + color + '">' + state +
      (mer ? '<span style="font-size:12.5px;font-weight:600;color:#64748b;margin-left:10px">' + esc(mer) + ' 배송</span>' : '') +
      (sched.next && !doneRow ? '<span style="font-size:12.5px;font-weight:600;color:#64748b;margin-left:10px">다음 배송일 ' + esc(addDow(sched.next)) + '</span>' : '') + '</div>';
    if (rows.length) {
      h += '<table class="wp-tbl" style="width:100%"><thead><tr><th style="width:110px">배송코스</th><th style="width:80px">기사</th>' + (IS_ADMIN ? '<th style="width:135px">연락처</th>' : '') + '<th style="width:60px">순번</th><th style="width:70px">상태</th><th style="width:80px">업무시작</th><th style="width:80px">완료</th><th style="width:70px">진행률</th></tr></thead><tbody>';
      rows.forEach(function(r) {
        var pn = IS_ADMIN ? (ph[r.driver] || '') : '';   /* 연락처는 물류팀만 */
        var stStart = (r.stop && r.stop.start) || '';
        var stDone = (r.stop && r.stop.done) || '';
        var sc = r.status === '완료' ? '#0a7d47' : (r.status === '출발' ? '#1f4e78' : '#b45309');
        h += '<tr><td>' + esc(r.course) + '</td><td><b>' + esc(r.driver) + '</b></td>' +
          (IS_ADMIN ? ('<td>' + (pn ? ('<a href="tel:' + esc(pn) + '" style="color:#1f4e78;font-weight:700;text-decoration:none">' + esc(pn) + '</a> <button class="wp-act __wpDtCp" data-p="' + esc(pn) + '" style="height:22px;font-size:11px;padding:0 6px">복사</button>') : '<span style="color:#94a3b8">-</span>') + '</td>') : '') +
          '<td>' + esc(r.seq || '-') + '</td>' +
          '<td><b style="color:' + sc + '">' + esc(r.status || '-') + '</b></td>' +
          '<td>' + (stStart ? esc(stStart) : '<span style="color:#94a3b8">-</span>') + '</td>' +
          '<td>' + (stDone ? '<b style="color:#0a7d47">' + esc(stDone) + '</b>' : '<span style="color:#94a3b8">-</span>') + '</td>' +
          '<td>' + esc(r.rate || '-') + '</td></tr>';
      });
      h += '</tbody></table>';
      /* 진열 전/후 사진 — 완료 건이면 여기서 바로 눈으로 확인된다 */
      var pic = rows.filter(function(r) { return r.stop && ((r.stop.before || []).length || (r.stop.after || []).length); })[0];
      if (pic) {
        var group = function(lab, arr) {
          arr = arr || [];
          var imgs = arr.length
            ? arr.map(function(src) { return '<a href="' + esc(src) + '" target="_blank" rel="noopener"><img src="' + esc(src) + '" style="max-width:190px;max-height:190px;border:1px solid #E2E8F0;border-radius:8px;display:block"></a>'; }).join('')
            : '<div style="width:150px;height:110px;border:1px dashed #CBD5E1;border-radius:8px;color:#94a3b8;font-size:12px;display:flex;align-items:center;justify-content:center">사진 없음</div>';
          return '<div><div style="font-size:12px;color:#475569;font-weight:700;margin-bottom:4px">' + lab + (arr.length > 1 ? ' <span style="color:#94a3b8;font-weight:600">' + arr.length + '장</span>' : '') + '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap">' + imgs + '</div></div>';
        };
        h += '<div style="display:flex;gap:20px;margin-top:12px;flex-wrap:wrap">' + group('진열 전', pic.stop.before) + group('진열 후', pic.stop.after) + '</div>';
      }
    } else {
      h += '<div style="padding:10px 2px;color:#64748b;font-size:13px">금일 이 거래처의 배송 배정이 없습니다.</div>';
    }
    /* 완료면 여기서 끝. 미완료면 물류팀에 확인 요청을 넣는다. */
    if (!doneRow && !inReview) {
      h += '<div style="margin-top:12px;padding-top:11px;border-top:1px solid #E2E8F0">' +
        '<div style="font-size:12.5px;color:#475569;line-height:1.7;margin-bottom:8px">아직 배송이 완료되지 않았습니다. 물류팀에 확인을 요청하면 담당 기사에게 확인 후 회신드립니다.</div>' +
        '<button id="__wpDtReq" class="wp-btn pri">물류팀에 확인 요청</button></div>';
    }
    R.innerHTML = h;
    [].forEach.call(R.querySelectorAll('.__wpDtCp'), function(b) {
      b.onclick = function() { navigator.clipboard.writeText(b.getAttribute('data-p')).then(function() { toast('연락처 복사됨', '#0a7d47'); }); };
    });
    var rq = document.getElementById('__wpDtReq');
    if (rq) {
      rq.onclick = function() {
        var ovx = document.getElementById('__wpDtOv');
        if (ovx) { ovx.remove(); }
        openForm('배송시간문의', br);
      };
    }
  }

  /* ---------- 배송통계 (관리자) ---------- */
  function viewStats() {
    var _n = new Date();
    var stY = _n.getFullYear(), stM = _n.getMonth(); /* 표시 중인 달 */
    var ST_KEY = '__wpStats3'; /* v3: 스낵24+조식24 · 방문 기준 */
    var stSeq = 0; /* 달 이동 시 이전 로딩 무효화 */
    var STMEM = {}; /* 상세용 메모리 캐시: { ds: { drv, amtMap, ready } } — 패널 세션 한정 */
    function stPad(n) { return (n < 10 ? '0' : '') + n; }
    function stDs(y, m, d) { return y + '-' + stPad(m + 1) + '-' + stPad(d); }
    function stToday() { var t = new Date(); return stDs(t.getFullYear(), t.getMonth(), t.getDate()); }
    function stCache() { try { return JSON.parse(localStorage.getItem(ST_KEY)) || {}; } catch (e) { return {}; } }
    function stSave(c) { try { localStorage.setItem(ST_KEY, JSON.stringify(c)); } catch (e) {} }
    function stWon(v) { return '₩' + Number(v || 0).toLocaleString(); }
    function stNn(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

    /* 스낵 건수: 서비스검색 (스낵24·활동·방문) — 미래 포함 모든 날짜 */
    function stCnt(d) {
      var u = '/office/sales/service?searchYN=Y&serviceType=' + encodeURIComponent('스낵24') +
        '&serviceStatus=' + encodeURIComponent('활동') + '&deliveryType=' + encodeURIComponent('방문') + '&size=1&deliveryDate=' + d;
      return fetch(u).then(function(r) { return r.text(); }).then(function(t) {
        var m = t.match(/총\s*([\d,]+)\s*건의 서비스/);
        if (m) return parseInt(m[1].replace(/,/g, ''), 10);
        if (t.indexOf('검색 결과가 없습니다') > -1) return 0;
        throw new Error('건수 파싱 실패');
      });
    }
    /* 거래명세 (서비스별): 방문만 · 주문취소 제외 → { sum, n, map(거래처→금액) } */
    function stStmts(sv, d, page, acc) {
      page = page || 1; acc = acc || { sum: 0, n: 0, map: {} };
      var u = '/office/order/order?searchYN=Y&deliveryDateBegin=' + d + '&deliveryDateEnd=' + d +
        '&serviceTypes=' + encodeURIComponent(sv) + '&size=1000&page=' + page;
      return fetch(u).then(function(r) { return r.text(); }).then(function(t) {
        var doc = new DOMParser().parseFromString(t, 'text/html');
        var rows = [].slice.call(doc.querySelectorAll('table.orderSearchTable tbody tr'));
        rows.forEach(function(tr) {
          var td = tr.querySelectorAll('td');
          if (td.length < 15) return;
          if ((td[10] ? td[10].textContent.trim() : '') === '택배') return; /* 방문만 */
          var cancel = false;
          for (var i = 0; i < td.length; i++) { if (td[i].textContent.trim() === '주문취소') { cancel = true; break; } }
          if (cancel) return;
          var a = td[3].querySelector('a');
          var name = (a ? a.textContent : (td[3].textContent.split('\n')[0] || '')).replace(/\s+/g, ' ').trim();
          var m = (td[4].textContent.match(/₩\s*([\d,]+)/) || [])[1];
          var v = m ? parseInt(m.replace(/,/g, ''), 10) : 0;
          acc.sum += v; acc.n++;
          var k = stNn(name);
          acc.map[k] = (acc.map[k] || 0) + v;
        });
        var tm = t.match(/총\s*([\d,]+)\s*건/);
        var total = tm ? parseInt(tm[1].replace(/,/g, ''), 10) : 0;
        if (rows.length >= 1000 && page * 1000 < total) { return stStmts(sv, d, page + 1, acc); }
        return acc;
      });
    }
    /* 배송일정 등록 (서비스별): 기사별 착지 목록 → { list: [{drv, br}], tot } (과거·당일만 데이터 존재) */
    function stStops(sv, d, page, acc) {
      page = page || 1; acc = acc || { list: [], tot: 0 };
      var u = '/office/delivery-manager/v2/schedules?searchYN=Y&size=1000&page=' + page + '&startDate=' + d + '&endDate=' + d +
        '&serviceTypes=' + encodeURIComponent(sv);
      return fetch(u).then(function(r) { return r.text(); }).then(function(t) {
        var doc = new DOMParser().parseFromString(t, 'text/html');
        var rows = [].slice.call(doc.querySelectorAll('table tbody tr')).filter(function(tr) { return tr.querySelectorAll('td').length >= 14; });
        rows.forEach(function(tr) {
          var td = tr.querySelectorAll('td');
          var drv = (td[3].innerText || '').replace(/\s+/g, ' ').trim() || '(미지정)';
          var raw = (td[5].innerText || '').replace(/\s+/g, ' ').trim();
          var i = raw.indexOf(' - ');
          acc.list.push({ drv: drv, br: i > -1 ? raw.slice(i + 3) : raw });
          acc.tot++;
        });
        var tm = t.match(/총\s*([\d,]+)\s*건/);
        var total = tm ? parseInt(tm[1].replace(/,/g, ''), 10) : 0;
        if (rows.length >= 1000 && page * 1000 < total) { return stStops(sv, d, page + 1, acc); }
        return acc;
      });
    }
    /* 하루치 명세 2종 (스낵+조식) — 셀 금액 + 상세 조인용 맵 */
    function stAmtDay(d) {
      return stStmts('스낵24', d).then(function(s) {
        return stStmts('조식24', d).then(function(j) {
          var map = {};
          Object.keys(s.map).forEach(function(k) { map[k] = (map[k] || 0) + s.map[k]; });
          Object.keys(j.map).forEach(function(k) { map[k] = (map[k] || 0) + j.map[k]; });
          STMEM[d] = STMEM[d] || {};
          STMEM[d].amtMap = map;
          return { as: s.sum, ns: s.n, aj: j.sum, nj: j.n };
        });
      });
    }
    /* 하루치 착지 2종 (스낵+조식) — 셀 착지수 + 상세 기사 목록 */
    function stStopsDay(d) {
      return stStops('스낵24', d).then(function(s) {
        return stStops('조식24', d).then(function(j) {
          var list = s.list.concat(j.list);
          STMEM[d] = STMEM[d] || {};
          STMEM[d].stops = list;
          return { sp: list.length };
        });
      });
    }

    function stCellHtml(d, info, isToday, dow) {
      var day = parseInt(d.slice(8), 10);
      var col = dow === 0 ? '#DC2626' : (dow === 6 ? '#2563EB' : '#334155');
      var h = '<div style="font-size:11.5px;font-weight:700;color:' + col + '">' + day + (isToday ? ' <span style="background:#0EA5E9;color:#fff;border-radius:4px;padding:0 4px;font-size:10px">오늘</span>' : '') + '</div>';
      if (info && (info.ec || info.ea || info.ep)) {
        h += '<div class="__wpStRetry" data-d="' + d + '" style="color:#DC2626;font-size:11px;cursor:pointer;text-decoration:underline">⚠ 재시도</div>';
        return h;
      }
      var past = d < stToday();
      var L = function(label, cnt, amt, color) {
        var s = '<div style="font-size:10.5px;line-height:1.5;white-space:nowrap"><b style="color:' + color + '">' + label + '</b> ';
        s += (typeof cnt === 'number') ? ('<b style="color:#0F172A">' + cnt.toLocaleString() + '</b>') : '<span style="color:#CBD5E1">…</span>';
        if (typeof amt === 'number') s += ' <span style="color:#0a7d47;font-weight:600">' + stWon(amt) + '</span>';
        else if (past) s += ' <span style="color:#CBD5E1">…</span>';
        return s + '</div>';
      };
      if (!info) { return h + '<div style="font-size:11px;color:#94A3B8">…</div>'; }
      h += L('스낵', info.cs, past || d === stToday() ? info.as : undefined, '#0369A1');
      if (past || d === stToday()) {
        h += L('조식', info.nj, info.aj, '#B45309');
        h += '<div style="font-size:10.5px;color:#64748B">착지 ' + (typeof info.sp === 'number' ? '<b>' + info.sp.toLocaleString() + '</b>' : '<span style="color:#CBD5E1">…</span>') + '</div>';
      }
      return h;
    }

    function stRender() {
      var first = new Date(stY, stM, 1), last = new Date(stY, stM + 1, 0);
      var today = stToday();
      var h = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
        '<button id="__wpStPrev" class="wp-btn gh">◀</button>' +
        '<button id="__wpStNext" class="wp-btn gh">▶</button>' +
        '<button id="__wpStNow" class="wp-btn gh">오늘</button>' +
        '<b style="font-size:15px;margin:0 6px">' + stY + '년 ' + (stM + 1) + '월</b>' +
        '<span style="font-size:12px;color:#64748B">스낵24+조식24 · 활동 · 방문 / 금액=거래명세 합계(부가세 포함) / 날짜 클릭=기사별 상세</span>' +
        '<span style="flex:1"></span>' +
        '<span id="__wpStProg" style="font-size:12px;color:#64748B"></span>' +
        '<button id="__wpStRef" class="wp-btn gh">↻ 새로고침</button></div>';
      h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:12px">';
      ['일', '월', '화', '수', '목', '금', '토'].forEach(function(w, i) {
        h += '<div style="text-align:center;font-weight:700;padding:4px 0;color:' + (i === 0 ? '#DC2626' : (i === 6 ? '#2563EB' : '#475569')) + '">' + w + '</div>';
      });
      for (var b = 0; b < first.getDay(); b++) { h += '<div></div>'; }
      for (var dd = 1; dd <= last.getDate(); dd++) {
        var ds = stDs(stY, stM, dd);
        h += '<div id="__wpStC_' + ds + '" data-ds="' + ds + '" style="min-height:76px;border:1px solid #E2E8F0;border-radius:7px;padding:5px 7px;cursor:pointer;background:' + (ds === today ? '#FEF9E7' : '#fff') + '"></div>';
      }
      h += '</div>';
      h += '<div id="__wpStSum" style="margin-top:10px;padding:9px 12px;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;color:#334155"></div>';
      h += '<div id="__wpStDet" style="margin-top:8px"></div>';
      VIEW.innerHTML = h;
      document.getElementById('__wpStPrev').onclick = function() { stM--; if (stM < 0) { stM = 11; stY--; } stRender(); };
      document.getElementById('__wpStNext').onclick = function() { stM++; if (stM > 11) { stM = 0; stY++; } stRender(); };
      document.getElementById('__wpStNow').onclick = function() { var t = new Date(); stY = t.getFullYear(); stM = t.getMonth(); stRender(); };
      document.getElementById('__wpStRef').onclick = function() { stLoad(true); };
      VIEW.onclick = function(ev) { /* onclick 재할당 방식이라 중복 안 쌓임 */
        var el = ev.target;
        if (el && el.className === '__wpStRetry') {
          var c = stCache(); delete c[el.getAttribute('data-d')]; stSave(c); stLoad(false);
          return;
        }
        var dv = null, cell = null, n = el;
        while (n && n !== VIEW) {
          if (n.getAttribute) {
            if (!dv && n.getAttribute('data-drv') !== null) dv = n.getAttribute('data-drv');
            if (n.getAttribute('data-ds')) { cell = n.getAttribute('data-ds'); break; }
          }
          n = n.parentNode;
        }
        if (dv !== null && !cell) { stDrvToggle(dv); return; } /* 상세 내 기사 행 클릭 */
        if (cell) stDetail(cell);
      };
      stDetSel = '';
      stLoad(false);
    }

    function stPaint(ds, info) {
      var el = document.getElementById('__wpStC_' + ds);
      if (!el) return;
      var dow = new Date(ds.slice(0, 4), parseInt(ds.slice(5, 7), 10) - 1, parseInt(ds.slice(8), 10)).getDay();
      el.innerHTML = stCellHtml(ds, info, ds === stToday(), dow);
    }

    /* ---------- 상세: 기사별 → 거래처별 ---------- */
    var stDetSel = '';
    var stDetOpen = {}; /* 펼쳐진 기사 */
    function stDrvToggle(drv) {
      stDetOpen[drv] = !stDetOpen[drv];
      stDetDraw();
    }
    function stDetDraw() {
      var det = document.getElementById('__wpStDet');
      if (!det || !stDetSel) return;
      var ds = stDetSel;
      var mem = STMEM[ds] || {};
      var c = stCache();
      var v = c[ds] || {};
      var dowN = ['일', '월', '화', '수', '목', '금', '토'][new Date(ds.slice(0, 4), parseInt(ds.slice(5, 7), 10) - 1, parseInt(ds.slice(8), 10)).getDay()];
      var head = ds.slice(5, 7).replace(/^0/, '') + '월 ' + ds.slice(8).replace(/^0/, '') + '일 (' + dowN + ')';
      var h = '<div style="padding:10px 12px;background:#fff;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px;color:#334155">';
      var amtTot = (typeof v.as === 'number' ? v.as : 0) + (typeof v.aj === 'number' ? v.aj : 0);
      h += '<div style="font-weight:800;font-size:13px;margin-bottom:7px">' + head + ' 기사별 상세' +
        ' <span style="font-weight:600;color:#64748B">— 착지 <b style="color:#0F172A">' + (mem.stops ? mem.stops.length.toLocaleString() : '…') + '</b>' +
        (mem.stops ? ' · 기사 <b style="color:#0F172A">' + Object.keys(stGroup(mem.stops)).length + '명</b>' : '') +
        ' · 매출 <b style="color:#0a7d47">' + ((typeof v.as === 'number' || typeof v.aj === 'number') ? stWon(amtTot) : '조회중…') + '</b>' +
        ' <span style="color:#94A3B8;font-size:11.5px">(기사를 클릭하면 거래처·금액이 펼쳐집니다)</span></span></div>';
      if (mem.loading) { h += '<div style="color:#94A3B8">착지 정보 불러오는 중…</div></div>'; det.innerHTML = h; return; }
      if (mem.error) { h += '<div style="color:#B91C1C">조회 실패 — 날짜를 다시 클릭해주세요.</div></div>'; det.innerHTML = h; return; }
      if (!mem.stops || !mem.stops.length) { h += '<div style="color:#94A3B8">배송일정이 아직 등록되지 않은 날입니다 (기사 배정 전).</div></div>'; det.innerHTML = h; return; }
      var grp = stGroup(mem.stops); /* drv → [{br, amt}] */
      var arr = Object.keys(grp).map(function(k) {
        var sum = 0; grp[k].forEach(function(x) { if (typeof x.amt === 'number') sum += x.amt; });
        return { drv: k, list: grp[k], sum: sum };
      }).sort(function(a, b) { return b.list.length - a.list.length || b.sum - a.sum; });
      h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
      h += '<tr style="background:#F8FAFC;color:#475569"><th style="text-align:left;padding:5px 8px;border-bottom:1px solid #E2E8F0">기사</th>' +
        '<th style="text-align:right;padding:5px 8px;border-bottom:1px solid #E2E8F0;width:70px">착지</th>' +
        '<th style="text-align:right;padding:5px 8px;border-bottom:1px solid #E2E8F0;width:130px">금액</th></tr>';
      arr.forEach(function(g) {
        var open = !!stDetOpen[g.drv];
        h += '<tr data-drv="' + esc(g.drv) + '" style="cursor:pointer;border-bottom:1px solid #F1F5F9;background:' + (open ? '#EFF6FF' : '#fff') + '">' +
          '<td style="padding:5px 8px;font-weight:600">' + (open ? '▾ ' : '▸ ') + esc(g.drv) + '</td>' +
          '<td style="padding:5px 8px;text-align:right">' + g.list.length + '</td>' +
          '<td style="padding:5px 8px;text-align:right;color:#0a7d47;font-weight:600">' + stWon(g.sum) + '</td></tr>';
        if (open) {
          var items = g.list.slice().sort(function(a, b) { return (b.amt || 0) - (a.amt || 0); });
          h += '<tr><td colspan="3" style="padding:0 8px 8px 22px;background:#F8FAFC">';
          h += '<table style="width:100%;border-collapse:collapse;font-size:11.5px">';
          items.forEach(function(x, i) {
            h += '<tr style="border-bottom:1px dashed #E2E8F0"><td style="padding:3px 6px;color:#334155">' + (i + 1) + '. ' + esc(x.br) + '</td>' +
              '<td style="padding:3px 6px;text-align:right;width:120px;' + (typeof x.amt === 'number' ? 'color:#0a7d47' : 'color:#94A3B8') + '">' +
              (typeof x.amt === 'number' ? stWon(x.amt) : '명세없음') + '</td></tr>';
          });
          h += '</table></td></tr>';
        }
      });
      h += '</table></div>';
      det.innerHTML = h;
    }
    function stGroup(stops) {
      var mem = STMEM[stDetSel] || {};
      var map = mem.amtMap || {};
      var grp = {};
      stops.forEach(function(s) {
        if (!grp[s.drv]) grp[s.drv] = [];
        var k = stNn(s.br);
        grp[s.drv].push({ br: s.br, amt: (map[k] !== undefined) ? map[k] : null });
      });
      return grp;
    }
    function stDetail(ds) {
      var det = document.getElementById('__wpStDet');
      if (!det) return;
      stDetSel = ds; stDetOpen = {};
      [].forEach.call(VIEW.querySelectorAll('[data-ds]'), function(x) {
        x.style.boxShadow = x.getAttribute('data-ds') === ds ? '0 0 0 2px #F97316' : '';
      });
      var mem = STMEM[ds] = STMEM[ds] || {};
      var need = [];
      if (!mem.stops) need.push(stStopsDay(ds));
      if (!mem.amtMap && ds <= stToday()) need.push(stAmtDay(ds).then(function(res) {
        var cc = stCache(); cc[ds] = cc[ds] || {};
        cc[ds].as = res.as; cc[ds].aj = res.aj; cc[ds].nj = res.nj; cc[ds].ta = Date.now(); stSave(cc);
      }));
      if (!need.length) { stDetDraw(); return; }
      mem.loading = true; mem.error = false;
      stDetDraw();
      Promise.all(need).then(function() {
        mem.loading = false;
        if (stDetSel === ds) stDetDraw();
      }).catch(function() {
        mem.loading = false; mem.error = true;
        delete mem.stops;
        if (stDetSel === ds) stDetDraw();
      });
    }

    function stSummary(days) {
      var el = document.getElementById('__wpStSum');
      if (!el) return;
      var c = stCache(), cs = 0, as = 0, nj = 0, aj = 0, sp = 0, missC = 0;
      days.forEach(function(ds) {
        var v = c[ds];
        if (v && typeof v.cs === 'number') cs += v.cs; else missC++;
        if (v && typeof v.as === 'number') as += v.as;
        if (v && typeof v.nj === 'number') nj += v.nj;
        if (v && typeof v.aj === 'number') aj += v.aj;
        if (v && typeof v.sp === 'number') sp += v.sp;
      });
      el.innerHTML = '<b>이번 달 합계</b>' +
        ' · <b style="color:#0369A1">스낵</b> <b>' + cs.toLocaleString() + '건</b>' + (missC ? ' (조회중 ' + missC + '일)' : '') + ' <b style="color:#0a7d47">' + stWon(as) + '</b>' +
        ' · <b style="color:#B45309">조식</b> <b>' + nj.toLocaleString() + '건</b> <b style="color:#0a7d47">' + stWon(aj) + '</b>' +
        ' · 착지 <b>' + sp.toLocaleString() + '</b>' +
        ' · 총매출 <b style="color:#0a7d47">' + stWon(as + aj) + '</b> <span style="color:#94A3B8;font-size:11.5px">(조식·착지·매출은 지나간 날짜 누적)</span>';
    }

    function stLoad(force) {
      var seq = ++stSeq;
      var today = stToday();
      var nowMs = Date.now();
      var last = new Date(stY, stM + 1, 0).getDate();
      var days = [];
      for (var dd = 1; dd <= last; dd++) { days.push(stDs(stY, stM, dd)); }
      var c = stCache();
      if (force) { days.forEach(function(ds) { delete c[ds]; delete STMEM[ds]; }); stSave(c); }
      /* 캐시 유효성: 과거 영구 / 오늘 10분 / 금액·착지: 최근2일 6시간 */
      function fOk(ds, val, tKey) {
        var v = c[ds]; if (!v || typeof v[val] !== 'number') return false;
        if (ds > today) return (nowMs - (v[tKey] || 0)) < 600000;
        if (ds === today) return (nowMs - (v[tKey] || 0)) < 600000;
        var d2 = new Date(nowMs - 2 * 86400000);
        var lim = stDs(d2.getFullYear(), d2.getMonth(), d2.getDate());
        if (ds < lim) return true;
        return (nowMs - (v[tKey] || 0)) < 21600000;
      }
      days.forEach(function(ds) { stPaint(ds, c[ds]); });
      stSummary(days);
      var tasks = [];
      days.forEach(function(ds) { if (!fOk(ds, 'cs', 't')) tasks.push({ d: ds, k: 'c' }); });
      days.forEach(function(ds) { if (ds <= today && !fOk(ds, 'as', 'ta')) tasks.push({ d: ds, k: 'a' }); });
      days.forEach(function(ds) { if (ds <= today && !fOk(ds, 'sp', 'tp')) tasks.push({ d: ds, k: 'p' }); });
      var done = 0, totalT = tasks.length;
      var prog = document.getElementById('__wpStProg');
      function upProg() { if (prog) prog.textContent = (done < totalT) ? ('조회 ' + done + '/' + totalT) : ''; }
      upProg();
      if (!tasks.length) return;
      var idx = 0;
      function worker() {
        if (seq !== stSeq) return Promise.resolve();
        if (idx >= tasks.length) return Promise.resolve();
        var t = tasks[idx++];
        var p;
        if (t.k === 'c') {
          p = stCnt(t.d).then(function(n) { var cc = stCache(); cc[t.d] = cc[t.d] || {}; cc[t.d].cs = n; cc[t.d].t = Date.now(); delete cc[t.d].ec; stSave(cc); });
        } else if (t.k === 'a') {
          p = stAmtDay(t.d).then(function(res) { var cc = stCache(); cc[t.d] = cc[t.d] || {}; cc[t.d].as = res.as; cc[t.d].aj = res.aj; cc[t.d].nj = res.nj; cc[t.d].ta = Date.now(); delete cc[t.d].ea; stSave(cc); });
        } else {
          p = stStopsDay(t.d).then(function(res) { var cc = stCache(); cc[t.d] = cc[t.d] || {}; cc[t.d].sp = res.sp; cc[t.d].tp = Date.now(); delete cc[t.d].ep; stSave(cc); });
        }
        return p.catch(function() { var cc = stCache(); cc[t.d] = cc[t.d] || {}; cc[t.d][t.k === 'c' ? 'ec' : (t.k === 'a' ? 'ea' : 'ep')] = 1; stSave(cc); })
          .then(function() {
            if (seq !== stSeq) return;
            done++; upProg();
            var cc = stCache();
            stPaint(t.d, cc[t.d]);
            stSummary(days);
            if (stDetSel === t.d && (t.k === 'a' || t.k === 'p')) stDetDraw(); /* 상세 열려있으면 갱신 */
            return worker();
          });
      }
      var pool = [];
      for (var w = 0; w < 3; w++) { pool.push(worker()); }
    }

    stRender();
  }

  /* ---------- 기사통계 (관리자) — 월별 기사 착지·금액 (스낵/조식) ---------- */
  function viewKStats() {
    var _n = new Date();
    var kY = _n.getFullYear(), kM = _n.getMonth();
    var ST_KEY = '__wpStats3'; /* 배송통계와 캐시 공유 (dv 필드) */
    var kSeq = 0;
    var KMEM = { stops: {}, maps: {} }; /* 세션 내 원본 메모 */
    var KSORT = { k: 'ts', d: -1 }; /* 정렬: 총착지 내림차순 기본 */
    var KMASTER = {"김성제":"개별지입","기양일":"사업소득자","이재용":"창호통운","석철홍":"대산물류","최정규":"개별지입","김현중":"창호통운","진용국":"창호통운","최영수B":"창호통운","최현우":"창호통운","손기동":"창호통운","강영규":"창호통운","이정송":"창호통운","허훈":"창호통운","송대욱":"창호통운","김유건":"대산물류","장윤구":"창호통운","김정현":"창호통운","정현우":"창호통운","이청룡":"개별지입","박남규":"창호통운","김건민":"창호통운","박택호":"대산물류","고재학":"창호통운","조민혁":"창호통운","김용환":"창호통운","최영수":"개별지입","이원근":"개별지입","임현철":"창호통운","김종범":"개별지입","장원":"개별지입","유재복":"개별지입","천명학":"개별지입","조현군":"창호통운","김환":"창호통운","최장일":"위풀","박성창":"위풀","김홍범":"위풀","김형곤":"위풀","박경용":"위풀","임문재":"위풀","이경섭":"위풀","이기찬":"위풀","강윤동":"위풀","조숭":"위풀","박종민":"위풀","전은탁":"위풀","김태회":"핫픽스","야간박재석":"대산물류","현재선":"대산물류","고동훈":"대산물류","남기수":"대산물류","야간신정근":"대산물류","야간진수완":"대산물류","이윤필":"대산물류","박완욱":"대산물류","김현기":"대산물류","야간최호식":"대산물류","야간김재영":"대산물류","야간손태민":"대산물류","야간강민석":"대산물류","야간김경중":"대산물류","이선현":"대산물류","야간이광영":"대산물류","야간손백수":"대산물류","윤경수":"대산물류","윤경수B":"대산물류","정영진":"대산물류","김태호":"대산물류","장현진":"대산물류","야간엄민용":"대산물류","야간김동한":"대산물류","백재희":"대산물류","야간강정훈":"대산물류","야간김민수":"대산물류","구지훈":"핫픽스","천호민":"핫픽스","김태영":"핫픽스","박귀태":"핫픽스","민영찬":"핫픽스","서세원B":"핫픽스","선현호":"핫픽스","소찬형":"핫픽스","이세형":"핫픽스","양원준":"핫픽스","이진우":"핫픽스","임성묵":"핫픽스","정우관":"핫픽스","최권용":"핫픽스","김영진":"핫픽스","조주형":"핫픽스","김건":"핫픽스","윤호수":"핫픽스","한상덕":"핫픽스","이요한":"핫픽스","정종훈":"핫픽스","이종오":"핫픽스","최윤섭":"핫픽스","방석현":"핫픽스","장동혁":"핫픽스","김천호":"핫픽스","이현재":"핫픽스","김무성":"핫픽스","강민석":"대산물류","최우진":"대산물류","손백수":"대산물류","최대규":"대산물류","김동혁":"대산물류","최호식":"대산물류","원유빈":"대산물류","이번우":"대산물류","신정근":"대산물류","이종범":"대산물류","차인오":"대산물류","손태민":"대산물류","조영진":"대산물류","엄민용":"대산물류","홍성관":"핫픽스","김민수":"대산물류","진수완":"대산물류","김재영":"대산물류","송현종":"핫픽스","김선태":"핫픽스","서해영":"핫픽스","장승환":"대산물류","여형석":"대산물류","홍현욱":"대산물류","박준수":"대산물류","정관홍":"대산물류","황윤영":"창호통운","권대장":"대산물류","이수현":"대산물류","홍재선":"대산물류","용환명":"대산물류","강정훈":"대산물류","차병준":"대산물류","심재욱":"창호통운","김경중":"대산물류","안정선":"대산물류","손동석":"대산물류","김동한":"대산물류","윤세호":"대산물류","권규섭":"대산물류","이광영":"대산물류","김경식":"대산물류","심상은":"대산물류","김우규":"대산물류","김남헌":"창호통운","서용원":"핫픽스","황철희":"핫픽스","서세원":"핫픽스","이수호":"핫픽스","정재훈":"핫픽스","정주영":"핫픽스","한대식":"핫픽스","이봉완":"핫픽스","고영철":"핫픽스","박상영":"핫픽스","고태현":"핫픽스","정민규":"핫픽스"};
    var KM_CUR = KMASTER; /* 실사용 마스터 = 내장 + 서버 저장분 병합 */
    var KLAST = []; /* 마지막 렌더 데이터 (엑셀용) */
    var KFILT = ''; /* 소속 필터 (칩 클릭) */
    var KBELS = ['핫픽스', '대산물류', '창호통운', '위풀', '개별지입', '사업소득자'];
    function kBelong(n) { var b = KM_CUR[n] || KM_CUR[String(n).replace(/^야간/, '')] || '-'; return b === '위펀' ? '핫픽스' : b; }
    function kCfgLoad() {
      var loc = null;
      try { loc = JSON.parse(localStorage.getItem('__wpDrvMaster')); } catch (e) {}
      if (loc) KM_CUR = Object.assign({}, KMASTER, loc);
      return fetch(apiUrl() + '?e=cfg_get&k=driver_master').then(function(r) { return r.json(); }).then(function(j) {
        if (j && j.ok && j.v) {
          var sv = JSON.parse(j.v);
          KM_CUR = Object.assign({}, KMASTER, sv);
          try { localStorage.setItem('__wpDrvMaster', JSON.stringify(sv)); } catch (e) {}
        }
      }).catch(function() {});
    }
    function kCfgSave(obj) {
      var body = 'e=cfg_set&k=driver_master&v=' + encodeURIComponent(JSON.stringify(obj));
      return fetch(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body })
        .then(function(r) { return r.json(); }).then(function(j) {
          if (!j || !j.ok) throw new Error('저장 실패');
          KM_CUR = Object.assign({}, KMASTER, obj);
          try { localStorage.setItem('__wpDrvMaster', JSON.stringify(obj)); } catch (e) {}
        });
    }
    function kDisp(n) { var m = String(n).match(/^야간(.+)$/); if (m) return esc(m[1]) + ' <span style="background:#0B1220;color:#E2E8F0;border-radius:4px;padding:0 5px;font-size:10px;font-weight:700;vertical-align:1px">야간</span>'; return esc(n); }
    var KBELC = { '핫픽스': '#DBEAFE;color:#1D4ED8', '대산물류': '#DCFCE7;color:#15803D', '창호통운': '#EDE9FE;color:#6D28D9', '위풀': '#FFEDD5;color:#C2410C', '개별지입': '#F1F5F9;color:#475569', '사업소득자': '#F1F5F9;color:#475569' };
    function kBelChip(b) { if (b === '-') return '<span style="color:#CBD5E1">-</span>'; var c = KBELC[b] || '#F1F5F9;color:#475569'; return '<span style="background:' + c + ';border-radius:5px;padding:1px 7px;font-size:11px;font-weight:700;white-space:nowrap">' + esc(b) + '</span>'; }
    function kPad(n) { return (n < 10 ? '0' : '') + n; }
    function kDs(y, m, d) { return y + '-' + kPad(m + 1) + '-' + kPad(d); }
    function kToday() { var t = new Date(); return kDs(t.getFullYear(), t.getMonth(), t.getDate()); }
    function kCache() { try { return JSON.parse(localStorage.getItem(ST_KEY)) || {}; } catch (e) { return {}; } }
    function kSave(c) { try { localStorage.setItem(ST_KEY, JSON.stringify(c)); } catch (e) {} }
    function kWon(v) { return '₩' + Number(v || 0).toLocaleString(); }
    function kNn(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

    function kStmts(sv, d, page, acc) {
      var mk = sv + '|' + d;
      if (!page && KMEM.maps[mk]) return Promise.resolve(KMEM.maps[mk]);
      page = page || 1; acc = acc || { sum: 0, n: 0, map: {}, miss: [] };
      var u = '/office/order/order?searchYN=Y&deliveryDateBegin=' + d + '&deliveryDateEnd=' + d +
        '&serviceTypes=' + encodeURIComponent(sv) + '&size=1000&page=' + page;
      return fetch(u).then(function(r) { return r.text(); }).then(function(t) {
        var doc = new DOMParser().parseFromString(t, 'text/html');
        var rows = [].slice.call(doc.querySelectorAll('table.orderSearchTable tbody tr'));
        rows.forEach(function(tr) {
          var td = tr.querySelectorAll('td');
          if (td.length < 15) return;
          if ((td[10] ? td[10].textContent.trim() : '') === '택배') return;
          var cancel = false;
          for (var i = 0; i < td.length; i++) { if (td[i].textContent.trim() === '주문취소') { cancel = true; break; } }
          if (cancel) return;
          var a = td[3].querySelector('a');
          var name = (a ? a.textContent : (td[3].textContent.split('\n')[0] || '')).replace(/\s+/g, ' ').trim();
          var m = (td[4].textContent.match(/₩\s*([\d,]+)/) || [])[1];
          var v = m ? parseInt(m.replace(/,/g, ''), 10) : 0;
          acc.sum += v; acc.n++;
          var k = kNn(name);
          acc.map[k] = (acc.map[k] || 0) + v;
          var mi = (td[19] ? td[19].textContent.replace(/\s+/g, ' ').trim() : '');
          if (mi && mi !== '-') acc.miss.push(name); /* 미출 처리 요청/처리중/완료 */
        });
        var tm = t.match(/총\s*([\d,]+)\s*건/);
        var total = tm ? parseInt(tm[1].replace(/,/g, ''), 10) : 0;
        if (rows.length >= 1000 && page * 1000 < total) { return kStmts(sv, d, page + 1, acc); }
        KMEM.maps[mk] = acc;
        return acc;
      });
    }
    function kStops(sv, d, page, acc) {
      var mk = sv + '|' + d;
      if (!page && KMEM.stops[mk]) return Promise.resolve(KMEM.stops[mk]);
      page = page || 1; acc = acc || { list: [] };
      var u = '/office/delivery-manager/v2/schedules?searchYN=Y&size=1000&page=' + page + '&startDate=' + d + '&endDate=' + d +
        '&serviceTypes=' + encodeURIComponent(sv);
      return fetch(u).then(function(r) { return r.text(); }).then(function(t) {
        var doc = new DOMParser().parseFromString(t, 'text/html');
        var rows = [].slice.call(doc.querySelectorAll('table tbody tr')).filter(function(tr) { return tr.querySelectorAll('td').length >= 14; });
        rows.forEach(function(tr) {
          var td = tr.querySelectorAll('td');
          var drv = (td[3].innerText || '').replace(/\s+/g, ' ').trim() || '(미지정)';
          var raw = (td[5].innerText || '').replace(/\s+/g, ' ').trim();
          var i = raw.indexOf(' - ');
          acc.list.push({ drv: drv, br: i > -1 ? raw.slice(i + 3) : raw });
        });
        var tm = t.match(/총\s*([\d,]+)\s*건/);
        var total = tm ? parseInt(tm[1].replace(/,/g, ''), 10) : 0;
        if (rows.length >= 1000 && page * 1000 < total) { return kStops(sv, d, page + 1, acc); }
        KMEM.stops[mk] = acc;
        return acc;
      });
    }
    /* 하루치 기사 집계: dv = { 기사: [스낵착지, 스낵금액, 조식착지, 조식금액] } + 배송통계용 필드도 같이 채움 */
    function kDrvDay(d) {
      return kStops('스낵24', d).then(function(ss) {
        return kStops('조식24', d).then(function(js) {
          return kStmts('스낵24', d).then(function(sm) {
            return kStmts('조식24', d).then(function(jm) {
              var dv = {};
              function add(list, map, io) {
                list.forEach(function(x) {
                  if (!dv[x.drv]) dv[x.drv] = [0, 0, 0, 0, 0]; /* ss, sa, js, ja, 미출 */
                  dv[x.drv][io] += 1;
                  var amt = map[kNn(x.br)];
                  if (typeof amt === 'number') dv[x.drv][io + 1] += amt;
                });
              }
              add(ss.list, sm.map, 0);
              add(js.list, jm.map, 2);
              /* 미출: 명세의 미출 표시를 착지의 기사와 조인 → [거래처, 기사] */
              var brDrv = {};
              ss.list.concat(js.list).forEach(function(x) { brDrv[kNn(x.br)] = x.drv; });
              var ms = [];
              sm.miss.concat(jm.miss).forEach(function(nm) {
                var dvr = brDrv[kNn(nm)] || '-';
                ms.push([nm, dvr]);
                if (dv[dvr]) dv[dvr][4] += 1;
              });
              return { dv: dv, ms: ms, sp: ss.list.length + js.list.length, as: sm.sum, aj: jm.sum, nj: jm.n };
            });
          });
        });
      });
    }

    function kRender() {
      var h = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
        '<button id="__wpKPrev" class="wp-btn gh">◀</button>' +
        '<button id="__wpKNext" class="wp-btn gh">▶</button>' +
        '<button id="__wpKNow" class="wp-btn gh">이번달</button>' +
        '<b style="font-size:15px;margin:0 6px">' + kY + '년 ' + (kM + 1) + '월</b>' +
        '<span style="font-size:12px;color:#64748B">기사별 월 누적 · 스낵24/조식24 · 방문 / 금액=거래명세 합계(부가세 포함)</span>' +
        '<span style="flex:1"></span>' +
        '<span id="__wpKProg" style="font-size:12px;color:#64748B"></span>' +
        '<button id="__wpKMiss" class="wp-btn gh">미출 스팟</button>' +
        '<button id="__wpKXls" class="wp-btn gh">⬇ 엑셀</button>' +
        '<button id="__wpKMstBtn" class="wp-btn gh">기사마스터</button>' +
        '<button id="__wpKRef" class="wp-btn gh">↻ 새로고침</button></div>' +
        '<div id="__wpKSum" style="padding:9px 12px;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;color:#334155;margin-bottom:8px"></div>' +
        '<div id="__wpKMst" style="display:none;margin-bottom:8px"></div>' +
        '<div style="display:flex;gap:8px;align-items:flex-start"><div id="__wpKTbl" style="flex:1.7;min-width:0"></div><div id="__wpKMissBox" style="flex:1;min-width:0;display:none;position:sticky;top:0"></div></div>';
      VIEW.innerHTML = h;
      document.getElementById('__wpKXls').onclick = function() { kXls(); };
      document.getElementById('__wpKMiss').onclick = function() { kMissToggle(); };
      document.getElementById('__wpKMstBtn').onclick = function() { kMstToggle(); };
      document.getElementById('__wpKPrev').onclick = function() { kM--; if (kM < 0) { kM = 11; kY--; } kRender(); };
      document.getElementById('__wpKNext').onclick = function() { kM++; if (kM > 11) { kM = 0; kY++; } kRender(); };
      document.getElementById('__wpKNow').onclick = function() { var t = new Date(); kY = t.getFullYear(); kM = t.getMonth(); kRender(); };
      document.getElementById('__wpKRef').onclick = function() { kLoad(true); };
      kLoad(false);
    }

    function kDays() {
      var last = new Date(kY, kM + 1, 0).getDate();
      var out = [];
      for (var dd = 1; dd <= last; dd++) { out.push(kDs(kY, kM, dd)); }
      return out;
    }

    function kTable(days) {
      var c = kCache();
      var agg = {}, aggDays = 0, missing = 0;
      var today = kToday();
      days.forEach(function(ds) {
        if (ds > today) return;
        var v = c[ds];
        if (!v || !v.dv) { missing++; return; }
        aggDays++;
        var seen = {};
        Object.keys(v.dv).forEach(function(k) {
          var m = String(k).match(/^야간(.+)$/);
          var base = m ? m[1] : k;
          if (!agg[base]) agg[base] = { v: [0, 0, 0, 0, 0], wd: 0, day: false, night: false };
          for (var i = 0; i < 5; i++) agg[base].v[i] += v.dv[k][i] || 0;
          if (m) agg[base].night = true; else agg[base].day = true;
          if (!seen[base]) { seen[base] = 1; agg[base].wd += 1; }
        });
      });
      var arr = Object.keys(agg).map(function(k) {
        var g = agg[k], a = g.v;
        var ts = a[0] + a[2];
        return { drv: k, bel: kBelong(k), badge: g.night ? (g.day ? '주/야간' : '야간') : '', ss: a[0], sa: a[1], js: a[2], ja: a[3], ts: ts, ta: a[1] + a[3], wd: g.wd, avg: g.wd ? Math.round(ts / g.wd * 10) / 10 : 0, ms: a[4] || 0, rate: ts ? Math.round((a[4] || 0) / ts * 1000) / 10 : 0 };
      });
      var sk = KSORT.k, sd = KSORT.d;
      arr.sort(function(x, y) {
        var a = x[sk], b = y[sk];
        if (typeof a === 'string') { return a < b ? -sd : (a > b ? sd : (y.ts - x.ts)); }
        return (a - b) * sd || y.ts - x.ts;
      });
      var tot = { ss: 0, sa: 0, js: 0, ja: 0, ts: 0, ta: 0, ms: 0 };
      var byBel = {};
      arr.forEach(function(x) {
        tot.ss += x.ss; tot.sa += x.sa; tot.js += x.js; tot.ja += x.ja; tot.ts += x.ts; tot.ta += x.ta; tot.ms += x.ms;
        if (!byBel[x.bel]) byBel[x.bel] = { n: 0, ts: 0, ta: 0, avg: 0 };
        byBel[x.bel].n++; byBel[x.bel].ts += x.ts; byBel[x.bel].ta += x.ta; byBel[x.bel].avg += x.avg;
      });
      var sum = document.getElementById('__wpKSum');
      if (sum) {
        var h0 = '<b>' + (kM + 1) + '월 합계</b> (' + aggDays + '일 집계' + (missing ? ' · 조회중 ' + missing + '일' : '') + ')' +
          ' · 기사 <b>' + arr.length + '명</b>' +
          ' · <b style="color:#0369A1">스낵</b> <b>' + tot.ss.toLocaleString() + '착</b> <b style="color:#0a7d47">' + kWon(tot.sa) + '</b>' +
          ' · <b style="color:#B45309">조식</b> <b>' + tot.js.toLocaleString() + '착</b> <b style="color:#0a7d47">' + kWon(tot.ja) + '</b>' +
          ' · 총 <b>' + tot.ts.toLocaleString() + '착</b> <b style="color:#0a7d47">' + kWon(tot.ta) + '</b>' +
          ' · 미출 <b style="color:#DC2626">' + tot.ms.toLocaleString() + '건</b> (누락율 <b style="color:#DC2626">' + (tot.ts ? Math.round(tot.ms / tot.ts * 1000) / 10 : 0) + '%</b>)';
        /* 고정 순서: 핫픽스 → 대산 → 창호 → 위풀 → 나머지 / 클릭 = 해당 소속만 필터 */
        var bels = KBELS.filter(function(b) { return byBel[b]; })
          .concat(Object.keys(byBel).filter(function(b) { return KBELS.indexOf(b) < 0; }).sort());
        h0 += '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:5px">';
        bels.forEach(function(bl) {
          var v = byBel[bl];
          var on = KFILT === bl;
          h0 += '<span data-kbel="' + esc(bl) + '" style="border:1.5px solid ' + (on ? '#0EA5E9' : '#E2E8F0') + ';background:' + (on ? '#F0F9FF' : '#fff') + ';border-radius:6px;padding:2px 9px;font-size:11.5px;white-space:nowrap;cursor:pointer;user-select:none">' +
            kBelChip(bl) + ' 기사 <b>' + v.n + '</b> · 착지 <b>' + v.ts.toLocaleString() + '</b> · 금액 <b style="color:#0a7d47">' + kWon(v.ta) + '</b> · 기사당 일평균 <b>' + (v.n ? Math.round(v.avg / v.n * 10) / 10 : 0) + '착</b>' + (on ? ' ✕' : '') + '</span>';
        });
        h0 += '</div>';
        sum.innerHTML = h0;
        [].forEach.call(sum.querySelectorAll('[data-kbel]'), function(ch) {
          ch.onclick = function() {
            var b = ch.getAttribute('data-kbel');
            KFILT = (KFILT === b) ? '' : b;
            kTable(days);
          };
        });
      }
      var el = document.getElementById('__wpKTbl');
      if (!el) return;
      if (!arr.length) { el.innerHTML = '<div style="padding:14px;color:#94A3B8;font-size:12.5px;border:1px solid #E2E8F0;border-radius:7px;background:#fff">집계된 데이터가 없습니다.</div>'; KLAST = []; return; }
      var viewArr = KFILT ? arr.filter(function(x) { return x.bel === KFILT; }) : arr;
      KLAST = viewArr; /* 엑셀 = 현재 화면(필터 반영) */
      function th(label, key, extra) {
        var on = sk === key;
        var arrow = on ? (sd === -1 ? ' ▾' : ' ▴') : '';
        return '<th data-sk="' + key + '" style="text-align:' + (key === 'bel' || key === 'drv' ? 'left' : 'right') + ';padding:6px 10px;border-bottom:1px solid #E2E8F0;cursor:pointer;user-select:none;white-space:nowrap;' + (extra || '') + (on ? 'color:#0F172A;background:#EFF6FF' : '') + '">' + label + arrow + '</th>';
      }
      var h = '<div style="border:1px solid #E2E8F0;border-radius:7px;overflow:auto;background:#fff">' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
        '<tr style="background:#F8FAFC;color:#475569">' +
        th('구분', 'bel') + th('기사', 'drv') +
        th('스낵 착지', 'ss') + th('스낵 금액', 'sa') +
        th('조식 착지', 'js') + th('조식 금액', 'ja') +
        th('총 착지', 'ts', 'background:#F1F5F9;') + th('총 금액', 'ta', 'background:#F1F5F9;') +
        th('근무일', 'wd') + th('일평균 착지', 'avg') + th('미출', 'ms') + th('누락율', 'rate') + '</tr>';
      viewArr.forEach(function(x, i) {
        var hot = x.avg >= 15; /* 일평균 15착 이상 하이라이트 (과부하 후보) */
        var nm = esc(x.drv) + (x.badge ? ' <span style="background:#0B1220;color:#E2E8F0;border-radius:4px;padding:0 5px;font-size:10px;font-weight:700;vertical-align:1px">' + x.badge + '</span>' : '');
        h += '<tr style="border-bottom:1px solid #F1F5F9;background:' + (i % 2 ? '#FCFDFE' : '#fff') + '">' +
          '<td style="padding:5px 10px">' + kBelChip(x.bel) + '</td>' +
          '<td style="padding:5px 10px;font-weight:600;white-space:nowrap">' + (i + 1) + '. ' + nm + '</td>' +
          '<td style="padding:5px 10px;text-align:right">' + (x.ss ? x.ss.toLocaleString() : '-') + '</td>' +
          '<td style="padding:5px 10px;text-align:right;color:#0a7d47">' + (x.sa ? kWon(x.sa) : '-') + '</td>' +
          '<td style="padding:5px 10px;text-align:right">' + (x.js ? x.js.toLocaleString() : '-') + '</td>' +
          '<td style="padding:5px 10px;text-align:right;color:#0a7d47">' + (x.ja ? kWon(x.ja) : '-') + '</td>' +
          '<td style="padding:5px 10px;text-align:right;font-weight:700;background:#FAFBFC">' + x.ts.toLocaleString() + '</td>' +
          '<td style="padding:5px 10px;text-align:right;font-weight:700;color:#0a7d47;background:#FAFBFC">' + kWon(x.ta) + '</td>' +
          '<td style="padding:5px 10px;text-align:right">' + x.wd + '</td>' +
          '<td style="padding:5px 10px;text-align:right;font-weight:700;' + (hot ? 'color:#DC2626' : '') + '">' + x.avg + '</td>' +
          '<td style="padding:5px 10px;text-align:right;' + (x.ms ? 'color:#DC2626;font-weight:700' : 'color:#CBD5E1') + '">' + (x.ms || '-') + '</td>' +
          '<td style="padding:5px 10px;text-align:right;font-weight:700;' + (x.rate >= 10 ? 'color:#DC2626' : (x.rate >= 5 ? 'color:#D97706' : 'color:#64748B')) + '">' + (x.ts ? x.rate + '%' : '-') + '</td></tr>';
      });
      h += '</table></div>' +
        '<div style="font-size:11.5px;color:#94A3B8;margin-top:5px">* 열 제목 클릭 = 정렬 · 야간/주간 같은 이름은 한 행으로 합산 (뱃지로 구분) · 일평균 착지 15 이상은 빨간색 (증차/코스조정 검토 후보) · 근무일 = 해당 월에 배송 배정이 있었던 날 수</div>';
      el.innerHTML = h;
      [].forEach.call(el.querySelectorAll('th[data-sk]'), function(t) {
        t.onclick = function() {
          var k = t.getAttribute('data-sk');
          if (KSORT.k === k) { KSORT.d = -KSORT.d; } else { KSORT.k = k; KSORT.d = (k === 'bel' || k === 'drv') ? 1 : -1; }
          kTable(days);
        };
      });
    }

    /* ---------- 엑셀 다운로드 ---------- */
    function kXls() {
      if (!KLAST.length) { alert('내보낼 데이터가 없습니다. 집계가 끝난 뒤 다시 시도하세요.'); return; }
      var rows = [['구분', '기사', '주/야간', '스낵 착지', '스낵 금액', '조식 착지', '조식 금액', '총 착지', '총 금액', '근무일', '일평균 착지', '미출', '누락율(%)']];
      KLAST.forEach(function(x) {
        rows.push([x.bel, x.drv, x.badge || '주간', x.ss, x.sa, x.js, x.ja, x.ts, x.ta, x.wd, x.avg, x.ms, x.rate]);
      });
      var fname = '기사통계_' + kY + '-' + kPad(kM + 1) + '.xlsx';
      xlsxDownload(rows, [{ wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 9 }, { wch: 13 }, { wch: 9 }, { wch: 13 }, { wch: 9 }, { wch: 14 }, { wch: 7 }, { wch: 10 }], '기사통계', fname)
        .then(function() { toast('✓ ' + fname, '#0a7d47'); })
        .catch(function(e) { alert('엑셀 생성 실패: ' + ((e && e.message) || e)); });
    }
    /* ---------- 미출 스팟 (반복 미출 탐지) ---------- */
    function kMissToggle() {
      var box = document.getElementById('__wpKMissBox');
      if (!box) return;
      if (box.style.display !== 'none') { box.style.display = 'none'; box.innerHTML = ''; return; }
      box.style.display = '';
      kMissRender();
    }
    function kMissRender() {
      var box = document.getElementById('__wpKMissBox');
      if (!box) return;
      var c = kCache();
      var spots = {}; /* brKey → { br, n, byDrv, dates } */
      var today = kToday();
      kDays().forEach(function(ds) {
        if (ds > today) return;
        var v = c[ds];
        if (!v || !v.ms) return;
        v.ms.forEach(function(m) {
          var br = m[0], dvr = m[1];
          var k = kNn(br);
          if (!spots[k]) spots[k] = { br: br, n: 0, byDrv: {}, dates: [] };
          spots[k].n++;
          spots[k].byDrv[dvr] = (spots[k].byDrv[dvr] || 0) + 1;
          spots[k].dates.push(ds.slice(5).replace('-', '/'));
        });
      });
      var arr = Object.keys(spots).map(function(k) { return spots[k]; }).sort(function(a, b) { return b.n - a.n; });
      var totMiss = 0; arr.forEach(function(x) { totMiss += x.n; });
      var rep = arr.filter(function(x) { return x.n >= 2; });
      var h = '<div style="padding:10px 12px;background:#fff;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px;color:#334155">';
      h += '<div style="font-weight:800;font-size:13px;margin-bottom:4px">미출 스팟 — 이번 달 미출 <b style="color:#DC2626">' + totMiss.toLocaleString() + '건</b> · 거래처 ' + arr.length + '곳 · <b style="color:#DC2626">2회 이상 반복 ' + rep.length + '곳</b></div>' +
        '<div style="font-size:11.5px;color:#94A3B8;margin-bottom:8px">같은 스팟에서 미출이 반복되면 "미출 나도 인입 안 되는 거래처"로 굳어졌을 가능성 — 반복 순으로 정렬</div>';
      if (!arr.length) {
        h += '<div style="color:#94A3B8">집계된 미출이 없습니다. (집계가 끝나야 표시됩니다)</div></div>';
        box.innerHTML = h; return;
      }
      h += '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
        '<tr style="background:#F8FAFC;color:#475569"><th style="text-align:left;padding:5px 8px;border-bottom:1px solid #E2E8F0">거래처</th>' +
        '<th style="text-align:right;padding:5px 8px;border-bottom:1px solid #E2E8F0;width:60px">미출</th>' +
        '<th style="text-align:left;padding:5px 8px;border-bottom:1px solid #E2E8F0;width:220px">기사</th>' +
        '<th style="text-align:left;padding:5px 8px;border-bottom:1px solid #E2E8F0;width:230px">발생일</th></tr>';
      arr.slice(0, 200).forEach(function(x, i) {
        var drvs = Object.keys(x.byDrv).sort(function(a, b) { return x.byDrv[b] - x.byDrv[a]; })
          .map(function(d2) { return kDisp(d2 === '-' ? '(미배정)' : d2) + (x.byDrv[d2] > 1 ? ' <b>×' + x.byDrv[d2] + '</b>' : ''); }).join(', ');
        h += '<tr style="border-bottom:1px solid #F1F5F9;background:' + (x.n >= 2 ? '#FFF7F7' : (i % 2 ? '#FCFDFE' : '#fff')) + '">' +
          '<td style="padding:4px 8px;font-weight:600">' + esc(x.br) + '</td>' +
          '<td style="padding:4px 8px;text-align:right;font-weight:700;color:' + (x.n >= 2 ? '#DC2626' : '#64748B') + '">' + x.n + '</td>' +
          '<td style="padding:4px 8px">' + drvs + '</td>' +
          '<td style="padding:4px 8px;color:#64748B">' + x.dates.join(', ') + '</td></tr>';
      });
      h += '</table>';
      if (arr.length > 200) h += '<div style="font-size:11.5px;color:#94A3B8;margin-top:4px">* 상위 200곳만 표시</div>';
      h += '</div>';
      box.innerHTML = h;
    }
    /* ---------- 기사마스터 관리 ---------- */
    function kMstToggle() {
      var box = document.getElementById('__wpKMst');
      if (!box) return;
      if (box.style.display !== 'none') { box.style.display = 'none'; box.innerHTML = ''; return; }
      box.style.display = '';
      kMstRender();
    }
    function kMstRender() {
      var box = document.getElementById('__wpKMst');
      if (!box) return;
      /* 이번 달 데이터에 등장한 기사 (병합 전 원본 이름) */
      var seen = {};
      var c = kCache();
      kDays().forEach(function(ds) { var v = c[ds]; if (v && v.dv) Object.keys(v.dv).forEach(function(k) { seen[String(k).replace(/^야간/, '')] = 1; }); });
      var names = {};
      Object.keys(KM_CUR).forEach(function(n) { if (!/^야간/.test(n)) names[n] = 1; });
      Object.keys(seen).forEach(function(n) { names[n] = 1; });
      var un = [], as2 = [];
      Object.keys(names).sort().forEach(function(n) { (kBelong(n) === '-' ? un : as2).push(n); });
      function selHtml(n) {
        var cur = kBelong(n);
        var o = '<option value="">- 선택 -</option>';
        KBELS.forEach(function(b) { o += '<option value="' + b + '"' + (cur === b ? ' selected' : '') + '>' + b + '</option>'; });
        return '<select data-kmn="' + esc(n) + '" style="padding:3px 6px;border:1px solid #E2E8F0;border-radius:5px;font-size:12px">' + o + '</select>';
      }
      var h = '<div style="padding:10px 12px;background:#fff;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px;color:#334155">';
      h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><b>기사마스터</b>' +
        '<input id="__wpKMname" placeholder="기사 이름" style="padding:4px 8px;border:1px solid #E2E8F0;border-radius:5px;font-size:12px;width:110px">' +
        '<select id="__wpKMbel" style="padding:4px 6px;border:1px solid #E2E8F0;border-radius:5px;font-size:12px">' + KBELS.map(function(b) { return '<option>' + b + '</option>'; }).join('') + '</select>' +
        '<button id="__wpKMadd" class="wp-btn gh" style="padding:4px 10px">추가</button>' +
        '<span style="flex:1"></span>' +
        '<button id="__wpKMsave" class="wp-btn ok" style="padding:5px 14px">저장</button>' +
        '<span style="font-size:11.5px;color:#94A3B8">저장하면 관리자 전원에게 공통 적용</span></div>';
      if (un.length) {
        h += '<div style="margin-bottom:6px"><b style="color:#DC2626">미지정 (' + un.length + ')</b></div>';
        h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px;margin-bottom:10px">';
        un.forEach(function(n) { h += '<div style="display:flex;gap:6px;align-items:center;padding:2px 4px;background:#FEF2F2;border-radius:5px"><span style="flex:1;font-weight:600">' + esc(n) + '</span>' + selHtml(n) + '</div>'; });
        h += '</div>';
      }
      h += '<div style="margin-bottom:6px"><b>등록됨 (' + as2.length + ')</b></div>';
      h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px;max-height:320px;overflow:auto">';
      as2.forEach(function(n) { h += '<div style="display:flex;gap:6px;align-items:center;padding:2px 4px"><span style="flex:1">' + esc(n) + '</span>' + selHtml(n) + '</div>'; });
      h += '</div></div>';
      box.innerHTML = h;
      document.getElementById('__wpKMadd').onclick = function() {
        var nm = (document.getElementById('__wpKMname').value || '').replace(/\s+/g, ' ').trim();
        if (!nm) { alert('기사 이름을 입력하세요.'); return; }
        KM_CUR = Object.assign({}, KM_CUR);
        KM_CUR[nm.replace(/^야간/, '')] = document.getElementById('__wpKMbel').value;
        kMstRender();
        toast('추가됨 — [저장]을 눌러야 반영됩니다', '#0369A1');
      };
      document.getElementById('__wpKMsave').onclick = function() {
        var self = this;
        var obj = {};
        Object.keys(KM_CUR).forEach(function(n) { obj[n] = KM_CUR[n]; }); /* 기존 전체 유지 */
        [].forEach.call(box.querySelectorAll('select[data-kmn]'), function(sl) {
          var n = sl.getAttribute('data-kmn'), v = sl.value;
          if (v) obj[n] = v; else delete obj[n];
        });
        self.disabled = true; self.textContent = '저장 중…';
        kCfgSave(obj).then(function() {
          self.disabled = false; self.textContent = '저장';
          toast('✓ 기사마스터 저장 완료', '#0a7d47');
          kMstRender();
          kTable(kDays());
        }).catch(function(e) {
          self.disabled = false; self.textContent = '저장';
          alert('저장 실패: ' + ((e && e.message) || e));
        });
      };
    }

    function kLoad(force) {
      var seq = ++kSeq;
      var today = kToday();
      var nowMs = Date.now();
      var days = kDays();
      var c = kCache();
      if (force) { days.forEach(function(ds) { if (c[ds]) { delete c[ds].dv; delete c[ds].tdv; } KMEM.stops = {}; KMEM.maps = {}; }); kSave(c); }
      function dvOk(ds) {
        var v = c[ds]; if (!v || !v.dv || v.ms === undefined) return false;
        if (ds >= today) return (nowMs - (v.tdv || 0)) < 600000; /* 오늘 10분 */
        var d2 = new Date(nowMs - 2 * 86400000);
        var lim = kDs(d2.getFullYear(), d2.getMonth(), d2.getDate());
        if (ds < lim) return true; /* 과거 영구 */
        return (nowMs - (v.tdv || 0)) < 21600000; /* 최근 2일 6시간 */
      }
      kTable(days);
      var tasks = [];
      days.forEach(function(ds) { if (ds <= today && !dvOk(ds)) tasks.push(ds); });
      var done = 0, totalT = tasks.length, kFails = 0;
      var prog = document.getElementById('__wpKProg');
      function upProg() { if (prog) prog.textContent = (done < totalT) ? ('집계 ' + done + '/' + totalT + '일' + (kFails ? ' · 실패 ' + kFails : '')) : (kFails ? '⚠ ' + kFails + '일 집계 실패 — 새로고침으로 재시도' : ''); }
      upProg();
      if (!tasks.length) return;
      var idx = 0;
      function worker() {
        if (seq !== kSeq) return Promise.resolve();
        if (idx >= tasks.length) return Promise.resolve();
        var ds = tasks[idx++];
        return kDrvDay(ds).then(function(res) {
          var cc = kCache(); cc[ds] = cc[ds] || {};
          cc[ds].dv = res.dv; cc[ds].ms = res.ms; cc[ds].tdv = Date.now();
          /* 배송통계 캐시도 같이 채움 (탭 왕래 시 중복 조회 방지) */
          if (typeof cc[ds].sp !== 'number') { cc[ds].sp = res.sp; cc[ds].tp = Date.now(); }
          if (typeof cc[ds].as !== 'number') { cc[ds].as = res.as; cc[ds].aj = res.aj; cc[ds].nj = res.nj; cc[ds].ta = Date.now(); }
          kSave(cc);
        }).catch(function() { kFails++; })
          .then(function() {
            if (seq !== kSeq) return;
            done++; upProg();
            kTable(days);
            var mb = document.getElementById('__wpKMissBox'); if (mb && mb.style.display !== 'none') kMissRender();
            return worker();
          });
      }
      var pool = [];
      for (var w = 0; w < 2; w++) { pool.push(worker()); }
    }

    kRender();
    kCfgLoad().then(function() { kTable(kDays()); }); /* 서버 마스터 도착하면 구분 갱신 */
  }

  /* ---------- 배차 (관리자) — 배송동선 라우팅 ---------- */
  function viewDispatch() {
    var DEXC = ['주간15', '주간19', '주간20', '주간21', '주간22', '주간100']; /* 위펀본사 코스 제외 */
    var DDRV = [["주간01","강민석","대산물류","강남/서초"],["주간02","최우진","대산물류","강남/서초"],["주간03","손백수","대산물류","강남/서초"],["주간04","최대규","대산물류","광주/용인/수원/화성"],["주간05","김동혁","대산물류","안양/과천/의왕/군포"],["주간06","최호식","대산물류","인천"],["주간07","원유빈","대산물류","성동/중랑/성북/노원/남양주"],["주간08","이번우","대산물류","마포/고양/파주"],["주간09","신정근","대산물류","하남/강동/송파"],["주간10","이종범","대산물류","영등포/양천"],["주간11","차인오","대산물류","강남/서초"],["주간12","손태민","대산물류","성남"],["주간13","조영진","대산물류","중구/종로"],["주간14","엄민용","대산물류","강남/서초"],["주간16","김민수","대산물류","성동/광진/송파"],["주간17","진수완","대산물류","영등포/강서"],["주간18","김재영","대산물류","강남/서초"],["주간23","장승환","대산물류","중구/종로"],["주간24","여형석","대산물류","강남/서초"],["주간25","홍현욱","대산물류","성남/송파"],["주간26","박준수","대산물류","강남/서초"],["주간27","정관홍","대산물류","강남/서초"],["주간28","황윤영","창호통운","성남"],["주간29","권대장","대산물류","금천"],["주간30","이수현","대산물류","마포/서대문"],["주간31","홍재선","대산물류","용산/중구/종로"],["주간32","용환명","대산물류","강남/서초"],["주간33","강정훈","대산물류","강남/서초"],["주간34","차병준","대산물류","금천/구로/동작/관악"],["주간35","심재욱","창호통운","강남/서초"],["주간36","김경중","대산물류","강남/서초"],["주간37","안정선","대산물류","용산/중구/종로"],["주간38","손동석","대산물류","부천/강서/영등포"],["주간39","김동한","대산물류","동작/관악/구로"],["주간40","윤세호","대산물류","광주/용인/수원/화성"],["주간41","권규섭","대산물류","마포/서대문/고양/은평/파주"],["주간42","이광영","대산물류","강남/서초"],["주간43","김경식","대산물류","마포/영등포"],["주간44","심상은","대산물류","성남"],["주간45","김우규","대산물류","강남/서초"],["주간46","김남헌","창호통운","강남/서초"]]; /* [코스, 기사, 소속, 권역] */
    var DCAP = 3000000; /* 코스당 금액 상한 */
    var DLOOK = 14; /* 고정 자동감지 lookback 일수 */
    var DTGT = null, DRES = null, DFIX_AUTO = null, DFIX_OVR = {};
    function dnn(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }
    function dBase(a) { var i = a.indexOf(')'); return i > -1 ? a.slice(0, i + 1) : a; }
    function dRegion(addr) {
      var p = String(addr).split(' ');
      if (p[0] === '서울') { var g = p[1] || ''; return g === '중구' ? '중구' : g.replace(/구$/, ''); }
      if (p[0] === '인천') return '인천';
      if (p[0] === '경기') return (p[1] || '').replace(/시$/, '');
      return p[0];
    }
    function dDist(a, b) { if (!a || !b) return 999; var dx = (a.x - b.x) * 88, dy = (a.y - b.y) * 111; return Math.sqrt(dx * dx + dy * dy); }
    function dKey(br) { var i = br.indexOf(' - '); return dnn(i > -1 ? br.slice(i + 3) : br); }

    VIEW.innerHTML = '<div style="padding:9px 12px;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px;color:#334155;line-height:1.7;margin-bottom:10px">' +
      '<b>배송동선 엑셀 → 타 운수사 코스 자동 배차</b><br>' +
      '위펀오피스 [판매/정산 > 우린 발주양식 > 배송동선] 엑셀을 올리면: 주간 코스(위펀본사 ' + DEXC.join('·') + ' 제외)를 ' +
      '권역 + 고정담당 + 코스당 300만원 이하 + 같은 건물 같은 기사 규칙으로 배차하고 동선 순서까지 정렬합니다.</div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
      '<label style="font-size:12.5px;color:#334155">배송일 <input type="date" id="__wpDpDate" style="padding:4px 6px;border:1px solid #E2E8F0;border-radius:5px"></label>' +
      '<button id="__wpDpRun" class="wp-btn pri">배차 실행 (오피스에서 자동 다운로드)</button>' +
      '<span style="font-size:11.5px;color:#94A3B8">파일로 하려면 →</span><input type="file" id="__wpDpF" accept=".xlsx,.xls" style="font-size:11.5px">' +
      '<button id="__wpDpXls" class="wp-btn ok" disabled>⬇ 라우팅 엑셀</button>' +
      '<button id="__wpDpFix" class="wp-btn gh" disabled>고정 스팟 관리</button>' +
      '<span id="__wpDpProg" style="font-size:12px;color:#64748B"></span></div>' +
      '<div id="__wpDpFixBox" style="display:none;margin-bottom:8px"></div>' +
      '<div id="__wpDpOut"></div>';
    var LOG = document.getElementById('__wpDpProg');
    (function() { var d = new Date(); d.setDate(d.getDate() + 1); document.getElementById('__wpDpDate').value = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); })();
    function dlog(m) { if (LOG) LOG.textContent = m; }

    /* 서버 고정 오버라이드 로드 */
    fetch(apiUrl() + '?e=cfg_get&k=fix_master').then(function(r) { return r.json(); }).then(function(j) {
      if (j && j.ok && j.v) { try { DFIX_OVR = JSON.parse(j.v) || {}; } catch (e) {} }
    }).catch(function() {});

    /* 고정 자동감지: 최근 N일 배송일정에서 스팟별 최다 기사 (하루 1회 localStorage 캐시) */
    function dFixAuto() {
      if (DFIX_AUTO) return Promise.resolve(DFIX_AUTO);
      var today = now().slice(0, 10);
      try {
        var c = JSON.parse(localStorage.getItem('__wpFixAuto'));
        if (c && c.d === today && c.m) { DFIX_AUTO = c.m; return Promise.resolve(DFIX_AUTO); }
      } catch (e) {}
      var days = [];
      for (var i = 1; i <= DLOOK; i++) { var d = new Date(); d.setDate(d.getDate() - i); days.push(d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)); }
      var freq = {}; /* key → { drv: n } */
      var idx = 0;
      function one() {
        if (idx >= days.length * 2) {
          var m = {};
          Object.keys(freq).forEach(function(k) {
            var best = '', bn = 0;
            Object.keys(freq[k]).forEach(function(dv) { if (freq[k][dv] > bn) { bn = freq[k][dv]; best = dv; } });
            m[k] = best;
          });
          DFIX_AUTO = m;
          try { localStorage.setItem('__wpFixAuto', JSON.stringify({ d: today, m: m })); } catch (e) {}
          return Promise.resolve(m);
        }
        var day = days[Math.floor(idx / 2)];
        var sv = idx % 2 === 0 ? '스낵24' : '조식24';
        idx++;
        dlog('고정담당 분석 중… ' + Math.ceil(idx / 2) + '/' + DLOOK + '일');
        return fetch('/office/delivery-manager/v2/schedules?searchYN=Y&size=1000&page=1&startDate=' + day + '&endDate=' + day + '&serviceTypes=' + encodeURIComponent(sv))
          .then(function(r) { return r.text(); }).then(function(t) {
            var doc = new DOMParser().parseFromString(t, 'text/html');
            [].slice.call(doc.querySelectorAll('table tbody tr')).forEach(function(tr) {
              var td = tr.querySelectorAll('td');
              if (td.length < 14) return;
              var drv = (td[3].innerText || '').replace(/\s+/g, ' ').trim();
              var raw = (td[5].innerText || '').replace(/\s+/g, ' ').trim();
              var i2 = raw.indexOf(' - ');
              var k = dnn(i2 > -1 ? raw.slice(i2 + 3) : raw);
              if (!drv || !k) return;
              if (!freq[k]) freq[k] = {};
              freq[k][drv] = (freq[k][drv] || 0) + 1;
            });
          }).catch(function() {}).then(one);
      }
      return one();
    }

    /* 지오코딩 (워커 경유, D1 캐시) */
    function dGeo(addrs) {
      var out = {}, idx = 0;
      function chunk() {
        if (idx >= addrs.length) return Promise.resolve(out);
        var part = addrs.slice(idx, idx + 20);
        idx += 20;
        dlog('좌표 변환 중… ' + Math.min(idx, addrs.length) + '/' + addrs.length);
        return fetch(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: 'e=geo&addrs=' + encodeURIComponent(JSON.stringify(part)) })
          .then(function(r) { return r.json(); }).then(function(j) {
            if (j && j.ok) { Object.keys(j.geo || {}).forEach(function(k) { out[k] = j.geo[k]; }); if (!j.key) throw new Error('워커에 KAKAO_REST_KEY 미설정'); }
            return chunk();
          });
      }
      return chunk();
    }

    document.getElementById('__wpDpRun').onclick = function() {
      var f = document.getElementById('__wpDpF').files[0];
      var day = document.getElementById('__wpDpDate').value;
      if (!f && !/^\d{4}-\d{2}-\d{2}$/.test(day)) { alert('배송일을 선택해주세요.'); return; }
      var self = this; self.disabled = true;
      var bufP = f ? f.arrayBuffer() : (function() {
        dlog('배송동선 다운로드 중… (' + day + ')');
        var fd = 'deliveryDate=' + encodeURIComponent(day) + '&logisType=';
        return fetch('/office/order/woolin/delivery/excel', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd })
          .then(function(r) { if (!r.ok) throw new Error('배송동선 다운로드 실패 HTTP ' + r.status); return r.arrayBuffer(); })
          .then(function(b) { var u8 = new Uint8Array(b.slice(0, 2)); if (u8[0] !== 0x50 || u8[1] !== 0x4B) throw new Error('배송동선 응답이 엑셀이 아닙니다 (배송일 확인)'); return b; });
      })();
      ensureXLSX().then(function() { return bufP; }).then(function(buf) {
        var wb2 = XLSX.read(buf, { type: 'array' });
        var sn = wb2.SheetNames.filter(function(n) { return n.indexOf('커피') < 0; })[0];
        var rows2 = XLSX.utils.sheet_to_json(wb2.Sheets[sn], { header: 1, defval: '' }).slice(1);
        DTGT = rows2.filter(function(r) { var c = String(r[0]).trim(); return c.indexOf('주간') === 0 && DEXC.indexOf(c) < 0; })
          .map(function(r) { return { br: String(r[1]).trim(), addr: String(r[2]).trim(), memo: String(r[3] || ''), stmt: String(r[4]), amt: Number(r[5]) || 0, fixed: /고정|카드키|이관/.test(String(r[3] || '')) }; });
        if (!DTGT.length) throw new Error('라우팅 대상(주간 코스)이 없습니다. 파일을 확인하세요.');
        dlog('대상 ' + DTGT.length + '착지');
        return dFixAuto();
      }).then(function(fixAuto) {
        var uniq = {};
        DTGT.forEach(function(t) { uniq[dBase(t.addr)] = 1; });
        return dGeo(Object.keys(uniq)).then(function(geo) { return { geo: geo, fixAuto: fixAuto }; });
      }).then(function(ctx) {
        dRun(ctx.geo, ctx.fixAuto);
        self.disabled = false;
      }).catch(function(e) {
        self.disabled = false;
        dlog('');
        alert('배차 실패: ' + ((e && e.message) || e));
      });
    };

    function dRun(geo, fixAuto) {
      var drivers = DDRV.map(function(r) { return { course: r[0], name: r[1], belong: r[2], regions: r[3].split('/'), load: 0, stops: [] }; });
      var byName = {}; drivers.forEach(function(d) { byName[d.name] = d; });
      /* 그룹핑: 기업 + 건물 */
      var groups = {};
      DTGT.forEach(function(t) {
        var comp = t.br.split(' - ')[0].trim();
        var ba = dBase(t.addr);
        var gk = dnn(comp) + '|' + dnn(ba);
        if (!groups[gk]) groups[gk] = { stops: [], amt: 0, region: dRegion(t.addr), xy: geo[ba], fix: '' };
        groups[gk].stops.push(t);
        groups[gk].amt += t.amt;
        if (t.fixed && !groups[gk].fix) {
          var k = dKey(t.br);
          groups[gk].fix = DFIX_OVR[k] || fixAuto[k] || '';
          if (t.fixed) t._autoDrv = fixAuto[k] || ''; t._key = k;
        }
      });
      var glist = Object.keys(groups).map(function(k) { return groups[k]; });
      function centroid(d) { if (!d.stops.length) return null; var x = 0, y = 0, n = 0; d.stops.forEach(function(s) { if (s.xy) { x += s.xy.x; y += s.xy.y; n++; } }); return n ? { x: x / n, y: y / n } : null; }
      /* 1차: 고정 */
      glist.forEach(function(g) {
        if (!g.fix) return;
        var d = byName[g.fix];
        if (!d) { g.fix = ''; return; }
        g.stops.forEach(function(s) { s.xy = g.xy; d.stops.push(s); });
        d.load += g.amt; g.done = true;
      });
      /* 2차: 일반 (금액 큰 순, 권역 + 거리 + 부하) */
      glist.filter(function(g) { return !g.done; }).sort(function(a, b) { return b.amt - a.amt; }).forEach(function(g) {
        var cands = drivers.filter(function(d) { return d.regions.indexOf(g.region) > -1 && d.load + g.amt <= DCAP; });
        var flag = '';
        if (!cands.length) { cands = drivers.filter(function(d) { return d.load + g.amt <= DCAP; }); flag = '권역외'; }
        if (!cands.length) { cands = drivers.slice().sort(function(a, b) { return a.load - b.load; }).slice(0, 1); flag = '용량초과'; }
        var best = null, bs = 1e18;
        cands.forEach(function(d) {
          var c = centroid(d);
          var dd = c ? dDist(c, g.xy) : 3;
          var score = dd + (d.load / DCAP) * 6;
          if (score < bs) { bs = score; best = d; }
        });
        g.stops.forEach(function(s) { s.xy = g.xy; s.flag = flag; best.stops.push(s); });
        best.load += g.amt;
      });
      /* 동선 순서: 최북단 → 최근접 이웃 */
      drivers.forEach(function(d) {
        if (!d.stops.length) return;
        var rest = d.stops.slice().sort(function(a, b) { return (b.xy ? b.xy.y : 0) - (a.xy ? a.xy.y : 0); });
        var path = [rest.shift()];
        while (rest.length) {
          var cur = path[path.length - 1], bi = 0, bd = 1e18;
          rest.forEach(function(s, i) { var dd = dDist(cur.xy, s.xy); if (dd < bd) { bd = dd; bi = i; } });
          path.push(rest.splice(bi, 1)[0]);
        }
        d.path = path;
      });
      DRES = drivers;
      dlog('');
      dRender();
      document.getElementById('__wpDpXls').disabled = false;
      document.getElementById('__wpDpFix').disabled = false;
    }

    function dRender() {
      var out = document.getElementById('__wpDpOut');
      var used = DRES.filter(function(d) { return d.path && d.path.length; });
      var tot = 0, stops = 0, over = 0, outR = 0;
      used.forEach(function(d) { tot += d.load; stops += d.path.length; if (d.load > DCAP) over++; outR += d.path.filter(function(s) { return s.flag === '권역외'; }).length; });
      var h = '<div style="padding:9px 12px;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;color:#334155;margin-bottom:8px">' +
        '<b>배차 완료</b> · 코스 <b>' + used.length + '</b> · 착지 <b>' + stops + '</b> · 총액 <b style="color:#0a7d47">₩' + tot.toLocaleString() + '</b>' +
        ' · 300만 초과 <b style="color:' + (over ? '#DC2626' : '#0a7d47') + '">' + over + '</b> (고정 포함 시 허용)' +
        ' · 권역외 <b>' + outR + '</b></div>';
      h += '<div style="border:1px solid #E2E8F0;border-radius:7px;overflow:auto;background:#fff"><table style="width:100%;border-collapse:collapse;font-size:12px">' +
        '<tr style="background:#F8FAFC;color:#475569"><th style="text-align:left;padding:5px 10px;border-bottom:1px solid #E2E8F0">코스</th><th style="text-align:left;padding:5px 10px;border-bottom:1px solid #E2E8F0">기사</th><th style="text-align:left;padding:5px 10px;border-bottom:1px solid #E2E8F0">소속</th><th style="text-align:right;padding:5px 10px;border-bottom:1px solid #E2E8F0">착지</th><th style="text-align:right;padding:5px 10px;border-bottom:1px solid #E2E8F0">금액</th><th style="text-align:right;padding:5px 10px;border-bottom:1px solid #E2E8F0">고정</th><th style="text-align:left;padding:5px 10px;border-bottom:1px solid #E2E8F0">권역</th></tr>';
      used.sort(function(a, b) { return a.course.localeCompare(b.course); }).forEach(function(d, i) {
        h += '<tr style="border-bottom:1px solid #F1F5F9;background:' + (i % 2 ? '#FCFDFE' : '#fff') + '">' +
          '<td style="padding:4px 10px;font-weight:700">' + esc(d.course) + '</td>' +
          '<td style="padding:4px 10px;font-weight:600">' + esc(d.name) + '</td>' +
          '<td style="padding:4px 10px">' + esc(d.belong) + '</td>' +
          '<td style="padding:4px 10px;text-align:right">' + d.path.length + '</td>' +
          '<td style="padding:4px 10px;text-align:right;' + (d.load > DCAP ? 'color:#DC2626;font-weight:700' : 'color:#0a7d47') + '">₩' + d.load.toLocaleString() + '</td>' +
          '<td style="padding:4px 10px;text-align:right">' + d.path.filter(function(s) { return s.fixed; }).length + '</td>' +
          '<td style="padding:4px 10px;color:#64748B">' + esc(d.regions.join('/')) + '</td></tr>';
      });
      h += '</table></div>';
      out.innerHTML = h;
    }

    document.getElementById('__wpDpXls').onclick = function() {
      if (!DRES) return;
      ensureXLSX().then(function() {
        var rows = [['명세번호', '우린배송', '드라이버', '소속', '고객명', '주소', '비고 1', '예상 용적량(금액VAT)', '담당 드라이버', '표시']];
        DRES.filter(function(d) { return d.path && d.path.length; }).sort(function(a, b) { return a.course.localeCompare(b.course); }).forEach(function(d) {
          d.path.forEach(function(s) {
            rows.push([s.stmt, d.course, d.name, d.belong, s.br, s.addr, s.memo, s.amt, d.name, [s.fixed ? '고정' : '', s.flag || ''].filter(Boolean).join('/')]);
          });
        });
        var sum = [['코스', '기사', '소속', '착지', '금액합(VAT)', '고정착지', '권역']];
        DRES.filter(function(d) { return d.path && d.path.length; }).sort(function(a, b) { return a.course.localeCompare(b.course); }).forEach(function(d) {
          sum.push([d.course, d.name, d.belong, d.path.length, d.load, d.path.filter(function(s) { return s.fixed; }).length, d.regions.join('/')]);
        });
        var wb3 = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb3, XLSX.utils.aoa_to_sheet(rows), '라우팅');
        XLSX.utils.book_append_sheet(wb3, XLSX.utils.aoa_to_sheet(sum), '코스요약');
        XLSX.writeFile(wb3, '배송동선_라우팅_' + now().slice(0, 10) + '.xlsx');
        toast('✓ 라우팅 엑셀 다운로드', '#0a7d47');
      }).catch(function(e) { alert('엑셀 생성 실패: ' + ((e && e.message) || e)); });
    };

    /* 고정 스팟 관리 */
    document.getElementById('__wpDpFix').onclick = function() {
      var box = document.getElementById('__wpDpFixBox');
      if (box.style.display !== 'none') { box.style.display = 'none'; box.innerHTML = ''; return; }
      box.style.display = '';
      dFixUI();
    };
    function dFixUI() {
      var box = document.getElementById('__wpDpFixBox');
      if (!box || !DTGT) return;
      var seen = {}, list = [];
      DTGT.filter(function(t) { return t.fixed; }).forEach(function(t) {
        var k = dKey(t.br);
        if (seen[k]) return; seen[k] = 1;
        list.push({ k: k, br: t.br, auto: (DFIX_AUTO && DFIX_AUTO[k]) || '', ovr: DFIX_OVR[k] || '' });
      });
      list.sort(function(a, b) { return (a.ovr || a.auto ? 1 : 0) - (b.ovr || b.auto ? 1 : 0); });
      var names = DDRV.map(function(r) { return r[1]; });
      var h = '<div style="padding:10px 12px;background:#fff;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px;color:#334155">' +
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><b>고정 스팟 담당 (' + list.length + ')</b>' +
        '<span style="font-size:11.5px;color:#94A3B8">(자동) = 최근 ' + DLOOK + '일 최다 배송 기사 · 드롭다운 지정 시 항상 우선</span>' +
        '<span style="flex:1"></span><button id="__wpDpFixSave" class="wp-btn ok" style="padding:5px 14px">저장</button></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:4px;max-height:340px;overflow:auto">';
      list.forEach(function(x) {
        var o = '<option value="">(자동' + (x.auto ? ': ' + esc(x.auto) : ' 감지실패') + ')</option>';
        names.forEach(function(n) { o += '<option value="' + esc(n) + '"' + (x.ovr === n ? ' selected' : '') + '>' + esc(n) + '</option>'; });
        h += '<div style="display:flex;gap:6px;align-items:center;padding:2px 4px;' + (!x.auto && !x.ovr ? 'background:#FEF2F2;border-radius:5px' : '') + '">' +
          '<span style="flex:1;font-size:11.5px">' + esc(x.br.slice(0, 44)) + '</span>' +
          '<select data-fixk="' + esc(x.k) + '" style="padding:2px 5px;border:1px solid #E2E8F0;border-radius:5px;font-size:11.5px;max-width:150px">' + o + '</select></div>';
      });
      h += '</div></div>';
      box.innerHTML = h;
      document.getElementById('__wpDpFixSave').onclick = function() {
        var self = this;
        [].forEach.call(box.querySelectorAll('select[data-fixk]'), function(sl) {
          var k = sl.getAttribute('data-fixk');
          if (sl.value) DFIX_OVR[k] = sl.value; else delete DFIX_OVR[k];
        });
        self.disabled = true; self.textContent = '저장 중…';
        fetch(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: 'e=cfg_set&k=fix_master&v=' + encodeURIComponent(JSON.stringify(DFIX_OVR)) })
          .then(function(r) { return r.json(); }).then(function(j) {
            if (!j || !j.ok) throw new Error('저장 실패');
            self.disabled = false; self.textContent = '저장';
            toast('✓ 고정 스팟 저장 — 다음 배차부터 적용', '#0a7d47');
          }).catch(function(e) { self.disabled = false; self.textContent = '저장'; alert('저장 실패: ' + ((e && e.message) || e)); });
      };
    }
  }

  function viewSchedBulk() {
    var SBROWS = [], SBRES = [], sbBusy = false;
    VIEW.innerHTML = '<div style="padding:9px 12px;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px;color:#334155;line-height:1.7;margin-bottom:10px">' +
      '<b>배송주기변경 · 일정생성 · 일정변경 · 일정삭제를 엑셀로 한 번에 반영합니다.</b><br>' +
      '요청큐와 슬랙은 타지 않고 <b>위펀 오피스에 바로 반영</b>됩니다. 되돌리기가 없으니 검증 결과를 꼭 확인하세요.<br>' +
      '거래처명에 <b>조식</b>이 들어가면 오피스 반영은 건너뜁니다(조식팀 별도 입력).' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
      '<button id="__wpSbTpl" class="wp-btn gh">⬇ 양식 다운로드</button>' +
      '<input type="file" id="__wpSbF" accept=".xlsx,.xls">' +
      '<button id="__wpSbV" class="wp-btn pri">1. 검증</button>' +
      '<button id="__wpSbR" class="wp-btn ok" disabled>2. 실행</button>' +
      '<button id="__wpSbC" class="wp-btn gh" disabled>결과 복사</button>' +
      '<label style="display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:#334155;margin-left:4px;cursor:pointer"><input type="checkbox" id="__wpSbSlack" checked> #req-물류에 기록 남기기</label>' +
      '</div><div id="__wpSbLog" class="wp-log"></div>';
    var LOG = document.getElementById('__wpSbLog');
    function sblog(h) { var d = document.createElement('div'); d.innerHTML = h; LOG.appendChild(d); LOG.scrollTop = LOG.scrollHeight; }

    document.getElementById('__wpSbTpl').onclick = function() {
      sbTemplate().then(function() { toast('✓ 양식 다운로드', '#0a7d47'); }).catch(function(e) { alert('양식 생성 실패: ' + ((e && e.message) || e)); });
    };

    document.getElementById('__wpSbV').onclick = function() {
      var f = document.getElementById('__wpSbF').files[0];
      if (!f) { alert('엑셀 파일을 선택해주세요.'); return; }
      LOG.innerHTML = ''; SBRES = [];
      sbParse(f).then(function(out) {
        SBROWS = out;
        var bad = 0, cnt = {};
        out.forEach(function(r) {
          r.err = sbCheck(r);
          if (r.err) { bad++; sblog('· ' + badge('실패예정', '#b00') + ' [' + r._row + '행] ' + esc(r.code || r.name) + ' — ' + esc(r.err)); }
          else {
            cnt[r.action] = (cnt[r.action] || 0) + 1;
            /* 해석된 값을 그대로 찍는다 — 날짜가 밀리거나 잘못 읽히면 실행 전에 눈으로 잡힌다 */
            sblog('· ' + badge('확인', '#1f4e78') + ' [' + r._row + '행] ' + esc(r.code || r.name) + ' — ' + esc(r.action) + ' · <b>' + esc(sbDetail(r)) + '</b>');
          }
        });
        sblog('<b>검증 완료 — 총 ' + out.length + '행</b> · 정상 ' + (out.length - bad) + ' / 오류 ' + bad +
          (Object.keys(cnt).length ? ' &nbsp; (' + Object.keys(cnt).map(function(k) { return k + ' ' + cnt[k]; }).join(' · ') + ')' : ''));
        if (bad) { sblog('<span style="color:#b45309">오류 행은 실행에서 제외됩니다.</span>'); }
        document.getElementById('__wpSbR').disabled = !(out.length - bad);
      }).catch(function(e) { sblog(badge('오류', '#b00') + ' ' + esc((e && e.message) || e)); });
    };

    document.getElementById('__wpSbR').onclick = function() {
      if (sbBusy) return;
      var todo = SBROWS.filter(function(r) { return !r.err; });
      if (!todo.length) return;
      if (!confirm('[배송일정 일괄 반영]\n대상 ' + todo.length + '건\n\n위펀 오피스에 바로 반영되고 되돌릴 수 없습니다.\n진행할까요?')) return;
      sbBusy = true; this.disabled = true;
      document.getElementById('__wpSbV').disabled = true;
      sblog('<hr>');
      var i = 0, ok = 0, ng = 0;
      var btn = this, o0 = btn.textContent;
      function step() {
        if (i >= todo.length) {
          sbBusy = false; btn.textContent = o0;
          document.getElementById('__wpSbV').disabled = false;
          document.getElementById('__wpSbC').disabled = false;
          sblog('<hr><b>완료 — 성공 ' + ok + ' / 실패 ' + ng + '</b>');
          toast('일괄 반영 완료 · 성공 ' + ok + ' / 실패 ' + ng, ng ? '#b45309' : '#0a7d47');
          var cb = document.getElementById('__wpSbSlack');
          if (cb && cb.checked) { sbSlack(todo.length, ok, ng, SBRES, sblog); }
          return;
        }
        var r = todo[i++];
        btn.textContent = '실행 중 ' + i + '/' + todo.length;
        sbFind(r).then(function(br) {
          if (!br) throw new Error('거래처 검색 결과 없음');
          if (br._many) throw new Error('거래처 ' + br._many + '건 매칭 — 점포코드로 지정 필요');
          return runActionCore({ action: r.action, branchId: br.id, branchName: br.name, detail: sbDetail(r) }).then(function(note) {
            ok++; SBRES.push([r._row, r.action, br.name, '성공', note || '']);
            sblog('· ' + badge('성공', '#0a7d47') + ' [' + r._row + '행] ' + esc(br.name) + ' — ' + esc(r.action) + ' · ' + esc(note || ''));
          });
        }).catch(function(e) {
          ng++; var m = (e && e.message) || String(e);
          SBRES.push([r._row, r.action, r.code || r.name, '실패', m]);
          sblog('· ' + badge('실패', '#b00') + ' [' + r._row + '행] ' + esc(r.code || r.name) + ' — ' + esc(m));
        }).then(function() { setTimeout(step, 120); });   /* 오피스 부하 완화 */
      }
      step();
    };

    document.getElementById('__wpSbC').onclick = function() {
      var tsv = '행\t작업\t거래처\t결과\t내용\n' + SBRES.map(function(x) { return x.join('\t'); }).join('\n');
      navigator.clipboard.writeText(tsv).then(function() { toast('결과 복사됨', '#0a7d47'); });
    };
  }

  function viewBulk() {
    VIEW.innerHTML = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><input type="file" id="__wpF" accept=".xlsx,.xls"><button id="__wpV" class="wp-btn pri">1. 검증</button><button id="__wpR" class="wp-btn ok" disabled>2. 실행</button><button id="__wpC" class="wp-btn gh" disabled>결과 복사</button><button id="__wpK" class="wp-btn gh">주소API 키</button></div><div id="__wpAddr"></div><div id="__wpLog" class="wp-log"></div>';
    BLOG = document.getElementById('__wpLog');
    document.getElementById('__wpV').onclick = function() {
      var f = document.getElementById('__wpF').files[0];
      if (!f) {
        alert('엑셀 파일을 선택해주세요.');
        return;
      }
      BLOG.innerHTML = '';
      results = [];
      ensureXLSX().then(function() {
        return parseFile(f);
      }).then(function(out) {
        rows = out;
        var c = {};
        rows.forEach(function(r) {
          var k = r.invalid ? '⚠️인식불가' : r.parts.join(',');
          c[k] = (c[k] || 0) + 1;
        });
        blog('<b>검증 완료 — 총 ' + rows.length + '건</b> : ' + Object.keys(c).map(function(k) {
          return k + ' ' + c[k] + '건';
        }).join(' · '));
        rows.forEach(function(r) {
          if (r.invalid) {
            blog('· ⚠️ ' + badge('실패예정', '#b00') + ' [' + esc(r.raw || '-') + '] ' + esc(r.name) + ' — ' + esc(r.err));
            return;
          }
          var det = '';
          if (r.parts.indexOf('주소변경') > -1) {
            var sa = splitAddr(r.addr);
            det = ' | ' + esc(r.addr) + (sa.detail && sa.detail !== '-' ? ' → 상세:' + esc(sa.detail) : '');
          }
          blog('· [' + esc(r.parts.join(',')) + '] ' + esc(r.name) + ' | ' + esc(r.course) + ' | ' + esc(r.hot) + '/' + esc(r.cold) + det);
        });
        document.getElementById('__wpR').disabled = !rows.length;
      }).catch(function(e) {
        blog(badge('오류', '#b00') + ' ' + esc(e.message));
      });
    };
    document.getElementById('__wpR').onclick = function() {
      if (busy || !rows.length) return;
      busy = true;
      this.disabled = true;
      blog('<hr>');
      var i = 0;

      function next() {
        if (i >= rows.length) {
          busy = false;
          document.getElementById('__wpC').disabled = false;
          var s = results.filter(function(x) {
              return x[3] === '성공';
            }).length,
            fl = results.filter(function(x) {
              return x[3] === '실패';
            }).length;
          blog('<b>완료 — 성공 ' + s + ' · 실패 ' + fl + ' · 스킵 ' + (results.length - s - fl) + '</b>');
          return;
        }
        var r = rows[i++];
        processRow(r).catch(function(e) {
          fail(r, e.message);
        }).then(function() {
          setTimeout(next, 400);
        });
      }
      next();
    };
    document.getElementById('__wpK').onclick = function() {
      var cur = localStorage.getItem('__wdbJusoKey') || '';
      var k = prompt('juso.go.kr 검색API 승인키를 입력하세요.', cur);
      if (k === null) return;
      if (k.trim()) {
        localStorage.setItem('__wdbJusoKey', k.trim());
        alert('저장됨 — 주소변경 자동');
      } else {
        localStorage.removeItem('__wdbJusoKey');
        alert('키 삭제됨');
      }
    };
    document.getElementById('__wpC').onclick = function() {
      var tsv = '행\t구분\t거래처명\t결과\t내용\n' + results.map(function(x) {
        return x.join('\t');
      }).join('\n');
      navigator.clipboard.writeText(tsv).then(function() {
        alert('복사됨');
      });
    };
  }
  try {
    var _pc = JSON.parse(localStorage.getItem('__wpProfile') || 'null');
    if (_pc && _pc.email) {
      REQ.name = _pc.name || ''; REQ.email = _pc.email || ''; REQ.dept = _pc.dept || '';
      var _w = document.getElementById('__wpWho');
      if (_w) _w.innerHTML = '요청자 · <b>' + esc(REQ.dept) + '</b> / <b>' + esc(REQ.name) + '</b> (' + esc(REQ.email) + ')';
      applyAccess();
    }
  } catch (e) {}
  setMode('requester');
  /* 관리자는 엑셀을 자주 뽑는다 → 패널 뜨고 4초 뒤 조용히 ExcelJS 미리 로드.
     실패해도 무시(다운로드 시점에 다시 시도됨). */
  setTimeout(function() { if (IS_ADMIN) { ensureExcel().catch(function() {}); } }, 4000);
  if (!REQ.email) {
    (function tryProfile(n) {
      loadProfile().then(function() {
        applyAccess();
        if (!REQ.email && n > 0) {
          setTimeout(function() {
            tryProfile(n - 1);
          }, 900);
        }
      });
    })(4);
  }
})();