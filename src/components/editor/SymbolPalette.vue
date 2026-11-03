<script setup lang="ts">
import { computed, ref } from 'vue'
import { LibraryBig, Search, X } from 'lucide-vue-next'
import { getSymbol, SYMBOL_CATEGORIES, SYMBOLS } from '../../data/symbols'
import { useEditorStore } from '../../stores/editor'
import type { SymbolType } from '../../types/diagram'
import { writeSymbolDrag } from '../../utils/dnd'

const store = useEditorStore()
const query = ref('')

const totalCount = Object.keys(SYMBOLS).length

const groups = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return SYMBOL_CATEGORIES.map((category) => ({
    key: category.key,
    name: category.name,
    symbols: category.symbols.filter((type) => {
      if (!keyword) return true
      const def = getSymbol(type)
      return [def.name, def.code, def.description, def.standard, ...def.keywords]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    }),
  })).filter((group) => group.symbols.length > 0)
})

const onDragStart = (event: DragEvent, type: SymbolType) => {
  writeSymbolDrag(event, { type, from: 'palette' })
}

const insertSymbol = (type: SymbolType) => {
  store.addNodeAtViewportCenter(type)
}

const displayGlyph = (type: SymbolType) => getSymbol(type).glyph

const thumbStyle = (type: SymbolType) => {
  const color = getSymbol(type).defaultColor
  return color ? { '--sym-ink': color } : undefined
}
</script>

<template>
  <aside class="symbol-palette">
    <div class="palette-heading">
      <div class="heading-title">
        <span class="heading-icon">
          <LibraryBig :size="15" />
        </span>
        <div>
          <h2>设备符号库</h2>
          <p>{{ totalCount }} 种标准图形 · GB/T 4728</p>
        </div>
      </div>
    </div>

    <div class="palette-search">
      <Search :size="13" class="search-icon" />
      <input v-model="query" type="search" placeholder="搜索设备、代号或关键词" />
      <button v-if="query" type="button" title="清除搜索" @click="query = ''">
        <X :size="12" />
      </button>
    </div>

    <div class="palette-scroll scroll-thin">
      <section v-for="group in groups" :key="group.key" class="symbol-group">
        <header>
          <span>{{ group.name }}</span>
          <span class="group-count">{{ group.symbols.length }}</span>
        </header>

        <div class="symbol-grid">
          <button
            v-for="type in group.symbols"
            :key="type"
            type="button"
            class="symbol-item"
            :class="{ wide: getSymbol(type).wide }"
            draggable="true"
            :title="`${getSymbol(type).name}\n${getSymbol(type).description}\n${getSymbol(type).standard}`"
            @dragstart="onDragStart($event, type)"
            @click="insertSymbol(type)"
          >
            <span class="symbol-thumb" :style="thumbStyle(type)">
              <span v-if="type === 'text'" class="text-thumb">Aa</span>
              <svg
                v-else
                :viewBox="`0 0 ${getSymbol(type).width} ${getSymbol(type).height}`"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <g v-html="displayGlyph(type)" />
              </svg>
            </span>
            <span class="symbol-meta">
              <span class="symbol-name">{{ getSymbol(type).name }}</span>
              <span class="symbol-code mono">{{ getSymbol(type).code }}</span>
            </span>
          </button>
        </div>
      </section>

      <div v-if="groups.length === 0" class="no-results">
        <p>没有匹配的符号</p>
        <button type="button" @click="query = ''">清除搜索</button>
      </div>
    </div>

    <div class="palette-foot">
      <span class="drag-dot" />
      拖拽至画布，或点击插入到视图中心
    </div>
  </aside>
</template>

<style scoped>
.symbol-palette {
  display: flex;
  width: 246px;
  flex: 0 0 246px;
  min-height: 0;
  flex-direction: column;
  background: #fbfcfc;
  border-right: 1px solid var(--line);
}

.palette-heading {
  flex: 0 0 auto;
  padding: 16px 14px 12px;
}

.heading-title {
  display: flex;
  align-items: center;
  gap: 9px;
}

.heading-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 7px;
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.palette-heading p {
  margin: 1px 0 0;
  color: #93a3a5;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.03em;
}

.palette-search {
  position: relative;
  display: flex;
  height: 32px;
  flex: 0 0 32px;
  align-items: center;
  margin: 0 12px 8px;
  padding: 0 8px 0 28px;
  background: #f3f6f5;
  border: 1px solid transparent;
  border-radius: 6px;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.palette-search:focus-within {
  background: #fff;
  border-color: #9ac9c3;
}

.search-icon {
  position: absolute;
  left: 9px;
  color: #8c9c9e;
}

.palette-search input {
  width: 100%;
  padding: 0;
  color: var(--ink);
  font-size: 12px;
  background: transparent;
  border: 0;
  outline: none;
}

.palette-search input::placeholder {
  color: #a4b2b3;
}

.palette-search input::-webkit-search-cancel-button {
  display: none;
}

.palette-search button {
  display: grid;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  place-items: center;
  color: #8c9c9e;
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.palette-search button:hover {
  color: var(--ink);
  background: #e6eceb;
}

.palette-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 10px 12px;
}

.symbol-group {
  padding-top: 10px;
}

.symbol-group + .symbol-group {
  margin-top: 8px;
  border-top: 1px solid #eef2f1;
}

.symbol-group header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 3px 7px;
  color: #7d8f92;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.group-count {
  color: #b1bdbd;
  font-weight: 400;
}

.symbol-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.symbol-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  padding: 6px;
  color: inherit;
  text-align: left;
  background: #fff;
  border: 1px solid #e7edec;
  border-radius: 6px;
  cursor: grab;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
}

.symbol-item:hover {
  border-color: #b9d4d0;
  box-shadow: 0 3px 10px rgba(30, 67, 68, 0.07);
  transform: translateY(-1px);
}

.symbol-item.wide {
  grid-column: 1 / -1;
}

.symbol-item.wide .symbol-thumb {
  width: 118px;
  height: 44px;
  flex: 0 0 118px;
}

.symbol-item.wide .symbol-thumb svg {
  width: 110px;
  height: 40px;
}

.symbol-item:active {
  cursor: grabbing;
  transform: translateY(0);
}

.symbol-thumb {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  color: #26363e;
  background: #f7faf9;
  border-radius: 4px;
  pointer-events: none;
}

.symbol-thumb svg {
  width: 27px;
  height: 27px;
  overflow: visible;
}

.symbol-thumb :deep(svg) {
  max-width: 100%;
}

.text-thumb {
  color: #26363e;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.04em;
}

.symbol-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
  pointer-events: none;
}

.symbol-name {
  display: -webkit-box;
  overflow: hidden;
  color: #3b4d53;
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.28;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.symbol-code {
  color: #a0aeaf;
  font-size: 8.5px;
  letter-spacing: 0.04em;
}

.no-results {
  padding: 42px 12px;
  color: #93a3a5;
  font-size: 12px;
  text-align: center;
}

.no-results p {
  margin: 0 0 10px;
}

.no-results button {
  padding: 4px 10px;
  color: var(--accent);
  font-size: 11px;
  background: var(--accent-soft);
  border: 0;
  border-radius: 4px;
  cursor: pointer;
}

.palette-foot {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  padding: 10px 13px;
  color: #9aa9aa;
  font-size: 9.5px;
  line-height: 1.4;
  border-top: 1px solid #eef2f1;
}

.drag-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  background: #b8c9c7;
  border-radius: 50%;
  box-shadow: 0 0 0 3px #f0f5f4;
}
</style>
