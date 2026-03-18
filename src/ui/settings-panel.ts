import { store } from '../state/store';
import { PRESET_GRADIENTS } from '../compositor/background';
import { icons } from './icons';

export function createSettingsPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'settings-panel';

  panel.innerHTML = `
    ${section('Background', 'open', backgroundContent())}
    ${section('Frame', 'open', frameContent())}
    ${section('Cursor', 'open', cursorContent())}
    ${section('Webcam', '', webcamContent())}
    ${section('Audio', '', audioContent())}
    ${section('Output', '', outputContent())}
  `;

  // Toggle sections
  panel.querySelectorAll('.settings-section-header').forEach((header) => {
    header.addEventListener('click', () => {
      header.parentElement!.classList.toggle('open');
    });
  });

  bindControls(panel);
  return panel;
}

function section(title: string, openClass: string, content: string): string {
  return `
    <div class="settings-section ${openClass}">
      <div class="settings-section-header">
        <span class="settings-section-title">${title}</span>
        ${icons.chevronDown}
      </div>
      <div class="settings-section-body">${content}</div>
    </div>
  `;
}

function backgroundContent(): string {
  const state = store.getAll();
  return `
    <div class="form-group">
      <span class="form-label">Gradient</span>
      <div class="gradient-grid">
        ${PRESET_GRADIENTS.map(
          (g, i) =>
            `<div class="gradient-swatch ${state.background.value === g ? 'active' : ''}"
                  data-gradient="${i}"
                  style="background: ${g}"></div>`
        ).join('')}
      </div>
    </div>
    <div class="form-group">
      <span class="form-label">Solid Color</span>
      <input type="color" id="bg-solid-color" value="#1a1a2e" />
    </div>
  `;
}

function frameContent(): string {
  const state = store.getAll();
  return `
    <div class="form-group">
      <div class="form-row">
        <span class="form-label">Padding</span>
        <span class="range-value" id="padding-value">${state.padding}px</span>
      </div>
      <input type="range" id="padding" min="0" max="120" value="${state.padding}" />
    </div>
    <div class="form-group">
      <div class="form-row">
        <span class="form-label">Border Radius</span>
        <span class="range-value" id="radius-value">${state.borderRadius}px</span>
      </div>
      <input type="range" id="border-radius" min="0" max="64" value="${state.borderRadius}" />
    </div>
    <div class="form-group">
      <div class="form-row">
        <span class="form-label">Shadow</span>
        <span class="range-value" id="shadow-value">${state.shadow.blur}px</span>
      </div>
      <input type="range" id="shadow-blur" min="0" max="100" value="${state.shadow.blur}" />
    </div>
  `;
}

function cursorContent(): string {
  const state = store.getAll();
  return `
    <div class="form-row">
      <span class="form-label">Highlight</span>
      ${toggle('cursor-highlight', state.cursorHighlight)}
    </div>
    <div class="form-group">
      <div class="form-row">
        <span class="form-label">Highlight Size</span>
        <span class="range-value" id="cursor-size-value">${state.cursorHighlightRadius}px</span>
      </div>
      <input type="range" id="cursor-size" min="10" max="60" value="${state.cursorHighlightRadius}" />
    </div>
    <div class="form-row">
      <span class="form-label">Auto Zoom</span>
      ${toggle('auto-zoom', state.autoZoom)}
    </div>
    <div class="form-group">
      <div class="form-row">
        <span class="form-label">Zoom Level</span>
        <span class="range-value" id="zoom-level-value">${state.zoomLevel}x</span>
      </div>
      <input type="range" id="zoom-level" min="1.2" max="4" step="0.1" value="${state.zoomLevel}" />
    </div>
  `;
}

function webcamContent(): string {
  const state = store.getAll();
  return `
    <div class="form-row">
      <span class="form-label">Enable Webcam</span>
      ${toggle('webcam-enabled', state.webcamEnabled)}
    </div>
    <div class="form-group">
      <span class="form-label">Position</span>
      <div class="position-grid">
        ${(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const)
          .map(
            (pos) =>
              `<button class="position-btn ${state.webcamPosition === pos ? 'active' : ''}" data-position="${pos}">${pos.replace('-', ' ')}</button>`
          )
          .join('')}
      </div>
    </div>
    <div class="form-group">
      <div class="form-row">
        <span class="form-label">Size</span>
        <span class="range-value" id="webcam-size-value">${state.webcamSize}px</span>
      </div>
      <input type="range" id="webcam-size" min="64" max="256" value="${state.webcamSize}" />
    </div>
  `;
}

function audioContent(): string {
  const state = store.getAll();
  return `
    <div class="form-row">
      <span class="form-label">System Audio</span>
      ${toggle('system-audio', state.systemAudioEnabled)}
    </div>
    <div class="form-row">
      <span class="form-label">Microphone</span>
      ${toggle('mic-enabled', state.micEnabled)}
    </div>
  `;
}

function outputContent(): string {
  const state = store.getAll();
  return `
    <div class="form-group">
      <span class="form-label">Format</span>
      <select class="select" id="output-format">
        <option value="gif" ${state.outputFormat === 'gif' ? 'selected' : ''}>GIF</option>
        <option value="webm" ${state.outputFormat === 'webm' ? 'selected' : ''}>WebM (Video)</option>
      </select>
    </div>
    <div class="form-group">
      <span class="form-label">Resolution</span>
      <select class="select" id="resolution">
        <option value="1920x1080" ${state.outputWidth === 1920 ? 'selected' : ''}>1920 x 1080 (Full HD)</option>
        <option value="2560x1440" ${state.outputWidth === 2560 ? 'selected' : ''}>2560 x 1440 (2K)</option>
        <option value="3840x2160" ${state.outputWidth === 3840 ? 'selected' : ''}>3840 x 2160 (4K)</option>
        <option value="1280x720" ${state.outputWidth === 1280 ? 'selected' : ''}>1280 x 720 (HD)</option>
      </select>
    </div>
    <div class="form-group">
      <span class="form-label">Frame Rate</span>
      <select class="select" id="framerate">
        <option value="30" ${state.frameRate === 30 ? 'selected' : ''}>30 fps</option>
        <option value="60" ${state.frameRate === 60 ? 'selected' : ''}>60 fps</option>
      </select>
    </div>
    <div class="form-group" id="gif-fps-group" style="display: ${state.outputFormat === 'gif' ? 'flex' : 'none'};">
      <div class="form-row">
        <span class="form-label">GIF Frame Rate</span>
        <span class="range-value" id="gif-fps-value">${state.gifFrameRate} fps</span>
      </div>
      <input type="range" id="gif-fps" min="5" max="30" value="${state.gifFrameRate}" />
    </div>
    <div class="form-group" id="gif-quality-group" style="display: ${state.outputFormat === 'gif' ? 'flex' : 'none'};">
      <div class="form-row">
        <span class="form-label">GIF Quality</span>
        <span class="range-value" id="gif-quality-value">${state.gifQuality}</span>
      </div>
      <input type="range" id="gif-quality" min="1" max="20" value="${state.gifQuality}" />
    </div>
    <div class="form-group" id="gif-lossy-group" style="display: ${state.outputFormat === 'gif' ? 'flex' : 'none'};">
      <div class="form-row">
        <span class="form-label">Compression</span>
        <span class="range-value" id="gif-lossy-value">${state.gifLossy}</span>
      </div>
      <input type="range" id="gif-lossy" min="0" max="200" value="${state.gifLossy}" />
    </div>
    <div class="form-group" id="gif-colors-group" style="display: ${state.outputFormat === 'gif' ? 'flex' : 'none'};">
      <div class="form-row">
        <span class="form-label">Colors</span>
        <span class="range-value" id="gif-colors-value">${state.gifColors}</span>
      </div>
      <input type="range" id="gif-colors" min="32" max="256" step="8" value="${state.gifColors}" />
    </div>
  `;
}

function toggle(id: string, checked: boolean): string {
  return `
    <label class="toggle">
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} />
      <span class="toggle-track"></span>
    </label>
  `;
}

function bindControls(panel: HTMLElement) {
  // Gradient swatches
  panel.querySelectorAll<HTMLElement>('.gradient-swatch').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.gradient!);
      store.set('background', {
        type: 'gradient',
        value: PRESET_GRADIENTS[idx],
      });
      panel.querySelectorAll('.gradient-swatch').forEach((s) => s.classList.remove('active'));
      el.classList.add('active');
    });
  });

  // Solid color
  panel.querySelector<HTMLInputElement>('#bg-solid-color')?.addEventListener('input', (e) => {
    store.set('background', {
      type: 'solid',
      value: (e.target as HTMLInputElement).value,
    });
    panel.querySelectorAll('.gradient-swatch').forEach((s) => s.classList.remove('active'));
  });

  // Padding
  bindRange(panel, '#padding', '#padding-value', 'px', (v) => store.set('padding', v));

  // Border radius
  bindRange(panel, '#border-radius', '#radius-value', 'px', (v) => store.set('borderRadius', v));

  // Shadow
  bindRange(panel, '#shadow-blur', '#shadow-value', 'px', (v) =>
    store.set('shadow', { ...store.get('shadow'), blur: v })
  );

  // Cursor highlight toggle
  panel.querySelector<HTMLInputElement>('#cursor-highlight')?.addEventListener('change', (e) => {
    store.set('cursorHighlight', (e.target as HTMLInputElement).checked);
  });

  // Cursor size
  bindRange(panel, '#cursor-size', '#cursor-size-value', 'px', (v) =>
    store.set('cursorHighlightRadius', v)
  );

  // Auto zoom
  panel.querySelector<HTMLInputElement>('#auto-zoom')?.addEventListener('change', (e) => {
    store.set('autoZoom', (e.target as HTMLInputElement).checked);
  });

  // Zoom level
  bindRange(panel, '#zoom-level', '#zoom-level-value', 'x', (v) =>
    store.set('zoomLevel', v)
  );

  // Webcam
  panel.querySelector<HTMLInputElement>('#webcam-enabled')?.addEventListener('change', (e) => {
    store.set('webcamEnabled', (e.target as HTMLInputElement).checked);
  });

  panel.querySelectorAll<HTMLElement>('.position-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.set('webcamPosition', btn.dataset.position as any);
      panel.querySelectorAll('.position-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  bindRange(panel, '#webcam-size', '#webcam-size-value', 'px', (v) =>
    store.set('webcamSize', v)
  );

  // Audio
  panel.querySelector<HTMLInputElement>('#system-audio')?.addEventListener('change', (e) => {
    store.set('systemAudioEnabled', (e.target as HTMLInputElement).checked);
  });

  panel.querySelector<HTMLInputElement>('#mic-enabled')?.addEventListener('change', (e) => {
    store.set('micEnabled', (e.target as HTMLInputElement).checked);
  });

  // Output format
  panel.querySelector<HTMLSelectElement>('#output-format')?.addEventListener('change', (e) => {
    const format = (e.target as HTMLSelectElement).value as 'gif' | 'webm';
    store.set('outputFormat', format);
    const gifGroups = ['#gif-fps-group', '#gif-quality-group', '#gif-lossy-group', '#gif-colors-group'];
    gifGroups.forEach((sel) => {
      const el = panel.querySelector<HTMLElement>(sel);
      if (el) el.style.display = format === 'gif' ? 'flex' : 'none';
    });
  });

  // Resolution
  panel.querySelector<HTMLSelectElement>('#resolution')?.addEventListener('change', (e) => {
    const [w, h] = (e.target as HTMLSelectElement).value.split('x').map(Number);
    store.update({ outputWidth: w, outputHeight: h });
  });

  // Frame rate
  panel.querySelector<HTMLSelectElement>('#framerate')?.addEventListener('change', (e) => {
    store.set('frameRate', parseInt((e.target as HTMLSelectElement).value));
  });

  // GIF frame rate
  bindRange(panel, '#gif-fps', '#gif-fps-value', ' fps', (v) =>
    store.set('gifFrameRate', v)
  );

  // GIF quality
  bindRange(panel, '#gif-quality', '#gif-quality-value', '', (v) =>
    store.set('gifQuality', v)
  );

  // GIF lossy compression
  bindRange(panel, '#gif-lossy', '#gif-lossy-value', '', (v) =>
    store.set('gifLossy', v)
  );

  // GIF colors
  bindRange(panel, '#gif-colors', '#gif-colors-value', '', (v) =>
    store.set('gifColors', v)
  );
}

function bindRange(
  panel: HTMLElement,
  inputSel: string,
  valueSel: string,
  unit: string,
  onChange: (v: number) => void
) {
  const input = panel.querySelector<HTMLInputElement>(inputSel);
  const valueEl = panel.querySelector<HTMLElement>(valueSel);
  if (!input || !valueEl) return;

  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valueEl.textContent = `${v}${unit}`;
    onChange(v);
  });
}
