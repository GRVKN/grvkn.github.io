(() => {
  const installButton = document.querySelector('#install-app-button');
  const installLabel = installButton?.querySelector('[data-install-label]');
  const installIcon = installButton?.querySelector('[data-install-icon]');
  const helpDialog = document.querySelector('#install-help-dialog');
  const dialogTitle = document.querySelector('#install-dialog-title');
  const dialogCopy = document.querySelector('#install-dialog-copy');

  let deferredPrompt = null;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  const wasInstalled = () => {
    try {
      return window.localStorage.getItem('grvkn_pwa_installed') === 'true';
    } catch (_) {
      return false;
    }
  };

  const markAsInstalled = () => {
    if (!installButton || !installLabel || !installIcon) return;
    installLabel.textContent = 'GRVKN öffnen';
    installIcon.textContent = '↗';
    installButton.dataset.installed = 'true';
    installButton.setAttribute('aria-label', 'Installierte GRVKN App öffnen');
    try {
      window.localStorage.setItem('grvkn_pwa_installed', 'true');
    } catch (_) {
      // Der Öffnen-Zustand funktioniert auch ohne lokalen Speicher weiter.
    }
  };

  const showHelp = (ios) => {
    if (!helpDialog || !dialogTitle || !dialogCopy) return;

    if (ios) {
      dialogTitle.textContent = 'GRVKN auf iPhone oder iPad installieren';
      dialogCopy.innerHTML = `
        <ol class="install-steps">
          <li>Öffne diese Seite in <strong>Safari</strong>.</li>
          <li>Tippe auf <strong>Teilen</strong> <span class="share-symbol" aria-label="Teilen-Symbol">□↑</span>.</li>
          <li>Wähle <strong>„Zum Home-Bildschirm“</strong>.</li>
        </ol>
        <p class="install-dialog-note">Danach erscheint GRVKN mit eigenem Symbol auf deinem Home-Bildschirm.</p>`;
    } else {
      dialogTitle.textContent = 'GRVKN installieren';
      dialogCopy.innerHTML = `
        <p>Der automatische Installationsdialog ist in diesem Browser gerade nicht verfügbar.</p>
        <p>Öffne das Browsermenü und wähle <strong>„App installieren“</strong> oder <strong>„Zum Startbildschirm hinzufügen“</strong>.</p>`;
    }

    if (typeof helpDialog.showModal === 'function') {
      helpDialog.showModal();
    } else {
      helpDialog.setAttribute('open', '');
    }
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    markAsInstalled();
    if (helpDialog?.open) helpDialog.close();
  });

  installButton?.addEventListener('click', async () => {
    if (isStandalone() || installButton.dataset.installed === 'true') {
      window.location.assign('/app/');
      return;
    }

    if (isIos) {
      showHelp(true);
      return;
    }

    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') markAsInstalled();
      return;
    }

    showHelp(false);
  });

  if (isStandalone() || wasInstalled()) markAsInstalled();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/pwa-sw.js', { scope: '/' }).catch(() => {
      // Die Landingpage bleibt auch ohne Service Worker vollständig nutzbar.
    });
  }
})();
