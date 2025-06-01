// Veterans' Preference Interactive Tool Logic
(function() {
    'use strict';

    // State management
    const state = {
        currentQuestionId: null,
        history: [],
        answers: {},
        totalSteps: 0,
        currentStep: 0,
        animating: false
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
        // Example: ACTIVE_DUTY_STATUS, RETIREMENT_TYPE, RESERVE_STATUS,
        // ENTRY_LEVEL_SERVICE, DISABILITY_TYPE_30, SPOUSE_UNEMPLOYABILITY, MOTHER_ELIGIBILITY etc.
        // Ensure these are defined if they are used as nextQuestionId.
    };

    // DOM elements
    let elements = {};

    // Animation timing
    const ANIMATION_DURATION = 300;

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

        // Set up keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);

        // Calculate total steps
        state.totalSteps = countTotalSteps();
        if (elements.totalSteps) {
            elements.totalSteps.textContent = state.totalSteps;
        }
    }

    // Count total possible steps in the tree
    function countTotalSteps() {
        // Simple approximation - would be refined based on actual tree complexity
        // This could be made more dynamic by traversing the tree for the longest path.
        return 10; 
    }

    // Handle keyboard navigation
    function handleKeyboardNavigation(event) {
        if (state.animating) return;

        const answerButtons = elements.answersArea ? elements.answersArea.querySelectorAll('.answer-option:not([disabled])') : [];
        const focusedElement = document.activeElement;
        const currentIndex = Array.from(answerButtons).indexOf(focusedElement);

        switch(event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                event.preventDefault();
                if (currentIndex >= 0 && currentIndex < answerButtons.length - 1) {
                    answerButtons[currentIndex + 1].focus();
                } else if (answerButtons.length > 0) {
                    answerButtons[0].focus();
                }
                break;
            
            case 'ArrowUp':
            case 'ArrowLeft':
                event.preventDefault();
                if (currentIndex > 0) {
                    answerButtons[currentIndex - 1].focus();
                } else if (answerButtons.length > 0) {
                    answerButtons[answerButtons.length - 1].focus();
                }
                break;
            
            case 'Enter':
            case ' ':
                if (focusedElement.classList.contains('answer-option')) {
                    event.preventDefault();
                    focusedElement.click();
                }
                break;
            
            case 'Escape':
                if (state.history.length > 0 && elements.backButton && !elements.backButton.classList.contains('hidden')) {
                    event.preventDefault();
                    goBack();
                }
                break;
        }
    }

    // Start the tool after accepting disclaimer
    function startTool() {
        if (elements.disclaimer) {
            fadeOut(elements.disclaimer, () => {
                elements.disclaimer.classList.add('hidden');
                if (elements.toolInterface) {
                    elements.toolInterface.classList.remove('hidden');
                    fadeIn(elements.toolInterface);
                }
                displayQuestion('START');
            });
        }
    }

    // Display a question with animation
    function displayQuestion(questionId) {
        if (state.animating) return;
        
        const question = vetPreferenceTree[questionId];
        if (!question) {
            console.error('Question not found:', questionId);
            if (elements.questionArea) elements.questionArea.innerHTML = '<p class="error-message">An error occurred. Please restart the tool.</p>';
            return;
        }

        state.animating = true;

        // Update state
        state.currentQuestionId = questionId;
        state.currentStep = Math.min(state.currentStep + 1, state.totalSteps);
        
        // Fade out current content
        const fadeOutElements = [];
        if (elements.questionArea && !elements.questionArea.classList.contains('hidden')) {
            fadeOutElements.push(elements.questionArea);
        }
        if (elements.answersArea && !elements.answersArea.classList.contains('hidden')) {
            fadeOutElements.push(elements.answersArea);
        }
        if (elements.resultArea && !elements.resultArea.classList.contains('hidden')) {
            fadeOutElements.push(elements.resultArea);
        }

        Promise.all(fadeOutElements.map(el => fadeOut(el))).then(() => {
            // Clear previous content and manage visibility
            if (elements.questionArea) {
                elements.questionArea.innerHTML = '';
                elements.questionArea.classList.remove('hidden');
            }
            if (elements.answersArea) {
                elements.answersArea.innerHTML = '';
                elements.answersArea.classList.remove('hidden');
            }
            if (elements.resultArea) elements.resultArea.classList.add('hidden');
            
            // Update progress with animation
            updateProgress();
            
            // Display question
            const questionHTML = `
                <h2 class="animate-slide-in">${question.questionText}</h2>
                ${question.helpText ? `<p class="help-text animate-fade-in">${question.helpText}</p>` : ''}
            `;
            if (elements.questionArea) elements.questionArea.innerHTML = questionHTML;
            
            // Display answers with staggered animation
            if (elements.answersArea) {
                question.answers.forEach((answer, index) => {
                    const button = document.createElement('button');
                    button.className = 'answer-option animate-slide-in';
                    button.style.animationDelay = `${index * 50}ms`;
                    button.textContent = answer.answerText;
                    button.setAttribute('data-answer-index', index);
                    button.addEventListener('click', () => handleAnswer(answer));
                    elements.answersArea.appendChild(button);
                });
            }
            
            // Update navigation
            if (elements.backButton) {
                if (state.history.length > 0) {
                    elements.backButton.classList.remove('hidden');
                    fadeIn(elements.backButton);
                } else {
                    fadeOut(elements.backButton, () => {
                        elements.backButton.classList.add('hidden');
                    });
                }
            }

            // Fade in new content
            fadeIn(elements.questionArea);
            fadeIn(elements.answersArea);

            // Focus first answer for keyboard navigation
            setTimeout(() => {
                const firstAnswer = elements.answersArea?.querySelector('.answer-option');
                if (firstAnswer) firstAnswer.focus();
                state.animating = false;
            }, ANIMATION_DURATION);
        });
    }

    // Handle answer selection
    function handleAnswer(answer) {
        if (state.animating) return;

        // Add click animation
        event.target.classList.add('answer-clicked');

        // Save answer
        state.answers[state.currentQuestionId] = answer.answerText;
        state.history.push(state.currentQuestionId);
        
        setTimeout(() => {
            if (answer.nextQuestionId) {
                displayQuestion(answer.nextQuestionId);
            } else if (answer.resultOutcome) {
                displayResult(answer.resultOutcome);
            } else {
                console.warn('Answer does not lead to a next question or result:', answer);
                if (elements.questionArea) elements.questionArea.innerHTML = '<p class="error-message">Configuration error. Next step not defined.</p>';
            }
        }, 200);
    }

    // Display result with animation
    function displayResult(result) {
        if (state.animating) return;
        state.animating = true;

        // Fade out question and answers
        Promise.all([
            fadeOut(elements.questionArea),
            fadeOut(elements.answersArea)
        ]).then(() => {
            if (elements.questionArea) elements.questionArea.classList.add('hidden');
            if (elements.answersArea) elements.answersArea.classList.add('hidden');
            if (elements.resultArea) {
                elements.resultArea.classList.remove('hidden');
                
                // Apply result type styling
                elements.resultArea.className = `tool-result ${result.type} animate-fade-in`;
                
                // Build result HTML with animations
                let resultHTML = `
                    <div class="result-content">
                        <h2 class="animate-slide-in">${result.title}</h2>
                        <p class="animate-fade-in" style="animation-delay: 100ms">${result.description}</p>
                `;
                
                if (result.requiredDocuments && result.requiredDocuments.length > 0) {
                    resultHTML += `
                        <div class="result-documents animate-slide-in" style="animation-delay: 200ms">
                            <h3>Required Documents:</h3>
                            <ul>
                                ${result.requiredDocuments.map((doc, i) => 
                                    `<li class="animate-fade-in" style="animation-delay: ${300 + i * 50}ms">${doc}</li>`
                                ).join('')}
                            </ul>
                        </div>
                    `;
                }
                
                if (result.additionalInfo && result.additionalInfo.length > 0) {
                    resultHTML += `
                        <div class="result-details animate-slide-in" style="animation-delay: 300ms">
                            <h3>Additional Information:</h3>
                            <ul>
                                ${result.additionalInfo.map((info, i) => 
                                    `<li class="animate-fade-in" style="animation-delay: ${400 + i * 50}ms">${info}</li>`
                                ).join('')}
                            </ul>
                        </div>
                    `;
                }
                
                if (result.opmLinks && result.opmLinks.length > 0) {
                    resultHTML += `
                        <div class="result-links animate-slide-in" style="animation-delay: 400ms">
                            <h3>Official Resources:</h3>
                            <ul>
                                ${result.opmLinks.map((link, i) => 
                                    `<li class="animate-fade-in" style="animation-delay: ${500 + i * 50}ms">
                                        <a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.text}</a>
                                    </li>`
                                ).join('')}
                            </ul>
                        </div>
                    `;
                }
                
                resultHTML += `
                    </div>
                `;
                
                // Add success checkmark for eligible results
                if (result.type.includes('eligible') && !result.type.includes('not-eligible')) {
                    resultHTML = `
                        <div class="success-icon animate-success">
                            <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="26" cy="26" r="25" fill="none" />
                                <path d="M14.1 27.2l7.1 7.2 16.7-16.8" fill="none" />
                            </svg>
                        </div>
                    ` + resultHTML;
                }
                
                elements.resultArea.innerHTML = resultHTML;
                
                fadeIn(elements.resultArea);
                
                if (elements.printButton) {
                    elements.printButton.classList.remove('hidden');
                    fadeIn(elements.printButton);
                }
                if (elements.backButton) {
                    fadeOut(elements.backButton, () => {
                        elements.backButton.classList.add('hidden');
                    });
                }
                
                // Update progress to 100%
                state.currentStep = state.totalSteps;
                updateProgress();
                
                setTimeout(() => {
                    state.animating = false;
                }, ANIMATION_DURATION);
            }
        });
    }

    // Update progress bar with smooth animation
    function updateProgress() {
        const progress = (state.currentStep / state.totalSteps) * 100;
        if (elements.progressBar) {
            elements.progressBar.style.width = `${progress}%`;
        }
        if (elements.currentStep) {
            // Animate number change
            animateValue(elements.currentStep, parseInt(elements.currentStep.textContent) || 0, state.currentStep, 300);
        }
        
        // Update ARIA attributes
        const progressContainer = document.querySelector('.tool-progress');
        if (progressContainer) {
            progressContainer.setAttribute('aria-valuenow', Math.round(progress));
        }
    }

    // Animate numeric value
    function animateValue(element, start, end, duration) {
        const range = end - start;
        const startTime = performance.now();
        
        function updateValue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const value = Math.floor(start + range * progress);
            element.textContent = value;
            
            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        }
        
        requestAnimationFrame(updateValue);
    }

    // Fade in animation
    function fadeIn(element, duration = ANIMATION_DURATION) {
        return new Promise(resolve => {
            if (!element) {
                resolve();
                return;
            }
            element.style.opacity = '0';
            element.style.display = 'block';
            element.offsetHeight; // Force reflow
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '1';
            setTimeout(resolve, duration);
        });
    }

    // Fade out animation
    function fadeOut(element, callback, duration = ANIMATION_DURATION) {
        return new Promise(resolve => {
            if (!element) {
                resolve();
                return;
            }
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.display = 'none';
                if (callback) callback();
                resolve();
            }, duration);
        });
    }

    // Go back to previous question
    function goBack() {
        if (state.animating || state.history.length === 0) return;
        
        state.history.pop(); // Remove current question from history
        const previousQuestionId = state.history.length > 0 ? state.history.pop() : 'START'; 
        state.currentStep = Math.max(0, state.currentStep - 2);
        displayQuestion(previousQuestionId);
    }

    // Restart the tool
    function restartTool() {
        if (state.animating) return;
        
        // Reset state
        state.currentQuestionId = null;
        state.history = [];
        state.answers = {};
        state.currentStep = 0;
        
        // Reset UI visibility with animation
        if (elements.questionArea) elements.questionArea.classList.remove('hidden');
        if (elements.answersArea) elements.answersArea.classList.remove('hidden');
        
        fadeOut(elements.resultArea, () => {
            if (elements.resultArea) elements.resultArea.classList.add('hidden');
        });
        
        if (elements.printButton) {
            fadeOut(elements.printButton, () => {
                elements.printButton.classList.add('hidden');
            });
        }
        
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
