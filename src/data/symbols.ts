import type { PortDirection, SymbolType } from '../types/diagram'

export type SymbolCategory =
  | 'bus'
  | 'lv'
  | 'switchgear'
  | 'instrument'
  | 'power'
  | 'source'
  | 'secondaryControl'
  | 'secondaryMeasure'
  | 'annotation'

export type LabelPlacement = 'right' | 'top-left' | 'bottom' | 'center' | 'none'

export interface SymbolPortDef {
  id: string
  x: number
  y: number
  dir: PortDirection
  label?: string
}

export interface SymbolDef {
  type: SymbolType
  name: string
  code: string
  category: SymbolCategory
  description: string
  keywords: string[]
  width: number
  height: number
  glyph: string
  /** 组合回路关闭断路器时使用的替代图形。 */
  glyphNoBreaker?: string
  ports: SymbolPortDef[]
  labelPlacement: LabelPlacement
  standard: string
  portMode?: 'busbar' | 'none'
  /** 宽幅图形在符号库中使用整行预览，便于辨认细长结构。 */
  wide?: boolean
  /** 可在画布上拖动端点调整长度（母线、汇流排等条状图形）。 */
  resizable?: boolean
  /** 未单独设置颜色时使用的标准墨色。 */
  defaultColor?: string
}

const verticalPorts = (width: number, height: number): SymbolPortDef[] => [
  { id: 'top', x: width / 2, y: 0, dir: 'up' },
  { id: 'bottom', x: width / 2, y: height, dir: 'down' },
]

const horizontalPorts = (width: number, y: number): SymbolPortDef[] => [
  { id: 'left', x: 0, y, dir: 'left' },
  { id: 'right', x: width, y, dir: 'right' },
]

const topPort = (width: number): SymbolPortDef[] => [
  { id: 'top', x: width / 2, y: 0, dir: 'up' },
]

const meterGlyph = (label: string, small = false) => `
      <path class="sym-conductor" d="M0 45 H25 M85 45 H110"/>
      <circle class="sym-ring" cx="55" cy="45" r="30"/>
      <text class="sym-glyph-text${small ? ' sym-glyph-text-small' : ''}" x="55" y="46">${label}</text>
    `

const meterPorts = horizontalPorts(110, 45)

export const SYMBOLS: Record<SymbolType, SymbolDef> = {
  /* ── 母线与线路 ───────────────────────────────────────────── */

  busbar: {
    type: 'busbar',
    name: '母线',
    code: 'WB',
    category: 'bus',
    description: '主母线 / 母线分段，可沿母线任意位置引出回路',
    keywords: ['母线', 'busbar', '主母线', 'bus'],
    width: 840,
    height: 22,
    labelPlacement: 'top-left',
    standard: 'GB/T 4728 · 母线',
    portMode: 'busbar',
    ports: [],
    wide: true,
    resizable: true,
    glyph: `
      <path class="sym-busbar" d="M0 11 H840"/>
      <path class="sym-busbar-core" d="M8 11 H832"/>
    `,
  },
  busbarSection: {
    type: 'busbarSection',
    name: '母线分段',
    code: 'WB',
    category: 'bus',
    description: '分段母线，两段之间以分段间隔或联络开关连接',
    keywords: ['母线分段', '分段母线', 'sectionalized bus', 'bus section'],
    width: 420,
    height: 22,
    labelPlacement: 'top-left',
    standard: 'GB/T 4728 · 母线',
    portMode: 'busbar',
    ports: [],
    wide: true,
    resizable: true,
    glyph: `
      <path class="sym-busbar" d="M0 11 H190"/>
      <path class="sym-busbar" d="M230 11 H420"/>
      <path class="sym-thin" d="M204 0 V22 M216 0 V22"/>
    `,
  },
  genericBar: {
    type: 'genericBar',
    name: '通用汇流排',
    code: 'WB',
    category: 'bus',
    description: '无 N/PE 等用途标识的汇流排，可作中性线、保护线或其它汇流用途；用文字标注区分，两端可拖动调整长度',
    keywords: ['通用', '汇流排', '汇流线', '中性线', '保护线', '无标识', 'busbar', 'generic'],
    width: 230,
    height: 44,
    labelPlacement: 'top-left',
    standard: '制图约定 · 通用汇流排',
    portMode: 'busbar',
    ports: [],
    wide: true,
    resizable: true,
    glyph: `
      <path class="sym-busbar" d="M0 22 H230"/>
      <path class="sym-busbar-core" d="M8 22 H222"/>
    `,
  },

  /* ── 低压配电系统图 ───────────────────────────────────────── */

  lvIncoming: {
    type: 'lvIncoming',
    name: '低压进线回路',
    code: 'QF',
    category: 'lv',
    description: '低压进线回路：电源方向、断路器与三相电流互感器组合；可关闭断路器或拆分为独立单元，断路器部分默认红色，可单独改色',
    keywords: ['进线', '进线柜', '进线回路', '主进线', 'incoming', 'lv'],
    width: 380,
    height: 100,
    labelPlacement: 'right',
    standard: '制图约定 · 低压配电系统图',
    ports: horizontalPorts(380, 50),
    wide: true,
    glyph: `
      <path class="sym-conductor" d="M0 50 H380"/>
      <path class="sym-terminal" d="M58 36 L30 50 L58 64 Z"/>
      <path class="sym-conductor sym-protection" d="M96 50 H168"/>
      <path class="sym-conductor sym-inner sym-protection" d="M104 34 L160 66 M160 34 L104 66"/>
      <circle class="sym-terminal sym-protection-fill" cx="104" cy="50" r="2.5"/>
      <circle class="sym-terminal sym-protection-fill" cx="160" cy="50" r="2.5"/>
      <circle class="sym-ring" cx="300" cy="20" r="11"/>
      <circle class="sym-ring" cx="300" cy="50" r="11"/>
      <circle class="sym-ring" cx="300" cy="80" r="11"/>
      <path class="sym-thin" d="M282 20 H318 M282 50 H318 M282 80 H318"/>
    `,
    glyphNoBreaker: `
      <path class="sym-conductor" d="M0 50 H380"/>
      <path class="sym-terminal" d="M58 36 L30 50 L58 64 Z"/>
      <circle class="sym-ring" cx="300" cy="20" r="11"/>
      <circle class="sym-ring" cx="300" cy="50" r="11"/>
      <circle class="sym-ring" cx="300" cy="80" r="11"/>
      <path class="sym-thin" d="M282 20 H318 M282 50 H318 M282 80 H318"/>
    `,
  },
  lvOutgoing: {
    type: 'lvOutgoing',
    name: '低压出线回路',
    code: 'QF',
    category: 'lv',
    description: '低压抽屉式出线回路：插接触头、断路器、三相电流互感器与出线方向组合；可关闭断路器或拆分为独立单元，断路器部分默认红色，可单独改色',
    keywords: ['出线', '出线柜', '出线回路', '抽屉', '馈线', 'outgoing', 'feeder', 'lv'],
    width: 430,
    height: 100,
    labelPlacement: 'bottom',
    standard: '制图约定 · 低压配电系统图',
    ports: horizontalPorts(430, 50),
    wide: true,
    glyph: `
      <path class="sym-conductor" d="M0 50 H430"/>
      <path class="sym-thin" d="M70 32 L52 50 L70 68 M90 32 L72 50 L90 68"/>
      <path class="sym-conductor sym-protection" d="M96 50 H206"/>
      <path class="sym-conductor sym-inner sym-protection" d="M124 34 L180 66 M180 34 L124 66"/>
      <circle class="sym-terminal sym-protection-fill" cx="124" cy="50" r="2.5"/>
      <circle class="sym-terminal sym-protection-fill" cx="180" cy="50" r="2.5"/>
      <path class="sym-thin" d="M212 32 L230 50 L212 68 M232 32 L250 50 L232 68"/>
      <circle class="sym-ring" cx="330" cy="20" r="11"/>
      <circle class="sym-ring" cx="330" cy="50" r="11"/>
      <circle class="sym-ring" cx="330" cy="80" r="11"/>
      <path class="sym-thin" d="M312 20 H348 M312 50 H348 M312 80 H348"/>
      <path class="sym-terminal" d="M392 36 L430 50 L392 64 Z"/>
    `,
    glyphNoBreaker: `
      <path class="sym-conductor" d="M0 50 H430"/>
      <path class="sym-thin" d="M70 32 L52 50 L70 68 M90 32 L72 50 L90 68"/>
      <path class="sym-thin" d="M212 32 L230 50 L212 68 M232 32 L250 50 L232 68"/>
      <circle class="sym-ring" cx="330" cy="20" r="11"/>
      <circle class="sym-ring" cx="330" cy="50" r="11"/>
      <circle class="sym-ring" cx="330" cy="80" r="11"/>
      <path class="sym-thin" d="M312 20 H348 M312 50 H348 M312 80 H348"/>
      <path class="sym-terminal" d="M392 36 L430 50 L392 64 Z"/>
    `,
  },
  drawoutContact: {
    type: 'drawoutContact',
    name: '抽屉式插接',
    code: 'XS',
    category: 'lv',
    description: '抽屉柜一次插接 / 隔离触头，双箭头表示可抽出部件',
    keywords: ['抽屉', '插接', '触头', '隔离触头', 'drawout', 'plug', 'contact'],
    width: 140,
    height: 60,
    labelPlacement: 'right',
    standard: '制图约定 · 抽屉柜一次插接',
    ports: horizontalPorts(140, 30),
    glyph: `
      <path class="sym-conductor" d="M0 30 H140"/>
      <path class="sym-thin" d="M52 14 L34 30 L52 46 M72 14 L54 30 L72 46"/>
      <path class="sym-thin" d="M68 14 L86 30 L68 46 M88 14 L106 30 L88 46"/>
    `,
  },
  drawoutLeft: {
    type: 'drawoutLeft',
    name: '左向抽屉插接',
    code: 'XS',
    category: 'lv',
    description: '抽屉柜一次插接的左向双箭头，通常放在断路器电源侧；可单独放置，与断路器、CT 自由组合',
    keywords: ['抽屉', '插接', '左向', '隔离触头', 'drawout', 'left'],
    width: 80,
    height: 60,
    labelPlacement: 'right',
    standard: '制图约定 · 抽屉柜一次插接',
    ports: horizontalPorts(80, 30),
    glyph: `
      <path class="sym-conductor" d="M0 30 H80"/>
      <path class="sym-thin" d="M42 14 L24 30 L42 46 M62 14 L44 30 L62 46"/>
    `,
  },
  drawoutRight: {
    type: 'drawoutRight',
    name: '右向抽屉插接',
    code: 'XS',
    category: 'lv',
    description: '抽屉柜一次插接的右向双箭头，通常放在断路器负荷侧；可单独放置，与断路器、CT 自由组合',
    keywords: ['抽屉', '插接', '右向', '隔离触头', 'drawout', 'right'],
    width: 80,
    height: 60,
    labelPlacement: 'right',
    standard: '制图约定 · 抽屉柜一次插接',
    ports: horizontalPorts(80, 30),
    glyph: `
      <path class="sym-conductor" d="M0 30 H80"/>
      <path class="sym-thin" d="M38 14 L56 30 L38 46 M58 14 L76 30 L58 46"/>
    `,
  },
  ctGroup: {
    type: 'ctGroup',
    name: '三相电流互感器组',
    code: 'TA',
    category: 'lv',
    description: '三只电流互感器组成的三相电流测量单元，可旋转适配垂直导体',
    keywords: ['三相', '电流互感器', 'ct', 'ta', '三相电流', '互感器组'],
    width: 170,
    height: 130,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 电流互感器',
    ports: horizontalPorts(170, 65),
    glyph: `
      <path class="sym-conductor" d="M0 65 H170"/>
      <circle class="sym-ring" cx="85" cy="30" r="16"/>
      <circle class="sym-ring" cx="85" cy="65" r="16"/>
      <circle class="sym-ring" cx="85" cy="100" r="16"/>
      <path class="sym-thin" d="M63 30 H107 M63 65 H107 M63 100 H107"/>
    `,
  },
  flowArrow: {
    type: 'flowArrow',
    name: '出线方向箭头',
    code: 'AR',
    category: 'lv',
    description: '低压出线方向指示，箭头向右；两端均有端口，可与其他单元自由串联',
    keywords: ['箭头', '方向', '出线', '电源方向', 'arrow', 'direction', 'right'],
    width: 100,
    height: 40,
    labelPlacement: 'none',
    standard: '制图约定 · 电源 / 出线方向',
    ports: horizontalPorts(100, 20),
    glyph: `
      <path class="sym-conductor" d="M0 20 H78"/>
      <path class="sym-terminal" d="M78 8 L100 20 L78 32 Z"/>
    `,
  },
  flowArrowLeft: {
    type: 'flowArrowLeft',
    name: '进线方向箭头',
    code: 'AR',
    category: 'lv',
    description: '低压进线电源方向指示，箭头向左并留有引入短线；两端均有端口，可与其他单元自由串联',
    keywords: ['箭头', '方向', '进线', '电源方向', 'arrow', 'direction', 'left'],
    width: 100,
    height: 40,
    labelPlacement: 'none',
    standard: '制图约定 · 电源 / 出线方向',
    ports: horizontalPorts(100, 20),
    glyph: `
      <path class="sym-conductor" d="M0 20 H100"/>
      <path class="sym-terminal" d="M58 8 L30 20 L58 32 Z"/>
    `,
  },
  systemBreaker: {
    type: 'systemBreaker',
    name: '系统图断路器',
    code: 'QF',
    category: 'lv',
    description: '低压配电系统图常用断路器符号，× 表示断路器触头',
    keywords: ['断路器', '系统图', '低压', 'breaker', 'mccb', 'qf'],
    width: 100,
    height: 60,
    labelPlacement: 'right',
    standard: '制图约定 · 低压配电系统图',
    defaultColor: '#c53b32',
    ports: horizontalPorts(100, 30),
    glyph: `
      <path class="sym-conductor" d="M0 30 H100"/>
      <path class="sym-conductor sym-inner" d="M34 12 L66 48 M66 12 L34 48"/>
    `,
  },
  acb: {
    type: 'acb',
    name: '框架式断路器',
    code: 'QF',
    category: 'lv',
    description: '框架式（万能式）低压断路器，适用于主进线和大容量出线',
    keywords: ['框架', '万能式', 'acb', '低压断路器', '主开关'],
    width: 110,
    height: 150,
    labelPlacement: 'right',
    standard: 'GB/T 14048.2 · 框架式断路器',
    defaultColor: '#c53b32',
    ports: verticalPorts(110, 150),
    glyph: `
      <path class="sym-conductor" d="M55 0 V56 M55 112 V150"/>
      <rect class="sym-dashed" x="8" y="8" width="94" height="134" rx="4"/>
      <rect class="sym-box" x="26" y="38" width="58" height="74" rx="2"/>
      <path class="sym-conductor sym-inner" d="M55 112 L72 56"/>
      <circle class="sym-terminal" cx="55" cy="56" r="3"/>
      <circle class="sym-terminal" cx="55" cy="112" r="3"/>
      <path class="sym-arc" d="M74 64 Q82 56 90 64"/>
    `,
  },
  mccb: {
    type: 'mccb',
    name: '塑壳断路器',
    code: 'QF',
    category: 'lv',
    description: '塑壳式低压断路器，适用于配电支路和出线回路',
    keywords: ['塑壳', 'mccb', '低压断路器', '配电'],
    width: 90,
    height: 130,
    labelPlacement: 'right',
    standard: 'GB/T 14048.2 · 塑壳断路器',
    defaultColor: '#c53b32',
    ports: verticalPorts(90, 130),
    glyph: `
      <path class="sym-conductor" d="M45 0 V44 M45 96 V130"/>
      <rect class="sym-box" x="18" y="34" width="54" height="62" rx="2"/>
      <path class="sym-conductor sym-inner" d="M45 96 L62 44"/>
      <circle class="sym-terminal" cx="45" cy="44" r="2.5"/>
      <circle class="sym-terminal" cx="45" cy="96" r="2.5"/>
      <rect class="sym-thin" x="64" y="68" width="12" height="16" rx="1"/>
    `,
  },
  rcbo: {
    type: 'rcbo',
    name: '剩余电流断路器',
    code: 'QF',
    category: 'lv',
    description: '带剩余电流保护的断路器（RCBO），用于漏电与触电保护',
    keywords: ['漏电', '剩余电流', 'rcbo', 'rcd', '漏电保护', '低压断路器'],
    width: 110,
    height: 140,
    labelPlacement: 'right',
    standard: 'GB/T 14048.2 · 剩余电流断路器',
    defaultColor: '#c53b32',
    ports: verticalPorts(110, 140),
    glyph: `
      <path class="sym-conductor" d="M55 0 V36 M55 104 V140"/>
      <ellipse class="sym-ring" cx="55" cy="70" rx="40" ry="26"/>
      <rect class="sym-box" x="31" y="42" width="48" height="56" rx="2"/>
      <path class="sym-conductor sym-inner" d="M55 98 L70 50"/>
      <circle class="sym-terminal" cx="55" cy="50" r="2.5"/>
      <circle class="sym-terminal" cx="55" cy="98" r="2.5"/>
      <path class="sym-thin" d="M95 70 H104"/>
      <circle class="sym-terminal" cx="104" cy="70" r="2"/>
    `,
  },
  spd: {
    type: 'spd',
    name: '浪涌保护器',
    code: 'SPD',
    category: 'lv',
    description: '低压浪涌保护器（SPD），接于相线与接地之间',
    keywords: ['浪涌', '防雷', 'spd', '过电压', '避雷'],
    width: 100,
    height: 150,
    labelPlacement: 'right',
    standard: 'GB/T 18802.1 · 浪涌保护器',
    ports: topPort(100),
    glyph: `
      <path class="sym-conductor" d="M50 0 V42"/>
      <rect class="sym-box" x="18" y="42" width="64" height="54" rx="2"/>
      <path class="sym-arrow-head" d="M34 82 L66 56 M66 56 L52 58 M66 56 L64 70"/>
      <path class="sym-conductor" d="M50 96 V120"/>
      <path class="sym-earth" d="M30 120 H70 M36 127 H64 M42 134 H58 M47 141 H53"/>
    `,
  },
  busway: {
    type: 'busway',
    name: '母线槽',
    code: 'W',
    category: 'lv',
    description: '低压密集型母线槽 / 母线干线，可作为配电干线使用',
    keywords: ['母线槽', '母线干线', 'busway', '密集型母线'],
    width: 320,
    height: 60,
    labelPlacement: 'bottom',
    standard: 'GB/T 7251.6 · 母线槽',
    ports: horizontalPorts(320, 30),
    wide: true,
    glyph: `
      <rect class="sym-box" x="1" y="12" width="318" height="36" rx="6"/>
      <path class="sym-conductor" d="M0 30 H12 M308 30 H320"/>
      <path class="sym-conductor" d="M14 30 H306" stroke-width="9" stroke-linecap="butt"/>
      <path class="sym-thin" d="M28 16 V44 M292 16 V44"/>
    `,
  },
  neutralBar: {
    type: 'neutralBar',
    name: '中性线 N 排',
    code: 'N',
    category: 'lv',
    description: '中性线（N）汇流排，可沿排任意位置引出回路',
    keywords: ['中性线', 'n排', '零线', '中性导体', 'neutral', 'n bar'],
    width: 230,
    height: 44,
    labelPlacement: 'right',
    standard: 'GB/T 4728.2 · 中性导体 N',
    portMode: 'busbar',
    ports: [],
    wide: true,
    resizable: true,
    glyph: `
      <path class="sym-busbar" d="M0 22 H230"/>
      <path class="sym-busbar-core" d="M8 22 H222"/>
    `,
  },
  peBar: {
    type: 'peBar',
    name: '保护线 PE 排',
    code: 'PE',
    category: 'lv',
    description: '保护接地（PE）汇流排，可沿排任意位置引出接地线',
    keywords: ['保护线', 'pe排', '接地排', '保护导体', 'pe bar', 'earth bar'],
    width: 230,
    height: 44,
    labelPlacement: 'right',
    standard: 'GB/T 4728.2 · 保护导体 PE',
    portMode: 'busbar',
    ports: [],
    wide: true,
    resizable: true,
    glyph: `
      <path class="sym-busbar" d="M0 22 H230"/>
      <path class="sym-busbar-core" d="M8 22 H222"/>
    `,
  },

  /* ── 一次开关与保护 ───────────────────────────────────────── */

  breaker: {
    type: 'breaker',
    name: '断路器',
    code: 'QF',
    category: 'switchgear',
    description: '真空 / SF₆ 断路器的单线表示，箱形符号内交叉触头',
    keywords: ['断路器', '开关', 'breaker', 'qf', '真空'],
    width: 92,
    height: 138,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 断路器',
    ports: verticalPorts(92, 138),
    glyph: `
      <path class="sym-conductor" d="M46 0 V42 M46 96 V138"/>
      <circle class="sym-terminal" cx="46" cy="42" r="3"/>
      <circle class="sym-terminal" cx="46" cy="96" r="3"/>
      <rect class="sym-box" x="23" y="42" width="46" height="54" rx="1"/>
      <path class="sym-conductor sym-inner" d="M29 48 L63 90 M63 48 L29 90"/>
    `,
  },
  drawoutBreaker: {
    type: 'drawoutBreaker',
    name: '手车式断路器',
    code: 'QF',
    category: 'switchgear',
    description: '手车式（抽出式）断路器，虚线表示可移开部件',
    keywords: ['手车', '抽出式', '断路器', 'drawout', 'qf'],
    width: 112,
    height: 170,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 抽出式断路器',
    ports: verticalPorts(112, 170),
    glyph: `
      <rect class="sym-dashed" x="9" y="18" width="94" height="134" rx="4"/>
      <path class="sym-conductor" d="M56 0 V44 M56 126 V170"/>
      <circle class="sym-terminal" cx="56" cy="44" r="3.5"/>
      <circle class="sym-terminal" cx="56" cy="126" r="3.5"/>
      <rect class="sym-box" x="31" y="44" width="50" height="82" rx="1"/>
      <path class="sym-conductor sym-inner" d="M37 51 L75 119 M75 51 L37 119"/>
      <path class="sym-thin" d="M9 85 H2 M103 85 H110"/>
      <path class="sym-thin" d="M5 80 L2 85 L5 90 M107 80 L110 85 L107 90"/>
    `,
  },
  loadSwitch: {
    type: 'loadSwitch',
    name: '负荷开关',
    code: 'QL',
    category: 'switchgear',
    description: '负荷开关，触头带灭弧能力',
    keywords: ['负荷开关', 'load switch', 'ql'],
    width: 92,
    height: 138,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 负荷开关',
    ports: verticalPorts(92, 138),
    glyph: `
      <path class="sym-conductor" d="M46 0 V42 M46 96 V138"/>
      <circle class="sym-terminal" cx="46" cy="42" r="3"/>
      <circle class="sym-terminal" cx="46" cy="96" r="3"/>
      <rect class="sym-box" x="23" y="42" width="46" height="54" rx="1"/>
      <path class="sym-conductor sym-inner" d="M46 96 L61 58"/>
      <path class="sym-arc" d="M34 78 Q27 67 35 58 Q42 50 51 51"/>
    `,
  },
  disconnector: {
    type: 'disconnector',
    name: '隔离开关',
    code: 'QS',
    category: 'switchgear',
    description: '隔离开关，具有明显断开点',
    keywords: ['隔离开关', '刀闸', '隔离', 'disconnector', 'qs'],
    width: 84,
    height: 132,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 隔离开关',
    ports: verticalPorts(84, 132),
    glyph: `
      <path class="sym-conductor" d="M42 0 V44 M42 102 V132"/>
      <circle class="sym-terminal" cx="42" cy="44" r="3.2"/>
      <circle class="sym-terminal" cx="42" cy="102" r="3.2"/>
      <path class="sym-conductor" d="M42 102 L65 53"/>
    `,
  },
  earthingSwitch: {
    type: 'earthingSwitch',
    name: '接地开关',
    code: 'QE',
    category: 'switchgear',
    description: '接地开关，检修时可靠接地',
    keywords: ['接地开关', '接地刀', '检修接地', 'earthing', 'qe'],
    width: 96,
    height: 154,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 接地开关',
    ports: [
      { id: 'top', x: 48, y: 0, dir: 'up' },
      { id: 'left', x: 0, y: 54, dir: 'left' },
    ],
    glyph: `
      <path class="sym-conductor" d="M48 0 V54"/>
      <circle class="sym-terminal" cx="48" cy="54" r="3.2"/>
      <path class="sym-conductor" d="M48 54 L72 78"/>
      <path class="sym-conductor" d="M48 90 V112"/>
      <path class="sym-earth" d="M27 112 H69 M32 119 H64 M39 126 H57 M44 133 H52"/>
    `,
  },
  threePositionSwitch: {
    type: 'threePositionSwitch',
    name: '三工位开关',
    code: 'QS',
    category: 'switchgear',
    description: '合闸 / 分闸 / 接地三工位组合开关，常见于 GIS 与环网柜',
    keywords: ['三工位', '三位置', 'gis', '环网柜', 'three position'],
    width: 100,
    height: 170,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 三工位开关',
    ports: [
      { id: 'top', x: 50, y: 0, dir: 'up' },
      { id: 'bottom', x: 50, y: 170, dir: 'down' },
      { id: 'left', x: 0, y: 84, dir: 'left' },
    ],
    glyph: `
      <path class="sym-conductor" d="M50 0 V56 M50 122 V170"/>
      <circle class="sym-terminal" cx="50" cy="56" r="3.2"/>
      <circle class="sym-terminal" cx="50" cy="122" r="3.2"/>
      <path class="sym-conductor" d="M50 122 L72 84"/>
      <path class="sym-conductor" d="M50 56 L28 84"/>
      <path class="sym-conductor" d="M28 84 H0"/>
      <path class="sym-earth" d="M28 84 V104 M17 104 H39 M21 111 H35 M26 118 H30"/>
    `,
  },
  fuse: {
    type: 'fuse',
    name: '熔断器',
    code: 'FU',
    category: 'switchgear',
    description: '高压熔断器 / 熔断器保护',
    keywords: ['熔断器', '保险', 'fuse', 'fu'],
    width: 76,
    height: 126,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 熔断器',
    ports: verticalPorts(76, 126),
    glyph: `
      <path class="sym-conductor" d="M38 0 V28 M38 94 V126"/>
      <rect class="sym-box" x="23" y="28" width="30" height="66" rx="1"/>
      <path class="sym-conductor sym-inner" d="M38 33 V89"/>
    `,
  },
  switchFuse: {
    type: 'switchFuse',
    name: '负荷开关-熔断器组合',
    code: 'QL',
    category: 'switchgear',
    description: '负荷开关与高压熔断器组合电器，用于变压器保护',
    keywords: ['组合电器', '负荷开关熔断器', 'switch fuse', 'ql', 'fu'],
    width: 100,
    height: 230,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 开关-熔断器组合',
    ports: verticalPorts(100, 230),
    glyph: `
      <path class="sym-conductor" d="M50 0 V30 M50 62 V112 M50 178 V230"/>
      <circle class="sym-terminal" cx="50" cy="30" r="3"/>
      <circle class="sym-terminal" cx="50" cy="62" r="3"/>
      <rect class="sym-box" x="27" y="30" width="46" height="32" rx="1"/>
      <path class="sym-conductor sym-inner" d="M50 62 L66 36"/>
      <rect class="sym-box" x="35" y="112" width="30" height="66" rx="1"/>
      <path class="sym-conductor sym-inner" d="M50 117 V173"/>
      <circle class="sym-terminal" cx="50" cy="112" r="3"/>
      <circle class="sym-terminal" cx="50" cy="178" r="3"/>
    `,
  },
  contactor: {
    type: 'contactor',
    name: '真空接触器',
    code: 'KM',
    category: 'switchgear',
    description: '真空接触器，用于频繁操作的低压 / 高压电动机回路',
    keywords: ['接触器', '真空接触器', 'contactor', 'km'],
    width: 100,
    height: 138,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 接触器',
    ports: verticalPorts(100, 138),
    glyph: `
      <path class="sym-conductor" d="M50 0 V42 M50 96 V138"/>
      <circle class="sym-terminal" cx="50" cy="42" r="3"/>
      <circle class="sym-terminal" cx="50" cy="96" r="3"/>
      <rect class="sym-box" x="27" y="42" width="46" height="54" rx="1"/>
      <path class="sym-conductor sym-inner" d="M50 96 L65 58"/>
      <path class="sym-arc" d="M38 78 Q31 67 39 58 Q46 50 55 51"/>
      <path class="sym-thin" d="M65 58 H78"/>
      <rect class="sym-box" x="78" y="51" width="12" height="14" rx="1"/>
    `,
  },
  ats: {
    type: 'ats',
    name: '双电源转换开关',
    code: 'ATS',
    category: 'switchgear',
    description: '双电源自动转换开关，两路进线切换至公共出线',
    keywords: ['双电源', '转换开关', 'ats', '切换', '自动转换'],
    width: 180,
    height: 160,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 转换开关',
    ports: [
      { id: 'top-left', x: 40, y: 0, dir: 'up' },
      { id: 'top-right', x: 140, y: 0, dir: 'up' },
      { id: 'bottom', x: 90, y: 160, dir: 'down' },
    ],
    glyph: `
      <path class="sym-conductor" d="M40 0 V55 M140 0 V55 M90 88 V160"/>
      <circle class="sym-terminal" cx="40" cy="55" r="3.2"/>
      <circle class="sym-terminal" cx="140" cy="55" r="3.2"/>
      <circle class="sym-terminal" cx="90" cy="88" r="3.2"/>
      <path class="sym-conductor" d="M40 55 L82 84 M140 55 L98 84"/>
      <rect class="sym-dashed" x="22" y="42" width="136" height="56" rx="4"/>
    `,
  },
  arrester: {
    type: 'arrester',
    name: '避雷器',
    code: 'FV',
    category: 'switchgear',
    description: '金属氧化物避雷器 / 过电压保护器',
    keywords: ['避雷器', '过电压', 'moa', 'fv', 'surge'],
    width: 88,
    height: 158,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 避雷器',
    ports: [
      { id: 'top', x: 44, y: 0, dir: 'up' },
      { id: 'right', x: 88, y: 44, dir: 'right' },
    ],
    glyph: `
      <path class="sym-conductor" d="M44 0 V44 M44 102 V124"/>
      <rect class="sym-box" x="25" y="44" width="38" height="58" rx="1"/>
      <path class="sym-conductor sym-inner" d="M30 94 L58 52"/>
      <path class="sym-arrow-head" d="M50 55 L58 52 L55 61"/>
      <path class="sym-earth" d="M23 124 H65 M28 131 H60 M35 138 H53 M40 145 H48"/>
    `,
  },

  /* ── 互感器 ───────────────────────────────────────────────── */

  ct: {
    type: 'ct',
    name: '电流互感器',
    code: 'TA',
    category: 'instrument',
    description: '电流互感器，一次导体穿过环形铁芯',
    keywords: ['电流互感器', 'ct', 'ta', '互感器'],
    width: 110,
    height: 150,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 电流互感器',
    ports: verticalPorts(110, 150),
    glyph: `
      <path class="sym-conductor" d="M55 0 V150"/>
      <circle class="sym-ring" cx="55" cy="75" r="27"/>
      <circle class="sym-terminal" cx="55" cy="75" r="2.2"/>
      <path class="sym-thin" d="M82 67 H98 V92 H86"/>
      <path class="sym-earth sym-small" d="M98 92 V100 M91 100 H105 M94 105 H102"/>
    `,
  },
  pt: {
    type: 'pt',
    name: '电压互感器',
    code: 'TV',
    category: 'instrument',
    description: '电压互感器，一次侧接母线，二次侧接地',
    keywords: ['电压互感器', 'pt', 'tv', '互感器'],
    width: 116,
    height: 172,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 电压互感器',
    ports: topPort(116),
    glyph: `
      <path class="sym-conductor" d="M58 0 V38"/>
      <circle class="sym-ring" cx="58" cy="70" r="31"/>
      <path class="sym-coil" d="M35 76 Q41 84 46 76 Q52 84 58 76 Q64 84 70 76 Q76 84 81 76"/>
      <path class="sym-conductor" d="M58 101 V128"/>
      <path class="sym-earth" d="M37 128 H79 M42 135 H74 M49 142 H67 M54 149 H62"/>
    `,
  },
  zeroSeqCT: {
    type: 'zeroSeqCT',
    name: '零序电流互感器',
    code: 'TA0',
    category: 'instrument',
    description: '零序电流互感器，三相导体同时穿过环形铁芯',
    keywords: ['零序', '零序电流', '零序互感器', 'zero sequence', 'ta0'],
    width: 140,
    height: 100,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 零序电流互感器',
    ports: horizontalPorts(140, 50),
    glyph: `
      <path class="sym-conductor" d="M0 34 H140 M0 50 H140 M0 66 H140"/>
      <ellipse class="sym-ring" cx="70" cy="50" rx="38" ry="30"/>
      <path class="sym-thin" d="M108 50 H124 V72"/>
      <path class="sym-earth sym-small" d="M124 72 V80 M117 80 H131 M120 85 H128"/>
    `,
  },

  /* ── 变压与补偿 ───────────────────────────────────────────── */

  transformer: {
    type: 'transformer',
    name: '双绕组变压器',
    code: 'T',
    category: 'power',
    description: '双绕组电力变压器 / 站用变压器',
    keywords: ['变压器', 'transformer', 't', '站用变'],
    width: 148,
    height: 190,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 双绕组变压器',
    ports: verticalPorts(148, 190),
    glyph: `
      <path class="sym-conductor" d="M74 0 V38 M74 152 V190"/>
      <circle class="sym-ring" cx="74" cy="72" r="34"/>
      <circle class="sym-ring" cx="74" cy="118" r="34"/>
    `,
  },
  transformer3w: {
    type: 'transformer3w',
    name: '三绕组变压器',
    code: 'T',
    category: 'power',
    description: '三绕组电力变压器，高 / 中 / 低压侧三组绕组',
    keywords: ['三绕组', '三卷变', '变压器', 'three winding', 't'],
    width: 190,
    height: 210,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 三绕组变压器',
    ports: [
      { id: 'top', x: 80, y: 0, dir: 'up' },
      { id: 'bottom', x: 80, y: 210, dir: 'down' },
      { id: 'right', x: 190, y: 105, dir: 'right' },
    ],
    glyph: `
      <path class="sym-conductor" d="M80 0 V32 M80 178 V210 M160 105 H190"/>
      <circle class="sym-ring" cx="80" cy="62" r="30"/>
      <circle class="sym-ring" cx="80" cy="148" r="30"/>
      <circle class="sym-ring" cx="130" cy="105" r="30"/>
    `,
  },
  groundingTransformer: {
    type: 'groundingTransformer',
    name: '接地变压器',
    code: 'T',
    category: 'power',
    description: 'Z 型接地变压器，为不接地系统提供中性点',
    keywords: ['接地变压器', '接地变', 'z型', 'grounding transformer'],
    width: 160,
    height: 230,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 接地变压器',
    ports: topPort(160),
    glyph: `
      <path class="sym-conductor" d="M80 0 V30"/>
      <circle class="sym-ring" cx="80" cy="60" r="30"/>
      <circle class="sym-ring" cx="80" cy="130" r="30"/>
      <path class="sym-conductor" d="M80 160 V170"/>
      <path class="sym-conductor" d="M80 170 L66 177 L94 184 L66 191 L80 198"/>
      <path class="sym-earth" d="M55 206 H105 M62 214 H98 M70 222 H90"/>
    `,
  },
  reactor: {
    type: 'reactor',
    name: '电抗器',
    code: 'L',
    category: 'power',
    description: '串联电抗器 / 限流电抗器 / 滤波电抗器',
    keywords: ['电抗器', '限流', '串联电抗', 'reactor', 'l'],
    width: 110,
    height: 150,
    labelPlacement: 'right',
    standard: 'GB/T 4728.6 · 电抗器',
    ports: verticalPorts(110, 150),
    glyph: `
      <path class="sym-conductor" d="M55 0 V40 M55 110 V150"/>
      <path class="sym-coil" d="M55 40 Q80 48 55 56 Q80 64 55 72 Q80 80 55 88 Q80 96 55 104"/>
    `,
  },
  arcSuppressionCoil: {
    type: 'arcSuppressionCoil',
    name: '消弧线圈',
    code: 'L',
    category: 'power',
    description: '消弧线圈 / 中性点接地电抗器',
    keywords: ['消弧线圈', '中性点', '接地电抗', 'arc suppression', 'l'],
    width: 130,
    height: 190,
    labelPlacement: 'right',
    standard: 'GB/T 4728.6 · 消弧线圈',
    ports: topPort(130),
    glyph: `
      <path class="sym-conductor" d="M65 0 V30"/>
      <path class="sym-coil" d="M65 30 Q90 40 65 50 Q90 60 65 70 Q90 80 65 90 Q90 100 65 110 Q90 120 65 130"/>
      <path class="sym-conductor" d="M65 130 V150"/>
      <path class="sym-earth" d="M45 150 H85 M50 157 H80 M56 164 H74 M61 171 H69"/>
    `,
  },
  capacitor: {
    type: 'capacitor',
    name: '电容器',
    code: 'C',
    category: 'power',
    description: '无功补偿电容器组',
    keywords: ['电容器', '补偿', 'capacitor', 'c'],
    width: 104,
    height: 132,
    labelPlacement: 'right',
    standard: 'GB/T 4728.6 · 电容器',
    ports: verticalPorts(104, 132),
    glyph: `
      <path class="sym-conductor" d="M52 0 V50 M52 64 V132"/>
      <path class="sym-conductor sym-plate" d="M24 50 H80 M24 64 H80"/>
    `,
  },
  capacitorBank: {
    type: 'capacitorBank',
    name: '电容器组',
    code: 'C',
    category: 'power',
    description: '三相并联电容器组，用于 6~35kV 无功补偿',
    keywords: ['电容器组', '无功补偿', '并联电容', 'capacitor bank', 'c'],
    width: 170,
    height: 140,
    labelPlacement: 'right',
    standard: 'GB/T 4728.6 · 电容器组',
    ports: [
      { id: 'top', x: 85, y: 0, dir: 'up' },
      { id: 'bottom', x: 85, y: 140, dir: 'down' },
    ],
    glyph: `
      <path class="sym-conductor" d="M85 0 V30 M85 110 V140"/>
      <path class="sym-conductor" d="M50 30 H120 M50 110 H120"/>
      <path class="sym-conductor" d="M50 30 V50 M50 62 V110 M85 30 V50 M85 62 V110 M120 30 V50 M120 62 V110"/>
      <path class="sym-conductor sym-plate" d="M40 50 H60 M40 62 H60 M75 50 H95 M75 62 H95 M110 50 H130 M110 62 H130"/>
    `,
  },

  /* ── 电源与负荷 ───────────────────────────────────────────── */

  generator: {
    type: 'generator',
    name: '发电机',
    code: 'G',
    category: 'source',
    description: '同步发电机 / 分布式电源',
    keywords: ['发电机', '电源', 'generator', 'g'],
    width: 104,
    height: 148,
    labelPlacement: 'right',
    standard: 'GB/T 4728.6 · 发电机',
    ports: topPort(104),
    glyph: `
      <path class="sym-conductor" d="M52 0 V28"/>
      <circle class="sym-ring" cx="52" cy="76" r="40"/>
      <path class="sym-wave" d="M34 67 Q39 58 44 67 T54 67 T64 67 T72 67"/>
      <text class="sym-glyph-text sym-glyph-text-small" x="52" y="92">G</text>
    `,
  },
  motor: {
    type: 'motor',
    name: '电动机',
    code: 'M',
    category: 'source',
    description: '高压 / 低压电动机负荷',
    keywords: ['电动机', '电机', 'motor', 'm'],
    width: 102,
    height: 134,
    labelPlacement: 'right',
    standard: 'GB/T 4728.6 · 电动机',
    ports: topPort(102),
    glyph: `
      <path class="sym-conductor" d="M51 0 V28"/>
      <circle class="sym-ring" cx="51" cy="68" r="38"/>
      <text class="sym-glyph-text" x="51" y="70">M</text>
    `,
  },
  cable: {
    type: 'cable',
    name: '电缆终端',
    code: 'W',
    category: 'source',
    description: '电缆进线 / 出线终端，三芯电缆表示',
    keywords: ['电缆', '终端', '出线', '进线', 'cable', 'w'],
    width: 104,
    height: 140,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 电缆终端',
    ports: topPort(104),
    glyph: `
      <path class="sym-conductor" d="M52 0 V60"/>
      <path class="sym-conductor" d="M30 60 H74"/>
      <path class="sym-conductor" d="M40 60 L34 95 M52 60 V98 M64 60 L70 95"/>
      <path class="sym-thin" d="M28 102 Q52 112 76 102"/>
    `,
  },
  cableJoint: {
    type: 'cableJoint',
    name: '电缆中间接头',
    code: 'W',
    category: 'source',
    description: '电缆中间接头 / 电缆分支接头',
    keywords: ['电缆接头', '中间接头', 'cable joint', 'w'],
    width: 150,
    height: 70,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 电缆接头',
    ports: horizontalPorts(150, 35),
    glyph: `
      <path class="sym-conductor" d="M0 35 H52 M98 35 H150"/>
      <rect class="sym-box" x="52" y="12" width="46" height="46" rx="3"/>
      <path class="sym-thin" d="M64 22 V48 M76 22 V48 M88 22 V48"/>
    `,
  },

  /* ── 二次控制 ─────────────────────────────────────────────── */

  terminal: {
    type: 'terminal',
    name: '端子',
    code: 'XT',
    category: 'secondaryControl',
    description: '接线端子 / 端子排，用于二次接线图',
    keywords: ['端子', '端子排', 'terminal', 'xt'],
    width: 100,
    height: 64,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 端子',
    ports: horizontalPorts(100, 32),
    glyph: `
      <path class="sym-conductor" d="M0 32 H29 M71 32 H100"/>
      <circle class="sym-ring" cx="50" cy="32" r="21"/>
      <path class="sym-thin" d="M43 25 L57 39"/>
    `,
  },
  terminalBlock: {
    type: 'terminalBlock',
    name: '端子排',
    code: 'XT',
    category: 'secondaryControl',
    description: '四联端子排 / 试验端子排',
    keywords: ['端子排', '端子组', 'terminal block', 'xt'],
    width: 180,
    height: 80,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 端子排',
    ports: horizontalPorts(180, 40),
    glyph: `
      <rect class="sym-box" x="20" y="12" width="140" height="56" rx="2"/>
      <path class="sym-conductor" d="M0 40 H20 M160 40 H180"/>
      <circle class="sym-ring" cx="45" cy="40" r="10"/>
      <circle class="sym-ring" cx="75" cy="40" r="10"/>
      <circle class="sym-ring" cx="105" cy="40" r="10"/>
      <circle class="sym-ring" cx="135" cy="40" r="10"/>
    `,
  },
  contactNO: {
    type: 'contactNO',
    name: '常开触点',
    code: 'KA',
    category: 'secondaryControl',
    description: '继电器 / 接触器常开辅助触点',
    keywords: ['常开', '触点', '辅助触点', 'no'],
    width: 124,
    height: 76,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 常开触点',
    ports: horizontalPorts(124, 38),
    glyph: `
      <path class="sym-conductor" d="M0 38 H40 M84 38 H124"/>
      <circle class="sym-terminal" cx="40" cy="38" r="3"/>
      <circle class="sym-terminal" cx="84" cy="38" r="3"/>
      <path class="sym-conductor" d="M40 38 L79 20"/>
    `,
  },
  contactNC: {
    type: 'contactNC',
    name: '常闭触点',
    code: 'KA',
    category: 'secondaryControl',
    description: '继电器 / 接触器常闭辅助触点',
    keywords: ['常闭', '触点', '辅助触点', 'nc'],
    width: 124,
    height: 76,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 常闭触点',
    ports: horizontalPorts(124, 38),
    glyph: `
      <path class="sym-conductor" d="M0 38 H40 M84 38 H124"/>
      <circle class="sym-terminal" cx="40" cy="38" r="3"/>
      <circle class="sym-terminal" cx="84" cy="38" r="3"/>
      <path class="sym-conductor" d="M40 38 L82 24"/>
      <path class="sym-thin" d="M78 44 L88 34"/>
    `,
  },
  contactChangeover: {
    type: 'contactChangeover',
    name: '转换触点',
    code: 'KA',
    category: 'secondaryControl',
    description: '一常开一常闭转换触点（先断后合）',
    keywords: ['转换触点', '切换触点', 'changeover', 'spdt', 'ka'],
    width: 140,
    height: 100,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 转换触点',
    ports: [
      { id: 'left', x: 0, y: 50, dir: 'left' },
      { id: 'right', x: 140, y: 30, dir: 'right' },
      { id: 'bottom', x: 96, y: 100, dir: 'down' },
    ],
    glyph: `
      <path class="sym-conductor" d="M0 50 H44 M96 30 H140 M96 74 V100"/>
      <circle class="sym-terminal" cx="44" cy="50" r="3"/>
      <circle class="sym-terminal" cx="96" cy="30" r="3"/>
      <circle class="sym-terminal" cx="96" cy="74" r="3"/>
      <path class="sym-conductor" d="M44 50 L92 34 M44 50 L92 70"/>
    `,
  },
  contactDelayNO: {
    type: 'contactDelayNO',
    name: '延时闭合常开触点',
    code: 'KT',
    category: 'secondaryControl',
    description: '通电延时闭合的常开触点',
    keywords: ['延时', '延时闭合', '时间继电器', 'delay no', 'kt'],
    width: 140,
    height: 96,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 延时触点',
    ports: horizontalPorts(140, 48),
    glyph: `
      <path class="sym-conductor" d="M0 48 H40 M84 48 H140"/>
      <circle class="sym-terminal" cx="40" cy="48" r="3"/>
      <circle class="sym-terminal" cx="84" cy="48" r="3"/>
      <path class="sym-conductor" d="M40 48 L79 30"/>
      <path class="sym-arc" d="M32 76 Q40 88 56 82"/>
    `,
  },
  contactDelayNC: {
    type: 'contactDelayNC',
    name: '延时断开常闭触点',
    code: 'KT',
    category: 'secondaryControl',
    description: '通电延时断开的常闭触点',
    keywords: ['延时', '延时断开', '时间继电器', 'delay nc', 'kt'],
    width: 140,
    height: 96,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 延时触点',
    ports: horizontalPorts(140, 48),
    glyph: `
      <path class="sym-conductor" d="M0 48 H40 M84 48 H140"/>
      <circle class="sym-terminal" cx="40" cy="48" r="3"/>
      <circle class="sym-terminal" cx="84" cy="48" r="3"/>
      <path class="sym-conductor" d="M40 48 L82 34"/>
      <path class="sym-thin" d="M78 54 L88 44"/>
      <path class="sym-arc" d="M32 76 Q40 88 56 82"/>
    `,
  },
  relayCoil: {
    type: 'relayCoil',
    name: '继电器线圈',
    code: 'K',
    category: 'secondaryControl',
    description: '中间继电器 / 接触器线圈',
    keywords: ['继电器', '线圈', 'relay', 'coil', 'k'],
    width: 120,
    height: 64,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 继电器线圈',
    ports: horizontalPorts(120, 32),
    glyph: `
      <path class="sym-conductor" d="M0 32 H30 M90 32 H120"/>
      <rect class="sym-box" x="30" y="12" width="60" height="40" rx="1"/>
      <path class="sym-conductor sym-inner" d="M42 20 L78 44"/>
    `,
  },
  timeRelayCoil: {
    type: 'timeRelayCoil',
    name: '时间继电器线圈',
    code: 'KT',
    category: 'secondaryControl',
    description: '带时钟标识的时间继电器线圈',
    keywords: ['时间继电器', '延时线圈', 'timer relay', 'kt'],
    width: 140,
    height: 80,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 时间继电器',
    ports: horizontalPorts(140, 40),
    glyph: `
      <path class="sym-conductor" d="M0 40 H30 M110 40 H140"/>
      <rect class="sym-box" x="30" y="14" width="80" height="52" rx="1"/>
      <circle class="sym-ring" cx="70" cy="40" r="17"/>
      <path class="sym-thin" d="M70 40 V29 M70 40 H79"/>
    `,
  },
  pushButtonNO: {
    type: 'pushButtonNO',
    name: '常开按钮',
    code: 'SB',
    category: 'secondaryControl',
    description: '不闭锁常开按钮（起动按钮）',
    keywords: ['按钮', '常开按钮', '起动', 'push button', 'sb'],
    width: 140,
    height: 100,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 按钮',
    ports: horizontalPorts(140, 60),
    glyph: `
      <path class="sym-conductor" d="M0 60 H40 M84 60 H140"/>
      <circle class="sym-terminal" cx="40" cy="60" r="3"/>
      <circle class="sym-terminal" cx="84" cy="60" r="3"/>
      <path class="sym-conductor" d="M40 60 L79 42"/>
      <path class="sym-thin" d="M79 42 V22 M64 22 H94"/>
    `,
  },
  pushButtonNC: {
    type: 'pushButtonNC',
    name: '常闭按钮',
    code: 'SB',
    category: 'secondaryControl',
    description: '不闭锁常闭按钮（停止按钮）',
    keywords: ['按钮', '常闭按钮', '停止', 'push button', 'sb'],
    width: 140,
    height: 100,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 按钮',
    ports: horizontalPorts(140, 60),
    glyph: `
      <path class="sym-conductor" d="M0 60 H40 M84 60 H140"/>
      <circle class="sym-terminal" cx="40" cy="60" r="3"/>
      <circle class="sym-terminal" cx="84" cy="60" r="3"/>
      <path class="sym-conductor" d="M40 60 L82 46"/>
      <path class="sym-thin" d="M78 66 L88 56 M82 46 V22 M67 22 H97"/>
    `,
  },
  emergencyStop: {
    type: 'emergencyStop',
    name: '急停按钮',
    code: 'SB',
    category: 'secondaryControl',
    description: '带蘑菇头的急停按钮，常闭并保持',
    keywords: ['急停', '蘑菇头', '紧急停止', 'emergency stop', 'sb'],
    width: 140,
    height: 110,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 急停按钮',
    ports: horizontalPorts(140, 65),
    glyph: `
      <path class="sym-conductor" d="M0 65 H40 M84 65 H140"/>
      <circle class="sym-terminal" cx="40" cy="65" r="3"/>
      <circle class="sym-terminal" cx="84" cy="65" r="3"/>
      <path class="sym-conductor" d="M40 65 L82 51"/>
      <path class="sym-thin" d="M78 71 L88 61"/>
      <path class="sym-thin" d="M82 51 V38"/>
      <path class="sym-box" d="M64 38 Q82 8 100 38 Z"/>
    `,
  },
  selectorSwitch: {
    type: 'selectorSwitch',
    name: '转换开关',
    code: 'SA',
    category: 'secondaryControl',
    description: '多位转换开关 / 控制开关',
    keywords: ['转换开关', '控制开关', 'selector', 'sa'],
    width: 160,
    height: 100,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 转换开关',
    ports: horizontalPorts(160, 50),
    glyph: `
      <path class="sym-conductor" d="M0 50 H58 M102 50 H160"/>
      <circle class="sym-terminal" cx="58" cy="50" r="3"/>
      <circle class="sym-terminal" cx="102" cy="50" r="3"/>
      <circle class="sym-ring" cx="80" cy="50" r="22"/>
      <path class="sym-conductor" d="M80 50 L96 34"/>
      <path class="sym-arrow-head" d="M90 30 L97 28 L97 36"/>
    `,
  },
  limitSwitch: {
    type: 'limitSwitch',
    name: '行程开关',
    code: 'SQ',
    category: 'secondaryControl',
    description: '机械行程开关 / 位置开关',
    keywords: ['行程开关', '位置开关', '限位', 'limit switch', 'sq'],
    width: 150,
    height: 100,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 行程开关',
    ports: horizontalPorts(150, 60),
    glyph: `
      <path class="sym-conductor" d="M0 60 H40 M84 60 H150"/>
      <circle class="sym-terminal" cx="40" cy="60" r="3"/>
      <circle class="sym-terminal" cx="84" cy="60" r="3"/>
      <path class="sym-conductor" d="M40 60 L79 42"/>
      <path class="sym-thin" d="M79 42 V30"/>
      <path class="sym-conductor" d="M68 30 L90 30 L79 12 Z"/>
    `,
  },
  pressureSwitch: {
    type: 'pressureSwitch',
    name: '压力开关',
    code: 'SP',
    category: 'secondaryControl',
    description: '压力继电器 / 气压、液压压力开关',
    keywords: ['压力开关', '压力继电器', 'pressure switch', 'sp'],
    width: 150,
    height: 110,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 压力开关',
    ports: horizontalPorts(150, 70),
    glyph: `
      <path class="sym-conductor" d="M0 70 H40 M84 70 H150"/>
      <circle class="sym-terminal" cx="40" cy="70" r="3"/>
      <circle class="sym-terminal" cx="84" cy="70" r="3"/>
      <path class="sym-conductor" d="M40 70 L79 52"/>
      <path class="sym-thin" d="M79 52 V40"/>
      <path class="sym-arc" d="M63 34 Q71 22 79 34 Q87 22 95 34"/>
    `,
  },
  temperatureSwitch: {
    type: 'temperatureSwitch',
    name: '温度开关',
    code: 'ST',
    category: 'secondaryControl',
    description: '温度继电器 / 双金属温度开关',
    keywords: ['温度开关', '温度继电器', '温控', 'temperature switch', 'st'],
    width: 150,
    height: 110,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 温度开关',
    ports: horizontalPorts(150, 70),
    glyph: `
      <path class="sym-conductor" d="M0 70 H40 M84 70 H150"/>
      <circle class="sym-terminal" cx="40" cy="70" r="3"/>
      <circle class="sym-terminal" cx="84" cy="70" r="3"/>
      <path class="sym-conductor" d="M40 70 L79 52"/>
      <path class="sym-thin" d="M79 52 V42"/>
      <path class="sym-thin" d="M64 38 Q79 18 94 38"/>
    `,
  },
  thermalRelay: {
    type: 'thermalRelay',
    name: '热继电器',
    code: 'FR',
    category: 'secondaryControl',
    description: '热过载继电器，加热元件与常闭触点联动',
    keywords: ['热继电器', '过载', '热保护', 'thermal relay', 'fr'],
    width: 170,
    height: 110,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 热继电器',
    ports: horizontalPorts(170, 55),
    glyph: `
      <path class="sym-conductor" d="M0 55 H24 M80 55 H96 M140 55 H170"/>
      <rect class="sym-box" x="24" y="33" width="56" height="44" rx="1"/>
      <path class="sym-conductor sym-inner" d="M32 55 L40 43 L48 67 L56 43 L64 67 L72 55"/>
      <circle class="sym-terminal" cx="96" cy="55" r="3"/>
      <circle class="sym-terminal" cx="140" cy="55" r="3"/>
      <path class="sym-conductor" d="M96 55 L136 37"/>
      <path class="sym-thin" d="M132 63 L142 53"/>
    `,
  },
  mcb: {
    type: 'mcb',
    name: '微型断路器',
    code: 'QF',
    category: 'secondaryControl',
    description: '二次回路空气开关 / 微型断路器',
    keywords: ['微型断路器', '空气开关', 'mcb', '二次空开', 'qf'],
    width: 140,
    height: 100,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 微型断路器',
    ports: horizontalPorts(140, 55),
    glyph: `
      <path class="sym-conductor" d="M0 55 H30 M104 55 H140"/>
      <circle class="sym-terminal" cx="30" cy="55" r="3"/>
      <circle class="sym-terminal" cx="104" cy="55" r="3"/>
      <rect class="sym-box" x="40" y="32" width="54" height="46" rx="1"/>
      <path class="sym-conductor" d="M52 55 L88 38"/>
      <path class="sym-thin" d="M67 32 V22 H83 V32"/>
      <rect class="sym-box" x="63" y="12" width="24" height="10" rx="1"/>
    `,
  },
  secondaryFuse: {
    type: 'secondaryFuse',
    name: '二次熔断器',
    code: 'FU',
    category: 'secondaryControl',
    description: '控制回路熔断器 / 熔芯',
    keywords: ['熔断器', '熔芯', '二次熔断', 'fuse', 'fu'],
    width: 140,
    height: 70,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 熔断器',
    ports: horizontalPorts(140, 35),
    glyph: `
      <path class="sym-conductor" d="M0 35 H40 M100 35 H140"/>
      <rect class="sym-box" x="40" y="20" width="60" height="30" rx="1"/>
      <path class="sym-conductor sym-inner" d="M40 35 H100"/>
    `,
  },
  link: {
    type: 'link',
    name: '连接片 / 压板',
    code: 'XB',
    category: 'secondaryControl',
    description: '二次回路连接片、试验压板或短接片',
    keywords: ['连接片', '压板', '短接片', 'link', 'xb'],
    width: 130,
    height: 70,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 连接片',
    ports: horizontalPorts(130, 35),
    glyph: `
      <path class="sym-conductor" d="M0 35 H35 M95 35 H130"/>
      <circle class="sym-terminal" cx="35" cy="35" r="3"/>
      <circle class="sym-terminal" cx="95" cy="35" r="3"/>
      <path class="sym-conductor" d="M35 35 L95 25"/>
      <path class="sym-thin" d="M60 40 H70"/>
    `,
  },
  plug: {
    type: 'plug',
    name: '插接件',
    code: 'XS',
    category: 'secondaryControl',
    description: '插头 / 插座 / 插接式端子',
    keywords: ['插接件', '插头', '插座', 'plug', 'xs'],
    width: 140,
    height: 90,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 插接件',
    ports: horizontalPorts(140, 45),
    glyph: `
      <path class="sym-conductor" d="M0 45 H30 M110 45 H140"/>
      <rect class="sym-box" x="30" y="20" width="44" height="50" rx="3"/>
      <rect class="sym-box" x="84" y="26" width="26" height="38" rx="2"/>
      <path class="sym-conductor" d="M74 35 H84 M74 55 H84"/>
    `,
  },

  /* ── 二次测量 ─────────────────────────────────────────────── */

  signalLamp: {
    type: 'signalLamp',
    name: '信号灯',
    code: 'HL',
    category: 'secondaryMeasure',
    description: '指示灯 / 位置指示灯 / 状态信号灯',
    keywords: ['信号灯', '指示灯', 'lamp', 'hl'],
    width: 110,
    height: 90,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 信号灯',
    ports: horizontalPorts(110, 45),
    glyph: `
      <path class="sym-conductor" d="M0 45 H25 M85 45 H110"/>
      <circle class="sym-ring" cx="55" cy="45" r="30"/>
      <path class="sym-thin" d="M34 24 L76 66 M76 24 L34 66"/>
    `,
  },
  buzzer: {
    type: 'buzzer',
    name: '蜂鸣器',
    code: 'HA',
    category: 'secondaryMeasure',
    description: '蜂鸣器 / 电铃 / 音响信号',
    keywords: ['蜂鸣器', '电铃', '音响', 'buzzer', 'ha'],
    width: 110,
    height: 100,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 蜂鸣器',
    ports: horizontalPorts(110, 50),
    glyph: `
      <path class="sym-conductor" d="M0 50 H25 M85 50 H110"/>
      <path class="sym-conductor" d="M25 30 A25 25 0 0 1 25 70 Z"/>
      <path class="sym-arc" d="M58 38 Q68 50 58 62 M68 30 Q82 50 68 70"/>
    `,
  },
  resistor: {
    type: 'resistor',
    name: '电阻器',
    code: 'R',
    category: 'secondaryMeasure',
    description: '固定电阻器',
    keywords: ['电阻', '电阻器', 'resistor', 'r'],
    width: 140,
    height: 60,
    labelPlacement: 'right',
    standard: 'GB/T 4728.4 · 电阻器',
    ports: horizontalPorts(140, 30),
    glyph: `
      <path class="sym-conductor" d="M0 30 H40 M100 30 H140"/>
      <rect class="sym-box" x="40" y="16" width="60" height="28" rx="1"/>
    `,
  },
  variableResistor: {
    type: 'variableResistor',
    name: '可变电阻器',
    code: 'RP',
    category: 'secondaryMeasure',
    description: '可调电阻 / 滑线电阻',
    keywords: ['可变电阻', '可调电阻', '滑动电阻', 'rheostat', 'rp'],
    width: 150,
    height: 80,
    labelPlacement: 'right',
    standard: 'GB/T 4728.4 · 可变电阻器',
    ports: horizontalPorts(150, 40),
    glyph: `
      <path class="sym-conductor" d="M0 40 H35 M105 40 H150"/>
      <rect class="sym-box" x="35" y="26" width="70" height="28" rx="1"/>
      <path class="sym-thin" d="M55 66 L95 14"/>
      <path class="sym-arrow-head" d="M88 18 L96 13 L94 22"/>
    `,
  },
  potentiometer: {
    type: 'potentiometer',
    name: '电位器',
    code: 'RP',
    category: 'secondaryMeasure',
    description: '三端电位器 / 分压器',
    keywords: ['电位器', '分压器', 'potentiometer', 'rp'],
    width: 150,
    height: 110,
    labelPlacement: 'right',
    standard: 'GB/T 4728.4 · 电位器',
    ports: [
      { id: 'left', x: 0, y: 70, dir: 'left' },
      { id: 'right', x: 150, y: 70, dir: 'right' },
      { id: 'top', x: 75, y: 0, dir: 'up' },
    ],
    glyph: `
      <path class="sym-conductor" d="M0 70 H35 M105 70 H150 M75 0 V24"/>
      <rect class="sym-box" x="35" y="56" width="70" height="28" rx="1"/>
      <path class="sym-thin" d="M75 24 V52"/>
      <path class="sym-arrow-head" d="M69 44 L75 52 L81 44"/>
    `,
  },
  diode: {
    type: 'diode',
    name: '二极管',
    code: 'V',
    category: 'secondaryMeasure',
    description: '半导体二极管 / 整流二极管',
    keywords: ['二极管', '整流', 'diode', 'v'],
    width: 130,
    height: 70,
    labelPlacement: 'right',
    standard: 'GB/T 4728.5 · 二极管',
    ports: horizontalPorts(130, 35),
    glyph: `
      <path class="sym-conductor" d="M0 35 H50 M80 35 H130"/>
      <path class="sym-conductor" d="M50 15 L50 55 L80 35 Z"/>
      <path class="sym-conductor" d="M80 15 V55"/>
    `,
  },
  led: {
    type: 'led',
    name: '发光二极管',
    code: 'VL',
    category: 'secondaryMeasure',
    description: '发光二极管 / 状态指示 LED',
    keywords: ['发光二极管', 'led', '指示灯', 'vl'],
    width: 130,
    height: 100,
    labelPlacement: 'right',
    standard: 'GB/T 4728.5 · 发光二极管',
    ports: horizontalPorts(130, 50),
    glyph: `
      <path class="sym-conductor" d="M0 50 H50 M80 50 H130"/>
      <path class="sym-conductor" d="M50 30 L50 70 L80 50 Z"/>
      <path class="sym-conductor" d="M80 30 V70"/>
      <path class="sym-thin" d="M88 28 L100 16 M96 18 L101 14 L101 20 M94 40 L106 28 M102 30 L107 26 L107 32"/>
    `,
  },
  thyristor: {
    type: 'thyristor',
    name: '晶闸管',
    code: 'V',
    category: 'secondaryMeasure',
    description: '可控硅 / 晶闸管，带门极触发',
    keywords: ['晶闸管', '可控硅', 'thyristor', 'scr', 'v'],
    width: 130,
    height: 100,
    labelPlacement: 'right',
    standard: 'GB/T 4728.5 · 晶闸管',
    ports: [
      { id: 'left', x: 0, y: 50, dir: 'left' },
      { id: 'right', x: 130, y: 50, dir: 'right' },
      { id: 'bottom', x: 80, y: 100, dir: 'down' },
    ],
    glyph: `
      <path class="sym-conductor" d="M0 50 H50 M80 50 H130"/>
      <path class="sym-conductor" d="M50 30 L50 70 L80 50 Z"/>
      <path class="sym-conductor" d="M80 30 V70"/>
      <path class="sym-thin" d="M80 60 V100 M80 60 L92 70"/>
    `,
  },
  capacitorSecondary: {
    type: 'capacitorSecondary',
    name: '电容器（二次）',
    code: 'C',
    category: 'secondaryMeasure',
    description: '二次回路电容 / 滤波电容',
    keywords: ['电容', '电容器', '滤波', 'capacitor', 'c'],
    width: 130,
    height: 70,
    labelPlacement: 'right',
    standard: 'GB/T 4728.4 · 电容器',
    ports: horizontalPorts(130, 35),
    glyph: `
      <path class="sym-conductor" d="M0 35 H55 M75 35 H130"/>
      <path class="sym-conductor sym-plate" d="M55 15 V55 M75 15 V55"/>
    `,
  },
  inductor: {
    type: 'inductor',
    name: '电感线圈',
    code: 'L',
    category: 'secondaryMeasure',
    description: '二次电感 / 滤波扼流圈',
    keywords: ['电感', '线圈', '扼流圈', 'inductor', 'choke', 'l'],
    width: 140,
    height: 70,
    labelPlacement: 'right',
    standard: 'GB/T 4728.4 · 电感器',
    ports: horizontalPorts(140, 35),
    glyph: `
      <path class="sym-conductor" d="M0 35 H20 M117 35 H140"/>
      <path class="sym-coil" d="M20 35 Q27 15 34 35 Q41 15 48 35 Q55 15 62 35 Q69 15 76 35 Q83 15 90 35 Q97 15 104 35 Q111 15 117 35"/>
    `,
  },
  varistor: {
    type: 'varistor',
    name: '压敏电阻',
    code: 'RV',
    category: 'secondaryMeasure',
    description: '金属氧化物压敏电阻 / 浪涌抑制',
    keywords: ['压敏电阻', 'mov', '浪涌', 'varistor', 'rv'],
    width: 150,
    height: 80,
    labelPlacement: 'right',
    standard: 'GB/T 4728.5 · 压敏电阻',
    ports: horizontalPorts(150, 40),
    glyph: `
      <path class="sym-conductor" d="M0 40 H35 M105 40 H150"/>
      <rect class="sym-box" x="35" y="26" width="70" height="28" rx="1"/>
      <text class="sym-glyph-text sym-glyph-text-small" x="70" y="41">U</text>
      <path class="sym-thin" d="M50 66 L100 14"/>
      <path class="sym-arrow-head" d="M93 18 L101 13 L99 22"/>
    `,
  },
  ammeter: {
    type: 'ammeter',
    name: '电流表',
    code: 'PA',
    category: 'secondaryMeasure',
    description: '电流测量仪表',
    keywords: ['电流表', '仪表', 'ammeter', 'pa'],
    width: 110,
    height: 90,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 测量仪表',
    ports: meterPorts,
    glyph: meterGlyph('A'),
  },
  voltmeter: {
    type: 'voltmeter',
    name: '电压表',
    code: 'PV',
    category: 'secondaryMeasure',
    description: '电压测量仪表',
    keywords: ['电压表', '仪表', 'voltmeter', 'pv'],
    width: 110,
    height: 90,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 测量仪表',
    ports: meterPorts,
    glyph: meterGlyph('V'),
  },
  wattmeter: {
    type: 'wattmeter',
    name: '功率表',
    code: 'PW',
    category: 'secondaryMeasure',
    description: '有功功率测量仪表',
    keywords: ['功率表', '有功', '仪表', 'wattmeter', 'pw'],
    width: 110,
    height: 90,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 测量仪表',
    ports: meterPorts,
    glyph: meterGlyph('W'),
  },
  energyMeter: {
    type: 'energyMeter',
    name: '电能表',
    code: 'PJ',
    category: 'secondaryMeasure',
    description: '有功电能表 / 计量表计',
    keywords: ['电能表', '电度表', '计量', 'energy meter', 'kwh', 'pj'],
    width: 110,
    height: 90,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 测量仪表',
    ports: meterPorts,
    glyph: meterGlyph('kWh', true),
  },
  frequencyMeter: {
    type: 'frequencyMeter',
    name: '频率表',
    code: 'PF',
    category: 'secondaryMeasure',
    description: '频率测量仪表',
    keywords: ['频率表', '频率', '仪表', 'frequency meter', 'hz', 'pf'],
    width: 110,
    height: 90,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 测量仪表',
    ports: meterPorts,
    glyph: meterGlyph('Hz', true),
  },
  powerFactorMeter: {
    type: 'powerFactorMeter',
    name: '功率因数表',
    code: 'PPF',
    category: 'secondaryMeasure',
    description: '功率因数测量仪表',
    keywords: ['功率因数表', '功率因数', 'cos', 'power factor', 'ppf'],
    width: 110,
    height: 90,
    labelPlacement: 'right',
    standard: 'GB/T 4728.7 · 测量仪表',
    ports: meterPorts,
    glyph: meterGlyph('cosφ', true),
  },

  /* ── 辅助标注 ─────────────────────────────────────────────── */

  junction: {
    type: 'junction',
    name: '连接点',
    code: 'J',
    category: 'annotation',
    description: '导线分支连接点 / T 接点',
    keywords: ['连接点', '节点', '分支', 'junction'],
    width: 28,
    height: 28,
    labelPlacement: 'none',
    standard: 'GB/T 4728.2 · 连接点',
    ports: [
      { id: 'top', x: 14, y: 0, dir: 'up' },
      { id: 'right', x: 28, y: 14, dir: 'right' },
      { id: 'bottom', x: 14, y: 28, dir: 'down' },
      { id: 'left', x: 0, y: 14, dir: 'left' },
    ],
    glyph: `<circle class="sym-junction-dot" cx="14" cy="14" r="5.5"/>`,
  },
  text: {
    type: 'text',
    name: '文字标注',
    code: 'TXT',
    category: 'annotation',
    description: '说明文字、柜号或间隔标注',
    keywords: ['文字', '标注', '说明', 'text'],
    width: 260,
    height: 48,
    labelPlacement: 'center',
    standard: '注释',
    portMode: 'none',
    ports: [],
    glyph: '',
  },
  ground: {
    type: 'ground',
    name: '接地符号',
    code: 'PE',
    category: 'annotation',
    description: '保护接地 / 工作接地参考点',
    keywords: ['接地', '地线', 'pe', 'ground', 'earth'],
    width: 100,
    height: 90,
    labelPlacement: 'right',
    standard: 'GB/T 4728.2 · 接地',
    ports: topPort(100),
    glyph: `
      <path class="sym-conductor" d="M50 0 V40"/>
      <path class="sym-earth" d="M20 40 H80 M28 49 H72 M36 58 H64 M44 67 H56"/>
    `,
  },
  cabinet: {
    type: 'cabinet',
    name: '柜体边框',
    code: 'CAB',
    category: 'annotation',
    description: '开关柜 / 控制柜外框，用于划分柜体与间隔区域',
    keywords: ['柜体', '开关柜', '边框', 'cabinet', 'panel'],
    width: 300,
    height: 400,
    labelPlacement: 'top-left',
    standard: '制图约定 · 柜体分区',
    portMode: 'none',
    ports: [],
    glyph: `
      <rect class="sym-dashed" x="1" y="1" width="298" height="398" rx="4"/>
      <rect class="sym-thin" x="20" y="20" width="260" height="360" rx="2"/>
      <path class="sym-thin" d="M20 76 H280 M20 324 H280"/>
    `,
  },
}

const BUS_SYMBOLS: SymbolType[] = ['busbar', 'busbarSection', 'genericBar']

const LV_SYMBOLS: SymbolType[] = [
  'lvIncoming',
  'lvOutgoing',
  'drawoutContact',
  'drawoutLeft',
  'drawoutRight',
  'ctGroup',
  'flowArrow',
  'flowArrowLeft',
  'systemBreaker',
  'acb',
  'mccb',
  'rcbo',
  'spd',
  'busway',
]

const SWITCHGEAR_SYMBOLS: SymbolType[] = [
  'breaker',
  'drawoutBreaker',
  'loadSwitch',
  'disconnector',
  'earthingSwitch',
  'threePositionSwitch',
  'fuse',
  'switchFuse',
  'contactor',
  'ats',
  'arrester',
]

const INSTRUMENT_SYMBOLS: SymbolType[] = ['ct', 'pt', 'zeroSeqCT']

const POWER_SYMBOLS: SymbolType[] = [
  'transformer',
  'transformer3w',
  'groundingTransformer',
  'reactor',
  'arcSuppressionCoil',
  'capacitor',
  'capacitorBank',
]

const SOURCE_SYMBOLS: SymbolType[] = ['generator', 'motor', 'cable', 'cableJoint']

const SECONDARY_CONTROL_SYMBOLS: SymbolType[] = [
  'terminal',
  'terminalBlock',
  'contactNO',
  'contactNC',
  'contactChangeover',
  'contactDelayNO',
  'contactDelayNC',
  'relayCoil',
  'timeRelayCoil',
  'pushButtonNO',
  'pushButtonNC',
  'emergencyStop',
  'selectorSwitch',
  'limitSwitch',
  'pressureSwitch',
  'temperatureSwitch',
  'thermalRelay',
  'mcb',
  'secondaryFuse',
  'link',
  'plug',
]

const SECONDARY_MEASURE_SYMBOLS: SymbolType[] = [
  'signalLamp',
  'buzzer',
  'resistor',
  'variableResistor',
  'potentiometer',
  'diode',
  'led',
  'thyristor',
  'capacitorSecondary',
  'inductor',
  'varistor',
  'ammeter',
  'voltmeter',
  'wattmeter',
  'energyMeter',
  'frequencyMeter',
  'powerFactorMeter',
]

const ANNOTATION_SYMBOLS: SymbolType[] = ['junction', 'text', 'ground', 'cabinet']

export const SYMBOL_CATEGORIES = [
  { key: 'bus', name: '母线与线路', symbols: BUS_SYMBOLS },
  { key: 'lv', name: '低压配电系统', symbols: LV_SYMBOLS },
  { key: 'switchgear', name: '开关与保护', symbols: SWITCHGEAR_SYMBOLS },
  { key: 'instrument', name: '互感器', symbols: INSTRUMENT_SYMBOLS },
  { key: 'power', name: '变压与补偿', symbols: POWER_SYMBOLS },
  { key: 'source', name: '电源与负荷', symbols: SOURCE_SYMBOLS },
  { key: 'secondaryControl', name: '二次控制', symbols: SECONDARY_CONTROL_SYMBOLS },
  { key: 'secondaryMeasure', name: '二次测量', symbols: SECONDARY_MEASURE_SYMBOLS },
  { key: 'annotation', name: '辅助标注', symbols: ANNOTATION_SYMBOLS },
] as const

export const getSymbol = (type: SymbolType): SymbolDef => SYMBOLS[type]
