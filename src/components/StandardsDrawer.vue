<script setup lang="ts">
import { computed } from 'vue'
import { getSymbol, SYMBOL_CATEGORIES } from '../data/symbols'
import { WIRE_KINDS } from '../data/wireStyles'

const visible = defineModel<boolean>({ required: true })

const groups = computed(() =>
  SYMBOL_CATEGORIES.map((category) => ({
    ...category,
    items: category.symbols.map((type) => getSymbol(type)),
  })),
)

const wires = Object.values(WIRE_KINDS)
</script>

<template>
  <el-drawer v-model="visible" title="符号与制图约定" size="580px" class="standards-drawer">
    <div class="standards">
      <section class="standard-intro">
        <span class="eyebrow">GRAPHIC SYMBOLS · GB/T 4728</span>
        <h3>常用电气图形符号</h3>
        <p>
          图符参照 GB/T 4728（IEC 60617）中低压开关柜常用画法整理，并采用设备文字符号标注。
          工程出图前请按项目所在地域与设计院制图规定复核。
        </p>
      </section>

      <section v-for="group in groups" :key="group.key" class="symbol-group">
        <div class="group-head">
          <h4>{{ group.name }}</h4>
          <span>{{ group.items.length }} 项</span>
        </div>
        <div class="symbol-grid">
          <article v-for="item in group.items" :key="item.type" class="symbol-card">
            <div class="glyph-box">
              <svg
                :viewBox="`-10 -16 ${item.width + 20} ${item.height + 32}`"
                role="img"
                :aria-label="item.name"
              >
                <g v-html="item.glyph" />
              </svg>
            </div>
            <div class="symbol-copy">
              <div>
                <strong>{{ item.name }}</strong>
                <span class="symbol-code">{{ item.code }}</span>
              </div>
              <p>{{ item.standard }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="symbol-group">
        <div class="group-head">
          <h4>导线约定</h4>
          <span>LINE CONVENTIONS</span>
        </div>
        <div class="wire-list">
          <div v-for="wire in wires" :key="wire.kind" class="wire-row">
            <svg width="88" height="20" aria-hidden="true">
              <path
                d="M4 10H84"
                :stroke="wire.color"
                :stroke-width="wire.width"
                :stroke-dasharray="wire.dash || undefined"
                stroke-linecap="round"
              />
            </svg>
            <div>
              <strong>{{ wire.name }}</strong>
              <span>{{ wire.description }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="reference-note">
        <span class="note-mark">i</span>
        <p>
          设备符号采用 <b>QF</b> 断路器、<b>QS</b> 隔离开关、<b>QE</b> 接地开关、<b>TA</b>
          电流互感器、<b>TV</b> 电压互感器、<b>FV</b> 避雷器、<b>FU</b> 熔断器、<b>T</b>
          变压器等标准文字符号，可在属性面板中按项目编号规则修改。
        </p>
      </section>
    </div>
  </el-drawer>
</template>

<style scoped>
.standards {
  padding: 0 4px 28px;
}

.standard-intro {
  padding: 18px 20px;
  background: linear-gradient(140deg, #eef6f4, #f8faf9);
  border: 1px solid #d8e5e2;
  border-radius: 10px;
}

.eyebrow {
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.13em;
}

.standard-intro h3 {
  margin: 7px 0 7px;
  color: var(--ink);
  font-size: 19px;
  font-weight: 650;
}

.standard-intro p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 12.5px;
  line-height: 1.8;
}

.symbol-group {
  margin-top: 26px;
}

.group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 9px;
  border-bottom: 1px solid var(--line);
}

.group-head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.group-head span {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
}

.symbol-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.symbol-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 10px;
  background: #fbfcfc;
  border: 1px solid #e7eded;
  border-radius: 8px;
}

.glyph-box {
  display: grid;
  width: 58px;
  height: 58px;
  flex: none;
  place-items: center;
  background: #fff;
  border: 1px solid #eef2f1;
  border-radius: 6px;
}

.glyph-box svg {
  width: 46px;
  height: 46px;
}

.glyph-box :deep(.sym-conductor),
.glyph-box :deep(.sym-thin),
.glyph-box :deep(.sym-ring),
.glyph-box :deep(.sym-box),
.glyph-box :deep(.sym-dashed),
.glyph-box :deep(.sym-earth),
.glyph-box :deep(.sym-arc),
.glyph-box :deep(.sym-coil),
.glyph-box :deep(.sym-arrow-head) {
  stroke: #26363e;
}

.glyph-box :deep(.sym-box) {
  fill: #fff;
}

.glyph-box :deep(.sym-terminal),
.glyph-box :deep(.sym-junction-dot) {
  fill: #26363e;
}

.glyph-box :deep(.sym-busbar) {
  stroke: #1b2a31;
}

.glyph-box :deep(.sym-glyph-text) {
  fill: #26363e;
  font-family: var(--font-mono);
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: central;
}

.symbol-copy {
  min-width: 0;
}

.symbol-copy > div {
  display: flex;
  align-items: center;
  gap: 6px;
}

.symbol-copy strong {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.symbol-code {
  padding: 0 4px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 9px;
}

.symbol-copy p {
  overflow: hidden;
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wire-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 6px;
}

.wire-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 4px;
  border-bottom: 1px dashed #e9efee;
}

.wire-row svg {
  flex: none;
}

.wire-row div {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.wire-row strong {
  font-size: 12px;
  font-weight: 600;
}

.wire-row span {
  color: var(--muted);
  font-size: 11px;
}

.reference-note {
  display: flex;
  gap: 10px;
  margin-top: 26px;
  padding: 14px 16px;
  background: var(--warm-soft);
  border: 1px solid #f0e2c5;
  border-radius: 8px;
}

.note-mark {
  display: grid;
  width: 18px;
  height: 18px;
  flex: none;
  place-items: center;
  color: #85621d;
  border: 1px solid #c8a65b;
  border-radius: 50%;
  font-family: Georgia, serif;
  font-size: 11px;
  font-style: italic;
}

.reference-note p {
  margin: 0;
  color: #6b5934;
  font-size: 11.5px;
  line-height: 1.75;
}

.reference-note b {
  color: #4d3d1c;
  font-family: var(--font-mono);
  font-size: 11px;
}

@media (max-width: 640px) {
  .symbol-grid {
    grid-template-columns: 1fr;
  }
}
</style>
