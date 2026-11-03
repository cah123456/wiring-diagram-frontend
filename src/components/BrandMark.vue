<script setup lang="ts">
withDefaults(
  defineProps<{
    compact?: boolean
    inverse?: boolean
  }>(),
  {
    compact: false,
    inverse: false,
  },
)
</script>

<template>
  <div class="brand-mark" :class="{ compact, inverse }">
    <svg class="brand-symbol" viewBox="0 0 40 40" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="9" class="brand-bg" />
      <path d="M9 12.5H31" class="brand-bus" />
      <path d="M15 12.5V17M25 12.5V17" class="brand-line" />
      <rect x="11.5" y="17" width="7" height="9" rx="1" class="brand-device" />
      <path d="M13 19L17 24M17 19L13 24" class="brand-detail" />
      <rect x="21.5" y="17" width="7" height="9" rx="1" class="brand-device" />
      <path d="M23 19L27 24M27 19L23 24" class="brand-detail" />
      <path d="M15 26V31M25 26V31" class="brand-line" />
      <circle cx="15" cy="31.5" r="1.2" class="brand-dot" />
      <circle cx="25" cy="31.5" r="1.2" class="brand-dot" />
    </svg>
    <div v-if="!compact" class="brand-copy">
      <strong>GRIDLINE</strong>
      <span>开关柜接线图设计器</span>
    </div>
  </div>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--ink);
}

.brand-mark.inverse {
  color: #f2f7f6;
}

.brand-symbol {
  width: 38px;
  height: 38px;
  flex: none;
}

.brand-bg {
  fill: #152a32;
  stroke: rgba(255, 255, 255, 0.12);
  stroke-width: 1;
}

.brand-mark.inverse .brand-bg {
  fill: rgba(255, 255, 255, 0.08);
}

.brand-bus {
  stroke: #78d3c6;
  stroke-width: 2;
  stroke-linecap: round;
}

.brand-line {
  stroke: #b8d4d1;
  stroke-width: 1.2;
}

.brand-device {
  fill: #152a32;
  stroke: #b8d4d1;
  stroke-width: 1.2;
}

.brand-mark.inverse .brand-device {
  fill: #10232a;
}

.brand-detail {
  stroke: #e4b25b;
  stroke-width: 1.2;
  stroke-linecap: round;
}

.brand-dot {
  fill: #78d3c6;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand-copy strong {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.13em;
}

.brand-copy span {
  margin-top: 5px;
  color: var(--muted);
  font-size: 10.5px;
  letter-spacing: 0.04em;
}

.brand-mark.inverse .brand-copy span {
  color: rgba(226, 242, 239, 0.58);
}

@media (max-width: 640px) {
  .brand-copy span {
    display: none;
  }
}
</style>
