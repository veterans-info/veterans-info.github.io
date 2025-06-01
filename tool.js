// Veterans' Preference Interactive Tool Logic with UI Improvements
(function () {
    'use strict';

    // State management
    const state = {
        currentQuestionId: null,
        history: [],
        answers: {},
        totalSteps: 0,
        currentStep: 0,
        currentAnswerIndex: 0 // for keyboard navigation
    };

    const animationDuration = 300; // ms

    // DOM elements
    let elements = {};

    // Initialize the tool
    function init() {
        // Get DOM elements
        elements = {
            disclaimer: document.querySelector('.tool-disclaimer'),
            acceptButton: document.getElementById('accept-disclaimer'),
            toolInterface: document.getElementById('tool-interface'),
            questionArea: document.getElementById('question-area'),
            answersArea: document.getElementById('answers-area'),
            resultArea: document.getElementById('result-area'),
            progressBar: document.querySelector('.progress-bar'),
            currentStep: document.getElementById('current-step'),
            totalSteps: document.getElementById('total-steps'),
            backButton: document.getElementById('back-button'),
            restartButton: document.getElementById('restart-button'),
            printButton: document.getElementById('print-button')
        };

        if (elements.acceptButton) elements.acceptButton.addEventListener('click', startTool);
        if (elements.restartButton) elements.restartButton.addEventListener('click', restartTool);
        if (elements.backButton) elements.backButton.addEventListener('click', goBack);
        if (elements.printButton) elements.printButton.addEventListener('click', printResults);
        document.addEventListener('keydown', handleKeyboardNavigation);

        state.totalSteps = countTotalSteps();
        if (elements.totalSteps) elements.totalSteps.textContent = state.totalSteps;
    }

    function countTotalSteps() {
        return 10;
    }

    function startTool() {
        if (elements.disclaimer) elements.disclaimer.classList.add('hidden');
        if (elements.toolInterface) elements.toolInterface.classList.remove('hidden');
        displayQuestion('START');
    }

    function displayQuestion(questionId) {
        const question = vetPreferenceTree[questionId];
        if (!question) {
            if (elements.questionArea) {
                elements.questionArea.innerHTML = '<p class="error-message">An error occurred. Please restart the tool.</p>';
            }
            return;
        }

        state.currentQuestionId = questionId;
        state.currentStep = Math.min(state.currentStep + 1, state.totalSteps);
        updateProgress();

        if (elements.resultArea) elements.resultArea.classList.add('hidden');
        if (elements.questionArea) {
            elements.questionArea.classList.remove('hidden', 'fade-out');
            elements.questionArea.classList.add('fade-in');
            setTimeout(() => elements.questionArea.classList.remove('fade-in'), animationDuration);
        }

        if (elements.answersArea) {
            elements.answersArea.classList.remove('hidden', 'fade-out');
            elements.answersArea.classList.add('fade-in');
            setTimeout(() => elements.answersArea.classList.remove('fade-in'), animationDuration);
        }

        state.currentAnswerIndex = 0;

        setTimeout(() => {
            if (elements.questionArea) {
                elements.questionArea.innerHTML = `
                    <h2>${question.questionText}</h2>
                    ${question.helpText ? `<p class="help-text">${question.helpText}</p>` : ''}
                `;
            }

            if (elements.answersArea) {
                elements.answersArea.innerHTML = '';
                question.answers.forEach((answer, index) => {
                    const button = document.createElement('button');
                    button.className = 'answer-option';
                    if (index === 0) button.classList.add('selected');
                    button.textContent = answer.answerText;
                    button.setAttribute('data-answer-index', index);
                    button.setAttribute('tabindex', 0);
                    button.addEventListener('click', () => handleAnswer(answer));
                    elements.answersArea.appendChild(button);
                });
            }

            if (elements.backButton) {
                elements.backButton.classList.toggle('hidden', state.history.length === 0);
            }
        }, 20); // small delay to allow transition
    }

    function handleAnswer(answer) {
        state.answers[state.currentQuestionId] = answer.answerText;
        state.history.push(state.currentQuestionId);

        if (answer.nextQuestionId) {
            displayQuestion(answer.nextQuestionId);
        } else if (answer.resultOutcome) {
            displayResult(answer.resultOutcome);
        } else {
            if (elements.questionArea) {
                elements.questionArea.innerHTML = '<p class="error-message">Configuration error. Next step not defined.</p>';
            }
        }
    }

    function displayResult(result) {
        if (elements.questionArea) elements.questionArea.classList.add('fade-out');
        if (elements.answersArea) elements.answersArea.classList.add('fade-out');
        setTimeout(() => {
            if (elements.questionArea) elements.questionArea.classList.add('hidden');
            if (elements.answersArea) elements.answersArea.classList.add('hidden');

            if (elements.resultArea) {
                elements.resultArea.className = `tool-result ${result.type} fade-in`;
                let html = `<h2>${result.title}</h2><p>${result.description}</p>`;

                if (result.requiredDocuments) {
                    html += `<h3>Required Documents:</h3><ul>${result.requiredDocuments.map(doc => `<li>${doc}</li>`).join('')}</ul>`;
                }

                if (result.additionalInfo) {
                    html += `<h3>Additional Information:</h3><ul>${result.additionalInfo.map(info => `<li>${info}</li>`).join('')}</ul>`;
                }

                if (result.opmLinks) {
                    html += `<h3>Official Resources:</h3><ul>${result.opmLinks.map(link => `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.text}</a></li>`).join('')}</ul>`;
                }

                elements.resultArea.innerHTML = html;
                elements.resultArea.classList.remove('hidden');
            }

            if (elements.printButton) elements.printButton.classList.remove('hidden');
            if (elements.backButton) elements.backButton.classList.add('hidden');

            state.currentStep = state.totalSteps;
            updateProgress();
        }, animationDuration);
    }

    function updateProgress() {
        const progress = (state.currentStep / state.totalSteps) * 100;
        if (elements.progressBar) {
            elements.progressBar.style.transition = 'width 0.5s ease';
            elements.progressBar.style.width = `${progress}%`;
        }
        if (elements.currentStep) elements.currentStep.textContent = state.currentStep;
        const container = document.querySelector('.tool-progress');
        if (container) container.setAttribute('aria-valuenow', Math.round(progress));
    }

    function goBack() {
        if (state.history.length > 0) {
            state.history.pop();
            const previous = state.history.length > 0 ? state.history.pop() : 'START';
            state.currentStep = Math.max(0, state.currentStep - 2);
            displayQuestion(previous);
        }
    }

    function restartTool() {
        state.currentQuestionId = null;
        state.history = [];
        state.answers = {};
        state.currentStep = 0;

        if (elements.questionArea) elements.questionArea.classList.remove('hidden');
        if (elements.answersArea) elements.answersArea.classList.remove('hidden');
        if (elements.resultArea) elements.resultArea.classList.add('hidden');
        if (elements.printButton) elements.printButton.classList.add('hidden');

        displayQuestion('START');
    }

    function printResults() {
        window.print();
    }

    function handleKeyboardNavigation(e) {
        const answers = document.querySelectorAll('.answer-option');
        if (!answers.length) return;

        // Up/Down arrow to navigate
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.currentAnswerIndex = (state.currentAnswerIndex + 1) % answers.length;
            highlightSelectedAnswer(answers);
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.currentAnswerIndex = (state.currentAnswerIndex - 1 + answers.length) % answers.length;
            highlightSelectedAnswer(answers);
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            answers[state.currentAnswerIndex].click();
        }
    }

    function highlightSelectedAnswer(answers) {
        answers.forEach(btn => btn.classList.remove('selected'));
        const selected = answers[state.currentAnswerIndex];
        if (selected) selected.classList.add('selected');
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
})();
