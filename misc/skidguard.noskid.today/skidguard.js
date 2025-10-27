(function () {
    const STATES = {
        UNCHECKED: 'unchecked',
        AWAITING_FILE: 'awaiting-file',
        LOADING: 'loading',
        CHECKED: 'checked',
        ERROR: 'error'
    };

    const skidguard = {
        widgets: {},
        counter: 0,
        STATES,

        render(selector, options = {}) {
            const container = typeof selector === 'string'
                ? document.querySelector(selector)
                : selector;

            if (!container) throw new Error('skidguard.render: invalid selector');

            const widgetId = this.counter++;

            const size = ['normal', 'compact', 'invisible'].includes(options.size)
                ? options.size
                : 'normal';

            let theme = ['dark', 'light', 'auto'].includes(options.theme) ? options.theme : 'light';

            if (theme === 'auto') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

            const lang = this.sanitizeLang(options.language || 'en');

            // nskdlbr options
            const noskidOptions = this.parseNoskidOptions(options.noskid || {});

            const iframeUrl = this.buildIframeUrl({
                size,
                theme,
                lang,
                widgetId,
                noskidOptions
            });

            const wrapper = document.createElement('div');
            wrapper.className = `skidguard-wrapper skidguard-size-${size}`;
            wrapper.style.cssText = this.getWrapperStyles(size);

            const iframe = document.createElement('iframe');
            iframe.src = iframeUrl;
            iframe.className = 'skidguard-iframe';
            iframe.style.cssText = this.getIframeStyles(size);
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('scrolling', 'no');

            wrapper.appendChild(iframe);
            container.innerHTML = '';
            container.appendChild(wrapper);

            const widget = {
                id: widgetId,
                element: wrapper,
                iframe: iframe,
                token: '',
                state: STATES.UNCHECKED,
                options,
                certificateData: null,
                size: size
            };

            this.widgets[widgetId] = widget;

            this.setupMessageListener(widgetId);

            return widgetId;
        },

        sanitizeLang(lang) {
            return String(lang).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 2);
        },

        parseNoskidOptions(noskidOpts) {
            const parsed = {};

            // Debug mode
            if (typeof noskidOpts.debug === 'boolean') {
                parsed.debug = noskidOpts.debug ? '1' : '0';
            }

            // Strict check
            if (typeof noskidOpts.strictCheck === 'boolean') {
                parsed.strictCheck = noskidOpts.strictCheck ? '1' : '0';
            }

            // Allow achievements
            if (typeof noskidOpts.allowAchievements === 'boolean') {
                parsed.allowAchievements = noskidOpts.allowAchievements ? '1' : '0';
            }

            // Timeout (in milliseconds)
            if (typeof noskidOpts.timeout === 'number' && noskidOpts.timeout > 0) {
                parsed.timeout = String(noskidOpts.timeout);
            }

            // Use legacy API
            if (typeof noskidOpts.useLegacyAPI === 'boolean') {
                parsed.useLegacyAPI = noskidOpts.useLegacyAPI ? '1' : '0';
            }

            // Custom API URL (sanitize)
            if (typeof noskidOpts.apiUrl === 'string' && noskidOpts.apiUrl.trim()) {
                try {
                    const url = new URL(noskidOpts.apiUrl);
                    if (url.protocol === 'https:' || url.protocol === 'http:') {
                        parsed.apiUrl = encodeURIComponent(noskidOpts.apiUrl);
                    }
                } catch (e) {
                    console.warn('skidguard: Invalid apiUrl provided');
                }
            }

            return parsed;
        },

        buildIframeUrl(params) {
            const base = 'https://skidguard.noskid.today/challenge';
            const query = new URLSearchParams({
                size: params.size,
                theme: params.theme,
                lang: params.lang,
                widget_id: params.widgetId
            });

            // Add NskdLbr options to query
            Object.keys(params.noskidOptions).forEach(key => {
                query.set(`noskid_${key}`, params.noskidOptions[key]);
            });

            return `${base}?${query.toString()}`;
        },

        getWrapperStyles(size) {
            const styles = {
                normal: 'width: 300px; height: 70px;',
                compact: 'width: 150px; height: 90px;',
                invisible: 'width: 0; height: 0; overflow: hidden;'
            };
            return styles[size] || styles.normal;
        },

        getIframeStyles(size) {
            const styles = {
                normal: 'width: 300px; height: 70px; border: none;',
                compact: 'width: 150px; height: 90px; border: none;',
                invisible: 'width: 0; height: 0; border: none;'
            };
            return styles[size] || styles.normal;
        },

        setupMessageListener(widgetId) {
            window.addEventListener('message', (event) => {
                const data = event.data;

                if (data && data.widgetId === widgetId) {
                    const widget = this.widgets[widgetId];
                    if (!widget) return;

                    if (data.type === 'state') {
                        widget.state = data.state;
                    } else if (data.type === 'success') {
                        widget.token = data.token;
                        widget.certificateData = data.certificateData;
                        widget.state = STATES.CHECKED;

                        if (typeof widget.options.callback === 'function') {
                            widget.options.callback(data.token, data.certificateData);
                        }
                    } else if (data.type === 'error') {
                        widget.state = STATES.UNCHECKED;

                        if (typeof widget.options.errorCallback === 'function') {
                            widget.options.errorCallback(data.message);
                        }
                    }
                }
            });
        },

        setState(widgetId, newState) {
            const w = this.widgets[widgetId];
            if (!w) return;

            w.state = newState;

            w.iframe.contentWindow.postMessage({
                type: 'setState',
                state: newState
            }, '*');

            if (newState === STATES.UNCHECKED) {
                w.token = '';
                w.certificateData = null;
            }
        },

        execute(widgetId) {
            const w = this.widgets[widgetId];
            if (!w) {
                console.error('skidguard.execute: widget not found');
                return;
            }

            // Only allow execute for invisible widgets
            if (w.size !== 'invisible') {
                console.warn('skidguard.execute: only works with invisible widgets');
                return;
            }

            if (w.state !== STATES.UNCHECKED) {
                console.warn('skidguard.execute: widget is not in unchecked state');
                return;
            }

            w.iframe.contentWindow.postMessage({
                type: 'execute'
            }, '*');
        },

        getResponse(widgetId) {
            const w = this.widgets[widgetId];
            return w ? w.token : '';
        },

        getCertificateData(widgetId) {
            const w = this.widgets[widgetId];
            return w ? w.certificateData : null;
        },

        reset(widgetId) {
            const w = this.widgets[widgetId];
            if (!w) return;

            this.setState(widgetId, STATES.UNCHECKED);

            w.iframe.contentWindow.postMessage({
                type: 'reset'
            }, '*');

            if (typeof w.options['expired-callback'] === 'function') {
                w.options['expired-callback']();
            }
        }
    };

    window.skidguard = skidguard;
})();