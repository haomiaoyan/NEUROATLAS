/** 数据出处注册表（D7）。
    硬规则：页面出现的每一个数字都必须从这里取，每条必带 source。
    kind = 'literature'（文献/机构可溯源）| 'illustrative'（教学示意，无单篇文献）。 */

export interface SourceRef {
  /** 来源名：作者/机构/文献名 */
  name: string;
  year?: string;
  kind: 'literature' | 'illustrative';
}

export interface Fact {
  id: string;
  /** 页面显示值 */
  value: string;
  /** 中文含义 */
  label: string;
  /** 可选的进视口数字滚动配置（B7） */
  count?: { value: number; unit?: string; prefix?: string };
  source: SourceRef;
}

export const FACTS: Fact[] = [
  {
    id: 'neuron-count',
    value: '86,000,000,000',
    label: '人脑神经元总数（约 860 亿）',
    source: { name: 'Azevedo et al., J Comp Neurol', year: '2009', kind: 'literature' },
  },
  {
    id: 'cortex-neurons',
    value: '160 亿',
    label: '大脑皮层神经元数量',
    count: { value: 160, unit: ' 亿' },
    source: { name: 'Azevedo et al., J Comp Neurol', year: '2009', kind: 'literature' },
  },
  {
    id: 'synapses-per-neuron',
    value: '约 7,000',
    label: '单个神经元平均突触连接数',
    count: { value: 7000, prefix: '约 ' },
    source: { name: '神经科学教科书通行估计', kind: 'illustrative' },
  },
  {
    id: 'synapse-total',
    value: '百万亿量级',
    label: '全脑突触连接总数',
    source: { name: '量级估算，无单篇文献可精确给出', kind: 'illustrative' },
  },
  {
    id: 'brain-energy',
    value: '20%',
    label: '大脑耗能占全身比例（重量仅约 2%）',
    count: { value: 20, unit: '%' },
    source: { name: 'Raichle & Gusnard, PNAS', year: '2002', kind: 'literature' },
  },
  {
    id: 'action-potential-values',
    value: '-70 / -55 / +30 mV',
    label: '静息电位、发射阈值与动作电位峰值（教科书通行值）',
    source: { name: 'Kandel, Principles of Neural Science, 5th ed.', kind: 'literature' },
  },
  {
    id: 'signal-speed',
    value: '120 m/s',
    label: '有髓轴突最高传导速度',
    source: { name: '神经科学教科书通行值', kind: 'illustrative' },
  },
  {
    id: 'hm-case',
    value: '1953',
    label: '患者 H.M. 接受双侧海马切除，术后无法形成新的长期记忆',
    source: { name: 'Scoville & Milner, J Neurol Neurosurg Psychiatry', year: '1957', kind: 'literature' },
  },
  {
    id: 'ltp',
    value: '1973',
    label: '长时程增强（LTP）首次报道——突触可塑性的细胞机制',
    source: { name: 'Bliss & Lømo, J Physiol', year: '1973', kind: 'literature' },
  },
  /* B7 补齐：此前散落在正文、未注册的数字 */
  {
    id: 'cortex-thickness',
    value: '2 毫米',
    label: '大脑皮层厚度',
    source: { name: '神经科学教科书通行值', kind: 'illustrative' },
  },
  {
    id: 'synaptic-cleft',
    value: '20-40 纳米',
    label: '突触间隙宽度',
    source: { name: '神经科学教科书通行值', kind: 'illustrative' },
  },
  {
    id: 'action-potential-duration',
    value: '约 1 毫秒',
    label: '一次动作电位的时程',
    source: { name: 'Kandel, Principles of Neural Science, 5th ed.', kind: 'literature' },
  },
  /* B7 尺度轴的四个时间尺度 */
  {
    id: 'thought-duration',
    value: '约 0.1 秒',
    label: '一次简单识别（一个念头）的时间量级',
    source: { name: '量级描述，教学示意', kind: 'illustrative' },
  },
  {
    id: 'memory-consolidation',
    value: '一次睡眠',
    label: '海马体向皮层转写记忆的时间窗',
    source: { name: '教学示意（具体机制仍是活跃研究领域）', kind: 'illustrative' },
  },
  {
    id: 'memory-lifetime',
    value: '一生',
    label: '长期记忆可保持的时间跨度',
    source: { name: '教学示意（定性描述）', kind: 'illustrative' },
  },
];

export function getFact(id: string): Fact {
  const fact = FACTS.find((f) => f.id === id);
  if (!fact) throw new Error(`sources.ts 中不存在数据条目: ${id}`);
  return fact;
}
