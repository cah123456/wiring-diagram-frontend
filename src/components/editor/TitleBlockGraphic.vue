<script setup lang="ts">
import { computed } from 'vue'
import type { DrawingMeta, PaperSettings } from '../../types/diagram'
import { getPageFrameLines, getTitleBlockLayout } from '../../utils/titleBlock'

const props = defineProps<{
  paper: PaperSettings
  meta: DrawingMeta
  showTitleBlock: boolean
}>()

const frames = computed(() => getPageFrameLines(props.paper))
const title = computed(() => getTitleBlockLayout(props.paper, props.meta))
</script>

<template>
  <g class="title-block-graphic">
    <g class="page-frames">
      <line
        v-for="(line, index) in frames"
        :key="`frame-${index}`"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        :stroke-width="line.weight"
      />
    </g>

    <g v-if="showTitleBlock" class="title-block">
      <rect
        :x="title.x"
        :y="title.y"
        :width="title.width"
        :height="title.height"
        class="title-bg"
      />
      <line
        v-for="(line, index) in title.lines"
        :key="`title-${index}`"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        :stroke-width="line.weight"
      />
      <text
        v-for="(text, index) in title.texts"
        :key="`text-${index}`"
        :x="text.x"
        :y="text.y"
        :font-size="text.size"
        :font-weight="text.weight"
        :text-anchor="text.anchor"
        :fill="text.color"
        :class="{ mono: text.mono }"
      >
        {{ text.text }}
      </text>
    </g>

    <g class="frame-index" v-if="showTitleBlock">
      <text :x="46" :y="paper.height - 46" class="frame-label">GRIDLINE / SINGLE-LINE</text>
      <text :x="paper.width - 46" :y="60" text-anchor="end" class="frame-label">
        {{ meta.voltageLevel || 'SWITCHGEAR' }}
      </text>
    </g>
  </g>
</template>

<style scoped>
.page-frames line {
  stroke: #5b6a70;
  stroke-linecap: square;
}

.title-bg {
  fill: #fcfdfd;
}

.title-block line {
  stroke: #617176;
  stroke-linecap: square;
}

.title-block text {
  font-family: var(--font-sans);
}

.title-block text.mono {
  font-family: var(--font-mono);
}

.frame-label {
  fill: #9aa7a8;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
}
</style>
