// Veterans' Preference Interactive Tool Logic
(function() {
    'use strict';

    // State management
    const state = {
        currentQuestionId: null,
        history: [],
        answers: {},
        totalSteps: 0,
        currentStep: 0
    };

    // Decision tree structure
    const vetPreferenceTree = {
        'START': {
            id: 'START',
            questionText: 'Are you seeking information about Veterans\' Preference for yourself or someone else?',
            answers: [
                {
                    answerText: 'For myself (I am a veteran or current service member)',
                    nextQuestionId: 'VETERAN_STATUS'
                },
                {
                    answerText: 'For a family member',
                    nextQuestionId: 'FAMILY_RELATIONSHIP'
                },
                {
                    answerText: 'I am an HR professional seeking general information',
                    resultOutcome: {
                        type: 'info',
                        title: 'HR Professional Resources',
                        description: 'As an HR professional, you have access to comprehensive resources.',
                        additionalInfo: [
                            'Review the complete OPM Vet Guide for HR Professionals',
                            'Consult agency-specific policies',
                            'Contact OPM for specific case guidance'
                        ],
                        opmLinks: [
                            {
                                text: 'OPM Vet Guide for HR Professionals',
                                url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/'
                            }
                        ]
                    }
                }
            ]
        },
        
        'VETERAN_STATUS': {
            id: 'VETERAN_STATUS',
            questionText: 'What is your current military service status?',
            answers: [
                {
                    answerText: 'Discharged/Separated veteran',
                    nextQuestionId: 'DISCHARGE_TYPE'
                },
                {
                    answerText: 'Current active duty service member',
                    nextQuestionId: 'ACTIVE_DUTY_STATUS'
                },
                {
                    answerText: 'Retired military',
                    nextQuestionId: 'RETIREMENT_TYPE'
                },
                {
                    answerText: 'Current Reserve or National Guard member',
                    nextQuestionId: 'RESERVE_STATUS'
                }
            ]
        },
        
        'DISCHARGE_TYPE': {
            id: 'DISCHARGE_TYPE',
            questionText: 'What type of discharge did you receive from military service?',
            helpText: 'Your discharge characterization is shown on your DD-214 or equivalent discharge documentation.',
            answers: [
                {
                    answerText: 'Honorable',
                    nextQuestionId: 'SERVICE_DATES'
                },
                {
                    answerText: 'General (Under Honorable Conditions)',
                    nextQuestionId: 'SERVICE_DATES'
                },
                {
                    answerText: 'Other Than Honorable (OTH)',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Veterans\' Preference',
                        description: 'Veterans\' Preference requires an honorable or general discharge.',
                        additionalInfo: [
                            'You may be able to upgrade your discharge through a military discharge review board',
                            'Some VA benefits may still be available depending on the circumstances'
                        ],
                        opmLinks: [
                            {
                                text: 'Character of Discharge Requirements',
                                url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#discharge'
                            }
                        ]
                    }
                },
                {
                    answerText: 'Bad Conduct or Dishonorable',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Veterans\' Preference',
                        description: 'Veterans\' Preference is not available with a bad conduct or dishonorable discharge.',
                        additionalInfo: [
                            'Discharge upgrades may be possible in limited circumstances',
                            'Consult with a Veterans Service Organization for assistance'
                        ]
                    }
                },
                {
                    answerText: 'Uncharacterized or Entry Level Separation',
                    nextQuestionId: 'ENTRY_LEVEL_SERVICE'
                }
            ]
        },
        
        'SERVICE_DATES': {
            id: 'SERVICE_DATES',
            questionText: 'When did you serve on active duty?',
            helpText: 'Select all periods that apply to your service.',
            multiSelect: true,
            answers: [
                {
                    answerText: 'During a war, campaign, or expedition',
                    nextQuestionId: 'DISABILITY_STATUS'
                },
                {
                    answerText: 'Served at least 180 consecutive days, any part after 9/11/80',
                    nextQuestionId: 'DISABILITY_STATUS'
                },
                {
                    answerText: 'Only during peacetime before 9/11/80',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Veterans\' Preference',
                        description: 'Peacetime service before September 11, 1980 does not qualify for Veterans\' Preference unless you have a service-connected disability.',
                        additionalInfo: [
                            'You may qualify if you have a service-connected disability',
                            'Consider applying for VA disability compensation if you have service-related conditions'
                        ]
                    }
                },
                {
                    answerText: 'Gulf War (8/2/90 to 1/2/92)',
                    nextQuestionId: 'DISABILITY_STATUS'
                },
                {
                    answerText: 'Operation Enduring Freedom/Operation Iraqi Freedom',
                    nextQuestionId: 'DISABILITY_STATUS'
                }
            ]
        },
        
        'DISABILITY_STATUS': {
            id: 'DISABILITY_STATUS',
            questionText: 'Do you have a service-connected disability?',
            helpText: 'A service-connected disability is one that the VA has determined was caused or aggravated by your military service.',
            answers: [
                {
                    answerText: 'Yes, rated 30% or more',
                    nextQuestionId: 'DISABILITY_TYPE_30'
                },
                {
                    answerText: 'Yes, rated 10% or more but less than 30%',
                    resultOutcome: {
                        type: 'eligible-10-point',
                        title: '10-Point Preference Eligible (CP)',
                        description: 'You appear to be eligible for 10-point compensable preference.',
                        requiredDocuments: [
                            'DD-214 or equivalent discharge documentation',
                            'VA letter showing disability percentage',
                            'SF-15 Application for 10-Point Veteran Preference'
                        ],
                        opmLinks: [
                            {
                                text: '10-Point Preference Information',
                                url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#10point'
                            }
                        ]
                    }
                },
                {
                    answerText: 'Yes, but less than 10%',
                    resultOutcome: {
                        type: 'eligible-5-point',
                        title: '5-Point Preference Eligible (TP)',
                        description: 'You appear to be eligible for 5-point preference based on your military service.',
                        requiredDocuments: [
                            'DD-214 or equivalent discharge documentation'
                        ],
                        opmLinks: [
                            {
                                text: '5-Point Preference Information',
                                url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#5point'
                            }
                        ]
                    }
                },
                {
                    answerText: 'No service-connected disability',
                    resultOutcome: {
                        type: 'eligible-5-point',
                        title: '5-Point Preference Eligible (TP)',
                        description: 'Based on your qualifying military service, you appear to be eligible for 5-point preference.',
                        requiredDocuments: [
                            'DD-214 or equivalent discharge documentation'
                        ],
                        opmLinks: [
                            {
                                text: '5-Point Preference Information',
                                url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#5point'
                            }
                        ]
                    }
                },
                {
                    answerText: 'Purple Heart recipient',
                    resultOutcome: {
                        type: 'eligible-10-point',
                        title: '10-Point Preference Eligible (CPS)',
                        description: 'As a Purple Heart recipient, you are eligible for 10-point preference.',
                        requiredDocuments: [
                            'DD-214 showing Purple Heart award',
                            'SF-15 Application for 10-Point Veteran Preference'
                        ],
                        opmLinks: [
                            {
                                text: '10-Point Preference for Purple Heart',
                                url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#purpleheart'
                            }
                        ]
                    }
                }
            ]
        },
        
        'FAMILY_RELATIONSHIP': {
            id: 'FAMILY_RELATIONSHIP',
            questionText: 'What is your relationship to the veteran?',
            helpText: 'Certain family members may be eligible for "derivative preference" based on the veteran\'s service.',
            answers: [
                {
                    answerText: 'Spouse',
                    nextQuestionId: 'SPOUSE_ELIGIBILITY'
                },
                {
                    answerText: 'Mother',
                    nextQuestionId: 'MOTHER_ELIGIBILITY'
                },
                {
                    answerText: 'Child',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Derivative Preference',
                        description: 'Children of veterans are not eligible for derivative preference. Only spouses and mothers of certain veterans qualify.',
                        additionalInfo: [
                            'The veteran themselves may be eligible for preference',
                            'Other veteran family benefits may be available through VA'
                        ]
                    }
                },
                {
                    answerText: 'Other family member',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Derivative Preference',
                        description: 'Only spouses and mothers of certain disabled or deceased veterans are eligible for derivative preference.',
                        additionalInfo: [
                            'The veteran themselves should apply for their own preference',
                            'Check with VA for other family member benefits'
                        ]
                    }
                }
            ]
        },
        
        'SPOUSE_ELIGIBILITY': {
            id: 'SPOUSE_ELIGIBILITY',
            questionText: 'What is the veteran\'s current status?',
            helpText: 'Spouses may be eligible for derivative preference under specific circumstances.',
            answers: [
                {
                    answerText: 'Living veteran with 100% service-connected disability',
                    nextQuestionId: 'SPOUSE_UNEMPLOYABILITY'
                },
                {
                    answerText: 'Deceased veteran (died in service or from service-connected disability)',
                    resultOutcome: {
                        type: 'eligible-10-point-derivative',
                        title: '10-Point Derivative Preference Eligible (XP)',
                        description: 'As the spouse of a deceased veteran, you may be eligible for 10-point derivative preference.',
                        requiredDocuments: [
                            'Marriage certificate',
                            'Veteran\'s death certificate',
                            'Documentation showing death was service-connected',
                            'SF-15 Application for 10-Point Veteran Preference'
                        ],
                        additionalInfo: [
                            'You remain eligible unless you remarry',
                            'Contact VA for survivor benefits information'
                        ],
                        opmLinks: [
                            {
                                text: 'Derivative Preference Information',
                                url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#derivative'
                            }
                        ]
                    }
                },
                {
                    answerText: 'Living veteran with less than 100% disability',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Derivative Preference',
                        description: 'Spouses of living veterans are only eligible if the veteran has a 100% permanent and total disability.',
                        additionalInfo: [
                            'The veteran themselves may be eligible for preference',
                            'Check if the veteran\'s disability rating may increase'
                        ]
                    }
                },
                {
                    answerText: 'Missing in action or prisoner of war',
                    resultOutcome: {
                        type: 'complex',
                        title: 'Complex Eligibility Scenario',
                        description: 'Spouses of MIA/POW service members may have special eligibility.',
                        additionalInfo: [
                            'Contact your agency HR for specific guidance',
                            'Special hiring authorities may apply',
                            'Consult with a Veterans Service Officer'
                        ],
                        opmLinks: [
                            {
                                text: 'Special Circumstances',
                                url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/'
                            }
                        ]
                    }
                }
            ]
        }
        
        // Additional nodes would continue here...
    };

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

        // Set up event listeners
        if (elements.acceptButton) {
            elements.acceptButton.addEventListener('click', startTool);
        }
        
        if (elements.restartButton) {
            elements.restartButton.addEventListener('click', restartTool);
        }
        
        if (elements.backButton) {
            elements.backButton.addEventListener('click', goBack);
        }
        
        if (elements.printButton) {
            elements.printButton.addEventListener('click', printResults);
        }

        // Calculate total steps
        state.totalSteps = countTotalSteps();
        if (elements.totalSteps) {
            elements.totalSteps.textContent = state.totalSteps;
        }
    }

    // Count total possible steps in the tree
    function countTotalSteps() {
        // Simple approximation - would be refined based on actual tree complexity
        return 10;
    }

    // Start the tool after accepting disclaimer
    function startTool() {
        elements.disclaimer.style.display = 'none';
        elements.toolInterface.style.display = 'block';
        displayQuestion('START');
    }

    // Display a question
    function displayQuestion(questionId) {
        const question = vetPreferenceTree[questionId];
        if (!question) {
            console.error('Question not found:', questionId);
            return;
        }

        // Update state
        state.currentQuestionId = questionId;
        state.currentStep = Math.min(state.currentStep + 1, state.totalSteps);
        
        // Update progress
        updateProgress();
        
        // Clear previous content
        elements.questionArea.innerHTML = '';
        elements.answersArea.innerHTML = '';
        elements.resultArea.style.display = 'none';
        
        // Display question
        const questionHTML = `
            <h2>${question.questionText}</h2>
            ${question.helpText ? `<p class="help-text">${question.helpText}</p>` : ''}
        `;
        elements.questionArea.innerHTML = questionHTML;
        
        // Display answers
        question.answers.forEach((answer, index) => {
            const button = document.createElement('button');
            button.className = 'answer-option';
            button.textContent = answer.answerText;
            button.setAttribute('data-answer-index', index);
            button.addEventListener('click', () => handleAnswer(answer));
            elements.answersArea.appendChild(button);
        });
        
        // Update navigation
        elements.backButton.style.display = state.history.length > 0 ? 'inline-block' : 'none';
    }

    // Handle answer selection
    function handleAnswer(answer) {
        // Save answer
        state.answers[state.currentQuestionId] = answer.answerText;
        state.history.push(state.currentQuestionId);
        
        if (answer.nextQuestionId) {
            displayQuestion(answer.nextQuestionId);
        } else if (answer.resultOutcome) {
            displayResult(answer.resultOutcome);
        }
    }

    // Display result
    function displayResult(result) {
        elements.questionArea.style.display = 'none';
        elements.answersArea.style.display = 'none';
        elements.resultArea.style.display = 'block';
        
        // Apply result type styling
        elements.resultArea.className = `tool-result ${result.type}`;
        
        // Build result HTML
        let resultHTML = `
            <h2>${result.title}</h2>
            <p>${result.description}</p>
        `;
        
        if (result.requiredDocuments && result.requiredDocuments.length > 0) {
            resultHTML += `
                <div class="result-documents">
                    <h3>Required Documents:</h3>
                    <ul>
                        ${result.requiredDocuments.map(doc => `<li>${doc}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (result.additionalInfo && result.additionalInfo.length > 0) {
            resultHTML += `
                <div class="result-details">
                    <h3>Additional Information:</h3>
                    <ul>
                        ${result.additionalInfo.map(info => `<li>${info}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (result.opmLinks && result.opmLinks.length > 0) {
            resultHTML += `
                <div class="result-links">
                    <h3>Official Resources:</h3>
                    <ul>
                        ${result.opmLinks.map(link => 
                            `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.text}</a></li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }
        
        elements.resultArea.innerHTML = resultHTML;
        elements.printButton.style.display = 'inline-block';
        elements.backButton.style.display = 'none';
        
        // Update progress to 100%
        state.currentStep = state.totalSteps;
        updateProgress();
    }

    // Update progress bar
    function updateProgress() {
        const progress = (state.currentStep / state.totalSteps) * 100;
        elements.progressBar.style.width = `${progress}%`;
        elements.currentStep.textContent = state.currentStep;
        
        // Update ARIA attributes
        const progressContainer = document.querySelector('.tool-progress');
        if (progressContainer) {
            progressContainer.setAttribute('aria-valuenow', progress);
        }
    }

    // Go back to previous question
    function goBack() {
        if (state.history.length > 0) {
            state.history.pop(); // Remove current
            const previousId = state.history.length > 0 ? state.history[state.history.length - 1] : 'START';
            state.currentStep = Math.max(1, state.currentStep - 2); // Adjust for re-display
            displayQuestion(previousId);
        }
    }

    // Restart the tool
    function restartTool() {
        // Reset state
        state.currentQuestionId = null;
        state.history = [];
        state.answers = {};
        state.currentStep = 0;
        
        // Reset UI
        elements.questionArea.style.display = 'block';
        elements.answersArea.style.display = 'block';
        elements.resultArea.style.display = 'none';
        elements.printButton.style.display = 'none';
        
        // Start over
        displayQuestion('START');
    }

    // Print results
    function printResults() {
        window.print();
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

})();