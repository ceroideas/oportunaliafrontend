import { Component, HostListener } from '@angular/core';
import { Settings, AppSettings } from './app.settings';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DomHandlerService } from './dom-handler.service';
import { UserService } from './api/user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  @HostListener('window:beforeunload', [ '$event' ])
  beforeUnloadHandler(event) {
    localStorage.removeItem('popupofertas');
  }

  public settings: Settings;
  constructor(public appSettings:AppSettings,
              public router: Router,
              public userService: UserService,
              public translate: TranslateService,
              private domHandlerService: DomHandlerService){
    this.settings = this.appSettings.settings;
    translate.addLangs(['es','en','de','fr','ru','tr']);
    translate.setDefaultLang('es');
    translate.use('es');
    this.checkIfUserAuthenticated();
  }

  checkIfUserAuthenticated() {
    const token = this.userService.getToken();
    if (token) {

      this.userService.setAuthToken(token);
    }
  }

  ngAfterViewInit(){
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.domHandlerService.winScroll(0, 0);
      }
    });
  }

  ngOnInit(): void {
    this.inicializarControlCookies();
  }

  private inicializarControlCookies(): void {
    // Evitamos ejecutarlo si estamos haciendo Server-Side Rendering (SSR)
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const COOKIE_NAME = 'oportunalia_cookie_consent';
    const MAX_AGE = 60 * 60 * 24 * 180; // 180 días

    const readConsent = () => {
      try {
        const m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
        if (!m) return null;
        return JSON.parse(decodeURIComponent(m[1]));
      } catch (e) { return null; }
    };

    const writeConsent = (obj: any) => {
      try {
        obj.ts = Date.now();
        document.cookie = COOKIE_NAME + '=' + encodeURIComponent(JSON.stringify(obj)) +
          ';path=/;max-age=' + MAX_AGE + ';SameSite=Lax';
      } catch (e) {}
    };

    const banner = () => document.getElementById('oportunalia-cookie-banner');
    const modal = () => document.getElementById('oportunalia-cookie-modal');
    const showBanner = () => {
      const b = banner();
      if (b) b.style.setProperty('display', 'block');
    };
    const hideBanner = () => { const b = banner(); if (b) b.style.display = 'none'; };

    const showModal = () => {
      const c = readConsent() || {};
      // Ahora lee y asigna el estado real guardado de cada uno de los 3 interruptores
      const t = document.getElementById('oportunalia-cat-tecnicas') as HTMLInputElement; if (t) t.checked = !!c.tecnicas;
      const a = document.getElementById('oportunalia-cat-analytics') as HTMLInputElement; if (a) a.checked = !!c.analytics;
      const m = document.getElementById('oportunalia-cat-marketing') as HTMLInputElement; if (m) m.checked = !!c.marketing;

      const md = modal(); if (md) md.style.display = 'flex';
    };
    const hideModal = () => { const md = modal(); if (md) md.style.display = 'none'; };

    const applyConsent = (consent: any) => {
      try {
        const scripts = document.querySelectorAll('script[type="text/plain"][data-oportunalia-cookie]');
        if (!scripts || scripts.length === 0) return;

        scripts.forEach((old: any) => {
          if (!old) return;
          const cat = old.getAttribute('data-oportunalia-cookie');
          if (!consent || !consent[cat]) return;

          const s = document.createElement('script');
          for (let i = 0; i < old.attributes.length; i++) {
            const at = old.attributes[i];
            if (at.name === 'type' || at.name === 'data-oportunalia-cookie') continue;
            s.setAttribute(at.name, at.value);
          }
          if (!old.src) s.text = old.textContent;
          if (old.parentNode) old.parentNode.replaceChild(s, old);
        });
        document.dispatchEvent(new CustomEvent('oportunaliaCookieConsent', { detail: consent }));
      } catch (err) { console.warn("Error aplicando scripts de cookies:", err); }
    };

    // Declaración explícita y segura en el objeto Window global
    (window as any).oportunaliaCookies = {
      acceptAll: () => {
        const c = { tecnicas: true, analytics: true, marketing: true };
        writeConsent(c); hideModal(); hideBanner(); applyConsent(c);
      },
      rejectAll: () => {
        const c = { tecnicas: false, analytics: false, marketing: false };
        writeConsent(c); hideModal(); hideBanner();
      },
      saveSelection: () => {
        const t = document.getElementById('oportunalia-cat-tecnicas') as HTMLInputElement;
        const a = document.getElementById('oportunalia-cat-analytics') as HTMLInputElement;
        const m = document.getElementById('oportunalia-cat-marketing') as HTMLInputElement;

        // Guardamos el estado exacto de los tres elementos interactivos
        const c = {
          tecnicas: t && t.checked,
          analytics: a && a.checked,
          marketing: m && m.checked
        };

        writeConsent(c);
        hideModal();
        hideBanner();
        applyConsent(c);
      },
      openSettings: () => { showModal(); },
      reset: () => { document.cookie = COOKIE_NAME + '=;path=/;max-age=0'; location.reload(); }
    };

    // Escuchadores de eventos para cerrar el modal
    document.addEventListener('click', (e: MouseEvent) => { if (e.target === modal()) hideModal(); });
    document.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') hideModal(); });

    // Verificación inicial con un sutil retraso para respetar el ciclo de renderizado de Angular
    setTimeout(() => {
      const c = readConsent();
      if (c) { applyConsent(c); } else { showBanner(); }
    }, 600);
  }
}
