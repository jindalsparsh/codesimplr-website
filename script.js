/* ============================================================
   Antigravity Agency — Main Script
   Pure vanilla ES6+ · No dependencies
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_WHATSAPP_NUMBER = '919555163525';

  const openWhatsapp = (message, phoneNumber = DEFAULT_WHATSAPP_NUMBER) => {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    const opened = window.open(url, '_blank');

    if (opened) {
      opened.opener = null;
    } else {
      window.location.href = url;
    }
  };

  const ATTRIBUTION_KEY = 'codesimplr_campaign_attribution';

  const getCampaignAttribution = () => {
    const params = new URLSearchParams(window.location.search);
    const current = {
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
    };

    try {
      const saved = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || '{}');
      const attribution = {
        utmSource: current.utmSource || saved.utmSource || '',
        utmMedium: current.utmMedium || saved.utmMedium || '',
        utmCampaign: current.utmCampaign || saved.utmCampaign || '',
        landingPage: saved.landingPage || window.location.href,
      };

      if (current.utmSource || current.utmMedium || current.utmCampaign) {
        attribution.landingPage = window.location.href;
      }

      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
      return attribution;
    } catch {
      return { ...current, landingPage: window.location.href };
    }
  };

  getCampaignAttribution();

  const saveSignup = (payload) => {
    if (window.location.protocol === 'file:') return Promise.resolve(false);

    return fetch('/api/signups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        ...payload,
        ...getCampaignAttribution(),
        pageUrl: window.location.href,
        referrer: document.referrer || '',
      }),
    })
      .then((response) => response.ok)
      .catch(() => {
        // Keep WhatsApp as the fallback path if storage is not configured yet.
        return false;
      });
  };

  const randomId = (prefix) => {
    if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  };

  const getVisitorId = () => {
    try {
      const key = 'codesimplr_visitor_id';
      const existing = window.localStorage.getItem(key);
      if (existing) return existing;

      const next = randomId('visitor');
      window.localStorage.setItem(key, next);
      return next;
    } catch {
      return randomId('visitor');
    }
  };

  const getSessionId = () => {
    try {
      const key = 'codesimplr_session_id';
      const existing = window.sessionStorage.getItem(key);
      if (existing) return existing;

      const next = randomId('session');
      window.sessionStorage.setItem(key, next);
      return next;
    } catch {
      return randomId('session');
    }
  };

  const trackEvent = (eventType, metadata = {}) => {
    if (window.location.protocol === 'file:') return Promise.resolve(false);

    const attribution = getCampaignAttribution();
    return fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventType,
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        path: window.location.pathname,
        pageUrl: window.location.href,
        referrer: document.referrer || '',
        utmSource: attribution.utmSource,
        utmMedium: attribution.utmMedium,
        utmCampaign: attribution.utmCampaign,
        metadata: {
          pageTitle: document.title,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...metadata,
        },
      }),
    })
      .then((response) => response.ok)
      .catch(() => false);
  };

  trackEvent('page_view');

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const trackedLink = event.target.closest('[data-track], a[href*="wa.me"], a[href="contact.html"]');
    if (!trackedLink) return;

    trackEvent('cta_click', {
      label: trackedLink.dataset.track || trackedLink.textContent.trim().replace(/\s+/g, ' ').slice(0, 120),
      href: trackedLink.getAttribute('href') || '',
    });
  }, { capture: true });

  /* ----------------------------------------------------------
     1. SCROLL-REVEAL ANIMATION SYSTEM
     ---------------------------------------------------------- */
  const initScrollReveal = () => {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          // Honour per-element stagger delay (data-delay="200")
          const delay = parseInt(entry.target.dataset.delay, 10) || 0;

          if (delay > 0) {
            setTimeout(() => entry.target.classList.add('active'), delay);
          } else {
            entry.target.classList.add('active');
          }

          // Once revealed, stop watching
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1 }
    );

    reveals.forEach((el) => observer.observe(el));
  };

  initScrollReveal();

  /* ----------------------------------------------------------
     2. NAVBAR SCROLL EFFECT
     ---------------------------------------------------------- */
  const initNavbarScroll = () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const SCROLL_THRESHOLD = 50;

    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
    };

    // Fire once on load in case user refreshed mid-page
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  initNavbarScroll();

  /* ----------------------------------------------------------
     3. MOBILE NAVIGATION TOGGLE
     ---------------------------------------------------------- */
  const initMobileNav = () => {
    const navbar = document.querySelector('.navbar');
    const toggle = document.querySelector('.nav-toggle');
    if (!navbar || !toggle) return;

    const navLinks = navbar.querySelectorAll('a[href]');

    const openMenu = () => {
      navbar.classList.add('nav-open');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      navbar.classList.remove('nav-open');
      document.body.style.overflow = '';
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navbar.classList.contains('nav-open') ? closeMenu() : openMenu();
    });

    // Close when a link is clicked
    navLinks.forEach((link) =>
      link.addEventListener('click', closeMenu)
    );

    // Close when clicking outside the navbar
    document.addEventListener('click', (e) => {
      if (navbar.classList.contains('nav-open') && !navbar.contains(e.target)) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  };

  initMobileNav();

  /* ----------------------------------------------------------
     4. SERVICE TABS SYSTEM
     ---------------------------------------------------------- */
  const initServiceTabs = () => {
    const tabButtons = document.querySelectorAll('[data-tab]');
    const tabPanels = document.querySelectorAll('.tab-panel');
    if (!tabButtons.length || !tabPanels.length) return;

    const activateTab = (tabId) => {
      // Deactivate all
      tabButtons.forEach((btn) => btn.classList.remove('active'));
      tabPanels.forEach((panel) => {
        panel.classList.remove('active');
        panel.style.opacity = '0';
      });

      // Activate matched button + panel
      const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
      const activePanel = document.querySelector(`.tab-panel[data-panel="${tabId}"]`);

      if (activeBtn) activeBtn.classList.add('active');
      if (activePanel) {
        activePanel.classList.add('active');
        // Fade in after a micro-delay so the browser registers the change
        requestAnimationFrame(() => {
          activePanel.style.opacity = '1';
        });
      }
    };

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });

    // Default: first tab active
    const defaultTab = tabButtons[0]?.dataset.tab;
    if (defaultTab) activateTab(defaultTab);
  };

  initServiceTabs();

  /* ----------------------------------------------------------
     RECRUITMENT AUTOMATION ROI CALCULATOR
     ---------------------------------------------------------- */
  const initRecruitmentRoiCalculator = () => {
    const form = document.getElementById('recruitmentRoiCalculator');
    if (!form) return;

    const workflow = document.getElementById('roiWorkflow');
    const hoursReturned = document.getElementById('roiHoursReturned');
    const capacityValue = document.getElementById('roiCapacityValue');
    const beforeHours = document.getElementById('roiBeforeHours');
    const afterHours = document.getElementById('roiAfterHours');
    const afterBar = document.getElementById('roiAfterBar');
    const whatsappButton = document.getElementById('roiWhatsapp');
    const auditLink = document.getElementById('roiAuditLink');
    const pilotLink = document.getElementById('roiPilotLink');
    const copyButton = document.getElementById('roiCopyLink');
    const copyStatus = document.getElementById('roiCopyStatus');
    const pageParams = new URLSearchParams(window.location.search);
    const monthFactor = 4.33;
    const currency = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

    const controlPairs = [
      {
        number: document.getElementById('roiRecruiters'),
        range: document.getElementById('roiRecruitersRange'),
        query: 'recruiters',
      },
      {
        number: document.getElementById('roiAdminHours'),
        range: document.getElementById('roiAdminHoursRange'),
        query: 'admin_hours',
      },
      {
        number: document.getElementById('roiHourlyCost'),
        range: document.getElementById('roiHourlyCostRange'),
        query: 'cost',
      },
      {
        number: document.getElementById('roiAddressableShare'),
        range: document.getElementById('roiAddressableShareRange'),
        query: 'share',
      },
    ];

    const clamp = (value, input) => {
      const parsed = Number(value);
      const fallback = Number(input.defaultValue);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(Number(input.max), Math.max(Number(input.min), parsed));
    };

    const readModel = () => {
      const recruiters = clamp(controlPairs[0].number.value, controlPairs[0].number);
      const adminHours = clamp(controlPairs[1].number.value, controlPairs[1].number);
      const hourlyCost = clamp(controlPairs[2].number.value, controlPairs[2].number);
      const addressableShare = clamp(controlPairs[3].number.value, controlPairs[3].number);
      const monthlyAdminHours = recruiters * adminHours * monthFactor;
      const returnedHours = monthlyAdminHours * (addressableShare / 100);
      const remainingHours = Math.max(0, monthlyAdminHours - returnedHours);

      return {
        workflow: workflow.value,
        workflowLabel: workflow.options[workflow.selectedIndex]?.text || 'Candidate intake',
        recruiters,
        adminHours,
        hourlyCost,
        addressableShare,
        monthlyAdminHours,
        returnedHours,
        remainingHours,
        monthlyCapacityValue: returnedHours * hourlyCost,
      };
    };

    const buildContactUrl = (offer, model) => {
      const params = new URLSearchParams({
        offer,
        stage: 'roi-calculator',
        interest: 'ai,tracking',
        workflow: model.workflow,
        recruiters: String(model.recruiters),
        admin_hours: String(model.adminHours),
        cost: String(model.hourlyCost),
        share: String(model.addressableShare),
        estimate_hours: String(Math.round(model.returnedHours)),
        estimate_value: String(Math.round(model.monthlyCapacityValue)),
      });
      return `contact.html?${params.toString()}`;
    };

    const buildShareUrl = (model) => {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('workflow', model.workflow);
      url.searchParams.set('recruiters', model.recruiters);
      url.searchParams.set('admin_hours', model.adminHours);
      url.searchParams.set('cost', model.hourlyCost);
      url.searchParams.set('share', model.addressableShare);
      url.searchParams.set('utm_source', 'calculator-share');
      url.searchParams.set('utm_medium', 'referral');
      url.searchParams.set('utm_campaign', 'recruitment-roi-calculator');
      return url.toString();
    };

    const buildEstimateMessage = (model) => [
      'Hi CodeSimplr! I used the recruitment automation ROI calculator.',
      `Workflow: ${model.workflowLabel}`,
      `Team: ${model.recruiters} recruiters`,
      `Current admin time: ${model.adminHours} hours per recruiter / week`,
      `Addressable share: ${model.addressableShare}%`,
      `Estimate: ${number.format(Math.round(model.returnedHours))} hours returned / month`,
      `Estimated capacity value: ${currency.format(Math.round(model.monthlyCapacityValue))} / month`,
      'I would like a free workflow audit to validate these assumptions against our real process.',
    ].join('\n');

    const render = () => {
      const model = readModel();
      hoursReturned.textContent = number.format(Math.round(model.returnedHours));
      capacityValue.textContent = currency.format(Math.round(model.monthlyCapacityValue));
      beforeHours.textContent = `${number.format(Math.round(model.monthlyAdminHours))} hrs`;
      afterHours.textContent = `${number.format(Math.round(model.remainingHours))} hrs`;
      afterBar.style.width = `${Math.max(0, Math.min(100, (model.remainingHours / model.monthlyAdminHours) * 100))}%`;
      auditLink.href = buildContactUrl('recruitment-automation-audit', model);
      pilotLink.href = buildContactUrl('recruitment-automation-pilot', model);
      whatsappButton.dataset.message = buildEstimateMessage(model);
      copyButton.dataset.shareUrl = buildShareUrl(model);
      return model;
    };

    controlPairs.forEach((pair) => {
      const incoming = pageParams.get(pair.query);
      if (incoming !== null) {
        const value = clamp(incoming, pair.number);
        pair.number.value = value;
        pair.range.value = value;
      }

      pair.range.addEventListener('input', () => {
        pair.number.value = pair.range.value;
        render();
      });

      pair.number.addEventListener('input', () => {
        if (pair.number.value === '') return;
        const value = clamp(pair.number.value, pair.number);
        pair.range.value = value;
        render();
      });

      pair.number.addEventListener('change', () => {
        const value = clamp(pair.number.value, pair.number);
        pair.number.value = value;
        pair.range.value = value;
        render();
      });
    });

    const incomingWorkflow = pageParams.get('workflow');
    if (incomingWorkflow && Array.from(workflow.options).some((option) => option.value === incomingWorkflow)) {
      workflow.value = incomingWorkflow;
    }

    workflow.addEventListener('change', render);

    whatsappButton.addEventListener('click', () => {
      render();
      openWhatsapp(whatsappButton.dataset.message);
    });

    copyButton.addEventListener('click', async () => {
      const url = copyButton.dataset.shareUrl;
      let copied = false;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          copied = true;
        }
      } catch {
        copied = false;
      }

      if (!copied) {
        const temporary = document.createElement('textarea');
        temporary.value = url;
        temporary.setAttribute('readonly', '');
        temporary.style.position = 'fixed';
        temporary.style.opacity = '0';
        document.body.appendChild(temporary);
        temporary.select();
        copied = document.execCommand('copy');
        temporary.remove();
      }

      copyStatus.textContent = copied ? 'Share link copied.' : 'Copy failed. Select the address from your browser instead.';
      setTimeout(() => { copyStatus.textContent = ''; }, 3500);
    });

    render();
  };

  initRecruitmentRoiCalculator();

  /* ----------------------------------------------------------
     5. SMOOTH SCROLL FOR ANCHOR LINKS
     ---------------------------------------------------------- */
  const initSmoothScroll = () => {
    const NAVBAR_OFFSET = 70;

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#' || href === '#!') return; // skip placeholder links

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();

        const top =
          target.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;

        window.scrollTo({ top, behavior: 'smooth' });

        // Update hash without a jarring jump
        history.pushState(null, '', href);
      });
    });
  };

  initSmoothScroll();

  /* ----------------------------------------------------------
     6. CONTACT FORM — MULTI-STEP + CHIP SELECTION
     ---------------------------------------------------------- */
  const initContactForm = () => {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    const steps = form.querySelectorAll('.form-step');
    const nextBtns = form.querySelectorAll('.form-next');
    const prevBtns = form.querySelectorAll('.form-prev');
    const chips = form.querySelectorAll('.interest-chip');
    const pageParams = new URLSearchParams(window.location.search);
    const offerInput = form.querySelector('[name="offer"]');
    const funnelStageInput = form.querySelector('[name="funnelStage"]');
    let currentStep = 0;

    const offerFromUrl = pageParams.get('offer');
    const stageFromUrl = pageParams.get('stage');
    if (offerFromUrl && offerInput) offerInput.value = offerFromUrl;
    if (stageFromUrl && funnelStageInput) funnelStageInput.value = stageFromUrl;

    const contactOfferCopy = {
      'recruitment-automation-audit': {
        kicker: 'Recruitment Workflow Audit',
        title: 'Get Your Free Recruitment Workflow Audit',
        intro: 'Share the repeated candidate intake, follow-up, or reporting step. CodeSimplr will reply with three practical priorities and identify whether one bounded pilot is worth scoping.',
        submit: 'Get My Recruitment Audit',
      },
      'recruitment-automation-pilot': {
        kicker: 'Paid 14-Day Pilot',
        title: 'Scope Your Recruitment Workflow Pilot',
        intro: 'Share the workflow, current tools, and main bottleneck. CodeSimplr will confirm a bounded 14-day scope, required access, acceptance criteria, fixed price, and payment schedule before any implementation begins.',
        submit: 'Request My Pilot Scope',
      },
    };

    const offerCopy = contactOfferCopy[offerInput?.value];
    if (offerCopy) {
      const kicker = document.getElementById('contactKicker');
      const title = document.getElementById('contactTitle');
      const intro = document.getElementById('contactIntro');
      const submit = document.getElementById('contactSubmitLabel');
      if (kicker) kicker.textContent = offerCopy.kicker;
      if (title) title.textContent = offerCopy.title;
      if (intro) intro.textContent = offerCopy.intro;
      if (submit) submit.textContent = offerCopy.submit;
    }

    const estimateHours = pageParams.get('estimate_hours');
    const estimateValue = pageParams.get('estimate_value');
    const estimateWorkflow = pageParams.get('workflow');
    const workflowLabels = {
      'candidate-intake': 'Candidate intake',
      'candidate-follow-up': 'Candidate follow-up',
      'weekly-reporting': 'Weekly reporting',
      'job-description-preparation': 'Job-description preparation',
    };
    const contactMessage = form.querySelector('#contactMessage');

    if (contactMessage && estimateHours && estimateValue && estimateWorkflow) {
      const recruiters = pageParams.get('recruiters');
      const adminHours = pageParams.get('admin_hours');
      const hourlyCost = pageParams.get('cost');
      const addressableShare = pageParams.get('share');
      const workflowLabel = workflowLabels[estimateWorkflow] || estimateWorkflow;
      const formattedValue = Number(estimateValue).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      });

      contactMessage.value = [
        `I modelled ${workflowLabel.toLowerCase()} in the CodeSimplr ROI calculator.`,
        recruiters ? `Team: ${recruiters} recruiters.` : '',
        adminHours ? `Current admin time: ${adminHours} hours per recruiter / week.` : '',
        hourlyCost ? `Loaded hourly cost: $${hourlyCost}.` : '',
        addressableShare ? `Addressable share: ${addressableShare}%.` : '',
        `Planning estimate: ${Number(estimateHours).toLocaleString('en-US')} hours returned and ${formattedValue} in capacity value per month.`,
        'Please validate these assumptions against our real workflow and recommend the best first pilot.',
      ].filter(Boolean).join('\n');
    }

    /* — helpers — */
    const showStep = (index) => {
      steps.forEach((step, i) => {
        step.classList.toggle('active', i === index);
      });
      currentStep = index;
    };

    const validateEmail = (email) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validateStep = (index) => {
      if (index === 0) {
        // At least one chip must be selected
        const selected = form.querySelectorAll('.interest-chip.selected');
        if (!selected.length) {
          highlightError(chips[0]?.parentElement, 'Please select at least one interest.');
          return false;
        }
        return true;
      }

      if (index === 1) {
        const name = form.querySelector('#contactName');
        const email = form.querySelector('#contactEmail');
        const message = form.querySelector('#contactMessage');
        let valid = true;

        if (name && !name.value.trim()) {
          highlightError(name, 'Name is required.');
          valid = false;
        }
        if (email && !validateEmail(email.value.trim())) {
          highlightError(email, 'Please enter a valid email.');
          valid = false;
        }
        if (message && !message.value.trim()) {
          highlightError(message, 'Message is required.');
          valid = false;
        }
        return valid;
      }

      return true;
    };

    const highlightError = (el, msg) => {
      if (!el) return;
      el.classList.add('error');
      // Remove after a brief moment so the user can retry
      setTimeout(() => el.classList.remove('error'), 2000);
    };

    /* — chip toggle — */
    chips.forEach((chip) => {
      chip.addEventListener('click', () => chip.classList.toggle('selected'));
    });

    const offerInterestDefaults = {
      'free-growth-audit': ['seo', 'website', 'ai'],
      'ai-automation-audit': ['ai'],
      'website-seo-audit': ['website', 'seo'],
      'n8n-automation-audit': ['ai'],
      'recruitment-automation-audit': ['ai', 'tracking'],
      'recruitment-automation-pilot': ['ai', 'tracking'],
    };
    const interestParam = pageParams.get('interest');
    const defaultInterests = new Set([
      ...(interestParam ? interestParam.split(',') : []),
      ...(offerInterestDefaults[offerInput?.value] || []),
    ].map((item) => item.trim()).filter(Boolean));

    if (defaultInterests.size) {
      chips.forEach((chip) => {
        if (defaultInterests.has(chip.dataset.interest)) {
          chip.classList.add('selected');
        }
      });
    }

    /* — step navigation — */
    nextBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (validateStep(currentStep) && currentStep < steps.length - 1) {
          showStep(currentStep + 1);
        }
      });
    });

    prevBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (currentStep > 0) showStep(currentStep - 1);
      });
    });

    /* — form submission — */
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateStep(currentStep)) return;

      const selectedInterests = Array.from(
        form.querySelectorAll('.interest-chip.selected')
      ).map((chip) => chip.textContent.trim().replace(/\s+/g, ' '));

      const name = form.querySelector('#contactName')?.value.trim();
      const email = form.querySelector('#contactEmail')?.value.trim();
      const company = form.querySelector('#contactCompany')?.value.trim();
      const message = form.querySelector('#contactMessage')?.value.trim();
      const website = form.querySelector('[name="website"]')?.value.trim();
      const offer = offerInput?.value.trim();
      const funnelStage = funnelStageInput?.value.trim();
      const whatsappMessage = [
        'Hi CodeSimplr! I would like to start a project.',
        offer ? `Offer: ${offer}` : '',
        selectedInterests.length ? `Interests: ${selectedInterests.join(', ')}` : '',
        name ? `Name: ${name}` : '',
        email ? `Email: ${email}` : '',
        company ? `Company: ${company}` : '',
        message ? `Project details: ${message}` : '',
      ].filter(Boolean).join('\n');

      const savePromise = saveSignup({
        source: 'contact',
        name,
        email,
        company,
        interests: selectedInterests,
        offer,
        funnelStage,
        message,
        website,
      });

      trackEvent('form_submit', {
        source: 'contact',
        offer: offer || '',
        funnelStage: funnelStage || '',
        interests: selectedInterests.join(', '),
      });

      openWhatsapp(
        whatsappMessage,
        form.dataset.whatsappNumber || DEFAULT_WHATSAPP_NUMBER
      );

      showStep(steps.length - 1);
      const successStep = steps[steps.length - 1];
      if (successStep) successStep.classList.add('confetti');
      const successText = successStep?.querySelector('.success-text');
      if (successText) {
        successText.textContent = 'Saving your project details. WhatsApp also opened so you can continue the conversation instantly.';
      }

      savePromise.then((saved) => {
        if (!successText) return;
        successText.textContent = saved
          ? 'Your project details were saved to CodeSimplr. WhatsApp also opened so you can continue the conversation instantly.'
          : 'WhatsApp opened with your project details. Signup storage will start saving records once the Vercel database is connected.';
      });

      // Reset after 3 seconds
      setTimeout(() => {
        form.reset();
        chips.forEach((c) => c.classList.remove('selected'));
        if (successStep) successStep.classList.remove('confetti');
        showStep(0);
      }, 3000);
    });

    // Init first step
    showStep(0);
  };

  initContactForm();

  /* ----------------------------------------------------------
     7. NEWSLETTER FORM
     ---------------------------------------------------------- */
  const initNewsletter = () => {
    const form = document.getElementById('newsletterForm');
    if (!form) return;

    const successEl = document.getElementById('newsletterSuccess');

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailInput = form.querySelector('#newsletterEmail');
      const email = emailInput?.value.trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailInput?.classList.add('error');
        setTimeout(() => emailInput?.classList.remove('error'), 2000);
        return;
      }

      const savePromise = saveSignup({
        source: 'newsletter',
        email,
        website: form.querySelector('[name="website"]')?.value.trim(),
      });

      trackEvent('form_submit', {
        source: 'newsletter',
      });

      openWhatsapp(
        `Hi CodeSimplr! Please subscribe ${email} to the CodeSimplr Report.`
      );

      if (successEl) successEl.style.display = 'block';
      if (successEl) {
        successEl.textContent = 'Saving your email. WhatsApp opened as a direct follow-up channel.';
      }
      form.style.display = 'none';

      savePromise.then((saved) => {
        if (!successEl) return;
        successEl.textContent = saved
          ? 'Thanks, your email was saved to the CodeSimplr signup database.'
          : 'WhatsApp opened with your subscription request. Signup storage will start saving records once the Vercel database is connected.';
      });

      // Restore form after a few seconds
      setTimeout(() => {
        form.reset();
        form.style.display = '';
        if (successEl) successEl.style.display = 'none';
      }, 4000);
    });
  };

  initNewsletter();

  /* ----------------------------------------------------------
     8. ANIMATED BACKGROUND PARTICLES (Hero Section)
     ---------------------------------------------------------- */
  const initParticles = () => {
    // hero-particles IS the canvas element in our HTML
    const canvas = document.getElementById('hero-particles');
    if (!canvas) return;
    const container = canvas.parentElement;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const PARTICLE_COUNT = 60;   // 50-80 range, 60 is a nice middle ground
    const CONNECT_DIST = 150;
    const accentColors = [
      [196, 216, 46],   // lime accent
      [139, 154, 61],   // sage accent
    ];

    let particles = [];
    let animId = null;

    const resize = () => {
      canvas.width = container?.offsetWidth || window.innerWidth;
      canvas.height = container?.offsetHeight || window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const color = accentColors[Math.floor(Math.random() * accentColors.length)];
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 2 + Math.random() * 3,               // radius 2-5
          opacity: 0.1 + Math.random() * 0.4,     // 0.1-0.5
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          color,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update & draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${p.opacity})`;
        ctx.fill();
      });

      // Draw connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECT_DIST) {
            const lineOpacity = (1 - dist / CONNECT_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(196,216,46,${lineOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    createParticles();
    draw();

    // Debounced resize handler
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        createParticles();
      }, 200);
    });

    // Cleanup if container is ever removed (SPA-friendly)
    const cleanupObserver = new MutationObserver(() => {
      if (!document.body.contains(container)) {
        cancelAnimationFrame(animId);
        cleanupObserver.disconnect();
      }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });
  };

  initParticles();

  /* ----------------------------------------------------------
     9. TECH STACK MARQUEE — pause on hover
     ---------------------------------------------------------- */
  const initMarquee = () => {
    const track = document.querySelector('.marquee-track');
    if (!track) return;

    track.addEventListener('mouseenter', () => track.classList.add('paused'));
    track.addEventListener('mouseleave', () => track.classList.remove('paused'));
  };

  initMarquee();

  /* ----------------------------------------------------------
     10. TYPING EFFECT
     ---------------------------------------------------------- */
  const initTypingEffect = () => {
    const el = document.querySelector('.typing-text');
    if (!el) return;

    const phrases = ['AI automations.', 'conversion websites.', 'SEO growth systems.'];
    const TYPE_SPEED = 80;       // ms per character
    const DELETE_SPEED = 40;
    const PAUSE_AFTER_TYPE = 1800;
    const PAUSE_AFTER_DELETE = 400;

    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    const tick = () => {
      const current = phrases[phraseIdx];

      if (!isDeleting) {
        // Typing forward
        charIdx++;
        el.textContent = current.substring(0, charIdx);

        if (charIdx === current.length) {
          isDeleting = true;
          setTimeout(tick, PAUSE_AFTER_TYPE);
          return;
        }
        setTimeout(tick, TYPE_SPEED);
      } else {
        // Deleting
        charIdx--;
        el.textContent = current.substring(0, charIdx);

        if (charIdx === 0) {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(tick, PAUSE_AFTER_DELETE);
          return;
        }
        setTimeout(tick, DELETE_SPEED);
      }
    };

    tick();
  };

  initTypingEffect();

  /* ----------------------------------------------------------
     11. COUNTER ANIMATION
     ---------------------------------------------------------- */
  const initCounters = () => {
    const counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    const DURATION = 2000; // ms

    // Ease-out quad for a pleasant deceleration
    const easeOut = (t) => t * (2 - t);

    const animateCounter = (el) => {
      const target = parseInt(el.dataset.target, 10);
      if (isNaN(target)) return;

      const start = performance.now();
      const suffix = el.dataset.suffix || ''; // e.g. '+' or '%'

      const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / DURATION, 1);
        const value = Math.floor(easeOut(progress) * target);

        el.textContent = value + suffix;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target + suffix;
        }
      };

      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    counters.forEach((c) => observer.observe(c));
  };

  initCounters();

  /* ----------------------------------------------------------
     UTILITY: Reduced-motion preference
     If the user prefers reduced motion, disable heavy animations.
     ---------------------------------------------------------- */
  (() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      // Immediately reveal all .reveal elements
      document.querySelectorAll('.reveal').forEach((el) =>
        el.classList.add('active')
      );
      // Skip typing effect (already started — clearing is optional)
    }
  })();

}); // end DOMContentLoaded
