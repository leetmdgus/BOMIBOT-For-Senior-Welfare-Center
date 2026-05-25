/**
 * 예전 v0 PWA Workbox가 127.0.0.1:8020 fetch 를 가로채는 문제 방지.
 * React보다 먼저 실행되도록 layout <head> 에 넣습니다.
 */
export function UnregisterStaleSwScript() {
  const script = `
(function () {
  if (!("serviceWorker" in navigator)) return;
  var key = "bomi_sw_cleared_v1";
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    if (!regs.length) return;
    Promise.all(regs.map(function (r) { return r.unregister(); }))
      .then(function () {
        if ("caches" in window) {
          return caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          });
        }
      })
      .then(function () {
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          location.reload();
        } else {
          sessionStorage.removeItem(key);
        }
      });
  });
})();
`.trim()

  return (
    <script
      id="unregister-stale-sw"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  )
}
