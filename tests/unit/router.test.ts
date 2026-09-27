import { describe, test, expect } from 'vitest';
import { classifyIntent, extractJurisdiction, IntentType } from '../../src/core/router';

describe('Intent Router', () => {
  test('classifies "新建项目" as NEW_PROJECT', () => {
    const result = classifyIntent('我有个想法，想申请一个区块链支付的专利');
    expect(result.type).toBe(IntentType.NEW_PROJECT);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test('classifies "检索现有技术" as SEARCH', () => {
    const result = classifyIntent('帮我检索一下区块链支付相关的现有技术');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test('classifies "写交底书" as DRAFT', () => {
    const result = classifyIntent('帮我写交底书');
    expect(result.type).toBe(IntentType.DRAFT);
  });

  test('classifies "审核" as REVIEW', () => {
    const result = classifyIntent('审核一下这个交底书写得怎么样');
    expect(result.type).toBe(IntentType.REVIEW);
  });

  test('classifies ambiguous input as CONTINUE_WORKFLOW', () => {
    const result = classifyIntent('继续');
    expect(result.type).toBe(IntentType.CONTINUE_WORKFLOW);
  });

  test('extracts topic from NEW_PROJECT intent', () => {
    const result = classifyIntent('我有个基于零知识证明的隐私计算方案');
    expect(result.type).toBe(IntentType.NEW_PROJECT);
    expect(result.extracted?.topic).toContain('零知识证明');
  });

  test('extracts query from SEARCH intent (Chinese)', () => {
    const result = classifyIntent('检索区块链支付相关专利');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.query).toBeTruthy();
    expect(result.extracted!.query!.length).toBeGreaterThan(0);
  });

  test('extracts query from SEARCH intent (English)', () => {
    const result = classifyIntent('search for federated learning patents');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.query).toBeTruthy();
  });

  test('extracts scope from SEARCH intent', () => {
    const result = classifyIntent('检索近3年零知识证明专利');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.scope).toBe('3years');
  });

  test('extracts jurisdiction CN from SEARCH intent', () => {
    const result = classifyIntent('检索国内同态加密专利');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.jurisdiction).toBe('CN');
  });

  test('extracts jurisdiction US from SEARCH intent', () => {
    const result = classifyIntent('search for US patents on homomorphic encryption');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.jurisdiction).toBe('US');
  });

  test('extracts query without scope/jurisdiction when not specified', () => {
    const result = classifyIntent('检索区块链专利');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.query).toBeTruthy();
    expect(result.extracted?.scope).toBeUndefined();
    expect(result.extracted?.jurisdiction).toBeUndefined();
  });

  test('classifies 补检 as SEARCH intent', () => {
    const result = classifyIntent('补检同态加密相关专利');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.query).toBeTruthy();
  });

  test('extracts multiple parameters from complex SEARCH', () => {
    const result = classifyIntent('检索近5年国内联邦学习差分隐私专利');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.query).toBeTruthy();
    expect(result.extracted?.scope).toBe('5years');
    expect(result.extracted?.jurisdiction).toBe('CN');
  });

  test('REQ-017: EP keyword is recognized but not emitted (unsupported)', () => {
    const result = classifyIntent('检索欧洲同态加密专利');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.query).toBeTruthy();
    expect(result.extracted?.jurisdiction).toBeUndefined();
  });

  test('REQ-017: JP keyword is recognized but not emitted (unsupported)', () => {
    const result = classifyIntent('检索日本量子纠错专利');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.query).toBeTruthy();
    expect(result.extracted?.jurisdiction).toBeUndefined();
  });

  test('REQ-017: EP falls through to supported PCT when both keywords present', () => {
    const result = classifyIntent('检索欧洲PCT专利');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.jurisdiction).toBe('PCT');
  });

  test('does not treat Latin codes as substrings (useful/user/keep)', () => {
    expect(classifyIntent('检索 useful encryption 专利').extracted?.jurisdiction).toBeUndefined();
    expect(classifyIntent('search for user authentication patents').extracted?.jurisdiction).toBeUndefined();
    expect(classifyIntent('search US patents on homomorphic encryption').extracted?.jurisdiction).toBe('US');
    // EP/JP are recognized and then dropped (REQ-017). Assert the recognition
    // itself so a substring match cannot hide behind that drop.
    expect(extractJurisdiction('please keep the draft')).toBeUndefined();
    expect(extractJurisdiction('EP only')).toBeUndefined();
    expect(extractJurisdiction('检索欧洲专利')).toBeUndefined();
    expect(extractJurisdiction('a useful approach')).toBeUndefined();
    expect(extractJurisdiction('file in the US')).toBe('US');
  });

  test('REQ-017: extracts jurisdiction PCT', () => {
    const result = classifyIntent('检索国际量子密钥分发专利');
    expect(result.type).toBe(IntentType.SEARCH);
    expect(result.extracted?.jurisdiction).toBe('PCT');
  });
});
