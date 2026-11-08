# 内容出处系统（数据类内容站的诚实性底线）

适用于任何页面出现具体数字、机制说明或医学/科学结论的场景。核心是：**每个数字要么有文献，要么明确标成教学示意，不能含糊。**

## 结构

```
src/data/sources.ts        全站数字的唯一来源，TS 类型强制 source 字段
tests/sources.test.ts      构建期校验（vitest）
页面组件                   从注册表取数 getFact(id)，不散落硬编码
```

## 数据形状

```ts
export type FactSource =
  | { kind: 'literature'; name: string; url?: string }   // 有文献背书
  | { kind: 'illustrative'; name: string; reason: string }; // 教学示意，必须写理由

export interface Fact {
  id: string;
  value: string;
  label: string;
  source: FactSource;
}
```

`illustrative` 强制带 `reason`——这是整个系统最有用的一条：**逼你说清「为什么这个数字没有出处」**。

## 三条测试（缺一不可）

```ts
it('每个条目字段完整且非空', () => {
  for (const f of FACTS) {
    expect(f.value, `${f.id}: value`).toBeTruthy();
    expect(f.label, `${f.id}: label`).toBeTruthy();
    expect(['literature', 'illustrative']).toContain(f.source.kind);
  }
});

it('id 无重复', () => {
  const ids = FACTS.map((f) => f.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it('文献值与教学示意同时存在', () => {
  expect(FACTS.some((f) => f.source.kind === 'literature')).toBe(true);
  expect(FACTS.some((f) => f.source.kind === 'illustrative')).toBe(true);
});
```

第三条是诚实性底线：**如果全站都是 literature，说明你在给示意内容硬凑出处；如果全是 illustrative，说明你没查文献。** 两者必须同时存在。

## 页面呈现

- 出处可以行内标注，也可以集中在文末「参考资料」区块（按用户偏好）
- 文献给全引用（作者/年份/期刊/链接），示意标「教学示意（理由）」
- **没有单篇文献能背书的通行值，老实降级为教学示意，不假装有出处**——例如「人脑约 7000 个突触连接」这类量级估算，学界无统一出处
- 边界声明（这是什么 / 不是什么 / 非医疗建议）放显眼位置，不要塞进小字

## 验收

```js
record('source-honesty',
  bodyText.includes('教学示意') && Boolean(document.querySelector('.outro__refs')),
  '「教学示意」标识与文末「参考资料」区块均存在');
```

只验存在性就够——具体条目对不对由单元测试管，运行时只验「该出现的标签没丢」。
