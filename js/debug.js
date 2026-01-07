// ============ DEBUG CONSOLE ============
// Provides console commands for testing mock scenarios
// Use in browser console: debugApp.switchScenario('winter_low_pollen'), etc.

const debugApp = {
  // List all available scenarios
  scenarios: () => {
    console.log('Available mock scenarios:');
    Object.keys(MOCK_SCENARIOS).forEach(s => console.log(`  - ${s}`));
  },

  // Switch to a specific scenario and reload weather
  switchScenario: async (scenarioName) => {
    if(!MOCK_MODE) {
      console.warn('Mock mode is not enabled. Use ?mock=true in URL or localStorage.setItem("useMockAPI", "true")');
      return;
    }

    setMockScenario(scenarioName);
    
    // Reload weather/pollen for current location
    if(state.currentForecastLat && state.currentForecastLon) {
      console.log(`Switching to scenario: ${scenarioName}`);
      await loadForLocation(state.currentForecastLat, state.currentForecastLon, state.currentLocationName);
      console.log(`✓ Scenario switched to: ${scenarioName}`);
    } else {
      console.log(`✓ Scenario switched to: ${scenarioName} (no location loaded yet)`);
    }
  },

  // Enable mock mode
  enableMock: () => {
    localStorage.setItem('useMockAPI', 'true');
    console.log('Mock mode enabled. Reload page to apply.');
  },

  // Disable mock mode
  disableMock: () => {
    localStorage.removeItem('useMockAPI');
    console.log('Mock mode disabled. Reload page to apply.');
  },

  // Check current mock status
  status: () => {
    console.log({
      mockModeEnabled: MOCK_MODE,
      currentScenario: CURRENT_MOCK_SCENARIO,
      availableScenarios: Object.keys(MOCK_SCENARIOS)
    });
  },

  // Get current mock data
  data: () => {
    console.log('Current mock scenario data:', getCurrentMockScenario());
  },

  help: () => {
    console.log(`
    🧪 Debug Commands:
    
    debugApp.scenarios()        - Show available scenarios
    debugApp.switchScenario('spring_high_pollen')  - Switch to a scenario
    debugApp.status()           - Show current mock status
    debugApp.data()             - View current mock data
    debugApp.enableMock()       - Enable mock mode
    debugApp.disableMock()      - Disable mock mode
    debugApp.help()             - Show this help
    
    Available scenarios:
    - spring_high_pollen
    - winter_low_pollen
    - stormy_moderate_pollen
    - extreme_pollen
    `);
  }
};

// Print help on page load if mock mode is enabled
if(MOCK_MODE) {
  console.log('%c🧪 Mock API Mode Enabled', 'font-size: 14px; color: #ff9800; font-weight: bold;');
  console.log('Type %cdebugApp.help()%c to see available commands', 'font-family: monospace; background: #f5f5f5; padding: 2px 4px;', 'color: inherit;');
}
