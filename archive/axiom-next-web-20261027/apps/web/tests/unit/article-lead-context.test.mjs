import assert from "node:assert/strict";
import test from "node:test";
import {
  getArticleConversionContext,
  getArticleLeadContext,
} from "../../app/clanky/articleLeadContext.ts";

const mortgage = { intent: "housing", topic: "mortgage" };
const refixation = { intent: "housing", topic: "mortgage-refixation" };
const income = { intent: "protection", topic: "income-protection" };
const investments = { intent: "future", topic: "investments" };
const postWith = (...blocks) => ({ sections: [{ blocks }] });

test("a general mortgage invitation does not assume an expiring fixation", () => {
  assert.deepEqual(getArticleLeadContext({ topic: "Hypotéka & bydlení" }), mortgage);
  assert.deepEqual(getArticleLeadContext({ fallbackTopic: "Hypotéka & bydlení" }), mortgage);
  assert.equal(getArticleLeadContext({}), undefined);
  assert.equal(getArticleConversionContext(postWith({ type: "nextAction" })), undefined);
});

test("an explicit conversion preserves its precise consultation topic", () => {
  for (const [conversionId, expected] of [
    ["fixace-hypoteky", refixation],
    ["zajisteni-prijmu", income],
    ["investicni-chaos", investments],
    ["zdrazovani-pojisteni", { intent: "protection", topic: "property-insurance" }],
  ]) {
    assert.deepEqual(getArticleLeadContext({ conversionId }), expected);
  }
});

test("financial planning retains its known topic while a specific consultation still takes priority", () => {
  const plan = { intent: "overview", topic: "financial-plan" };
  assert.deepEqual(getArticleLeadContext({ topic: "Finanční plán" }), plan);
  assert.deepEqual(getArticleLeadContext({ fallbackTopic: "Finanční plán" }), plan);
  assert.deepEqual(getArticleLeadContext({
    topic: "Finanční plán",
    conversionId: "fixace-hypoteky",
  }), refixation);
  assert.deepEqual(getArticleLeadContext({ fallbackTopic: "Finanční plán", inheritedContext: income }), income);
});

test("the author can inherit fixation from a checklist action without a screening or final action", () => {
  const post = postWith(
    { type: "lead", text: "A mortgage article" },
    { type: "checklist", action: { conversionId: "fixace-hypoteky" } },
  );
  const original = structuredClone(post);
  const inheritedContext = getArticleConversionContext(post);
  assert.deepEqual(inheritedContext, refixation);
  assert.deepEqual(getArticleLeadContext({ fallbackTopic: "Hypotéka & bydlení", inheritedContext }), refixation);
  assert.deepEqual(post, original);
});

test("repeated matching conversions agree but conflicting conversions never pick the first", () => {
  const action = { type: "nextAction", conversionId: "fixace-hypoteky" };
  const tool = { type: "interactiveTool", conversionId: "fixace-hypoteky" };
  assert.deepEqual(getArticleConversionContext(postWith(action, tool)), refixation);
  const conflicting = { type: "checklist", action: { conversionId: "investicni-chaos" } };
  for (const blocks of [[action, tool, conflicting], [conflicting, tool, action]]) {
    const inheritedContext = getArticleConversionContext(postWith(...blocks));
    assert.equal(inheritedContext, undefined);
    assert.deepEqual(getArticleLeadContext({ fallbackTopic: "Hypotéka & bydlení", inheritedContext }), mortgage);
  }
});

test("the specific action overrides inherited article context and broad topics", () => {
  assert.deepEqual(getArticleLeadContext({
    conversionId: "zajisteni-prijmu",
    topic: "Investice a spoření",
    fallbackTopic: "Hypotéka & bydlení",
    inheritedContext: refixation,
  }), income);
  assert.deepEqual(getArticleLeadContext({ topic: "Investice a spoření", inheritedContext: refixation }), investments);
  assert.deepEqual(getArticleLeadContext({ topic: "Ochrana majetku", inheritedContext: income }),
    { intent: "protection", topic: "property-insurance" });
  assert.deepEqual(getArticleLeadContext({ topic: "Hypotéka & bydlení", inheritedContext: refixation }), refixation);
  assert.deepEqual(getArticleLeadContext({ fallbackTopic: "Ochrana majetku", inheritedContext: income }), income);
});

test("unknown conversion IDs neither invent fixation nor block a known inherited consultation", () => {
  for (const conversionId of [undefined, "unknown-conversion", "__proto__", "constructor"]) {
    assert.deepEqual(getArticleLeadContext({ conversionId, fallbackTopic: "Hypotéka & bydlení" }), mortgage);
    assert.deepEqual(getArticleLeadContext({ conversionId, inheritedContext: income }), income);
    assert.equal(getArticleConversionContext(postWith({ type: "nextAction", conversionId })), undefined);
  }
});

test("legacy flow conversions share the same agreement and conflict rules as semantic actions", () => {
  const post = {
    ...postWith({ type: "nextAction", conversionId: "fixace-hypoteky" }),
    articleFlow: { screening: { conversionId: "fixace-hypoteky" } },
  };
  assert.deepEqual(getArticleConversionContext(post), refixation);
  post.articleFlow.finalCta = { conversionId: "zajisteni-prijmu" };
  assert.equal(getArticleConversionContext(post), undefined);
});
