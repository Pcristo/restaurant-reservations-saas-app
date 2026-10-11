let isLoaded = false;

export const loadReCaptcha = (siteKey: string) => {
  if (isLoaded || !siteKey || typeof window === 'undefined') return;
  
  if (document.getElementById('recaptcha-v3-script')) {
    isLoaded = true;
    return;
  }

  const script = document.createElement('script');
  script.id = 'recaptcha-v3-script';
  script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    isLoaded = true;
  };
  document.body.appendChild(script);
};

export const executeReCaptcha = async (action: string): Promise<string | null> => {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    return 'mock-token';
  }

  if (typeof window === 'undefined') {
    return 'mock-token';
  }

  try {
    loadReCaptcha(siteKey);

    return await new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20; // 2 seconds timeout max

      const checkAndExecute = () => {
        attempts++;
        if (attempts >= maxAttempts) {
          console.warn('[reCAPTCHA] Initialization timed out, falling back gracefully to mock token.');
          resolve('mock-token');
          return;
        }

        const grecaptcha = (window as any).grecaptcha;
        if (grecaptcha && grecaptcha.ready) {
          try {
            grecaptcha.ready(() => {
              grecaptcha
                .execute(siteKey, { action })
                .then((token: string) => {
                  resolve(token || 'mock-token');
                })
                .catch((err: any) => {
                  console.warn('[reCAPTCHA] Execution error (e.g. domain not verified), falling back to mock token:', err);
                  resolve('mock-token');
                });
            });
          } catch (e) {
            console.warn('[reCAPTCHA] Ready handler error, falling back:', e);
            resolve('mock-token');
          }
        } else {
          setTimeout(checkAndExecute, 100);
        }
      };

      checkAndExecute();
    });
  } catch (err) {
    console.warn('[reCAPTCHA] Unexpected error, falling back:', err);
    return 'mock-token';
  }
};
