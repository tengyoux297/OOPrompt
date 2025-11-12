# GPT Assistant Call Performance Optimization Guide

## 🎯 Current Issues

Your app makes multiple GPT assistant calls in series with these performance bottlenecks:

1. **Fixed 1-second polling intervals** - Waits 1000ms between every status check
2. **No parallelization** - Calls execute one after another
3. **No request optimization** - Each call makes multiple sequential API requests
4. **No caching** - Identical requests are repeated

## ⚡ Optimization Strategies

### 1. Faster Polling with Exponential Backoff

**Current**: Fixed 1000ms delay
```typescript
await new Promise(resolve => setTimeout(resolve, 1000)); // Always 1 second
```

**Optimized**: Start fast, increase gradually
```typescript
// Start at 250ms, increase to max 2000ms
let delay = 250;
while (status === 'queued' || status === 'in_progress') {
  await new Promise(resolve => setTimeout(resolve, delay));
  delay = Math.min(delay * 1.5, 2000); // Exponential backoff
  // Check status...
}
```

**Time Saved**: ~50-70% faster for typical responses (2-5 seconds → 1-2 seconds)

### 2. Parallel Execution

**Current**: Sequential calls
```typescript
const result1 = await assistant1();
const result2 = await assistant2(); // Waits for result1
const result3 = await assistant3(); // Waits for result2
```

**Optimized**: Parallel calls
```typescript
const [result1, result2, result3] = await Promise.all([
  assistant1(),
  assistant2(),
  assistant3()
]);
```

**Time Saved**: If 3 calls take 3s each → 9s total → 3s total (66% faster)

### 3. Request Batching

**Current**: Multiple API calls per assistant call
```typescript
// 1. Create thread
// 2. Add message
// 3. Run assistant
// 4. Poll status (multiple times)
// 5. Get messages
```

**Optimized**: Reuse threads, batch operations
```typescript
// Reuse existing thread if available
// Batch message additions
// Use streaming where possible
```

### 4. Caching

**Current**: Every request hits API
```typescript
const result = await extractProperties(prompt); // Always calls API
```

**Optimized**: Cache identical requests
```typescript
const cacheKey = hash(prompt);
if (cache.has(cacheKey)) return cache.get(cacheKey);
const result = await extractProperties(prompt);
cache.set(cacheKey, result);
```

## 🔧 Implementation Steps

### Step 1: Update Polling Mechanism

Replace all polling loops in `llmService.ts`:

**Find** (appears in multiple places):
```typescript
while (runStatus === 'queued' || runStatus === 'in_progress') {
  await new Promise(resolve => setTimeout(resolve, 1000));
  // ... status check ...
}
```

**Replace with**:
```typescript
let delay = 250; // Start fast
let attempts = 0;
while (runStatus === 'queued' || runStatus === 'in_progress' && attempts < 120) {
  if (attempts > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 2000); // Exponential backoff
  }
  // ... status check ...
  attempts++;
}
```

### Step 2: Extract Polling to Helper Function

Create a reusable polling function (see `llmServiceOptimized.ts`):

```typescript
private async pollRunStatus(
  threadId: string,
  runId: string,
  options: { initialDelay?: number; maxDelay?: number } = {}
): Promise<'completed' | 'failed'> {
  // Optimized polling implementation
}
```

### Step 3: Identify Parallelization Opportunities

Look for sequential calls that can run in parallel:

**Example**: If you call multiple assistants for different properties:
```typescript
// Instead of:
for (const property of properties) {
  const examples = await generateExamples(property);
}

// Use:
const examples = await Promise.all(
  properties.map(prop => generateExamples(prop))
);
```

### Step 4: Add Simple Caching

```typescript
class LLMService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  async extractPropertiesWithAssistant(prompt: string): Promise<OOPObjectData> {
    const cacheKey = this.getCacheKey('extractProperties', prompt);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('Returning cached result');
      return cached.data;
    }

    const result = await this.extractPropertiesWithAssistantInternal(prompt);
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }
}
```

## 📊 Expected Performance Improvements

### Single Call Optimization
- **Before**: 3-5 seconds (with 1s polling)
- **After**: 1.5-3 seconds (with optimized polling)
- **Improvement**: 40-50% faster

### Multiple Calls (3 sequential)
- **Before**: 9-15 seconds total
- **After (parallel)**: 3-5 seconds total
- **Improvement**: 66-70% faster

### With Caching
- **Before**: 3-5 seconds per call
- **After (cached)**: <10ms
- **Improvement**: 99%+ faster for repeated requests

## 🎯 Quick Wins (Implement First)

1. **Optimize Polling** (30 min) - Biggest impact, easiest to implement
   - Change `1000` to `250` initial delay
   - Add exponential backoff
   - **Expected**: 40-50% faster per call

2. **Parallel Independent Calls** (1 hour)
   - Identify calls that don't depend on each other
   - Use `Promise.all()` or `Promise.allSettled()`
   - **Expected**: 50-70% faster for multiple calls

3. **Add Simple Cache** (1 hour)
   - Cache identical requests for 5 minutes
   - **Expected**: Near-instant for repeated requests

## 🔍 Where to Apply Optimizations

### High Priority (Most Impact)

1. **`extractPropertiesWithAssistant`** (ChatPanel.tsx:205)
   - Used when extracting properties from chat
   - Apply optimized polling

2. **`buildPromptWithAssistant`** (OOPromptPanel.tsx:869)
   - Called before sending to LLM
   - Apply optimized polling

3. **`mergeFreeTextWithOOP`** (AddPropertyModal.tsx:49)
   - Used when adding unstructured properties
   - Apply optimized polling

4. **`analyzeObjectModifier`** (ObjectModifierModal.tsx:161)
   - Used for conflict checking, suggestions
   - Apply optimized polling + consider parallelization

5. **`generateExamples`** (MoreOptionsModal.tsx:47)
   - Used for generating property examples
   - Apply optimized polling

### Medium Priority

- **`chatWithOpenAIAssistants`** - Main chat function
- Consider streaming responses if supported

## 🚀 Advanced Optimizations

### 1. Streaming Responses
If OpenAI supports streaming for assistants, use it:
```typescript
// Instead of polling, use streaming
const stream = await fetch(streamingEndpoint);
// Process chunks as they arrive
```

### 2. Request Deduplication
Prevent duplicate concurrent requests:
```typescript
private pendingRequests = new Map<string, Promise<any>>();

async extractPropertiesWithAssistant(prompt: string) {
  const key = hash(prompt);
  if (this.pendingRequests.has(key)) {
    return this.pendingRequests.get(key);
  }
  
  const promise = this.extractPropertiesWithAssistantInternal(prompt);
  this.pendingRequests.set(key, promise);
  
  try {
    return await promise;
  } finally {
    this.pendingRequests.delete(key);
  }
}
```

### 3. Prefetching
Predict and prefetch likely next requests:
```typescript
// When user starts typing, prefetch likely results
useEffect(() => {
  const timer = setTimeout(() => {
    prefetchExtractProperties(inputText);
  }, 500);
  return () => clearTimeout(timer);
}, [inputText]);
```

## 📝 Code Examples

See `src/services/llmServiceOptimized.ts` for complete implementation examples.

## ⚠️ Important Notes

1. **Rate Limits**: Be careful with parallelization - don't exceed API rate limits
2. **Error Handling**: Ensure parallel failures don't break the app
3. **User Feedback**: Show progress for long-running operations
4. **Testing**: Test with various response times and failure scenarios

## 🎯 Recommended Implementation Order

1. ✅ **Optimize polling** (30 min) - Immediate 40-50% improvement
2. ✅ **Add caching** (1 hour) - Huge improvement for repeated requests
3. ✅ **Parallelize independent calls** (1-2 hours) - Major improvement for workflows
4. ⚠️ **Advanced optimizations** (2-4 hours) - Additional improvements

## 📊 Monitoring

Add performance logging:
```typescript
const startTime = Date.now();
const result = await extractPropertiesWithAssistant(prompt);
const duration = Date.now() - startTime;
console.log(`extractProperties took ${duration}ms`);
```

Track improvements and identify remaining bottlenecks.

