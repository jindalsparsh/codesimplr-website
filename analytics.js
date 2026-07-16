(() => {
  if (window.location.protocol === 'file:') return;

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  if (document.querySelector('script[data-codesimplr-vercel-analytics]')) return;

  const analyticsScript = document.createElement('script');
  analyticsScript.defer = true;
  analyticsScript.src = '/_vercel/insights/script.js';
  analyticsScript.dataset.codesimplrVercelAnalytics = 'true';
  document.head.appendChild(analyticsScript);
})();
