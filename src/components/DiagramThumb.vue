<script setup lang="ts">
defineProps<{
  thumbnail?: string
  voltageLevel?: string
}>()
</script>

<template>
  <div class="diagram-thumb">
    <img v-if="thumbnail" :src="thumbnail" alt="接线图缩略图" loading="lazy" />
    <svg v-else viewBox="0 0 320 190" class="placeholder" aria-hidden="true">
      <defs>
        <pattern id="dot-grid-default" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" fill="#cdd9d7" />
        </pattern>
      </defs>
      <rect width="320" height="190" fill="#fbfcfb" />
      <rect width="320" height="190" fill="url(#dot-grid-default)" />
      <g stroke="#283a40" fill="none" stroke-width="1.4" stroke-linecap="round">
        <path d="M34 48H286" stroke-width="4" />
        <path d="M67 48V63M141 48V63M215 48V63M263 48V63" />
        <rect x="58" y="63" width="18" height="22" rx="1" fill="#fbfcfb" />
        <path d="M60 66L74 82M74 66L60 82" stroke-width="1.1" />
        <path d="M67 85V101" />
        <circle cx="67" cy="109" r="8" />
        <path d="M67 117V135M54 135H80" />
        <path d="M59 140H75M63 145H71" />
        <rect x="132" y="63" width="18" height="22" rx="1" fill="#fbfcfb" />
        <path d="M134 66L148 82M148 66L134 82" stroke-width="1.1" />
        <path d="M141 85V101" />
        <circle cx="141" cy="109" r="8" />
        <path d="M141 117V135" />
        <path d="M128 135H154M124 140H158M128 145H154" />
        <rect x="206" y="63" width="18" height="22" rx="1" fill="#fbfcfb" />
        <path d="M208 66L222 82M222 66L208 82" stroke-width="1.1" />
        <path d="M215 85V101" />
        <circle cx="215" cy="109" r="8" />
        <path d="M215 117V135M202 135H228" />
        <path d="M263 63V74" />
        <path d="M254 74H272M254 80H272" />
        <path d="M263 80V96" />
        <circle cx="263" cy="104" r="8" />
        <path d="M263 112V131" />
        <path d="M254 131H272M258 137H268M261 142H265" />
        <path d="M25 160H295" stroke="#a9b8b7" stroke-width="0.8" stroke-dasharray="3 4" />
      </g>
      <g fill="#718085" font-family="'Cascadia Mono', Consolas, monospace" font-size="6.6">
        <text x="67" y="58" text-anchor="middle">QF</text>
        <text x="141" y="58" text-anchor="middle">QF</text>
        <text x="215" y="58" text-anchor="middle">QF</text>
        <text x="263" y="58" text-anchor="middle">TV</text>
      </g>
      <g fill="#9babad" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="6.2">
        <text x="34" y="43">BUS 10kV</text>
        <text x="55" y="173">INCOMING</text>
        <text x="128" y="173">FEEDER 01</text>
        <text x="202" y="173">FEEDER 02</text>
        <text x="247" y="173">PT</text>
      </g>
      <g transform="translate(229 158)">
        <rect width="66" height="22" fill="none" stroke="#bdcac8" stroke-width="0.7" />
        <path d="M0 8H66M44 0V22" stroke="#bdcac8" stroke-width="0.5" />
        <text x="4" y="6" fill="#9babad" font-size="3.4" font-family="sans-serif">SWITCHGEAR</text>
        <text x="4" y="16" fill="#68787d" font-size="4" font-family="sans-serif">一次系统接线图</text>
        <text x="48" y="6" fill="#9babad" font-size="3.2" font-family="sans-serif">REV. 01</text>
      </g>
    </svg>
    <span v-if="voltageLevel" class="voltage-chip">{{ voltageLevel }}</span>
  </div>
</template>

<style scoped>
.diagram-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9.5;
  overflow: hidden;
  background: #f7faf9;
  border-bottom: 1px solid var(--line);
}

.diagram-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  box-sizing: border-box;
  padding: 8px;
  background: #f4f7f6;
}

.placeholder {
  display: block;
  width: 100%;
  height: 100%;
}

.voltage-chip {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 2px 7px;
  color: #31534f;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #ccdcda;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.03em;
  backdrop-filter: blur(4px);
}
</style>
