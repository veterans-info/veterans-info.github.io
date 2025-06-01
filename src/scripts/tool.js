// tool.js - Assessment tool
class VeteransPreferenceTool {
  constructor() {
    this.state = {
      currentStep: 0,
      answers: {},
      result: null,
      startTime: Date.now()
    };
    
    this.questions = [];
    this.logic = {};
  }
  
  async init() {
    // Load questions and logic from JSON
    try {
      const [questionsResponse, logicResponse] = await Promise.all([
        fetch('/data/tool-questions.json'),
        fetch('/data/tool-logic.json')
      ]);
      
      this.questions = await questionsResponse.json();
      this.logic = await logicResponse.json();
      
      // Check for saved progress
      const savedProgress = Utils.loadProgress('tool-state');
      if (savedProgress && this.confirmRestore()) {
        this.state = savedProgress;
      }
      
      this.render();
    } catch (error) {
      console.error('Failed to initialize tool:', error);
      this.renderError();
    }
  }
  
  confirmRestore() {
    return confirm('Would you like to continue where you left off?');
  }
  
  saveProgress() {
    Utils.saveProgress('tool-state', this.state);
  }
  
  handleAnswer(questionId, answer) {
    this.state.answers[questionId] = answer;
    this.saveProgress();
    
    // Determine next step based on logic
    const nextStep = this.getNextStep(questionId, answer);
    
    if (nextStep === 'result') {
      this.calculateResult();
    } else {
      this.state.currentStep = nextStep;
      this.render();
    }
  }
  
  getNextStep(questionId, answer) {
    const logicEntry = this.logic[questionId];
    if (logicEntry && logicEntry[answer]) {
      return logicEntry[answer].next;
    }
    return this.state.currentStep + 1;
  }
  
  calculateResult() {
    // Complex logic to determine eligibility
    const result = {
      eligible: false,
      preferenceType: null,
      points: 0,
      requiredDocuments: [],
      nextSteps: [],
      confidence: 'high' // high, medium, low
    };
    
    // Apply logic rules
    // ... calculation logic ...
    
    this.state.result = result;
    this.render();
  }
  
  render() {
    const container = document.getElementById('tool-container');
    if (!container) return;
    
    if (this.state.result) {
      container.innerHTML = this.renderResult();
    } else {
      container.innerHTML = this.renderQuestion();
    }
    
    this.attachEventListeners();
  }
  
  renderQuestion() {
    const question = this.questions[this.state.currentStep];
    const progress = ((this.state.currentStep + 1) / this.questions.length) * 100;
    
    return `
      <div class="tool-progress">
        <div class="tool-progress__bar" style="width: ${progress}%"></div>
        <span class="tool-progress__text">Step ${this.state.currentStep + 1} of ${this.questions.length}</span>
      </div>
      
      <div class="tool-question">
        <h3 class="tool-question__title">${question.title}</h3>
        <p class="tool-question__description">${question.description || ''}</p>
        
        <div class="tool-options">
          ${question.options.map(option => `
            <button class="tool-option" data-answer="${option.value}">
              <span class="tool-option__label">${option.label}</span>
              ${option.help ? `<span class="tool-option__help">${option.help}</span>` : ''}
            </button>
          `).join('')}
        </div>
        
        ${this.state.currentStep > 0 ? `
          <button class="button button--outline tool-back" data-action="back">
            Previous Question
          </button>
        ` : ''}
      </div>
    `;
  }
  
  renderResult() {
    const { result } = this.state;
    
    return `
      <div class="tool-result ${result.eligible ? 'tool-result--eligible' : 'tool-result--ineligible'}">
        <h2 class="tool-result__title">
          ${result.eligible ? '✓ You May Be Eligible' : '✗ You May Not Be Eligible'}
        </h2>
        
        ${result.eligible ? `
          <div class="tool-result__details">
            <h3>Preference Type: ${result.preferenceType}</h3>
            <p>Points: ${result.points}</p>
            
            <h4>Required Documents:</h4>
            <ul>
              ${result.requiredDocuments.map(doc => `<li>${doc}</li>`).join('')}
            </ul>
            
            <h4>Next Steps:</h4>
            <ol>
              ${result.nextSteps.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        ` : `
          <div class="tool-result__details">
            <p>Based on your responses, you may not qualify for veterans' preference.</p>
            <p>However, you may still be eligible for other benefits or special considerations.</p>
          </div>
        `}
        
        <div class="tool-result__actions">
          <button class="button button--primary" data-action="print">
            Print Results
          </button>
          <button class="button button--outline" data-action="restart">
            Start Over
          </button>
        </div>
        
        <div class="alert alert--info">
          <strong>Important:</strong> This tool provides general guidance only. 
          Always consult with HR or review official OPM guidelines for your specific situation.
        </div>
      </div>
    `;
  }
}
