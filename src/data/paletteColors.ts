export interface PaletteColor {
  name: string
  value: string
}

/** 常用电气制图颜色，供设备符号与导线快速选取。 */
export const COMMON_COLORS: PaletteColor[] = [
  { name: '墨色', value: '#26363e' },
  { name: '黑色', value: '#1b2a31' },
  { name: '红色', value: '#c53b32' },
  { name: '橙色', value: '#d97706' },
  { name: '金色', value: '#b58a1b' },
  { name: '绿色', value: '#16825d' },
  { name: '青色', value: '#0b756c' },
  { name: '蓝色', value: '#2b6f8f' },
  { name: '紫色', value: '#7b5ea7' },
  { name: '灰色', value: '#7a8a8e' },
]
