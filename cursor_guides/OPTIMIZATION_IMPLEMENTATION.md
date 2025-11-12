# Quick Implementation: Optimize GPT Assistant Calls

## 🎯 Goal
Reduce delay from 3-5 seconds per call to 1-2 seconds by optimizing polling.

## ⚡ Quick Fix (5 minutes)

### Step 1: Replace Polling Logic

Find these 4 locations in `src/services/llmService.ts`:

1. Line ~600: `extractPropertiesWithAssistant`
2. Line ~817: `buildPromptWithAssistant`  
3. Line ~940: `mergeFreeTextWithOOP`
4. Line ~1080: `generateExamples`
5. Line ~1240: `analyzeObjectModifier`

**Replace this pattern:**
```typescript
// Poll for completion
let runStatus = run.status;
while (runStatus === 'queued' || runStatus === 'in_progress') {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
    headers: {
      'Authorization': `Bearer ${this.openaiApiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    }
  });
  
  if (statusResponse.ok) {
    const runData = await statusResponse.json();
    runStatus = runData.status;
  }
}
```

**With this optimized version:**
```typescript
// Poll for completion with exponential backoff
let runStatus = run.status;
let delay = 250; // Start with 250ms instead of 1000ms
let attempts = 0;
const maxAttempts = 120; // Prevent infinite loops

while ((runStatus === 'queued' || runStatus === 'in_progress') && attempts < maxAttempts) {
  if (attempts > 0) {
    // Only delay after first attempt (check immediately)
    await new Promise(resolve => setTimeout(resolve, delay));
    // Exponential backoff: increase delay gradually, cap at 2000ms
    delay = Math.min(delay * 1.5, 2000);
  }
  
  const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
    headers: {
      'Authorization': `Bearer ${this.openaiApiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    }
  });
  
  if (statusResponse.ok) {
    const runData = await statusResponse.json();
    runStatus = runData.status;
    
    // Exit early if completed
    if (runStatus === 'completed' || runStatus === 'failed' || runStatus === 'cancelled') {
      break;
    }
  }
  
  attempts++;
}

if (attempts >= maxAttempts) {
  throw new Error('Polling timeout: Run did not complete within maximum attempts');
}
```

## 📊 Expected Results

- **Before**: 3-5 seconds per call (with 1s polling)
- **After**: 1.5-3 seconds per call (with optimized polling)
- **Improvement**: 40-50% faster

## 🔧 Advanced: Add Helper Function (15 minutes)

Add this helper method to the `LLMService` class:

```typescript
// Add this private method to LLMService class
private async pollRunStatus(
  threadId: string,
  runId: string
): Promise<'completed' | 'failed' | 'cancelled' | 'expired'> {
  let delay = 250;
  let attempts = 0;
  const maxAttempts = 120;

  while (attempts < maxAttempts) {
    if (attempts > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 2000);
    }

    const statusResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      }
    );

    if (statusResponse.ok) {
      const runData = await statusResponse.json();
      const status = runData.status;

      if (status === 'completed') return 'completed';
      if (status === 'failed') return 'failed';
      if (status === 'cancelled') return 'cancelled';
      if (status === 'expired') return 'expired';

      if (status === 'queued' || status === 'in_progress') {
        attempts++;
        continue;
      }
    }

    attempts++;
  }

  throw new Error('Polling timeout: Run did not complete within maximum attempts');
}
```

Then replace all polling loops with:
```typescript
const status = await this.pollRunStatus(thread.id, run.id);
if (status !== 'completed') {
  throw new Error(`Assistant run ${status}`);
}
```

## 🚀 Parallelization (Optional, 30 minutes)

If you have multiple independent calls, parallelize them:

### Example: Multiple Property Examples

**Before:**
```typescript
const examples1 = await generateExamples(property1);
const examples2 = await generateExamples(property2);
const examples3 = await generateExamples(property3);
// Total: 9-15 seconds
```

**After:**
```typescript
const [examples1, examples2, examples3] = await Promise.all([
  generateExamples(property1),
  generateExamples(property2),
  generateExamples(property3)
]);
// Total: 3-5 seconds (66% faster)
```

### Example: Conflict Check + Suggestions

**Before:**
```typescript
const conflicts = await analyzeObjectModifier(oop, 'conflict_check');
const suggestions = await analyzeObjectModifier(oop, 'more_possible_properties');
// Total: 6-10 seconds
```

**After:**
```typescript
const [conflicts, suggestions] = await Promise.all([
  analyzeObjectModifier(oop, 'conflict_check'),
  analyzeObjectModifier(oop, 'more_possible_properties')
]);
// Total: 3-5 seconds (50% faster)
```

## 📝 Testing

After implementing:

1. Test a single property extraction
2. Test building a prompt
3. Test generating examples
4. Compare timing with console logs:

```typescript
const startTime = Date.now();
const result = await extractPropertiesWithAssistant(prompt);
console.log(`Took ${Date.now() - startTime}ms`);
```

## ⚠️ Important Notes

1. **Rate Limits**: Don't parallelize too aggressively - OpenAI has rate limits
2. **Error Handling**: Ensure one failure doesn't break parallel calls
3. **User Feedback**: Show loading states during optimization

## 🎯 Priority Order

1. ✅ **Optimize polling** (5-15 min) - 40-50% improvement, easiest
2. ✅ **Add helper function** (15 min) - Cleaner code, reusable
3. ⚠️ **Parallelize calls** (30 min) - 50-70% improvement for multiple calls
4. ⚠️ **Add caching** (1 hour) - Near-instant for repeated requests

Start with #1 for immediate results!

