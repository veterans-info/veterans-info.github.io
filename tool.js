import { veteransPreferenceData } from './tool-data.js';

document.addEventListener('DOMContentLoaded', function() {
    const toolSection = document.getElementById('interactive-tool');

    const toolState = {
        history: [],        // Navigation history (stores question IDs)
        answers: {},        // All user answers (key: questionId, value: answerId)
        currentQuestionId: 'q1', // Current question ID
        eligibilities: []   // Multiple possible eligibilities
    };

    function displayQuestion(questionId) {
        const q = veteransPreferenceData.questions[questionId];
        if (!q) {
            displayResults('error');
            return;
        }

        let html = `<h2>${q.question}</h2><div class="options">`;
        q.options.forEach(option => {
            html += `<button data-answer-id="${option.id}">${option.text}</button>`;
        });
        html += `</div>`;
        toolSection.innerHTML = html;

        toolSection.querySelectorAll('.options button').forEach(button => {
            button.addEventListener('click', handleAnswer);
        });

        // Add Go Back button if not the first question
        if (toolState.history.length > 0) {
            toolSection.innerHTML += `<button id="goBackBtn">Go Back</button>`;
            document.getElementById('goBackBtn').addEventListener('click', goBack);
        }
    }

    function handleAnswer(event) {
        const answerId = event.target.dataset.answerId;
        const currentQuestion = veteransPreferenceData.questions[toolState.currentQuestionId];
        const selectedOption = currentQuestion.options.find(opt => opt.id === answerId);

        if (!selectedOption) {
            displayResults('error');
            return;
        }

        // Save current state to history before moving on
        toolState.history.push(toolState.currentQuestionId);
        toolState.answers[toolState.currentQuestionId] = answerId;

        const nextStep = selectedOption.next;

        if (nextStep.startsWith('result-')) {
            toolState.currentQuestionId = nextStep; // Store the result ID as current
            displayResults(nextStep);
        } else {
            toolState.currentQuestionId = nextStep;
            displayQuestion(toolState.currentQuestionId);
        }
    }

    function displayResults(resultId) {
        const result = veteransPreferenceData.results[resultId];
        let html = `<h2>Your Assessment Results</h2>`;

        if (result) {
            html += `<p>${result.description}</p>`;
            if (result.documentation) {
                html += `<p><strong>Required Documentation:</strong> ${result.documentation}</p>`;
            }
            if (result.reference) {
                html += `<p>For more information, please refer to the <a href="${result.reference.url}" target="_blank" rel="noopener noreferrer">${result.reference.text}</a>.</p>`;
            }
        } else {
            html += `<p>An unexpected error occurred or the assessment path is incomplete. Please try again.</p>`;
        }

        html += `<button id="startOverBtn">Start Over</button>`;
        toolSection.innerHTML = html;
        document.getElementById('startOverBtn').addEventListener('click', startOver);
    }

    function startOver() {
        toolState.history = [];
        toolState.answers = {};
        toolState.currentQuestionId = 'q1';
        toolState.eligibilities = [];
        displayQuestion(toolState.currentQuestionId);
    }

    function goBack() {
        if (toolState.history.length > 0) {
            const previousQuestionId = toolState.history.pop();
            delete toolState.answers[toolState.currentQuestionId]; // Remove answer for the question we are going back from
            toolState.currentQuestionId = previousQuestionId;
            displayQuestion(toolState.currentQuestionId);
        }
    }

    // Initial call to start the tool
    displayQuestion(toolState.currentQuestionId);
});
