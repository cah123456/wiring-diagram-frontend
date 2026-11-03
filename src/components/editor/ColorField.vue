<script setup lang="ts">
import { COMMON_COLORS } from '../../data/paletteColors'

withDefaults(
  defineProps<{
    modelValue?: string
    fallback?: string
    label?: string
    hint?: string
    resetLabel?: string
  }>(),
  {
    modelValue: undefined,
    fallback: '#26363e',
    label: '颜色',
    hint: '按标准配色',
    resetLabel: '恢复标准色',
  },
)

const emit = defineEmits<{
  change: [value: string]
  reset: []
}>()
</script>

<template>
  <div class="color-field">
    <span class="field-label">{{ label }}</span>
    <div class="color-input-row">
      <input
        type="color"
        :value="modelValue || fallback"
        @change="emit('change', ($event.target as HTMLInputElement).value)"
      />
      <button v-if="modelValue" type="button" class="text-link" @click="emit('reset')">
        {{ resetLabel }}
      </button>
      <span v-else class="field-hint">{{ hint }}</span>
    </div>
    <div class="color-presets" role="group" aria-label="常用颜色">
      <button
        v-for="color in COMMON_COLORS"
        :key="color.value"
        type="button"
        class="color-swatch"
        :class="{ active: modelValue === color.value }"
        :style="{ backgroundColor: color.value }"
        :title="color.name"
        :aria-label="color.name"
        @click="emit('change', color.value)"
      />
    </div>
  </div>
</template>

<style scoped>
.color-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  color: #849497;
  font-size: 10px;
  font-weight: 500;
}

.field-hint {
  margin: -1px 0 0;
  color: #a0aeaf;
  font-size: 9.5px;
  line-height: 1.45;
}

.color-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input-row input[type='color'] {
  width: 32px;
  height: 23px;
  padding: 2px;
  background: #fff;
  border: 1px solid #dbe5e3;
  border-radius: 4px;
  cursor: pointer;
}

.text-link {
  padding: 0;
  color: var(--accent);
  font-size: 9.5px;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.text-link:hover {
  text-decoration: underline;
}

.color-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.color-swatch {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid rgba(38, 54, 62, 0.16);
  border-radius: 4px;
  cursor: pointer;
  transition:
    transform 0.12s,
    box-shadow 0.12s;
}

.color-swatch:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(23, 45, 52, 0.2);
}

.color-swatch.active {
  box-shadow:
    0 0 0 1px #fff,
    0 0 0 2px var(--accent);
}
</style>
