# Feature: Glean Agent Testing & Preview

## Overview
Allow users to test Glean agents before creating/saving them, with a preview panel showing how the agent responds to test queries.

## Requirements

### 1. Type Definitions
Add to `src/types/model.ts`:
- `AgentTestResult` - Result of a test query
- `AgentTestSession` - Test session with history
- `AgentPreviewConfig` - Preview-mode agent config

### 2. Agent Test Panel Component
Create `src/components/model/GleanAgentTestPanel.tsx`:
- Side-by-side layout with config and test chat
- Test input field for queries
- Response display area
- Test history (last 5 queries)
- Clear test history button
- Loading/streaming indicator

### 3. Agent Creator Updates
Modify `src/components/model/GleanAgentCreator.tsx`:
- Add "Test Agent" button
- Open test panel in modal or drawer
- Pass current unsaved config to test
- Indicate when testing draft vs saved agent

### 4. Glean Provider Updates
Modify `src/lib/api/providers/glean.ts`:
- Add `testAgent(config, query)` method
- Support testing without saving agent
- Use draft agent configuration
- Return test results with citations

### 5. Glean Client Updates
Modify `src/lib/api/client.ts`:
- Add `testGleanAgent(config, query)` method
- Handle test-mode API calls
- Return structured test results

### 6. API Route
Create `src/app/api/glean/agents/test/route.ts`:
- POST endpoint for testing agents
- Accept agent config and test query
- Return streaming or full response
- Handle errors gracefully

### 7. Model Store Updates
Modify `src/stores/modelStore.ts`:
- Add `testAgentResults` state
- Add `isTestingAgent` loading state
- Add `testAgent(config, query)` action
- Store test history per agent draft

### 8. Test History Component
Create `src/components/model/AgentTestHistory.tsx`:
- List of previous test queries
- Quick re-run button
- Expandable response preview
- Timestamp display

## Acceptance Criteria
- [ ] Can test agent before creating
- [ ] Can test agent with custom system prompt
- [ ] Test queries don't affect production agent
- [ ] Response shows with citations
- [ ] Can run multiple test queries
- [ ] Clear feedback on test vs production mode
- [ ] Loading states during testing
- [ ] Error handling for failed tests

## Technical Notes
- Use a temporary/draft agent for testing
- Consider rate limiting test requests
- Cache test results for quick comparison
- Allow comparing different configurations
