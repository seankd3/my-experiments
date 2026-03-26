import type { VisualPanel } from "../store/appStore";

type DemoPanel = Omit<VisualPanel, "id" | "timestamp">;

export function getDemos(): DemoPanel[] {
  return [architectureDemo, comparisonDemo, codeDemo, conceptMapDemo];
}

const architectureDemo: DemoPanel = {
  title: "System Architecture",
  html: `
<div class="fade-in" style="padding: 20px;">
  <svg width="100%" height="320" viewBox="0 0 700 320">
    <!-- Connection lines (drawn with animation) -->
    <line x1="175" y1="160" x2="350" y2="100" stroke="var(--color-primary)" stroke-width="2" opacity="0.4" class="svg-draw" style="--line-length:200"/>
    <line x1="175" y1="160" x2="350" y2="220" stroke="var(--color-primary)" stroke-width="2" opacity="0.4" class="svg-draw" style="--line-length:200;animation-delay:0.2s"/>
    <line x1="525" y1="100" x2="350" y2="100" stroke="var(--color-violet)" stroke-width="2" opacity="0.4" class="svg-draw" style="--line-length:200;animation-delay:0.4s"/>
    <line x1="525" y1="100" x2="350" y2="220" stroke="var(--color-violet)" stroke-width="2" opacity="0.4" class="svg-draw" style="--line-length:200;animation-delay:0.6s"/>

    <!-- Flow particles -->
    <circle r="3" fill="var(--color-primary)">
      <animateMotion dur="2s" repeatCount="indefinite" path="M175,160 L350,100" />
    </circle>
    <circle r="3" fill="var(--color-primary)">
      <animateMotion dur="2.5s" repeatCount="indefinite" path="M175,160 L350,220" />
    </circle>
    <circle r="3" fill="var(--color-violet)">
      <animateMotion dur="2s" repeatCount="indefinite" path="M350,100 L525,100" />
    </circle>
    <circle r="3" fill="var(--color-violet)">
      <animateMotion dur="2.2s" repeatCount="indefinite" path="M350,220 L525,100" />
    </circle>

    <!-- Client Node -->
    <g class="bloom-in" style="animation-delay:0.1s;cursor:pointer" id="node-client">
      <circle cx="175" cy="160" r="45" fill="var(--color-surface)" stroke="var(--color-primary)" stroke-width="2"/>
      <circle cx="175" cy="160" r="45" fill="none" stroke="var(--color-primary)" stroke-width="1" opacity="0.3">
        <animate attributeName="r" values="45;55;45" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite"/>
      </circle>
      <text x="175" y="145" text-anchor="middle" fill="var(--color-primary)" font-size="18">⬡</text>
      <text x="175" y="170" text-anchor="middle" fill="var(--color-text)" font-size="11" font-family="var(--font-sans)">Client</text>
    </g>

    <!-- API Node -->
    <g class="bloom-in" style="animation-delay:0.3s;cursor:pointer" id="node-api">
      <rect x="305" y="55" width="90" height="90" rx="16" fill="var(--color-surface)" stroke="var(--color-violet)" stroke-width="2"/>
      <text x="350" y="95" text-anchor="middle" fill="var(--color-violet)" font-size="18">⚡</text>
      <text x="350" y="118" text-anchor="middle" fill="var(--color-text)" font-size="11" font-family="var(--font-sans)">REST API</text>
    </g>

    <!-- Database Node -->
    <g class="bloom-in" style="animation-delay:0.5s;cursor:pointer" id="node-db">
      <rect x="305" y="175" width="90" height="90" rx="16" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="2"/>
      <text x="350" y="215" text-anchor="middle" fill="var(--color-accent)" font-size="18">⛁</text>
      <text x="350" y="238" text-anchor="middle" fill="var(--color-text)" font-size="11" font-family="var(--font-sans)">Database</text>
    </g>

    <!-- Cache Node -->
    <g class="bloom-in" style="animation-delay:0.7s;cursor:pointer" id="node-cache">
      <circle cx="525" cy="100" r="40" fill="var(--color-surface)" stroke="var(--color-success)" stroke-width="2"/>
      <text x="525" y="95" text-anchor="middle" fill="var(--color-success)" font-size="16">◈</text>
      <text x="525" y="115" text-anchor="middle" fill="var(--color-text)" font-size="11" font-family="var(--font-sans)">Cache</text>
    </g>

    <!-- Labels on edges -->
    <text x="240" y="140" fill="var(--color-text-dim)" font-size="10" font-family="var(--font-mono)" class="fade-in delay-5">HTTP/JSON</text>
    <text x="240" y="210" fill="var(--color-text-dim)" font-size="10" font-family="var(--font-mono)" class="fade-in delay-6">Queries</text>
    <text x="430" y="85" fill="var(--color-text-dim)" font-size="10" font-family="var(--font-mono)" class="fade-in delay-7">Read-through</text>
  </svg>

  <!-- Detail panel (shown on node click) -->
  <div id="detail-panel" class="glass-card" style="margin-top:16px;display:none;transition:all 0.3s var(--ease-out);">
    <div id="detail-content" style="font-size:13px;"></div>
  </div>
</div>
  `,
  css: `
    g:hover circle, g:hover rect {
      filter: drop-shadow(0 0 8px currentColor);
      transition: filter 0.3s;
    }
  `,
  js: `
    const details = {
      'node-client': '<span class="badge badge-primary">Frontend</span> <span class="text-muted" style="margin-left:8px">React SPA — handles routing, state, and rendering. Communicates with API via fetch/axios.</span>',
      'node-api': '<span class="badge badge-violet">Backend</span> <span class="text-muted" style="margin-left:8px">Express.js REST API — authentication, business logic, data validation. 12 endpoints across 4 resource types.</span>',
      'node-db': '<span class="badge badge-accent">Storage</span> <span class="text-muted" style="margin-left:8px">PostgreSQL — relational data with JSONB columns for flexible schemas. Managed via Prisma ORM.</span>',
      'node-cache': '<span class="badge badge-success">Cache</span> <span class="text-muted" style="margin-left:8px">Redis — session storage + query cache. TTL-based invalidation. Reduces DB load by ~60%.</span>',
    };
    document.querySelectorAll('g[id^="node-"]').forEach(g => {
      g.addEventListener('click', () => {
        const panel = document.getElementById('detail-panel');
        const content = document.getElementById('detail-content');
        if (panel && content && details[g.id]) {
          content.innerHTML = details[g.id];
          panel.style.display = 'block';
          panel.classList.add('slide-up');
        }
      });
    });
  `,
};

const comparisonDemo: DemoPanel = {
  title: "Decision: Database Choice",
  html: `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:8px;" class="fade-in">
  <!-- PostgreSQL Card -->
  <div class="glass-card slide-in-left hoverable" style="position:relative;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--color-primary),var(--color-violet));"></div>
    <div class="flex-between" style="margin-bottom:16px;">
      <div>
        <div style="font-size:15px;font-weight:600;">PostgreSQL</div>
        <div class="text-dim" style="font-size:11px;margin-top:2px;">Relational • ACID</div>
      </div>
      <span class="badge badge-primary">Recommended</span>
    </div>

    <div class="flex-col gap-sm">
      <div>
        <div class="flex-between" style="margin-bottom:4px;">
          <span class="text-muted" style="font-size:11px;">Performance</span>
          <span class="mono" style="font-size:11px;color:var(--color-primary);">85%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
          <div class="bar-fill" style="height:100%;width:0%;background:linear-gradient(90deg,var(--color-primary),var(--color-violet));border-radius:3px;transition:width 1.2s var(--ease-out);" data-width="85%"></div>
        </div>
      </div>
      <div>
        <div class="flex-between" style="margin-bottom:4px;">
          <span class="text-muted" style="font-size:11px;">Scalability</span>
          <span class="mono" style="font-size:11px;color:var(--color-primary);">72%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
          <div class="bar-fill" style="height:100%;width:0%;background:linear-gradient(90deg,var(--color-primary),var(--color-violet));border-radius:3px;transition:width 1.2s var(--ease-out);" data-width="72%"></div>
        </div>
      </div>
      <div>
        <div class="flex-between" style="margin-bottom:4px;">
          <span class="text-muted" style="font-size:11px;">Data Integrity</span>
          <span class="mono" style="font-size:11px;color:var(--color-success);">96%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
          <div class="bar-fill" style="height:100%;width:0%;background:linear-gradient(90deg,var(--color-success),var(--color-primary));border-radius:3px;transition:width 1.2s var(--ease-out);" data-width="96%"></div>
        </div>
      </div>
      <div>
        <div class="flex-between" style="margin-bottom:4px;">
          <span class="text-muted" style="font-size:11px;">Ecosystem</span>
          <span class="mono" style="font-size:11px;color:var(--color-primary);">90%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
          <div class="bar-fill" style="height:100%;width:0%;background:linear-gradient(90deg,var(--color-primary),var(--color-violet));border-radius:3px;transition:width 1.2s var(--ease-out);" data-width="90%"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- MongoDB Card -->
  <div class="glass-card slide-in-right hoverable" style="position:relative;overflow:hidden;animation-delay:0.15s;">
    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--color-accent),var(--color-error));opacity:0.5;"></div>
    <div class="flex-between" style="margin-bottom:16px;">
      <div>
        <div style="font-size:15px;font-weight:600;">MongoDB</div>
        <div class="text-dim" style="font-size:11px;margin-top:2px;">Document • Flexible</div>
      </div>
      <span class="badge badge-accent">Alternative</span>
    </div>

    <div class="flex-col gap-sm">
      <div>
        <div class="flex-between" style="margin-bottom:4px;">
          <span class="text-muted" style="font-size:11px;">Performance</span>
          <span class="mono" style="font-size:11px;color:var(--color-accent);">78%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
          <div class="bar-fill" style="height:100%;width:0%;background:linear-gradient(90deg,var(--color-accent),var(--color-error));border-radius:3px;transition:width 1.2s var(--ease-out);" data-width="78%"></div>
        </div>
      </div>
      <div>
        <div class="flex-between" style="margin-bottom:4px;">
          <span class="text-muted" style="font-size:11px;">Scalability</span>
          <span class="mono" style="font-size:11px;color:var(--color-success);">91%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
          <div class="bar-fill" style="height:100%;width:0%;background:linear-gradient(90deg,var(--color-success),var(--color-accent));border-radius:3px;transition:width 1.2s var(--ease-out);" data-width="91%"></div>
        </div>
      </div>
      <div>
        <div class="flex-between" style="margin-bottom:4px;">
          <span class="text-muted" style="font-size:11px;">Data Integrity</span>
          <span class="mono" style="font-size:11px;color:var(--color-accent);">65%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
          <div class="bar-fill" style="height:100%;width:0%;background:linear-gradient(90deg,var(--color-accent),var(--color-error));border-radius:3px;transition:width 1.2s var(--ease-out);" data-width="65%"></div>
        </div>
      </div>
      <div>
        <div class="flex-between" style="margin-bottom:4px;">
          <span class="text-muted" style="font-size:11px;">Ecosystem</span>
          <span class="mono" style="font-size:11px;color:var(--color-accent);">82%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
          <div class="bar-fill" style="height:100%;width:0%;background:linear-gradient(90deg,var(--color-accent),var(--color-error));border-radius:3px;transition:width 1.2s var(--ease-out);" data-width="82%"></div>
        </div>
      </div>
    </div>
  </div>
</div>
  `,
  css: "",
  js: `
    // Animate bars on load
    setTimeout(() => {
      document.querySelectorAll('.bar-fill').forEach((bar, i) => {
        setTimeout(() => {
          bar.style.width = bar.dataset.width;
        }, i * 80);
      });
    }, 400);
  `,
};

const codeDemo: DemoPanel = {
  title: "Code Walkthrough",
  html: `
<div class="fade-in" style="display:grid;grid-template-columns:1fr 280px;gap:16px;padding:8px;">
  <!-- Code panel -->
  <div style="position:relative;">
    <pre style="position:relative;font-size:13px;line-height:1.8;"><code id="code-block"></code></pre>

    <!-- Annotation dots -->
    <div class="annotation-dot" data-line="1" style="position:absolute;top:22px;right:-12px;width:8px;height:8px;border-radius:50%;background:var(--color-primary);cursor:pointer;transition:all 0.2s;" title="Function signature"></div>
    <div class="annotation-dot" data-line="3" style="position:absolute;top:60px;right:-12px;width:8px;height:8px;border-radius:50%;background:var(--color-violet);cursor:pointer;transition:all 0.2s;" title="Base cases"></div>
    <div class="annotation-dot" data-line="7" style="position:absolute;top:136px;right:-12px;width:8px;height:8px;border-radius:50%;background:var(--color-accent);cursor:pointer;transition:all 0.2s;" title="Binary search logic"></div>
  </div>

  <!-- Annotation panel -->
  <div id="annotation-panel" class="glass-card" style="font-size:12px;line-height:1.7;align-self:start;">
    <div class="text-muted" style="margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Annotations</div>
    <div id="annotation-text" style="color:var(--color-text);">
      Click a <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--color-primary);vertical-align:middle;"></span> dot to see the explanation for that code section.
    </div>
  </div>
</div>
  `,
  css: `
    .annotation-dot:hover {
      transform: scale(1.5);
      box-shadow: 0 0 12px currentColor;
    }
    .line-highlight {
      background: rgba(59, 130, 246, 0.08);
      display: block;
    }
  `,
  js: `
    const code = [
      '<span class="kw">function</span> <span class="fn">binarySearch</span>(arr, target) {',
      '  <span class="kw">let</span> lo = <span class="num">0</span>, hi = arr.length - <span class="num">1</span>;',
      '',
      '  <span class="kw">while</span> (lo <= hi) {',
      '    <span class="kw">const</span> mid = (lo + hi) >>> <span class="num">1</span>;',
      '',
      '    <span class="kw">if</span> (arr[mid] === target) <span class="kw">return</span> mid;',
      '    <span class="kw">if</span> (arr[mid] < target) lo = mid + <span class="num">1</span>;',
      '    <span class="kw">else</span> hi = mid - <span class="num">1</span>;',
      '  }',
      '',
      '  <span class="kw">return</span> -<span class="num">1</span>; <span class="cmt">// not found</span>',
      '}',
    ];

    const block = document.getElementById('code-block');
    // Typewriter effect — lines appear one by one
    code.forEach((line, i) => {
      setTimeout(() => {
        const span = document.createElement('span');
        span.innerHTML = line + '\\n';
        span.style.opacity = '0';
        span.style.animation = 'fadeIn 0.3s var(--ease-out) forwards';
        block.appendChild(span);
      }, i * 120);
    });

    const annotations = {
      1: { color: 'var(--color-primary)', text: '<strong>Function Signature</strong><br><br>Takes a sorted array and a target value. Returns the index if found, -1 otherwise. <span class="badge badge-primary" style="margin-top:8px;">O(log n)</span>' },
      3: { color: 'var(--color-violet)', text: '<strong>Pointer Setup</strong><br><br>Two pointers define the search window. <code>lo</code> starts at the beginning, <code>hi</code> at the end. The window shrinks by half each iteration.' },
      7: { color: 'var(--color-accent)', text: '<strong>The Core Logic</strong><br><br>Calculate midpoint using unsigned right shift (avoids overflow). Compare and narrow: too small → move <code>lo</code> up, too large → move <code>hi</code> down.' },
    };

    document.querySelectorAll('.annotation-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const line = dot.dataset.line;
        const ann = annotations[line];
        if (!ann) return;
        const panel = document.getElementById('annotation-text');
        panel.innerHTML = ann.text;
        panel.parentElement.style.borderColor = ann.color.replace('var(', '').replace(')', '');
      });
    });
  `,
};

const conceptMapDemo: DemoPanel = {
  title: "Concept: Microservices",
  html: `
<div class="fade-in" style="padding:8px;">
  <svg width="100%" height="380" viewBox="0 0 700 380">
    <!-- Central node -->
    <g class="bloom-in" style="cursor:pointer">
      <circle cx="350" cy="190" r="50" fill="rgba(59,130,246,0.1)" stroke="var(--color-primary)" stroke-width="2"/>
      <circle cx="350" cy="190" r="50" fill="none" stroke="var(--color-primary)" stroke-width="1" opacity="0.2">
        <animate attributeName="r" values="50;65;50" dur="4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.2;0;0.2" dur="4s" repeatCount="indefinite"/>
      </circle>
      <text x="350" y="185" text-anchor="middle" fill="var(--color-primary)" font-size="13" font-weight="600" font-family="var(--font-sans)">Micro-</text>
      <text x="350" y="202" text-anchor="middle" fill="var(--color-primary)" font-size="13" font-weight="600" font-family="var(--font-sans)">services</text>
    </g>

    <!-- Branch lines -->
    <line x1="300" y1="170" x2="150" y2="80" stroke="var(--color-violet)" stroke-width="1.5" opacity="0.3" class="svg-draw" style="--line-length:200;animation-delay:0.3s"/>
    <line x1="400" y1="170" x2="550" y2="80" stroke="var(--color-success)" stroke-width="1.5" opacity="0.3" class="svg-draw" style="--line-length:200;animation-delay:0.5s"/>
    <line x1="300" y1="210" x2="140" y2="300" stroke="var(--color-accent)" stroke-width="1.5" opacity="0.3" class="svg-draw" style="--line-length:200;animation-delay:0.7s"/>
    <line x1="400" y1="210" x2="560" y2="300" stroke="var(--color-error)" stroke-width="1.5" opacity="0.3" class="svg-draw" style="--line-length:200;animation-delay:0.9s"/>

    <!-- Branch: Service Independence -->
    <g class="bloom-in" style="animation-delay:0.4s">
      <rect x="80" y="45" width="140" height="70" rx="12" fill="rgba(139,92,246,0.08)" stroke="var(--color-violet)" stroke-width="1.5"/>
      <text x="150" y="72" text-anchor="middle" fill="var(--color-violet)" font-size="11" font-weight="500" font-family="var(--font-sans)">Independent</text>
      <text x="150" y="90" text-anchor="middle" fill="var(--color-violet)" font-size="11" font-weight="500" font-family="var(--font-sans)">Deployment</text>
    </g>

    <!-- Branch: API Gateway -->
    <g class="bloom-in" style="animation-delay:0.6s">
      <rect x="480" y="45" width="140" height="70" rx="12" fill="rgba(16,185,129,0.08)" stroke="var(--color-success)" stroke-width="1.5"/>
      <text x="550" y="72" text-anchor="middle" fill="var(--color-success)" font-size="11" font-weight="500" font-family="var(--font-sans)">API Gateway</text>
      <text x="550" y="90" text-anchor="middle" fill="var(--color-success)" font-size="11" font-weight="500" font-family="var(--font-sans)">Pattern</text>
    </g>

    <!-- Branch: Data Isolation -->
    <g class="bloom-in" style="animation-delay:0.8s">
      <rect x="70" y="265" width="140" height="70" rx="12" fill="rgba(245,158,11,0.08)" stroke="var(--color-accent)" stroke-width="1.5"/>
      <text x="140" y="292" text-anchor="middle" fill="var(--color-accent)" font-size="11" font-weight="500" font-family="var(--font-sans)">Data Isolation</text>
      <text x="140" y="310" text-anchor="middle" fill="var(--color-accent)" font-size="11" font-weight="500" font-family="var(--font-sans)">Per Service</text>
    </g>

    <!-- Branch: Challenges -->
    <g class="bloom-in" style="animation-delay:1.0s">
      <rect x="490" y="265" width="140" height="70" rx="12" fill="rgba(239,68,68,0.08)" stroke="var(--color-error)" stroke-width="1.5"/>
      <text x="560" y="292" text-anchor="middle" fill="var(--color-error)" font-size="11" font-weight="500" font-family="var(--font-sans)">Complexity</text>
      <text x="560" y="310" text-anchor="middle" fill="var(--color-error)" font-size="11" font-weight="500" font-family="var(--font-sans)">Trade-offs</text>
    </g>

    <!-- Sub-labels -->
    <text x="150" y="135" text-anchor="middle" fill="var(--color-text-dim)" font-size="10" font-family="var(--font-mono)" class="fade-in delay-5">Scale independently</text>
    <text x="550" y="135" text-anchor="middle" fill="var(--color-text-dim)" font-size="10" font-family="var(--font-mono)" class="fade-in delay-6">Single entry point</text>
    <text x="140" y="255" text-anchor="middle" fill="var(--color-text-dim)" font-size="10" font-family="var(--font-mono)" class="fade-in delay-7">Own DB per service</text>
    <text x="560" y="255" text-anchor="middle" fill="var(--color-text-dim)" font-size="10" font-family="var(--font-mono)" class="fade-in delay-8">Network latency</text>
  </svg>
</div>
  `,
  css: `
    g:hover rect, g:hover circle {
      filter: drop-shadow(0 0 10px currentColor);
      transition: filter 0.3s;
    }
  `,
  js: "",
};
