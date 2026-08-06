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
  var API_URL = 'https://script.google.com/macros/s/AKfycbzhF9-acnAedsgED5MSWnnkpK3S78heT1hy9Ra16Bvt1BA7rz2TpmZbQzMrsw1Ls-KZ/exec'; /* 공유 큐 웹앱 (고정) */
  var ADMINS = ['kg_yim@wefun.io']; /* 관리자용을 볼 수 있는 이메일(물류팀). 쉼표로 추가 */ /* ============================================= */
  var IS_ADMIN = false;
  var VERSION = '26.08.06 12:20';
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
        opts: CYCLES
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
        type: 'dates'
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
        type: 'date'
      }, {
        k: '변경배송일',
        label: '변경할 날짜',
        type: 'date'
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
        type: 'dates'
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
        opts: ['스낵24', '조식24']
      }, {
        k: '월예산',
        label: '월 예산 (오피스 자동)',
        type: 'text',
        ro: true
      }, {
        k: '담당자성함',
        label: '담당자 성함',
        type: 'text'
      }, {
        k: '담당자연락처',
        label: '담당자 연락처',
        type: 'text'
      }, {
        k: '요청주기',
        label: '요청 배송주기(정기)',
        type: 'select',
        opts: CYCLES
      }, {
        k: '정기배송요일',
        label: '정기 배송요일(매주 계열)',
        type: 'days'
      }, {
        k: '첫배송희망일',
        label: '첫 배송희망일 (영업일 D+3부터 선택)',
        type: 'date',
        min3: true
      }, {
        k: '배송형태',
        label: '배송형태',
        type: 'select',
        opts: ['택배', '방문진열', '보냉가방 적재']
      }, {
        k: '요청설비',
        label: '요청 설비 (복수 선택)',
        type: 'multi',
        opts: EQUIP
      }, {
        k: '설치일',
        label: '설치 희망일 (자산 · 전체 날짜 선택 가능)',
        type: 'date'
      }, {
        k: '배송특이사항',
        label: '배송 특이사항 및 요청사항',
        type: 'textarea'
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
        type: 'addr'
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
        type: 'text'
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
        type: 'text'
      }, {
        k: '담당자연락처',
        label: '담당자 연락처',
        type: 'text'
      }, {
        k: '사유',
        label: '변경 사유',
        type: 'text'
      }]
    },
    '코스변경': {
      passthru: true,
      d1: true,
      fields: [{
        k: '변경코스',
        label: '변경 코스 (우린배송담당)',
        type: 'text'
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
      if (a === '코스변경') return 1;
      if (b === '코스변경') return -1;
      return 0;
    });
    return ks;
  } /* ---------- 공유 큐 API ---------- */
  function apiUrl() {
    var b = (API_URL.indexOf('PASTE') === -1) ? API_URL : '';
    return localStorage.getItem('__wpApi') || b;
  }

  function api(params, _retry) {
    var u = apiUrl();
    if (!u) return Promise.reject(new Error('연결설정(웹앱 URL)이 필요합니다. 상단 ⚙️ 연결설정에서 등록하세요.'));
    var qs = Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    var READS = { list: 1, ping: 1, one: 1, comment_list: 1, board_list: 1 };
    return fetch(u, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: qs }).then(function(r) {
      return r.text();
    }).then(function(t) {
      var j = null;
      /* 구글이 JSON 대신 HTML(로그인/일시장애 페이지)을 뱉는 일이 있다. 이때 서버 실행은 이미
         끝났을 수 있으므로 '실패'로 단정하면 안 된다 → badResponse 로 표시만 하고 호출부가 확인. */
      try { j = JSON.parse(t); } catch (pe) { throw new Error('서버 응답이 JSON이 아닙니다(구글 일시장애)'); }
      if (!j || j.ok === false) { var ae = new Error((j && j.error) || '응답 오류'); ae.appError = true; throw ae; }
      return j;
    }).catch(function(e) {
      if (!_retry && READS[params.e]) {
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

  var LCACHE = {}, LOADSEQ = 0;
  function listReqSWR(elId, f, cb) {
    var my = ++LOADSEQ;
    var el = document.getElementById(elId);
    if (el) { el.innerHTML = '<div style="color:#94a3b8;padding:10px">불러오는 중…</div>'; }
    return listReq(f).then(function(items) {
      if (my === LOADSEQ) { cb(items); }
      return items;
    }, function(err) {
      if (my === LOADSEQ) { throw err; }
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
  function setNotice(id, val) {
    return api({ e: 'meta', id: id, custNotice: val });
  }
  function ncXlsx(items) {
    return ensureXLSX().then(function() {
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

  function updateBadge() {
    if (!launcher || launcher.style.display === 'none') return;
    var p = IS_ADMIN ? listReq({
      status: '대기'
    }).then(function(items) {
      return items.length;
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
    badgePoll = setInterval(updateBadge, 30000);
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
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
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
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
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
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: 'orderScheduleId=' + encodeURIComponent(orderScheduleId) + '&deliveryDate=' + encodeURIComponent(date)
    }).then(function(r) {
      if (!r.ok) throw new Error('삭제 실패 HTTP ' + r.status);
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
      chips.innerHTML = arr.map(function(d) { return '<span style="display:inline-flex;align-items:center;gap:4px;background:#e0f2fe;color:#075985;border-radius:6px;padding:2px 8px;font-size:12px">' + d + ' <b data-d="' + d + '" style="cursor:pointer;color:#0369a1;font-weight:700">×</b></span>'; }).join('');
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
  function fieldHtml(f) {
    var id = '__wpf_' + f.k;
    if (f.type === 'dates') return '<div class="wp-fld"><span>' + esc(f.label) + '</span><div style="flex:1"><div style="display:flex;gap:6px"><input type="date" id="' + id + '_pick" class="wp-inp" style="flex:1"><button type="button" id="' + id + '_add" class="wp-btn gh" style="white-space:nowrap">+ 추가</button></div><div id="' + id + '_chips" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px"></div><input type="hidden" id="' + id + '"></div></div>';
    if (f.type === 'select') return '<div class="wp-fld"><span>' + esc(f.label) + '</span><select id="' + id + '" class="wp-inp"><option value=""></option>' + f.opts.map(function(o) {
      return '<option>' + esc(o) + '</option>';
    }).join('') + '</select></div>';
    if (f.type === 'days') return '<div class="wp-fld"><span>' + esc(f.label) + '</span><div style="flex:1;position:relative"><input id="' + id + '" class="wp-inp" readonly placeholder="요일 선택(복수 가능)" style="width:100%;cursor:pointer"><div id="' + id + '_dd" style="display:none;position:absolute;z-index:9;left:0;right:0;background:#fff;border:1px solid #cbd5e1;border-radius:9px;padding:8px;margin-top:3px;box-shadow:0 10px 30px rgba(0,0,0,.18)">' + DAYS.map(function(d) {
      return '<button type="button" class="wp-day" data-d="' + d + '">' + d.slice(0, 1) + '</button>';
    }).join('') + '</div></div></div>';
    if (f.type === 'multi') return '<div class="wp-fld"><span>' + esc(f.label) + '</span><div style="flex:1;position:relative"><input id="' + id + '" class="wp-inp" readonly placeholder="설비 선택(복수 가능)" style="width:100%;cursor:pointer"><div id="' + id + '_dd" style="display:none;position:absolute;z-index:9;left:0;right:0;background:#fff;border:1px solid #cbd5e1;border-radius:9px;padding:6px;margin-top:3px;box-shadow:0 10px 30px rgba(0,0,0,.18);max-height:260px;overflow:auto">' + f.opts.map(function(o) {
      return '<label style="display:block;padding:5px 8px;font-size:13px;cursor:pointer;border-radius:6px"><input type="checkbox" value="' + esc(o) + '" style="margin-right:8px;vertical-align:middle">' + esc(o) + '</label>';
    }).join('') + '</div></div></div>';
    if (f.type === 'textarea') return '<div style="margin:10px 0"><div style="color:#475569;font-size:13px;margin-bottom:4px">' + esc(f.label) + '</div><textarea id="' + id + '" class="wp-inp" style="width:100%;height:130px;font-family:inherit"></textarea></div>';
    if (f.type === 'addr') return '<div class="wp-fld"><span>' + esc(f.label) + '</span><div style="flex:1;display:flex;gap:6px"><input id="' + id + '" class="wp-inp" type="text" style="flex:1" placeholder="주소검색 버튼으로 입력"><button type="button" id="' + id + '_btn" class="wp-btn gh" style="padding:7px 12px;white-space:nowrap">주소검색</button></div></div>';
    return '<div class="wp-fld"><span>' + esc(f.label) + '</span><input id="' + id + '" class="wp-inp" type="' + (f.type === 'date' ? 'date' : 'text') + '"' + (f.ro ? ' readonly style="background:#f1f5f9;color:#475569"' : '') + '></div>';
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
      resolveServiceIds(br.id).then(function(_ids) {
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
      if (f.type === 'date' && f.min3) {
        var el = document.getElementById('__wpf_' + f.k);
        if (el) el.min = firstDeliveryStr();
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
          toast(res.msg, '#c0392b');
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
  function preValidate(action, br, vals) {
    if (/조식/.test(String(br.name || ''))) return Promise.resolve({ ok: true });
    if (action !== '배송일정생성' && action !== '배송일정삭제' && action !== '배송일정변경') return Promise.resolve({
      ok: true
    });
    return resolveServiceIds(br.id).then(function(ids) {
      if (!ids.length) return {
        ok: false,
        msg: '이 거래처에 스낵24 배송일정이 없습니다.'
      };
      return getScheduleEvents(ids[0]).then(function(evs) {
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
    deliv: ['배송주기변경', '배송일정생성', '배송일정변경', '배송일정삭제', '배송메모'],
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
    var filters = ['대기', '완료', '반려', '전체'];
    var actSel = '<select id="__wpAf" class="wp-inp" style="min-height:38px;padding:7px 9px;max-width:190px"><option value="전체">전체 작업</option>' + GACTS.map(function(a) {
      return '<option value="' + esc(a) + '"' + (a === REV_ACTION ? ' selected' : '') + '>' + esc(a) + '</option>';
    }).join('') + '</select>';
    VIEW.innerHTML = '<div style="margin-bottom:10px"><div style="margin-bottom:8px;display:flex;align-items:center;gap:5px;flex-wrap:wrap">' + filters.map(function(f) {
      return '<button class="wp-btn ' + (f === REV_STATUS ? 'pri' : 'gh') + ' __wpFt" data-f="' + f + '" style="padding:7px 13px">' + f + '</button>';
    }).join('') + '<span style="color:#cbd5e1;margin:0 3px">|</span>' + actSel + '</div>' + drBar('__wpRF', '__wpRT', '__wpRGo', '__wpRCsv') + '<div style="margin-top:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap"><button id="__wpRCode" class="wp-btn gh" style="padding:7px 13px">⬇ 코드전달 엑셀</button><button id="__wpRPick" class="wp-btn gh" style="padding:7px 13px">⬇ 수기피킹 엑셀</button><span style="color:#94a3b8;font-size:11px">코드전달=신규·주소·거래처명·담당자변경 / 수기피킹=피킹 품목 양식</span></div></div><div id="__wpRevList" class="wp-scroll">불러오는 중…</div>';
    document.getElementById('__wpRF').value = REV_DR.from;
    document.getElementById('__wpRT').value = REV_DR.to;
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
      listReqSWR('__wpRevList', {
        status: REV_STATUS === '전체' ? '' : REV_STATUS,
        from: REV_DR.from,
        to: REV_DR.to
      }, function(items) {
        cache = filterByDate(items, REV_DR.from, REV_DR.to);
        cache = cache.filter(function(it) { return GACTS.indexOf(it.action) > -1; });
        if (REV_ACTION !== '전체') cache = cache.filter(function(it) {
          return it.action === REV_ACTION;
        });
        renderReqTable('__wpRevList', cache, true);
      }).catch(function(e) {
        document.getElementById('__wpRevList').innerHTML = '<div style="color:#b00;padding:10px">' + esc(e.message) + '</div>';
      });
    }
    document.getElementById('__wpRGo').onclick = load;
    document.getElementById('__wpRCsv').onclick = function() {
      reqCsv(cache, '배송요청_' + REV_STATUS + '_' + REV_DR.from + '~' + REV_DR.to + '.csv');
    };
    document.getElementById('__wpRCode').onclick = function() {
      buildCodeXlsx(cache, '코드전달_' + REV_DR.from + '~' + REV_DR.to + '.xlsx');
    };
    document.getElementById('__wpRPick').onclick = function() {
      buildPickingXlsx(cache, '수기피킹_' + REV_DR.from + '~' + REV_DR.to + '.xlsx');
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
      if (it.hot && it.cold && stored) {
        return Promise.resolve([it.branchName || '', stored, drvCourse, gubun, phone, it.hot || '', it.cold || '']);
      }
      if (!it.branchId) {
        return Promise.resolve([it.branchName || '', stored, drvCourse, gubun, phone, it.hot || '', it.cold || '']);
      }
      // 코드/주소는 승인 후 오피스에 반영 → 비어있으면 조회
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

  function buildCodeXlsx(items, fname) {
    var targets = (items || []).filter(function(it) {
      return codeGubun(it.action);
    });
    if (!targets.length) {
      toast('코드전달 대상(신규·주소변경·거래처명변경·담당자변경)이 없습니다', '#c0392b');
      return;
    }
    var changeT = targets.filter(function(it) {
      return it.action !== '신규코드발급';
    });
    var newT = targets.filter(function(it) {
      return it.action === '신규코드발급';
    });
    toast('코드전달 생성 중… (신규 주소 조회)', '#1f4e78');
    ensureXLSX().then(function() {
      return Promise.all([Promise.all(changeT.map(codeRow)), Promise.all(newT.map(codeRow))]);
    }).then(function(res) {
      var changeData = res[0],
        newData = res[1];
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
      });
    }).catch(function(e) {
      alert('코드전달 생성 실패: ' + (e && e.message || e));
    });
  }

  function pkNum(s) {
    return Number(String(s || '').replace(/[^\d.]/g, '')) || 0;
  }

  function buildPickingXlsx(items, fname) {
    var targets = (items || []).filter(function(it) {
      return it.action === '수기피킹';
    });
    if (!targets.length) {
      toast('수기피킹 요청이 없습니다', '#c0392b');
      return;
    }
    ensureXLSX().then(function() {
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
  function renderReqTable(elId, items, admin, opt) {
    opt = opt || {};
    var cn = !!opt.custNotice;
    var box = document.getElementById(elId);
    if (!items.length) {
      box.innerHTML = '<div style="color:#94a3b8;padding:14px">해당 기간에 요청이 없습니다.</div>';
      return;
    }
    var cols = [
      ['시각', 80],
      [cn ? '고객사 안내' : '부서', cn ? 90 : 56],
      ['요청자', 70],
      ['작업', 110],
      ['점포코드', 72],
      ['거래처명', 160],
      ['요청내용', 0],
      ['상태', 60],
      [admin ? '처리' : '처리결과', admin ? 150 : 150]
    ];
    var h = '<table class="wp-tbl" style="table-layout:fixed;width:100%"><thead><tr>' + cols.map(function(c) {
      return '<th style="' + (c[1] ? 'width:' + c[1] + 'px;' : '') + '">' + c[0] + '</th>';
    }).join('') + '</tr></thead><tbody>';
    items.forEach(function(it) {
      var doneInfo = it.admin ? ('<div style="font-size:12px;line-height:1.55"><b style="color:#334155">' + esc(it.admin) + '</b>' + (it.decidedTs ? ' <span style="color:#94a3b8">' + esc(fmtTs(it.decidedTs)) + '</span>' : '') + (it.adminNote ? '<div style="color:#64748b;margin-top:1px">' + esc(it.adminNote).split(' · ').join('<br>') + '</div>' : '') + '</div>') : '';
      var last;
      if (admin) {
        if (it.status === '대기') {
          if (it.action === '신규코드발급') {
            /* 자산승인 단계 폐지 — 물류승인만으로 완료. 설비건은 슬랙에서 자산담당에게 확인 요청만 나감 */
            var d물 = /물류승인/.test(it.adminNote || '');
            var eqm = /요청설비:\s*([^·]*)/.exec(it.detail || '');
            var hasEq = !!(eqm && eqm[1].trim() && eqm[1].trim() !== '없음');
            last = '<td style="white-space:normal;line-height:1.9"><button class="wp-act __wpAp2" data-id="' + esc(it.id) + '" data-stage="물류" ' + (d물 ? 'disabled style="opacity:.45;border-color:#94a3b8;color:#94a3b8"' : 'style="border-color:#1f4e78;color:#1f4e78"') + '>물류승인' + (d물 ? ' ✓' : '') + '</button>' + '<button class="wp-act __wpRj" data-id="' + esc(it.id) + '" style="border-color:#c0392b;color:#c0392b">반려</button><button class="wp-act __wpFix" data-id="' + esc(it.id) + '" style="border-color:#b45309;color:#b45309">수정승인</button>' + (hasEq ? '<div style="font-size:11.5px;color:#7c3aed;margin-top:2px">설비건 · 승인 시 자산담당 확인요청 발송</div>' : '') + (it.adminNote ? '<div style="font-size:11.5px;color:#64748b;margin-top:2px">' + esc(it.adminNote) + '</div>' : '') + '</td>';
          } else {
            last = '<td style="white-space:nowrap"><button class="wp-act __wpAp" data-id="' + esc(it.id) + '" style="border-color:#0a7d47;color:#0a7d47">승인</button><button class="wp-act __wpFix" data-id="' + esc(it.id) + '" style="border-color:#b45309;color:#b45309">수정승인</button><button class="wp-act __wpRj" data-id="' + esc(it.id) + '" style="border-color:#c0392b;color:#c0392b">반려</button></td>';
          }
        } else {
          last = '<td>' + doneInfo + '</td>';
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
      h += '<tr data-id="' + esc(it.id) + '">' + '<td style="white-space:nowrap;color:#64748b">' + esc(fmtTs(it.ts)) + '</td>' + (cn ? ('<td style="white-space:nowrap"><select class="__wpNotice" data-id="' + esc(it.id) + '" style="display:inline-block;width:78px;height:30px;line-height:1;font-size:12.5px;padding:2px 6px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;vertical-align:top;box-sizing:border-box"><option value=""' + (String(it.custNotice || '') === '완료' ? '' : ' selected') + '></option><option value="완료"' + (String(it.custNotice || '') === '완료' ? ' selected' : '') + '>완료</option></select></td>') : ('<td style="white-space:nowrap">' + esc(it.dept) + '</td>')) + '<td style="white-space:nowrap">' + esc(it.name) + '</td>' + '<td style="white-space:normal;word-break:break-word;line-height:1.25;font-weight:600">' + esc(it.action) + '</td>' + '<td style="white-space:nowrap">' + esc(it.hot || '-') + '</td>' + '<td style="word-break:break-word;line-height:1.35">' + bn + '</td>' + '<td style="color:#334155;white-space:normal;word-break:break-word;line-height:1.5;min-width:240px">' + esc(it.detail).replace(/\n/g, '<br>').split(' · ').map(function(_p, _i, _a) { return (_i > 0 && /^변경/.test(_p) && /^기존/.test(_a[_i - 1]) ? '<div style="height:7px"></div>' : '') + _p; }).join('<br>') + '</td>' + '<td style="white-space:nowrap">' + pill(it.status) + '</td>' + last + '</tr>';
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
          viewReview();
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
      return resolveServiceIds(it.branchId).then(function(ids) {
        if (!ids.length) throw new Error('스낵24 배송일정(서비스) 없음');
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
      return resolveServiceIds(it.branchId).then(function(ids) {
        if (!ids.length) throw new Error('서비스 없음');
        var sid = ids[0];
        var cyc = detailGet(it.detail, '변경주기');
        if (cyc.indexOf('계획일정없음') > -1) cyc = '계획일정없음';
        var daysRaw = detailGet(it.detail, '변경요일') || detailGet(it.detail, '배송요일');
        var days = daysRaw ? daysRaw.split(',').map(function(s) {
          return s.trim().charAt(0);
        }).filter(Boolean) : [];
        if (!cyc) throw new Error('변경주기 없음');
        return driveCycle(sid, cyc, days).then(function() {
          return cyc + (days.length ? '(' + days.join(',') + ')' : '') + ' 재생성';
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
          chain = chain.then(function() {
            return driveCycle(sid, cyc2, days2, begin1);
          });
          if (okBegin && noGen) {
            chain = chain.then(function() { return createDelivery(sid, begin); });
          } else if (okBegin) {
            chain = chain.then(function() {
              return waitScheduleReady(sid, 7);
            }).then(function(evs) {
              var dels = [];
              var hasFirst = false;
              (evs || []).forEach(function(e) {
                if (e.deliveryDate < begin) { dels.push(deleteDelivery(sid, e.orderScheduleId, e.deliveryDate)); }
                if (e.deliveryDate === begin) { hasFirst = true; }
              });
              return Promise.all(dels).then(function() { if (!hasFirst) { return createDelivery(sid, begin); } });
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
    var cfmMsg = pick ? ('[수기피킹] 완료 처리\n' + (it.branchName || '') + '\n\n피킹팀 처리 완료로 표시하고 요청자에게 알립니다.\n진행할까요?') : passthru ? ('[' + it.action + '] 검토 승인(접수)\n' + (it.branchName || '') + '\n' + (it.detail || '') + (it._newCourse ? '\n코스변경 → ' + it._newCourse : '') + '\n\n승인하면 자회사 코드전달로 접수됩니다. (평일 D+1(' + workdayD1Str() + ') 반영 예정)\n진행할까요?') : ('[' + it.action + '] 승인 · 위펀 오피스에 반영\n' + (it.branchName || '') + '\n' + (it.detail || '') + '\n\n진행할까요?');
    if (!confirm(cfmMsg)) return;
    btn.disabled = true;
    var orig = btn.textContent;
    btn.textContent = '처리중…';
    var rj = btn.parentNode && btn.parentNode.querySelector('.__wpRj');
    if (rj) rj.disabled = true;
    runActionCore(it).then(function(note) {
      return decideReq(it.id, '완료', note || '', it.slackTs);
    }).then(function() {
      toast(pick ? '✓ 수기피킹 완료 처리됐습니다' : (passthru ? ('✓ ' + it.action + ' 접수 · D+1 반영 예정') : ('✓ ' + it.action + ' 완료 처리됐습니다')), '#0a7d47');
      try { viewReview(); } catch (_e) {}
    }).catch(function(e) {
      btn.textContent = '확인 중…';
      afterWriteFail(e, it.id, '✓ ' + it.action + ' 완료 (응답 지연 → 서버에서 확인됨)', it.action + ' 반영 실패', function(msg) {
        toast(msg, '#0a7d47');
        try { viewReview(); } catch (_e2) {}
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
    if (!confirm('[물류승인] ' + (it.branchName || '') + '\n우린담당·주기·배송시작일을 오피스에 반영하고 요청을 완료 처리합니다.' + (_eq ? '\n\n설비 요청건 → 슬랙에 자산담당(김대홍) 확인요청이 함께 발송됩니다.\n · ' + _eq : '') + '\n\n진행할까요?')) return;
    btn.disabled = true;
    var o = btn.textContent;
    btn.textContent = '처리중…';
    var chain = runActionCore(it);
    chain.then(function(note) {
      return decideStage(it.id, stage, note || '', it.slackTs);
    }).then(function() {
      toast(stage + '승인 처리됐습니다', '#0a7d47');
      try { viewReview(); } catch (_se) {}
    }).catch(function(e) {
      btn.textContent = '확인 중…';
      /* 물류승인은 완료 처리되지만, 응답이 깨진 경우 처리메모의 '물류승인:' 표시로도 판정 */
      if (e && e.badResponse) {
        reqStatus(it.id).then(function(r) {
          if (r && (String(r.memo || '').indexOf(stage + '승인:') > -1 || (r.status && r.status !== '대기'))) {
            toast(stage + '승인 처리됐습니다 (응답 지연 → 서버에서 확인됨)', '#0a7d47');
            try { viewReview(); } catch (_se2) {}
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

  function getForm(id) {
    return fetch('/office/sales/branch/update/' + id).then(function(r) {
      return r.text();
    }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var form = doc.querySelector('form');
      if (!form) throw new Error('수정 폼을 열 수 없음(권한/로그인 확인)');
      return form;
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
                if (r.course === '스낵택배') {
                  setVal(form, 'deliveryType', '택배');
                  msgs.push('배송방법=택배');
                } else if (cur === '스낵택배') {
                  setVal(form, 'deliveryType', '방문');
                  msgs.push('배송방법=방문');
                }
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
