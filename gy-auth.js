/* Guangyu Hanyu · hệ thống mã học viên · New HSK 4 */
(function () {
  const SK = 'gy-h4-session', DK = 'gy-h4-device';
  const ls = {
    get(k) { try { return localStorage.getItem(k) } catch (e) { return null } },
    set(k, v) { try { localStorage.setItem(k, v) } catch (e) { } },
    del(k) { try { localStorage.removeItem(k) } catch (e) { } }
  };
  const dev = () => { let d = ls.get(DK); if (!d) { d = Math.random().toString(36).slice(2) + Date.now().toString(36); ls.set(DK, d) } return d };
  const label = () => { const u = navigator.userAgent; return /iPhone|iPad/.test(u) ? 'iOS' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'Khác' };
  const raw = () => { try { return JSON.parse(ls.get(SK) || 'null') } catch (e) { return null } };
  const valid = s => s && s.exp && new Date(s.exp) >= new Date(new Date().toDateString());
  const hex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function call(code) {
    const url = (window.GY_SCRIPT_URL || '') + '?code=' + encodeURIComponent(code) + '&dev=' + encodeURIComponent(dev()) + '&label=' + encodeURIComponent(label()) + '&t=' + Date.now();
    const r = await fetch(url, { cache: 'no-store' });
    return r.json();
  }
  async function aes(unit, enc) {
    const s = GY.session(); const k = s && s.keys && s.keys[unit]; if (!k) throw new Error('nokey');
    const key = await crypto.subtle.importKey('raw', hex(k), 'AES-GCM', false, ['decrypt']);
    const d = b64(enc);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: d.slice(0, 12) }, key, d.slice(12)));
  }
  window.GY = {
    ERR: {
      notfound: 'Mã không đúng. Bạn kiểm tra lại 8 chữ số nhé.',
      expired: 'Mã đã hết hạn. Bạn liên hệ Thầy để gia hạn nhé.',
      locked: 'Mã đang bị khóa. Bạn liên hệ Thầy nhé.',
      nodate: 'Mã chưa được kích hoạt. Bạn liên hệ Thầy nhé.',
      missing: 'Bạn nhập mã học viên nhé.',
      network: 'Không kết nối được. Bạn kiểm tra mạng rồi thử lại nhé.'
    },
    rawSession: raw,
    session() { const s = raw(); return valid(s) ? s : null },
    key(u) { const s = GY.session(); return !!(s && s.keys && s.keys[u]) },
    fmtDate(d) { const x = new Date(d); return isNaN(x) ? '' : String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + '/' + x.getFullYear() },
    async login(code) {
      code = String(code || '').replace(/\D/g, '');
      if (!code) return { ok: false, error: 'missing' };
      let r; try { r = await call(code) } catch (e) { return { ok: false, error: 'network' } }
      if (!r || !r.ok) return { ok: false, error: (r && r.error) || 'notfound' };
      ls.set(SK, JSON.stringify({ code, name: r.name, exp: r.expires, lessons: r.lessons || [], keys: r.keys || {}, ts: Date.now() }));
      return { ok: true };
    },
    async refresh() {
      const s = raw(); if (!s || !s.code) return false;
      let r; try { r = await call(s.code) } catch (e) { return false }
      if (r && r.ok) { ls.set(SK, JSON.stringify({ code: s.code, name: r.name, exp: r.expires, lessons: r.lessons || [], keys: r.keys || {}, ts: Date.now() })); return true }
      if (r && r.error === 'expired') { s.keys = {}; s.exp = r.expires || s.exp; ls.set(SK, JSON.stringify(s)); return false }
      if (r && r.error) ls.del(SK);
      return false;
    },
    logout() { ls.del(SK) },
    async decrypt(unit, enc) { return new TextDecoder().decode(await aes(unit, enc)) },
    async decryptPage(unit, enc) {
      const buf = await aes(unit, enc);
      const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
      return await new Response(ds).text();
    }
  };
})();
